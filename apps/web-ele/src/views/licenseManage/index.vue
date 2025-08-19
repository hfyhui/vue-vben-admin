<script lang="ts" setup>
import type { VxeGridListeners, VxeGridProps } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import {
  createLicenseApi,
  deleteLicenseApi,
  downloadLicenseApi,
  getCustomerListApi,
  getLicenseDetailApi,
  getLicenseListApi,
  importLicenseApi,
  updateLicenseApi,
} from '../../api/core/license';
import LicenseDetail from './components/detail.vue';
import LicenseForm from './components/form.vue';
import SearchForm from './components/searchForm.vue';
import { useCrossPageSelection, createCrossPageSelectionColumn } from '../../composables/useCrossPageSelection';
import CrossPageCheckbox from '../../components/CrossPageSelection/CrossPageCheckbox.vue';
const licenseFormRef = ref<InstanceType<typeof LicenseForm>>();
const searchFormData = ref<any>({});
const editData = ref<any>(null);
const detailData = ref<any>(null);
const formApiRef = ref<any>(null);
const showForm = ref(false);
const showDetail = ref(false);

// 客户列表数据
const customerList = ref<{ label: string; value: string }[]>([]);
const customerListLoading = ref(false);

const gridOptions: VxeGridProps<any> = {
  minHeight: '50px',
  columns: [
    // 使用通用函数创建跨分页选择列
    createCrossPageSelectionColumn({ width: 50, align: 'center' }),
    {
      field: 'customerName',
      title: $t('licenseManage.search.customerName'),
      minWidth: 100,
    },
    {
      field: 'remark',
      title: $t('licenseManage.form.remark'),
      minWidth: 150,
    },
    {
      field: 'authorizationTypeName',
      title: $t('licenseManage.form.licenseType'),
      minWidth: 100,
    },
    {
      field: 'expirationTime',
      title: $t('licenseManage.form.expireTime'),
      minWidth: 100,
    },
    {
      field: 'concurrentUsers',
      title: $t('licenseManage.form.maxUsers'),
      minWidth: 100,
    },
    {
      field: 'licenseStatusName',
      title: $t('licenseManage.status'),
      minWidth: 80,
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
      query: async ({ page }) => {
        // 处理时间范围，转换为 expirationTimes 格式
        let expirationTimes = undefined;
        if (searchFormData.value?.expirationTimes && Array.isArray(searchFormData.value.expirationTimes)) {
          expirationTimes = searchFormData.value.expirationTimes;
        }
        const data = await getLicenseListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
          customerName: searchFormData.value?.customerName,
          authorizationType: searchFormData.value?.authorizationType,
          expirationTimes,
        });
        return data;
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
  isRowSelected,
  toggleRowSelection,
  toggleAllCurrentPage,
  isAllCurrentPageSelected,
  isCurrentPageIndeterminate,
  clearAllSelection,
} = useCrossPageSelection(ref(gridApi));

// 获取客户
async function fetchCustomerList() {
  customerListLoading.value = true;
  try {
    const response = await getCustomerListApi();
    if (response && response.data) {
      customerList.value = response.data.map((customer: any) => ({
        label: customer.customersName,
        value: customer.customerId,
      }));
    }
  } catch {
    customerList.value = [];
  } finally {
    customerListLoading.value = false;
  }
}

const [FormModal, formModalApi] = useVbenModal({
  title: $t('licenseManage.action.add'),
  class: 'w-[900px]',
  closeOnClickModal: false,
  onCancel: () => formModalApi.close(),
  contentClass: 'no-modal-scroll',
  onConfirm: async () => {
    if (formApiRef.value?.validateAndSubmitForm) {
      await formApiRef.value.validateAndSubmitForm();
    }
  },
});
const [DetailModal, detailModalApi] = useVbenModal({
  title: $t('licenseManage.detail.title'),
  closeOnClickModal: false,
  onCancel: () => detailModalApi.close(),
  showCancelButton: false, // 不显示取消按钮
  showConfirmButton: false, // 不显示确认按钮
  contentClass: 'no-modal-scroll', // 新增：去除滚动条
});

function onAdd() {
  editData.value = null;
  showForm.value = true;
  formModalApi.open();
}
function onEdit(row: any) {
  editData.value = { ...row };
  showForm.value = true;
  formModalApi.open();
}
async function submit(values: any) {
  try {
    let res = await createLicenseApi(values);
    if(res.code === 100000){
      ElMessage.success('新增成功');
      // 只有接口调用成功才关闭弹框和刷新列表
      editData.value = null;
      showForm.value = false;
      formModalApi.close();
      licenseFormRef.value?.resetSubmitting?.();
      gridApi.query();
    }else {
      licenseFormRef.value?.resetSubmitting?.();
    }
  } catch (error) {

  }
}
async function onImportLicense(file: File) {
  // 1. 检查文件类型
  if (!file.name.endsWith('.lic')) {
    ElMessage.error('只能导入.lic格式的文件');
    return false; // 阻止上传
  }
  try {
    const result = await importLicenseApi(file);
    if (result && result.code === 100000) {
      ElMessage.success($t('licenseManage.message.importSuccess'));
      gridApi.query();
    }
  } catch (error) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : $t('licenseManage.message.importFail');
    ElMessage.error(errorMsg);
  }
  return false;
}
async function onDownload(row: any) {
  await downloadLicenseApi(row.id);
}
async function onView(row: any) {
  try {
    const data = await getLicenseDetailApi(row.id);
    detailData.value = data;
    detailModalApi.open();
  } catch (error) {
    ElMessage.error(
      error instanceof Error
        ? error.message
        : $t('licenseManage.message.getDetailFail'),
    );
  }
}
async function onDelete(row: any) {
  try {
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
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '删除失败');
    }
  }
}
async function onBatchDelete() {
  if (selectedRowIds.value.length === 0) {
    ElMessage.warning($t('licenseManage.message.selectToDelete'));
    return;
  }

  try {
    await ElMessageBox.confirm(
      `${$t('licenseManage.message.batchDeleteConfirm')}（已选中 ${selectedRowIds.value.length} 项）`,
      $t('licenseManage.title'),
      {
        type: 'warning',
      },
    );
    
    const ids = selectedRowIds.value;
    await deleteLicenseApi(ids);
    
    // 清空跨分页选中状态
    clearAllSelection();
    gridApi.query();
    ElMessage.success(`${$t('licenseManage.message.deleteSuccess')}（删除了 ${ids.length} 项）`);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '批量删除失败');
    }
  }
}

// 页面初始化时获取客户列表
onMounted(() => {
  fetchCustomerList();
});
function onSearchForm(values: Record<string, any>) {
  searchFormData.value = values;
  // 搜索时重置到第一页
  gridApi.reload();
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
        accept=".lic"
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

    <FormModal :footer="false" class="w-[700px]">
      <LicenseForm
        ref="formApiRef"
        :visible="showForm"
        :model-value="editData"
        :customer-list="customerList"
        @submit="submit"
        @update:visible="
          (val) => {
            showForm = val;
            if (!val) formModalApi.close();
          }
        "
      />
    </FormModal>

    <DetailModal class="w-[700px]">
      <LicenseDetail
        :visible="showDetail"
        :data="detailData"
        @update:visible="
          (val) => {
            showDetail = val;
            if (!val) detailModalApi.close();
          }
        "
        @download="onDownload"
        @edit="onEdit"
      />
    </DetailModal>
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

:deep(.el-overlay) {
  border-radius: 7px !important;
}
</style>
