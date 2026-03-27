<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';
import {
  batchDeleteAccountApi,
  downloadAccountTemplateApi,
  getAssetAppListApi,
  getAccountPoolNumApi,
  getAssetGroupApi,
  importAccountApi,
} from '#/api/core/asset';

import {
  type AccountPoolGroupOption,
  type AccountPoolPlatformOption,
  type AccountPoolSortOption,
  getAccountPoolListApi,
  getFormOptions,
  useColumns,
} from './account-pool-table-config';
import AccountPoolFormModal from './form-modal.vue';

const importFileInputRef = ref<HTMLInputElement>();
const currentAppId = ref('');
const selectedPlatformIds = ref<string[]>([]);
const importAppId = ref('');
const importing = ref(false);
const groupOptions = ref<AccountPoolGroupOption[]>([]);
const platformOptions = ref<AccountPoolPlatformOption[]>([]);
const sortOptions = ref<AccountPoolSortOption[]>([]);
const assetEnumsStore = useAssetEnumsStore();

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: getFormOptions([]),
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
          const platform = (formValues?.platform ?? []) as string[];
          selectedPlatformIds.value = platform.filter(Boolean);
          currentAppId.value =
            selectedPlatformIds.value.length === 1
              ? (selectedPlatformIds.value[0] ?? '')
              : '';
          if (currentAppId.value) {
            importAppId.value = currentAppId.value;
          }
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
  formModalApi
    .setData({
      defaultAppId: currentAppId.value || '',
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
  const checkboxRecords = (gridApi as any).grid.getCheckboxRecords?.() || [];
  if (checkboxRecords.length === 0) {
    ElMessage.warning($t('accountPool.message.selectBeforeDelete'));
    return;
  }

  const ids = checkboxRecords.map((item: any) => item.accountId);

  if (!ids.length) {
    ElMessage.warning($t('accountPool.message.selectIdFailed'));
    return;
  }

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
    groupOptions.value = (response?.data ?? []) as AccountPoolGroupOption[];
  } catch (error) {
    console.error('[accountPool] 获取分组失败:', error);
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

function onCreateSuccess() {
  gridApi.reload();
  loadAccountPoolNum();
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: AccountPoolFormModal,
});

onMounted(() => {
  loadAccountPoolNum();
  loadGroupOptions();
  loadPlatformOptions();
  loadSortOptions();
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
          <ElButton type="danger" @click="onBatchDelete">
            {{ $t('accountPool.action.batchDelete') }}
          </ElButton>
        </template>
      </Grid>
      <FormModal @success-after="onCreateSuccess" />
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

.import-platform-select {
  width: 220px;
}
</style>
