<script setup lang="ts">
defineProps<{
  top?: number;
  left?: number;
  width?: number;
  height?: number;
}>();
</script>

<template>
  <div
    class="rectangle-multiple"
    :style="{
      top: `${top || 0}px`,
      left: `${left || 0}px`,
      width: `${width || 0}px`,
      height: `${height || 0}px`,
    }"
  />
</template>

<style scoped>
.rectangle-multiple {
  position: absolute;
  border: 1px dashed #31676f;
  background-color: rgba(12, 206, 234, 0.16);
  pointer-events: none;
}
</style>
