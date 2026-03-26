<script lang="ts" setup>
import { computed, ref } from 'vue';

import { Plus } from '@element-plus/icons-vue';

const props = withDefaults(
  defineProps<{
    modelValue?: Record<string, any>[];
  }>(),
  {
    modelValue: () => [],
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>[]): void;
}>();

const selectedIndex = ref(0);

const columns = computed<Record<string, any>[]>({
  get() {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  },
  set(value) {
    emit('update:modelValue', Array.isArray(value) ? value : []);
  },
});

const selectedItem = computed<Record<string, any> | null>(() => {
  if (!Array.isArray(columns.value)) return null;
  if (columns.value.length === 0) return null;
  if (selectedIndex.value < 0 || selectedIndex.value >= columns.value.length) return null;
  return columns.value[selectedIndex.value];
});

function addField() {
  const index = Array.isArray(columns.value) ? columns.value.length + 1 : 1;
  const next = Array.isArray(columns.value) ? [...columns.value] : [];
  next.push({
    label: `字段${index}`,
    prop: `field_${index}`,
    type: 'input',
    show: true,
    required: false,
  });
  columns.value = next;
  selectedIndex.value = next.length - 1;
}

function removeField(index: number) {
  if (!Array.isArray(columns.value)) return;
  const next = [...columns.value];
  next.splice(index, 1);
  columns.value = next;
  if (selectedIndex.value >= next.length) {
    selectedIndex.value = next.length - 1;
  }
  if (selectedIndex.value < 0) {
    selectedIndex.value = 0;
  }
}
</script>

<template>
  <div class="form-tab">
    <div class="left-panel">
      <div
        v-for="(item, index) in columns"
        :key="item.prop ? item.prop : index"
        :class="['field-item', { active: index === selectedIndex }]"
        @click="selectedIndex = index"
      >
        <span class="field-text">{{ item.label }}</span>
        <el-button link type="danger" @click.stop="removeField(index)">删除</el-button>
      </div>
      <el-button class="add-btn" @click="addField">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>

    <div class="right-panel">
      <template v-if="selectedItem">
        <el-form label-width="90px">
          <el-form-item label="控件名称">
            <el-input v-model="selectedItem.label" />
          </el-form-item>
          <el-form-item label="参数名称">
            <el-input v-model="selectedItem.prop" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="selectedItem.type" style="width: 100%">
              <el-option label="输入框" value="input" />
              <el-option label="下拉框" value="select" />
              <el-option label="数字框" value="inputNumber" />
              <el-option label="多行文本" value="textarea" />
              <el-option label="上传图片" value="uploadImg" />
              <el-option label="上传文件" value="uploadFile" />
            </el-select>
          </el-form-item>
          <el-form-item label="必填">
            <el-switch v-model="selectedItem.required" />
          </el-form-item>
        </el-form>
      </template>
      <div v-else class="empty-text">请先新增字段</div>
    </div>
  </div>
</template>

<style scoped>
.form-tab {
  display: flex;
  gap: 16px;
}

.left-panel {
  width: 280px;
  border-right: 1px solid var(--el-border-color);
  padding-right: 12px;
}

.field-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 10px;
  cursor: pointer;
}

.field-item.active {
  border-color: var(--el-color-primary);
}

.field-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-btn {
  width: 100%;
}

.right-panel {
  flex: 1;
}

.empty-text {
  color: var(--el-text-color-secondary);
}
</style>
