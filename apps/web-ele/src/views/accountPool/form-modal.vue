<script lang="ts" setup>
import type { AddAccountParams } from '#/api/core/asset';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { addAccountApi } from '#/api/core/asset';
import { $t } from '#/locales';

import type {
  AccountPoolGroupOption,
  AccountPoolPlatformOption,
} from './account-pool-table-config';

interface AccountPoolModalData {
  defaultAppId?: string;
  groupOptions?: AccountPoolGroupOption[];
  platformOptions?: AccountPoolPlatformOption[];
}

const emit = defineEmits<{
  (e: 'success-after'): void;
}>();

const creating = ref(false);
const groupOptions = ref<AccountPoolGroupOption[]>([]);
const platformOptions = ref<AccountPoolPlatformOption[]>([]);

const platformSelectOptions = computed(() =>
  platformOptions.value
    .filter((item) => item.id)
    .map((item) => ({
      label: item.applicationName || item.id,
      value: item.id,
    })),
);

const groupSelectOptions = computed(() =>
  groupOptions.value.map((item) => ({
    label: item.suiteName,
    value: item.id,
  })),
);

function getDefaultValues(defaultAppId = ''): AddAccountParams {
  return {
    appId: defaultAppId,
    riskLevel: '低风险',
    appAccount: '',
    userName: '',
    userAccount: '',
    password: '',
    email: '',
    remark: '',
    suiteId: '',
    suiteName: '',
    suiteDesc: '',
  };
}

const [Form, formApi] = useVbenForm({
  handleSubmit: onSubmit,
  showDefaultActions: false,
  commonConfig: {
    labelWidth: 110,
  },
  schema: [
    {
      component: 'Select',
      fieldName: 'appId',
      label: $t('accountPool.form.appName'),
      rules: 'selectRequired',
      componentProps: {
        placeholder: $t('accountPool.form.appNamePlaceholder'),
        filterable: true,
        clearable: true,
        options: platformSelectOptions,
      },
    },
    {
      component: 'Input',
      fieldName: 'userName',
      label: $t('accountPool.form.userNickname'),
      componentProps: {
        placeholder: $t('accountPool.form.userNicknamePlaceholder'),
        maxlength: 50,
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'appAccount',
      label: $t('accountPool.form.accountIdOptional'),
      componentProps: {
        placeholder: $t('accountPool.form.accountIdPlaceholder'),
        maxlength: 100,
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'userAccount',
      label: $t('accountPool.form.userAccount'),
      rules: 'required',
      componentProps: {
        placeholder: $t('accountPool.form.userAccountPlaceholder'),
        maxlength: 100,
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'password',
      label: $t('accountPool.form.accountPassword'),
      rules: 'required',
      componentProps: {
        type: 'password',
        showPassword: true,
        placeholder: $t('accountPool.form.accountPasswordPlaceholder'),
        maxlength: 100,
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: $t('accountPool.form.email'),
      rules: 'required',
      componentProps: {
        placeholder: $t('accountPool.form.emailPlaceholder'),
        maxlength: 100,
        clearable: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'riskLevel',
      label: $t('accountPool.form.riskLevel'),
      rules: 'selectRequired',
      componentProps: {
        placeholder: $t('accountPool.form.riskLevelPlaceholder'),
        clearable: true,
        options: [
          { label: $t('accountPool.form.riskLow'), value: '低风险' },
          { label: $t('accountPool.form.riskMedium'), value: '中风险' },
          { label: $t('accountPool.form.riskHigh'), value: '高风险' },
        ],
      },
    },
    {
      component: 'Input',
      fieldName: 'remark',
      label: $t('accountPool.form.remarkOptional'),
      componentProps: {
        type: 'textarea',
        placeholder: $t('accountPool.form.remarkPlaceholder'),
        rows: 3,
        maxlength: 200,
        showWordLimit: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'suiteId',
      label: $t('accountPool.form.accountGroup'),
      componentProps: {
        placeholder: $t('accountPool.form.accountGroupPlaceholder'),
        clearable: true,
        filterable: true,
        options: groupSelectOptions,
        onChange: async (value?: string) => {
          const selected = groupOptions.value.find((item) => item.id === value);
          await formApi.setValues({
            suiteId: value || '',
            suiteName: selected?.suiteName || '',
          });
        },
      },
    },
  ],
});

const [Modal, modalApi] = useVbenModal({
  title: $t('accountPool.form.addAccountTitle'),
  class: 'w-[700px]',
  closeOnClickModal: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    await formApi.validateAndSubmitForm();
  },
  onOpenChange: async (isOpen) => {
    if (isOpen) {
      const data = modalApi.getData<AccountPoolModalData>();
      groupOptions.value = data?.groupOptions ?? [];
      platformOptions.value = data?.platformOptions ?? [];
      await formApi.resetForm();
      await formApi.setValues(getDefaultValues(data?.defaultAppId ?? ''));
      return;
    }
    await formApi.resetForm();
  },
});

async function onSubmit(values: AddAccountParams) {
  if (creating.value) return;
  creating.value = true;
  modalApi.lock();
  try {
    const payload: AddAccountParams = {
      ...getDefaultValues(),
      ...values,
    };
    const res = await addAccountApi(payload);
    if (res?.code === 100000) {
      ElMessage.success($t('accountPool.message.addSuccess'));
      modalApi.close();
      emit('success-after');
    } else {
      ElMessage.error(res?.msg || $t('accountPool.message.addFailed'));
    }
  } catch (error) {
    console.error('[accountPool] 新增账号失败:', error);
    ElMessage.error($t('accountPool.message.addFailed'));
  } finally {
    creating.value = false;
    modalApi.unlock();
  }
}
</script>

<template>
  <Modal :confirm-loading="creating">
    <Form />
  </Modal>
</template>
