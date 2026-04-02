import { proxyClient } from '../request';

/** 设备资产项，与接口 POST /asset/device/page 返回的 records 结构一致 */
export interface DeviceItem {
  deviceId?: string;
  server?: string;
  inputTime?: string;
  chip?: string;
  deviceIp?: string;
  /** 设备列表等接口：true 时下拉等场景不可选 */
  disabled?: boolean;
  romVersion?: string;
  phoneBrand?: string;
  phoneModel?: string;
  operator?: string;
  phoneNumber?: string;
  deviceGroup?: string;
  remark?: string;
  account?: string;
  proxy?: string;
  deviceStatus?: string;
  color?: string;
  [key: string]: any;
}

export interface PageQuery {
  current?: number;
  size?: number;
  [key: string]: any;
}

export interface PageResult<T = any> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

export interface DeviceEnableItem {
  deviceId?: string;
  deviceIp?: string;
  accountIds?: string[];
  proxyId?: string;
}

export interface AssetEnableParams {
  deviceEnables: DeviceEnableItem[];
}

export interface AssetEnumsResponse {
  code: number;
  msg: string;
  data: Record<string, any>;
}

export interface AssetAppItem {
  id?: string;
  applicationName?: string;
  applicationStatus?: number;
  logoPath?: string;
  programName?: string;
  packageName?: string;
  activityName?: string;
  orderNum?: number;
  [key: string]: any;
}

export interface AssetAppListQuery extends PageQuery {
  applicationName?: string;
  applicationStatus?: number;
}

export interface AssetSummaryData {
  deviceTotalNum?: string;
  deviceUsedNum?: string;
  accountTotalNum?: string;
  accountUsedNum?: string;
  proxyTotalNum?: string;
  proxyUsedNum?: string;
  userTotalNum?: string;
  userUsedNum?: string;
}

export interface AssetSummaryResponse {
  code: number;
  msg: string;
  data: AssetSummaryData;
}

export interface ProxyRegionTreeNode {
  name?: string;
  level?: number;
  children?: ProxyRegionTreeNode[];
}

export interface AssetGroupItem {
  id?: string;
  suiteName?: string;
  suiteDesc?: string;
}

export interface AccountPoolNumData {
  accountTotalNum?: string;
  accountUsedNum?: string;
  accountWaitNum?: string;
  accountRiskNum?: string;
}

export interface ProxyPoolNumData {
  proxyTotalNum?: string;
  proxyUsedNum?: string;
  proxyWaitNum?: string;
  proxyRiskNum?: string;
}

export interface ContainerPoolNumData {
  deviceTotalNum?: string;
  deviceUsedNum?: string;
  deviceWaitingNum?: string;
}

export interface ReverseQueryParams {
  accountIds?: string[];
  proxyIds?: string[];
  deviceIds?: string[];
}

export interface BatchDelAccountParams {
  accountIds?: string[];
}

export interface BatchDelProxyParams {
  proxyIds?: string[];
}

export interface LockAccountParams {
  accountIds?: string[];
  lock?: boolean;
}

/** 解绑账号 POST /asset/account/unbind */
export interface AccountUnbindParams {
  accountIds?: string[];
  deviceId?: string;
  bind?: string;
}

/** 解除绑定代理 POST /asset/proxy/unbind */
export interface ProxyUnbindParams {
  assId?: string;
  proxyId?: string;
}

export interface ImportAccountParams {
  appId: string;
  file: File;
}

export interface ImportProxyParams {
  file: File;
}

export interface AddAccountParams {
  nickName?: string;
  appAccount?: string;
  accountPasswd?: string;
  emailAddr?: string;
  emailPasswd?: string;
  loginStatus?: string;
  twiceCheck?: string;
  appId?: string;
  appName?: string;
  riskLevel?: string;
  remark?: string;
  suiteId?: string;
  suiteName?: string;
  suiteDesc?: string;
}

export interface AddProxyPhoneItem {
  phoneId?: string;
  phoneIp?: string;
}

export interface AddProxyParams {
  ip?: string;
  area?: string;
  agreement?: string;
  networkStatus?: string;
  expirationTime?: string;
  networkLink?: string;
  phones?: AddProxyPhoneItem[];
  proxyLinkIp?: string;
  proxyLinkPort?: number;
  username?: string;
  password?: string;
}

export interface AddProxyRemarkParams {
  /** 代理ID */
  proxyId?: string;
  /** 代理备注 */
  remark?: string;
}

export interface AddProxyGroupParams {
  suiteId?: string;
  suiteName?: string;
  suiteDesc?: string;
  proxyIds?: string[];
}

export interface AddAccountGroupParams {
  suiteId?: string;
  suiteName?: string;
  suiteDesc?: string;
  accountIds?: string[];
}

