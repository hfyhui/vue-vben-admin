<script lang="ts" setup>
import type { VxeGridListeners, VxeGridProps } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import {
  batchDeleteLicenseApi,
  createLicenseApi,
  deleteLicenseApi,
  downloadLicenseApi,
  getLicenseDetailApi,
  getLicenseListApi,
  importLicenseApi,
  updateLicenseApi,
} from '../../api/core/license';
import LicenseDetail from './components/detail.vue';
import LicenseForm from './components/form.vue';
import SearchForm from './components/searchForm.vue';

const selectedRows = ref<any[]>([]);
const showForm = ref(false);
const showDetail = ref(false);
const editData = ref<any>(null);
const detailData = ref<any>(null);

const gridOptions: VxeGridProps<any> = {
  columns: [
    { type: 'checkbox', width: 50, align: 'center' },
    {
      field: 'customerName',
      title: $t('licenseManage.search.customerName'),
      minWidth: 150,
    },
    { field: 'remark', title: $t('licenseManage.form.remark'), minWidth: 150 },
    {
      field: 'licenseType',
      title: $t('licenseManage.form.licenseType'),
      minWidth: 100,
      formatter: ({ cellValue }) => {
        if (cellValue === 'trial') return $t('licenseManage.form.trial');
        if (cellValue === 'official') return $t('licenseManage.form.official');
        return '';
      },
    },
    {
      field: 'expireTime',
      title: $t('licenseManage.form.expireTime'),
      minWidth: 150,
    },
    {
      field: 'maxConcurrentUsers',
      title: $t('licenseManage.form.maxUsers'),
      minWidth: 120,
    },
    {
      field: 'fingerprint',
      title: $t('licenseManage.form.fingerprint'),
      minWidth: 150,
    },
    {
      field: 'status',
      title: $t('licenseManage.status'),
      minWidth: 100,
      formatter: ({ cellValue }) => {
        if (cellValue === 'normal') return $t('licenseManage.statusNormal');
        if (cellValue === 'invalid') return $t('licenseManage.statusInvalid');
        return '';
      },
    },
    {
      field: 'action',
      title: $t('licenseManage.actionTitle'),
      width: 180,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ],
  pagerConfig: {
    enabled: true,
    pageSize: 10,
    pageSizes: [10, 20, 50, 100],
    layouts: ['PrevPage', 'JumpNumber', 'NextPage', 'Sizes', 'Total'],
  },
  toolbarConfig: {
    slots: {
      tools: 'toolbar-tools',
    },
  },
  proxyConfig: {
    ajax: {
      query: async ({ page, form }) => {
        const res = await getLicenseListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
          customer: form?.customerName,
          licenseType: form?.licenseType,
          // expireTimeRange: form?.expireTimeRange, // 如有需要可加
        });
        return res.data;
      },
    },
    props: {
      result: 'items',
      total: 'total',
    },
  },
};

const gridEvents: VxeGridListeners<any> = {
  'checkbox-all': ({ records }) => (selectedRows.value = records),
  'checkbox-change': ({ records }) => (selectedRows.value = records),
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
  gridEvents,
});

function onAdd() {
  editData.value = null;
  showForm.value = true;
}
function onEdit(row: any) {
  editData.value = { ...row };
  showForm.value = true;
}
async function submit(values: any) {
  if (editData.value && editData.value.id) {
    await updateLicenseApi(editData.value.id, values);
    ElMessage.success($t('licenseManage.message.editSuccess'));
  } else {
    await createLicenseApi(values);
    ElMessage.success($t('licenseManage.message.addSuccess'));
  }
  showForm.value = false;
  gridApi.query();
}
async function onImportLicense(file: File) {
  const res = await importLicenseApi(file);
  if (res.code === 0) {
    ElMessage.success($t('licenseManage.message.importSuccess'));
    gridApi.query();
  } else {
    ElMessage.error(res.message || $t('licenseManage.message.importFail'));
  }
  return false;
}
async function onDownload(row: any) {
  await downloadLicenseApi(row.id);
}
async function onView(row: any) {
  try {
    const res = await getLicenseDetailApi(row.id);
    if (res.code === 0) {
      detailData.value = res.data;
      showDetail.value = true;
    } else {
      ElMessage.error(res.message || $t('licenseManage.message.getDetailFail'));
    }
  } catch {
    ElMessage.error($t('licenseManage.message.getDetailFail'));
  }
}
async function onDelete(row: any) {
  await ElMessageBox.confirm(
    $t('licenseManage.message.deleteConfirm'),
    $t('licenseManage.title'),
    {
      type: 'warning',
    },
  );
  await deleteLicenseApi(row.id);
  gridApi.query();
  ElMessage.success($t('licenseManage.message.deleteSuccess'));
}
async function onBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning($t('licenseManage.message.selectToDelete'));
    return;
  }
  await ElMessageBox.confirm(
    $t('licenseManage.message.batchDeleteConfirm'),
    $t('licenseManage.title'),
    {
      type: 'warning',
    },
  );
  const ids = selectedRows.value.map((row) => row.id);
  await batchDeleteLicenseApi(ids);
  selectedRows.value = [];
  gridApi.query();
  ElMessage.success($t('licenseManage.message.deleteSuccess'));
}
function onSearchForm(values: Record<string, any>) {
  gridApi.query({ ...values, page: 1 });
}
</script>

<template>
  <div class="license-manage-root">
    <!-- 搜索区 -->
    <div class="search-card">
      <SearchForm @search="onSearchForm" />
    </div>
    <div class="action-bar">
      <ElButton type="primary" @click="onAdd">
        {{ $t('licenseManage.action.add') }}
      </ElButton>
      <ElUpload
        :show-file-list="false"
        :before-upload="onImportLicense"
        accept=".json"
        style="display: inline-block"
      >
        <ElButton type="primary">
          {{ $t('licenseManage.action.import') }}
        </ElButton>
      </ElUpload>
      <ElButton type="danger" @click="onBatchDelete">
        {{ $t('licenseManage.action.batchDelete') }}
      </ElButton>
    </div>
    <Grid>
      <template #action="{ row }">
        <ElButton type="text" @click="onDownload(row)">
          {{ $t('licenseManage.action.download') }}
        </ElButton>
        <ElButton type="text" @click="onView(row)">
          {{ $t('licenseManage.action.view') }}
        </ElButton>
        <ElButton type="text" @click="onDelete(row)" style="color: #f56c6c">
          {{ $t('licenseManage.action.delete') }}
        </ElButton>
      </template>
    </Grid>

    <ElDialog
      v-model="showForm"
      :title="$t('licenseManage.action.add')"
      width="600px"
      :close-on-click-modal="false"
    >
      <LicenseForm
        :visible="showForm"
        :model-value="editData"
        @submit="submit"
        @update:visible="showForm = $event"
      />
    </ElDialog>

    <ElDialog
      v-model="showDetail"
      :title="$t('licenseManage.detail.title')"
      width="800px"
      :close-on-click-modal="false"
    >
      <LicenseDetail
        :visible="showDetail"
        :data="detailData"
        @update:visible="showDetail = $event"
        @download="onDownload"
        @edit="onEdit"
      />
    </ElDialog>
  </div>
</template>

<style scoped>
.license-manage-root {
  min-height: 100vh;
  padding: 20px;
}

.search-card {
  margin-bottom: 16px;
}

.search-form {
  margin-bottom: 0;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #333;
}

:deep(.el-button--text) {
  padding: 0 8px;
  font-size: 14px;
}
</style>
