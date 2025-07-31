<script lang="ts" setup>
import { h } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElCheckbox, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { getAllMenusApi } from '#/api';

defineOptions({
  name: 'FormModelDemo',
});

const [Form, formApi] = useVbenForm({
  handleSubmit: onSubmit,
  schema: [
    {
      component: 'IconPicker',
      fieldName: 'icon',
      label: 'IconPicker',
    },
    {
      // 组件需要在 #/adapter.ts内注册，并加上类型
      component: 'ApiSelect',
      // 对应组件的参数
      componentProps: {
        // 菜单接口转options格式
        afterFetch: (data: { name: string; path: string }[]) => {
          return data.map((item: any) => ({
            label: item.name,
            value: item.path,
          }));
        },
        // 菜单接口
        api: getAllMenusApi,
      },
      // 字段名
      fieldName: 'api',
      // 界面显示的label
      label: 'ApiSelect',
    },
    {
      component: 'ApiTreeSelect',
      // 对应组件的参数
      componentProps: {
        // 菜单接口
        api: getAllMenusApi,
        childrenField: 'children',
        // 菜单接口转options格式
        labelField: 'name',
        valueField: 'path',
      },
      // 字段名
      fieldName: 'apiTree',
      // 界面显示的label
      label: 'ApiTreeSelect',
    },
    {
      component: 'Input',
      fieldName: 'string',
      label: 'String',
    },
    {
      component: 'InputNumber',
      fieldName: 'number',
      label: 'Number',
    },
    {
      component: 'RadioGroup',
      fieldName: 'radio',
      label: 'Radio',
      componentProps: {
        options: [
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
          { value: 'D', label: 'D' },
          { value: 'E', label: 'E' },
        ],
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'radioButton',
      label: 'RadioButton',
      componentProps: {
        isButton: true,
        options: ['A', 'B', 'C', 'D', 'E', 'F'].map((v) => ({
          value: v,
          label: `选项${v}`,
        })),
      },
    },
    {
      component: 'CheckboxGroup',
      fieldName: 'checkbox',
      label: 'Checkbox',
      componentProps: {
        options: ['A', 'B', 'C'].map((v) => ({ value: v, label: `选项${v}` })),
      },
    },
    {
      component: 'CheckboxGroup',
      fieldName: 'checkbox1',
      label: 'Checkbox1',
      renderComponentContent: () => {
        return {
          default: () => {
            return ['A', 'B', 'C', 'D'].map((v) =>
              h(ElCheckbox, { label: v, value: v }),
            );
          },
        };
      },
    },
    {
      component: 'CheckboxGroup',
      fieldName: 'checkbotton',
      label: 'CheckBotton',
      componentProps: {
        isButton: true,
        options: [
          { value: 'A', label: '选项A' },
          { value: 'B', label: '选项B' },
          { value: 'C', label: '选项C' },
        ],
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'date',
      label: 'Date',
    },
    {
      component: 'Select',
      fieldName: 'select',
      label: 'Select',
      componentProps: {
        filterable: true,
        options: [
          { value: 'A', label: '选项A' },
          { value: 'B', label: '选项B' },
          { value: 'C', label: '选项C' },
        ],
      },
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  // appendToMain: false, // 是否挂载到内容区域（默认挂载到body） boolean，默认 false
  // connectedComponent: undefined, // 连接另一个Modal组件 Component
  // destroyOnClose: false, // 关闭时销毁 boolean，默认 false
  title: '内嵌表单示例', // 标题 string | slot
  // titleTooltip: undefined, // 标题提示信息 string | slot
  // description: undefined, // 描述信息 string | slot
  // isOpen: false, // 弹窗打开状态 boolean，默认 false
  // loading: false, // 弹窗加载状态 boolean，默认 false
  // fullscreen: false, // 全屏显示 boolean，默认 false
  fullscreenButton: true, // 显示全屏按钮 boolean，默认 true
  draggable: true, // 可拖拽 boolean，默认 false
  // closable: true, // 显示关闭按钮 boolean，默认 true
  // centered: true, // 弹窗居中显示 boolean，默认 false
  // modal: true, // 显示遮罩 boolean，默认 true
  // header: true, // 显示header boolean，默认 true
  // footer: true, // 显示footer boolean | slot，默认 true
  // confirmDisabled: false, // 禁用确认按钮 boolean，默认 false
  // confirmLoading: false, // 确认按钮loading状态 boolean，默认 false
  // closeOnClickModal: true, // 点击遮罩关闭弹窗 boolean，默认 true
  // closeOnPressEscape: true, // esc 关闭弹窗 boolean，默认 true
  // confirmText: '确认', // 确认按钮文本 string | slot，默认 '确认'
  // cancelText: '取消', // 取消按钮文本 string | slot，默认 '取消'
  // showCancelButton: true, // 显示取消按钮 boolean，默认 true
  // showConfirmButton: true, // 显示确认按钮 boolean，默认 true
  // class: undefined, // modal的class，宽度通过这个配置 string
  // contentClass: undefined, // modal内容区域的class string
  // footerClass: undefined, // modal底部区域的class string
  // headerClass: undefined, // modal顶部区域的class string
  // bordered: false, // 是否显示border boolean，默认 false
  // zIndex: 1000, // 弹窗的ZIndex层级 number，默认 1000
  // overlayBlur: undefined, // 遮罩模糊度 number
  // animationType: 'slide', // 动画类型（'slide' | 'scale'）string，默认 'slide'
  // submitting: false, // 标记为提交中，锁定弹窗当前状态 boolean，默认 false
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    await formApi.validateAndSubmitForm();
    // modalApi.close(); // 注释掉时因为先触发submit方法，然后触发了锁定状态，此时弹窗状态为loading。成功后会关闭
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const { values } = modalApi.getData<Record<string, any>>();
      if (values) {
        formApi.setValues(values);
      }
    }
  },
});

function onSubmit(values: Record<string, any>) {
  // 保存消息实例
  const loadingMessage = ElMessage({
    message: '正在提交中...',
    type: 'loading',
    duration: 0, // 设置为0表示不自动关闭
  });

  modalApi.lock();
  console.warn(values); // log

  setTimeout(() => {
    modalApi.close();
    // 手动关闭加载消息
    loadingMessage.close();

    ElMessage.success({
      message: `提交成功`,
      duration: 2 * 1000,
    });
  }, 1500);
}
</script>

<template>
  <Modal class="w-[1000px]"> <Form /> </Modal>
</template>
<style lang="scss" scoped></style>
