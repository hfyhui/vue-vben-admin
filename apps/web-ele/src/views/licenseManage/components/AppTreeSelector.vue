<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ modelValue?: string[] }>();
const emit = defineEmits(['update:modelValue']);

const treeData = [
  {
    label: '本地媒体',
    value: 'local',
    children: [
      { label: '校区库房', value: 'local-1' },
      { label: '内容中心', value: 'local-2' },
      { label: '后台管理', value: 'local-3' },
    ],
  },
  {
    label: '云平台',
    value: 'cloud',
    children: [
      { label: '系统管理', value: 'cloud-1' },
      { label: '资源管理', value: 'cloud-2' },
      { label: '用户', value: 'cloud-3' },
      { label: '权限管理', value: 'cloud-4' },
    ],
  },
  { label: 'SEO', value: 'seo' },
];

const checked = ref<string[]>(props.modelValue || []);
watch(
  () => props.modelValue,
  (v) => {
    checked.value = v || [];
  },
);

function onChange(val: string[]) {
  emit('update:modelValue', val);
}
</script>

<template>
  <el-tree
    :data="treeData"
    show-checkbox
    node-key="value"
    :default-checked-keys="checked"
    :props="{ label: 'label', children: 'children' }"
    @check="(_, { checkedKeys }) => onChange(checkedKeys)"
    style="width: 100%"
  />
</template>
