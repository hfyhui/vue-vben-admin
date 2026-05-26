<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { getRpaComponents } from '#/api/core/processManage';

const props = defineProps<{
  search: string;
}>();

const emit = defineEmits<{
  (e: 'drag-start', node: any, evt: DragEvent): void;
}>();

interface TreeNode {
  fullName: string;
  title: string;
  description?: string;
  cls?: { color?: string; icon?: string };
  children?: TreeNode[];
  [key: string]: any;
}

const treeData = ref<TreeNode[]>([]);
const defaultExpandedKeys = ref<string[]>([]);
const savaPackageData = ref<TreeNode[]>([]);

// Fallback when API fails
const fallbackNodes: TreeNode[] = [
  { fullName: 'start', title: '开始', cls: { color: '#67c23a' } },
  { fullName: 'end', title: '结束', cls: { color: '#f56c6c' } },
  { fullName: 'action', title: '操作', cls: { color: '#176ac5' } },
  { fullName: 'condition', title: '条件', cls: { color: '#e6a23c' } },
  { fullName: 'loop', title: '循环', cls: { color: '#909399' } },
  { fullName: 'sleep', title: '等待', cls: { color: '#909399' } },
];

// Recursive tree search — matches source foundSelected()
function foundSelected(key: string, list: TreeNode[], keyField = 'fullName'): TreeNode | null {
  for (const node of list) {
    if (node.children && node.children.length > 0) {
      const result = foundSelected(key, node.children, keyField);
      if (result) return result;
    }
    if ((node as any)[keyField] === key) return node;
  }
  return null;
}

async function loadComponents(search = '', isFirst = false) {
  try {
    const res: any = await getRpaComponents({ title: search });
    const data = Array.isArray(res) ? res : res?.data || res?.results || [];
    treeData.value = data;
    if (isFirst) savaPackageData.value = JSON.parse(JSON.stringify(data));
  } catch {
    if (treeData.value.length === 0) treeData.value = fallbackNodes;
  }
}

// Drag start — pass FULL original node data
function onTreeDragStart(node: TreeNode, e: DragEvent) {
  // Only leaf nodes can be dragged
  if (node.children && node.children.length > 0) return;
  // Find the complete node from saved tree data
  const full = foundSelected(node.fullName, savaPackageData.value) || node;
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', JSON.stringify(full));
    e.dataTransfer.effectAllowed = 'copy';
  }
  emit('drag-start', full, e);
}

onMounted(() => loadComponents('', true));
watch(() => props.search, (val) => loadComponents(val));
</script>

<template>
  <div class="node-menu">
    <el-tree
      v-if="treeData.length > 0"
      :data="treeData"
      :props="{ children: 'children', label: 'title' }"
      :default-expanded-keys="defaultExpandedKeys"
      node-key="fullName"
      :expand-on-click-node="true"
    >
      <template #default="{ data }">
        <el-tooltip
          v-if="data.description"
          :content="data.description"
          placement="left"
          :show-after="500"
        >
          <div class="tree-node-row" :draggable="!data.children?.length" @dragstart="onTreeDragStart(data, $event); $event.stopPropagation()">
            <span class="node-icon-block" :style="{ backgroundColor: data.cls?.color || '#176ac5' }">
              <span v-if="data.cls?.icon" :class="['fanxi', data.cls.icon]" class="icon-font" />
            </span>
            <span class="node-label">{{ data.title }}</span>
          </div>
        </el-tooltip>
        <div v-else class="tree-node-row" :draggable="!data.children?.length" @dragstart="onTreeDragStart(data, $event); $event.stopPropagation()">
          <span class="node-icon-block" :style="{ backgroundColor: data.cls?.color || '#176ac5' }">
            <span v-if="data.cls?.icon" :class="['fanxi', data.cls.icon]" class="icon-font" />
          </span>
          <span class="node-label">{{ data.title }}</span>
        </div>
      </template>
    </el-tree>

    <!-- Flat fallback -->
    <div v-else>
      <div
        v-for="node in fallbackNodes"
        :key="node.fullName"
        class="node-item"
        draggable="true"
        @dragstart="onTreeDragStart(node, $event)"
      >
        <span class="node-icon-block" :style="{ backgroundColor: node.cls?.color || '#176ac5' }" />
        <span class="node-label">{{ node.title }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-menu {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  user-select: none;
}

:deep(.el-tree) { background: transparent; }
:deep(.el-tree-node__content) { height: 32px; padding: 0 8px; }
:deep(.el-tree-node__content:hover) { background: #f0f2f5; }

.tree-node-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  font-size: 13px;
  cursor: grab;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: grab;
  font-size: 13px;
}
.node-item:hover { background: #f0f2f5; }
.node-item:active { cursor: grabbing; opacity: 0.5; }
.tree-node-row:active { opacity: 0.5; }

.node-icon-block {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  flex-shrink: 0;
}

.icon-font {
  font-size: 10px;
  color: #fff;
}

.node-label {
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
</style>
