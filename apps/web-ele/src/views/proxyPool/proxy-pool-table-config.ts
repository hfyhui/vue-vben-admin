import type { VbenFormProps } from '#/adapter/form';

import { getProxyAssetPageApi } from '#/api/core/asset';

import { $t } from '#/locales';

export type ProxyPoolSortOption = { label: string; value: string };
export type ProxyPoolGroupOption = { id: string; suiteName: string };
export type ProxyPoolRegionOption = {
  label: string;
  value: string;
  children?: ProxyPoolRegionOption[];
};

export interface ProxyPoolRow {
  id: string;
  proxyId: string;
  region: string;
  loginTime: string;
  protocol: string;
  deviceIp: string;
  port: string;
  username: string;
  password: string;
  link: string;
  expireTime: string;
  proxyGroup: string;
  remarks: string;
  associatedDevices: string;
  associatedAccounts: string;
  riskAlert: string;
}

export async function getProxyPoolListApi(_params: {
  page: number;
  pageSize: number;
  regionPath?: string;
  proxySearch?: string;
  proxyGroup?: string;
  sortCondition?: string;
  [key: string]: any;
}) {
  const { page, pageSize, regionPath, proxySearch, proxyGroup, sortCondition } =
    _params;

  const reqParams: Record<string, any> = {
    current: page ?? 1,
    size: pageSize ?? 10,
  };

  if (regionPath) reqParams.area = regionPath.split('/').at(-1);
  if (proxySearch) reqParams.proxy = proxySearch;
  if (proxyGroup) reqParams.suiteIds = [proxyGroup];
  if (sortCondition) reqParams.sortType = sortCondition;

  const data = await getProxyAssetPageApi(reqParams);
  const list: ProxyPoolRow[] = (data.records ?? []).map((item: any) => {
    const proxyIp = item.ip 
    return {
      id: item.proxyId,
      proxyId: item.proxyId,
      region: item.area,
      loginTime: item.inputTime,
      protocol: item.protocol,
      deviceIp: proxyIp,
      port: item.proxyLinkPort,
      username: item.username,
      password: item.password,
      link: item.link,
      expireTime: item.expireTime,
      proxyGroup: item.proxyGroup,
      remarks: item.remark,
      associatedDevices: item.deviceIp,
      associatedAccounts: item.accountId,
      riskAlert: item.riskTips,
    };
  });

  return {
    list,
    total: Number(data.total ?? 0),
  };
}

export const getFormOptions = (
  sortOptions: ProxyPoolSortOption[] = [],
  groupOptions: ProxyPoolGroupOption[] = [],
  regionOptions: ProxyPoolRegionOption[] = [],
): VbenFormProps => ({
  collapsed: false,
  schema: [
    {
      component: 'TreeSelect',
      fieldName: 'regionPath',
      label: $t('proxyPool.filter.regionFilter'),
      componentProps: {
        placeholder: $t('proxyPool.filter.regionFilterPlaceholder'),
        data: regionOptions,
        checkStrictly: false,
        clearable: true,
        filterable: true,
        renderAfterExpand: false,
      },
    },
    {
      component: 'Input',
      fieldName: 'proxySearch',
      label: $t('proxyPool.filter.proxySearch'),
      componentProps: {
        placeholder: $t('proxyPool.filter.proxySearchPlaceholder'),
      },
    },
    {
      component: 'Select',
      fieldName: 'proxyGroup',
      label: $t('proxyPool.filter.proxyGroup'),
      componentProps: {
        placeholder: $t('proxyPool.filter.proxyGroupPlaceholder'),
        options: groupOptions.map((item) => ({
          label: item.suiteName,
          value: item.id,
        })),
        virtualized: false,
      },
    },
    {
      component: 'Select',
      fieldName: 'sortCondition',
      label: $t('proxyPool.filter.sortCondition'),
      componentProps: {
        placeholder: $t('proxyPool.filter.sortConditionPlaceholder'),
        options: sortOptions,
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
  { field: 'region', title: $t('proxyPool.table.region'), minWidth: 120 },
  { field: 'loginTime', title: $t('proxyPool.table.loginTime'), minWidth: 160 },
  { field: 'protocol', title: $t('proxyPool.table.protocol'), minWidth: 100 },
  { field: 'deviceIp', title: $t('proxyPool.table.deviceIp'), minWidth: 120 },
  { field: 'port', title: $t('proxyPool.table.port'), minWidth: 100 },
  { field: 'username', title: $t('proxyPool.table.username'), minWidth: 120 },
  { field: 'password', title: $t('proxyPool.table.password'), minWidth: 120 },
  { field: 'link', title: $t('proxyPool.table.link'), minWidth: 120 },
  { field: 'expireTime', title: $t('proxyPool.table.expireTime'), minWidth: 160 },
  { field: 'proxyGroup', title: $t('proxyPool.table.proxyGroup'), minWidth: 120 },
  { field: 'remarks', title: $t('proxyPool.table.remarks'), minWidth: 120 },
  {
    field: 'associatedDevices',
    title: $t('proxyPool.table.associatedDevices'),
    minWidth: 120,
  },
  {
    field: 'associatedAccounts',
    title: $t('proxyPool.table.associatedAccounts'),
    minWidth: 120,
  },
  { field: 'riskAlert', title: $t('proxyPool.table.riskAlert'), minWidth: 120 },
];

