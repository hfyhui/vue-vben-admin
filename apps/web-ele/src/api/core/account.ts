import { socialClient } from '#/api/request';

export interface AccountPageParams {
  appAccount?: string;
  appId?: number | string;
  current?: number;
  deviceIp?: string;
  fansMagnitude?: string;
  id?: number | string;
  loginStatus?: string;
  size?: number;
  suiteIds?: Array<number | string>;
}

export function getAccountPageApi(data: AccountPageParams) {
  return socialClient.post('/account/list', data);
}

export function getAccountManageDetailApi(accountId: number | string) {
  return socialClient.get(`/account/detail/${accountId}`);
}

export function updateAccountApi(data: Record<string, any>) {
  return socialClient.post('/account/update', data);
}

export function deleteAccountApi(data: { accountIds: Array<number | string> }) {
  return socialClient.request('/account/del', {
    data,
    method: 'DELETE',
  });
}

export function bindAccountApi(data: Record<string, any>) {
  return socialClient.request('/account/bind', {
    data,
    method: 'PUT',
  });
}

export function reloginAccountApi(id: number | string) {
  return socialClient.request(`/account/login/again/${id}`, {
    method: 'PUT',
  });
}

export function reloginBatchApi(data: { appAccountIds: Array<number | string> }) {
  return socialClient.request('/account/login/batch', {
    data,
    method: 'PUT',
  });
}

export function accountDeviceOpenApi(deviceId: number | string) {
  return socialClient.get(`/device/open/${deviceId}`);
}

export function updateAccountRemarkApi(data: {
  accountId: number | string;
  remark: string;
}) {
  return socialClient.post('/account/remark', data);
}

export function getAccountSecApi(twiceCheck: number | string) {
  return socialClient.get(`/account/sec/${twiceCheck}`);
}

export function getAccountUserProfileApi(accountId: number | string) {
  return socialClient.get(`/account/user/${accountId}`);
}

export function getAccountUserInfoApi(accountId: number | string) {
  return socialClient.get(`/account/user/info/${accountId}`);
}

export function getAccountActiveApi(data: { accountId: number | string }) {
  return socialClient.post('/account/active', data);
}

export function syncAccountUserInfoApi(data: {
  accountId: number | string;
  appAccount?: string;
  appId?: number | string;
  deviceId?: number | string;
  userInfoId?: number | string;
}) {
  return socialClient.post('/account/user/info', data);
}

export function updateAccountUserInfoApi(data: Record<string, any>) {
  return socialClient.post('/account/user/info/update', data);
}

export function getDeviceUnusedListApi(params: Record<string, any>) {
  return socialClient.get('/device/unused/get', { params });
}

export function getAccountPlanPageApi(params: Record<string, any>) {
  return socialClient.get('/account/plan/page', { params });
}

export function accountJoinPlanApi(data: {
  accountId: number | string;
  planIds: Array<number | string>;
}) {
  return socialClient.post('/account/join', data);
}

export function accountQuitPlanByAccountApi(data: { rltIds: Array<number | string> }) {
  return socialClient.request('/account/quit', {
    data,
    method: 'DELETE',
  });
}

export function addAccountSuiteApi(data: Record<string, any>) {
  return socialClient.post('/account-suite/add', data);
}

export function systemPlanJoinApi(data: { accountId: number | string }) {
  return socialClient.post('/system-plan/join', data);
}

export function systemPlanQuitApi(data: { accountId: number | string }) {
  return socialClient.request('/system-plan/quit', {
    data,
    method: 'PUT',
  });
}

