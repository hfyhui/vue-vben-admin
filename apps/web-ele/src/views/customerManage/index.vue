<script lang="ts" setup>
import type { VxeGridListeners, VxeGridProps } from '#/adapter/vxe-table';

import { nextTick, ref } from 'vue';

import { ElMessage, ElMessageBox } from 'element-plus';
import { ElUpload } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import {
  batchDeleteCustomerApi,
  createCustomerApi,
  deleteCustomerApi,
  getCustomerDetailApi,
  getCustomerListApi,
  updateCustomerApi,
  importCustomerApi,
} from '../../api/core/customer';
import { getDictPullArray } from '../../api/core/dict';
import CustomerForm from './components/form.vue';
import SearchForm from './components/searchForm.vue';
import CustomerViewForm from './components/viewForm.vue';
import { useCrossPageSelection, createCrossPageSelectionColumn } from '../../composables/useCrossPageSelection';
import CrossPageCheckbox from '../../components/CrossPageSelection/CrossPageCheckbox.vue';

const customerTypes = ref<any[]>([]);
const idTypeOptions = ref<any[]>([]);
const dictLoaded = ref(false);
const customerFormRef = ref<InstanceType<typeof CustomerForm>>();
// 加载字典数据
const loadDictData = async () => {
  try {
    const res = await getDictPullArray(['LICENSE_CUSTOMER_TYPE', 'CERTIFICATE_TYPE']);
    customerTypes.value = res.data.LICENSE_CUSTOMER_TYPE?.children || [];
    idTypeOptions.value = res.data.CERTIFICATE_TYPE?.children || [];
    dictLoaded.value = true;
  } catch {
    // 即使加载失败也显示搜索表单
    dictLoaded.value = true;
  }
};
loadDictData();

const searchForm = ref({
  customersName: '',
  customersType: '',
});
const showForm = ref(false);
const showViewForm = ref(false);
const editData = ref<any>(null);
const viewData = ref<any>(null);
// 记住当前总数，避免删除后需要先查询一次获取总数
const cachedTotal = ref<number>(0);

const gridOptions: VxeGridProps<any> = {
  minHeight: '50px',
  columns: [
    // 使用通用函数创建跨分页选
    createCrossPageSelectionColumn({ width: 50, align: 'center' }),
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
      slots: { default: 'legalPerson' },
    },
    {
      field: 'legalPersonIdTypeName',
      title: $t('customerManage.table.legalIdType'),
      minWidth: 120,
      slots: { default: 'legalPersonIdType' },
    },
    {
      field: 'legalPersonIdNumber',
      title: $t('customerManage.table.legalIdNo'),
      minWidth: 180,
      slots: { default: 'legalPersonIdNumber' },
    },
    {
      field: 'action',
      title: $t('customerManage.table.operation'),
      width: 280,
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
        // 使用缓存的总数计算最大页，如果当前页大于最大页，current 改成 1
        const maxPage = Math.ceil(cachedTotal.value / page.pageSize) || 1;
        const targetPage = page.currentPage > maxPage ? 1 : page.currentPage;
        
        const res = await getCustomerListApi({
          page: targetPage,
          pageSize: page.pageSize,
          customersName: form?.customersName || searchForm.value.customersName,
          customersType: form?.customersType || searchForm.value.customersType,
        });

        // 更新缓存的总数
        cachedTotal.value = res.data?.total || 0;
        return res.data;
      },
    },
    response: {
      result: 'records',
      total: 'total',
    },
  },
};





const gridEvents: VxeGridListeners<any> = {};





const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
  gridEvents,
});

// 使用通用跨分页选择功能
const {
  selectedRowIds,
  checkboxKey,
  selectedCount,
  hasSelection,
  isRowSelected,
  toggleRowSelection,
  toggleAllCurrentPage,
  isAllCurrentPageSelected,
  isCurrentPageIndeterminate,
  clearAllSelection,
} = useCrossPageSelection(ref(gridApi));

