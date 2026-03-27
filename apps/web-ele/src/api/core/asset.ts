import { proxyClient } from '../request';

/** 设备资产项，与接口 POST /asset/device/page 返回的 records 结构一致 */
export interface DeviceItem {
  server?: string;
  inputTime?: string;
  chip?: string;
  deviceIp?: string;
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
}

export interface AccountPoolNumData {
  accountTotalNum?: string;
  accountUsedNum?: string;
  accountWaitNum?: string;
  accountRiskNum?: string;
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

export interface ImportAccountParams {
  appId: string;
  file: File;
}

export interface AddAccountParams {
  appId?: string;
  riskLevel?: string;
  appAccount?: string;
  userName?: string;
  userAccount?: string;
  password?: string;
  email?: string;
  remark?: string;
  suiteId?: string;
  suiteName?: string;
  suiteDesc?: string;
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
    groupId: params.groupId,
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

// 兼容已有调用命名
export const getDeviceAssetPageApi = getContainerAssetPageApi;

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

/** 批量删除代理 DELETE /asset/batch/del-proxy */
export async function batchDeleteProxyApi(
  proxyIds: string[],
): Promise<ApiResponse<null>> {
  const payload: BatchDelProxyParams = { proxyIds };
  return proxyClient.delete<ApiResponse<null>>('/asset/batch/del-proxy', {
    data: payload,
  });
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

/** 新增账号 POST /asset/add/account */
export async function addAccountApi(
  params: AddAccountParams,
): Promise<ApiResponse<null>> {
  return proxyClient.post<ApiResponse<null>>('/asset/add/account', params);
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

