import type { UserInfo } from '@vben/types';

import { noPrefixClient } from '#/api/request';

interface BackendUserInfoResponse {
  data?: Record<string, any> | null;
  permissions?: string[];
  roles?: string[];
  user?: Record<string, any>;
}

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const response = await noPrefixClient.get<BackendUserInfoResponse>(
    '/auth/getInfo/',
  );
  const rawUser = (response?.user ?? {}) as Record<string, any>;

  const mappedUser: UserInfo = {
    ...rawUser,
    // 对齐前端 UserInfo 常用字段
    avatar: rawUser.avatar || '',
    desc: rawUser.email || rawUser.remark || '',
    homePath: rawUser.homePath || '/',
    realName: rawUser.nickName || '',
    roles: response.roles || [],
    token: rawUser.token || '',
    userId: rawUser.userId,
    username: rawUser.userName || '',
  };

  return mappedUser;
}
