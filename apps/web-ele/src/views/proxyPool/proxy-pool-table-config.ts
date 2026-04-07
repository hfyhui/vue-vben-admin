import type { VbenFormProps } from '#/adapter/form';

import { h } from 'vue';

import { ElCascader, ElMessage } from 'element-plus';

import { getProxyAssetPageApi } from '#/api/core/asset';

import { $t } from '#/locales';
import { renderPoolRiskTipsCell } from '#/utils/risk-tips-display';

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

export type ProxyPoolTableConfigOptions = {
  /** 获取当前正在编辑的代理备注 proxyId（保证响应式） */
  getEditingRemarkProxyId?: () => string | null;
  /** 获取当前编辑中的备注值（保证响应式） */
  getEditingRemarkValue?: () => string;
  /** 双击进入编辑 */
  onStartEditRemark?: (row: ProxyPoolRow) => void;
  /** 更新输入框值 */
  onChangeEditingRemarkValue?: (value: string) => void;
  /** 提交编辑 */
  onConfirmEditRemark?: () => void;
  /** 取消编辑 */
  onCancelEditRemark?: () => void;
};

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
  sortType?: string;
  [key: string]: any;
}) {
  const { page, pageSize, areaPath, proxySearch, proxyGroup, sortType } =
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
  if (sortType) reqParams.sortType = sortType;

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
        clearable: true,
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
      fieldName: 'sortType',
      label: $t('proxyPool.filter.sortType'),
      componentProps: {
        placeholder: $t('proxyPool.filter.sortTypePlaceholder'),
        clearable: true,
        options: sortOptions,
        virtualized: false,
      },
    },
  ],
  showCollapseButton: true,
  submitOnChange: false,
  submitOnEnter: true,
});

export const useColumns = (
  options: ProxyPoolTableConfigOptions = {},
) => [
  { type: 'checkbox', width: 50, align: 'center' },
  { field: 'area', title: $t('proxyPool.table.region'), minWidth: 120 },
  { field: 'inputTime', title: $t('proxyPool.table.loginTime'), minWidth: 160 },
  { field: 'protocol', title: $t('proxyPool.table.protocol'), minWidth: 100 },
  { field: 'ip', title: $t('proxyPool.table.deviceIp'), minWidth: 140 },
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
  {
    field: 'remark',
    title: $t('proxyPool.table.remarks'),
    minWidth: 120,
    slots: {
      default: ({ row }: { row: ProxyPoolRow }) => {
        const proxyId = String(row.proxyId ?? row.id ?? '');
        const remark = row.remark ?? '';
        // 备注为空时给一个不可见占位，确保 hover 区域和单元格高度一致
        const displayRemark = remark ? remark : '\u00A0';
        const editingProxyId = options.getEditingRemarkProxyId?.() ?? null;
        const isEditing =
          !!editingProxyId && proxyId === editingProxyId;

        if (isEditing) {
          return h('input', {
            value: options.getEditingRemarkValue?.() ?? '',
            autofocus: true,
            spellcheck: false,
            maxlength: 50,
            style:
              'width:100%;height:28px;padding:0 8px;border:1px solid var(--el-border-color);border-radius:4px;outline:none;',
            placeholder: $t('proxyPool.message.editRemarkPlaceholder'),
            onInput: (e: Event) => {
              const target = e.target as HTMLInputElement;
              const value = target.value.slice(0, 50);
              options.onChangeEditingRemarkValue?.(value);
            },
            onBlur: () => options.onConfirmEditRemark?.(),
            onKeydown: (event: KeyboardEvent) => {
              if (event.key === 'Enter') options.onConfirmEditRemark?.();
            },
          });
        }

        return h(
          'span',
          {
            title: remark,
            style:
              'display:block;width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;' +
              'background-color:transparent;border-radius:4px;' +
              'padding:2px 6px;transition:background-color 0.15s;',
            onMouseenter: (event: MouseEvent) => {
              const el = event.currentTarget as HTMLElement;
              if (!el) return;
              el.style.backgroundColor = 'var(--el-fill-color-light)';
            },
            onMouseleave: (event: MouseEvent) => {
              const el = event.currentTarget as HTMLElement;
              if (!el) return;
              el.style.backgroundColor = 'transparent';
            },
            onDblclick: (event: Event) => {
              event.stopPropagation();
              event.preventDefault();
              options.onStartEditRemark?.(row);
            },
          },
          displayRemark,
        );
      },
    },
  },
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
  {
    field: 'riskTips',
    title: $t('proxyPool.table.riskAlert'),
    minWidth: 140,
    slots: {
      default: ({ row }: { row: ProxyPoolRow }) =>
        renderPoolRiskTipsCell(row),
    },
  },
];

