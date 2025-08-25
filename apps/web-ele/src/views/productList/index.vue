<!--
 * @Author: 小妹 cuiling.liu@callfanai.com
 * @Date: 2025-07-31 16:07:34
 * @LastEditors: 小妹 cuiling.liu@callfanai.com
 * @LastEditTime: 2025-08-14 17:07:29
 * @FilePath: \workSpace\vben-web\apps\web-ele\src\views\productList\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { getProductTreeApi, syncSsoAppApi } from '#/api/core/license';
import { $t } from '#/locales';
import { ElMessage, ElMessageBox } from 'element-plus';

interface ProductTreeItem {
  menuId: string;
  menuName: string;
  parentId: string;
  hierarchy: number;
  children: ProductTreeItem[];
}

const data = ref<ProductTreeItem[]>([]);
const loading = ref(false);
const syncLoading = ref(false);

// 获取产品清单树形结构
async function fetchProductTree() {
  try {
    loading.value = true;
    const productTree = await getProductTreeApi();
    data.value = productTree;
  } catch {
    ElMessage.error('获取产品清单失败');
  } finally {
    loading.value = false;
  }
}

// 同步 SSO 应用
async function handleSync() {
  try {
    syncLoading.value = true;
    const success = await syncSsoAppApi();
    console.log('success', success);
    if (success) {
      ElMessage.success('同步 SSO 应用成功');
      await fetchProductTree();
    } else {
      ElMessage.error('同步 SSO 应用失败');
    }
  } catch {
    ElMessage.error('同步失败');
  } finally {
    syncLoading.value = false;
  }
}

// 组件挂载时获取产品清单
onMounted(() => {
  fetchProductTree();
});
</script>

<template>
  <div style="padding: 24px">
    <el-button
      type="primary"
      :loading="syncLoading"
      @click="handleSync"
      style="margin-bottom: 16px"
    >
      {{ $t('productList.sync') }}
    </el-button>

    <el-card v-loading="loading">
      <template #header>
        <span>产品清单</span>
      </template>

      <el-tree
        v-if="data.length > 0"
        :data="data"
        node-key="menuId"
        default-expand-all
        :expand-on-click-node="false"
        highlight-current
        style="width: 100%"
      >
        <template #default="{ data: treeData }">
          <span>{{ treeData.menuName }}</span>
        </template>
      </el-tree>

      <el-empty v-else description="暂无产品数据" />
    </el-card>
  </div>
</template>

<style scoped>
.mt-4 {
  margin-top: 16px;
}
</style>
