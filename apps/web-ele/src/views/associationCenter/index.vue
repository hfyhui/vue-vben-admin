<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElMessage } from 'element-plus';
import { TopRight } from '@element-plus/icons-vue';

import {
  checkAccountDeviceApi,
  enableAssetApi,
  getAssetGroupApi,
  getAssetSummaryApi,
  resetContainerApi,
  reverseQueryAssetApi,
} from '#/api/core/asset';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

import StatsOverview from './components/StatsOverview.vue';
import AccountBoard from './components/AccountBoard.vue';
import ProxyBoard from './components/ProxyBoard.vue';
import DeviceBoard from './components/DeviceBoard.vue';

const router = useRouter();
const accountBoardRef = ref<InstanceType<typeof AccountBoard> | null>(null);
const proxyBoardRef = ref<InstanceType<typeof ProxyBoard> | null>(null);
const deviceBoardRef = ref<InstanceType<typeof DeviceBoard> | null>(null);
const overviewStats = ref([
  { key: 'containerPool', current: 0, total: 0 },
  { key: 'accountPool', current: 0, total: 0 },
  { key: 'proxyPool', current: 0, total: 0 },
  { key: 'userCount', current: 0, total: 0 },
]);
const sharedGroupOptions = ref<Array<{ id: string; suiteName: string }>>([]);
const sharedSortOptions = ref<Array<{ label: string; value: string }>>([]);
const assetEnumsStore = useAssetEnumsStore();

function toSafeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

async function loadAssetSummary() {
  try {
    const response = await getAssetSummaryApi();
    const summary = response?.data ?? (response as any) ?? {};
    overviewStats.value = [
      {
        key: 'containerPool',
        current: toSafeNumber(summary.deviceUsedNum),
        total: toSafeNumber(summary.deviceTotalNum),
      },
      {
        key: 'accountPool',
        current: toSafeNumber(summary.accountUsedNum),
        total: toSafeNumber(summary.accountTotalNum),
      },
      {
        key: 'proxyPool',
        current: toSafeNumber(summary.proxyUsedNum),
        total: toSafeNumber(summary.proxyTotalNum),
      },
      {
        key: 'userCount',
        current: toSafeNumber(summary.userUsedNum),
        total: toSafeNumber(summary.userTotalNum),
      },
    ];
  } catch (error) {
    console.error('[associationCenter] 获取汇总信息失败:', error);
  }
}

async function loadGroupOptions() {
  try {
    const response = await getAssetGroupApi();
    const groups = Array.isArray(response?.data) ? response.data : [];
    sharedGroupOptions.value = groups
  } catch (error) {
    console.error('[associationCenter] 获取分组失败:', error);
  }
}

async function loadSortOptions() {
  try {
    sharedSortOptions.value = await assetEnumsStore.getEnumOptionsAsync(
      'ACCOUNT_ORDER',
    );
  } catch (error) {
    console.error('[associationCenter] 获取排序枚举失败:', error);
    sharedSortOptions.value = [];
  }
}

onMounted(() => {
  loadAssetSummary();
  loadGroupOptions();
  loadSortOptions();
});

function onViewSwitch() {
  deviceBoardRef.value?.toggleViewMode?.();
}

async function onDeviceBoardRefreshSummary() {
  await loadAssetSummary();
}

async function onDeviceBoardRefreshProxyList() {
  await proxyBoardRef.value?.refreshProxyList?.();
}

function onAutoAssociate() {
  const accounts = accountBoardRef.value?.getSelectedAccounts?.() || [];
  const proxies = proxyBoardRef.value?.getSelectedProxies?.() || [];
  deviceBoardRef.value?.autoAssociateWithSelections?.(accounts, proxies);
}

async function onContainerReset() {
  const rawIds = deviceBoardRef.value?.getSelectedDeviceIds?.() || [];
  const deviceIds = uniqueIds(rawIds) as string[];
  if (!deviceIds.length) {
    ElMessage.warning($t('associationCenter.selectDeviceBeforeContainerReset'));
    return;
  }

  try {
    const response = await resetContainerApi({ deviceIds });
    if (response?.code === 100000) {
      ElMessage.success(
        response.msg || $t('associationCenter.containerResetSuccess'),
      );
      await loadAssetSummary();
      await deviceBoardRef.value?.refreshDeviceList?.();
      return;
    }
  } catch (error) {
    console.error('[associationCenter] 容器重置失败:', error);
    ElMessage.error($t('associationCenter.containerResetFailed'));
  }
}

async function onOfficialEnable() {
  const boardList = deviceBoardRef.value?.getDeviceBoardList?.() || [];
  console.log('[associationCenter] 设备看板列表数据:', boardList);

  const deviceEnables = deviceBoardRef.value?.getSelectedDeviceEnables?.() || [];
  if (!deviceEnables.length) {
    ElMessage.warning($t('associationCenter.selectDeviceBeforeOfficialEnable'));
    return;
  }

  try {
    const checkResponse = await checkAccountDeviceApi({ deviceEnables });
    if (checkResponse?.code !== 100000) {
      if (!checkResponse?.msg) {
        ElMessage.error($t('associationCenter.officialEnableFailed'));
      }
      return;
    }

    const response = await enableAssetApi({ deviceEnables });
    if (response?.code === 100000) {
      ElMessage.success(
        response.msg || $t('associationCenter.officialEnableSuccess'),
      );
      await deviceBoardRef.value?.refreshDeviceList?.();
      await proxyBoardRef.value?.refreshProxyList?.();
      await loadAssetSummary();
      return;
    }
    if (!response?.msg) {
      ElMessage.error($t('associationCenter.officialEnableFailed'));
    }
  } catch (error) {
    console.error(error);
    // ElMessage.error($t('associationCenter.officialEnableFailed'));
  }
}

