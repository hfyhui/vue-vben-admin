import type { VbenFormProps } from '#/adapter/form';

import { getSocialSuitePageApi } from '#/api/core/social-suite';
import { $t } from '#/locales';

function successCode(code: number) {
  return code === 200 || code === 100000;
}

/** 分组列表（适配 VxeGrid proxyConfig） */
export async function getGroupSuiteListApi(params: {
  page: number;
  pageSize: number;
  suiteName?: string;
}) {
  const res = await getSocialSuitePageApi({
    current: params.page,
    size: params.pageSize,
    ...(params.suiteName?.trim() && { suiteName: params.suiteName.trim() }),
  });
  if (res && successCode(res.code)) {
    return {
      records: res.data?.records ?? [],
      total: res.data?.total ?? 0,
    };
  }
  return { records: [], total: 0 };
}

export const getGroupManageFormOptions = (): VbenFormProps => ({
  collapsed: false,
  schema: [
    {
      component: 'Input',
      fieldName: 'suiteName',
      label: $t('systemManage.groupManage.belongGroup'),
      componentProps: {
        placeholder: $t('systemManage.groupManage.searchPlaceholder'),
        clearable: true,
      },
    },
  ],
  showCollapseButton: true,
  submitOnChange: false,
  submitOnEnter: true,
});

export const useGroupManageColumns = () => [
  { type: 'checkbox' as const, width: 50, align: 'center' as const },
  {
    field: 'id',
    title: $t('systemManage.groupManage.orderNum'),
    width: 90,
    align: 'center' as const,
  },
  {
    field: 'createUserName',
    title: $t('systemManage.groupManage.creator'),
    width: 120,
    minWidth: 120,
  },
  {
    field: 'suiteName',
    title: $t('systemManage.groupManage.groupName'),
    minWidth: 160,
  },
  {
    field: 'amount',
    title: $t('systemManage.groupManage.deviceCount'),
    width: 100,
    align: 'center' as const,
  },
  {
    field: 'accAmount',
    title: $t('systemManage.groupManage.accountCount'),
    width: 100,
    align: 'center' as const,
  },
  {
    field: 'suiteDesc',
    title: $t('systemManage.groupManage.groupDesc'),
    minWidth: 200,
  },
  {
    field: 'createTime',
    title: $t('systemManage.groupManage.createDate'),
    width: 170,
  },
  {
    field: 'action',
    title: $t('systemManage.groupManage.operations'),
    width: 260,
    slots: { default: 'action' },
    fixed: 'right' as const,
    align: 'center' as const,
  },
];
