import { socialClient } from '#/api/request';

export type ProjectionDevicePageParams = {
  current?: number;
  size?: number;
  [key: string]: any;
};

export async function getProjectionDevicePageApi(params: ProjectionDevicePageParams) {
  return socialClient.get('/device/page', { params });
}

export async function updateProjectionDeviceApi(data: Record<string, any>) {
  return socialClient.request('/device/update', {
    data,
    method: 'PATCH',
  });
}

/** 投屏矩阵侧 PATCH body：Pinia / Hover / WebAdb 共用 */
export function buildProjectionDeviceUpdateBody(
  deviceIds: (string | number)[],
  raw: Record<string, any>,
) {
  const body: Record<string, any> = {
    operation: raw.operation ?? raw.name,
    deviceIds,
  };
  if (raw.ratioValue !== undefined) body.ratioValue = raw.ratioValue;
  if (raw.locationReqVo !== undefined) body.locationReqVo = raw.locationReqVo;
  return body;
}

export async function patchProjectionDeviceUpdate(
  deviceIds: (string | number)[],
  raw: Record<string, any>,
) {
  return updateProjectionDeviceApi(buildProjectionDeviceUpdateBody(deviceIds, raw));
}

export async function postProjectionDeviceOpenAppApi(data: Record<string, any>) {
  return socialClient.post('/device/openApp', data);
}

export async function putProjectionDeviceRefreshApi(data: Record<string, any>) {
  return socialClient.put('/device/refresh', data);
}

/** 顶栏批量刷新 / 小卡 Hover 刷新共用 */
export async function refreshProjectionDevices(
  deviceIds: (string | number)[],
  options?: { isRestart?: boolean },
) {
  const payload: Record<string, any> = { deviceIds };
  if (options?.isRestart !== undefined) payload.isRestart = options.isRestart;
  return putProjectionDeviceRefreshApi(payload);
}

export async function getProjectionSuiteScreenPageApi(params: Record<string, any>) {
  return socialClient.get('/suite/screen-page', { params });
}

export async function getProjectionCacheQueryApi(params?: Record<string, any>) {
  return socialClient.get('/cache/query', { params });
}

export async function deleteProjectionCacheClearApi(params?: Record<string, any>) {
  return socialClient.delete('/cache/clear', { params });
}

export async function postProjectionTaskSaveApi(data: Record<string, any>) {
  return socialClient.post('/task', data);
}
