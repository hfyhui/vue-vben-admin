<template>
  <div
    ref="renderContainer"
    class="css-important"
    :class="classes"
    :style="containerStyle"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @contextmenu="onContextMenu"
    @pointerleave="onPointerLeave"
    @wheel="onWheel"
    @pointerenter="onPointerEnter"
  />
</template>

<script setup>
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

function onPointerDown(event) {
  emit('pointerdown', event);
}
function onPointerMove(event) {
  emit('pointermove', event);
}
function onPointerUp(event) {
  emit('pointerup', event);
}
function onContextMenu(event) {
  emit('contextmenu', event);
}
function onWheel(event) {
  emit('wheel', event);
}
function onPointerEnter(event) {
  emit('pointerenter', event);
}
function onPointerLeave(event) {
  emit('pointerleave', event);
}
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
