<script setup lang="ts">
import { computed } from 'vue';

import { $t } from '#/locales';

interface LicenseInfo {
  id?: string;
  customerName?: string;
  authorizationType?: 'OFFICIALLY' | 'TRIAL';
  authorizationTypeName?: string;
  expirationTime?: string;
  concurrentUsers?: number;
  licenseStatus?: string;
  fingerprintFeature?: string;
  remark?: string;
  msg?: string;
  // 支持嵌套的数据结构
  data?: {
    authorizationType?: 'OFFICIALLY' | 'TRIAL';
    authorizationTypeName?: string;
    concurrentUsers?: number;
    customerName?: string;
    expirationTime?: string;
    fingerprintFeature?: string;
    licenseStatus?: string;
    remark?: string;
  };
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

const actualData = computed(() => {
  if (!props.data) return null;
  return props.data.data || props.data;
});

function handleClose() {
  emit('update:visible', false);
}
</script>

<template>
  <div v-if="props.data" class="license-detail">
    <ElDescriptions :column="1" border :label-width="120">
      <ElDescriptionsItem :label="$t('licenseManage.form.customer')">
        <span class="font-medium">{{ actualData?.customerName || '-' }}</span>
      </ElDescriptionsItem>

      <ElDescriptionsItem :label="$t('licenseManage.form.licenseType')">
        <ElTag
          :type="
            actualData?.authorizationType === 'OFFICIALLY'
              ? 'success'
              : 'warning'
          "
          size="small"
        >
          {{
            actualData?.authorizationTypeName ||
            actualData?.authorizationType ||
            '-'
          }}
        </ElTag>
      </ElDescriptionsItem>

      <ElDescriptionsItem :label="$t('licenseManage.form.expireTime')">
        <span class="font-medium text-red-500">{{
          actualData?.expirationTime || '-'
        }}</span>
      </ElDescriptionsItem>

      <ElDescriptionsItem :label="$t('licenseManage.form.maxUsers')">
        <span class="font-medium">
          {{
            actualData?.concurrentUsers !== undefined &&
            actualData?.concurrentUsers !== null
              ? actualData.concurrentUsers
              : '-'
          }}
          人
        </span>
      </ElDescriptionsItem>

      <ElDescriptionsItem :label="$t('licenseManage.status')">
        <ElTag
          size="small"
        >
          {{
            actualData?.licenseStatusName || '-'
          }}
        </ElTag>
      </ElDescriptionsItem>

      <ElDescriptionsItem :label="$t('licenseManage.form.fingerprint')">
        <span class="text-gray-600">{{
          actualData?.fingerprintFeature || '暂无指纹特征'
        }}</span>
      </ElDescriptionsItem>

      <ElDescriptionsItem :label="$t('licenseManage.form.remark')">
        <span class="text-gray-600">{{
          actualData?.remark || $t('licenseManage.detail.noRemark')
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
