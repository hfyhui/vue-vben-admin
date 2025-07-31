<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemMenuApi } from '#/api/system/menu';

import { h } from 'vue'; // 引入 h 函数

import { confirm, Page, useVbenModal } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
// 导入实际的 API 函数
import { getAllMenusApi } from '#/api';
import { $t } from '#/locales';

// 从配置文件中导入
import {
  getExampleTableApi,
  getFormOptions,
  useColumns,
} from './example-table-config';
import CEFormModal from './form-modal.vue';

// 生成表单配置（传入实际的 API）
const formOptions = getFormOptions(getAllMenusApi);

// 在组件内定义需要复杂渲染的字段
const customCheckboxConfig = {
  component: 'CheckboxGroup',
  fieldName: 'checkbox1',
  label: 'Checkbox1',
  renderComponentContent: () => ({
    default: () =>
      ['A', 'B', 'C', 'D'].map((v) => h('el-checkbox', { label: v, value: v })),
  }),
};

// 添加到表单配置中
if (formOptions.schema) {
  const index = formOptions.schema.findIndex(
    (item) => item.fieldName === 'checkbox1',
  );
  if (index !== -1) {
    formOptions.schema[index] = customCheckboxConfig;
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions,
  gridOptions: {
    columns: useColumns(onActionClick),
    checkboxConfig: {
      highlight: true,
      labelField: 'name',
    },
    exportConfig: {},
    height: 'auto',
    keepSource: true,
    pagerConfig: {},
    proxyConfig: {
      response: {
        result: 'list',
      },
      ajax: {
        query: async ({ page }, formValues) => {
          return await getExampleTableApi({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    toolbarConfig: {
      custom: true,
      export: true,
      refresh: true,
      resizable: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions,
});

function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemMenuApi.SystemMenu>) {
  switch (code) {
    case 'delete': {
      onDelete(row);
      break;
    }
    case 'edit': {
      onEdit(row);
      break;
    }
    default: {
      break;
    }
  }
}

function onEdit(row: SystemMenuApi.SystemMenu) {
  formModalApi.setData(row).open();
}
function onCreate() {
  formModalApi.setData({}).open();
}

function onDelete(row: SystemMenuApi.SystemMenu) {
  let loadingMessage = '';
  // export type IconType = 'error' | 'info' | 'question' | 'success' | 'warning';
  confirm({
    title: '提示',
    content: `确定删除${row.name || ''}？`,
    icon: 'error',
    beforeClose({ isConfirm }) {
      if (isConfirm) {
        loadingMessage = ElMessage({
          message: $t('ui.actionMessage.deleting', [row.name || '123']),
          type: 'loading',
          duration: 0,
          key: 'action_process_msg',
        });
        // 这里可以执行一些异步操作。如果最终返回了false，将阻止关闭弹窗
        return new Promise((resolve) => setTimeout(resolve, 2000));
      }
    },
  }).then(() => {
    loadingMessage.close();
    ElMessage.success('Confirmed');
  });
}

function refreshGrid() {
  gridApi.query();
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: CEFormModal,
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <ElButton class="mr-2" type="primary" @click="onCreate">
          新增
        </ElButton>
      </template>

      <!-- <template #action="{ row }">
        <VbenButton variant="link" @click="onEdit(row)">
          编辑
        </VbenButton>
      </template> -->
    </Grid>

    <FormModal @success-after="refreshGrid" />
  </Page>
</template>
