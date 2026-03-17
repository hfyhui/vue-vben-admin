import type { VbenFormProps } from '#/adapter/form';

import { $t } from '#/locales';

export interface AccountPoolRow {
  id: string;
  platform: string;
  entryTime: string;
  riskAlert: string;
  account: string;
  accountId: string;
  username: string;
  userAccount: string;
  accountPassword: string;
  verificationEmail: string;
  emailPassword: string;
  remarks: string;
  accountGroup: string;
  associatedDevices: string;
  associatedAgents: string;
}

export async function getAccountPoolListApi(_params: {
  page: number;
  pageSize: number;
  [key: string]: any;
}) {
  const total = 0;
  const list: AccountPoolRow[] = [];

  return new Promise<{ list: AccountPoolRow[]; total: number }>((resolve) => {
    setTimeout(() => {
      resolve({ list, total });
    }, 300);
  });
}

export const getFormOptions = (): VbenFormProps => ({
  collapsed: false,
  schema: [
    {
      component: 'Select',
      fieldName: 'platform',
      label: $t('accountPool.filter.platform'),
      componentProps: {
        placeholder: $t('accountPool.filter.platformPlaceholder'),
        options: [
          { value: 'social', label: $t('accountPool.filter.socialPlatform') },
        ],
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
      component: 'Input',
      fieldName: 'accountGroup',
      label: $t('accountPool.filter.accountGroup'),
      componentProps: {
        placeholder: $t('accountPool.filter.accountGroupPlaceholder'),
      },
    },
    {
      component: 'Select',
      fieldName: 'sortCondition',
      label: $t('accountPool.filter.sortCondition'),
      componentProps: {
        placeholder: $t('accountPool.filter.sortConditionPlaceholder'),
        options: [
          { value: 'accountGroup', label: $t('accountPool.filter.accountGroup') },
        ],
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
  { field: 'account', title: $t('accountPool.table.account'), minWidth: 120 },
  { field: 'accountId', title: $t('accountPool.table.accountId'), minWidth: 120 },
  { field: 'username', title: $t('accountPool.table.username'), minWidth: 120 },
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
  { field: 'remarks', title: $t('accountPool.table.remarks'), minWidth: 120 },
  {
    field: 'accountGroup',
    title: $t('accountPool.table.accountGroup'),
    minWidth: 120,
  },
  {
    field: 'associatedDevices',
    title: $t('accountPool.table.associatedDevices'),
    minWidth: 120,
  },
  {
    field: 'associatedAgents',
    title: $t('accountPool.table.associatedAgents'),
    minWidth: 120,
  },
];
