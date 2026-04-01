import type { VbenFormProps } from '#/adapter/form';

import { getAccountAssetPageApi } from '#/api/core/asset';

import { $t } from '#/locales';

/** 与 GET /platform/asset/group（getAssetGroupApi）返回项一致，用于筛选下拉 */
export type AccountPoolGroupOption = {
  id: string;
  suiteName: string;
  suiteDesc?: string;
};
export type AccountPoolPlatformOption = { id: string; applicationName: string };
export type AccountPoolSortOption = { label: string; value: string };

export async function getAccountPoolListApi(_params: {
  page: number;
  pageSize: number;
  platform?: string[];
  accountSearch?: string;
  accountGroup?: string[];
  sortCondition?: string;
  [key: string]: any;
}) {
  const {
    page,
    pageSize,
    platform,
    accountSearch,
    accountGroup,
    sortCondition,
  } = _params;

  const reqParams: Record<string, any> = {
    current: page ?? 1,
    size: pageSize ?? 10,
  };

  if (accountSearch) reqParams.accountName = accountSearch;
  if (accountGroup?.length) reqParams.suiteIds = accountGroup;
  if (platform?.length) reqParams.appIds = platform;
  if (sortCondition) reqParams.sortCondition = sortCondition;

  const data = await getAccountAssetPageApi(reqParams);

  return {
    list: data.records ?? [],
    total: Number(data.total ?? 0),
  };
}

export const getFormOptions = (
  groupOptions: AccountPoolGroupOption[] = [],
  platformOptions: AccountPoolPlatformOption[] = [],
  sortOptions: AccountPoolSortOption[] = [],
): VbenFormProps => ({
  collapsed: false,
  schema: [
    {
      component: 'Select',
      fieldName: 'platform',
      label: $t('accountPool.filter.platform'),
      componentProps: {
        placeholder: $t('accountPool.filter.platformPlaceholder'),
        clearable: true,
        filterable: true,
        multiple: true,
        collapseTags: true,
        collapseTagsTooltip: true,
        options: platformOptions
          .filter((item) => item.id)
          .map((item) => ({
            value: item.id,
            label: item.applicationName,
          })),
      },
    },
    {
      component: 'Input',
      fieldName: 'accountSearch',
      label: $t('accountPool.filter.accountSearch'),
      componentProps: {
        placeholder: $t('accountPool.filter.accountSearchPlaceholder'),
      },
    },
    {
      component: 'Select',
      fieldName: 'accountGroup',
      label: $t('accountPool.filter.accountGroup'),
      componentProps: {
        placeholder: $t('accountPool.filter.accountGroupPlaceholder'),
        clearable: true,
        filterable: true,
        multiple: true,
        collapseTags: true,
        collapseTagsTooltip: true,
        options: groupOptions.map((item) => ({
          label: item.suiteName,
          value: item.id,
        })),
      },
    },
    {
      component: 'Select',
      fieldName: 'sortCondition',
      label: $t('accountPool.filter.sortCondition'),
      componentProps: {
        placeholder: $t('accountPool.filter.sortConditionPlaceholder'),
        clearable: true,
        options: sortOptions,
      },
    },
  ],
  showCollapseButton: true,
  submitOnChange: false,
  submitOnEnter: true,
});

export const useColumns = () => [
  { type: 'checkbox', width: 50, align: 'center' },
  { field: 'platform', title: $t('accountPool.table.platform'), minWidth: 120 },
  { field: 'inputTime', title: $t('accountPool.table.entryTime'), minWidth: 160 },
  { field: 'riskTips', title: $t('accountPool.table.riskAlert'), minWidth: 100 },
  {
    field: 'loginStatus',
    title: $t('accountPool.table.loginStatus'),
    minWidth: 120,
  },
  { field: 'account', title: $t('accountPool.table.account'), minWidth: 120 },
  { field: 'accountId', title: $t('accountPool.table.accountId'), minWidth: 120 },
  {
    field: 'nickName',
    title: $t('accountPool.table.nickName'),
    minWidth: 120,
  },
  {
    field: 'accountPassword',
    title: $t('accountPool.table.accountPassword'),
    minWidth: 120,
  },
  {
    field: 'email',
    title: $t('accountPool.table.verificationEmail'),
    minWidth: 150,
  },
  {
    field: 'emailPassword',
    title: $t('accountPool.table.emailPassword'),
    minWidth: 120,
  },
  {
    field: 'twiceCheck',
    title: $t('accountPool.table.twiceCheck'),
    minWidth: 120,
  },
  { field: 'remark', title: $t('accountPool.table.remarks'), minWidth: 120 },
  {
    field: 'suiteName',
    title: $t('accountPool.table.accountGroup'),
    minWidth: 120,
  },
  {
    field: 'deviceIp',
    title: $t('accountPool.table.deviceIp'),
    minWidth: 140,
  },
  {
    field: 'proxy',
    title: $t('accountPool.table.associatedAgents'),
    minWidth: 120,
  },
];