export interface IntelligentRecognitionParams {
  networkLink?: string;
}

export interface IntelligentRecognitionData {
  proxyLinkIp?: string;
  proxyLinkPort?: string;
  username?: string;
  password?: string;
}

function resolvePageResult<T>(
  response: any,
  fallback: { current: number; size: number },
): PageResult<T> {
  const page = response?.data ?? response ?? {};

  return {
    records: Array.isArray(page.records) ? page.records : [],
    total: Number(page.total ?? 0),
    size: Number(page.size ?? fallback.size),
    current: Number(page.current ?? fallback.current),
  };
}

export async function getAccountAssetPageApi<T = any>(
  params: PageQuery,
): Promise<PageResult<T>> {
  const reqParams = {
    ...params,
    current: params.current ?? 1,
    size: params.size ?? 20,
  };

  const response = await proxyClient.post<PageResult<T>>(
    '/asset/account/page',
    reqParams,
  );
  return resolvePageResult<T>(response, {
    current: reqParams.current,
    size: reqParams.size,
  });
}

export async function getProxyAssetPageApi<T = any>(
  params: PageQuery,
): Promise<PageResult<T>> {
  const reqParams = {
    ...params,
    current: params.current ?? 1,
    size: params.size ?? 20,
  };
  const response = await proxyClient.post<PageResult<T>>(
    '/asset/proxy/page',
    reqParams,
  );
  return resolvePageResult<T>(response, {
    current: reqParams.current,
    size: reqParams.size,
  });
}

/** 获取容器资产分页信息 POST /asset/container/page */
export async function getContainerAssetPageApi<T = DeviceItem>(
  params: PageQuery,
): Promise<PageResult<T>> {
  const reqParams = {
    current: params.current ?? 1,
    size: params.size ?? 20,
    screening: params.screening,
    search: params.search,
    suiteName: params.suiteName,
    groupId: params.groupId,
    suiteIds: params.suiteIds,
    sortType: params.sortType,
    relationStatus: params.relationStatus,
  };
  const response = await proxyClient.post<PageResult<T>>(
    '/asset/container/page',
    reqParams,
  );
  return resolvePageResult<T>(response, {
    current: reqParams.current,
    size: reqParams.size,
  });
}

/** 设备列表 POST /asset/device/list（一次返回全量，默认不传分页字段） */
export async function getDeviceListApi<T = DeviceItem>(
  body: Record<string, any> = {},
): Promise<PageResult<T>> {
  const response = await proxyClient.post<PageResult<T>>(
    '/asset/device/list',
    body,
  );
  return resolvePageResult<T>(response, { current: 1, size: 0 });
}

// 兼容已有调用命名
export const getDeviceAssetPageApi = getContainerAssetPageApi;

export interface ContainerResetParams {
  deviceIds?: string[];
}

/** 重置容器（设备） POST /asset/container/reset */
export async function resetContainerApi(
  params: ContainerResetParams = {},
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/container/reset', params);
}

/** 正式启用设备绑定关系 POST /asset/enable */
export async function enableAssetApi(
  params: AssetEnableParams,
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/enable', params);
}

/** 正式启用前校验账号与容器、代理与容器 POST /asset/check/account-device */
export async function checkAccountDeviceApi(
  params: AssetEnableParams,
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/check/account-device', params);
}

/** 获取资产模块枚举信息 GET /asset/enums */
export async function getAssetEnumsApi(): Promise<AssetEnumsResponse> {
  const response = await proxyClient.get<AssetEnumsResponse>('/asset/enums');
  return response as AssetEnumsResponse;
}

/** 获取关联中心汇总信息 GET /asset/summary */
export async function getAssetSummaryApi(): Promise<AssetSummaryResponse> {
  const response = await proxyClient.get<AssetSummaryResponse>('/asset/summary');
  return response as AssetSummaryResponse;
}

/** 获取代理地区树 GET /asset/proxy/region-tree */
export async function getProxyRegionTreeApi(): Promise<ApiResponse<ProxyRegionTreeNode[]>> {
  return proxyClient.get<ApiResponse<ProxyRegionTreeNode[]>>('/asset/proxy/region-tree');
}

/** 查询分组 GET /asset/group */
export async function getAssetGroupApi(): Promise<ApiResponse<AssetGroupItem[]>> {
  return proxyClient.get<ApiResponse<AssetGroupItem[]>>('/asset/group');
}

/** 获取账号池数量 GET /asset/account/num */
export async function getAccountPoolNumApi(): Promise<ApiResponse<AccountPoolNumData>> {
  return proxyClient.get<ApiResponse<AccountPoolNumData>>('/asset/account/num');
}

