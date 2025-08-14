/*
 * @Author: 小妹 cuiling.liu@callfanai.com
 * @Date: 2025-08-12 15:23:19
 * @LastEditors: 小妹 cuiling.liu@callfanai.com
 * @LastEditTime: 2025-08-14 14:27:01
 * @FilePath: \workSpace\callfans-platform-admin\apps\web-ele\src\router\routes\modules\customerManage.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'CustomerManage',
    path: '/customerManage',
    component: () => import('#/views/customerManage/index.vue'),
    meta: {
      icon: 'lucide:copyright',
      title: $t('page.dashboard.customerManage'),
      order: 9999,
    },
  },
  {
    name: 'LicenseManage',
    path: '/licenseManage',
    component: () => import('#/views/licenseManage/index.vue'),
    meta: {
      icon: 'lucide:copyright',
      title: $t('page.dashboard.licenseManage'),
      order: 9999,
    },
  },
  {
    name: 'ProductList',
    path: '/productList',
    component: () => import('#/views/productList/index.vue'),
    meta: {
      icon: 'lucide:copyright',
      title: $t('page.dashboard.productList'),
      order: 9999,
    },
  },
];

export default routes;
