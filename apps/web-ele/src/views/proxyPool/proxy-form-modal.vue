<script lang="ts" setup>
import type { AddProxyParams } from '#/api/core/asset';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { addProxyApi, intelligentRecognitionApi } from '#/api/core/asset';
import { $t } from '#/locales';

interface ProxyFormValues {
  ip?: string;
  area?: string;
  agreement?: string;
  expirationTime?: string;
  networkLink?: string;
  proxyLinkIp?: string;
  proxyLinkPort?: number;
  username?: string;
  password?: string;
  phoneIp?: string;
}

const emit = defineEmits<{
  (e: 'success-after'): void;
}>();

const creating = ref(false);

function getDefaultValues(): ProxyFormValues {
  return {
    ip: '',
    area: '',
    agreement: '',
    expirationTime: '',
    networkLink: '',
    phoneIp: '',
    proxyLinkIp: '',
    proxyLinkPort: undefined,
    username: '',
    password: '',
  };
}

async function onNetworkLinkBlur(event: FocusEvent) {
  const target = event.target as HTMLInputElement;
  const networkLink = target?.value
  if (!networkLink) return;
  try {
    const res = await intelligentRecognitionApi({ networkLink });
    if (res?.code !== 100000) {
      ElMessage.error(res?.msg);
      return;
    }
    const data = res?.data
    await formApi.setValues({
      networkLink,
      ip: data.proxyLinkIp,
      proxyLinkIp: data.proxyLinkIp,
      proxyLinkPort: data.proxyLinkPort,
      username: data.username,
      password: data.password,
    });
  } catch (error) {
    console.error('[proxyPool] 智能识别失败:', error);
  }
}

const [Form, formApi] = useVbenForm({
  handleSubmit: onSubmit,
  showDefaultActions: false,
  commonConfig: {
    labelWidth: 120,
  },
  schema: [
    {
      component: 'Input',
      fieldName: 'networkLink',
      label: $t('proxyPool.form.networkLink'),
      rules: 'required',
      componentProps: {
        placeholder: $t('proxyPool.form.smartRecognitionPlaceholder'),
        clearable: true,
        onBlur: onNetworkLinkBlur,
      },
    },
    {
      component: 'Input',
      fieldName: 'ip',
      label: $t('proxyPool.form.ip'),
      rules: 'required',
      componentProps: {
        placeholder: $t('proxyPool.form.ipPlaceholder'),
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'proxyLinkPort',
      label: $t('proxyPool.form.proxyPort'),
      componentProps: {
        placeholder: '',
        disabled: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'username',
      label: $t('proxyPool.form.username'),
      componentProps: {
        placeholder: '',
        disabled: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'password',
      label: $t('proxyPool.form.password'),
      componentProps: {
        type: 'password',
        showPassword: true,
        placeholder: '',
        disabled: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'area',
      label: $t('proxyPool.form.area'),
      rules: 'required',
      componentProps: {
        placeholder: $t('proxyPool.form.areaPlaceholder'),
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'phoneIp',
      label: $t('proxyPool.form.phoneIp'),
      componentProps: {
        placeholder: $t('proxyPool.form.phoneIpPlaceholder'),
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'agreement',
      label: $t('proxyPool.form.agreement'),
      rules: 'required',
      componentProps: {
        placeholder: $t('proxyPool.form.agreementPlaceholder'),
        clearable: true,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'expirationTime',
      label: $t('proxyPool.form.expirationTime'),
      rules: 'required',
      componentProps: {
        type: 'datetime',
        placeholder: $t('proxyPool.form.expirationTimePlaceholder'),
        format: 'YYYY-MM-DD HH:mm:ss',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        style: 'width: 100%;',
      },
    },
  ],
});

const [Modal, modalApi] = useVbenModal({
  title: $t('proxyPool.form.addProxyTitle'),
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
      await formApi.resetForm();
      await formApi.setValues(getDefaultValues());
      return;
    }
    await formApi.resetForm();
  },
});

async function onSubmit(values: ProxyFormValues) {
  if (creating.value) return;
  creating.value = true;
  modalApi.lock();
  try {
    const payload: AddProxyParams = {
      ip: values.ip,
      area: values.area,
      agreement: values.agreement,
      expirationTime: values.expirationTime,
      networkLink: values.networkLink,
      proxyLinkIp: values.proxyLinkIp,
      proxyLinkPort: values.proxyLinkPort,
      username: values.username,
      password: values.password,
      phones: values.phoneIp
        ? [
            {
              phoneIp: values.phoneIp,
            },
          ]
        : [],
    };
    const res = await addProxyApi(payload);
    if (res?.code === 100000) {
      ElMessage.success($t('proxyPool.message.addSuccess'));
      modalApi.close();
      emit('success-after');
    }
  } catch (error) {
    console.error('[proxyPool] 新增代理失败:', error);
    ElMessage.error($t('proxyPool.message.addFailed'));
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
