<script lang="ts" setup>
import type { VxeGridListeners, VxeGridProps } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

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

const licenseTypes = [
  { label: '试用', value: 'trial' },
  { label: '正式', value: 'official' },
];

const searchForm = ref({
  customerName: '',
  licenseType: '',
  expireTimeRange: [] as string[],
});
const selectedRows = ref<any[]>([]);
const showForm = ref(false);
const showDetail = ref(false);
const editData = ref<any>(null);
const detailData = ref<any>(null);

const gridOptions: VxeGridProps<any> = {
  columns: [
    { type: 'checkbox', width: 50, align: 'center' },
    { field: 'customerName', title: '客户名称', minWidth: 150 },
    { field: 'remark', title: '备注', minWidth: 150 },
    {
      field: 'licenseType',
      title: '授权类型',
      minWidth: 100,
      formatter: ({ cellValue }) => {
        if (cellValue === 'trial') return '试用';
        if (cellValue === 'official') return '正式';
        return '';
      },
    },
    { field: 'expireTime', title: '过期时间', minWidth: 150 },
    { field: 'maxConcurrentUsers', title: '最大并发用户', minWidth: 120 },
    { field: 'fingerprint', title: '指纹特征', minWidth: 150 },
    {
      field: 'status',
      title: '状态',
      minWidth: 100,
      formatter: ({ cellValue }) => {
        if (cellValue === 'normal') return '正常';
        if (cellValue === 'invalid') return '无效';
        return '';
      },
    },
    {
      field: 'action',
      title: '操作',
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
    form: searchForm.value,
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

function onSearch() {
  gridApi.query();
}
function onReset() {
  searchForm.value.customerName = '';
  searchForm.value.licenseType = '';
  searchForm.value.expireTimeRange = [];
  gridApi.query();
}
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
    ElMessage.success('编辑成功');
  } else {
    await createLicenseApi(values);
    ElMessage.success('新增成功');
  }
  showForm.value = false;
  gridApi.query();
}
async function onImportLicense(file: File) {
  const res = await importLicenseApi(file);
  if (res.code === 0) {
    ElMessage.success('导入成功');
    gridApi.query();
  } else {
    ElMessage.error(res.message || '导入失败');
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
      ElMessage.error(res.message || '获取详情失败');
    }
  } catch {
    ElMessage.error('获取详情失败');
  }
}
async function onDelete(row: any) {
  await ElMessageBox.confirm('确定要删除该license吗？', '提示', {
    type: 'warning',
  });
  await deleteLicenseApi(row.id);
  gridApi.query();
  ElMessage.success('删除成功');
}
async function onBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的license');
    return;
  }
  await ElMessageBox.confirm('确定要删除选中的license吗？', '提示', {
    type: 'warning',
  });
  const ids = selectedRows.value.map((row) => row.id);
  await batchDeleteLicenseApi(ids);
  selectedRows.value = [];
  gridApi.query();
  ElMessage.success('删除成功');
}
</script>

<template>
  <div class="license-manage-root">
    <!-- 搜索区 -->
    <div class="search-card">
      <ElForm
        :inline="true"
        :model="searchForm"
        class="search-form"
        size="large"
      >
        <ElFormItem label="客户名称">
          <ElInput
            v-model="searchForm.customerName"
            placeholder="请输入客户名称"
            style="width: 220px"
            clearable
          />
        </ElFormItem>
        <ElFormItem label="授权类型">
          <ElSelect
            v-model="searchForm.licenseType"
            placeholder="请选择授权类型"
            style="width: 180px"
            clearable
          >
            <ElOption
              v-for="item in licenseTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="过期时间">
          <ElDatePicker
            v-model="searchForm.expireTimeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 280px"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="onSearch">搜索</ElButton>
          <ElButton @click="onReset">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </div>
    <div class="action-bar">
      <ElButton type="primary" @click="onAdd">新增</ElButton>
      <ElUpload
        :show-file-list="false"
        :before-upload="onImportLicense"
        accept=".json"
        style="display: inline-block"
      >
        <ElButton type="primary">导入license</ElButton>
      </ElUpload>
      <ElButton type="danger" @click="onBatchDelete">批量删除</ElButton>
    </div>
    <Grid>
      <template #action="{ row }">
        <ElButton type="text" @click="onDownload(row)">下载</ElButton>
        <ElButton type="text" @click="onView(row)">查看</ElButton>
        <ElButton type="text" @click="onDelete(row)" style="color: #f56c6c">
          删除
        </ElButton>
      </template>
    </Grid>

    <ElDialog
      v-model="showForm"
      title="License信息"
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
      title="License详情"
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
