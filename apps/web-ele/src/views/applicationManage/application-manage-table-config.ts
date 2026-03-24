import type { VbenFormProps } from '#/adapter/form';

import { $t } from '#/locales';

import { getApplicationPageApi } from '#/api/core/application';
import type { ApplicationItem } from '#/api/core/application';

export type { ApplicationItem };

/** 获取应用管理列表（适配表格 proxyConfig） */
export async function getApplicationListApi(params: {
  page: number;
  pageSize: number;
  applicationName?: string;
  applicationStatus?: number;
}) {
  const res = await getApplicationPageApi({
    current: params.page,
    size: params.pageSize,
    applicationName: params.applicationName || undefined,
    applicationStatus: params.applicationStatus,
  });
  const pageData = (res as any)?.data?.records ? (res as any).data : (res as any);
  return {
    records: pageData?.records ?? [],
    total: pageData?.total ?? 0,
    ...pageData,
  };
}

export const getFormOptions = (): VbenFormProps => ({
  collapsed: false,
  schema: [
    {
      component: 'Input',
      fieldName: 'applicationName',
      label: $t('applicationManage.search.applicationName') || '应用名称',
      componentProps: {
        placeholder: $t('applicationManage.search.applicationNamePlaceholder') || '请输入',
      },
    },
    {
      component: 'Select',
      fieldName: 'applicationStatus',
      label: $t('applicationManage.search.status') || '状态',
      componentProps: {
        options: [
          { label: $t('common.enable') || '启用', value: 0 },
          { label: $t('common.disable') || '禁用', value: 1 },
        ],
        placeholder: $t('applicationManage.search.statusPlaceholder') || '请选择',
      },
    },
  ],
  showCollapseButton: true,
  submitOnChange: false,
  submitOnEnter: true,
});

/** 脚本清单展示：优先 programType，其次 programName，再次 scriptList */
export function getScriptListDisplay(row: ApplicationItem) {
  if (row.programType?.length) {
    return (
      row.programType
        .map((p) => p.programName)
        .filter(Boolean)
        .join('; ') || '--'
    );
  }
  return row.programName || row.scriptList || '--';
}

export const useColumns = () => [
  { type: 'checkbox', width: 50, align: 'center' },
  {
    field: 'applicationName',
    title: $t('applicationManage.table.applicationName') || '应用名称',
    minWidth: 120,
  },
  {
    field: 'scriptList',
    title: $t('applicationManage.table.scriptList') || '脚本清单',
    minWidth: 280,
    slots: { default: 'scriptList' },
  },
  {
    field: 'orderNum',
    title: $t('applicationManage.table.index') || '序号',
    width: 80,
    align: 'center',
  },
  {
    field: 'applicationStatus',
    title: $t('applicationManage.table.status') || '状态',
    width: 100,
    align: 'center',
    slots: { default: 'status' },
  },
  {
    field: 'action',
    title: $t('applicationManage.table.operation') || '操作',
    width: 200,
    slots: { default: 'action' },
    fixed: 'right',
  },
];
