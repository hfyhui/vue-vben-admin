<script lang="ts" setup>
import type {
  ProxyPoolGroupOption,
  ProxyPoolRegionOption,
  ProxyPoolRow,
  ProxyPoolSortOption,
} from './proxy-pool-table-config';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ProxyPoolNumData } from '#/api/core/asset';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  addProxyRemarkApi,
  batchDeleteProxyApi,
  downloadProxyTemplateApi,
  getAssetGroupApi,
  getProxyPoolNumApi,
  getProxyRegionTreeApi,
  importProxyApi,
} from '#/api/core/asset';
import { postImportTaskPageApi } from '#/api/core/proxy-pool-import-log';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

import ProxyImportLogModal from './ImportLogModal/index.vue';
import ProxyPoolFormModal from './proxy-form-modal.vue';
import ProxyGroupModal from './proxy-group-modal.vue';
import {
  getFormOptions,
  getProxyPoolListApi,
  useColumns,
} from './proxy-pool-table-config';

interface RegionTreeNode {
  name?: string;
  children?: null | RegionTreeNode[];
}

const sortOptions = ref<ProxyPoolSortOption[]>([]);
const groupOptions = ref<ProxyPoolGroupOption[]>([]);
const regionOptions = ref<ProxyPoolRegionOption[]>([]);
const importFileInputRef = ref<HTMLInputElement>();
const importing = ref(false);
const assetEnumsStore = useAssetEnumsStore();

function toSafeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

/** 与 GET /asset/proxy/num 返回字段一致 */
const proxyNumStatKeys: (keyof ProxyPoolNumData)[] = [
  'proxyTotalNum',
  'proxyUsedNum',
  'proxyWaitNum',
  'proxyRiskNum',
];

type ProxyStatRow = { key: keyof ProxyPoolNumData; value: number };

const statsData = ref<ProxyStatRow[]>(
  proxyNumStatKeys.map((key) => ({ key, value: 0 })),
);

const editingRemarkProxyId = ref<null | string>(null);
const editingRemarkValue = ref('');
const savingRemark = ref(false);

async function loadProxyPoolNum() {
  try {
    const response = await getProxyPoolNumApi();
    const data = response?.data ?? {};
    statsData.value = proxyNumStatKeys.map((key) => ({
      key,
      value: toSafeNumber(data[key]),
    }));
  } catch (error) {
    console.error('[proxyPool] 获取代理池数量失败:', error);
  }
}

