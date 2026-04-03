<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { ElAutocomplete, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import {
  addDeviceGroupApi,
  type AddDeviceGroupParams,
  type AssetGroupItem,
} from '#/api/core/asset';
import { $t } from '#/locales';

interface DeviceGroupModalData {
  mobiles?: any[];
  groupOptions?: AssetGroupItem[];
}

const emit = defineEmits<{
  (e: 'success-after'): void;
}>();

const submitting = ref(false);
const mobiles = ref<any[]>([]);
const groupOptions = ref<AssetGroupItem[]>([]);

function getGroupNameSuggestions(queryString = '') {
  const keyword = queryString.trim().toLowerCase();
  return groupOptions.value
    .filter((item) => Boolean(item?.suiteName))
    .filter((item) => {
      if (!keyword) return true;
      return (item.suiteName ?? '').toLowerCase().includes(keyword);
    })
    .map((item) => ({
      value: item.suiteName ?? '',
      suiteDesc: item.suiteDesc,
    }));
}

function getDefaultValues() {
  return {
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
      component: ElAutocomplete,
      fieldName: 'suiteName',
      label: $t('containerPool.groupForm.groupName'),
      rules: 'required',
      componentProps: {
        triggerOnFocus: true,
        clearable: true,
        maxlength: 50,
        placeholder: $t('containerPool.groupForm.groupNamePlaceholder'),
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
      label: $t('containerPool.groupForm.groupDesc'),
      componentProps: {
        type: 'textarea',
        rows: 3,
        maxlength: 200,
        showWordLimit: true,
        placeholder: $t('containerPool.groupForm.groupDescPlaceholder'),
      },
    },
  ],
});

const [Modal, modalApi] = useVbenModal({
  title: $t('containerPool.groupForm.title'),
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
      const data = modalApi.getData<DeviceGroupModalData>();
      mobiles.value = data?.mobiles ?? [];
      groupOptions.value = data?.groupOptions ?? [];
      await formApi.resetForm();
      await formApi.setValues(getDefaultValues());
      return;
    }
    await formApi.resetForm();
    mobiles.value = [];
    groupOptions.value = [];
  },
});

async function onSubmit(values: AddDeviceGroupParams) {
  if (submitting.value) return;
  if (!mobiles.value.length) {
    ElMessage.warning($t('containerPool.message.selectBeforeGrouping'));
    return;
  }
  submitting.value = true;
  modalApi.lock();
  try {
    const suiteName = values.suiteName ?? '';
    const selectedGroup = groupOptions.value.find(
      (item) => item?.suiteName === suiteName,
    );
    const payload: AddDeviceGroupParams = {
      suiteId: selectedGroup?.id ?? '',
      suiteName,
      suiteDesc: values.suiteDesc ?? selectedGroup?.suiteDesc ?? '',
      mobiles: mobiles.value,
    };
    const res = await addDeviceGroupApi(payload);
    if (res?.code === 100000) {
      ElMessage.success($t('containerPool.message.groupSetSuccess'));
      modalApi.close();
      emit('success-after');
    } else {
      ElMessage.error(res?.msg || $t('containerPool.message.groupSetFailed'));
    }
  } catch (error) {
    console.error('[containerPool] 设置设备分组失败:', error);
    ElMessage.error($t('containerPool.message.groupSetFailed'));
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
