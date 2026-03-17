<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import {
  getAccountPoolListApi,
  getFormOptions,
  useColumns,
} from './account-pool-table-config';

const [Grid, gridApi] = useVbenVxeGrid({
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
          return await getAccountPoolListApi({
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
  ElMessage.info($t('accountPool.action.add'));
}

function onImport() {
  ElMessage.info($t('accountPool.action.import'));
}

function onBatchDelete() {
  ElMessage.info($t('accountPool.action.batchDelete'));
}

const statsData = [
  { key: 'accountPool', value: 56 },
  { key: 'runningAccounts', value: 20 },
  { key: 'pendingAccounts', value: 36 },
  { key: 'riskControlAccounts', value: 3 },
];
</script>

<template>
  <Page auto-content-height>
    <div class="account-pool-page">
      <!-- 统计卡片 -->
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
                {{ $t(`accountPool.stats.${item.key}`) }}
              </div>
              <div class="stat-value">{{ item.value }}</div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <Grid>
        <template #toolbar-actions>
          <ElButton class="mr-2" type="primary" @click="onCreate">
            {{ $t('accountPool.action.add') }}
          </ElButton>
          <ElButton class="mr-2" type="primary" @click="onImport">
            {{ $t('accountPool.action.import') }}
          </ElButton>
          <ElButton type="danger" @click="onBatchDelete">
            {{ $t('accountPool.action.batchDelete') }}
          </ElButton>
        </template>
      </Grid>
    </div>
  </Page>
</template>

<style scoped>
.account-pool-page {
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
