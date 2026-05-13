<template>
  <div
    ref="renderContainer"
    class="css-important"
    :class="classes"
    :style="containerStyle"
    @pointerdown="emit('pointerdown', $event)"
    @pointermove="emit('pointermove', $event)"
    @pointerup="emit('pointerup', $event)"
    @pointercancel="emit('pointerup', $event)"
    @contextmenu="emit('contextmenu', $event)"
    @pointerleave="emit('pointerleave', $event)"
    @wheel="emit('wheel', $event)"
    @pointerenter="emit('pointerenter', $event)"
  />
</template>

<script setup>
import { ref } from 'vue';

defineOptions({ name: 'RenderContainer' });

defineProps({
  classes: {
    type: Object,
    default: () => ({}),
  },
  containerStyle: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  'pointerdown',
  'pointermove',
  'pointerup',
  'contextmenu',
  'wheel',
  'pointerenter',
  'pointerleave',
]);

const renderContainer = ref(null);
defineExpose({ renderContainer });
</script>

<style lang="less" scoped>
:fullscreen div {
  display: flex;
  align-items: center;
  justify-content: center;
}
.css-important {
  width: 100% !important;
  height: 100% !important;

  :deep(canvas) {
    width: 100% !important;
    height: auto !important;
  }
}
</style>
