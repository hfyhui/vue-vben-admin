<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import {
  addDeviceRemarkApi,
  getAssetAiboxDeviceModelsApi,
  getAssetCloudDeviceModelsApi,
  getAssetFutureDeviceModelsApi,
  getAssetGroupApi,
  getAssetOperatorListApi,
  getContainerPoolNumApi,
  lockDeviceApi,
  resetContainerApi,
  type AssetGroupItem,
  type MobileDeviceBrandItem,
  type AssetOperatorItem,
  type ContainerPoolNumData,
} from '#/api/core/asset';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

import {
  type ContainerPoolBrandOption,
  type ContainerPoolStatusOption,
  type ContainerPoolSortOption,
  getContainerPoolListApi,
  getFormOptions,
  useColumns,
} from './container-pool-table-config';
import * as DeviceGroupModalModule from './device-group-modal.vue';
import * as QuickNewDeviceModalModule from './quick-new-device-modal.vue';

const sortOptions = ref<ContainerPoolSortOption[]>([]);
const statusOptions = ref<ContainerPoolStatusOption[]>([]);
const operatorOptions = ref<AssetOperatorItem[]>([]);
const brandOptions = ref<ContainerPoolBrandOption[]>([]);
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

const editingRemarkDeviceId = ref<string | null>(null);
const editingRemarkValue = ref('');
const savingRemark = ref(false);

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
  formOptions: getFormOptions([], [], [], [], []),
  showSearchForm: true,
  gridOptions: {
    columns: useColumns({
      getEditingRemarkDeviceId: () => editingRemarkDeviceId.value,
      getEditingRemarkValue: () => editingRemarkValue.value,
      onStartEditRemark(row) {
        const deviceId = row.deviceId;
        if (!deviceId) {
          ElMessage.warning($t('containerPool.message.missingDeviceId'));
          return;
        }
        editingRemarkDeviceId.value = String(deviceId);
        editingRemarkValue.value = row.remark ?? '';
      },
      onChangeEditingRemarkValue(value) {
        editingRemarkValue.value = value;
      },
      async onConfirmEditRemark() {
        if (!editingRemarkDeviceId.value || savingRemark.value) return;
        savingRemark.value = true;
        const deviceId = editingRemarkDeviceId.value;
        const trimmed = editingRemarkValue.value.trim();
        const remark = trimmed ? trimmed : undefined;
        try {
          const res = await addDeviceRemarkApi({ deviceId, remark });
          if (res?.code === 100000) {
            ElMessage.success($t('containerPool.message.editRemarkSuccess'));
            gridApi.query?.();
          } else {
            ElMessage.error(
              res?.msg || $t('containerPool.message.editRemarkFailed'),
            );
          }
        } catch (error) {
          console.error('[containerPool] 更新设备备注失败:', error);
          ElMessage.error($t('containerPool.message.editRemarkFailed'));
        } finally {
          savingRemark.value = false;
          editingRemarkDeviceId.value = null;
          editingRemarkValue.value = '';
        }
      },
      onCancelEditRemark() {
        editingRemarkDeviceId.value = null;
        editingRemarkValue.value = '';
      },
    }),
    pagerConfig: {
      enabled: true,
      pageSize: 10,
      pageSizes: [10, 20, 50, 100],
      layouts: ['PrevPage', 'JumpNumber', 'NextPage', 'Sizes', 'Total'],
    },
    checkboxConfig: {
      reserve: true,
    },
    rowClassName: ({ row }: { row: Record<string, any> }) =>
      row.isLock ? 'account-row--locked' : '',
    rowConfig: {
      keyField: 'deviceId',
      rowClassName: ({ row }: { row: Record<string, any> }) =>
        row.isLock ? 'account-row--locked' : '',
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
    formOptions: getFormOptions(
      sortOptions.value,
      statusOptions.value,
      operatorOptions.value,
      brandOptions.value,
      groupOptions.value,
    ),
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

async function loadStatusOptions() {
  try {
    statusOptions.value = await assetEnumsStore.getEnumOptionsAsync(
      'NEW_DEVICE_STATUS',
    );
  } catch (error) {
    console.error('[containerPool] 获取设备状态枚举失败:', error);
    statusOptions.value = [];
  }
  applyFormOptions();
}

async function loadOperatorOptions() {
  try {
    const response = await getAssetOperatorListApi();
    operatorOptions.value = Array.isArray(response?.data) ? response.data : [];
  } catch (error) {
    console.error('[containerPool] 获取运营商列表失败:', error);
    operatorOptions.value = [];
  }
  applyFormOptions();
}

async function loadBrandModelOptions() {
  try {
    const [aiboxRes, futureRes, cloudRes] = await Promise.all([
      getAssetAiboxDeviceModelsApi(),
      getAssetFutureDeviceModelsApi(),
      getAssetCloudDeviceModelsApi(),
    ]);
    const allModels: MobileDeviceBrandItem[] = [
      ...(aiboxRes?.code === 100000 ? (aiboxRes.data?.mobileDeviceModels ?? []) : []),
      ...(futureRes?.code === 100000 ? (futureRes.data?.mobileDeviceModels ?? []) : []),
      ...(cloudRes?.code === 100000 ? (cloudRes.data?.mobileDeviceModels ?? []) : []),
    ];

    const brandSet = new Set<string>();
    for (const brandItem of allModels) {
      const brand = String(brandItem?.brand ?? '').trim();
      if (brand) brandSet.add(brand);
    }

    brandOptions.value = [...brandSet].map((item) => ({
      label: item,
      value: item,
    }));
  } catch (error) {
    console.error('[containerPool] 获取品牌型号列表失败:', error);
    brandOptions.value = [];
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
    console.error('[containerPool] 获取分组失败:', error);
    groupOptions.value = [];
  }
  applyFormOptions();
}

function uniqueIds(values: string[]) {
  return [...new Set(values)];
}

function getSelectedDeviceRecords() {
  const grid = (gridApi as any).grid;
  const current = grid.getCheckboxRecords?.() || [];
  const reserve = grid.getCheckboxReserveRecords?.() || [];
  return [...reserve, ...current] as Array<Record<string, any>>;
}

function getSelectedDeviceIds() {
  const records = getSelectedDeviceRecords();
  return uniqueIds(
    records
      .map((item) => item?.deviceId)
      .filter((id): id is string => Boolean(id))
      .map((id) => String(id)),
  );
}

/** 一键新机：仅允许勾选一台设备，按 deviceId 去重后取唯一一行 */
function getSingleSelectedRowForQuickNew(): Record<string, any> | null {
  const records = getSelectedDeviceRecords();
  const map = new Map<string, Record<string, any>>();
  for (const row of records) {
    const id = row?.deviceId;
    if (id) map.set(String(id), row);
  }
  if (map.size !== 1) return null;
  return map.values().next().value ?? null;
}

/** 设备分组：传给接口 `mobiles` 的列表数据（仅取必要字段） */
function getSelectedDeviceMobiles() {
  const grid = (gridApi as any).grid;
  const current = grid.getCheckboxRecords?.() || [];
  const reserve = grid.getCheckboxReserveRecords?.() || [];
  const records = [...reserve, ...current] as Array<Record<string, any>>;

  // 给“设备分组”接口的 mobiles 只保留必要字段，避免透传整行数据
  return records.map((item) => ({
    id: item?.deviceId,
    deviceId: item?.deviceId,
    deviceIp: item?.deviceIp,
    deviceCategory: item?.phoneBrand ?? item?.brand,
    deviceStatus: item?.deviceStatus,
    deviceIdx: item?.deviceIdx ?? '',
    deviceAliases: item?.deviceAliases ?? item?.phoneModel ?? '',
  }));
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
  const row = getSingleSelectedRowForQuickNew();
  if (!row) {
    ElMessage.warning($t('containerPool.message.selectOneDeviceForQuickNew'));
    return;
  }
  if (!row.deviceId) {
    ElMessage.warning($t('containerPool.message.missingDeviceId'));
    return;
  }
  quickNewDeviceModalApi.setData({ row }).open();
}

function onQuickNewDeviceSuccess() {
  (gridApi as any).grid.clearCheckboxReserve?.();
  gridApi.reload();
  void loadContainerPoolNum();
}

function onDeviceGroup() {
  const mobiles = getSelectedDeviceMobiles();
  if (!mobiles.length) {
    ElMessage.warning($t('containerPool.message.selectBeforeGrouping'));
    return;
  }
  deviceGroupModalApi
    .setData({
      mobiles,
      groupOptions: groupOptions.value,
    })
    .open();
}

function onDeviceGroupSuccess() {
  gridApi.reload();
  void loadGroupOptions();
}

const [DeviceGroupModalComp, deviceGroupModalApi] = useVbenModal({
  connectedComponent:
    (DeviceGroupModalModule as any).default ?? DeviceGroupModalModule,
});

const [QuickNewDeviceModalComp, quickNewDeviceModalApi] = useVbenModal({
  connectedComponent:
    (QuickNewDeviceModalModule as any).default ?? QuickNewDeviceModalModule,
});

onMounted(() => {
  loadGroupOptions();
  loadSortOptions();
  loadStatusOptions();
  loadOperatorOptions();
  loadBrandModelOptions();
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
      <DeviceGroupModalComp @success-after="onDeviceGroupSuccess" />
      <QuickNewDeviceModalComp @success-after="onQuickNewDeviceSuccess" />
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

/* 锁定行置灰，与账号池 accountPool/index.vue 一致 */
:deep(tr.account-row--locked td.vxe-body--column) {
  background-color: var(--el-fill-color-light) !important;
}

:deep(tr.account-row--locked .vxe-cell) {
  color: var(--el-text-color-placeholder) !important;
}
</style>

