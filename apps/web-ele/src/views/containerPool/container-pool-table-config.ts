import type { VbenFormProps } from '#/adapter/form';

import { $t } from '#/locales';

export interface ContainerPoolRow {
  id: string;
  server: string;
  entryTime: string;
  chip: string;
  deviceIp: string;
  romVersion: string;
  phoneBrand: string;
  phoneModel: string;
  operator: string;
  phoneNumber: string;
  deviceGroup: string;
  remarks: string;
  associatedAccounts: string;
  associatedAgents: string;
  status: string;
}

export async function getContainerPoolListApi(_params: {
  page: number;
  pageSize: number;
  [key: string]: any;
}) {
  const total = 0;
  const list: ContainerPoolRow[] = [];

  return new Promise<{ list: ContainerPoolRow[]; total: number }>((resolve) => {
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
      fieldName: 'containerFilter',
      label: $t('containerPool.filter.containerFilter'),
      componentProps: {
        placeholder: $t('containerPool.filter.containerFilterPlaceholder'),
        options: [
          { value: 'social', label: $t('containerPool.filter.socialPlatform') },
        ],
        virtualized: false,
      },
    },
    {
      component: 'Input',
      fieldName: 'containerSearch',
      label: $t('containerPool.filter.containerSearch'),
      componentProps: {
        placeholder: $t('containerPool.filter.containerSearchPlaceholder'),
      },
    },
    {
      component: 'Input',
      fieldName: 'containerGroup',
      label: $t('containerPool.filter.containerGroup'),
      componentProps: {
        placeholder: $t('containerPool.filter.containerGroupPlaceholder'),
      },
    },
    {
      component: 'Select',
      fieldName: 'sortCondition',
      label: $t('containerPool.filter.sortCondition'),
      componentProps: {
        placeholder: $t('containerPool.filter.sortConditionPlaceholder'),
        options: [
          { value: 'accountGroup', label: $t('containerPool.filter.accountGroup') },
        ],
        virtualized: false,
      },
    },
  ],
  showCollapseButton: true,
  submitOnChange: false,
  submitOnEnter: true,
});

export const useColumns = () => [
  { type: 'checkbox', width: 50, align: 'center' },
  { field: 'server', title: $t('containerPool.table.server'), minWidth: 120 },
  { field: 'entryTime', title: $t('containerPool.table.entryTime'), minWidth: 160 },
  { field: 'chip', title: $t('containerPool.table.chip'), minWidth: 120 },
  { field: 'deviceIp', title: $t('containerPool.table.deviceIp'), minWidth: 120 },
  { field: 'romVersion', title: $t('containerPool.table.romVersion'), minWidth: 120 },
  { field: 'phoneBrand', title: $t('containerPool.table.phoneBrand'), minWidth: 120 },
  { field: 'phoneModel', title: $t('containerPool.table.phoneModel'), minWidth: 120 },
  { field: 'operator', title: $t('containerPool.table.operator'), minWidth: 100 },
  { field: 'phoneNumber', title: $t('containerPool.table.phoneNumber'), minWidth: 120 },
  { field: 'deviceGroup', title: $t('containerPool.table.deviceGroup'), minWidth: 120 },
  { field: 'remarks', title: $t('containerPool.table.remarks'), minWidth: 120 },
  {
    field: 'associatedAccounts',
    title: $t('containerPool.table.associatedAccounts'),
    minWidth: 120,
  },
  {
    field: 'associatedAgents',
    title: $t('containerPool.table.associatedAgents'),
    minWidth: 120,
  },
  { field: 'status', title: $t('containerPool.table.status'), minWidth: 100 },
];

