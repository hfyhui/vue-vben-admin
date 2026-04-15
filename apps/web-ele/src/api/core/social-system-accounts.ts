import { proxyClient } from '../request';

export type SocialAccountsPageBody = {
  current?: number;
  size?: number;
  appId?: string;
  keyword?: string;
  [key: string]: any;
};

export async function postSystemAccountsPageApi(data: SocialAccountsPageBody) {
  return proxyClient.post<{
    code: number;
    data: { records: any[]; total: number };
    msg?: string;
  }>('/accounts/page', data);
}

export async function postSystemAccountsUsersPageApi(data: SocialAccountsPageBody) {
  return proxyClient.post<{
    code: number;
    data: { records: any[]; total: number };
    msg?: string;
  }>('/accounts/users/page', data);
}

export async function postSystemAccountsUsersApi(data: { accountIds?: string[] }) {
  return proxyClient.post<{ code: number; data: any[]; msg?: string }>(
    '/accounts/users',
    data,
  );
}

export async function postSystemAccountsByUsersApi(data: {
  userIds?: string[];
  appId?: string;
}) {
  return proxyClient.post<{ code: number; data: any[]; msg?: string }>(
    '/accounts',
    data,
  );
}

export async function postSystemAccountsBandApi(data: {
  appId: string;
  accountIds: string[];
  userIds: string[];
  delIds: string[];
  bindDirection: number;
}) {
  return proxyClient.post<{ code: number; data?: any; msg?: string }>(
    '/accounts/band',
    data,
  );
}
