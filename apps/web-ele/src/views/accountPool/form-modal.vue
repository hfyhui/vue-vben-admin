<script lang="ts" setup>
import type { AddAccountParams } from '#/api/core/asset';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { addAccountApi, getAccountDetailApi } from '#/api/core/asset';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

import type {
  AccountPoolGroupOption,
  AccountPoolPlatformOption,
} from './account-pool-table-config';

interface AccountPoolModalData {
  mode?: 'create' | 'edit';
  accountId?: string;
  defaultAppId?: string;
  groupOptions?: AccountPoolGroupOption[];
  platformOptions?: AccountPoolPlatformOption[];
}

const emit = defineEmits<{
  (e: 'success-after'): void;
}>();

const creating = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const groupOptions = ref<AccountPoolGroupOption[]>([]);
const platformOptions = ref<AccountPoolPlatformOption[]>([]);
const assetEnumsStore = useAssetEnumsStore();

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

const riskLevelSelectOptions = computed(() => {
  return assetEnumsStore.getEnumOptions('ACCOUNT_RISK_LEVEL');
});
const loginStatusSelectOptions = computed(() => {
  return assetEnumsStore.getEnumOptions('LOGIN_STATUS');
});

function getDefaultValues(defaultAppId = ''): AddAccountParams {
  return {
    id: undefined,
    appId: defaultAppId || undefined,
    appName: '',
    riskLevel: undefined,
    loginStatus: undefined,
    nickName: '',
    appAccount: '',
    accountPasswd: '',
    emailAddr: '',
    emailPasswd: '',
    twiceCheck: '',
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
    labelWidth: 140,
  },
  schema: [
    {
      component: 'Input',
      fieldName: 'id',
      label: '',
      componentProps: {
        type: 'hidden',
      },
    },
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
      fieldName: 'nickName',
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
      label: $t('accountPool.form.userAccount'),
      rules: 'required',
      componentProps: {
        placeholder: $t('accountPool.form.userAccountPlaceholder'),
        maxlength: 50,
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'accountPasswd',
      label: $t('accountPool.form.accountPassword'),
      rules: 'required',
      componentProps: {
        type: 'password',
        showPassword: true,
        placeholder: $t('accountPool.form.accountPasswordPlaceholder'),
        maxlength: 20,
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'emailAddr',
      label: $t('accountPool.form.email'),
      rules: 'required',
      componentProps: {
        placeholder: $t('accountPool.form.emailPlaceholder'),
        maxlength: 50,
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'emailPasswd',
      label: $t('accountPool.form.emailPassword'),
      componentProps: {
        placeholder: $t('accountPool.form.emailPasswordPlaceholder'),
        maxlength: 20,
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'twiceCheck',
      label: $t('accountPool.form.twiceCheck'),
      componentProps: {
        placeholder: $t('accountPool.form.twiceCheckPlaceholder'),
        maxlength: 50,
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
        options: riskLevelSelectOptions,
      },
    },
    {
      component: 'Select',
      fieldName: 'loginStatus',
      label: $t('accountPool.form.loginStatus'),
      componentProps: {
        placeholder: $t('accountPool.form.loginStatusPlaceholder'),
        clearable: true,
        options: loginStatusSelectOptions,
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
        maxlength: 50,
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
      modalMode.value = data?.mode === 'edit' ? 'edit' : 'create';
      groupOptions.value = data?.groupOptions ?? [];
      platformOptions.value = data?.platformOptions ?? [];
      await formApi.updateSchema([
        {
          fieldName: 'appAccount',
          componentProps: {
            placeholder: $t('accountPool.form.userAccountPlaceholder'),
            maxlength: 50,
            clearable: true,
            disabled: modalMode.value === 'edit',
          },
        },
      ]);
      await formApi.resetForm();
      if (modalMode.value === 'edit') {
        const accountId = data?.accountId || ''
        try {
          const detailRes = await getAccountDetailApi(accountId);
          const detail = detailRes?.data ?? {};
          await formApi.setValues({
            ...getDefaultValues(),
            id: detail.id,
            appId: detail.appId,
            appName: detail.appName ?? '',
            riskLevel: detail.riskLevel,
            loginStatus: detail.loginStatus,
            nickName: detail.nickName ?? '',
            appAccount: detail.appAccount ?? '',
            accountPasswd: detail.accountPasswd ?? '',
            emailAddr: detail.emailAddr ?? '',
            emailPasswd: detail.emailPasswd ?? '',
            twiceCheck: detail.twiceCheck ?? '',
            remark: detail.remark ?? '',
            suiteId: detail.suiteId ?? '',
            suiteName: detail.suiteName ?? '',
            suiteDesc: detail.suiteDesc ?? '',
          });
        } catch (error) {
          console.error('[accountPool] 查询账号详情失败:', error);
          ElMessage.error($t('accountPool.message.loadDetailFailed'));
          modalApi.close();
        }
        return;
      }
      await formApi.setValues(getDefaultValues(data?.defaultAppId ?? ''));
      return;
    }
    modalMode.value = 'create';
    await formApi.updateSchema([
      {
        fieldName: 'appAccount',
        componentProps: {
          placeholder: $t('accountPool.form.userAccountPlaceholder'),
          maxlength: 50,
          clearable: true,
          disabled: false,
        },
      },
    ]);
    await formApi.resetForm();
  },
});

async function onSubmit(values: AddAccountParams) {
  if (creating.value) return;
  creating.value = true;
  modalApi.lock();
  try {
    const selectedPlatform = platformOptions.value.find(
      (item) => item.id === values.appId,
    );
    const payload: AddAccountParams = {
      ...getDefaultValues(),
      ...values,
      appName: selectedPlatform?.applicationName ?? '',
    };
    const res = await addAccountApi(payload);
    if (res?.code === 100000) {
      ElMessage.success(
        modalMode.value === 'edit'
          ? $t('accountPool.message.editSuccess')
          : $t('accountPool.message.addSuccess'),
      );
      modalApi.close();
      emit('success-after');
    }
  } catch (error) {
    console.error(
      `[accountPool] ${modalMode.value === 'edit' ? '编辑' : '新增'}账号失败:`,
      error,
    );
    ElMessage.error(
      modalMode.value === 'edit'
        ? $t('accountPool.message.editFailed')
        : $t('accountPool.message.addFailed'),
    );
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

<style scoped>
:deep(.el-form-item__label) {
  white-space: nowrap;
}
</style>
