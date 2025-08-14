<script setup lang="ts">
import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

// 定义 props
const props = defineProps<{
  customerTypes: any[];
}>();
const emit = defineEmits(['search']);

const [SearchForm, formApi] = useVbenForm({
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      fieldName: 'customersName',
      labelWidth: 60,
      label: $t('customerManage.search.customerName') || '客户名称',
      componentProps: {
        placeholder:
          $t('customerManage.search.customerName') || '请输入客户名称',
        style: 'width: 180px;',
        onKeyup: (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            formApi?.submitForm();
          }
        },
      },
    },
    {
      component: 'Select',
      fieldName: 'customersType',
      labelWidth: 60,
      label: $t('customerManage.search.customerType') || '客户类型',
      componentProps: {
        options:
          props.customerTypes?.map((item: any) => ({
            label: item.content,
            value: item.name,
          })) || [],
        placeholder:
          $t('customerManage.search.customerType') || '请选择客户类型',
        allowClear: true,
        style: 'width: 180px;',
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
