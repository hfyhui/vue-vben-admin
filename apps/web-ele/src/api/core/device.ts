import type { AxiosRequestConfig } from 'axios';

import { socialClient } from '#/api/request';

export interface DevicePageParams {
  current?: number;
  deviceCategories?: string;
  deviceIdx?: string;
  deviceStatuses?: string;
  phoneUser?: string;
  size?: number;
  suiteId?: number;
}

export interface DeviceUpdateParams {
  deviceIds: number[];
  operation: string;
}

export interface SuitePageParams {
  current?: number;
  size?: number;
}

/** 与旧版 SuiteDeviceAdd 一致：mobiles 为列表勾选行的完整记录 */
export interface SuiteDeviceAddParams {
  mobiles: Array<Record<string, unknown>>;
  suiteDesc?: string;
  suiteId?: number;
  suiteName: string;
}

export interface NetworkConfigPageParams {
  agreement?: string;
  area?: string;
  current?: number;
  ip?: string;
  isNearExpire?: boolean;
  networkStatus?: string;
  phoneIp?: string;
  size?: number;
}

export interface NetworkConfigSaveParams {
  agreement: string;
  area: string;
  expirationTime: string;
  id?: number;
  ip: string;
  networkLink: string;
  phones?: Array<{ phoneId: number | string; phoneIp: string }>;
}

export async function getDevicePageApi(params: DevicePageParams) {
  return socialClient.get('/device/page', { params });
}

export async function getDeviceDetailApi(deviceId: number | string) {
  return socialClient.get(`/device/detail/${deviceId}`);
}

export async function getDeviceAppListApi(deviceIp: string) {
  return socialClient.get(`/device/appList/${encodeURIComponent(deviceIp)}`);
}

export async function modifyDeviceAliasApi(data: {
  deviceAliases: string;
  deviceId: number | string;
}) {
  return socialClient.put('/device/modify', data);
}

export async function updateDeviceApi(
  data: DeviceUpdateParams & Record<string, unknown>,
) {
  return socialClient.request('/device/update', { method: 'PATCH', data });
}

/** 上传 APK（multipart），用于日程侧「上传安装包」 */
export async function deviceUploadApi(
  formData: FormData,
  config?: AxiosRequestConfig,
) {
  return socialClient.post('/device/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  });
}

export async function getSuitePageApi(params: SuitePageParams) {
  return socialClient.get('/suite/page', { params });
}

export async function addSuiteDeviceApi(data: SuiteDeviceAddParams) {
  return socialClient.post('/suite/device/add', data);
}

export async function getNetworkConfigAgreementsListApi() {
  return socialClient.get('/mobile-network/agreements/list');
}

export async function getNetworkConfigPageApi(data: NetworkConfigPageParams) {
  return socialClient.post('/mobile-network/page', data);
}

export async function getNetworkConfigDetailApi(id: number | string) {
  return socialClient.get(`/mobile-network/${id}`);
}

export async function saveNetworkConfigApi(data: NetworkConfigSaveParams) {
  return socialClient.post('/mobile-network/save', data);
}

export async function updateNetworkConfigApi(
  data: NetworkConfigSaveParams & { id: number | string },
) {
  return socialClient.put('/mobile-network/update', data);
}

export async function deleteNetworkConfigApi(data: { ids: Array<number | string> }) {
  return socialClient.delete('/mobile-network/delete', { data });
}

export async function renewNetworkConfigApi(data: { id: number | string }) {
  return socialClient.put('/mobile-network/renew', data);
}

export async function bindNetworkConfigApi(data: {
  id: number | string;
  phones: Array<{ phoneId: number | string; phoneIp: string }>;
}) {
  return socialClient.put('/mobile-network/bind', data);
}

export async function unbindNetworkConfigApi(data: {
  assIds: Array<number | string>;
  id: number | string;
}) {
  return socialClient.put('/mobile-network/unbind', data);
}

export async function getNetworkConfigNodesApi(params: {
  networkId?: number | string;
  pageNum?: number;
  pageSize?: number;
  phoneIp?: string;
}) {
  return socialClient.get('/mobile-network/nodes', { params });
}

export async function downloadNetworkConfigApi(data: { ids: Array<number | string> }) {
  return socialClient.post('/mobile-network/download', data, {
    responseType: 'blob',
  });
}

export async function downloadNetworkConfigTemplateApi() {
  return socialClient.get('/mobile-network/download/temp', {
    responseType: 'blob',
  });
}

export async function importNetworkConfigCsvApi(formData: FormData) {
  return socialClient.post('/mobile-network/import/csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function updateNetworkConfigProxyApi(data: {
  networkId: number | string;
  operationStatus: boolean;
}) {
  return socialClient.post('/mobile-network/proxy/update', data);
}

export async function disableNetworkConfigProxyApi(data: {
  networkId: number | string;
  operationStatus: boolean;
}) {
  return socialClient.post('/mobile-network/proxy/disable', data);
}

export async function addNetworkConfigRemarkApi(data: {
  networkId: number | string;
  remark: string;
}) {
  return socialClient.post('/mobile-network/add-remark', data);
}

export async function addNetworkConfigProxySuiteApi(data: {
  proxyIds: string[];
  suiteDesc?: string;
  suiteId?: number | string;
  suiteName: string;
}) {
  return socialClient.post('/proxy-suite/add', data);
}
