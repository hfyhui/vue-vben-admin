import type { VbenFormProps } from '#/adapter/form';

import { h } from 'vue';

import { ElCascader, ElMessage } from 'element-plus';

import { getProxyAssetPageApi } from '#/api/core/asset';

import { $t } from '#/locales';

export type ProxyPoolSortOption = { label: string; value: string };
export type ProxyPoolGroupOption = { id: string; suiteName: string; suiteDesc?: string };
export type ProxyPoolRegionOption = {
  label: string;
  value: string;
  children?: ProxyPoolRegionOption[];
};

export interface ProxyPoolRow {
  id?: string;
  proxyId?: string;
  area?: string;
  inputTime?: string;
  protocol?: string;
  ip?: string;
  proxyLinkIp?: string;
  proxyLinkPort?: string;
  username?: string;
  password?: string;
  link?: string;
  expireTime?: string;
  remark?: string;
  deviceIp?: string[];
  appAccounts?: string[];
  riskTips?: string;
  color?: string;
  surplusDays?: string;
  surplusDaysColor?: string;
  bandingCount?: number;
  suiteId?: string;
  suiteName?: string;
}

async function copyText(text: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('复制成功');
  } catch {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    ElMessage.success('复制成功');
  }
}

function renderArrayText(value?: string[] | string) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return value || '';
}

export async function getProxyPoolListApi(_params: {
  page: number;
  pageSize: number;
  areaPath?: string[][];
  proxySearch?: string;
  proxyGroup?: string[];
  sortCondition?: string;
  [key: string]: any;
}) {
  const { page, pageSize, areaPath, proxySearch, proxyGroup, sortCondition } =
    _params;

  const reqParams: Record<string, any> = {
    current: page ?? 1,
    size: pageSize ?? 10,
  };

  if (areaPath?.length) {
    reqParams.area = areaPath
      .map((path) => path?.[path.length - 1])
  }
  if (proxySearch) reqParams.proxy = proxySearch;
  if (proxyGroup?.length) reqParams.suiteIds = proxyGroup;
  if (sortCondition) reqParams.sortType = sortCondition;

  const data = await getProxyAssetPageApi(reqParams);
  const list = (data.records || []) as ProxyPoolRow[];

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
      component: h(ElCascader),
      fieldName: 'areaPath',
      label: $t('proxyPool.filter.regionFilter'),
      componentProps: {
        placeholder: $t('proxyPool.filter.regionFilterPlaceholder'),
        options: regionOptions,
        props: {
          value: 'value',
          label: 'label',
          children: 'children',
          emitPath: true,
          multiple: true,
          checkStrictly: false,
        },
        showAllLevels: false,
        clearable: true,
        filterable: true,
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
        clearable: true,
        filterable: true,
        multiple: true,
        collapseTags: true,
        collapseTagsTooltip: true,
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
  { field: 'area', title: $t('proxyPool.table.region'), minWidth: 120 },
  { field: 'inputTime', title: $t('proxyPool.table.loginTime'), minWidth: 160 },
  { field: 'protocol', title: $t('proxyPool.table.protocol'), minWidth: 100 },
  { field: 'proxyLinkIp', title: $t('proxyPool.table.deviceIp'), minWidth: 140 },
  { field: 'proxyLinkPort', title: $t('proxyPool.table.port'), minWidth: 100 },
  { field: 'username', title: $t('proxyPool.table.username'), minWidth: 120 },
  { field: 'password', title: $t('proxyPool.table.password'), minWidth: 120 },
  {
    field: 'link',
    title: $t('proxyPool.table.link'),
    minWidth: 180,
    slots: {
      default: ({ row }: { row: ProxyPoolRow }) =>
        h(
          'span',
          {
            style:
              'display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:var(--el-color-primary);',
            title: row.link || '',
            onClick: (event: Event) => {
              event.stopPropagation();
              void copyText(row.link || '');
            },
          },
          row.link || '',
        ),
    },
  },
  { field: 'expireTime', title: $t('proxyPool.table.expireTime'), minWidth: 160 },
  { field: 'suiteName', title: $t('proxyPool.table.proxyGroup'), minWidth: 120 },
  { field: 'remark', title: $t('proxyPool.table.remarks'), minWidth: 120 },
  {
    field: 'deviceIp',
    title: $t('proxyPool.table.associatedDevices'),
    minWidth: 180,
    formatter: ({ cellValue }: { cellValue: string[] | string }) =>
      renderArrayText(cellValue),
  },
  {
    field: 'appAccounts',
    title: $t('proxyPool.table.associatedAccounts'),
    minWidth: 180,
    formatter: ({ cellValue }: { cellValue: string[] | string }) =>
      renderArrayText(cellValue),
  },
  { field: 'riskTips', title: $t('proxyPool.table.riskAlert'), minWidth: 140 },
];

