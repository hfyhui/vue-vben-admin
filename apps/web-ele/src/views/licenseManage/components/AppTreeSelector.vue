<script setup lang="ts">
import type { ProductTreeItem } from '../../../api/core/license';

import { onMounted, ref, watch } from 'vue';

import { ElMessage } from 'element-plus';

import { getProductTreeApi, syncSsoAppApi } from '../../../api/core/license';

const props = defineProps<{ modelValue?: Record<string, string> }>();
const emit = defineEmits(['update:modelValue']);

const treeData = ref<ProductTreeItem[]>([]);
const loading = ref(false);

const checked = ref<string[]>([]);
const checkedMap = ref<Record<string, string>>(props.modelValue || {});

watch(
  () => props.modelValue,
  (v) => {
    checkedMap.value = v || {};
    // 将对象格式转换为数组格式用于树形组件的选中状态
    checked.value = Object.keys(checkedMap.value);
  },
);

// 获取产品清单数据
async function fetchProductTree() {
  loading.value = true;
  try {
    const data = await getProductTreeApi();
    // 将接口返回的数据转换为树形组件需要的格式
    treeData.value = transformTreeData(data);
  } catch {
    ElMessage.error('获取产品清单失败');
  } finally {
    loading.value = false;
  }
}

// 转换树形数据格式
function transformTreeData(data: ProductTreeItem[]): ProductTreeItem[] {
  return data.map((item) => ({
    ...item,
    children: item.children ? transformTreeData(item.children) : [],
  }));
}

// 组件挂载时获取产品清单
onMounted(() => {
  fetchProductTree();
});

function onChange(
  data: any,
  { checkedNodes }: { checkedNodes: any[] },
) {
  // 将选中的节点转换为对象格式
  const featuresMap: Record<string, string> = {};

  checkedNodes.forEach((node) => {
    if (node.menuId && node.menuName) {
      featuresMap[node.menuId] = node.menuName;
    }
  });

  checkedMap.value = featuresMap;
  emit('update:modelValue', featuresMap);
}

async function handleSync() {
  try {
    // 调用同步 SSO 应用接口
    const success = await syncSsoAppApi();
    if (success) {
      ElMessage.success('SSO 应用同步成功');
      // 同步成功后重新获取产品清单数据
      await fetchProductTree();
    } else {
      ElMessage.error('SSO 应用同步失败');
    }
  } catch {
    ElMessage.error('SSO 应用同步失败');
  }
}
</script>

<template>
  <div class="app-tree-selector">
    <div class="tree-header">
      <el-button
        type="primary"
        size="small"
        :loading="loading"
        @click="handleSync"
      >
        同步
      </el-button>
    </div>

    <el-tree
      v-loading="loading"
      :data="treeData"
      show-checkbox
      node-key="menuId"
      :default-checked-keys="checked"
      :props="{ label: 'menuName', children: 'children' }"
      @check="onChange"
      style="width: 100%"
      empty-text="暂无产品数据"
    />
  </div>
</template>

<style scoped>
.app-tree-selector {
  width: 100%;
}

.tree-header {
  padding-left: 28px;
}

.title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.el-tree {
  padding: 8px;
}
</style>
