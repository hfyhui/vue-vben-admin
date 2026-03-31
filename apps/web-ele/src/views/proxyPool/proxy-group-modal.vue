<script lang="ts" setup>
import type { AddProxyGroupParams } from '#/api/core/asset';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { addProxyGroupApi } from '#/api/core/asset';
import { $t } from '#/locales';

import type { ProxyPoolGroupOption } from './proxy-pool-table-config';

interface ProxyGroupModalData {
  proxyIds?: string[];
  groupOptions?: ProxyPoolGroupOption[];
}

const emit = defineEmits<{
  (e: 'success-after'): void;
}>();

const submitting = ref(false);
const proxyIds = ref<string[]>([]);
const groupOptions = ref<ProxyPoolGroupOption[]>([]);

const groupNameOptions = computed(() =>
  groupOptions.value
    .filter((item) => Boolean(item?.id) && Boolean(item?.suiteName))
    .map((item) => ({
      label: item.suiteName,
      value: item.id,
    })),
);

function getDefaultValues() {
  return {
    suiteId: '',
    suiteName: '',
    suiteDesc: '',
    proxyIds: [] as string[],
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
      fieldName: 'suiteId',
      label: $t('proxyPool.groupForm.groupName'),
      rules: 'required',
      componentProps: {
        filterable: true,
        clearable: true,
        options: groupNameOptions,
        placeholder: $t('proxyPool.groupForm.groupNamePlaceholder'),
        onChange: async (value?: string) => {
          const selected = groupOptions.value.find((item) => item.id === (value || ''));
          await formApi.setValues({
            suiteId: value || '',
            suiteName: selected?.suiteName || '',
            suiteDesc: selected?.suiteDesc || '',
          });
        },
      },
    },
    {
      component: 'Input',
      fieldName: 'suiteDesc',
      label: $t('proxyPool.groupForm.groupDesc'),
      componentProps: {
        type: 'textarea',
        rows: 3,
        maxlength: 200,
        showWordLimit: true,
        placeholder: $t('proxyPool.groupForm.groupDescPlaceholder'),
      },
    },
  ],
});

const [Modal, modalApi] = useVbenModal({
  title: $t('proxyPool.groupForm.title'),
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
      const data = modalApi.getData<ProxyGroupModalData>();
      proxyIds.value = data?.proxyIds ?? [];
      groupOptions.value = data?.groupOptions ?? [];
      await formApi.resetForm();
      await formApi.setValues(getDefaultValues());
      return;
    }
    await formApi.resetForm();
    proxyIds.value = [];
    groupOptions.value = [];
  },
});

async function onSubmit(values: AddProxyGroupParams) {
  if (submitting.value) return;
  if (!proxyIds.value.length) {
    ElMessage.warning($t('proxyPool.message.selectBeforeGrouping'));
    return;
  }
  submitting.value = true;
  modalApi.lock();
  try {
    const selectedGroup = groupOptions.value.find(
      (item) => item.id === (values.suiteId || ''),
    );
    const payload: AddProxyGroupParams = {
      ...getDefaultValues(),
      ...values,
      suiteId: values.suiteId || selectedGroup?.id || '',
      suiteName: values.suiteName || selectedGroup?.suiteName || '',
      suiteDesc: values.suiteDesc || selectedGroup?.suiteDesc || '',
      proxyIds: proxyIds.value,
    };
    const res = await addProxyGroupApi(payload);
    if (res?.code === 100000) {
      ElMessage.success($t('proxyPool.message.groupSetSuccess'));
      modalApi.close();
      emit('success-after');
    } else {
      ElMessage.error(res?.msg || $t('proxyPool.message.groupSetFailed'));
    }
  } catch (error) {
    console.error('[proxyPool] 设置代理分组失败:', error);
    ElMessage.error($t('proxyPool.message.groupSetFailed'));
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
