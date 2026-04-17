import { proxyClient } from '../request';

export type SocialPageParams = {
  current?: number;
  size?: number;
  suiteName?: string;
  [key: string]: any;
};

export async function getSocialSuitePageApi(params: SocialPageParams) {
  return proxyClient.get<{
    code: number;
    data: { records: any[]; total: number };
    msg?: string;
  }>('/suite/page', { params });
}

export async function getSocialSuiteDetailApi(id: string) {
  return proxyClient.get<{ code: number; data: Record<string, any>; msg?: string }>(
    `/suite/detail/${encodeURIComponent(id)}`,
  );
}

export async function updateSocialSuiteApi(data: Record<string, any>) {
  return proxyClient.post<{ code: number; data?: any; msg?: string }>(
    '/suite/update',
    data,
  );
}

export async function deleteSocialSuiteApi(suiteIds: string[]) {
  return proxyClient.delete<{ code: number; data?: any; msg?: string }>(
    '/suite/del',
    { data: { suiteIds } },
  );
}
