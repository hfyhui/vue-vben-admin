<script lang="ts" setup>
import { computed, markRaw, nextTick, watch } from 'vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';
import { ElMessage } from 'element-plus';

import ShareholdersTable from './ShareholdersTable.vue';

const props = defineProps<{
  customerTypes?: any[];
  idTypeOptions?: any[];
  modelValue?: any;
  visible: boolean;
}>();
const emit = defineEmits(['update:visible', 'submit']);

const idTypeOptions = computed(
  () =>
    props.idTypeOptions?.map((item: any) => ({
      label: item.content,
      value: item.name,
    })) || [],
);

const customerTypes = computed(
  () =>
    props.customerTypes?.map((item: any) => ({
      label: item.content,
      value: item.name,
    })) || [],
);

const schema = [
  {
    component: 'Input',
    fieldName: 'customersName',
    label: $t('customerManage.form.name'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.namePlaceholder'),
      maxlength: 50,
      style: {
        width: '340px',
      },
    },
    rules: 'required',
  },
  {
    component: 'RadioGroup',
    fieldName: 'customersType',
    label: $t('customerManage.form.type'),
    defaultValue: 'COMPANY',
    componentProps: {
      options: customerTypes,
    },
  },
  {
    component: 'Input',
    fieldName: 'unifiedSocialCreditCode',
    label: $t('customerManage.form.creditCode'),
    componentProps: {
      placeholder: $t('customerManage.form.creditCodePlaceholder'),
      maxlength: 20,
      style: {
        width: '340px',
      },
    },
    rules: 'required',
    dependencies: {
      show(values: any) {
        return values && values.customersType === 'COMPANY';
      },
      triggerFields: ['customersType'],
    },
  },
  {
    component: 'Input',
    fieldName: 'legalPerson',
    label: $t('customerManage.form.legalName'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.legalNamePlaceholder'),
      maxlength: 20,
      style: {
        width: '340px',
      },
    },
    dependencies: {
      show(values: any) {
        return values && values.customersType === 'COMPANY';
      },
      triggerFields: ['customersType'],
    },
    rules: 'required',
  },
  {
    component: 'Select',
    fieldName: 'legalPersonIdType',
    label: $t('customerManage.form.legalIdType'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.legalIdTypePlaceholder'),
      options: idTypeOptions,
      filterable: true,
      clearable: true,
      style: {
        width: '340px',
      },
    },
    dependencies: {
      show(values: any) {
        return values && values.customersType === 'COMPANY';
      },
      triggerFields: ['customersType'],
    },
    rules: 'required',
  },
  {
    component: 'Input',
    fieldName: 'legalPersonIdNumber',
    label: $t('customerManage.form.legalIdNo'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.legalIdNoPlaceholder'),
      maxlength: 20,
      style: {
        width: '340px',
      },
    },
    dependencies: {
      show(values: any) {
        return values && values.customersType === 'COMPANY';
      },
      triggerFields: ['customersType'],
    },
    rules: 'required',
  },

  {
    component: 'Input',
    fieldName: 'individualBusinessLicenseCode',
    label: $t('customerManage.form.personalCode'),
    componentProps: {
      placeholder: $t('customerManage.form.personalCodePlaceholder'),
      maxlength: 20,
      style: {
        width: '340px',
      },
    },
    dependencies: {
      show(values: any) {
        return values && values.customersType === 'ORGANIZATION';
      },
      triggerFields: ['customersType'],
    },
  },
  {
    component: 'Select',
    fieldName: 'personalIdType',
    label: $t('customerManage.form.personIdType'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.personIdTypePlaceholder'),
      options: idTypeOptions,
      filterable: true,
      clearable: true,
      style: {
        width: '340px',
      },
    },
    dependencies: {
      show(values: any) {
        return values && values.customersType === 'PERSONAL';
      },
      triggerFields: ['customersType'],
    },
    rules: 'required',
  },
  {
    component: 'Input',
    fieldName: 'personalIdNumber',
    label: $t('customerManage.form.personIdNo'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.personIdNoPlaceholder'),
      maxlength: 20,
      style: {
        width: '340px',
      },
    },
    dependencies: {
      show(values: any) {
        return values && values.customersType === 'PERSONAL';
      },
      triggerFields: ['customersType'],
    },
    rules: 'required',
  },
  {
    component: markRaw(ShareholdersTable),
    fieldName: 'shareholderInfos',
    label: $t('customerManage.form.shareholders'),
    defaultValue: [],
    componentProps: {
      idTypeOptions,
    },
    dependencies: {
      show(values: any) {
        return values && values.customersType === 'COMPANY';
      },
      triggerFields: ['customersType'],
    },
  },
];

const [Form, formApi] = useVbenForm({
  schema,
  wrapperClass: 'grid-cols-1',
  commonConfig: {
    labelWidth: 126,
    showMessage: false,
    showFeedback: false,
  },
  resetButtonOptions: {
    content: $t('customerManage.form.cancel'),
  },
  submitButtonOptions: {
    content: $t('customerManage.form.save'),
  },
  handleSubmit,
  handleReset,
});

watch(
  () => props.modelValue,
  (val) => {
    if (val && Object.keys(val).length > 0) {
      nextTick(() => {
        if (formApi.setValues) {
          formApi.setValues(val);
        } else if (formApi.setFieldValue) {
          Object.keys(val).forEach((key) => {
            // 特殊处理股东信息数组
            if (key === 'shareholderInfos' && Array.isArray(val[key])) {
              formApi.setFieldValue(key, val[key]);
            } else {
              formApi.setFieldValue(key, val[key]);
            }
          });
        }
      });
    } else {
      if (formApi.resetForm) {
        formApi.resetForm();
      }
    }
  },
  { immediate: true, deep: true },
);

// 监听 visible 变化，当表单关闭时重置表单
watch(
  () => props.visible,
  (visible) => {
    if (!visible && formApi.resetForm) {
      // 表单关闭时重置表单
      nextTick(() => {
        formApi.resetForm();
      });
    }
  },
);

function handleSubmit(values: any) {
  // 校验股东信息：如果客户类型为公司，股东信息不能为空
  if (values.customersType === 'COMPANY') {
    const shareholderInfos = values.shareholderInfos;
    if (!shareholderInfos || !Array.isArray(shareholderInfos) || shareholderInfos.length === 0) {
      ElMessage.warning($t('customerManage.message.addShareholders'));
      return;
    }
    
    // 检查每个股东信息的必填字段
    const incompleteShareholders = shareholderInfos.filter(shareholder => 
      !shareholder.shareholderName || 
      !shareholder.shareholderIdType || 
      !shareholder.shareholderIdNumber
    );
    
    if (incompleteShareholders.length > 0) {
      ElMessage.warning($t('customerManage.message.completeShareholders'));
      return;
    }
  }
  
  emit('submit', values);
  emit('update:visible', false);
}
function handleReset() {
  if (formApi.resetForm) {
    formApi.resetForm();
  }
  emit('update:visible', false);
}
</script>

<template>
  <div>
    <Form />
  </div>
</template>
<style scoped>
:deep(.pb-6) {
  padding-bottom:20px !important;
}
</style>
