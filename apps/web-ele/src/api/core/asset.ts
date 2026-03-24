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

export interface DeviceGroupItem {
  groupId?: string;
  groupName?: string;
}

export interface AccountPoolNumData {
  accountTotalNum?: string;
  accountUsedNum?: string;
  accountWaitNum?: string;
  accountRiskNum?: string;
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

/** 查询设备分组 GET /asset/device/group */
export async function getDeviceGroupApi(): Promise<ApiResponse<DeviceGroupItem[]>> {
  return proxyClient.get<ApiResponse<DeviceGroupItem[]>>('/asset/device/group');
}

/** 获取账号池数量 GET /asset/account/num */
export async function getAccountPoolNumApi(): Promise<ApiResponse<AccountPoolNumData>> {
  return proxyClient.get<ApiResponse<AccountPoolNumData>>('/asset/account/num');
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

