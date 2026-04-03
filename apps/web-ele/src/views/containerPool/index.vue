<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import {
  getAssetGroupApi,
  getContainerPoolNumApi,
  lockDeviceApi,
  resetContainerApi,
  type AssetGroupItem,
  type ContainerPoolNumData,
} from '#/api/core/asset';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

import {
  type ContainerPoolSortOption,
  getContainerPoolListApi,
  getFormOptions,
  useColumns,
} from './container-pool-table-config';

const sortOptions = ref<ContainerPoolSortOption[]>([]);
const groupOptions = ref<AssetGroupItem[]>([]);
const assetEnumsStore = useAssetEnumsStore();
const locking = ref(false);

function toSafeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

/** 与 GET /asset/container/num 返回字段一致 */
const containerNumStatKeys: (keyof ContainerPoolNumData)[] = [
  'deviceTotalNum',
  'deviceUsedNum',
  'deviceWaitingNum',
  'deviceRiskNum',
];

type ContainerStatRow = { key: keyof ContainerPoolNumData; value: number };

const statsData = ref<ContainerStatRow[]>(
  containerNumStatKeys.map((key) => ({ key, value: 0 })),
);

async function loadContainerPoolNum() {
  try {
    const response = await getContainerPoolNumApi();
    const data = response?.data ?? {};
    statsData.value = containerNumStatKeys.map((key) => ({
      key,
      value: toSafeNumber(data[key]),
    }));
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
    groupOptions.value = response?.data;
  } catch (error) {
    console.error('[containerPool] 获取分组失败:', error);
    groupOptions.value = [];
  }
  applyFormOptions();
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

function onBatchLock(isLock: boolean) {
  if (locking.value) return;
  const deviceIds = getSelectedDeviceIds();
  if (!deviceIds.length) {
    ElMessage.warning($t('containerPool.message.selectBeforeLock'));
    return;
  }
  const count = deviceIds.length;
  const confirmMessage = isLock
    ? $t('containerPool.message.batchLockConfirm', { count })
    : $t('containerPool.message.batchUnlockConfirm', { count });
  const confirmTitle = isLock
    ? $t('containerPool.message.batchLockConfirmTitle')
    : $t('containerPool.message.batchUnlockConfirmTitle');

  ElMessageBox.confirm(confirmMessage, confirmTitle, { type: 'warning' })
    .then(async () => {
      locking.value = true;
      try {
        const res = await lockDeviceApi({ deviceIds, isLock });
        if (res?.code === 100000) {
          ElMessage.success(
            isLock
              ? $t('containerPool.message.batchLockSuccess', { count })
              : $t('containerPool.message.batchUnlockSuccess', { count }),
          );
          (gridApi as any).grid.clearCheckboxReserve?.();
          gridApi.reload();
          await loadContainerPoolNum();
          return;
        }
      } catch (error) {
        console.error('[containerPool] 锁定/解锁设备失败:', error);
        ElMessage.error(
          isLock
            ? $t('containerPool.message.batchLockFailed')
            : $t('containerPool.message.batchUnlockFailed'),
        );
      } finally {
        locking.value = false;
      }
    })
    .catch(() => {
      // 用户取消
    });
}

async function onDeviceReset() {
  const deviceIds = getSelectedDeviceIds();

  if (!deviceIds.length) {
    ElMessage.warning($t('containerPool.message.selectDeviceBeforeReset'));
    return;
  }

  const count = deviceIds.length;
  try {
    await ElMessageBox.confirm(
      $t('containerPool.message.resetConfirm', { count }),
      $t('containerPool.message.resetConfirmTitle'),
      {
        type: 'warning',
        confirmButtonText: $t('containerPool.message.confirmButtonText'),
        cancelButtonText: $t('containerPool.message.cancelButtonText'),
        closeOnClickModal: false,
        beforeClose: async (action: string, instance: any, done: any) => {
          if (action !== 'confirm') {
            done();
            return;
          }

          instance.confirmButtonLoading = true;
          try {
            const response = await resetContainerApi({ deviceIds });
            if (response?.code === 100000) {
              ElMessage.success(
                response.msg || $t('containerPool.message.resetSuccess'),
              );
              (gridApi as any).grid.clearCheckboxReserve?.();
              gridApi.reload();
              await loadContainerPoolNum();
              done();
              return;
            }

            ElMessage.error(
              response?.msg || $t('containerPool.message.resetFailed'),
            );
            done(false);
          } catch (error) {
            console.error('[containerPool] 容器重置失败:', error);
            ElMessage.error($t('containerPool.message.resetFailed'));
            done(false);
          } finally {
            instance.confirmButtonLoading = false;
          }
        },
      },
    );
  } catch {
    // 用户取消
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
            <ElButton
              type="warning"
              :loading="locking"
              @click="onBatchLock(true)"
            >
              {{ $t('containerPool.action.lock') }}
            </ElButton>
            <ElButton
              type="success"
              :loading="locking"
              @click="onBatchLock(false)"
            >
              {{ $t('containerPool.action.unlock') }}
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

