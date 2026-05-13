<script setup lang="ts">
import { computed, ref } from 'vue';

import { $t } from '@vben/locales';

import { ElMessage } from 'element-plus';

import liveIcon from '#/assets/image/live1.png';
import obs1Image from '#/assets/image/OBS1.jpg';
import obs2Image from '#/assets/image/OBS2.jpg';
import obs3Image from '#/assets/image/OBS3.jpg';

type DeviceLike = Record<string, any>;

type LiveStatusResponse = {
  deviceConnections?: Record<string, Record<string, any>>;
  message?: string;
  status?: string;
  streamKeys?: Record<string, string[]>;
};

const props = withDefaults(
  defineProps<{
    device: DeviceLike;
    liveBaseUrl?: string;
  }>(),
  {
    liveBaseUrl: '',
  },
);

const liveFormRef = ref<any>(null);
const visible = ref(false);
const loading = ref(false);
const notAv = ref(false);
const statusInfo = ref<LiveStatusResponse>({});
const submitData = ref({
  rtmpBaseUrl: '',
  streamKey: '',
});

const tabList = computed(() => [
  {
    key: '1',
    label: $t('webadb.fileManager.drawer.OBSAddressConfig'),
    url: obs1Image,
  },
  {
    key: '2',
    label: $t('webadb.fileManager.drawer.OBSQualityConfig'),
    url: obs2Image,
  },
  { key: '3', label: $t('webadb.fileManager.drawer.OBSAudioConfig'), url: obs3Image },
]);

function configuredLiveTargetRaw(): string | undefined {
  const a = (
    import.meta.env.VITE_APP_TARGET_URL_RTMP as string | undefined
  )?.trim();
  const b = (
    import.meta.env.VITE_TARGET_URL_RTMP as string | undefined
  )?.trim();
  return a || b || undefined;
}

/** 与旧项目一致：仅主机名（无路径）用于默认 RTMP 地址 host:1935；完整 URL 时只取 hostname */
function rtmpDefaultHostFromConfigured(): string {
  const raw = configuredLiveTargetRaw();
  if (!raw) return window.location.hostname;
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).hostname;
    } catch {
      return window.location.hostname;
    }
  }
  const first = raw.split('/')[0] || '';
  if (first.includes(':')) {
    return first.split(':')[0] || window.location.hostname;
  }
  return first || window.location.hostname;
}

const defaultRtmpBase = computed(
  () => `${rtmpDefaultHostFromConfigured()}:1935`,
);

const currentIp = computed(
  () => props.device?.serial || props.device?.deviceIp || '',
);

const activeIpList = computed(() => {
  const streamKeys = statusInfo.value?.streamKeys || {};
  return Object.values(streamKeys).flat();
});

const isLiving = computed(
  () => !!currentIp.value && activeIpList.value.includes(currentIp.value),
);

const formRules = computed(() => ({
  rtmpBaseUrl: [
    {
      required: true,
      message: `${$t('common.pleaseInput')}${$t('webadb.fileManager.drawer.serviceAddress')}`,
    },
  ],
  streamKey: [
    {
      required: true,
      message: `${$t('common.pleaseInput')}${$t('webadb.fileManager.drawer.streamKey')}`,
    },
  ],
}));

/**
 * live/status、start、stop 等请求的基址。
 * 未配置 VITE_APP_TARGET_URL_RTMP 时，开发环境走同源 /live/（由 vite 中 LIVE_PROXY_TARGET 代理），避免误请求 https://localhost/live。
 */
function resolveLiveBaseUrl() {
  const rawProp = (props.liveBaseUrl || '').trim();
  const rawEnv = configuredLiveTargetRaw();
  const raw = rawProp || rawEnv;

  if (!raw) {
    if (import.meta.env.DEV) {
      const origin = window.location.origin.replace(/\/$/, '');
      return `${origin}/live/`;
    }
    return `https://${window.location.hostname}/live/`;
  }

  let withProtocol = raw;
  if (!/^https?:\/\//i.test(withProtocol)) {
    withProtocol = `https://${withProtocol}`;
  }
  const base = withProtocol.endsWith('/') ? withProtocol : `${withProtocol}/`;
  return base.endsWith('live/') ? base : `${base}live/`;
}

