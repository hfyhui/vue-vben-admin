<script setup lang="ts">
import { h, ref, watch, reactive } from 'vue';

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
const isSubmitting = ref(false)
const customerKeyStatus = ref(false);
const selectedKeyId = ref<null | string>(null);
// 授权类型默认值
const authorizationType = ref('OFFICIALLY');
// 获取当前时间（精确到秒）
const now = new Date();
// 计算当天0点的时间戳（用于日期判断）
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

// 计算30天后的日期
const getDefaultTrialExpiration = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

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
  {
    component: 'RadioGroup',
    fieldName: 'authorizationType',
    label: $t('licenseManage.form.licenseType'),
    required: true,
    defaultValue: 'OFFICIALLY',
    componentProps: {
      options: [
        { label: $t('licenseManage.form.trial'), value: 'TRIAL' },
        { label: $t('licenseManage.form.official'), value: 'OFFICIALLY' },
      ],
      // 监听授权类型变化，立即处理过期时间
      onChange: async (val: string) => {
        if (val === 'TRIAL') {
          // 切换到试用：设置30天默认值并禁用
          await formApi.setValues({
            expirationTime: getDefaultTrialExpiration()
          });
        } else {
          // 切换到正式：清空值并启用
          await formApi.setValues({
            expirationTime: ''
          });
        }
        authorizationType.value = val;
        // 触发表单验证，确保必填规则生效
        formApi.validateField('expirationTime');
      }
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
    component: 'DatePicker',
    fieldName: 'expirationTime',
    label: $t('licenseManage.form.expireTime'),
    defaultValue: '',
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
        // 只有试用时禁用
        disabled: authorizationType.value === 'TRIAL',
      };
    },
    rules: 'required',
    // 明确必填规则，确保始终生效
    // rules: z.string().nullable().refine(val => val !== null && val !== '', {
    //   message: $t('licenseManage.form.expireTimeRequired') || '过期时间不能为空',
    // }),
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
    },
    rules: 'required', // 初始为必填
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
  submitButtonOptions: { 
    content: $t('customerManage.form.save'),
    loading: isSubmitting
  }, // 不显示表单自带的保存按钮
  resetButtonOptions: { 
    content: $t('customerManage.form.cancel'),
   }, // 不显示表单自带的取消按钮
  handleSubmit,
  handleReset,
});

// 监听授权类型变化，确保值正确并验证
watch(
  () => authorizationType.value,
  async (newVal, oldVal) => {
    // 只有当从其他类型切换过来时才处理
    if (newVal !== oldVal) {
      if (newVal === 'TRIAL') {
        await formApi.setValues({
          expirationTime: getDefaultTrialExpiration()
        });
      } else {
        await formApi.setValues({
          expirationTime: ''
        });
      }
      // formApi.validateField('expirationTime');
    }
  }
);

// 监听授权类型变化，动态切换指纹特征字段的必填规则
watch(
  () => authorizationType.value,
  (newVal) => {
    formApi.updateSchema([
      {
        fieldName: 'fingerprintFeature',
        rules: newVal === 'OFFICIALLY' ? 'required' : '',
      },
    ]);
  }
);

watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      if (formApi.setValues) {
        await formApi.setValues(val);
        // 同步授权类型
        authorizationType.value = val.authorizationType || 'OFFICIALLY';
        // 触发验证
        // formApi.validateField('expirationTime');
      }
    } else {
      if (formApi.resetForm) {
        formApi.resetForm();
        // 重置时默认试用类型并设置默认值
        authorizationType.value = 'OFFICIALLY';
        await formApi.setValues({
          expirationTime: ''
        });
      }
    }
  },
  { immediate: true },
);

// 初始化时设置试用版的过期时间
watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible && authorizationType.value === 'OFFICIALLY') {
      await formApi.setValues({
        expirationTime: ''
      });
      // 触发验证
      // formApi.validateField('expirationTime');
    }
  },
  { immediate: true }
);

function handleSubmit(values: any) {
  // 手动验证过期时间
  if (!values.expirationTime) {
    ElMessage.warning($t('licenseManage.form.expireTimeRequired') || '过期时间不能为空');
    return;
  }

  if (!selectedKeyId.value) {
    ElMessage.warning(
      $t('licenseManage.message.genKeyTip') || '请先生成证书密钥',
    );
    return;
  }

  // 检查正式授权时是否填写了指纹特征
  // if (values.authorizationType === 'OFFICIALLY' && (!values.fingerprintFeature || values.fingerprintFeature.trim() === '')) {
  //   ElMessage.warning('指纹特征不能为空');
  //   return;
  // }

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
  if(isSubmitting.value) return
  isSubmitting.value = true
  emit('submit', submitData);
}
function handleReset() {
  if (formApi.resetForm) {
    formApi.resetForm();
    // 重置后默认正式类型且过期时间为空
    authorizationType.value = 'OFFICIALLY';
    formApi.setValues({
      expirationTime: ''
    });
  }
  emit('update:visible', false);
}

// 暴露isSubmitting给父组件用于控制按钮loading
defineExpose({ validateAndSubmitForm: formApi.validateAndSubmitForm, resetSubmitting: () => {
  isSubmitting.value = false;
} });
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
/* 确保错误提示可见 */
:deep(.el-form-item__error) {
  display: block !important;
}
</style>
