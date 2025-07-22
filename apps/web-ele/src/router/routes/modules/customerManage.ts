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
