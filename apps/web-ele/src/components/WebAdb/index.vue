<script setup>
import { ref } from 'vue';

import RenderContainer from '#/components/WebAdb/RenderContainer/index.vue';

import { useWebAdbScrcpy } from './useWebAdbScrcpy';

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

const emit = defineEmits(['messageSent', 'connection-state']);

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
  executeKeyAction,
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
  occupyInfo,
  dblclick,
  getDevicesStatus,
} = useWebAdbScrcpy(props, emit, renderRef);

function aaa() {
  console.log('aaa');
}

defineExpose({
  connectionState,
  reconnect,
  handlePressKey,
  executeKeyAction,
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

<template>
  <div
    class="scrcpy_box"
    :class="{
      scrcpy_box_embedded: embedded,
      scrcpy_box_embedded_large: embedded && largeScreen,
    }"
  >
    <!-- Loading -->
    <div
      v-if="connectionState !== 'connected'"
      class="loading-container"
      :class="{ 'loading-container--large': largeScreen }"
    >
      <template v-if="connectionState === 'connectedTrue'">
        <div
          class="status-container"
          @click.stop="aaa"
          @dblclick.stop="dblclick"
        >
          <template v-if="occupyInfo.action == 'timeout'">
            <div class="status-icon timeout">⏰</div>
            <div class="status-text">
              {{ $t('webadb.scrcpy.deviceTimeout') }}
            </div>
            <div class="status-action">
              {{ $t('webadb.scrcpy.doubleClickToReconnect') }}
            </div>
          </template>
          <template v-else>
            <div class="status-icon occupied">👤</div>
            <div class="status-text">
              {{ occupyInfo.userName }} <br />
              {{ $t('webadb.scrcpy.userIsUsing') }}
            </div>
            <div class="status-action">
              {{ $t('webadb.scrcpy.doubleClickToOccupy') }}
            </div>
          </template>
        </div>
      </template>
      <template v-else>
        <div
          class="loading-spinner"
          v-show="
            !(
              (device && device.deviceStatus === 'OFFLINE') ||
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
      </template>
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

<style lang="less" scoped>
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
  inset: 0;
  z-index: 2;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: #000;
}

.loading-spinner {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  margin: 0 auto 10px;
  border: 2px solid rgb(64 158 255 / 35%);
  border-top-color: #409eff;
  border-radius: 50%;
  animation: webadb-spin 0.85s linear infinite;
}

.loading-container--large {
  padding: 20px;
}

.loading-container--large .loading-spinner {
  width: 40px;
  height: 40px;
  margin-bottom: 14px;
}

.loading-text {
  width: 100%;
  font-size: 12px;
  line-height: 1.4;
  color: rgb(255 255 255 / 55%);
  text-align: center;
}

.loading-container--large .loading-text {
  font-size: 14px;
}

.scrcpy_box_embedded:not(.scrcpy_box_embedded_large) .loading-container {
  align-items: center;
  justify-content: center;
  padding: 0;
  background: #ececec;
}

.scrcpy_box_embedded:not(.scrcpy_box_embedded_large) .loading-text {
  color: #6f7684;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.2;
  text-align: center;
}

.status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  width: 100%;
  height: 100%;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.status-icon {
  font-size: 48px;
  margin-bottom: 8px;

  &.timeout {
    animation: pulse 2s ease-in-out infinite;
  }

  &.occupied {
    animation: bounce 1s ease-in-out infinite;
  }
}

.status-text {
  color: #fff;
  font-weight: 500;
  text-align: center;
  line-height: 1.4;
}

.status-action {
  color: #409eff;
  font-size: 14px;
  font-weight: 600;
  margin-top: 4px;
  padding: 6px 16px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 20px;
  border: 1px solid rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(64, 158, 255, 0.2);
    border-color: rgba(64, 158, 255, 0.5);
  }
}

.loading-container--large {
  .status-container {
    padding: 30px;

    .status-icon {
      font-size: 64px;
    }

    .status-text {
      font-size: 18px;
    }

    .status-action {
      font-size: 16px;
      padding: 8px 24px;
    }
  }
}

@keyframes webadb-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
</style>
