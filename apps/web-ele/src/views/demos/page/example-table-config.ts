import type { VbenFormProps } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemDeptApi } from '#/api/system/dept';
import type { SystemMenuApi } from '#/api/system/menu';

import dayjs from 'dayjs';

export interface RowType {
  icon: string;
  api: string;
  apiTree: string;
  string: string;
  number: number;
  radio: string;
  radioButton: string;
  checkbox: string[];
  checkbox1: string[];
  checkbotton: string[];
  date: string | string[];
  select: string;
}

// 表格数据获取函数
export async function getExampleTableApi(params: {
  [key: string]: any; // 允许其他查询参数
  page: number;
  pageSize: number;
}) {
  const total = 50;
  const list: RowType[] = Array.from({ length: params.pageSize }, (_, i) => {
    const id = ((params.page - 1) * params.pageSize + i + 1).toString();
    return {
      icon: [
        'ant-design:account-book-filled',
        'ant-design:account-book-outlined',
        'ant-design:account-book-twotone',
        'ant-design:aim-outlined',
        'ant-design:alert-filled',
      ][Math.floor(Math.random() * 5)],
      api: ['Demos', 'Dashboard'][Math.floor(Math.random() * 2)],
      apiTree: '',
      string: `字符串${id}`,
      number: Math.floor(Math.random() * 100),
      radio: ['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)],
      radioButton: ['A', 'B', 'C', 'D', 'E', 'F'][
        Math.floor(Math.random() * 6)
      ],
      checkbox: ['A', 'B', 'C'].filter(() => Math.random() > 0.5),
      checkbox1: ['A', 'B', 'C', 'D'].filter(() => Math.random() > 0.5),
      checkbotton: ['A', 'B', 'C'].filter(() => Math.random() > 0.5),
      date: dayjs()
        .subtract(Math.floor(Math.random() * 30), 'days')
        .format('YYYY-MM-DD'),
      select: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
    };
  });

  return new Promise<{ list: RowType[]; total: number }>((resolve) => {
    setTimeout(() => {
      resolve({
        list,
        total,
      });
    }, 800);
  });
}

// 表单配置生成函数（API 通过参数传入）
export const getFormOptions = (
  getAllMenusApi: () => Promise<any>, // 明确 API 函数类型
): VbenFormProps => ({
  collapsed: false,
  fieldMappingTime: [['date', ['start', 'end']]],
  schema: [
    { component: 'IconPicker', fieldName: 'icon', label: 'IconPicker' },
    {
      component: 'ApiSelect',
      fieldName: 'api',
      label: 'ApiSelect',
      componentProps: {
        afterFetch: (data: { name: string; path: string }[]) => {
          return data.map((item) => ({
            label: item.name,
            value: item.path,
          }));
        },
        api: getAllMenusApi,
      },
    },
    {
      component: 'ApiTreeSelect',
      fieldName: 'apiTree',
      label: 'ApiTreeSelect',
      componentProps: {
        api: getAllMenusApi,
        childrenField: 'children',
        labelField: 'name',
        valueField: 'path',
      },
    },
    { component: 'Input', fieldName: 'string', label: 'String' },
    { component: 'InputNumber', fieldName: 'number', label: 'Number' },
    {
      component: 'RadioGroup',
      fieldName: 'radio',
      label: 'Radio',
      componentProps: {
        options: [
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
          { value: 'D', label: 'D' },
          { value: 'E', label: 'E' },
        ],
      },
    },
    {
      component: 'CheckboxGroup',
      fieldName: 'checkbox',
      label: 'Checkbox',
      componentProps: {
        options: ['A', 'B', 'C'].map((v) => ({ value: v, label: `选项${v}` })),
      },
    },
    // 只保留一个日期字段配置
    {
      component: 'DatePicker',
      defaultValue: [dayjs().subtract(7, 'days'), dayjs()],
      fieldName: 'date',
      label: 'Date',
      componentProps: {
        type: 'daterange',
        format: 'YYYY-MM-DD HH:mm:ss',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        defaultTime: [
          new Date(2000, 1, 1, 0, 0, 0),
          new Date(2000, 2, 1, 23, 59, 59),
        ],
      },
    },
    {
      component: 'Select',
      fieldName: 'select',
      label: 'Select',
      componentProps: {
        filterable: true,
        options: [
          { value: 'A', label: '选项A' },
          { value: 'B', label: '选项B' },
          { value: 'C', label: '选项C' },
        ],
      },
    },
  ],
  showCollapseButton: true,
  submitOnChange: false,
  submitOnEnter: true,
});

// 表格配置
export function useColumns(
  onActionClick: OnActionClickFn<SystemMenuApi.SystemMenu>,
): VxeTableGridOptions<SystemMenuApi.SystemMenu>['columns'] {
  return [
    { type: 'seq', title: '序号', width: 150 },
    { field: 'icon', title: 'IconPicker', width: 150 },
    { field: 'api', title: 'ApiSelect', width: 150 },
    { field: 'apiTree', title: 'ApiTreeSelect', width: 150 },
    { field: 'string', title: 'String', width: 150 },
    { field: 'number', title: 'Number', width: 150 },
    { field: 'radio', title: 'Radio', width: 150 },
    { field: 'radioButton', title: 'RadioButton', width: 150 },
    { field: 'checkbox', title: 'Checkbox', width: 150 },
    { field: 'checkbox1', title: 'Checkbox1', width: 150 },
    { field: 'checkbotton', title: 'CheckBotton', width: 150 },
    { field: 'date', title: 'Date', width: 150 },
    { field: 'select', title: 'Select', width: 150 },
    {
      field: 'action',
      fixed: 'right',
      // 方法1，通过通过配置直接完成
      cellRender: {
        attrs: {
          nameField: 'name',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          'edit', // 默认的编辑按钮
          'enable',
          'disable',
          {
            code: 'delete', // 默认的删除按钮
            disabled: (row: SystemDeptApi.SystemDept) => {
              return row.select === 'C';
            },
            show: (row: SystemDeptApi.SystemDept) => {
              return row.select !== 'B';
            },
          },
        ],
      },
      // 方法二 通过slots完成
      // slots: { default: 'action' },
      title: '操作',
      width: 180,
    },
  ];
}