/** 获取代理池数量 GET /asset/proxy/num */
export async function getProxyPoolNumApi(): Promise<ApiResponse<ProxyPoolNumData>> {
  return proxyClient.get<ApiResponse<ProxyPoolNumData>>('/asset/proxy/num');
}

/** 获取容器池数量 GET /asset/container/num */
export async function getContainerPoolNumApi(): Promise<ApiResponse<ContainerPoolNumData>> {
  return proxyClient.get<ApiResponse<ContainerPoolNumData>>('/asset/container/num');
}

/** 反向查询 POST /asset/reverse/query */
export async function reverseQueryAssetApi(
  params: ReverseQueryParams,
): Promise<ApiResponse<Record<string, any>>> {
  return proxyClient.post<ApiResponse<Record<string, any>>>('/asset/reverse/query', params);
}

/** 批量删除账号 DELETE /asset/batch/del-account */
export async function batchDeleteAccountApi(
  accountIds: string[],
): Promise<ApiResponse<null>> {
  const payload: BatchDelAccountParams = { accountIds };
  return proxyClient.delete<ApiResponse<null>>('/asset/batch/del-account', {
    data: payload,
  });
}

/** 锁定/解锁账号 POST /asset/lock-account */
export async function lockAccountApi(
  params: LockAccountParams,
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/lock-account', params);
}

/** 批量删除代理 DELETE /asset/batch/del-proxy */
export async function batchDeleteProxyApi(
  proxyIds: string[],
): Promise<ApiResponse<null>> {
  const payload: BatchDelProxyParams = { proxyIds };
  return proxyClient.delete<ApiResponse<null>>('/asset/batch/del-proxy', {
    data: payload,
  });
}

/** 解绑账号 POST /asset/account/unbind */
export async function unbindAccountApi(
  params: AccountUnbindParams,
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/account/unbind', params);
}

/** 解除代理绑定 POST /asset/proxy/unbind */
export async function unbindProxyApi(
  params: ProxyUnbindParams,
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/proxy/unbind', params);
}

/** 导入账号 POST /asset/account/import */
export async function importAccountApi(
  params: ImportAccountParams,
): Promise<ApiResponse<null>> {
  const formData = new FormData();
  formData.append('file', params.file);
  return proxyClient.post<ApiResponse<null>>('/asset/account/import', formData, {
    params: {
      appId: params.appId,
    },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/** 导入代理 POST /asset/proxy/import */
export async function importProxyApi(
  params: ImportProxyParams,
): Promise<ApiResponse<null>> {
  const formData = new FormData();
  formData.append('file', params.file);
  return proxyClient.post<ApiResponse<null>>('/asset/proxy/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/** 新增账号 POST /asset/add/account */
export async function addAccountApi(
  params: AddAccountParams,
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/add/account', params);
}

/** 新增代理 POST /asset/add/proxy */
export async function addProxyApi(
  params: AddProxyParams,
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/add/proxy', params);
}

/** 新增代理备注 POST /asset/add/proxy-remark */
export async function addProxyRemarkApi(
  params: AddProxyRemarkParams,
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/add/proxy-remark', params);
}

/** 新增代理分组 POST /asset/add/proxy-group */
export async function addProxyGroupApi(
  params: AddProxyGroupParams,
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/add/proxy-group', params);
}

/** 账号分组 POST /asset/add/account-group */
export async function addAccountGroupApi(
  params: AddAccountGroupParams,
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/add/account-group', params);
}

/** 智能识别 POST /asset/intelligent/recognition */
export async function intelligentRecognitionApi(
  params: IntelligentRecognitionParams,
): Promise<ApiResponse<IntelligentRecognitionData>> {
  return proxyClient.post<ApiResponse<IntelligentRecognitionData>>(
    '/asset/intelligent/recognition',
    params,
  );
}

/** 获取平台应用列表 POST /asset/app/list */
export async function getAssetAppListApi(
  params: AssetAppListQuery = {},
): Promise<PageResult<AssetAppItem>> {
  const reqParams = {
    ...params,
    current: params.current ?? 1,
    size: params.size ?? 100,
  };
  const response = await proxyClient.post<PageResult<AssetAppItem>>(
    '/asset/app/list',
    reqParams,
  );
  return resolvePageResult<AssetAppItem>(response, {
    current: reqParams.current,
    size: reqParams.size,
  });
}

/** 下载账号模板 GET /asset/template/account */
export async function downloadAccountTemplateApi(): Promise<void> {
  const blob = await proxyClient.download('/asset/template/account');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'account_template.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 下载代理模板 GET /asset/template/proxy */
export async function downloadProxyTemplateApi(): Promise<void> {
  const blob = await proxyClient.download('/asset/template/proxy');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'proxy_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

