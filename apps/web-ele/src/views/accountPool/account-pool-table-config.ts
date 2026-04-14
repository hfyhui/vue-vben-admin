import type { VbenFormProps } from '#/adapter/form';

import { h } from 'vue';

import { ElMessage, ElTooltip } from 'element-plus';

import { getAccountAssetPageApi } from '#/api/core/asset';

import { $t } from '#/locales';
import { renderPoolRiskTipsCell } from '#/utils/risk-tips-display';

const SENSITIVE_DOT_COUNT = 4;

async function copyAccountPoolSensitive(text: string) {
  const value = text
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    ElMessage.success($t('accountPool.message.copySuccess'));
  } catch {
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    ElMessage.success($t('accountPool.message.copySuccess'));
  }
}

/** 账号池：敏感字段用小圆点展示，悬停提示单击复制，点击复制真实值 */
export function renderAccountPoolSensitiveCell(raw: unknown) {
  const text = raw === undefined || raw === null ? '' : raw;
  const hasValue = text.trim() !== '';
  if (!hasValue) {
    return h(
      'span',
      { style: { color: 'var(--el-text-color-placeholder)' } },
      '',
    );
  }
  const tooltip = $t('accountPool.table.clickToCopy');
  const dots = Array.from({ length: SENSITIVE_DOT_COUNT }, (_, i) =>
    h('span', {
      key: i,
      style: {
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        backgroundColor: 'var(--el-color-primary)',
        flexShrink: 0,
        display: 'inline-block',
      },
    }),
  );
  return h(
    ElTooltip,
    { content: tooltip, placement: 'top' },
    {
      default: () =>
        h(
          'span',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              userSelect: 'none',
              verticalAlign: 'middle',
            },
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              void copyAccountPoolSensitive(text);
            },
          },
          dots,
        ),
    },
  );
}

export interface AccountPoolRow {
  riskTips?: string;
  color?: string;
  loginStatusName?: string;
  [key: string]: any;
}

export type AccountPoolTableConfigOptions = {
  onEdit?: (row: AccountPoolRow) => void;
  getEditingRemarkAccountId?: () => string | null;
  getEditingRemarkValue?: () => string;
  onStartEditRemark?: (row: AccountPoolRow) => void;
  onChangeEditingRemarkValue?: (value: string) => void;
  onConfirmEditRemark?: () => void;
  onCancelEditRemark?: () => void;
};

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
  sortType?: string;
  [key: string]: any;
}) {
  const {
    page,
    pageSize,
    platform,
    accountSearch,
    accountGroup,
    sortType,
  } = _params;

  const reqParams: Record<string, any> = {
    current: page ?? 1,
    size: pageSize ?? 10,
  };

  if (accountSearch) reqParams.accountName = accountSearch;
  if (accountGroup?.length) reqParams.suiteIds = accountGroup;
  if (platform?.length) reqParams.appIds = platform;
  if (sortType) reqParams.sortType = sortType;

  const data = await getAccountAssetPageApi(reqParams);

  return {
    list: (data.records ?? []) as AccountPoolRow[],
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
        clearable: true,
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
        collapseTags: false,
        options: groupOptions.map((item) => ({
          label: item.suiteName,
          value: item.id,
        })),
      },
    },
    {
      component: 'Select',
      fieldName: 'sortType',
      label: $t('accountPool.filter.sortType'),
      componentProps: {
        placeholder: $t('accountPool.filter.sortTypePlaceholder'),
        clearable: true,
        options: sortOptions,
      },
    },
  ],
  showCollapseButton: true,
  submitOnChange: false,
  submitOnEnter: true,
});

export const useColumns = (options: AccountPoolTableConfigOptions = {}) => [
  { type: 'checkbox', width: 50, align: 'center' },
  { field: 'platform', title: $t('accountPool.table.platform'), minWidth: 120 },
  { field: 'inputTime', title: $t('accountPool.table.entryTime'), minWidth: 160 },
  {
    field: 'riskTips',
    title: $t('accountPool.table.riskAlert'),
    minWidth: 100,
    slots: {
      default: ({ row }: { row: AccountPoolRow }) =>
        renderPoolRiskTipsCell(row),
    },
  },
  {
    field: 'loginStatusName',
    title: $t('accountPool.table.loginStatus'),
    minWidth: 120,
    formatter: ({ row }: { row: AccountPoolRow }) =>
      row.loginStatusName ?? row.loginStatus ?? '',
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
    minWidth: 140,
    slots: {
      default: ({ row }: { row: AccountPoolRow }) =>
        renderAccountPoolSensitiveCell(row.accountPassword),
    },
  },
  {
    field: 'email',
    title: $t('accountPool.table.verificationEmail'),
    minWidth: 150,
  },
  {
    field: 'emailPassword',
    title: $t('accountPool.table.emailPassword'),
    minWidth: 100,
    slots: {
      default: ({ row }: { row: AccountPoolRow }) =>
        renderAccountPoolSensitiveCell(row.emailPassword),
    },
  },
  {
    field: 'twiceCheck',
    title: $t('accountPool.table.twiceCheck'),
    minWidth: 150,
    slots: {
      default: ({ row }: { row: AccountPoolRow }) =>
        renderAccountPoolSensitiveCell(row.twiceCheck),
    },
  },
  {
    field: 'remark',
    title: $t('accountPool.table.remarks'),
    minWidth: 120,
    slots: {
      default: ({ row }: { row: AccountPoolRow }) => {
        const accountId = row.accountId || row.id;
        const remark = row.remark || '';
        const displayRemark = remark || '\u00A0';
        const editingAccountId = options.getEditingRemarkAccountId?.() ?? null;
        const isEditing = !!editingAccountId && accountId === editingAccountId;

        if (isEditing) {
          return h('input', {
            value: options.getEditingRemarkValue?.() || '',
            autofocus: true,
            spellcheck: false,
            maxlength: 50,
            style:
              'width:100%;height:28px;padding:0 8px;border:1px solid var(--el-border-color);border-radius:4px;outline:none;',
            placeholder: $t('accountPool.message.editRemarkPlaceholder'),
            onInput: (e: Event) => {
              const target = e.target as HTMLInputElement;
              options.onChangeEditingRemarkValue?.(target.value);
            },
            onBlur: () => options.onConfirmEditRemark?.(),
            onKeydown: (event: KeyboardEvent) => {
              if (event.key === 'Enter') options.onConfirmEditRemark?.();
              if (event.key === 'Escape') options.onCancelEditRemark?.();
            },
          });
        }

        return h(
          'span',
          {
            title: remark,
            style:
              'display:block;width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;' +
              'background-color:transparent;border-radius:4px;padding:2px 6px;transition:background-color 0.15s;',
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
  {
    field: 'action',
    title: $t('accountPool.table.operation'),
    width: 100,
    fixed: 'right',
    align: 'center',
    slots: {
      default: ({ row }: { row: AccountPoolRow }) => {
        const locked = Boolean(row.isLock);
        if (locked) {
          return h(
            'span',
            {
              style:
                'color: var(--el-text-color-disabled); cursor: not-allowed; user-select: none;',
              title: $t('accountPool.message.editDisabledWhenLocked'),
            },
            $t('common.edit'),
          );
        }
        return h(
          'span',
          {
            style:
              'color: var(--el-color-primary); cursor: pointer; user-select: none;',
            onClick: (event: Event) => {
              event.stopPropagation();
              options.onEdit?.(row);
            },
          },
          $t('common.edit'),
        );
      },
    },
  },
];
