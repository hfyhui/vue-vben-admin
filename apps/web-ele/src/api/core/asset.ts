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
  const data: any = (response as any)?.data ?? response;

  if (data && typeof data === 'object' && 'records' in data) {
    return {
      records: (data.records ?? []) as T[],
      total: data.total ?? 0,
      size: data.size ?? reqParams.size,
      current: data.current ?? reqParams.current,
    };
  }

  return {
    records: [],
    total: 0,
    size: reqParams.size,
    current: reqParams.current,
  };
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
  const data: any = (response as any)?.data ?? response;
  if (data && typeof data === 'object' && 'records' in data) {
    return {
      records: (data.records ?? []) as T[],
      total: data.total ?? 0,
      size: data.size ?? reqParams.size,
      current: data.current ?? reqParams.current,
    };
  }
  return {
    records: [],
    total: 0,
    size: reqParams.size,
    current: reqParams.current,
  };
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
  const data: any = (response as any)?.data ?? response;
  if (data && typeof data === 'object' && 'records' in data) {
    return {
      records: (data.records ?? []) as T[],
      total: data.total ?? 0,
      size: data.size ?? reqParams.size,
      current: data.current ?? reqParams.current,
    };
  }
  return {
    records: [],
    total: 0,
    size: reqParams.size,
    current: reqParams.current,
  };
}

// 兼容已有调用命名
export const getDeviceAssetPageApi = getContainerAssetPageApi;

/** 正式启用设备绑定关系 POST /asset/enable */
export async function enableAssetApi(
  params: AssetEnableParams,
): Promise<ApiResponse<null>> {
  const response = await proxyClient.post<ApiResponse<null>>('/asset/enable', params);
  return (response as any)?.data
    ? ((response as any).data as ApiResponse<null>)
    : (response as ApiResponse<null>);
}

/** 获取资产模块枚举信息 GET /asset/enums */
export async function getAssetEnumsApi(): Promise<AssetEnumsResponse> {
  const response = await proxyClient.get<AssetEnumsResponse>('/asset/enums');
  return (response as any)?.data
    ? ((response as any).data as AssetEnumsResponse)
    : (response as AssetEnumsResponse);
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
  const response = await proxyClient.post<any>('/asset/app/list', reqParams);
  const payload: any = (response as any)?.data ?? response;
  const pageData: any =
    payload && typeof payload === 'object' && 'records' in payload
      ? payload
      : payload?.data;

  if (pageData && typeof pageData === 'object' && 'records' in pageData) {
    return {
      records: (pageData.records ?? []) as AssetAppItem[],
      total: pageData.total ?? 0,
      size: pageData.size ?? reqParams.size,
      current: pageData.current ?? reqParams.current,
    };
  }

  return {
    records: [],
    total: 0,
    size: reqParams.size,
    current: reqParams.current,
  };
}