async function requestLive(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  data?: Record<string, any>,
) {
  const url = `${resolveLiveBaseUrl()}${path}`;
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(data || {}) : undefined,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function resetSubmitData() {
  submitData.value = {
    rtmpBaseUrl: defaultRtmpBase.value,
    streamKey: '',
  };
}

async function getStatusInfo() {
  const res = (await requestLive('status')) as LiveStatusResponse;
  statusInfo.value = res || {};
  const currentConnection =
    statusInfo.value?.deviceConnections?.[currentIp.value];
  if (currentConnection) {
    submitData.value = {
      ...submitData.value,
      ...currentConnection,
    };
  }
  if (!submitData.value.rtmpBaseUrl) {
    submitData.value.rtmpBaseUrl = defaultRtmpBase.value;
  }
}

async function openModal() {
  resetSubmitData();
  notAv.value = false;
  visible.value = true;
  try {
    await getStatusInfo();
  } catch {
    ElMessage.error($t('webadb.fileManager.drawer.statusGetFailed'));
  }
}

async function startLive() {
  if (!currentIp.value) {
    ElMessage.warning($t('webadb.fileManager.drawer.deviceInfoMissing'));
    return;
  }
  try {
    await liveFormRef.value?.validate?.();
  } catch {
    return;
  }

  loading.value = true;
  try {
    const res: any = await requestLive('start', 'POST', {
      ip: currentIp.value,
      streamKey: submitData.value.streamKey,
      rtmpBaseUrl: `rtmp://${submitData.value.rtmpBaseUrl}/live/`,
    });
    await getStatusInfo();
    if (res?.status === 'ok') {
      ElMessage.success($t('webadb.fileManager.drawer.startLiveSuccess'));
    } else if (res?.status === 'notAv') {
      notAv.value = true;
      ElMessage.error($t('webadb.fileManager.drawer.notAv'));
    } else {
      ElMessage.error(res?.message || $t('webadb.fileManager.drawer.startLiveFailed'));
    }
  } finally {
    loading.value = false;
  }
}

async function stopLive() {
  if (!currentIp.value) return;
  loading.value = true;
  try {
    const res: any = await requestLive('stop', 'POST', {
      ip: currentIp.value,
      streamKey: submitData.value.streamKey,
    });
    await getStatusInfo();
    if (res?.status === 'ok') {
      ElMessage.success($t('webadb.fileManager.drawer.stopLiveSuccess'));
    } else {
      ElMessage.error($t('webadb.fileManager.drawer.stopLiveFailed'));
    }
  } finally {
    loading.value = false;
  }
}

async function installAV() {
  if (!currentIp.value) return;
  loading.value = true;
  try {
    const res: any = await requestLive('installAV', 'POST', {
      ip: currentIp.value,
      streamKey: submitData.value.streamKey,
    });
    await getStatusInfo();
    if (res?.status === 'ok') {
      notAv.value = false;
      ElMessage.success($t('webadb.fileManager.drawer.installAVSuccess'));
    } else {
      ElMessage.error($t('webadb.fileManager.drawer.installAVFailed'));
    }
  } finally {
    loading.value = false;
  }
}

async function upgradeAV() {
  if (!currentIp.value) return;
  loading.value = true;
  try {
    const res: any = await requestLive('upgradeAV', 'POST', {
      ip: currentIp.value,
      streamKey: submitData.value.streamKey,
    });
    await getStatusInfo();
    if (res?.status === 'ok') {
      ElMessage.success($t('webadb.fileManager.drawer.upgradeAVSuccess'));
    } else {
      ElMessage.error($t('webadb.fileManager.drawer.upgradeAVFailed'));
    }
  } finally {
    loading.value = false;
  }
}

function closeDrawer() {
  visible.value = false;
  notAv.value = false;
  resetSubmitData();
}
</script>

<template>
  <div class="live-manage">
    <el-tooltip :content="$t('webadb.fileManager.drawer.tooltipLive')" placement="top">
      <div class="live-trigger" @click.stop="openModal">
        <img class="live-icon" :src="liveIcon" alt="" />
      </div>
    </el-tooltip>

    <el-drawer
      v-model="visible"
      :title="$t('webadb.fileManager.drawer.tooltipLive')"
      direction="rtl"
      size="70%"
      destroy-on-close
      append-to-body
      @close="closeDrawer"
    >
      <div class="drawer-content">
        <div class="live-actions">
          <el-button
            type="primary"
            :loading="loading"
            :disabled="isLiving"
            @click="startLive"
          >
            {{ $t('webadb.fileManager.drawer.startLive') }}
          </el-button>
          <el-button
            type="danger"
            :loading="loading"
            :disabled="!isLiving"
            @click="stopLive"
          >
            {{ $t('webadb.fileManager.drawer.stopLive') }}
          </el-button>
        </div>

        <el-form
          ref="liveFormRef"
          :model="submitData"
          :rules="formRules"
          label-width="90px"
          class="live-form"
        >
          <el-form-item
            :label="$t('webadb.fileManager.drawer.serviceAddress')"
            prop="rtmpBaseUrl"
            required
          >
            <div class="service-address-wrap">
              <span class="address-addon address-addon--prefix">rtmp://</span>
              <el-input
                v-model="submitData.rtmpBaseUrl"
                class="address-input"
                :disabled="isLiving"
                maxlength="50"
                :placeholder="`${$t('common.pleaseInput')}${$t('webadb.fileManager.drawer.serviceAddress')}${$t('webadb.fileManager.drawer.example')}${defaultRtmpBase}`"
              />
              <span class="address-addon address-addon--suffix">/live/</span>
            </div>
          </el-form-item>
          <el-form-item
            :label="$t('webadb.fileManager.drawer.streamKey')"
            prop="streamKey"
            required
          >
            <el-input
              v-model="submitData.streamKey"
              :disabled="isLiving"
              maxlength="50"
              :placeholder="`${$t('common.pleaseInput')}${$t('webadb.fileManager.drawer.streamKey')}${$t('webadb.fileManager.drawer.example')}callfans`"
            />
          </el-form-item>
        </el-form>

        <div class="tips">
          <p v-if="notAv" class="tip-fail">
            {{ $t('webadb.fileManager.drawer.notAvTip') }}
            <el-button link @click="installAV">{{
              $t('webadb.fileManager.drawer.installAVBtn')
            }}</el-button>
          </p>
          <p class="tip-pending">
            {{ $t('webadb.fileManager.drawer.obsLiveTip') }}<br />
            {{
              $t('webadb.fileManager.drawer.obsLiveTip1', {
                btn: $t('webadb.fileManager.drawer.startLive'),
              })
            }}<br />
            {{ $t('webadb.fileManager.drawer.obsLiveTip2') }}
          </p>
          <p class="tip-upgrade">
            {{ $t('webadb.fileManager.drawer.upgradeAVDesc') }}
            <el-button link @click="upgradeAV">{{
              $t('webadb.fileManager.drawer.upgradeAVBtn')
            }}</el-button>
          </p>
          <p class="tip-example">
            {{ $t('webadb.fileManager.drawer.OBSConfigExample') }}
          </p>
        </div>

        <el-tabs>
          <el-tab-pane v-for="tab in tabList" :key="tab.key" :label="tab.label">
            <div class="obs-config-panel">
              <img :src="tab.url" class="obs-config-img" :alt="tab.label" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.live-manage {
  display: inline-flex;
  align-items: center;
}

.live-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  cursor: pointer;
}

