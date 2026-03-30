<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import {
  getContainerPoolListApi,
  getFormOptions,
  useColumns,
} from './container-pool-table-config';

const [Grid] = useVbenVxeGrid({
  formOptions: getFormOptions(),
  showSearchForm: true,
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
          return await getContainerPoolListApi({
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
  ElMessage.info($t('containerPool.action.add'));
}

function onImport() {
  ElMessage.info($t('containerPool.action.import'));
}

function onBatchDelete() {
  ElMessage.info($t('containerPool.action.batchDelete'));
}

function onDeviceReset() {
  ElMessage.info($t('containerPool.action.deviceReset'));
}

function onPlaceholder() {
  ElMessage.info($t('containerPool.action.placeholder'));
}

const statsData = [
  { key: 'devicePool', value: 56 },
  { key: 'runningDevices', value: 102 },
  { key: 'pendingDevices', value: 39 },
  { key: 'other', value: 3 },
];
</script>

<template>
  <Page auto-content-height>
    <div class="container-pool-page">
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
                {{ $t(`containerPool.stats.${item.key}`) }}
              </div>
              <div class="stat-value">{{ item.value }}</div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <Grid>
        <template #toolbar-actions>
          <ElButton class="mr-2" type="primary" @click="onCreate">
            {{ $t('containerPool.action.add') }}
          </ElButton>
          <ElButton class="mr-2" type="primary" @click="onImport">
            {{ $t('containerPool.action.import') }}
          </ElButton>
          <ElButton type="danger" @click="onBatchDelete">
            {{ $t('containerPool.action.batchDelete') }}
          </ElButton>
          <ElButton class="mr-2" type="primary" @click="onDeviceReset">
            {{ $t('containerPool.action.deviceReset') }}
          </ElButton>
          <ElButton type="primary" @click="onPlaceholder">
            {{ $t('containerPool.action.placeholder') }}
          </ElButton>
        </template>
      </Grid>
    </div>
  </Page>
</template>

<style scoped>
.container-pool-page {
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

