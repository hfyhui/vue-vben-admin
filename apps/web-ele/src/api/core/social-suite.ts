import { socialClient } from '../request';

export type SocialPageParams = {
  current?: number;
  size?: number;
  suiteName?: string;
  [key: string]: any;
};

export async function getSocialSuitePageApi(params: SocialPageParams) {
  return socialClient.get<{
    code: number;
    data: { records: any[]; total: number };
    msg?: string;
  }>('/social/suite/page', { params });
}

export async function getSocialSuiteDetailApi(id: string) {
  return socialClient.get<{ code: number; data: Record<string, any>; msg?: string }>(
    `/social/suite/detail/${encodeURIComponent(id)}`,
  );
}

export async function updateSocialSuiteApi(data: Record<string, any>) {
  return socialClient.post<{ code: number; data?: any; msg?: string }>(
    '/social/suite/update',
    data,
  );
}

export async function deleteSocialSuiteApi(suiteIds: string[]) {
  return socialClient.delete<{ code: number; data?: any; msg?: string }>(
    '/social/suite/del',
    { data: { suiteIds } },
  );
}
