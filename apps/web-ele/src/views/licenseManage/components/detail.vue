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

function formatFingerprint(val) {
  if (!val) return '';
  // 只对全数字的长串插入零宽空格
  if (/^\d{10,}$/.test(val)) {
    return val.split('').join('\u200B');
  }
  return val;
}
</script>

<template>
  <div v-if="props.data" class="license-detail">
    <ElDescriptions :column="1" :label-width="160" border class="license-descriptions">
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
        <div class="fingerprint-block">
          <span
            class="text-gray-600 fingerprint-text"
            v-html="formatFingerprint(actualData?.fingerprintFeature || '暂无指纹特征')"
          ></span>
        </div>
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

/* 指纹特征容器样式 */
.fingerprint-wrapper {
  width: 100%; /* 占满父容器宽度 */
  word-break: break-all; /* 强制断词换行（数字/字母长串专用） */
  overflow-wrap: break-word; /* 内容超出宽度时换行 */
  white-space: normal; /* 恢复默认换行（会自动处理空格和换行符） */
  line-height: 1.6; /* 增加行高，提升可读性 */
  padding: 4px 0; /* 增加内边距，避免内容贴边 */
  /* 关键：禁用滚动条 */
  overflow: visible; /* 允许内容溢出容器（但实际会换行，不会溢出） */
  max-height: none; /* 移除可能存在的最大高度限制 */
}

/* 移除之前可能添加的 display: block 等样式，避免冲突 */
.text-gray-600 {
  color: #6b7280;
  /* 确保文本不强制块级显示，由外层容器控制 */
  display: inline;
}

.fingerprint-block {
  max-width: 400px;
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  display: block;
  word-break: break-all;
  white-space: pre-wrap;
  box-sizing: border-box;
}
.fingerprint-text {
  word-break: break-all;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  display: inline;
}

:deep(.license-descriptions) {
  /* 确保描述列表能随内容高度自适应 */
  height: auto !important;
  overflow: visible !important;
}

/* 检查描述列表项是否有固定高度 */
:deep(.el-descriptions__content) {
  height: auto !important;
  padding: 12px !important; /* 增加内边距，避免内容拥挤 */
}

:deep(.el-descriptions__content) {
  width: 100% !important;
  overflow-x: auto !important;
  overflow-y: auto !important;
  word-break: break-all !important;
  white-space: pre-wrap !important;
  box-sizing: border-box !important;
  display: block !important;
}
</style>
