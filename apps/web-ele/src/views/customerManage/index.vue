<script lang="ts" setup>
import type { VxeGridListeners, VxeGridProps } from '#/adapter/vxe-table';

import { ref } from 'vue';

import {ElMessage, ElMessageBox} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import {
  batchDeleteCustomerApi,
  createCustomerApi,
  deleteCustomerApi,
  getCustomerListApi,
  updateCustomerApi,
} from '../../api/core/customer';
import CustomerForm from './components/form.vue';

const customerTypes = [
  { label: '公司', value: 'company' },
  { label: '组织', value: 'org' },
  { label: '个人', value: 'person' },
];

const searchForm = ref({
  name: '',
  type: '',
});
const selectedRows = ref<any[]>([]);

const showForm = ref(false);
const editData = ref<any>(null);

const gridOptions: VxeGridProps<any> = {
  columns: [
    { type: 'checkbox', width: 50, align: 'center' },
    { field: 'name', title: '客户名称', minWidth: 120 },
    {
      field: 'type',
      title: '客户类型',
      minWidth: 100,
      formatter: ({ cellValue }) => {
        if (cellValue === 'company') return '公司';
        if (cellValue === 'org') return '组织';
        if (cellValue === 'person') return '个人';
        return '';
      },
    },
    { field: 'creditCode', title: '社会统一信用代码', minWidth: 180 },
    { field: 'legalName', title: '法人姓名', minWidth: 120 },
    { field: 'legalIdType', title: '法人证件类型', minWidth: 120 },
    { field: 'legalIdNo', title: '法人证件号码', minWidth: 180 },
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
        const res = await getCustomerListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
          name: form?.name,
          type: form?.type,
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
  searchForm.value.name = '';
  searchForm.value.type = '';
  gridApi.query();
}
function onAdd() {
  editData.value = null;
  showForm.value = true;
}
function onEdit(row: any) {
  // 可选：可用getCustomerDetailApi(row.id)获取详情
  editData.value = { ...row };
  showForm.value = true;
}
async function onDelete(row: any) {
  await ElMessageBox.confirm('确定要删除该客户吗？', '提示', {
    type: 'warning',
  });
  await deleteCustomerApi(row.id);
  gridApi.query();
  ElMessage.success('删除成功');
}
async function onBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的客户');
    return;
  }
  await ElMessageBox.confirm('确定要删除选中的客户吗？', '提示', {
    type: 'warning',
  });
  const ids = selectedRows.value.map((row) => row.id);
  await batchDeleteCustomerApi(ids);
  selectedRows.value = [];
  gridApi.query();
  ElMessage.success('删除成功');
}
async function submit(values: any) {
  if (editData.value && editData.value.id) {
    await updateCustomerApi(editData.value.id, values);
    ElMessage.success('编辑成功');
  } else {
    await createCustomerApi(values);
    ElMessage.success('新增成功');
  }
  showForm.value = false;
  gridApi.query();
}
</script>

<template>
  <div class="customer-manage-root">
    <div class="search-card">
      <ElForm
        :inline="true"
        :model="searchForm"
        class="search-form"
        size="large"
      >
        <ElFormItem label="客户名称">
          <ElInput
            v-model="searchForm.name"
            placeholder="客户名称"
            style="width: 220px"
            clearable
          />
        </ElFormItem>
        <ElFormItem label="客户类型">
          <ElSelect
            v-model="searchForm.type"
            placeholder="客户类型"
            style="width: 180px"
            clearable
          >
            <ElOption
              v-for="item in customerTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="onSearch">搜索</ElButton>
          <ElButton @click="onReset">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </div>
    <div class="action-bar">
      <ElButton type="primary" @click="onAdd">新增客户</ElButton>
      <ElButton type="danger" @click="onBatchDelete">批量删除</ElButton>
    </div>
    <Grid>
      <template #action="{ row }">
        <ElButton type="text" @click="onEdit(row)">编辑</ElButton>
        <ElButton type="text" @click="onDelete(row)" style="color: #f56c6c">
          删除
        </ElButton>
      </template>
    </Grid>
    <ElDialog
      v-model="showForm"
      title="客户信息"
      width="940px"
      :close-on-click-modal="false"
    >
      <CustomerForm
        :visible="showForm"
        :model-value="editData"
        @submit="submit"
        @update:visible="showForm = $event"
      />
    </ElDialog>
  </div>
</template>

<style scoped>
.customer-manage-root {
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
