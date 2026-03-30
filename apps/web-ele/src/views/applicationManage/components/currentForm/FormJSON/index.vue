<script lang="ts" setup>
import { computed, ref } from 'vue';

import { ElMessage } from 'element-plus';

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

const isEdit = ref(false);
const textJSON = ref('');
const formattedJson = ref('');
const errorMessage = ref('');

const currentValue = computed<Record<string, any>[]>({
  get() {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  },
  set(value) {
    emit('update:modelValue', Array.isArray(value) ? value : []);
  },
});

const displayText = computed(() => {
  return currentValue.value.length ? String(currentValue.value) : '';
});

function openEditEvent(type: boolean) {
  if (type) {
    textJSON.value = JSON.stringify(currentValue.value, null, 2);
  } else {
    textJSON.value = '';
  }
  isEdit.value = type;
  errorMessage.value = '';
  formattedJson.value = '';
}

function hasDuplicateLabelOrProp(list: Record<string, any>[]) {
  const labelSet = new Set<string>();
  const propSet = new Set<string>();
  for (const item of list) {
    const label = item && item.label ? String(item.label) : '';
    const prop = item && item.prop ? String(item.prop) : '';
    if (label && labelSet.has(label)) return true;
    if (prop && propSet.has(prop)) return true;
    if (label) labelSet.add(label);
    if (prop) propSet.add(prop);
  }
  return false;
}

function formatJSON(type: 'format' | 'save') {
  try {
    if (!textJSON.value) {
      if (type === 'save') {
        currentValue.value = [];
        isEdit.value = false;
      }
      return;
    }
    const parsed = JSON.parse(textJSON.value);
    if (!Array.isArray(parsed)) {
      ElMessage.error('JSON 必须是数组');
      return;
    }
    formattedJson.value = JSON.stringify(parsed, null, 2);
    errorMessage.value = '';
    if (type === 'save') {
      if (hasDuplicateLabelOrProp(parsed)) {
        ElMessage.error('保存失败：控件名称或参数名称重复');
        return;
      }
      currentValue.value = parsed;
      isEdit.value = false;
      ElMessage.success('保存成功');
    }
  } catch (error: any) {
    formattedJson.value = '';
    errorMessage.value = error && error.message ? error.message : 'JSON 格式错误';
    ElMessage.error('JSON 格式错误');
  }
}
</script>

<template>
  <div>
    <template v-if="isEdit">
      <div class="btn-box">
        <el-button @click="openEditEvent(false)">取消</el-button>
        <el-button type="primary" @click="formatJSON('format')">格式化JSON</el-button>
        <el-button type="success" @click="formatJSON('save')">保存</el-button>
      </div>
      <el-input
        style="width: 100%;"
        v-model="textJSON"
        type="textarea"
        :autosize="{ minRows: 15, maxRows: 30 }"
      />
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <pre v-else-if="formattedJson" class="pre">{{ formattedJson }}</pre>
    </template>
    <template v-else>
      <el-button type="primary" @click="openEditEvent(true)">编辑</el-button>
      <div class="text-box">{{ displayText }}</div>
    </template>
  </div>
</template>

<style scoped>
.pre {
  line-height: 1.4;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.error-message {
  color: #f5222d;
  margin-top: 10px;
}

.btn-box {
  margin-bottom: 12px;
}

.btn-box .el-button {
  margin-right: 10px;
}

.text-box {
  width: 100%;
  margin-top: 12px;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color);
  line-height: 1.5;
  min-height: 320px;
}
</style>
