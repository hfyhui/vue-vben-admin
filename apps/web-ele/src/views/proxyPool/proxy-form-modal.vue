<script lang="ts" setup>
import type { AddProxyParams, DeviceItem } from '#/api/core/asset';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm, z } from '#/adapter/form';
import {
  addProxyApi,
  getDeviceListApi,
  intelligentRecognitionApi,
} from '#/api/core/asset';
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
  /** 节点 IP，多选 */
  phoneIp?: string[];
}

const emit = defineEmits<{
  (e: 'success-after'): void;
}>();

const creating = ref(false);
/** 与接口 records 项结构一致，直接交给 ElSelectV2 */
const deviceNodeOptions = ref<DeviceItem[]>([]);

const PAGE_SIZE = 100;

async function loadDeviceNodeOptions() {
  try {
    const res = await getDeviceListApi<DeviceItem>({
      current: 1,
      size: PAGE_SIZE,
    });
    let list = res?.records ?? [];
    const boundMark = $t('proxyPool.form.deviceIpBoundMark');
    list = list.map((item) => {
      const disabled = item.disabled === true || item.isLock === true;
      const deviceIp = item.deviceIp ?? '';
      return {
        ...item,
        deviceIp,
        disabled,
        deviceIpLabel: item.disabled === true ? `${deviceIp}${boundMark}` : deviceIp,
      };
    });
    deviceNodeOptions.value = list
  } catch (error) {
    console.error('[proxyPool] 加载设备列表失败:', error);
    ElMessage.error($t('proxyPool.message.deviceListLoadFailed'));
    deviceNodeOptions.value = [];
  }
}

/** 与账号表单 Select 一致，用 computed 保证异步拉取后选项刷新 */
const deviceNodeSelectOptions = computed(() => deviceNodeOptions.value);

function getDefaultValues(): ProxyFormValues {
  return {
    ip: '',
    area: '',
    agreement: '',
    expirationTime: '',
    networkLink: '',
    phoneIp: [],
    proxyLinkIp: '',
    proxyLinkPort: undefined,
    username: '',
    password: '',
  };
}

async function onNetworkLinkBlur(event: FocusEvent) {
  const target = event.target as HTMLInputElement;
  const networkLink = target?.value;
  if (!networkLink) return;
  try {
    const res = await intelligentRecognitionApi({ networkLink });
    if (res?.code !== 100000) {
      ElMessage.error(res?.msg);
      return;
    }
    const data = res?.data;
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
        maxlength: 2000,
        showWordLimit: true,
        onBlur: onNetworkLinkBlur,
      },
    },
    {
      component: 'Input',
      fieldName: 'ip',
      label: $t('proxyPool.form.ip'),
      rules: z
        .string()
        .trim()
        .min(1, { message: '请输入IP' })
        .regex(/^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/, {
          message: '格式错误，IPv4地址格式（例如 192.168.1.1）',
        }),
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
        maxlength: 20,
        showWordLimit: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'phoneIp',
      label: $t('proxyPool.form.phoneIp'),
      componentProps: {
        placeholder: $t('proxyPool.form.phoneIpPlaceholder'),
        clearable: true,
        filterable: true,
        multiple: true,
        // 不折叠展示，避免出现 "+1"
        collapseTags: false,
        options: deviceNodeSelectOptions,
        props: {
          label: 'deviceIpLabel',
          value: 'deviceIp',
          disabled: 'disabled',
        },
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
        maxlength: 200,
        showWordLimit: true,
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
      await loadDeviceNodeOptions();
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
    const phones: { phoneId?: string; phoneIp: string }[] = [];
    for (const phoneIp of values?.phoneIp ?? []) {
      const matched = deviceNodeOptions.value.find(
        (opt) => opt?.deviceIp === phoneIp,
      );
      phones.push({
        phoneId: matched?.deviceId,
        phoneIp,
      });
    }

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
      phones,
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
