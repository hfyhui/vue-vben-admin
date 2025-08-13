<script lang="ts" setup>
import type { VxeGridListeners, VxeGridProps } from '#/adapter/vxe-table';

import { nextTick, ref } from 'vue';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import {
  batchDeleteCustomerApi,
  createCustomerApi,
  deleteCustomerApi,
  getCustomerDetailApi,
  getCustomerListApi,
  updateCustomerApi,
} from '../../api/core/customer';
import { getDictApi } from '../../api/core/dict';
import CustomerForm from './components/form.vue';
import SearchForm from './components/searchForm.vue';
import CustomerViewForm from './components/viewForm.vue';

const customerTypes = ref<any[]>([]);
const idTypeOptions = ref<any[]>([]);
const dictLoaded = ref(false);

const searchForm = ref({
  customersName: '',
  customersType: '',
});
const loadDictData = async () => {
  try {
    const res = await getDictApi();
    customerTypes.value = res.data.LICENSE_CUSTOMER_TYPE?.children || [];
    idTypeOptions.value = res.data.CERTIFICATE_TYPE?.children || [];
    dictLoaded.value = true;
  } catch {}
};
loadDictData();
const selectedRows = ref<any[]>([]);

const showForm = ref(false);
const showViewForm = ref(false);
const editData = ref<any>(null);
const viewData = ref<any>(null);

const gridOptions: VxeGridProps<any> = {
  columns: [
    { type: 'checkbox', width: 50, align: 'center' },
    {
      field: 'customersName',
      title: $t('customerManage.table.customerName'),
      minWidth: 120,
    },
    {
      field: 'customersTypeName',
      title: $t('customerManage.table.customerType'),
      minWidth: 100,
    },
    {
      field: 'certificateCode',
      title: $t('customerManage.table.certificateCode'),
      minWidth: 180,
      slots: { default: 'certificateCode' },
    },
    {
      field: 'legalPerson',
      title: $t('customerManage.table.legalName'),
      minWidth: 120,
    },
    {
      field: 'legalPersonIdTypeName',
      title: $t('customerManage.table.legalIdType'),
      minWidth: 120,
    },
    {
      field: 'legalPersonIdNumber',
      title: $t('customerManage.table.legalIdNo'),
      minWidth: 180,
    },
    {
      field: 'action',
      title: $t('customerManage.table.operation'),
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
          customersName: form?.customersName || searchForm.value.customersName,
          customersType: form?.customersType || searchForm.value.customersType,
        });
        return res.data
      },
    },
    response: {
      result: 'records',
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

function onSearch(values?: any) {
  if (values) {
    searchForm.value = values;
  }
  gridApi.query();
}
function onAdd() {
  editData.value = null;
  showForm.value = true;
}

function onFormDialogClose() {
  editData.value = null;
  showForm.value = false;
  nextTick(() => {
    if (gridApi && gridApi.query) {
      gridApi.query();
    }
  });
}
async function onView(row: any) {
  try {
    // 调用详情接口获取完整数据
    const res = await getCustomerDetailApi(row.id);
    viewData.value = res.data;
    showViewForm.value = true;
  } catch (error) {
    console.error('获取客户详情失败:', error);
    ElMessage.error('获取客户详情失败');
  }
}

async function onEdit(row: any) {
  try {
    // 调用详情接口获取完整数据
    const res = await getCustomerDetailApi(row.id);
    editData.value = res.data;
    showForm.value = true;
  } catch (error) {
    console.error('获取客户详情失败:', error);
    ElMessage.error('获取客户详情失败');
  }
}
async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该客户吗？', '提示', {
      type: 'warning',
    });
    await deleteCustomerApi(row.id);
    gridApi.query();
    ElMessage.success('删除成功');
  } catch (error) {
    console.error('删除失败:', error);
    ElMessage.error('删除失败');
  }
}
async function onBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的客户');
    return;
  }
  try {
    await ElMessageBox.confirm('确定要删除选中的客户吗？', '提示', {
      type: 'warning',
    });
    const ids = selectedRows.value.map((row) => row.id);
    await batchDeleteCustomerApi(ids);
    selectedRows.value = [];
    gridApi.query();
    ElMessage.success('删除成功');
  } catch {
    ElMessage.error('批量删除失败');
  }
}
async function submit(values: any) {
  if (editData.value && editData.value.id) {
    await updateCustomerApi(editData.value.id, values);
    ElMessage.success('编辑成功');
  } else {
    await createCustomerApi(values);
    ElMessage.success('新增成功');
  }
  editData.value = null;
  showForm.value = false;
  gridApi.query();
}
</script>

<template>
  <div class="customer-manage-root">
    <div class="search-card">
      <SearchForm
        v-if="dictLoaded"
        @search="onSearch"
        :customer-types="customerTypes"
      />
    </div>
    <div class="action-bar">
      <ElButton type="primary" @click="onAdd">
        {{ $t('customerManage.action.add') }}
      </ElButton>
      <ElButton type="danger" @click="onBatchDelete">
        {{ $t('customerManage.action.batchDelete') }}
      </ElButton>
    </div>
    <Grid>
      <template #certificateCode="{ row }">
        <span>
          {{ row.certificateCode }}
        </span>
      </template>
      <template #action="{ row }">
        <ElButton link @click="onEdit(row)">
          {{ $t('customerManage.action.edit') }}
        </ElButton>
        <ElButton link @click="onView(row)">
          {{ $t('customerManage.action.view') }}
        </ElButton>
        <ElButton link @click="onDelete(row)" style="color: #f56c6c">
          {{ $t('customerManage.action.delete') }}
        </ElButton>
      </template>
    </Grid>
    <ElDialog
      v-model="showForm"
      :title="
        editData && editData.id
          ? $t('customerManage.form.edit')
          : $t('customerManage.form.add')
      "
      width="800px"
      :close-on-click-modal="false"
      @close="onFormDialogClose"
    >
      <CustomerForm
        :visible="showForm"
        :model-value="editData"
        :customer-types="customerTypes"
        :id-type-options="idTypeOptions"
        @submit="submit"
        @update:visible="showForm = $event"
      />
    </ElDialog>
    <CustomerViewForm
      :visible="showViewForm"
      :model-value="viewData"
      :customer-types="customerTypes"
      :id-type-options="idTypeOptions"
      @update:visible="showViewForm = $event"
    />
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
