<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { $t } from '#/locales';
import { getProductTreeApi } from '../../../api/core/license';

interface LicenseInfo {
  id?: string;
  customerName?: string;
  authorizationType?: 'OFFICIALLY' | 'TRIAL';
  authorizationTypeName?: string;
  expirationTime?: string;
  concurrentUsers?: number;
  licenseStatus?: string;
  licenseStatusName?: string;
  fingerprintFeature?: string;
  remark?: string;
  msg?: string;
  // 授权应用信息
  productList?: Array<{
    hierarchy: number;
    menuId: string;
    menuName: string;
    parentId: string;
    appId: number;
    children: Array<{
      hierarchy: number;
      menuId: string;
      menuName: string;
      parentId: string;
      appId: number;
      children: any[];
    }>;
  }>;
  // 支持嵌套的数据结构
  data?: {
    authorizationType?: 'OFFICIALLY' | 'TRIAL';
    authorizationTypeName?: string;
    concurrentUsers?: number;
    customerName?: string;
    expirationTime?: string;
    fingerprintFeature?: string;
    licenseStatus?: string;
    licenseStatusName?: string;
    remark?: string;
    productList?: Array<{
      hierarchy: number;
      menuId: string;
      menuName: string;
      parentId: string;
      appId: number;
      children: Array<{
        hierarchy: number;
        menuId: string;
        menuName: string;
        parentId: string;
        appId: number;
        children: any[];
      }>;
    }>;
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

// 产品树形数据
const productTreeData = ref<any[]>([]);
const loading = ref(false);

// 当前license已授权的应用ID列表
const authorizedAppIds = computed(() => {
  if (!actualData.value?.productList) return [];
  
  const ids: string[] = [];
  const collectIds = (items: any[]) => {
    items.forEach(item => {
      // 只收集叶子节点（没有子节点的节点）的ID
      if (!item.children || item.children.length === 0) {
        ids.push(item.menuId);
      } else {
        // 如果有子节点，递归处理子节点
        collectIds(item.children);
      }
    });
  };
  
  collectIds(actualData.value.productList);
  return ids;
});

// 获取产品树形数据
async function fetchProductTree() {
  loading.value = true;
  try {
    const data = await getProductTreeApi();
    productTreeData.value = data;
  } catch (error) {
    console.error('获取产品树形数据失败:', error);
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  emit('update:visible', false);
}

function formatFingerprint(val: string | undefined): string {
  if (!val) return '';
  // 只对全数字的长串插入零宽空格
  if (/^\d{10,}$/.test(val)) {
    return val.split('').join('\u200B');
  }
  return val;
}

// 组件挂载时获取产品树形数据
onMounted(() => {
  fetchProductTree();
});
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
      <!-- 授权应用信息 -->
      <ElDescriptionsItem :label="$t('licenseManage.detail.authorizedApps')">
        <div v-if="productTreeData.length > 0" class="apps-tree-container">
          <el-tree
            v-loading="loading"
            :data="productTreeData"
            :props="{ label: 'menuName', children: 'children' }"
            node-key="menuId"
            :default-expand-all="true"
            :expand-on-click-node="false"
            :default-checked-keys="authorizedAppIds"
            show-checkbox
            :check-strictly="false"
            class="apps-tree"
            disabled
          >
            <template #default="{ data }">
              <span class="tree-node-content">
                <span class="node-name">{{ data.menuName }}</span>
              </span>
            </template>
          </el-tree>
        </div>
        <div v-else-if="loading" class="loading-container">
          <span class="text-gray-600">加载中...</span>
        </div>
        <span v-else class="text-gray-600">{{ $t('licenseManage.detail.noApps') }}</span>
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

.license-detail .apps-tree-container {
  width: 100%;
  max-width: 500px;
}

.license-detail .loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: #6b7280;
}

.license-detail .apps-tree {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background-color: #f9fafb;
}

.license-detail .tree-node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.license-detail .node-name {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.license-detail .node-info {
  color: #6b7280;
  font-size: 12px;
}

/* 树形组件样式优化 */
:deep(.apps-tree .el-tree-node__content) {
  height: auto;
  padding: 4px 0;
}

:deep(.apps-tree .el-tree-node__label) {
  width: 100%;
}

:deep(.apps-tree .el-tree-node__expand-icon) {
  color: #6b7280;
}

:deep(.apps-tree .el-tree-node__expand-icon.expanded) {
  color: #3b82f6;
}

/* 勾选框样式 */
:deep(.apps-tree .el-checkbox) {
  margin-right: 8px;
}

:deep(.apps-tree .el-checkbox__input.is-disabled .el-checkbox__inner) {
  background-color: #f5f7fa;
  border-color: #dcdfe6;
  cursor: not-allowed;
}

:deep(.apps-tree .el-checkbox__input.is-disabled.is-checked .el-checkbox__inner) {
  background-color: #409eff;
  border-color: #409eff;
}

:deep(.apps-tree .el-checkbox__input.is-disabled.is-checked .el-checkbox__inner::after) {
  border-color: #fff;
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
