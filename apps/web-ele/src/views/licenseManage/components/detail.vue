<script setup lang="ts">
import { $t } from '#/locales';

interface LicenseInfo {
  id: string;
  customer: string;
  apps: string[];
  licenseType: 'official' | 'trial';
  expireTime: string;
  maxUsers: number;
  fingerprint: string;
  remark: string;
}

interface Props {
  visible?: boolean;
  data?: LicenseInfo;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'download', data: LicenseInfo): void;
  (e: 'edit', data: LicenseInfo): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function getAppDisplayName(app: string): string {
  const appMap: Record<string, string> = {
    local: '本地应用',
    'local-1': '本地应用1',
    cloud: '云端应用',
    'cloud-1': '云端应用1',
    'cloud-2': '云端应用2',
    seo: 'SEO工具',
  };
  return appMap[app] || app;
}

function handleClose() {
  emit('update:visible', false);
}
</script>

<template>
  <div v-if="props.data" class="license-detail">
    <ElDescriptions :column="1" border>
      <ElDescriptionsItem :label="$t('licenseManage.form.customer')">
        <span class="font-medium">{{
          props.data.customer === 'a'
            ? $t('licenseManage.customer.a')
            : props.data.customer === 'b'
              ? $t('licenseManage.customer.b')
              : props.data.customer
        }}</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('licenseManage.form.apps')">
        <div class="apps-container">
          <ElTag
            v-for="app in props.data.apps"
            :key="app"
            type="info"
            class="app-tag"
          >
            {{ getAppDisplayName(app) }}
          </ElTag>
        </div>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('licenseManage.form.licenseType')">
        <ElButton
          :type="props.data.licenseType === 'trial' ? 'warning' : 'success'"
        >
          {{
            props.data.licenseType === 'trial'
              ? $t('licenseManage.form.trial')
              : $t('licenseManage.form.official')
          }}
        </ElButton>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('licenseManage.form.expireTime')">
        <span class="font-medium text-red-500">{{
          props.data.expireTime
        }}</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('licenseManage.form.maxUsers')">
        <span class="font-medium">{{ props.data.maxUsers }} 人</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('licenseManage.form.fingerprint')">
        <span class="fingerprint-text">{{
          props.data.fingerprint || $t('licenseManage.detail.noFingerprint')
        }}</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('licenseManage.form.remark')" :span="2">
        <span class="text-gray-600">{{
          props.data.remark || $t('licenseManage.detail.noRemark')
        }}</span>
      </ElDescriptionsItem>
    </ElDescriptions>

    <div class="detail-actions">
      <ElButton @click="handleClose">
        {{ $t('licenseManage.detail.close') }}
      </ElButton>
    </div>
  </div>
</template>

<style scoped>
.license-detail .apps-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.license-detail .apps-container .app-tag {
  margin: 0;
}

.license-detail .detail-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

.font-medium {
  font-weight: 500;
}

.text-red-500 {
  color: #ef4444;
}

.text-gray-600 {
  color: #6b7280;
}
</style>
