<template>
  <div class="scrcpy_box" :class="{ scrcpy_box_embedded: embedded }">
    <!-- Loading -->
    <div
      v-if="connectionState !== 'connected'"
      class="loading-container"
      :class="{ 'loading-container--large': largeScreen }"
    >
      <div
        class="loading-spinner"
        v-show="
          !(
            (device && device.deviceStatus == 'OFFLINE') ||
            (device && !device.connIp && device.deviceStatus === 'ONLINE')
          )
        "
      ></div>
      <div class="loading-text">
        {{
          device && device.deviceStatus === 'OFFLINE'
            ? $t('webadb.scrcpy.deviceOffline')
            : device && !device.connIp && device.deviceStatus === 'ONLINE'
              ? $t('webadb.scrcpy.noConnIp')
              : $t('webadb.scrcpy.connectingDevice')
        }}
      </div>
    </div>
    <RenderContainer
      ref="renderRef"
      :classes="classes"
      :container-style="containerStyle"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @contextmenu="handleContextMenu"
      @wheel="handleWheel"
      @pointerenter="handlePointerEnter"
      @pointerleave="handlePointerLeave"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';

import RenderContainer from '#/components/WebAdb/RenderContainer/index.vue';

import { useWebAdbScrcpy } from './useWebAdbScrcpy.js';

defineOptions({ name: 'WebAdb' });

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  embedded: {
    type: Boolean,
    default: false,
  },
  largeScreen: {
    type: Boolean,
    default: false,
  },
  autoGoUrl: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['messageSent']);

const renderRef = ref(null);

const {
  classes,
  connectionState,
  containerStyle,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerLeave,
  handleContextMenu,
  handleWheel,
  handlePointerEnter,
  reconnect,
  handlePressKey,
  screenshot,
  screenshotToAlbum,
  volumeFn,
  rotateFn,
  setSizeFn,
  restoreResolution,
  clearTasks,
  openSetting,
  openApp,
  goUrl,
} = useWebAdbScrcpy(props, emit, renderRef);

defineExpose({
  connectionState,
  reconnect,
  handlePressKey,
  screenshot,
  screenshotToAlbum,
  volumeFn,
  rotateFn,
  setSizeFn,
  restoreResolution,
  clearTasks,
  openSetting,
  openApp,
  goUrl,
});
</script>

<style lang="less" scoped>
// Loading????
.scrcpy_box {
  position: relative;
  min-height: 400px;

  &.scrcpy_box_embedded {
    min-height: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.loading-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(245, 245, 245, 1);
  z-index: 10;

  &.loading-container--large {
    .loading-spinner {
      width: 60px;
      height: 60px;
      border-width: 6px;
      margin-bottom: 24px;
    }

    .loading-text {
      font-size: 18px;
      color: rgba(0, 0, 0, 0.65);
    }
  }
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f0f0f0;
  border-top: 2px solid #1890ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 6px;
}

.loading-text {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
