<script setup lang="ts">
import { ref } from 'vue';

import { syncProduct } from '#/api/core/product';
import { $t } from '#/locales';

declare global {
  const ElMessage: any;
}

const data = ref([
  {
    label: 'SSO认证授权系统',
    children: [
      { label: '设备管理' },
      { label: '社媒中心' },
      { label: '应用管理' },
      { label: '内容菜单' },
      { label: '计划管理' },
      { label: '系统管理' },
      { label: '项目切换按钮' },
    ],
  },
  {
    label: 'mcc',
    children: [{ label: '大屏' }, { label: '站点管理' }],
  },
  { label: 'rpa' },
  { label: 'social' },
]);

const loading = ref(false);

async function handleSync() {
  loading.value = true;
  const res = await syncProduct();
  loading.value = false;
  if (res.success) {
    ElMessage.success(res.message);
  } else {
    ElMessage.error(res.message);
  }
}
</script>

<template>
  <div style="padding: 24px">
    <el-button type="primary" :loading="loading" @click="handleSync">
      {{ $t('productList.sync') }}
    </el-button>
    <el-tree
      :data="data"
      node-key="label"
      default-expand-all
      :expand-on-click-node="false"
      highlight-current
      style="width: 300px; margin-top: 16px"
    />
  </div>
</template>

<style scoped>
.mt-4 {
  margin-top: 16px;
}
</style>