function mapRegionTree(
  nodes: null | RegionTreeNode[] | undefined,
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
    columns: useColumns({
      getEditingRemarkProxyId: () => editingRemarkProxyId.value,
      getEditingRemarkValue: () => editingRemarkValue.value,
      onStartEditRemark(row) {
        const proxyId = row.proxyId ?? row.id;
        if (!proxyId) {
          ElMessage.warning($t('proxyPool.message.missingProxyId'));
          return;
        }
        editingRemarkProxyId.value = String(proxyId);
        editingRemarkValue.value = row.remark ?? '';
      },
      onChangeEditingRemarkValue(value) {
        editingRemarkValue.value = value;
      },
      async onConfirmEditRemark() {
        if (!editingRemarkProxyId.value || savingRemark.value) return;
        savingRemark.value = true;
        const proxyId = editingRemarkProxyId.value;
        const trimmed = editingRemarkValue?.value.trim();
        // 备注为空时不传 remark 字段，避免后端把空串当作非法值
        const remark = trimmed || undefined;
        try {
          const res = await addProxyRemarkApi({ proxyId, remark });
          if (res?.code === 100_000) {
            ElMessage.success($t('proxyPool.message.editRemarkSuccess'));
            // 只刷新当前页，避免重置到第一页
            gridApi.query?.();
          }
        } catch (error) {
          console.error('[proxyPool] 更新代理备注失败:', error);
          ElMessage.error($t('proxyPool.message.editRemarkFailed'));
        } finally {
          savingRemark.value = false;
          editingRemarkProxyId.value = null;
          editingRemarkValue.value = '';
        }
      },
      onCancelEditRemark() {
        editingRemarkProxyId.value = null;
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
    rowConfig: {
      keyField: 'proxyId',
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
    sortOptions.value =
      await assetEnumsStore.getEnumOptionsAsync('ACCOUNT_ORDER');
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
    if (!(res?.code === 100_000 && res?.data)) {
      ElMessage.error($t('proxyPool.importLog.importTaskIdInvalid'));
      return false;
    }
    getImportTaskInfo(res.data, 0);
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

async function getImportTaskInfo(taskId: string, retryCount: number) {
  const MAX_RETRY = 20;
  const RETRY_DELAY = 5000;

  try {
    const resInfo = await postImportTaskPageApi({
      current: 1,
      size: 10,
      taskId,
    });

    if (
      !resInfo ||
      !resInfo.data ||
      !resInfo.data.records ||
      resInfo.data.records.length === 0
    ) {
      console.warn($t('proxyPool.importLog.importTaskNotFound'));
      if (retryCount < MAX_RETRY) {
        setTimeout(() => {
          getImportTaskInfo(taskId, retryCount + 1);
        }, RETRY_DELAY);
      } else {
        ElMessage.error($t('proxyPool.importLog.importTaskQueryTimeout'));
      }
      return;
    }

    const taskStatus = resInfo.data.records[0].status;
    if (['FAILED', 'SUCCESS'].includes(taskStatus)) {
      console.log(
        $t('proxyPool.importLog.importTaskCompleted', { status: taskStatus }),
      );
      gridApi.reload();
      loadProxyPoolNum();
    } else {
      console.log(
        $t('proxyPool.importLog.importTaskInProgress', {
          status: taskStatus,
          count: retryCount + 1,
        }),
      );
      if (retryCount < MAX_RETRY) {
        setTimeout(() => {
          getImportTaskInfo(taskId, retryCount + 1);
        }, RETRY_DELAY);
      } else {
        ElMessage.error($t('proxyPool.importLog.importTaskQueryTimeout'));
      }
    }
  } catch (error) {
    console.error($t('proxyPool.importLog.importTaskQueryError'), error);
    if (retryCount < MAX_RETRY) {
      setTimeout(() => {
        getImportTaskInfo(taskId, retryCount + 1);
      }, RETRY_DELAY);
    } else {
      ElMessage.error($t('proxyPool.importLog.importTaskQueryFailed'));
    }
  }
}

function onBatchDelete() {
  const proxyIds = getSelectedProxyIds();

  if (proxyIds.length === 0) {
    ElMessage.warning($t('proxyPool.message.selectBeforeDelete'));
    return;
  }

  const count = proxyIds.length;

  ElMessageBox.confirm(
    $t('proxyPool.message.batchDeleteConfirm', { count }),
    $t('proxyPool.message.batchDeleteConfirmTitle'),
    { type: 'warning' },
  )
    .then(async () => {
      try {
        const res = await batchDeleteProxyApi(proxyIds);
        if (res?.code === 100_000) {
          ElMessage.success($t('proxyPool.message.batchDeleteSuccess'));
          (gridApi as any).grid.clearCheckboxReserve?.();
          gridApi.reload();
          await loadProxyPoolNum();
        }
        // 非成功：proxyClient 已按业务 code 弹出 msg，此处不再提示成功、不刷新列表
      } catch (error) {
        console.error('[proxyPool] 批量删除代理失败:', error);
        ElMessage.error($t('proxyPool.message.batchDeleteFailed'));
      }
    })
    .catch(() => {
      // 用户取消
    });
}

function getSelectedProxyIds() {
  const grid = (gridApi as any).grid;
  const current = grid.getCheckboxRecords?.() || [];
  const reserve = grid.getCheckboxReserveRecords?.() || [];
  const records: ProxyPoolRow[] = [...reserve, ...current];
  const idSet = new Set<string>();
  for (const item of records) {
    const id = item.proxyId || item.id;
    if (id) idSet.add(String(id));
  }
  return [...idSet];
}

function onSetGrouping() {
  const proxyIds = getSelectedProxyIds();
  if (proxyIds.length === 0) {
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

onMounted(() => {
  loadRegionOptions();
  loadGroupOptions();
  loadSortOptions();
  loadProxyPoolNum();
});

function onCreateSuccess() {
  gridApi.reload();
  loadProxyPoolNum();
  void loadRegionOptions();
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

function onImportLog() {
  importLogModalApi.open();
}

const [ImportLogModal, importLogModalApi] = useVbenModal({
  connectedComponent: ProxyImportLogModal,
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
            <ElButton type="primary" :loading="importing" @click="onImport">
              {{ $t('proxyPool.action.import') }}
            </ElButton>
            <ElButton
              type="primary"
              plain
              :loading="importing"
              @click="onImportLog"
            >
              {{ $t('proxyPool.action.importLog') }}
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
      <ImportLogModal />
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
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;

  .el-button + .el-button {
    margin-left: 0;
  }
}

:deep(.el-form-item) {
  margin-bottom: 14px;
}

:deep(.vxe-table--empty-content) {
  padding: 40px 0 !important;
}
</style>
