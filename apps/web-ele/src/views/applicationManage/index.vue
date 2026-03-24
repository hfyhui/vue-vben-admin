<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import {
  getApplicationListApi,
  getFormOptions,
  getScriptListDisplay,
  useColumns,
} from './application-manage-table-config';
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

function onAdd() {
  ElMessage.info($t('applicationManage.action.add') || '新增功能待对接 API');
}

async function onBatchDelete() {
  const checkboxRecords = gridApi.getCheckboxRecords?.() ?? [];
  if (checkboxRecords.length === 0) {
    ElMessage.warning(
      $t('applicationManage.message.selectBeforeDelete') || '请先选择要删除的应用',
    );
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('applicationManage.message.batchDeleteConfirm', {
        count: checkboxRecords.length,
      }) || `确定要删除选中的 ${checkboxRecords.length} 个应用吗？`,
      $t('common.prompt') || '提示',
      { type: 'warning' },
    );
    ElMessage.success($t('applicationManage.message.deleteSuccess') || '删除成功');
    gridApi.reload();
  } catch {
    // 用户取消
  }
}

function onEnable(row: ApplicationItem) {
  ElMessage.info(`启用「${row.applicationName}」待对接 API`);
  gridApi.reload();
}

function onDisable(row: ApplicationItem) {
  ElMessage.info(`禁用「${row.applicationName}」待对接 API`);
  gridApi.reload();
}

function onEdit(row: ApplicationItem) {
  ElMessage.info(`编辑「${row.applicationName}」待对接 API`);
}

async function onDelete(row: ApplicationItem) {
  try {
    await ElMessageBox.confirm(
      $t('applicationManage.message.deleteConfirm', { name: row.applicationName }) ||
        `确定要删除「${row.applicationName}」吗？`,
      $t('common.prompt') || '提示',
      { type: 'warning' },
    );
    ElMessage.success($t('applicationManage.message.deleteSuccess') || '删除成功');
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
            {{ $t('applicationManage.action.add') || '新增' }}
          </ElButton>
          <ElButton type="danger" @click="onBatchDelete">
            {{ $t('applicationManage.action.batchDelete') || '批量删除' }}
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
              ? ($t('common.enable') || '启用')
              : ($t('common.disable') || '禁用')
          }}
        </template>

        <template #action="{ row }">
          <template v-if="row.applicationStatus === 0">
            <el-button type="warning" link @click="onDisable(row)">
              {{ $t('common.disable') || '禁用' }}
            </el-button>
            <el-button type="primary" link @click="onEdit(row)">
              {{ $t('common.edit') || '编辑' }}
            </el-button>
          </template>
          <template v-else>
            <el-button type="success" link @click="onEnable(row)">
              {{ $t('common.enable') || '启用' }}
            </el-button>
            <el-button type="primary" link @click="onEdit(row)">
              {{ $t('common.edit') || '编辑' }}
            </el-button>
            <el-button type="danger" link @click="onDelete(row)">
              {{ $t('common.del') || '删除' }}
            </el-button>
          </template>
        </template>
    </Grid>
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
