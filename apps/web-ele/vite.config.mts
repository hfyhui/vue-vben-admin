/*
 * @Author: 小妹 cuiling.liu@callfanai.com
 * @Date: 2026-03-30 09:53:07
 * @LastEditors: 小妹 cuiling.liu@callfanai.com
 * @LastEditTime: 2026-03-30 10:24:59
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from '@vben/vite-config';

import ElementPlus from 'unplugin-element-plus/vite';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [
        ElementPlus({
          format: 'esm',
        }),
      ],
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            target: 'http://localhost:5320/api',
            ws: true,
          },
          '/platform': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/platform/, 'platform'),
            // 后端接口代理地址
            // target: 'http://10.0.2.212:8899',  // 开
            target: 'http://172.25.1.213:8899', // 测试
            ws: true,
          },
          '/auth': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/auth/, 'auth'),
            // 登录/用户信息接口代理，测试环境
            target: 'https://test.callfansai.cn',
            secure: false,
            ws: true,
          },
          '/social': {
            changeOrigin: true,
            // 应用管理 MCC 接口代理，测试环境
            target: 'https://test.callfansai.cn',
            secure: false,
            rewrite: (path) => path.replace(/^\/social/, 'social'),
            ws: true,
          },
          '/cloud': {
            changeOrigin: true,
            // 应用管理 MCC 接口代理，测试环境
            target: 'https://test.callfansai.cn',
            secure: false,
            rewrite: (path) => path.replace(/^\/cloud/, ''),
            ws: true,
          },
        },
      },
    },
  };
});