function onSearch(values?: any) {
  if (values) {
    searchForm.value = values;
  }
  // 搜索时清空缓存，重新获取总数
  cachedTotal.value = 0;
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
    ElMessage.error($t('customerManage.message.detailLoadFailed'));
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
  }
}
async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm($t('customerManage.message.deleteConfirm'), $t('customerManage.message.batchDeleteConfirmTitle'), {
      type: 'warning',
    });
    let res = await deleteCustomerApi(row.id);
    if(res.code === 100000){
      // 删除后更新总数（减1）
      if (cachedTotal.value > 0) {
        cachedTotal.value -= 1;
      }
      ElMessage.success($t('customerManage.message.deleteSuccess'));
      gridApi.query();
    }
  } catch (error) {
    console.error('删除失败:', error);
  }
}
function createImportHandler(customerId: string) {
  return async function(options: any) {
    const { file } = options; // file是ElUpload传递的原始文件对象
    // 1. 检查文件类型
    if (!file.name.endsWith('.lic')) {
      ElMessage.error($t('customerManage.message.invalidFileType'));
      return;
    }
    try {
      // 2. 创建FormData，用于表单上传（关键步骤）
      const formData = new FormData();
      formData.append('file', file); //  append文件对象
      formData.append('customerId', customerId); // 附加其他参数 
      // 3. 调用接口时传递FormData
      const result = await importCustomerApi(formData); // 注意：接口需要支持FormData接收
      if (result && result.code === 100000) {
        ElMessage.success($t('customerManage.message.importSuccess'));
        gridApi.query();
      }
    } catch (error) {

    }
  };
}
async function onBatchDelete() {
  if (selectedRowIds.value.length === 0) {
    ElMessage.warning($t('customerManage.message.selectDelete'));
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('customerManage.message.batchDeleteConfirm', { count: selectedRowIds.value.length }), 
      $t('customerManage.message.batchDeleteConfirmTitle'), 
      {
        type: 'warning',
      }
    );
    
    const ids = selectedRowIds.value;
    const deleteCount = ids.length;
    let res = await batchDeleteCustomerApi(ids);
    if(res.code === 100000){
      // 删除后更新总数（减去删除的数量）
      cachedTotal.value = Math.max(0, cachedTotal.value - deleteCount);
      ElMessage.success($t('customerManage.message.batchDeleteSuccess', { count: deleteCount }));
      gridApi.query();
      // 清空跨分页选中状态
      clearAllSelection();
    }
  } catch {
    // 用户取消或删除失败
  }
}
async function submit(values: any) {
  try {
    if (editData.value && editData.value.id) {
      const res = await updateCustomerApi(editData.value.id, values)
      if(res.code === 100000){
        ElMessage.success($t('customerManage.message.editSuccess'));
        // 只有接口调用成功才关闭弹框和刷新列表
        editData.value = null;
        showForm.value = false;
        customerFormRef.value?.resetSubmitting?.();
        gridApi.query();
      }else {
        customerFormRef.value?.resetSubmitting?.();
      }
    } else {
      const res = await createCustomerApi(values);
      if(res.code === 100000){
        ElMessage.success($t('customerManage.message.addSuccess'));
        // 只有接口调用成功才关闭弹框和刷新列表
        editData.value = null;
        showForm.value = false;
        customerFormRef.value?.resetSubmitting?.();
        gridApi.query();
      }else {
        customerFormRef.value?.resetSubmitting?.();
      }
    }
  } catch (error) {
    
  }
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
      <!-- 跨分页选择框 - 行级 -->
      <template #crossPageCheckbox="{ row }">
        <CrossPageCheckbox
          :row="row"
          :is-row-selected="isRowSelected"
          :toggle-row-selection="toggleRowSelection"
          :toggle-all-current-page="toggleAllCurrentPage"
          :is-all-current-page-selected="isAllCurrentPageSelected"
          :is-current-page-indeterminate="isCurrentPageIndeterminate"
          :checkbox-key="checkboxKey"
        />
      </template>
      
      <!-- 跨分页选择框 - 表头 -->
      <template #crossPageCheckboxHeader>
        <CrossPageCheckbox
          :is-row-selected="isRowSelected"
          :toggle-row-selection="toggleRowSelection"
          :toggle-all-current-page="toggleAllCurrentPage"
          :is-all-current-page-selected="isAllCurrentPageSelected"
          :is-current-page-indeterminate="isCurrentPageIndeterminate"
          :checkbox-key="checkboxKey"
        />
      </template>
      
      <template #certificateCode="{ row }">
        <span>
          {{ row.certificateCode }}
        </span>
      </template>
      <template #legalPerson="{ row }">
        <span v-if="row.customersType === 'COMPANY'">
          {{ row.legalPerson }}
        </span>
      </template>
        <template #legalPersonIdType="{ row }">
          <span v-if="row.customersType === 'COMPANY'">
            {{ row.legalPersonIdTypeName }}
          </span>
        </template>
      <template #legalPersonIdNumber="{ row }">
        <span v-if="row.customersType === 'COMPANY'">
          {{ row.legalPersonIdNumber }}
        </span>
      </template>
      <template #action="{ row }">
        <ElUpload
          :show-file-list="false"
          :http-request="createImportHandler(row.id)"
          accept=".lic"
          style="display: inline-block;margin-right: 10px;"
        >
          <ElButton link>
            {{ $t('customerManage.action.importLicense') }}
          </ElButton>
        </ElUpload>
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
        ref="customerFormRef"
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

:deep(.vxe-table--empty-content)  {
  padding: 40px 0 !important;
}
</style>
