<script lang="ts" setup>
import type { AddAccountGroupParams } from '#/api/core/asset';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { ElAutocomplete, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { addAccountGroupApi } from '#/api/core/asset';
import { $t } from '#/locales';

import type { AccountPoolGroupOption } from './account-pool-table-config';

interface AccountGroupModalData {
  accountIds?: string[];
  groupOptions?: AccountPoolGroupOption[];
}

const emit = defineEmits<{
  (e: 'success-after'): void;
}>();

const submitting = ref(false);
const accountIds = ref<string[]>([]);
const groupOptions = ref<AccountPoolGroupOption[]>([]);

function getGroupNameSuggestions(queryString = '') {
  const keyword = queryString.trim()
  return groupOptions.value
    .filter((item) => Boolean(item?.suiteName))
    .filter((item) => {
      if (!keyword) return true;
      return (item.suiteName ?? '').includes(keyword);
    })
    .map((item) => ({
      value: item.suiteName,
      suiteDesc: item.suiteDesc,
    }));
}

function getDefaultValues() {
  return {
    suiteName: '',
    suiteDesc: '',
    accountIds: [] as string[],
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
      component: ElAutocomplete,
      fieldName: 'suiteName',
      label: $t('accountPool.groupForm.groupName'),
      rules: 'required',
      componentProps: {
        triggerOnFocus: true,
        clearable: true,
        maxlength: 50,
        placeholder: $t('accountPool.groupForm.groupNamePlaceholder'),
        fetchSuggestions: (
          queryString: string,
          callback: (items: Array<{ suiteDesc?: string; value: string }>) => void,
        ) => {
          callback(getGroupNameSuggestions(queryString));
        },
        onSelect: async (item: { suiteDesc?: string; value: string }) => {
          await formApi.setValues({
            suiteName: item?.value || '',
            suiteDesc: item?.suiteDesc || '',
          });
        },
        onChange: async (value: string) => {
          const suiteName = value ?? '';
          const selected = groupOptions.value.find(
            (item) => item?.suiteName === suiteName,
          );
          await formApi.setValues({
            suiteName,
            suiteDesc: selected?.suiteDesc || '',
          });
        },
      },
    },
    {
      component: 'Input',
      fieldName: 'suiteDesc',
      label: $t('accountPool.groupForm.groupDesc'),
      componentProps: {
        type: 'textarea',
        rows: 3,
        maxlength: 200,
        showWordLimit: true,
        placeholder: $t('accountPool.groupForm.groupDescPlaceholder'),
      },
    },
  ],
});

const [Modal, modalApi] = useVbenModal({
  title: $t('accountPool.groupForm.title'),
  class: 'w-[560px]',
  closeOnClickModal: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    await formApi.validateAndSubmitForm();
  },
  onOpenChange: async (isOpen) => {
    if (isOpen) {
      const data = modalApi.getData<AccountGroupModalData>();
      accountIds.value = data?.accountIds ?? [];
      groupOptions.value = data?.groupOptions ?? [];
      await formApi.resetForm();
      await formApi.setValues(getDefaultValues());
      return;
    }
    await formApi.resetForm();
    accountIds.value = [];
    groupOptions.value = [];
  },
});

async function onSubmit(values: AddAccountGroupParams) {
  if (submitting.value) return;
  if (!accountIds.value.length) {
    ElMessage.warning($t('accountPool.message.selectBeforeGrouping'));
    return;
  }
  submitting.value = true;
  modalApi.lock();
  try {
    const suiteName = values.suiteName ?? '';
    const selectedGroup = groupOptions.value.find(
      (item) => item?.suiteName === suiteName,
    );
    const payload: AddAccountGroupParams = {
      suiteId: selectedGroup?.id ?? '',
      suiteName,
      suiteDesc: values.suiteDesc ?? selectedGroup?.suiteDesc ?? '',
      accountIds: accountIds.value,
    };
    const res = await addAccountGroupApi(payload);
    if (res?.code === 100000) {
      ElMessage.success($t('accountPool.message.groupSetSuccess'));
      modalApi.close();
      emit('success-after');
    } else {
      ElMessage.error(res?.msg || $t('accountPool.message.groupSetFailed'));
    }
  } catch (error) {
    console.error('[accountPool] 设置账号分组失败:', error);
    ElMessage.error($t('accountPool.message.groupSetFailed'));
  } finally {
    submitting.value = false;
    modalApi.unlock();
  }
}
</script>

<template>
  <Modal :confirm-loading="submitting">
    <Form />
  </Modal>
</template>
