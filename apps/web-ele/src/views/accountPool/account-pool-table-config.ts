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

export interface AccountPoolRow {
  id: string;
  platform: string;
  entryTime: string;
  riskAlert: string;
  loginStatus?: string;
  account: string;
  accountId: string;
  username: string;
  userAccount: string;
  accountPassword: string;
  verificationEmail: string;
  emailPassword: string;
  twiceCheck?: string;
  remarks: string;
  accountGroup: string;
  associatedAgents: string;
  isLock?: boolean;
  appId?: string;
  logoPath?: string;
  color?: string;
}

interface AccountAssetRecord {
  platform?: string;
  appId?: string;
  inputTime?: string;
  riskTips?: string;
  loginStatus?: string;
  account?: string;
  accountId?: string;
  nickName?: string;
  userAccount?: string;
  accountPassword?: string;
  email?: string;
  emailPassword?: string;
  twiceCheck?: string;
  remark?: string;
  suiteName?: string;
  accountGroup?: string;
  proxy?: string;
  isLock?: boolean;
  lock?: boolean;
  logoPath?: string;
  color?: string;
  [key: string]: any;
}

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

  // 入参与接口文档保持一致：POST /asset/account/page
  // - current/size：分页
  // - accountName：账号（accountSearch）
  // - suiteIds：分组（accountGroup）
  // - appIds：应用（platform）
  // - sortCondition：排序条件
  const reqParams: Record<string, any> = {
    current: page ?? 1,
    size: pageSize ?? 10,
  };

  if (accountSearch) reqParams.accountName = accountSearch;
  if (accountGroup?.length) reqParams.suiteIds = accountGroup;
  if (platform?.length) reqParams.appIds = platform;
  if (sortCondition) reqParams.sortCondition = sortCondition;

  const data = await getAccountAssetPageApi<AccountAssetRecord>(reqParams);

  const list: AccountPoolRow[] = (data.records || []).map(
    (item: AccountAssetRecord) => ({
    id: item.accountId ?? '',
    platform: item.platform ?? '',
    entryTime: item.inputTime ?? '',
    riskAlert: item.riskTips ?? '',
    loginStatus: item.loginStatus ?? '',
    account: item.account ?? '',
    accountId: item.accountId ?? '',
    username: item.nickName ?? '',
    userAccount: item.userAccount ?? '',
    accountPassword: item.accountPassword ?? '',
    verificationEmail: item.email ?? '',
    emailPassword: item.emailPassword ?? '',
    twiceCheck: item.twiceCheck ?? '',
    remarks: item.remark ?? '',
    accountGroup: item.suiteName,
    associatedAgents: item.proxy ?? '',
    isLock:item.isLock,
    appId: item.appId ?? '',
    logoPath: item.logoPath ?? '',
      color: item.color ?? '',
    }),
  );

  return {
    list,
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
  { field: 'entryTime', title: $t('accountPool.table.entryTime'), minWidth: 160 },
  { field: 'riskAlert', title: $t('accountPool.table.riskAlert'), minWidth: 100 },
  {
    field: 'loginStatus',
    title: $t('accountPool.table.loginStatus'),
    minWidth: 120,
  },
  { field: 'account', title: $t('accountPool.table.account'), minWidth: 120 },
  { field: 'accountId', title: $t('accountPool.table.accountId'), minWidth: 120 },
  {
    field: 'userAccount',
    title: $t('accountPool.table.userAccount'),
    minWidth: 120,
  },
  {
    field: 'accountPassword',
    title: $t('accountPool.table.accountPassword'),
    minWidth: 120,
  },
  {
    field: 'verificationEmail',
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
  { field: 'remarks', title: $t('accountPool.table.remarks'), minWidth: 120 },
  {
    field: 'accountGroup',
    title: $t('accountPool.table.accountGroup'),
    minWidth: 120,
  },
  {
    field: 'associatedAgents',
    title: $t('accountPool.table.associatedAgents'),
    minWidth: 120,
  },
];
