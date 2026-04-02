<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import {
  getAssetGroupApi,
  getContainerPoolNumApi,
  resetContainerApi,
} from '#/api/core/asset';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

import {
  type ContainerPoolGroupOption,
  type ContainerPoolSortOption,
  getContainerPoolListApi,
  getFormOptions,
  useColumns,
} from './container-pool-table-config';

const sortOptions = ref<ContainerPoolSortOption[]>([]);
const groupOptions = ref<ContainerPoolGroupOption[]>([]);
const assetEnumsStore = useAssetEnumsStore();

const statsData = ref([
  { key: 'devicePool', value: 0 },
  { key: 'runningDevices', value: 0 },
  { key: 'pendingDevices', value: 0 },
]);

async function loadContainerPoolNum() {
  try {
    const response = await getContainerPoolNumApi();
    const data = response?.data ?? {};
    statsData.value = [
      { key: 'devicePool', value: data.deviceTotalNum },
      { key: 'runningDevices', value: data.deviceUsedNum },
      { key: 'pendingDevices', value: data.deviceWaitingNum },
    ];
  } catch (error) {
    console.error('[containerPool] 获取容器池数量失败:', error);
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: getFormOptions([], []),
  showSearchForm: true,
  gridOptions: {
    columns: useColumns(),
    pagerConfig: {
      enabled: true,
      pageSize: 10,
      pageSizes: [10, 20, 50, 100],
      layouts: ['PrevPage', 'JumpNumber', 'NextPage', 'Sizes', 'Total'],
    },
    checkboxConfig: {
      reserve: true,
    },
    rowConfig: {
      keyField: 'deviceId',
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

function applyFormOptions() {
  gridApi.setState({
    formOptions: getFormOptions(sortOptions.value, groupOptions.value),
  });
}

async function loadSortOptions() {
  try {
    sortOptions.value = await assetEnumsStore.getEnumOptionsAsync(
      'ACCOUNT_ORDER',
    );
  } catch (error) {
    console.error('[containerPool] 获取排序枚举失败:', error);
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
    console.error('[containerPool] 获取分组失败:', error);
    groupOptions.value = [];
  }
  applyFormOptions();
}

function onDisableLock() {
  ElMessage.info($t('containerPool.action.disableLock'));
}

function uniqueIds(values: string[]) {
  return [...new Set(values)];
}

function getSelectedDeviceIds() {
  const grid = (gridApi as any).grid;
  const current = grid.getCheckboxRecords?.() || [];
  const reserve = grid.getCheckboxReserveRecords?.() || [];
  const records = [...reserve, ...current] as Array<Record<string, any>>;
  return uniqueIds(
    records
      .map((item) => item?.deviceId)
      .filter((id): id is string => Boolean(id))
      .map((id) => String(id)),
  );
}

async function onDeviceReset() {
  const deviceIds = getSelectedDeviceIds();

  if (!deviceIds.length) {
    ElMessage.warning($t('containerPool.message.selectDeviceBeforeReset'));
    return;
  }

  try {
    const response = await resetContainerApi({ deviceIds });
    if (response?.code === 100000) {
      ElMessage.success(response.msg || $t('containerPool.message.resetSuccess'));
      (gridApi as any).grid.clearCheckboxReserve?.();
      gridApi.reload();
      await loadContainerPoolNum();
      return;
    }
    // 非 100000：proxyClient 已弹出业务 msg，不提示成功、不刷新
  } catch (error) {
    console.error('[containerPool] 容器重置失败:', error);
    ElMessage.error($t('containerPool.message.resetFailed'));
  }
}

function onQuickNewDevice() {
  ElMessage.info($t('containerPool.action.quickNewDevice'));
}

function onDeviceGroup() {
  ElMessage.info($t('containerPool.action.deviceGroup'));
}

onMounted(() => {
  loadGroupOptions();
  loadSortOptions();
  loadContainerPoolNum();
});
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
          <div class="toolbar-actions">
            <ElButton type="primary" @click="onDeviceReset">
              {{ $t('containerPool.action.deviceReset') }}
            </ElButton>
            <ElButton type="primary" @click="onDisableLock">
              {{ $t('containerPool.action.disableLock') }}
            </ElButton>
            <ElButton type="primary" @click="onQuickNewDevice">
              {{ $t('containerPool.action.quickNewDevice') }}
            </ElButton>
            <ElButton type="primary" @click="onDeviceGroup">
              {{ $t('containerPool.action.deviceGroup') }}
            </ElButton>
          </div>
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

