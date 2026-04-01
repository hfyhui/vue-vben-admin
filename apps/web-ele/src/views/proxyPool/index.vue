<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import {
  batchDeleteProxyApi,
  downloadProxyTemplateApi,
  getAssetGroupApi,
  importProxyApi,
  getProxyRegionTreeApi,
} from '#/api/core/asset';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

import {
  type ProxyPoolSortOption,
  type ProxyPoolGroupOption,
  type ProxyPoolRow,
  type ProxyPoolRegionOption,
  getProxyPoolListApi,
  getFormOptions,
  useColumns,
} from './proxy-pool-table-config';
import ProxyPoolFormModal from './proxy-form-modal.vue';
import ProxyGroupModal from './proxy-group-modal.vue';

interface RegionTreeNode {
  name?: string;
  children?: RegionTreeNode[] | null;
}

const sortOptions = ref<ProxyPoolSortOption[]>([]);
const groupOptions = ref<ProxyPoolGroupOption[]>([]);
const regionOptions = ref<ProxyPoolRegionOption[]>([]);
const importFileInputRef = ref<HTMLInputElement>();
const importing = ref(false);
const assetEnumsStore = useAssetEnumsStore();

function mapRegionTree(
  nodes: RegionTreeNode[] | null | undefined,
): ProxyPoolRegionOption[] {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .filter((node) => Boolean(node?.name))
    .map((node) => ({
      label: node.name as string,
      value: node.name as string,
      children: mapRegionTree(node.children),
    }));
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: getFormOptions([], [], []),
  gridOptions: {
    columns: useColumns(),
    pagerConfig: {
      enabled: true,
      pageSize: 10,
      pageSizes: [10, 20, 50, 100],
      layouts: ['PrevPage', 'JumpNumber', 'NextPage', 'Sizes', 'Total'],
    },
    proxyConfig: {
      response: {
        result: 'list',
        total: 'total',
      },
      ajax: {
        query: async ({ page }, formValues) => {
          return await getProxyPoolListApi({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    toolbarConfig: {
      custom: true,
      refresh: true,
      resizable: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions,
});

function applyFormOptions() {
  gridApi.setState({
    formOptions: getFormOptions(
      sortOptions.value,
      groupOptions.value,
      regionOptions.value,
    ),
  });
}

async function loadRegionOptions() {
  try {
    const response = await getProxyRegionTreeApi();
    regionOptions.value = mapRegionTree(response.data);
  } catch (error) {
    console.error('[proxyPool] 获取地区树失败:', error);
    regionOptions.value = [];
  }
  applyFormOptions();
}

async function loadSortOptions() {
  try {
    sortOptions.value = await assetEnumsStore.getEnumOptionsAsync(
      'ACCOUNT_ORDER',
    );
  } catch (error) {
    console.error('[proxyPool] 获取排序枚举失败:', error);
    sortOptions.value = [];
  }
  applyFormOptions();
}

async function loadGroupOptions() {
  try {
    const response = await getAssetGroupApi();
    const groups = Array.isArray(response?.data) ? response.data : [];
    groupOptions.value = groups
      .filter((item) => Boolean(item?.id))
      .map((item) => ({
        id: item.id as string,
        suiteName: item.suiteName ?? '',
        suiteDesc: item.suiteDesc ?? '',
      }));
  } catch (error) {
    console.error('[proxyPool] 获取分组失败:', error);
    groupOptions.value = [];
  }
  applyFormOptions();
}

function onCreate() {
  formModalApi.open();
}

function onImport() {
  if (importing.value) return;
  importFileInputRef.value?.click();
}

async function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  importing.value = true;
  try {
    const res = await importProxyApi({ file });
    if (res?.code === 100000) {
      ElMessage.success($t('proxyPool.message.importSuccess'));
      gridApi.reload();
    }
  } catch (error) {
    console.error('[proxyPool] 导入代理失败:', error);
    ElMessage.error($t('proxyPool.message.importFailed'));
  } finally {
    importing.value = false;
  }
}

async function onDownloadTemplate() {
  try {
    await downloadProxyTemplateApi();
  } catch (error) {
    console.error('[proxyPool] 下载代理模板失败:', error);
    ElMessage.error($t('proxyPool.message.downloadFailed'));
  }
}

async function onBatchDelete() {
  const records = (gridApi as any).grid.getCheckboxRecords?.() || [];
  const proxyIds = records.map((item: any) => item.proxyId).filter(Boolean);

  if (!proxyIds.length) {
    ElMessage.warning($t('proxyPool.message.selectBeforeDelete'));
    return;
  }

  try {
    await batchDeleteProxyApi(proxyIds);
    ElMessage.success($t('proxyPool.message.batchDeleteSuccess'));
    gridApi.reload();
  } catch (error) {
    console.error('[proxyPool] 批量删除代理失败:', error);
    ElMessage.error($t('proxyPool.message.batchDeleteFailed'));
  }
}

function getSelectedProxyIds() {
  const records: ProxyPoolRow[] = (gridApi as any).grid.getCheckboxRecords?.() || [];
  return records
    .map((item) => item.proxyId || item.id)
    .filter((id): id is string => Boolean(id));
}

function onSetGrouping() {
  const proxyIds = getSelectedProxyIds();
  if (!proxyIds.length) {
    ElMessage.warning($t('proxyPool.message.selectBeforeGrouping'));
    return;
  }
  groupModalApi
    .setData({
      proxyIds,
      groupOptions: groupOptions.value,
    })
    .open();
}

const statsData = [
  { key: 'proxyPool', value: 56 },
  { key: 'runningProxies', value: 102 },
  { key: 'pendingProxies', value: 39 },
  { key: 'riskControlProxies', value: 3 },
];

onMounted(() => {
  loadRegionOptions();
  loadGroupOptions();
  loadSortOptions();
});

function onCreateSuccess() {
  gridApi.reload();
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: ProxyPoolFormModal,
});

function onGroupSuccess() {
  gridApi.reload();
  loadGroupOptions();
}

const [GroupModal, groupModalApi] = useVbenModal({
  connectedComponent: ProxyGroupModal,
});
</script>

<template>
  <Page auto-content-height>
    <div class="proxy-pool-page">
      <div class="stats-overview">
        <el-row :gutter="16">
          <el-col
            v-for="item in statsData"
            :key="item.key"
            :xs="24"
            :sm="12"
            :md="6"
          >
            <el-card class="stat-card" shadow="hover">
              <div class="stat-title">
                {{ $t(`proxyPool.stats.${item.key}`) }}
              </div>
              <div class="stat-value">{{ item.value }}</div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <Grid>
        <template #toolbar-actions>
          <div class="toolbar-actions">
            <ElButton type="primary" @click="onCreate">
              {{ $t('proxyPool.action.add') }}
            </ElButton>
            <ElButton
              type="primary"
              :loading="importing"
              @click="onImport"
            >
              {{ $t('proxyPool.action.import') }}
            </ElButton>
            <input
              ref="importFileInputRef"
              type="file"
              accept=".csv"
              style="display: none"
              @change="onImportFileChange"
            />
            <ElButton type="primary" @click="onDownloadTemplate">
              {{ $t('proxyPool.action.downloadTemplate') }}
            </ElButton>
            <ElButton type="danger" @click="onBatchDelete">
              {{ $t('proxyPool.action.batchDelete') }}
            </ElButton>
            <ElButton type="primary" @click="onSetGrouping">
              {{ $t('proxyPool.action.setGrouping') }}
            </ElButton>
          </div>
        </template>
      </Grid>
      <FormModal @success-after="onCreateSuccess" />
      <GroupModal @success-after="onGroupSuccess" />
    </div>
  </Page>
</template>

<style scoped>
.proxy-pool-page {
  padding: 24px;
}

.stats-overview {
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
}

.stat-title {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 12px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

:deep(.el-form-item) {
  margin-bottom: 14px;
}

:deep(.vxe-table--empty-content) {
  padding: 40px 0 !important;
}
</style>

