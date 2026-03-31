import { proxyClient, socialClient } from '../request';

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

export interface ApplicationScriptItem {
  id: string;
  name?: string;
  programName?: string;
  [key: string]: any;
}

export interface DynamicFormColumnItem {
  label?: string;
  prop?: string;
  field?: string;
  children?: DynamicFormColumnItem[];
  [key: string]: any;
}

export interface DynamicFormUpsertPayload {
  id?: string;
  scriptId?: string;
  programName?: string;
  logoPath?: string;
  programCategory?: string;
  form?: Record<string, any>[];
  extendedColumn?: Record<string, any>[];
  [key: string]: any;
}

export interface ApplicationUpsertPayload {
  id?: string;
  applicationName: string;
  logoPath: string;
  packageName?: string;
  activityName?: string;
  programIds: string[];
  programType?: Record<string, any>[];
  orderNum?: number;
  applicationStatus?: 0 | 1;
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

/** 启用后同步触发一次平台代理接口 */
export async function updateApplicationStatusByProxyApi(
  id: string,
  status: 0 | 1,
): Promise<ApiResponse<null>> {
  return proxyClient.post(`/social/application/management/${id}/${status}`);
}

/** 获取应用详情 */
export async function getApplicationDetailApi(
  id: string,
): Promise<ApiResponse<ApplicationItem>> {
  return socialClient.get(`/social/application/management/${id}`);
}

/** 获取脚本清单 */
export async function getApplicationScriptListApi(): Promise<
  ApiResponse<ApplicationScriptItem[]>
> {
  return socialClient.get('/social/application/management/script');
}

/** 获取动态表单字段配置 */
export async function getDynamicFormColumnConfigApi(): Promise<
  ApiResponse<DynamicFormColumnItem[]>
> {
  return socialClient.post('/social/dynamic/form/column/table', {});
}

/** 新增/编辑动态表单 */
export async function saveDynamicFormApi(
  data: DynamicFormUpsertPayload,
): Promise<ApiResponse<{ id?: string }>> {
  return socialClient.put('/social/dynamic/form', data);
}

/** 新增应用 */
export async function createApplicationApi(
  data: ApplicationUpsertPayload,
): Promise<ApiResponse<null>> {
  // 兼容旧系统：新增走 PUT
  return socialClient.put('/social/application/management', data);
}

/** 编辑应用 */
export async function updateApplicationApi(
  data: ApplicationUpsertPayload,
): Promise<ApiResponse<null>> {
  // 兼容旧系统：编辑走 POST
  return socialClient.post('/social/application/management', data);
}
