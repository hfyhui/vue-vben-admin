import { socialClient } from '../request';

/** 应用列表查询参数 */
export interface ApplicationPageParams {
  current: number;
  size: number;
  applicationName?: string;
  applicationStatus?: number;
}

/** 应用列表项 */
export interface ApplicationItem {
  id: string;
  applicationName: string;
  programName?: string;
  programType?: Array<{ id?: string; programName?: string }>;
  orderNum?: number;
  applicationStatus: 0 | 1; // 0-启用 1-禁用
  [key: string]: any;
}

/** 分页响应 */
export interface ApplicationPageResponse {
  records: ApplicationItem[];
  total: number;
  size?: number;
  current?: number;
  pages?: number;
}

export interface ApiResponse<T = any> {
  code: number;
  data: T;
  msg?: string;
}

export interface ApplicationDeleteParams {
  checkIds: string[];
}

/** 获取应用管理分页列表 - 走 /social 代理到 MCC */
export async function getApplicationPageApi(
  params: ApplicationPageParams,
): Promise<ApiResponse<ApplicationPageResponse>> {
  const reqParams = {
    current: params.current,
    size: params.size,
    ...(params.applicationName && { applicationName: params.applicationName }),
    ...(params.applicationStatus !== undefined && {
      applicationStatus: params.applicationStatus,
    }),
  };
  return socialClient.post('/social/application/management/page', reqParams);
}

/** 删除应用（支持批量） */
export async function deleteApplicationApi(
  checkIds: string[],
): Promise<ApiResponse<null>> {
  return socialClient.delete('/social/application/management', {
    data: { checkIds } satisfies ApplicationDeleteParams,
  });
}

/** 启用/禁用应用 */
export async function updateApplicationStatusApi(
  id: string,
  status: 0 | 1,
): Promise<ApiResponse<null>> {
  return socialClient.post(`/social/application/management/${id}/${status}`);
}
