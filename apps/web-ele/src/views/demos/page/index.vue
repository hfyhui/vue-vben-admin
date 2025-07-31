<script lang="ts" setup>
import { h } from 'vue'; // 引入 h 函数

import { Page, useVbenModal, VbenButton } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
// 导入实际的 API 函数
import { getAllMenusApi } from '#/api';

// 从配置文件中导入
import { getFormOptions, gridOptions } from './example-table-config';
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

const [Grid] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

function openFormModal(row: Partial<RowType> = {}) {
  formModalApi
    .setData({
      values: { ...row },
    })
    .open();
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: CEFormModal,
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <ElButton class="mr-2" type="primary" @click="openFormModal">
          新增
        </ElButton>
      </template>

      <template #action="{ row }">
        <VbenButton variant="link" @click="openFormModal(row)">
          编辑
        </VbenButton>
      </template>
    </Grid>

    <FormModal />
  </Page>
</template>
