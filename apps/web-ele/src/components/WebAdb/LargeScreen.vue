<template>
  <div class="webadb-large-screen">
    <div class="webadb-large-screen__panel">
      <div class="webadb-large-screen__header">
        <div class="header-top">
          <div class="header-left">
            <span
              v-if="device?.color"
              class="status-circle"
              :style="{ backgroundColor: device.color }"
            />
            <span class="device-title">{{ deviceTitle }}</span>
          </div>
          <div class="header-center">
            <span class="device-ip">{{ deviceIp }}</span>
          </div>
          <button
            v-if="showClose"
            type="button"
            class="close-btn"
            aria-label="close"
            @click="emit('close')"
          >
            ×
          </button>
        </div>
      </div>

      <div class="webadb-large-screen__body" :style="bodyStyle">
        <WebAdb
          v-if="normalizedDevice && normalizedDevice.serial"
          ref="webAdbRef"
          :device="normalizedDevice"
          embedded
          largeScreen
          :auto-go-url="autoGoUrl"
          @message-sent="messageSent"
        />
      </div>

      <DeviceOperateButton
        v-if="showFooterButtons && isWebAdbConnected"
        @press-key="handlePressKey"
        @reconnect="handleReconnect"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, unref } from 'vue';

import WebAdb from '#/components/WebAdb/index.vue';
import DeviceOperateButton from '#/components/WebAdb/DeviceOperateButton/index.vue';

defineOptions({ name: 'WebAdbLargeScreen' });

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  width: {
    type: Number,
    default: 360,
  },
  autoGoUrl: {
    type: Boolean,
    default: false,
  },
  showClose: {
    type: Boolean,
    default: true,
  },
  showFooterButtons: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['close', 'messageSent']);

const webAdbRef = ref(null);

const bodyStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${Math.ceil(props.width * 1.77)}px`,
}));

const normalizedDevice = computed(() => {
  if (!props.device) return null;
  return {
    ...props.device,
    serial: props.device.serial || props.device.deviceIp || props.device.connIp || '',
  };
});

const deviceTitle = computed(
  () =>
    props.device?.deviceAliases ||
    props.device?.deviceIdx ||
    props.device?.serial ||
    '-',
);

const deviceIp = computed(() => props.device?.deviceIp || props.device?.connIp || '-');

const isWebAdbConnected = computed(() => {
  const inst = webAdbRef.value;
  if (!inst) return false;
  return unref(inst.connectionState) === 'connected';
});

function getWebAdbInstance() {
  return webAdbRef.value || null;
}

async function handleReconnect() {
  const instance = getWebAdbInstance();
  if (instance?.reconnect) {
    await instance.reconnect();
  }
}

function handlePressKey(payload) {
  const instance = getWebAdbInstance();
  if (instance?.handlePressKey) {
    instance.handlePressKey(payload);
  }
}

function messageSent(buffer) {
  emit('messageSent', buffer);
}

defineExpose({
  getWebAdbInstance,
});
</script>

<style scoped lang="less">
// 参考大屏：深紫顶栏、顶角圆角、内容区白底、IP 水平居中
@primary-bgc: #5c3d52;

.webadb-large-screen {
  display: inline-flex;
  position: relative;
}

.webadb-large-screen__panel {
  border-radius: 12px 12px 0 0;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: #fff;
}

.webadb-large-screen__header {
  position: relative;
  min-height: 52px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: @primary-bgc;
  color: #fff;
  padding: 6px 8px 4px 10px;
  gap: 2px;
}

.header-top {
  position: relative;
  min-height: 24px;
  width: 100%;
  display: flex;
  align-items: center;
}

.header-left {
  z-index: 1;
  min-width: 0;
  max-width: 40%;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 1;
}

.status-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.device-title {
  font-size: 16px;
  line-height: 1.2;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  max-width: 38%;
  pointer-events: none;
  text-align: center;
}

.device-ip {
  font-size: 16px;
  font-weight: 500;
  opacity: 0.95;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  border: 0;
  outline: none;
  position: absolute;
  top: -12px;
  right: -10px;
  width: 38px;
  height: 38px;
  cursor: pointer;
  border-radius: 4px;
  color: #fff;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  z-index: 2;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.webadb-large-screen__body {
  background: #fff;
}

.webadb-large-screen__body :deep(.scrcpy_box) {
  min-height: 0;
  width: 100%;
  height: 100%;
}

/* 与大屏白底一致：连接中遮罩也用白底 */
.webadb-large-screen__body :deep(.loading-container) {
  background-color: #fff !important;
}

.webadb-large-screen__body :deep(.loading-container--large .loading-text) {
  color: rgba(0, 0, 0, 0.55);
}

</style>
