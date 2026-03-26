<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { downloadProxyTemplateApi } from '#/api/core/asset';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import {
  getProxyPoolListApi,
  getFormOptions,
  useColumns,
} from './proxy-pool-table-config';

const [Grid] = useVbenVxeGrid({
  formOptions: getFormOptions(),
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

function onBatchDelete() {
  ElMessage.info($t('proxyPool.action.batchDelete'));
}

const statsData = [
  { key: 'proxyPool', value: 56 },
  { key: 'runningProxies', value: 102 },
  { key: 'pendingProxies', value: 39 },
  { key: 'riskControlProxies', value: 3 },
];
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

