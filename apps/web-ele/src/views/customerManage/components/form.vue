<script lang="ts" setup>
import { h, watch } from 'vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import ShareholdersTable from './ShareholdersTable.vue';

const props = defineProps<{ modelValue?: any; visible: boolean }>();
const emit = defineEmits(['update:visible', 'submit']);

const idTypeOptions = [
  $t('customerManage.form.idTypeIdCard'),
  $t('customerManage.form.idTypeSocialCard'),
  $t('customerManage.form.idTypeHKMacao'),
  $t('customerManage.form.idTypeHousehold'),
  $t('customerManage.form.idTypeOfficer'),
  $t('customerManage.form.idTypeArmedPolice'),
  $t('customerManage.form.idTypeVeteran'),
  $t('customerManage.form.idTypeDisability'),
  $t('customerManage.form.idTypeLiberiaPassport'),
  $t('customerManage.form.idTypePassport'),
  $t('customerManage.form.idTypeHKMacaoMainland'),
  $t('customerManage.form.idTypeTaiwanMainland'),
  $t('customerManage.form.idTypePermanentResident'),
  $t('customerManage.form.idTypeForeignerPermit'),
].map((label) => ({ label, value: label }));

const schema = [
  {
    component: 'Input',
    fieldName: 'name',
    label: $t('customerManage.form.name'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.namePlaceholder'),
      maxlength: 50,
    },
    rules: 'required',
  },
  {
    component: 'RadioGroup',
    fieldName: 'type',
    label: $t('customerManage.form.type'),
    defaultValue: 'company',
    componentProps: {
      options: [
        { label: $t('customerManage.types.company'), value: 'company' },
        { label: $t('customerManage.types.org'), value: 'org' },
        { label: $t('customerManage.types.person'), value: 'person' },
      ],
    },
  },
  {
    component: 'Input',
    fieldName: 'creditCode',
    label: $t('customerManage.form.creditCode'),
    componentProps: {
      placeholder: $t('customerManage.form.creditCodePlaceholder'),
      maxlength: 20,
    },
    dependencies: {
      show(values: any) {
        return values && values.type === 'company';
      },
      triggerFields: ['type'],
    },
  },
  {
    component: 'Input',
    fieldName: 'legalName',
    label: $t('customerManage.form.legalName'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.legalNamePlaceholder'),
      maxlength: 20,
    },
    dependencies: {
      show(values: any) {
        return values && values.type === 'company';
      },
      triggerFields: ['type'],
    },
    rules: 'required',
  },
  {
    component: 'Select',
    fieldName: 'legalIdType',
    label: $t('customerManage.form.legalIdType'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.legalIdTypePlaceholder'),
      options: idTypeOptions,
      filterable: true,
      clearable: true,
    },
    dependencies: {
      show(values: any) {
        return values && values.type === 'company';
      },
      triggerFields: ['type'],
    },
    rules: 'required',
  },
  {
    component: 'Input',
    fieldName: 'legalIdNo',
    label: $t('customerManage.form.legalIdNo'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.legalIdNoPlaceholder'),
      maxlength: 20,
    },
    dependencies: {
      show(values: any) {
        return values && values.type === 'company';
      },
      triggerFields: ['type'],
    },
    rules: 'required',
  },
  {
    component: h(ShareholdersTable),
    fieldName: 'shareholders',
    label: $t('customerManage.form.shareholders'),
    defaultValue: [],
    componentProps: {
      idTypeOptions,
    },
    dependencies: {
      show(values: any) {
        return values && values.type === 'company';
      },
      triggerFields: ['type'],
    },
  },
  {
    component: 'Input',
    fieldName: 'personalCode',
    label: $t('customerManage.form.personalCode'),
    componentProps: {
      placeholder: $t('customerManage.form.personalCodePlaceholder'),
      maxlength: 20,
    },
    dependencies: {
      show(values: any) {
        return values && values.type === 'org';
      },
      triggerFields: ['type'],
    },
  },
  {
    component: 'Select',
    fieldName: 'personIdType',
    label: $t('customerManage.form.personIdType'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.personIdTypePlaceholder'),
      options: idTypeOptions,
      filterable: true,
      clearable: true,
    },
    dependencies: {
      show(values: any) {
        return values && values.type === 'person';
      },
      triggerFields: ['type'],
    },
    rules: 'required',
  },
  {
    component: 'Input',
    fieldName: 'personIdNo',
    label: $t('customerManage.form.personIdNo'),
    required: true,
    componentProps: {
      placeholder: $t('customerManage.form.personIdNoPlaceholder'),
      maxlength: 20,
    },
    dependencies: {
      show(values: any) {
        return values && values.type === 'person';
      },
      triggerFields: ['type'],
    },
    rules: 'required',
  },
];

const [Form, formApi] = useVbenForm({
  schema,
  wrapperClass: 'grid-cols-1',
  commonConfig: {
    labelWidth: 126,
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
    if (val) {
      if (formApi.setFieldValue) {
        Object.keys(val).forEach((key) => {
          // 特殊处理股东信息数组
          if (key === 'shareholders' && Array.isArray(val[key])) {
            formApi.setFieldValue(key, val[key]);
          } else {
            formApi.setFieldValue(key, val[key]);
          }
        });
      } else if (formApi.setValues) {
        formApi.setValues(val);
      }
    } else {
      if (formApi.resetForm) {
        formApi.resetForm();
      }
    }
  },
  { immediate: true },
);

function handleSubmit(values: any) {
  // 验证股东信息
  if (values.type === 'company' && values.shareholders) {
    // 过滤掉空的股东信息
    values.shareholders = values.shareholders.filter(
      (shareholder: any) =>
        shareholder.name && shareholder.idType && shareholder.idNo,
    );
  }

  emit('submit', values);
  emit('update:visible', false);
}
function handleReset() {
  if (formApi.resetForm) {
    formApi.resetForm();
    emit('update:visible', false);
  }
}

function onDialogClose() {
  if (formApi.resetForm) {
    formApi.resetForm();
  }
  emit('update:visible', false);
}
</script>

<template>
  <ElDialog
    :model-value="props.visible"
    :title="
      props.modelValue && props.modelValue.id
        ? $t('customerManage.form.edit')
        : $t('customerManage.form.add')
    "
    width="940px"
    @close="onDialogClose"
  >
    <Form />
  </ElDialog>
</template>
