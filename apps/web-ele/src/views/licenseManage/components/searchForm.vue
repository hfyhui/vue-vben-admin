<script setup lang="ts">
import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

const emit = defineEmits(['search']);

const [SearchForm, formApi] = useVbenForm({
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      fieldName: 'customer',
      labelWidth: 40,
      label: $t('licenseManage.form.customer') || '客户',
      componentProps: {
        placeholder: $t('licenseManage.form.customer') || '请输入客户名称',
        style: 'width: 180px;',
      },
    },
    {
      component: 'Select',
      fieldName: 'licenseType',
      labelWidth: 60,
      label: $t('licenseManage.form.licenseType') || '证书类型',
      componentProps: {
        options: [
          { label: $t('licenseManage.form.trial') || '试用', value: 'trial' },
          {
            label: $t('licenseManage.form.official') || '正式',
            value: 'official',
          },
        ],
        placeholder: $t('licenseManage.form.licenseType') || '请选择证书类型',
        allowClear: true,
        style: 'width: 140px;',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'expireTime',
      labelWidth: 60,
      label: $t('licenseManage.form.expireTime') || '到期时间',
      componentProps: {
        placeholder: $t('licenseManage.form.expireTime') || '请选择到期时间',
        type: 'date',
        style: 'width: 160px;',
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

<style lang="less" scoped>
:deep(.search-row-flex) {
  display: flex !important;
  flex-direction: row !important;
  align-items: flex-end;
  gap: 16px;
}
:deep(.search-row-flex .vben-form-item) {
  margin-bottom: 0 !important;
}
:deep(.pb-6) {
  padding-bottom: 0 !important;
}
</style>
