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

import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

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

// Admin 客户端 - 用于 /admin 前缀的请求（真实后端）
export const proxyClient = new RequestClient({
  baseURL: '/platform', // 使用代理路径
  headers: {
    'Content-Type': 'application/json;charset=utf-8',
  },
  timeout: 10_000,
});

// 为 proxyClient 添加请求拦截器，过滤空值参数
proxyClient.addRequestInterceptor({
  fulfilled: async (config) => {
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

// 为 proxyClient 添加响应拦截器，统一处理错误码
proxyClient.addResponseInterceptor({
  fulfilled: (response) => {
    const { data: responseData, status } = response;
    console.log('response',response)
    
    if (status >= 200 && status < 400) {
      // 检查响应数据中的code字段
      if (responseData && typeof responseData === 'object' && 'code' in responseData) {
        const { code, msg } = responseData;
        // 100000表示成功
        if (code === 100000) {
          return responseData;
        }
        ElMessage.error(msg);
        // 抛出错误，让调用方处理
        return Promise.reject(responseData);
      }
      // 如果没有code字段，直接返回数据
      return responseData;
    }
    
    return response;
  },
  rejected: (error) => {
    // 处理网络错误等异常情况
    const errorMessage = error?.response?.data?.msg || '网络请求失败';
    ElMessage.error(errorMessage);
    return Promise.reject(error);
  },
});

// 保持向后兼容
export const requestClient = apiClient;

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
