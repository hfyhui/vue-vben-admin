<script setup lang="ts">
import { h, ref, watch } from 'vue';

import { ElMessage } from 'element-plus';
import { z } from '#/adapter/form';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import AppTreeSelector from './AppTreeSelector.vue';
import CustomerSelector from './CustomerSelector.vue';

const props = defineProps<{
  customerList?: { label: string; value: string }[];
  modelValue?: any;
  visible: boolean;
}>();
const emit = defineEmits(['update:visible', 'submit']);

const customerKeyStatus = ref(false);
const selectedKeyId = ref<null | string>(null);

const schema = [
  {
    component: h(CustomerSelector, {
      customerList: props.customerList || [],
      onKeyStatusChange: (status: boolean) =>
        (customerKeyStatus.value = status),
      'onUpdate:keyId': (keyId: null | string) => {
        selectedKeyId.value = keyId;
      },
    }),
    fieldName: 'customerId',
    label: $t('licenseManage.form.customer'),
    required: true,
    componentProps: {
      style: 'width: 340px;',
    },
    rules: 'selectRequired',
  },
  // 授权应用
  {
    component: h(AppTreeSelector),
    fieldName: 'features',
    label: $t('licenseManage.form.apps'),
    required: true,
    defaultValue: {},
    rules: z
      .any()
      .refine(
        (val) => val && typeof val === 'object' && Object.keys(val).length > 0,
        {
          message: $t('licenseManage.form.apps'),
        },
      ),
  },
  {
    component: 'RadioGroup',
    fieldName: 'authorizationType',
    label: $t('licenseManage.form.licenseType'),
    required: true,
    defaultValue: 'TRIAL',
    componentProps: {
      options: [
        { label: $t('licenseManage.form.trial'), value: 'TRIAL' },
        { label: $t('licenseManage.form.official'), value: 'OFFICIALLY' },
      ],
    },
    rules: 'selectRequired',
  },
  {
    component: 'DatePicker',
    fieldName: 'expirationTime',
    label: $t('licenseManage.form.expireTime'),
    required: true,
    componentProps: {
      type: 'datetime',
      placeholder: $t('licenseManage.form.expireTime'),
      format: 'YYYY-MM-DD HH:mm:ss',
      valueFormat: 'YYYY-MM-DD HH:mm:ss',
      style: 'width: 340px;',
    },
    rules: 'selectRequired',
  },
  {
    component: 'InputNumber',
    fieldName: 'concurrentUsers',
    label: $t('licenseManage.form.maxUsers'),
    required: true,
    componentProps: {
      min: 1,
      max: 2000,
      controls: true,
      placeholder: $t('licenseManage.form.maxUsers'),
      style: 'width: 340px;',
    },
    rules: 'required',
  },
  {
    component: 'Input',
    fieldName: 'fingerprintFeature',
    label: $t('licenseManage.form.fingerprint'),
    required: true,
    componentProps: {
      placeholder: $t('licenseManage.form.fingerprint'),
      style: 'width: 340px;',
      maxlength: 2000,
      showWordLimit: true,
      type: 'textarea',
      rows: 3,
    },
    rules: 'required',
  },
  {
    component: 'Input',
    fieldName: 'remark',
    label: $t('licenseManage.form.remark'),
    componentProps: {
      placeholder: $t('licenseManage.form.remark'),
      style: 'width: 340px;',
      maxlength: 100,
      showWordLimit: true,
      type: 'textarea',
      rows: 2,
    },
    rules: z
      .string()
      .max(100, {
        message: '备注不超过100个字符',
      })
      .optional(),
  },
];

const [Form, formApi] = useVbenForm({
  schema,
  wrapperClass: 'grid grid-cols-1 gap-4',
  commonConfig: { labelWidth: 140 },
  submitButtonOptions: { show: false }, // 不显示表单自带的保存按钮
  resetButtonOptions: { show: false }, // 不显示表单自带的取消按钮
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

  const submitData = {
    ...values,
    keyId: selectedKeyId.value,
  };
  emit('submit', submitData);
  emit('update:visible', false);
}
function handleReset() {
  if (formApi.resetForm) formApi.resetForm();
  emit('update:visible', false);
}

defineExpose({ validateAndSubmitForm: formApi.validateAndSubmitForm });
</script>

<template>
  <div class="license-form-container">
    <Form />
  </div>
</template>

<style scoped>
.license-form-container {
  width: 100%;
}

:deep(.grid) {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

:deep(.el-form-item) {
  margin-bottom: 1rem;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #333;
}
:deep(.pb-6) {
  padding-bottom:18px !important;
}
</style>
