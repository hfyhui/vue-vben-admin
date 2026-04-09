<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createApplicationApi,
  deleteApplicationApi,
  getApplicationDetailApi,
  updateApplicationApi,
  updateApplicationStatusByProxyApi,
  updateApplicationStatusApi,
  type ApplicationUpsertPayload,
} from '#/api/core/application';
import { $t } from '#/locales';

import {
  getApplicationListApi,
  getFormOptions,
  getScriptListDisplay,
  useColumns,
} from './application-manage-table-config';
import ApplicationForm from './components/ApplicationForm.vue';
import type { ApplicationItem } from './application-manage-table-config';

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: getFormOptions(),
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
        result: 'records',
        total: 'total',
      },
      ajax: {
        query: async ({ page }, formValues) => {
          return await getApplicationListApi({
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

const showForm = ref(false);
const editData = ref<ApplicationItem | null>(null);
const applicationFormRef = ref<InstanceType<typeof ApplicationForm>>();

function onAdd() {
  editData.value = null;
  showForm.value = true;
}

async function onBatchDelete() {
  const checkboxRecords = (gridApi as any).grid.getCheckboxRecords();
  if (checkboxRecords.length === 0) {
    ElMessage.warning($t('applicationManage.message.selectBeforeDelete'));
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('applicationManage.message.batchDeleteConfirm', {
        count: checkboxRecords.length,
      }),
      $t('common.prompt'),
      { type: 'warning' },
    );
    const checkIds = checkboxRecords
      .map((item: ApplicationItem) => String(item.id))
      .filter(Boolean);
    await deleteApplicationApi(checkIds);
    ElMessage.success($t('applicationManage.message.deleteSuccess'));
    gridApi.reload();
  } catch {
    // 用户取消
  }
}

async function onUpdateStatus(row: ApplicationItem, status: 0 | 1) {
  const message =
    status === 1
      ? $t('applicationManage.message.confirmDisable', { name: row.applicationName })
      : $t('applicationManage.message.confirmEnable', { name: row.applicationName });
  try {
    await ElMessageBox.confirm(message, $t('common.prompt'), {
      confirmButtonText: $t('common.yes'),
      cancelButtonText: $t('common.no'),
      type: status === 1 ? 'warning' : 'info',
    });
    await updateApplicationStatusApi(row.id, status);
    // 正式启用成功后，同步触发一次平台代理接口
    if (status === 0) {
      try {
        await updateApplicationStatusByProxyApi(row.id, status);
      } catch (error) {
        console.error('[applicationManage] 启用后调用平台代理接口失败:', error);
      }
    }
    ElMessage.success(
      status === 1
        ? $t('applicationManage.message.disableSuccess')
        : $t('applicationManage.message.enableSuccess'),
    );
    gridApi.reload();
  } catch {
    // 用户取消
  }
}

function onEnable(row: ApplicationItem) {
  return onUpdateStatus(row, 0);
}

function onDisable(row: ApplicationItem) {
  return onUpdateStatus(row, 1);
}

function onEdit(row: ApplicationItem) {
  openEditDialog(row);
}

async function openEditDialog(row: ApplicationItem) {
  try {
    const res = await getApplicationDetailApi(String(row.id));
    const detail = ((res as any)?.data ?? {}) as ApplicationItem;
    // 与 social_media_web CEModal 一致：详情若未带 script 列表，勿用空数组覆盖列表行，否则提交 programType: [] 会导致编辑失败
    const merged: ApplicationItem = {
      ...row,
      ...detail,
    };
    if (!Array.isArray(merged.programType) || merged.programType.length === 0) {
      merged.programType = row.programType;
    }
    const rowProgramIds = row.programIds as string[] | undefined;
    if (Array.isArray(rowProgramIds) && rowProgramIds.length && !merged.programIds?.length) {
      merged.programIds = rowProgramIds;
    }
    editData.value = merged;
    showForm.value = true;
  } catch {
    ElMessage.error($t('applicationManage.message.detailLoadFailed'));
  }
}

function onFormDialogClose() {
  applicationFormRef.value?.reset?.();
  showForm.value = false;
  editData.value = null;
  applicationFormRef.value?.resetSubmitting?.();
}

function isBackendSuccess(res: { code?: number } | null | undefined) {
  const c = res?.code;
  return c === 200 || c === 100000;
}

async function submitApplication(values: ApplicationUpsertPayload) {
  try {
    const payload: ApplicationUpsertPayload = {
      ...values,
      applicationStatus: values.applicationStatus,
    };
    const isEdit = !!values.id;
    const res = isEdit
      ? await updateApplicationApi(payload)
      : await createApplicationApi(payload);
    if (!isBackendSuccess(res)) {
      applicationFormRef.value?.resetSubmitting?.();
      return;
    }
    ElMessage.success(
      isEdit ? $t('applicationManage.message.updateSuccess') : $t('applicationManage.message.createSuccess'),
    );
    showForm.value = false;
    editData.value = null;
    applicationFormRef.value?.resetSubmitting?.();
    gridApi.reload();
  } catch {
    applicationFormRef.value?.resetSubmitting?.();
  }
}

async function onDelete(row: ApplicationItem) {
  try {
    await ElMessageBox.confirm(
      $t('applicationManage.message.deleteConfirm', { name: row.applicationName }),
      $t('common.prompt'),
      { type: 'warning' },
    );
    await deleteApplicationApi([String(row.id)]);
    ElMessage.success($t('applicationManage.message.deleteSuccess'));
    gridApi.reload();
  } catch {
    // 用户取消
  }
}

</script>

<template>
  <Page auto-content-height content-class="application-manage-page">
    <Grid>
        <template #toolbar-actions>
          <ElButton class="mr-2" type="primary" @click="onAdd">
            {{ $t('applicationManage.action.add') }}
          </ElButton>
          <ElButton type="danger" @click="onBatchDelete">
            {{ $t('applicationManage.action.batchDelete') }}
          </ElButton>
        </template>

        <template #scriptList="{ row }">
          <el-tooltip :content="getScriptListDisplay(row)" placement="top">
            <span class="ellipsis-text">{{ getScriptListDisplay(row) }}</span>
          </el-tooltip>
        </template>

        <template #status="{ row }">
          {{
            row.applicationStatus === 0
              ? $t('common.enable')
              : $t('common.disable')
          }}
        </template>

        <template #action="{ row }">
          <template v-if="row.applicationStatus === 0">
            <el-button type="warning" link @click="onDisable(row)">
              {{ $t('common.disable') }}
            </el-button>
            <el-button type="primary" link @click="onEdit(row)">
              {{ $t('common.edit') }}
            </el-button>
          </template>
          <template v-else>
            <el-button type="success" link @click="onEnable(row)">
              {{ $t('common.enable') }}
            </el-button>
            <el-button type="primary" link @click="onEdit(row)">
              {{ $t('common.edit') }}
            </el-button>
            <el-button type="danger" link @click="onDelete(row)">
              {{ $t('common.del') }}
            </el-button>
          </template>
        </template>
    </Grid>
    <ElDialog
      v-model="showForm"
      :title="editData?.id ? $t('common.edit') : $t('common.add')"
      width="720px"
      :close-on-click-modal="false"
      @close="onFormDialogClose"
    >
      <ApplicationForm
        :key="editData?.id ? String(editData.id) : 'application-form-new'"
        ref="applicationFormRef"
        :visible="showForm"
        :model-value="editData"
        @submit="submitApplication"
        @update:visible="showForm = $event"
      />
      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="onFormDialogClose">{{ $t('common.cancel') }}</ElButton>
          <ElButton type="primary" @click="applicationFormRef?.submitFn?.()">
            {{ $t('common.confirm') }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.application-manage-page {
  padding: 24px;
}

.mr-2 {
  margin-right: 8px;
}

.ellipsis-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
