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
    applicationName: params.applicationName,
    applicationStatus: params.applicationStatus,
  });
  const pageData = (res as any).data;
  return {
    records: pageData.records,
    total: pageData.total,
    ...pageData,
  };
}

export const getFormOptions = (): VbenFormProps => ({
  collapsed: false,
  schema: [
    {
      component: 'Input',
      fieldName: 'applicationName',
      label: $t('applicationManage.search.applicationName'),
      componentProps: {
        placeholder: $t('applicationManage.search.applicationNamePlaceholder'),
      },
    },
    {
      component: 'Select',
      fieldName: 'applicationStatus',
      label: $t('applicationManage.search.status'),
      componentProps: {
        options: [
          { label: $t('common.enable'), value: 0 },
          { label: $t('common.disable'), value: 1 },
        ],
        placeholder: $t('applicationManage.search.statusPlaceholder'),
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
    const programTypeDisplay = row.programType
      .map((p) => p.programName)
      .filter(Boolean)
      .join('; ');
    return programTypeDisplay ? programTypeDisplay : '--';
  }
  if (row.programName) return row.programName;
  if (row.scriptList) return row.scriptList;
  return '--';
}

export const useColumns = () => [
  { type: 'checkbox', width: 50, align: 'center' },
  {
    field: 'applicationName',
    title: $t('applicationManage.table.applicationName'),
    minWidth: 120,
  },
  {
    field: 'scriptList',
    title: $t('applicationManage.table.scriptList'),
    minWidth: 280,
    slots: { default: 'scriptList' },
  },
  {
    field: 'orderNum',
    title: $t('applicationManage.table.index'),
    width: 80,
    align: 'center',
  },
  {
    field: 'applicationStatus',
    title: $t('applicationManage.table.status'),
    width: 100,
    align: 'center',
    slots: { default: 'status' },
  },
  {
    field: 'action',
    title: $t('applicationManage.table.operation'),
    width: 200,
    slots: { default: 'action' },
    fixed: 'right',
  },
];
