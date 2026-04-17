import { proxyClient } from '../request';

export type SocialPageBody = {
  current?: number;
  size?: number;
  [key: string]: any;
};

/** GET .../social/device/page（baseURL 含 /social，路径用 /device/page） */
export async function getSocialDevicePageApi(params: SocialPageBody) {
  return proxyClient.get<{
    code: number;
    data: { records: any[]; total: number };
    msg?: string;
  }>('/device/page', { params: params });
}

/** POST .../social/account/list */
export async function postSocialAccountListApi(data: SocialPageBody) {
  return proxyClient.post<{
    code: number;
    data: { records: any[]; total: number };
    msg?: string;
  }>('/account/list', data);
}

/** POST .../social/account-suite/update */
export async function updateSocialAccountSuiteApi(data: Record<string, any>) {
  return proxyClient.post<{ code: number; data?: any; msg?: string }>(
    '/account-suite/update',
    data,
  );
}