.live-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.drawer-content {
  height: 100%;
  overflow-y: auto;
  padding: 0 20px 12px;
}

.live-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  margin-left: 100px;
}

.live-form {
  padding: 0 0 8px 100px;
}

.live-form :deep(.el-form-item__label) {
  color: #555;
}

.service-address-wrap {
  display: flex;
  align-items: center;
  width: 100%;
}

.address-addon {
  height: 32px;
  padding: 0 11px;
  color: rgb(0 0 0 / 65%);
  line-height: 30px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  white-space: nowrap;
}

.address-addon--prefix {
  border-right: none;
  border-radius: 2px 0 0 2px;
}

.address-addon--suffix {
  border-left: none;
  border-radius: 0 2px 2px 0;
}

.address-input {
  flex: 1;
}

.address-input :deep(.el-input__wrapper) {
  border-radius: 0;
  box-shadow: 0 0 0 1px #d9d9d9 inset;
}

.tips {
  margin: 12px 0 16px;
  padding-left: 100px;
  font-size: 12px;
  line-height: 1.75;
  color: rgb(0 0 0 / 65%);
}

.tips p {
  margin: 0 0 16px;
}

.tips p:last-child {
  margin-bottom: 0;
}

.tip-fail {
  color: #da1e28;
  font-size: 12px;
  line-height: 1.75;
}

.tip-pending {
  color: #faad14;
  font-size: 12px;
  line-height: 1.85;
}

.tip-upgrade {
  font-size: 12px;
  line-height: 1.75;
  color: rgb(0 0 0 / 65%);
}

.tip-example {
  font-size: 12px;
  line-height: 1.75;
  color: rgb(0 0 0 / 65%);
}

.tip-upgrade :deep(.el-button) {
  margin-left: 6px;
  padding: 0;
  font-size: 12px;
  vertical-align: baseline;
}

.tips :deep(.el-button.is-link) {
  color: #1890ff;
  font-size: 12px;
}

.obs-config-panel {
  min-height: 120px;
}

.obs-config-img {
  width: 100%;
  height: auto;
  display: block;
}
</style>
