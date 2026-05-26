<script setup lang="ts">
import { ref } from 'vue';
import { DArrowLeft, DArrowRight } from '@element-plus/icons-vue';

import CustomVariable from './CustomVariable.vue';
import NodeMenu from './NodeMenu.vue';

const props = defineProps<{
  processType?: string;
}>();

const emit = defineEmits<{
  (e: 'collapse', val: boolean): void;
}>();

const search = ref('');
const currentTab = ref('node');
const showCollapse = ref(false);
const isCollapse = ref(false);

function onCollapse(val: boolean) {
  emit('collapse', val);
  isCollapse.value = val;
}
</script>

<template>
  <div class="sidebar-wrapper" @mouseover="showCollapse = true" @mouseout="showCollapse = false">
    <!-- Collapse button — always visible when expanded -->
    <div
      v-show="!isCollapse"
      class="collapse-btn collapse-left"
      @click="onCollapse(true)"
    >
      <el-icon><DArrowLeft /></el-icon>
    </div>
    <!-- Expand button — always visible when collapsed -->
    <div
      v-show="isCollapse"
      class="collapse-btn collapse-right"
      @click="onCollapse(false)"
    >
      <el-icon><DArrowRight /></el-icon>
    </div>

    <div class="sidebar-container">
      <!-- Search -->
      <div class="search-area">
        <el-input v-model="search" placeholder="搜索" size="small" clearable />
      </div>

      <!-- Tabs -->
      <el-tabs v-model="currentTab" class="sidebar-tabs">
        <el-tab-pane label="组件" name="node">
          <NodeMenu :search="search" />
        </el-tab-pane>
        <el-tab-pane label="变量" name="custom">
          <CustomVariable :search="search" :process-type="processType" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.sidebar-wrapper {
  height: 100%;
  position: relative;
}

.sidebar-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  padding: 12px 10px;
  box-sizing: border-box;
  overflow: hidden;
}

.search-area {
  margin-bottom: 8px;
}

.sidebar-tabs {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
}

.sidebar-tabs :deep(.el-tabs__header) {
  margin-bottom: 4px;
}

.collapse-btn {
  position: absolute;
  top: 30%;
  z-index: 20;
  width: 16px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(210 213 221 / 50%);
  cursor: pointer;
  font-size: 10px;
  color: #fff;
  border-radius: 2px;
  transition: background 0.2s;
}

.collapse-btn:hover {
  background: rgb(210 213 221 / 80%);
}

.collapse-left {
  right: -16px;
}

.collapse-right {
  right: -16px;
}
</style>
