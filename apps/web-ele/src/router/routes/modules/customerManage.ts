import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'CustomerManage',
    path: '/customerManage',
    component: () => import('#/views/customerManage/index.vue'),
    meta: {
      icon: 'lucide:users',
      title: $t('page.dashboard.customerManage'),
      order: 9999,
    },
  },
  {
    name: 'LicenseManage',
    path: '/licenseManage',
    component: () => import('#/views/licenseManage/index.vue'),
    meta: {
      icon: 'lucide:key-round',
      title: $t('page.dashboard.licenseManage'),
      order: 9999,
    },
  },
  {
    name: 'ProductList',
    path: '/productList',
    component: () => import('#/views/productList/index.vue'),
    meta: {
      icon: 'lucide:package',
      title: $t('page.dashboard.productList'),
      order: 9999,
    },
  },
  {
    name: 'AssociationCenter',
    path: '/associationCenter',
    redirect: '/associationCenter/associationConfig',
    component: () => import('#/views/associationCenter/layout.vue'),
    meta: {
      icon: 'lucide:link-2',
      title: $t('page.dashboard.associationCenter'),
      order: 9999,
    },
    children: [
      {
        name: 'AssociationConfig',
        path: 'associationConfig',
        component: () => import('#/views/associationCenter/index.vue'),
        meta: {
          title: $t('page.dashboard.associationConfig'),
          order: 1,
        },
      },
    ],
  },
  {
    name: 'AssetManage',
    path: '/assetManage',
    redirect: '/assetManage/accountPool',
    component: () => import('#/views/assetManage/index.vue'),
    meta: {
      icon: 'lucide:layers',
      title: $t('page.dashboard.assetManage'),
      order: 9999,
    },
    children: [
      {
        name: 'AccountPool',
        path: 'accountPool',
        component: () => import('#/views/accountPool/index.vue'),
        meta: {
          title: $t('page.dashboard.accountPool'),
          order: 1,
        },
      },
      {
        name: 'ProxyPool',
        path: 'proxyPool',
        component: () => import('#/views/proxyPool/index.vue'),
        meta: {
          title: $t('page.dashboard.proxyPool'),
          order: 2,
        },
      },
      {
        name: 'ContainerPool',
        path: 'containerPool',
        component: () => import('#/views/containerPool/index.vue'),
        meta: {
          title: $t('page.dashboard.containerPool'),
          order: 3,
        },
      },
    ],
  },
  {
    name: 'AccountPoolLegacy',
    path: '/accountPool',
    redirect: '/assetManage/accountPool',
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      title: $t('page.dashboard.accountPool'),
    },
  },
  {
    name: 'ProxyPoolLegacy',
    path: '/proxyPool',
    redirect: '/assetManage/proxyPool',
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      title: $t('page.dashboard.proxyPool'),
    },
  },
  {
    name: 'ContainerPoolLegacy',
    path: '/containerPool',
    redirect: '/assetManage/containerPool',
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      title: $t('page.dashboard.containerPool'),
    },
  },
  {
    name: 'ApplicationManage',
    path: '/applicationManage',
    component: () => import('#/views/applicationManage/index.vue'),
    meta: {
      icon: 'lucide:layout-grid',
      title: $t('page.dashboard.applicationManage'),
      order: 9999,
    },
  },
  {
    name: 'ApplicationSystemManage',
    path: '/applicationSystem',
    redirect: '/applicationSystem/groupManage',
    component: () => import('#/views/systemManage/layout.vue'),
    meta: {
      icon: 'lucide:settings',
      title: $t('page.dashboard.systemManage'),
      order: 10000,
    },
    children: [
      {
        name: 'GroupManage',
        path: 'groupManage',
        component: () => import('#/views/systemManage/groupManage/index.vue'),
        meta: {
          title: $t('page.dashboard.groupManage'),
          order: 1,
        },
      },
      {
        name: 'ApplicationSystemUserManage',
        path: 'userManage',
        redirect: '/applicationSystem/userManage/socialMediaAccount',
        component: () => import('#/views/systemManage/layout.vue'),
        meta: {
          title: $t('page.dashboard.userManage'),
          order: 2,
        },
        children: [
          {
            name: 'SocialMediaAccountManage',
            path: 'socialMediaAccount',
            component: () => import('#/views/systemManage/socialMediaAccount/index.vue'),
            meta: {
              title: $t('page.dashboard.socialMediaAccount'),
              order: 1,
            },
          },
          {
            name: 'ApplicationSystemProxyManage',
            path: 'proxyManage',
            component: () => import('#/views/systemManage/proxyManage/index.vue'),
            meta: {
              title: $t('page.dashboard.proxyManage'),
              order: 2,
            },
          },
          {
            name: 'ApplicationSystemContainerResourceManage',
            path: 'containerResourceManage',
            component: () => import('#/views/systemManage/containerResourceManage/index.vue'),
            meta: {
              title: $t('page.dashboard.containerResourceManage'),
              order: 3,
            },
          },
        ],
      },
    ],
  },
  // {
  //   name: 'DemosPage',
  //   path: '/demos/page',
  //   component: () => import('#/views/demos/page/index.vue'),
  //   meta: {
  //     icon: 'lucide:file-code',
  //     title: 'Demo',
  //     order: 9999,
  //   },
  // },
];

export default routes;
