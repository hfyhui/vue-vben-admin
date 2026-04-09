import { socialClient } from '../request';

export type SocialPageBody = {
  current?: number;
  size?: number;
  [key: string]: any;
};

/** GET /social/device/page */
export async function getSocialDevicePageApi(params: SocialPageBody) {
  return socialClient.get<{
    code: number;
    data: { records: any[]; total: number };
    msg?: string;
  }>('/social/device/page', { params: params });
}

/** POST /social/account/list */
export async function postSocialAccountListApi(data: SocialPageBody) {
  return socialClient.post<{
    code: number;
    data: { records: any[]; total: number };
    msg?: string;
  }>('/social/account/list', data);
}

/** POST /social/account-suite/update */
export async function updateSocialAccountSuiteApi(data: Record<string, any>) {
  return socialClient.post<{ code: number; data?: any; msg?: string }>(
    '/social/account-suite/update',
    data,
  );
}
