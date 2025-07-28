<script lang="ts" setup>
import { h, watch } from 'vue';

import { useVbenForm } from '#/adapter/form';

import ShareholdersTable from './ShareholdersTable.vue';

const props = defineProps<{ modelValue?: any; visible: boolean }>();
const emit = defineEmits(['update:visible', 'submit']);

const idTypeOptions = [
  '居民身份证',
  '社会保障卡',
  '港澳证',
  '户口簿',
  '军官证/士兵证/文职证',
  '武警证',
  '退役军人优待证',
  '残疾人证',
  '利比里亚护照',
  '护照',
  '港澳居民来往内地通行证',
  '台湾居民来往大陆通行证',
  '外国人永久居留身份证',
  '外国人入境许可证',
].map((label) => ({ label, value: label }));

const schema = [
  // 客户名称
  {
    component: 'Input',
    fieldName: 'name',
    label: '客户名称',
    required: true,
    componentProps: { placeholder: '请输入客户名称', maxlength: 50 },
    rules: 'required',
  },
  // 客户类型
  {
    component: 'RadioGroup',
    fieldName: 'type',
    label: '客户类型',
    defaultValue: 'company',
    componentProps: {
      options: [
        { label: '公司', value: 'company' },
        { label: '组织', value: 'org' },
        { label: '个人', value: 'person' },
      ],
    },
  },
  // 公司：社会统一信用代码
  {
    component: 'Input',
    fieldName: 'creditCode',
    label: '社会统一信用代码',
    componentProps: { placeholder: '请输入社会统一信用代码', maxlength: 20 },
    dependencies: {
      show(values: any) {
        return values && values.type === 'company';
      },
      triggerFields: ['type'],
    },
  },
  // 公司：法人姓名
  {
    component: 'Input',
    fieldName: 'legalName',
    label: '法人姓名',
    required: true,
    componentProps: { placeholder: '请输入法人姓名', maxlength: 20 },
    dependencies: {
      show(values: any) {
        return values && values.type === 'company';
      },
      triggerFields: ['type'],
    },
    rules: 'required',
  },
  // 公司：法人证件类型
  {
    component: 'Select',
    fieldName: 'legalIdType',
    label: '法人证件类型',
    required: true,
    componentProps: {
      placeholder: '请选择证件类型',
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
  // 公司：法人证件号码
  {
    component: 'Input',
    fieldName: 'legalIdNo',
    label: '法人证件号码',
    required: true,
    componentProps: { placeholder: '请输入法人证件号码', maxlength: 20 },
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
    label: '股东信息',
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
  // 组织：个体工商经营者代码
  {
    component: 'Input',
    fieldName: 'personalCode',
    label: '个体工商经营者代码',
    componentProps: { placeholder: '请输入个体工商经营者代码', maxlength: 20 },
    dependencies: {
      show(values: any) {
        return values && values.type === 'org';
      },
      triggerFields: ['type'],
    },
  },
  // 个人：证件类型
  {
    component: 'Select',
    fieldName: 'personIdType',
    label: '证件类型',
    required: true,
    componentProps: {
      placeholder: '请选择证件类型',
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
  // 个人：证件号码
  {
    component: 'Input',
    fieldName: 'personIdNo',
    label: '证件号码',
    required: true,
    componentProps: { placeholder: '请输入证件号码', maxlength: 20 },
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
    labelWidth: 126, // 这里设置全局label宽度
  },
  resetButtonOptions: {
    content: '取消',
  },
  submitButtonOptions: {
    content: '保存',
  },
  // 提交函数
  handleSubmit,
  //   重置回调
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
</script>

<template>
  <ElDialog
    :model-value="props.visible"
    :title="props.modelValue && props.modelValue.id ? '编辑客户' : '新增客户'"
    width="940px"
  >
    <Form />
  </ElDialog>
</template>
