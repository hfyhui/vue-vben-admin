<script setup lang="ts">
import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

const emit = defineEmits(['search']);

const [SearchForm, formApi] = useVbenForm({
  layout: 'horizontal',
  schema: [
    {
      component: 'Input',
      fieldName: 'applicationName',
      labelWidth: 80,
      label: $t('applicationManage.search.applicationName'),
      componentProps: {
        placeholder: $t('applicationManage.search.applicationNamePlaceholder'),
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
      fieldName: 'applicationStatus',
      labelWidth: 60,
      label: $t('applicationManage.search.status'),
      componentProps: {
        options: [
          { label: $t('common.enable') , value: 0 },
          { label: $t('common.disable') , value: 1 },
        ],
        placeholder: $t('applicationManage.search.statusPlaceholder') ,
        clearable: true,
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
  submitButtonOptions: { content: $t('common.search') },
  resetButtonOptions: { content: $t('common.reset') },
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
