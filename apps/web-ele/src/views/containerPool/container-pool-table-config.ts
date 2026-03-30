import type { VbenFormProps } from '#/adapter/form';

import { getContainerAssetPageApi } from '#/api/core/asset';

import { $t } from '#/locales';

export type ContainerPoolSortOption = { label: string; value: string };
export type ContainerPoolGroupOption = { id: string; suiteName: string };

export interface ContainerPoolRow {
  deviceId?: string;
  deviceIp?: string;
  deviceStatus?: string;
  deviceVersion?: string;
  brand?: string;
  deviceAliases?: string;
  deviceNum?: string;
  deviceIdx?: string;
  connIp?: string;
  connPort?: string;
  proxy?: string;
  proxyIp?: string;
  proxyId?: string;
  assId?: string;
  devicePrompt?: string;
  groups?: string[];
  accountInfos?: Array<Record<string, any>>;
  [key: string]: any;
}

export async function getContainerPoolListApi(_params: {
  page: number;
  pageSize: number;
  containerFilter?: string;
  containerSearch?: string;
  containerGroup?: string;
  sortCondition?: string;
  [key: string]: any;
}) {
  const {
    page,
    pageSize,
    containerFilter,
    containerSearch,
    containerGroup,
    sortCondition,
  } = _params;

  const data = await getContainerAssetPageApi({
    current: page ?? 1,
    size: pageSize ?? 10,
    screening: containerFilter,
    search: containerSearch,
    suiteName: containerGroup,
    groupId: containerGroup,
    sortType: sortCondition,
  });

  const list = (data.records || []) as ContainerPoolRow[];

  return {
    list,
    total: Number(data.total ?? 0),
  };
}

export const getFormOptions = (
  sortOptions: ContainerPoolSortOption[] = [],
  groupOptions: ContainerPoolGroupOption[] = [],
): VbenFormProps => ({
  collapsed: false,
  schema: [
    {
      component: 'Input',
      fieldName: 'containerFilter',
      label: $t('containerPool.filter.containerFilter'),
      componentProps: {
        placeholder: $t('containerPool.filter.containerFilterPlaceholder'),
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
      component: 'Select',
      fieldName: 'containerGroup',
      label: $t('containerPool.filter.containerGroup'),
      componentProps: {
        placeholder: $t('containerPool.filter.containerGroupPlaceholder'),
        clearable: true,
        filterable: true,
        options: groupOptions.map((item) => ({
          label: item.suiteName,
          value: item.id,
        })),
      },
    },
    {
      component: 'Select',
      fieldName: 'sortCondition',
      label: $t('containerPool.filter.sortCondition'),
      componentProps: {
        placeholder: $t('containerPool.filter.sortConditionPlaceholder'),
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
  { field: 'deviceId', title: $t('containerPool.table.deviceId'), minWidth: 200 },
  { field: 'deviceIp', title: $t('containerPool.table.deviceIp'), minWidth: 120 },
  { field: 'deviceStatus', title: $t('containerPool.table.deviceStatus'), minWidth: 120 },
  { field: 'deviceVersion', title: $t('containerPool.table.deviceVersion'), minWidth: 120 },
  { field: 'brand', title: $t('containerPool.table.brand'), minWidth: 120 },
  { field: 'deviceAliases', title: $t('containerPool.table.deviceAliases'), minWidth: 120 },
  { field: 'deviceNum', title: $t('containerPool.table.deviceNum'), minWidth: 120 },
  { field: 'deviceIdx', title: $t('containerPool.table.deviceIdx'), minWidth: 120 },
  { field: 'connIp', title: $t('containerPool.table.connIp'), minWidth: 120 },
  { field: 'connPort', title: $t('containerPool.table.connPort'), minWidth: 100 },
  { field: 'proxy', title: $t('containerPool.table.proxy'), minWidth: 160 },
  { field: 'proxyIp', title: $t('containerPool.table.proxyIp'), minWidth: 120 },
  { field: 'proxyId', title: $t('containerPool.table.proxyId'), minWidth: 140 },
  { field: 'assId', title: $t('containerPool.table.assId'), minWidth: 140 },
  { field: 'devicePrompt', title: $t('containerPool.table.devicePrompt'), minWidth: 160 },
];

