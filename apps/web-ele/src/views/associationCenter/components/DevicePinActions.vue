<script setup lang="ts">
defineProps<{
  pinnedActive: boolean;
}>();

const emit = defineEmits<{
  (e: 'togglePin'): void;
}>();

function handlePinSelected() {
  emit('togglePin');
}
</script>

<template>
  <el-button :type="pinnedActive ? 'info' : 'warning'" @click="handlePinSelected">
    {{ pinnedActive ? '取消置顶' : '置顶' }}
  </el-button>
</template>

<style scoped>
</style>
