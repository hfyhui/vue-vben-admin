<script lang="ts" setup>
import { computed, ref } from 'vue';

import { ElMessage } from 'element-plus';

const props = withDefaults(
  defineProps<{
    modelValue?: Record<string, any>[];
    baseColumns?: Record<string, any>[];
  }>(),
  {
    modelValue: () => [],
    baseColumns: () => [],
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>[]): void;
}>();

const selectedProp = ref('');

const extColumns = computed<Record<string, any>[]>({
  get() {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  },
  set(value) {
    emit('update:modelValue', Array.isArray(value) ? value : []);
  },
});

const canAddOptions = computed(() => {
  const extProps = new Set(
    extColumns.value.map((item) => (item && item.prop ? String(item.prop) : '')),
  );
  return (Array.isArray(props.baseColumns) ? props.baseColumns : []).filter((item) => {
    const prop = item && item.prop ? String(item.prop) : '';
    if (!prop) return false;
    return !extProps.has(prop);
  });
});

function addEvent() {
  if (!selectedProp.value) return;
  const source = canAddOptions.value.find(
    (item) => String(item.prop) === String(selectedProp.value),
  );
  if (!source) {
    ElMessage.warning('请选择可添加的字段');
    return;
  }
  const next = [...extColumns.value];
  next.push({
    ...source,
    status: 'enable',
  });
  extColumns.value = next;
  selectedProp.value = '';
}

function removeEvent(index: number) {
  const next = [...extColumns.value];
  next.splice(index, 1);
  extColumns.value = next;
}

function toggleStatus(item: Record<string, any>) {
  const status = item.status === 'disable' ? 'enable' : 'disable';
  item.status = status;
}
</script>

<template>
  <div>
    <div class="header">
      <el-select
        v-model="selectedProp"
        placeholder="请选择字段"
        filterable
        clearable
        style="width: 500px"
      >
        <el-option
          v-for="item in canAddOptions"
          :key="String(item.prop)"
          :label="String(item.label || item.prop)"
          :value="String(item.prop)"
        />
      </el-select>
      <el-button type="primary" @click="addEvent">新增</el-button>
    </div>

    <div class="columns-box">
      <div
        v-for="(item, index) in extColumns"
        :key="String(item.prop || index)"
        :class="['columns-item', { disabled: item.status === 'disable' }]"
      >
        <p class="item-header">
          <el-tag type="primary">{{ item.prop }}</el-tag>
          <span>
            <el-button link @click="toggleStatus(item)">
              {{ item.status === 'disable' ? '启用' : '禁用' }}
            </el-button>
            <el-button link type="danger" @click="removeEvent(index)">删除</el-button>
          </span>
        </p>
        <span class="label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.columns-box {
  margin-top: 20px;
  width: 100%;
  display: flex;
  overflow-x: auto;
  line-height: 1.5;
}

.columns-item {
  flex-shrink: 0;
  padding: 8px 10px;
  min-width: 170px;
  border: 1px solid rgb(0 0 0 / 25%);
  border-right: none;
}

.columns-item:last-child {
  border-right: 1px solid rgb(0 0 0 / 25%);
}

.columns-item.disabled {
  background-color: rgb(0 0 0 / 6%);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.label {
  display: inline-block;
  width: 100%;
}
</style>
