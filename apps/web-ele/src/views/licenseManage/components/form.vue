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

// 获取当前时间（精确到秒）
const now = new Date();
// 计算当天0点的时间戳（用于日期判断）
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

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
    componentProps: () => {
      return {
        type: 'datetime',
        placeholder: $t('licenseManage.form.expireTime'),
        format: 'YYYY-MM-DD HH:mm:ss',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        style: 'width: 340px;',
        disabledDate: (time: Date) => {
          return time.getTime() < todayStart;
        },

      };
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
    componentProps: {
      placeholder: $t('licenseManage.form.fingerprint'),
      style: 'width: 340px;',
      maxlength: 2000,
      showWordLimit: true,
      type: 'textarea',
      rows: 3,
    }
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
  if (!selectedKeyId.value) {
    ElMessage.warning(
      $t('licenseManage.message.genKeyTip') || '请先生成证书密钥',
    );
    return;
  }

  // 检查正式授权时是否填写了指纹特征
  if (values.authorizationType === 'OFFICIALLY' && (!values.fingerprintFeature || values.fingerprintFeature.trim() === '')) {
    ElMessage.warning('请填写指纹特征');
    return;
  }

  // 检查过期时间是否为过去时间（精确到秒）
  if (values.expirationTime) {
    const expirationDate = new Date(values.expirationTime);
    const currentTime = new Date();
    
    if (expirationDate.getTime() <= currentTime.getTime()) {
      const timeDiff = currentTime.getTime() - expirationDate.getTime();
      const secondsDiff = Math.ceil(timeDiff / 1000);
      ElMessage.warning(`过期时间不能早于当前时间，当前选择的时间比现在早了 ${secondsDiff} 秒`);
      return;
    }
  }

  const submitData = {
    ...values,
    keyId: selectedKeyId.value,
  };
  emit('submit', submitData);
  // 不在这里关闭弹框，让父组件根据接口调用结果决定是否关闭
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
    