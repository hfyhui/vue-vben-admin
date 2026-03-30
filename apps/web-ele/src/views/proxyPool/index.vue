<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import {
  batchDeleteProxyApi,
  downloadProxyTemplateApi,
  getAssetGroupApi,
  getProxyRegionTreeApi,
} from '#/api/core/asset';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

import {
  type ProxyPoolSortOption,
  type ProxyPoolGroupOption,
  type ProxyPoolRegionOption,
  getProxyPoolListApi,
  getFormOptions,
  useColumns,
} from './proxy-pool-table-config';

interface RegionTreeNode {
  name?: string;
  children?: RegionTreeNode[] | null;
}

const sortOptions = ref<ProxyPoolSortOption[]>([]);
const groupOptions = ref<ProxyPoolGroupOption[]>([]);
const regionOptions = ref<ProxyPoolRegionOption[]>([]);
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
    height: 'auto',
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
      }));
  } catch (error) {
    console.error('[proxyPool] 获取分组失败:', error);
    groupOptions.value = [];
  }
  applyFormOptions();
}

function onCreate() {
  ElMessage.info($t('proxyPool.action.add'));
}

function onImport() {
  ElMessage.info($t('proxyPool.action.import'));
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
          <ElButton class="mr-2" type="primary" @click="onCreate">
            {{ $t('proxyPool.action.add') }}
          </ElButton>
          <ElButton class="mr-2" type="primary" @click="onImport">
            {{ $t('proxyPool.action.import') }}
          </ElButton>
          <ElButton class="mr-2" type="primary" @click="onDownloadTemplate">
            {{ $t('proxyPool.action.downloadTemplate') }}
          </ElButton>
          <ElButton type="danger" @click="onBatchDelete">
            {{ $t('proxyPool.action.batchDelete') }}
          </ElButton>
        </template>
      </Grid>
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

.mr-2 {
  margin-right: 8px;
}
</style>

