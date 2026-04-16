import type { VbenFormProps } from '#/adapter/form';

import { h } from 'vue';

import {
  getContainerAssetPageApi,
  type AssetGroupItem,
  type AssetOperatorItem,
} from '#/api/core/asset';

import { $t } from '#/locales';

export type ContainerPoolSortOption = { label: string; value: string };
export type ContainerPoolStatusOption = { label: string; value: string };
export type ContainerPoolOperatorOption = AssetOperatorItem;
export type ContainerPoolBrandOption = { label: string; value: string };
export type ContainerPoolModelOption = { label: string; value: string };

/** 与 POST /asset/container/page 返回 records 项一致（容器池列表） */
export interface ContainerPoolRow {
  server?: string;
  inputTime?: string;
  chip?: string;
  deviceIp?: string;
  deviceId?: string;
  romVersion?: string;
  phoneBrand?: string;
  phoneModel?: string;
  operator?: string;
  phoneNumber?: string;
  deviceGroup?: string[];
  remark?: string;
  account?: string;
  proxy?: string;
  proxyIp?: string;
  deviceStatus?: string;
  color?: string;
  /** 锁定等扩展字段 */
  isLock?: boolean;
  [key: string]: any;
}


export type ContainerPoolTableConfigOptions = {
  getEditingRemarkDeviceId?: () => string | null;
  getEditingRemarkValue?: () => string;
  onStartEditRemark?: (row: ContainerPoolRow) => void;
  onChangeEditingRemarkValue?: (value: string) => void;
  onConfirmEditRemark?: () => void;
  onCancelEditRemark?: () => void;
};

export async function getContainerPoolListApi(_params: {
  page: number;
  pageSize: number;
  containerFilter?: string;
  containerSearch?: string;
  containerGroup?: string[];
  sortType?: string;
  server?: string;
  inputTime?: string;
  chip?: string;
  deviceIp?: string;
  romVersion?: string;
  phoneBrand?: string;
  phoneModel?: string;
  operator?: string;
  phoneNum?: string;
  deviceVersion?: string;
  suiteNames?: string;
  remark?: string;
  accountNames?: string;
  proxyIp?: string;
  deviceStatusName?: string;
  [key: string]: any;
}) {
  const {
    page,
    pageSize,
    containerFilter,
    containerSearch,
    containerGroup,
    sortType,
    server,
    inputTime,
    chip,
    deviceIp,
    romVersion,
    phoneBrand,
    phoneModel,
    operator,
    phoneNum,
    deviceVersion,
    suiteNames,
    remark,
    accountNames,
    proxyIp,
    deviceStatusName,
  } = _params;

  const reqParams: Record<string, any> = {
    current: page ?? 1,
    size: pageSize ?? 10,
    screening: containerFilter,
    search: containerSearch,
    suiteIds: containerGroup,
    sortType: sortType,
  };

  if (server) reqParams.server = server;
  if (inputTime) reqParams.inputTime = inputTime;
  if (chip) reqParams.chip = chip;
  if (deviceIp) reqParams.deviceIp = deviceIp;
  if (romVersion) reqParams.romVersion = romVersion;
  if (phoneBrand) reqParams.phoneBrand = phoneBrand;
  if (phoneModel) reqParams.phoneModel = phoneModel;
  if (operator) reqParams.operator = operator;
  if (phoneNum) reqParams.phoneNum = phoneNum;
  if (deviceVersion) reqParams.deviceVersion = deviceVersion;
  if (suiteNames) reqParams.suiteNames = suiteNames;
  if (remark) reqParams.remark = remark;
  if (accountNames) reqParams.accountNames = accountNames;
  if (proxyIp) reqParams.proxyIp = proxyIp;
  if (deviceStatusName) reqParams.deviceStatusName = deviceStatusName;

  const data = await getContainerAssetPageApi(reqParams);

  const list = (data.records || []) as ContainerPoolRow[];

  return {
    list,
    total: Number(data.total ?? 0),
  };
}

