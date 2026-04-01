<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import { ASSET_ENUMS_CACHE_KEY, useAssetEnumsStore } from '#/store';
import {
  batchDeleteAccountApi,
  downloadAccountTemplateApi,
  getAssetAppListApi,
  getAccountPoolNumApi,
  getAssetGroupApi,
  importAccountApi,
  lockAccountApi,
} from '#/api/core/asset';

import {
  type AccountPoolRow,
  type AccountPoolGroupOption,
  type AccountPoolPlatformOption,
  type AccountPoolSortOption,
  getAccountPoolListApi,
  getFormOptions,
  useColumns,
} from './account-pool-table-config';
import AccountPoolFormModal from './form-modal.vue';
import AccountGroupModal from './account-group-modal.vue';

const importFileInputRef = ref<HTMLInputElement>();
const currentAppId = ref('');
const selectedPlatformIds = ref<string[]>([]);
const importAppId = ref('');
const importing = ref(false);
const locking = ref(false);
const groupOptions = ref<AccountPoolGroupOption[]>([]);
const platformOptions = ref<AccountPoolPlatformOption[]>([]);
const sortOptions = ref<AccountPoolSortOption[]>([]);
const riskLevelMap = ref<Record<string, string>>(readRiskLevelMapFromLocalCache());
const assetEnumsStore = useAssetEnumsStore();

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: getFormOptions([]),
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
          const platform = (formValues?.platform ?? []) as string[];
          selectedPlatformIds.value = platform.filter(Boolean);
          currentAppId.value =
            selectedPlatformIds.value.length === 1
              ? (selectedPlatformIds.value[0] ?? '')
              : '';
          if (currentAppId.value) {
            importAppId.value = currentAppId.value;
          }
          const response = await getAccountPoolListApi({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
          const list = (response?.list ?? []).map((item: AccountPoolRow) => ({
            ...item,
            riskAlert: mapRiskLevelLabel(item.riskAlert),
          }));
          return {
            ...response,
            list,
          };
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
  formModalApi
    .setData({
      defaultAppId: currentAppId.value,
      groupOptions: groupOptions.value,
      platformOptions: platformOptions.value,
    })
    .open();
}

function onImport() {
  if (importing.value) return;
  if (!importAppId.value) {
    ElMessage.warning($t('accountPool.message.selectImportPlatformFirst'));
    return;
  }
  importFileInputRef.value?.click();
}

async function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  const appId = importAppId.value.trim();
  if (!appId) {
    ElMessage.warning($t('accountPool.message.missingImportAppId'));
    return;
  }

  importing.value = true;
  try {
    const res = await importAccountApi({ appId, file });
    if (res?.code === 100000) {
      ElMessage.success($t('accountPool.message.importSuccess'));
      gridApi.reload();
      loadAccountPoolNum();
    } else {
      ElMessage.error(res?.msg || $t('accountPool.message.importFailed'));
    }
  } catch (error) {
    console.error('[accountPool] 导入账号失败:', error);
    ElMessage.error($t('accountPool.message.importFailed'));
  } finally {
    importing.value = false;
  }
}

function onBatchDelete() {
  const ids = getSelectedAccountIds($t('accountPool.message.selectBeforeDelete'));
  if (!ids.length) return;

  const count = ids.length;

  ElMessageBox.confirm(
    $t('accountPool.message.batchDeleteConfirm', { count }),
    $t('accountPool.message.batchDeleteConfirmTitle'),
    { type: 'warning' },
  )
    .then(async () => {
      const res = await batchDeleteAccountApi(ids);
      if (res?.code === 100000) {
        ElMessage.success(
          $t('accountPool.message.batchDeleteSuccess', { count }),
        );
        gridApi.reload();
      } else {
        ElMessage.error(res?.msg || $t('accountPool.message.batchDeleteFailed'));
      }
    })
    .catch(() => {
      // 用户取消
    });
}

function getSelectedAccountIds(emptyTip: string) {
  const checkboxRecords = (gridApi as any).grid.getCheckboxRecords?.() || [];
  if (checkboxRecords.length === 0) {
    ElMessage.warning(emptyTip);
    return [];
  }
  const ids = checkboxRecords
    .map((item: any) => item.accountId)
    .filter((id: unknown) => Boolean(id));
  if (!ids.length) {
    ElMessage.warning($t('accountPool.message.selectIdFailed'));
    return [];
  }
  return ids;
}

function onBatchLock(lock: boolean) {
  if (locking.value) return;
  const ids = getSelectedAccountIds($t('accountPool.message.selectBeforeLock'));
  if (!ids.length) return;
  const count = ids.length;
  const confirmMessage = lock
    ? $t('accountPool.message.batchLockConfirm', { count })
    : $t('accountPool.message.batchUnlockConfirm', { count });
  const confirmTitle = lock
    ? $t('accountPool.message.batchLockConfirmTitle')
    : $t('accountPool.message.batchUnlockConfirmTitle');

  ElMessageBox.confirm(confirmMessage, confirmTitle, { type: 'warning' })
    .then(async () => {
      locking.value = true;
      try {
        const res = await lockAccountApi({ accountIds: ids, lock });
        if (res?.code === 100000) {
          ElMessage.success(
            lock
              ? $t('accountPool.message.batchLockSuccess', { count })
              : $t('accountPool.message.batchUnlockSuccess', { count }),
          );
          gridApi.reload();
          return;
        }
        ElMessage.error(
          res?.msg ||
            (lock
              ? $t('accountPool.message.batchLockFailed')
              : $t('accountPool.message.batchUnlockFailed')),
        );
      } catch (error) {
        console.error('[accountPool] 锁定/解锁账号失败:', error);
        ElMessage.error(
          lock
            ? $t('accountPool.message.batchLockFailed')
            : $t('accountPool.message.batchUnlockFailed'),
        );
      } finally {
        locking.value = false;
      }
    })
    .catch(() => {
      // 用户取消
    });
}

