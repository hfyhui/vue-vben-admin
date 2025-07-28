<script setup lang="ts">
import { h, watch } from 'vue';

import { z } from 'zod';

import { useVbenForm } from '#/adapter/form';

import AppTreeSelector from './AppTreeSelector.vue';

const props = defineProps<{ modelValue?: any; visible: boolean }>();
const emit = defineEmits(['update:visible', 'submit']);

const schema = [
  {
    component: 'Select',
    fieldName: 'customer',
    label: '客户',
    required: true,
    componentProps: {
      placeholder: '请选择客户',
      filterable: true,
      options: [
        { label: '客户A', value: 'a' },
        { label: '客户B', value: 'b' },
      ],
    },
    rules: z.string().min(1, { message: '请选择客户' }),
  },
  {
    component: h(AppTreeSelector),
    fieldName: 'apps',
    label: '授权应用',
    required: true,
    defaultValue: [],
    componentProps: {},
    rules: z.array(z.string()).min(1, { message: '请选择授权应用' }),
  },
  {
    component: 'RadioGroup',
    fieldName: 'licenseType',
    label: '授权类型',
    required: true,
    defaultValue: 'trial',
    componentProps: {
      options: [
        { label: '试用', value: 'trial' },
        { label: '正式', value: 'official' },
      ],
    },
    rules: z.string().min(1, { message: '请选择授权类型' }),
  },
  {
    component: 'DatePicker',
    fieldName: 'expireTime',
    label: '过期时间',
    required: true,
    componentProps: {
      type: 'datetime',
      placeholder: '请选择过期时间',
    },
    rules: z.string().min(1, { message: '请选择过期时间' }),
  },
  {
    component: 'InputNumber',
    fieldName: 'maxUsers',
    label: '最大并发用户',
    required: true,
    defaultValue: 10,
    componentProps: {
      min: 1,
      max: 2000,
      controls: true,
      placeholder: '最大2000个并发',
    },
    rules: z
      .number()
      .min(1, { message: '最小1' })
      .max(2000, { message: '最大2000' }),
  },
  {
    component: 'Input',
    fieldName: 'fingerprint',
    label: '指纹特征',
    componentProps: { placeholder: '请输入指纹特征', maxlength: 2000 },
    rules: z
      .string()
      .max(2000, { message: '限制不超过2000个字符长度' })
      .optional(),
  },
  {
    component: 'Input',
    fieldName: 'remark',
    label: '备注',
    componentProps: { placeholder: '请输入备注', maxlength: 100 },
    rules: z
      .string()
      .max(100, { message: '限制不超过100个字符长度' })
      .optional(),
  },
];

const [Form, formApi] = useVbenForm({
  schema,
  wrapperClass: 'grid-cols-1',
  commonConfig: { labelWidth: 110 },
  submitButtonOptions: { content: '保存' },
  resetButtonOptions: { content: '取消' },
  handleSubmit,
  handleReset,
});

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      if (formApi.setValues) formApi.setValues(val);
    } else {
      if (formApi.resetForm) formApi.resetForm();
    }
  },
  { immediate: true },
);

function handleSubmit(values: any) {
  emit('submit', values);
  emit('update:visible', false);
}
function handleReset() {
  if (formApi.resetForm) formApi.resetForm();
  emit('update:visible', false);
}
</script>

<template>
  <Form />
</template>