function uniqueIds(values: unknown[]) {
  const idSet = new Set(values);
  return [...idSet];
}

async function onReverseQuery() {
  const accounts = accountBoardRef.value?.getSelectedAccounts?.() || [];
  const proxies = proxyBoardRef.value?.getSelectedProxies?.() || [];
  const deviceIds = deviceBoardRef.value?.getSelectedDeviceIds?.() || [];

  const accountIds = uniqueIds(
    accounts.map((item: any) => item?.accountId),
  );
  const proxyIds = uniqueIds(
    proxies.map((item: any) => item?.proxyId),
  );
  const finalDeviceIds = uniqueIds(deviceIds);

  const selectedTypeCount = [accountIds, proxyIds, finalDeviceIds].filter(
    (ids) => ids.length > 0,
  ).length;

  if (selectedTypeCount === 0) {
    ElMessage.warning($t('associationCenter.selectOneTypeBeforeReverseQuery'));
    return;
  }
  if (selectedTypeCount > 1) {
    ElMessage.warning($t('associationCenter.selectOnlyOneTypeForReverseQuery'));
    return;
  }

  try {
    const payload: {
      accountIds?: string[];
      proxyIds?: string[];
      deviceIds?: string[];
    } = accountIds.length
      ? { accountIds }
      : proxyIds.length
        ? { proxyIds }
        : { deviceIds: finalDeviceIds };
    const selectedType: 'account' | 'proxy' | 'device' = accountIds.length
      ? 'account'
      : proxyIds.length
        ? 'proxy'
        : 'device';
    console.log('[associationCenter] 反向查询基本信息:', payload);
    const response = await reverseQueryAssetApi(payload);
    if (response?.code === 100000) {
      const reverseData = (response?.data ?? {}) as {
        accountInfos?: any[] | null;
        proxyInfos?: any[] | null;
        deviceInfos?: any[] | null;
      };
      // 查询源看板保持原样，仅刷新其它两个看板。
      if (selectedType !== 'account') {
        accountBoardRef.value?.applyReverseQueryAccounts?.(
          reverseData.accountInfos,
        );
      }
      if (selectedType !== 'proxy') {
        proxyBoardRef.value?.applyReverseQueryProxies?.(
          reverseData.proxyInfos,
        );
      }
      if (selectedType !== 'device') {
        deviceBoardRef.value?.applyReverseQueryDevices?.(
          reverseData.deviceInfos,
        );
      }
      ElMessage.success(response?.msg);
      return;
    }
    ElMessage.error(response?.msg);
  } catch (error) {
    console.error('[associationCenter] 反向查询失败:', error);
    ElMessage.error($t('associationCenter.reverseQueryFailed'));
  }
}
</script>

<template>
  <div style="padding: 12px">
    <StatsOverview :stats="overviewStats" />

    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-card class="board-card">
          <template #header>
            <div class="board-header">
              <span>{{ $t('associationCenter.accountBoard') }}</span>
              <el-link type="primary" underline="never" @click="router.push('/accountPool')">
                <el-icon :size="22"><TopRight /></el-icon>
              </el-link>
            </div>
          </template>
          <AccountBoard
            ref="accountBoardRef"
            :group-options="sharedGroupOptions"
            :sort-options="sharedSortOptions"
          />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="board-card">
          <template #header>
            <div class="board-header">
              <span>{{ $t('associationCenter.proxyBoard') }}</span>
              <el-link type="primary" underline="never" @click="router.push('/proxyPool')">
                <el-icon :size="22"><TopRight /></el-icon>
              </el-link>
            </div>
          </template>
          <ProxyBoard
            ref="proxyBoardRef"
            :group-options="sharedGroupOptions"
            :sort-options="sharedSortOptions"
          />
        </el-card>
      </el-col>
    </el-row>
    <!-- 操作按钮 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button type="primary" @click="onAutoAssociate">
          {{ $t('associationCenter.autoAssociate') }}
        </el-button>
        <el-button type="primary" @click="onOfficialEnable">
          {{ $t('associationCenter.officialEnable') }}
        </el-button>
        <el-button type="danger" @click="onContainerReset">
          {{ $t('associationCenter.containerReset') }}
        </el-button>
        <el-button type="primary" @click="onReverseQuery">
          {{ $t('associationCenter.reverseQuery') }}
        </el-button>
      </div>
      <el-button type="primary" @click="onViewSwitch">
        {{ $t('associationCenter.viewSwitch') }}
      </el-button>
    </div>

    <!-- 设备看板 -->
    <el-card>
      <DeviceBoard
        ref="deviceBoardRef"
        :group-options="sharedGroupOptions"
        @refresh-summary="onDeviceBoardRefreshSummary"
        @refresh-proxy-list="onDeviceBoardRefreshProxyList"
      />
    </el-card>
  </div>
</template>

<style scoped>
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  padding: 6px 0;
}

.action-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.board-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.board-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>