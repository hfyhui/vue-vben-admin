<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';

import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

// import CEFormModal from './form-modal.vue';

interface RowType {
  category: string;
  color: string;
  id: string;
  price: string;
  productName: string;
  releaseDate: string;
}

/**
 * 获取示例表格数据
 */
async function getExampleTableApi(params: { page: number; pageSize: number }) {
  const total = 50;
  const list: RowType[] = Array.from({ length: params.pageSize }, (_, i) => {
    const id = ((params.page - 1) * params.pageSize + i + 1).toString();
    return {
      category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
      color: ['1', '2'][Math.floor(Math.random() * 2)],
      id,
      price: (Math.random() * 100).toFixed(2),
      productName: `商品${id}`,
      releaseDate: dayjs()
        .subtract(Math.floor(Math.random() * 30), 'days')
        .format('YYYY-MM-DD'),
    };
  });

  // 只返回 { list, total }
  return new Promise<{ list: RowType[]; total: number }>((resolve) => {
    setTimeout(() => {
      resolve({
        list,
        total,
      });
    }, 800);
  });
}

const formOptions: VbenFormProps = {
  // 默认展开
  collapsed: false,
  fieldMappingTime: [['date', ['start', 'end']]],
  schema: [
    {
      component: 'Input',
      defaultValue: '1',
      fieldName: 'category',
      label: 'Category',
    },
    {
      component: 'Input',
      fieldName: 'productName',
      label: 'ProductName',
    },
    {
      component: 'Input',
      fieldName: 'price',
      label: 'Price',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          {
            label: 'Color1',
            value: '1',
          },
          {
            label: 'Color2',
            value: '2',
          },
        ],
        placeholder: '请选择',
      },
      fieldName: 'color',
      label: 'Color',
    },
    // {
    //   component: 'RangePicker',
    //   defaultValue: [dayjs().subtract(7, 'days'), dayjs()],
    //   fieldName: 'date',
    //   label: 'Date',
    // },
    {
      component: 'DatePicker', // 关键修改点
      defaultValue: [dayjs().subtract(7, 'days'), dayjs()],
      fieldName: 'date',
      label: 'Date',
      componentProps: {
        type: 'daterange', // 关键配置：指定为日期范围选择器
        // startPlaceholder: '开始日期',
        // endPlaceholder: '结束日期',
        format: 'YYYY-MM-DD HH:mm:ss',
        valueFormat: 'YYYY-MM-DD HH:mm:ss', // 明确值格式
        defaultTime: [
          new Date(2000, 1, 1, 0, 0, 0),
          new Date(2000, 2, 1, 23, 59, 59),
        ],
        // shortcuts: [
        //   // 可选：快捷选项
        //   {
        //     text: '最近一周',
        //     value: () => [dayjs().subtract(7, 'days'), dayjs()],
        //   },
        //   {
        //     text: '最近一个月',
        //     value: () => [dayjs().subtract(1, 'month'), dayjs()],
        //   },
        // ],
      },
    },
  ],
  // 控制表单是否显示折叠按钮
  showCollapseButton: true,
  // 是否在字段值改变时提交表单
  submitOnChange: false,
  // 按下回车时是否提交表单
  submitOnEnter: true,
};

const gridOptions: VxeTableGridOptions<RowType> = {
  checkboxConfig: {
    highlight: true,
    labelField: 'name',
  },
  columns: [
    { title: '序号', type: 'seq', width: 50 },
    { align: 'left', title: 'Name', type: 'checkbox', width: 100 },
    { field: 'category', title: 'Category' },
    { field: 'color', title: 'Color' },
    { field: 'productName', title: 'Product Name' },
    { field: 'price', title: 'Price' },
    { field: 'releaseDate', formatter: 'formatDateTime', title: 'Date' },
  ],
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
        console.warn(formValues);

        // ElMessage.success(`Query params: ${JSON.stringify(formValues)}`);
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
};

const [Grid] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

function openFormModal() {
  formModalApi
    .setData({
      // 表单值
      values: { field1: 'abc', field2: '123' },
    })
    .open();
}

// const [FormModal, formModalApi] = useVbenModal({
//   connectedComponent: CEFormModal,
// });
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <ElButton class="mr-2" type="primary" @click="openFormModal">
          新增
        </ElButton>
      </template>
    </Grid>

    <!-- <CEFormModal /> -->
  </Page>
</template>