export const getFormOptions = (
  sortOptions: ContainerPoolSortOption[] = [],
  groupOptions: AssetGroupItem[] = [],
  statusOptions: ContainerPoolStatusOption[] = [],
  operatorOptions: ContainerPoolOperatorOption[] = [],
  brandOptions: ContainerPoolBrandOption[] = [],
  modelOptions: ContainerPoolModelOption[] = [],
): VbenFormProps => ({
  collapsed: false,
  schema: [
    {
      component: 'Input',
      fieldName: 'containerFilter',
      label: $t('containerPool.filter.containerFilter'),
      componentProps: {
        placeholder: $t('containerPool.filter.containerFilterPlaceholder'),
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'containerSearch',
      label: $t('containerPool.filter.containerSearch'),
      componentProps: {
        placeholder: $t('containerPool.filter.containerSearchPlaceholder'),
        clearable: true,
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
        multiple: true,
        collapseTags: false,
        options: groupOptions
          .map((item) => ({
            label: item.suiteName ?? '',
            value: item.id as string,
          })),
      },
    },
    {
      component: 'Select',
      fieldName: 'sortType',
      label: $t('containerPool.filter.sortType'),
      componentProps: {
        placeholder: $t('containerPool.filter.sortTypePlaceholder'),
        clearable: true,
        options: sortOptions,
      },
    },
    {
      component: 'Input',
      fieldName: 'server',
      label: $t('containerPool.table.server'),
      componentProps: { clearable: true, placeholder: $t('containerPool.filter.serverPlaceholder') },
    },
    {
      component: 'DatePicker',
      fieldName: 'inputTime',
      label: $t('containerPool.table.inputTime'),
      componentProps: {
        style: { width: '100%' },
        clearable: true,
        type: 'datetime',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        placeholder: $t('containerPool.filter.inputTimePlaceholder'),
      },
    },
    {
      component: 'Input',
      fieldName: 'chip',
      label: $t('containerPool.table.chip'),
      componentProps: { clearable: true, placeholder: $t('containerPool.filter.chipPlaceholder') },
    },
    {
      component: 'Input',
      fieldName: 'deviceIp',
      label: $t('containerPool.table.deviceIp'),
      componentProps: { clearable: true, placeholder: $t('containerPool.filter.deviceIpPlaceholder') },
    },
    {
      component: 'Input',
      fieldName: 'romVersion',
      label: $t('containerPool.table.romVersion'),
      componentProps: { clearable: true, placeholder: $t('containerPool.filter.romVersionPlaceholder') },
    },
    {
      component: 'Select',
      fieldName: 'phoneBrand',
      label: $t('containerPool.table.phoneBrand'),
      componentProps: {
        clearable: true,
        filterable: true,
        placeholder: $t('containerPool.filter.phoneBrandPlaceholder'),
        options: brandOptions,
      },
    },
    {
      component: 'Select',
      fieldName: 'phoneModel',
      label: $t('containerPool.table.phoneModel'),
      componentProps: {
        clearable: true,
        filterable: true,
        placeholder: $t('containerPool.filter.phoneModelPlaceholder'),
        options: modelOptions,
      },
    },
    {
      component: 'Select',
      fieldName: 'operator',
      label: $t('containerPool.table.operator'),
      componentProps: {
        clearable: true,
        filterable: true,
        placeholder: $t('containerPool.filter.operatorPlaceholder'),
        options: operatorOptions
          .filter((item) => Boolean(item?.id))
          .map((item) => ({
            label:
              item.allName ??
              item.operatorZhName ??
              item.operatorEnName ??
              item.id ??
              '',
            value:
              item.operatorEnName ??
              item.operatorZhName ??
              item.id ??
              '',
          })),
      },
    },
    {
      component: 'Input',
      fieldName: 'phoneNum',
      label: $t('containerPool.table.phoneNumber'),
      componentProps: { clearable: true, placeholder: $t('containerPool.filter.phoneNumPlaceholder') },
    },
    {
      component: 'Input',
      fieldName: 'deviceVersion',
      label: $t('containerPool.table.deviceVersion'),
      componentProps: { clearable: true, placeholder: $t('containerPool.filter.deviceVersionPlaceholder') },
    },
    {
      component: 'Select',
      fieldName: 'deviceStatusName',
      label: $t('containerPool.table.status'),
      componentProps: {
        clearable: true,
        filterable: true,
        placeholder: $t('containerPool.filter.deviceStatusPlaceholder'),
        options: statusOptions,
      },
    },
    {
      component: 'Input',
      fieldName: 'suiteNames',
      label: $t('containerPool.table.deviceGroup'),
      componentProps: { clearable: true, placeholder: $t('containerPool.filter.suiteNamesPlaceholder') },
    },
    {
      component: 'Input',
      fieldName: 'accountNames',
      label: $t('containerPool.table.account'),
      componentProps: { clearable: true, placeholder: $t('containerPool.filter.accountNamesPlaceholder') },
    },
    {
      component: 'Input',
      fieldName: 'proxyIp',
      label: $t('containerPool.table.proxy'),
      componentProps: { clearable: true, placeholder: $t('containerPool.filter.proxyIpPlaceholder') },
    },
    {
      component: 'Input',
      fieldName: 'remark',
      label: $t('containerPool.table.remark'),
      componentProps: { clearable: true, placeholder: $t('containerPool.filter.remarkPlaceholder') },
    },
  ],
  showCollapseButton: true,
  submitOnChange: false,
  submitOnEnter: true,
});

export const useColumns = (options: ContainerPoolTableConfigOptions = {}) => [
  { type: 'checkbox', width: 50, align: 'center' },
  { field: 'server', title: $t('containerPool.table.server'), minWidth: 140 },
  { field: 'inputTime', title: $t('containerPool.table.inputTime'), minWidth: 170 },
  { field: 'chip', title: $t('containerPool.table.chip'), minWidth: 120 },
  { field: 'deviceIp', title: $t('containerPool.table.deviceIp'), minWidth: 130 },
  { field: 'romVersion', title: $t('containerPool.table.romVersion'), minWidth: 100 },
  { field: 'phoneBrand', title: $t('containerPool.table.phoneBrand'), minWidth: 110 },
  { field: 'phoneModel', title: $t('containerPool.table.phoneModel'), minWidth: 110 },
  { field: 'operator', title: $t('containerPool.table.operator'), minWidth: 100 },
  { field: 'phoneNum', title: $t('containerPool.table.phoneNumber'), minWidth: 120 },
  { field: 'deviceVersion', title: $t('containerPool.table.deviceVersion'), minWidth: 120 },
  { field: 'deviceStatusName', title: $t('containerPool.table.status'), minWidth: 100 },
  {
    field: 'suiteNames',
    title: $t('containerPool.table.deviceGroup'),
    minWidth: 160,
  },
  { field: 'accountNames', title: $t('containerPool.table.account'), minWidth: 120 },
  { field: 'proxyIp', title: $t('containerPool.table.proxy'), minWidth: 160 },
  {
    field: 'remark',
    title: $t('containerPool.table.remark'),
    maxlength: 50,
    minWidth: 160,
    slots: {
      default: ({ row }: { row: ContainerPoolRow }) => {
        const deviceId = row.deviceId;
        const remark = row.remark ?? '';
        const displayRemark = remark ? remark : '\u00A0';
        const editingId = options.getEditingRemarkDeviceId?.() ?? null;
        const isEditing = !!editingId && deviceId === editingId;

        if (isEditing) {
          return h('input', {
            value: options.getEditingRemarkValue?.() ?? '',
            autofocus: true,
            spellcheck: false,
            maxlength: 50,
            style:
              'width:100%;height:28px;padding:0 8px;border:1px solid var(--el-border-color);border-radius:4px;outline:none;',
            placeholder: $t('containerPool.message.editRemarkPlaceholder'),
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
              'display:flex;align-items:center;width:100%;min-width:0;min-height:28px;box-sizing:border-box;' +
              'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;' +
              'background-color:transparent;border-radius:4px;' +
              'padding:2px 6px;transition:background-color 0.15s;',
            onMouseenter: (event: MouseEvent) => {
              const el = event.currentTarget as HTMLElement;
              if (!el) return;
              el.style.backgroundColor = 'var(--el-fill-color-dark)';
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
];

