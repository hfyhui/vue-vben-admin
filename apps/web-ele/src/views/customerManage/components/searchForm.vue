<script setup lang="ts">
import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

const emit = defineEmits(['search']);

const [SearchForm, formApi] = useVbenForm({
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      fieldName: 'name',
      labelWidth: 60,
      label: $t('customerManage.search.customerName') || '客户名称',
      componentProps: {
        placeholder:
          $t('customerManage.search.customerName') || '请输入客户名称',
        style: 'width: 180px;',
      },
    },
    {
      component: 'Select',
      fieldName: 'type',
      labelWidth: 60,
      label: $t('customerManage.search.customerType') || '客户类型',
      componentProps: {
        options: [
          {
            label: $t('customerManage.types.company') || '企业',
            value: 'company',
          },
          { label: $t('customerManage.types.org') || '组织', value: 'org' },
          {
            label: $t('customerManage.types.person') || '个人',
            value: 'person',
          },
        ],
        placeholder:
          $t('customerManage.search.customerType') || '请选择客户类型',
        allowClear: true,
        style: 'width: 140px;',
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
  gap: 16px;
  align-items: flex-end;
}

:deep(.search-row-flex .vben-form-item) {
  margin-bottom: 0 !important;
}
</style>
