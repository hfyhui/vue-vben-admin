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

/** 获取容器资产分页信息 POST /asset/device/page */
export async function getDeviceAssetPageApi<T = DeviceItem>(
  params: PageQuery,
): Promise<PageResult<T>> {
  const reqParams = {
    current: params.current ?? 1,
    size: params.size ?? 20,
    screening: params.screening,
    search: params.search,
    groupId: params.groupId,
    sort: params.sort,
  };
  const response = await proxyClient.post<PageResult<T>>(
    '/asset/device/page',
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

