<script setup lang="ts">
import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

const emit = defineEmits(['search']);

const [SearchForm, formApi] = useVbenForm({
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      fieldName: 'customerName',
      labelWidth: 60,
      label: $t('licenseManage.search.customerName') || '客户名称',
      componentProps: {
        placeholder:
          $t('licenseManage.search.customerName') || '请输入客户名称',
        style: 'width: 180px;',
        clearable: true,
        onKeyup: (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            formApi?.submitForm();
          }
        },
      },
    },
    {
      component: 'Select',
      fieldName: 'authorizationType',
      labelWidth: 60,
      label: $t('licenseManage.form.licenseType') || '证书类型',
      componentProps: {
        options: [
          { label: $t('licenseManage.form.trial') || '试用', value: 'TRIAL' },
          {
            label: $t('licenseManage.form.official') || '正式',
            value: 'OFFICIALLY',
          },
        ],
        placeholder: $t('licenseManage.form.licenseType') || '请选择证书类型',
        clearable: true,
        style: 'width: 180px;',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'expirationTimes',
      labelWidth: 60,
      label: $t('licenseManage.form.expireTime') || '过期时间',
      componentProps: {
        type: 'datetimerange',
        rangeSeparator: '至',
        startPlaceholder: '开始时间',
        endPlaceholder: '结束时间',
        placeholder: '请选择时间范围',
        format: 'YYYY-MM-DD HH:mm:ss',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        style: 'width: 360px;',
      },
    },
  ],
  handleSubmit(values) {
    emit('search', values);
  },
  handleReset() {
    if (formApi && formApi.resetForm) formApi.resetForm();
    emit('search', {});
  },
  submitButtonOptions: { content: $t('common.search') || '查询' },
  resetButtonOptions: { content: $t('common.reset') || '重置' },
  wrapperClass: 'search-row-flex',
});
</script>

<template>
  <SearchForm />
</template>

<style scoped>
:deep(.search-row-flex) {
  display: flex !important;
  flex-direction: row !important;
  align-items: flex-end;
  gap: 16px;
}
:deep(.search-row-flex .vben-form-item) {
  margin-bottom: 0 !important;
}
</style>
