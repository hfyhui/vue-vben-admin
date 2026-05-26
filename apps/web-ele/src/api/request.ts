/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { ElMessage } from 'element-plus';

import { $t } from '#/locales';
import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
const platformBaseURL = import.meta.env.VITE_GLOB_OTHER_API_URL || '/platform';
const socialBaseURL = import.meta.env.VITE_GLOB_SOCIAL_API_URL || '/social';
const authApiBaseURL = import.meta.env.VITE_GLOB_AUTH_API_URL || '/auth';
const cloudBaseURL = import.meta.env.VITE_GLOB_CLOUD_API_URL || '/cloud';
const customAuthorization = import.meta.env.VITE_GLOB_AUTHORIZATION;
const backendSuccessCodes = new Set([200, 100_000]);

function isUnauthorizedByMessage(msg: unknown) {
  return typeof msg === 'string' && msg === 'UNAUTHORIZED';
}

/**
 * platform/social/auth 等后端约定：HTTP 200 且 body.code === 401，或 HTTP 401，表示登录失效。
 * 与 createRequestClient 中 doReAuthenticate 行为一致（清 token、提示、跳转登录或弹窗）。
 */
async function handleBackendUnauthorized(message?: string) {
  const accessStore = useAccessStore();
  const authStore = useAuthStore();
  accessStore.setAccessToken(null);
  const text = message || $t('authentication.loginAgainSubTitle');
  ElMessage.error(text);
  if (
    preferences.app.loginExpiredMode === 'modal' &&
    accessStore.isAccessChecked
  ) {
    accessStore.setLoginExpired(true);
  } else {
    await authStore.logout();
  }
}

function formatBearerToken(token: null | string) {
  return token ? `Bearer ${token}` : '';
}

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi();
    const newToken = resp.data;
    accessStore.setAccessToken(newToken);
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;

      // 过滤空值参数
      if (config.data && typeof config.data === 'object') {
        const filteredData: any = {};
        Object.keys(config.data).forEach((key) => {
          const value = config.data[key];
          if (value !== null && value !== undefined && value !== '') {
            filteredData[key] = value;
          }
        });
        config.data = filteredData;
      }

      if (config.params && typeof config.params === 'object') {
        const filteredParams: any = {};
        Object.keys(config.params).forEach((key) => {
          const value = config.params[key];
          if (value !== null && value !== undefined && value !== '') {
            filteredParams[key] = value;
          }
        });
        config.params = filteredParams;
      }

      return config;
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // 这里可以根据业务进行定制,你可以拿到 error 内的信息进行定制化处理，根据不同的 code 做不同的提示，而不是直接使用 message.error 提示 msg
      // 当前mock接口返回的错误字段是 error 或者 message
      const responseData = error?.response?.data ?? {};
      const errorMessage = responseData?.error ?? responseData?.message ?? '';
      // 如果没有错误信息，则会根据状态码进行提示
      ElMessage.error(errorMessage || msg);
    }),
  );

  return client;
}

// API 客户端 - 用于 /api 前缀的请求（mock数据）
export const apiClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

function createBackendClient(baseURL: string) {
  const client = new RequestClient({
    baseURL,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
    timeout: 100_000,
  });

  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();
      config.headers = config.headers || {};
      // 与语言切换同步：后端按 Accept-Language 返回文案（zh-CN / zh-TW / en-US）
      config.headers['Accept-Language'] = preferences.app.locale;
      // 优先使用环境变量固定 Authorization；未配置时回退为登录态 token。
      if (customAuthorization) {
        config.headers.Authorization = customAuthorization;
      } else {
        const authToken = formatBearerToken(accessStore.accessToken);
        if (authToken) {
          config.headers.Authorization = authToken;
        }
      }

      // 过滤空值参数，但保留 FormData 对象
      if (
        config.data &&
        typeof config.data === 'object' &&
        !(config.data instanceof FormData)
      ) {
        const filteredData: any = {};
        Object.keys(config.data).forEach((key) => {
          const value = config.data[key];
          if (value !== null && value !== undefined && value !== '') {
            filteredData[key] = value;
          }
        });
        config.data = filteredData;
      }

      if (config.params && typeof config.params === 'object') {
        const filteredParams: any = {};
        Object.keys(config.params).forEach((key) => {
          const value = config.params[key];
          if (value !== null && value !== undefined && value !== '') {
            filteredParams[key] = value;
          }
        });
        config.params = filteredParams;
      }

      return config;
    },
  });

  client.addResponseInterceptor({
    fulfilled: async (response) => {
      const { data: responseData, status } = response;
      if (status >= 200 && status < 400) {
        // 检查响应数据中的code字段
        if (
          responseData &&
          typeof responseData === 'object' &&
          'code' in responseData
        ) {
          const { code, msg } = responseData;
          if (backendSuccessCodes.has(code)) {
            return responseData;
          }
          // 业务码 401，或 msg=UNAUTHORIZED：登录状态过期（HTTP 可能仍为 200/500）
          if (code === 401 || isUnauthorizedByMessage(msg)) {
            const tip = typeof msg === 'string' && msg ? msg : undefined;
            await handleBackendUnauthorized(tip);
            throw Object.assign(new Error(tip || 'Unauthorized'), {
              response,
              isBusiness401: true,
            });
          }
          // POST /platform/asset/check/account-device：500511 由关联中心二次确认，不在此自动 toast
          const reqUrl = response.config?.url ?? '';
          const isAccountDeviceCheck = reqUrl.includes('check/account-device');
          const needConfirmCode = code === 500_511;
          if (msg && !(isAccountDeviceCheck && needConfirmCode)) {
            ElMessage.error(msg);
          }
          return responseData;
        }
        return responseData;
      }

      return response;
    },
    rejected: async (error) => {
      const status = error?.response?.status;
      const data = error?.response?.data;
      if (status === 401) {
        const tip =
          (typeof data?.msg === 'string' && data.msg) ||
          (typeof data?.message === 'string' && data.message) ||
          undefined;
        await handleBackendUnauthorized(tip);
        throw error;
      }
      const errorMessage =
        data?.msg || data?.message || error?.message || '网络请求失败';
      ElMessage.error(errorMessage);
      throw error;
    },
  });

  return client;
}

// Admin 客户端 - 用于 /platform 前缀的请求（真实后端）
export const proxyClient = createBackendClient(platformBaseURL);

// Social 客户端 - 用于 /social 前缀的请求（MCC）
export const socialClient = createBackendClient(socialBaseURL);

// Auth 客户端 - 仅用于登录/用户信息，避免影响其他 /social 接口
export const authClient = createBackendClient(authApiBaseURL);

export const cloudClient = createBackendClient(cloudBaseURL);
// 保持向后兼容
export const requestClient = apiClient;

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
baseRequestClient.addRequestInterceptor({
  fulfilled: async (config) => {
    config.headers = config.headers || {};
    config.headers['Accept-Language'] = preferences.app.locale;
    return config;
  },
});
