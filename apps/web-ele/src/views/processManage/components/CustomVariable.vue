<script setup lang="ts">
import { computed } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';

import { useProcessVisualStore } from '#/store/modules/processVisual';
import type { VariableData } from '../types';

const props = defineProps<{
  search: string;
  processType?: string;
  selectedItemId?: string;
}>();

const emit = defineEmits<{
  (e: 'clear'): void;
  (e: 'click-drag', variable: VariableData): void;
}>();

const processVisualStore = useProcessVisualStore();
const { variables } = storeToRefs(processVisualStore);

const filteredVariables = computed(() => {
  if (!props.search) return variables.value;
  const q = props.search.toLowerCase();
  return variables.value.filter(
    (v: VariableData) =>
      v.name.toLowerCase().includes(q) ||
      (v.dataType || '').toLowerCase().includes(q),
  );
});

function onClickVariable(variable: VariableData) {
  processVisualStore.setActiveInfo({ type: 'variable', id: variable.id, data: variable });
  emit('click-drag', variable);
}

function onRefresh() {
  // Trigger variable refresh — parent will handle API call
  emit('clear');
}

function onDragStart(variable: VariableData, e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', JSON.stringify(variable));
    e.dataTransfer.effectAllowed = 'copy';
  }
  onClickVariable(variable);
}

function getDataTypeTag(dt: string): 'success' | 'warning' | 'info' | 'danger' | '' {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger' | ''> = {
    string: '',
    number: 'warning',
    bool: 'success',
    array: 'danger',
    object: 'info',
    date: '',
    password: 'danger',
  };
  return map[dt] || '';
}
</script>

<template>
  <div class="custom-variable">
    <div class="var-actions">
      <el-button size="small" text @click="onRefresh">
        <el-icon><Refresh /></el-icon>
      </el-button>
    </div>

    <div
      v-for="variable in filteredVariables"
      :key="variable.id"
      class="var-item"
      :class="{ selected: selectedItemId === variable.id }"
      draggable="true"
      @dragstart="onDragStart(variable, $event)"
      @click="onClickVariable(variable)"
    >
      <span class="var-name">{{ variable.name }}</span>
      <el-tag :type="getDataTypeTag(variable.dataType)" size="small" class="var-tag">
        {{ variable.dataType }}
      </el-tag>
    </div>

    <div v-if="filteredVariables.length === 0" class="empty-hint">
      {{ search ? '无匹配变量' : '暂无变量，点击刷新加载' }}
    </div>
  </div>
</template>

<style scoped>
.custom-variable {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
}

.var-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 4px 4px;
}

.var-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
}

.var-item:hover {
  background: #f0f2f5;
}

.var-item.selected {
  background: #ecf5ff;
  color: #176ac5;
}

.var-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}

.var-tag {
  flex-shrink: 0;
  margin-left: 8px;
}

.empty-hint {
  padding: 12px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>
