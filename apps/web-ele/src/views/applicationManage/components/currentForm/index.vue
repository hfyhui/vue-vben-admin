<script lang="ts" setup>
import { computed, ref } from 'vue';

import { $t } from '#/locales';

import ExtColumns from './ExtColumns/index.vue';
import Form from './Form/index.vue';
import FormJSON from './FormJSON/index.vue';

const props = withDefaults(
  defineProps<{
    modelValue?: Record<string, any>[];
    extColumns?: Record<string, any>[];
  }>(),
  {
    modelValue: () => [],
    extColumns: () => [],
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>[]): void;
  (e: 'update:extColumns', value: Record<string, any>[]): void;
}>();

const activeTab = ref('form');

const baseColumns = computed<Record<string, any>[]>({
  get() {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  },
  set(value) {
    emit('update:modelValue', Array.isArray(value) ? value : []);
  },
});

const extColumnList = computed<Record<string, any>[]>({
  get() {
    return Array.isArray(props.extColumns) ? props.extColumns : [];
  },
  set(value) {
    emit('update:extColumns', Array.isArray(value) ? value : []);
  },
});
</script>

<template>
  <div class="current-form-wrap">
    <el-tabs v-model="activeTab">
      <el-tab-pane :label="$t('applicationManage.currentForm.tabs.form')" name="form" />
      <el-tab-pane :label="$t('applicationManage.currentForm.tabs.formJson')" name="formJSON" />
      <el-tab-pane :label="$t('applicationManage.currentForm.tabs.extColumns')" name="ext-columns" />
    </el-tabs>

    <Form
      v-if="activeTab === 'form'"
      v-model="baseColumns"
      :ext-columns="extColumnList"
      @update:ext-columns="extColumnList = $event"
    />
    <FormJSON
      v-else-if="activeTab === 'formJSON'"
      v-model="baseColumns"
      :ext-columns="extColumnList"
      @update:ext-columns="extColumnList = $event"
    />
    <ExtColumns v-else v-model="extColumnList" :base-columns="baseColumns" />
  </div>
</template>

<style scoped>
.current-form-wrap{
  width: 100%;
}
.current-form-wrap :deep(.el-tabs__item) {
  padding: 0 14px;
}
</style>
