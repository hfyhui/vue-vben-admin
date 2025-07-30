<script setup lang="ts">
import { h, ref, watch } from 'vue';

import { z } from 'zod';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import AppTreeSelector from './AppTreeSelector.vue';
import CustomerSelector from './CustomerSelector.vue';

const props = defineProps<{ modelValue?: any; visible: boolean }>();
const emit = defineEmits(['update:visible', 'submit']);

const customerKeyStatus = ref(false);

const schema = [
  {
    component: h(CustomerSelector, {
      onKeyStatusChange: (status: boolean) =>
        (customerKeyStatus.value = status),
    }),
    fieldName: 'customer',
    label: $t('licenseManage.form.customer'),
    required: true,
    componentProps: {},
    rules: 'selectRequired',
  },
  {
    component: h(AppTreeSelector),
    fieldName: 'apps',
    label: $t('licenseManage.form.apps'),
    required: true,
    defaultValue: [],
    componentProps: {},
    rules: z
      .any()
      .refine((val) => val && Array.isArray(val) && val.length > 0, {
        message:
          $t('licenseManage.form.apps') +
          $t('licenseManage.message.selectToDelete'),
      }),
  },
  {
    component: 'RadioGroup',
    fieldName: 'licenseType',
    label: $t('licenseManage.form.licenseType'),
    required: true,
    defaultValue: 'trial',
    componentProps: {
      options: [
        { label: $t('licenseManage.form.trial'), value: 'trial' },
        { label: $t('licenseManage.form.official'), value: 'official' },
      ],
    },
    rules: 'selectRequired',
  },
  {
    component: 'DatePicker',
    fieldName: 'expireTime',
    label: $t('licenseManage.form.expireTime'),
    required: true,
    componentProps: {
      type: 'datetime',
      placeholder: $t('licenseManage.form.expireTime'),
    },
    rules: 'selectRequired',
  },
  {
    component: 'InputNumber',
    fieldName: 'maxUsers',
    label: $t('licenseManage.form.maxUsers'),
    required: true,
    defaultValue: 10,
    componentProps: {
      min: 1,
      max: 2000,
      controls: true,
      placeholder: $t('licenseManage.form.maxUsers'),
    },
    rules: 'required',
  },
  {
    component: 'Input',
    fieldName: 'fingerprint',
    label: $t('licenseManage.form.fingerprint'),
    componentProps: {
      placeholder: $t('licenseManage.form.fingerprint'),
      maxlength: 2000,
    },
    rules: z
      .string()
      .max(2000, {
        message:
          $t('licenseManage.message.maxFingerprint') ||
          '限制不超过2000个字符长度',
      })
      .optional(),
  },
  {
    component: 'Input',
    fieldName: 'remark',
    label: $t('licenseManage.form.remark'),
    componentProps: {
      placeholder: $t('licenseManage.form.remark'),
      maxlength: 100,
    },
    rules: z
      .string()
      .max(100, {
        message:
          $t('licenseManage.message.maxRemark') || '限制不超过100个字符长度',
      })
      .optional(),
  },
];

const [Form, formApi] = useVbenForm({
  schema,
  wrapperClass: 'grid-cols-1',
  commonConfig: { labelWidth: 130 },
  submitButtonOptions: { content: $t('licenseManage.form.save') },
  resetButtonOptions: { content: $t('licenseManage.form.cancel') },
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
  if (!customerKeyStatus.value) {
    ElMessage.warning(
      $t('licenseManage.message.genKeyTip') || '请先生成证书密钥',
    );
    return;
  }
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