function onSetGrouping() {
  const accountIds = getSelectedAccountIds(
    $t('accountPool.message.selectBeforeGrouping'),
  );
  if (!accountIds.length) return;
  groupModalApi
    .setData({
      accountIds,
      groupOptions: groupOptions.value,
    })
    .open();
}

async function onDownloadTemplate() {
  try {
    await downloadAccountTemplateApi();
  } catch (error) {
    console.error('[accountPool] 下载账号模板失败:', error);
    ElMessage.error($t('accountPool.message.downloadFailed'));
  }
}

const statsData = ref([
  { key: 'accountPool', value: 56 },
  { key: 'runningAccounts', value: 20 },
  { key: 'pendingAccounts', value: 36 },
  { key: 'riskControlAccounts', value: 3 },
]);

function toSafeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

async function loadAccountPoolNum() {
  try {
    const response = await getAccountPoolNumApi();
    const data = response?.data ?? {};
    statsData.value = [
      { key: 'accountPool', value: toSafeNumber(data.accountTotalNum) },
      { key: 'runningAccounts', value: toSafeNumber(data.accountUsedNum) },
      { key: 'pendingAccounts', value: toSafeNumber(data.accountWaitNum) },
      { key: 'riskControlAccounts', value: toSafeNumber(data.accountRiskNum) },
    ];
  } catch (error) {
    console.error(error);
  }
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
    console.error('[accountPool] 获取分组失败:', error);
    groupOptions.value = [];
  }
  applyFormOptions();
}

async function loadPlatformOptions() {
  try {
    const data = await getAssetAppListApi({
      current: 1,
      size: 200,
      applicationStatus: 0,
    });
    platformOptions.value = (data.records ?? [])
      .filter((item) => item.id)
      .map((item) => ({
        id: item.id ?? '',
        applicationName: item.applicationName ?? '',
      }));
  } catch (error) {
    console.error('[accountPool] 获取平台筛选项失败:', error);
  }
  applyFormOptions();
}

function applyFormOptions() {
  gridApi.setState({
    formOptions: getFormOptions(
      groupOptions.value,
      platformOptions.value,
      sortOptions.value,
    ),
  });
}

function mapRiskLevelLabel(riskLevel: string) {
  return riskLevelMap.value[riskLevel] ?? '';
}

async function loadSortOptions() {
  try {
    sortOptions.value = await assetEnumsStore.getEnumOptionsAsync(
      'ACCOUNT_ORDER',
    );
  } catch (error) {
    console.error('[accountPool] 获取排序枚举失败:', error);
    sortOptions.value = [];
  }
  applyFormOptions();
}

function readRiskLevelMapFromLocalCache() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(ASSET_ENUMS_CACHE_KEY) || '{}',
    );
    const children = parsed.ACCOUNT_RISK_LEVEL.children as Array<{
      name: string;
      content: string;
    }>;
    return children.reduce<Record<string, string>>((acc, item) => {
      acc[item.name] = item.content;
      return acc;
    }, {});
  } catch (error) {
    console.error('[accountPool] 读取本地风险等级枚举失败:', error);
    return {};
  }
}

function onCreateSuccess() {
  gridApi.reload();
  loadAccountPoolNum();
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: AccountPoolFormModal,
});

function onGroupSuccess() {
  gridApi.reload();
  loadGroupOptions();
}

const [GroupModal, groupModalApi] = useVbenModal({
  connectedComponent: AccountGroupModal,
});

onMounted(() => {
  loadAccountPoolNum();
  loadGroupOptions();
  loadPlatformOptions();
  loadSortOptions();
  riskLevelMap.value = readRiskLevelMapFromLocalCache();
});
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
          <el-select
            v-model="importAppId"
            class="mr-2 import-platform-select"
            :placeholder="$t('accountPool.filter.importPlatformPlaceholder')"
            clearable
            filterable
          >
            <el-option
              v-for="item in platformOptions"
              :key="item.id"
              :label="item.applicationName || item.id"
              :value="item.id"
            />
          </el-select>
          <ElButton
            class="mr-2"
            type="primary"
            :loading="importing"
            @click="onImport"
          >
            {{ $t('accountPool.action.import') }}
          </ElButton>
          <input
            ref="importFileInputRef"
            type="file"
            accept=".xlsx,.xls,.csv"
            style="display: none"
            @change="onImportFileChange"
          />
          <ElButton class="mr-2" type="primary" @click="onDownloadTemplate">
            {{ $t('accountPool.action.downloadTemplate') }}
          </ElButton>
          <ElButton class="mr-2" type="danger" @click="onBatchDelete">
            {{ $t('accountPool.action.batchDelete') }}
          </ElButton>
          <ElButton
            class="mr-2"
            type="warning"
            :loading="locking"
            @click="onBatchLock(true)"
          >
            {{ $t('accountPool.action.lock') }}
          </ElButton>
          <ElButton
            class="mr-2"
            type="success"
            :loading="locking"
            @click="onBatchLock(false)"
          >
            {{ $t('accountPool.action.unlock') }}
          </ElButton>
          <ElButton class="ml-2" type="primary" @click="onSetGrouping">
            {{ $t('accountPool.action.setGrouping') }}
          </ElButton>
        </template>
      </Grid>
      <FormModal @success-after="onCreateSuccess" />
      <GroupModal @success-after="onGroupSuccess" />
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

.ml-2 {
  margin-left: 8px;
}

.import-platform-select {
  width: 220px;
}
</style>
