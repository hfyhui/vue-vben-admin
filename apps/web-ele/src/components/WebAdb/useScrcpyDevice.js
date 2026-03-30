import {
  AndroidKeyCode,
  AndroidKeyEventAction,
  AndroidMotionEventButton,
} from '@yume-chan/scrcpy';
import { computed, ref } from 'vue';

import { useScrcpyStore } from '#/store/scrcpy';

export function useScrcpyDevice(deviceRef, emit) {
  const store = useScrcpyStore();

  const MOUSE_EVENT_BUTTON_TO_ANDROID_BUTTON = [
    AndroidMotionEventButton.Primary,
    AndroidMotionEventButton.Tertiary,
    AndroidMotionEventButton.Secondary,
    AndroidMotionEventButton.Back,
    AndroidMotionEventButton.Forward,
  ];

  /** WebSocket 直连模式下未使用，保留与 mixin 一致 */
  const deviceClient = ref(null);

  function serialKey() {
    const d = deviceRef.value;
    return d?.serial || d?.deviceIp || '';
  }

  function getDeviceStore() {
    return store.deviceSockets[serialKey()] || null;
  }

  function setDeviceSocket(socket) {
    const d = deviceRef.value;
    if (d) {
      store.setDeviceSocket(d, socket);
    }
  }

  const deviceInfo = computed({
    get() {
      const key = serialKey();
      return store.deviceInfos[key] || {};
    },
    set(val) {
      const d = deviceRef.value;
      if (d) {
        store.setDeviceInfos(d, val);
      }
    },
  });

  function writeUInt32BE(buffer, offset, value) {
    buffer[offset] = (value >>> 24) & 0xff;
    buffer[offset + 1] = (value >>> 16) & 0xff;
    buffer[offset + 2] = (value >>> 8) & 0xff;
    buffer[offset + 3] = value & 0xff;
  }

  async function spawnWaitText(argString) {
    let result = null;
    try {
      const deviceSocket = getDeviceStore();
      if (!deviceSocket || deviceSocket.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket未连接');
        return null;
      }

      const args = argString.split(' ') || [];
      const params = { args };

      const paramsJson = JSON.stringify(params);
      const paramsBytes = new TextEncoder().encode(paramsJson);
      const buffer = new Uint8Array(5 + paramsBytes.length);

      buffer[0] = 0x14;
      writeUInt32BE(buffer, 1, paramsBytes.length);

      for (let i = 0; i < paramsBytes.length; i++) {
        buffer[5 + i] = paramsBytes[i];
      }

      emit('messageSent', buffer);
      deviceSocket.send(buffer);
    } catch (error) {
      console.error('❌ 操作执行失败:', error);
    } finally {
      return result;
    }
  }

  async function screenshot() {
    try {
      const deviceSocket = getDeviceStore();
      if (!deviceSocket || deviceSocket.readyState !== WebSocket.OPEN) return;
      const message = new Uint8Array([0x15]);
      deviceSocket.send(message);
    } catch (error) {
      console.log('截图失败:', error);
    }
  }

  function screenshotToAlbum() {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 100000);
    spawnWaitText(`screencap -p /sdcard/${timestamp}-${randomNum}.png`);
  }

  function volumeFn(type) {
    spawnWaitText(`input keyevent ${type}`);
  }

  function rotateFn() {
    const message = new Uint8Array([0x16]);
    const deviceSocket = getDeviceStore();
    if (deviceSocket) {
      deviceSocket.send(message);
    }
  }

  function setSizeFn(size) {
    const sizes = size.split('x');
    spawnWaitText(`wm size ${sizes[0]}x${sizes[1]}`);
  }

  function restoreResolution() {
    spawnWaitText('wm size reset');
  }

  async function clearTasks() {
    try {
      const pageage = await spawnWaitText(
        `dumpsys activity activities | grep taskAffinity`,
      );
      if (pageage) {
        const list = pageage.split('\n');
        for (const el of list) {
          if (el) {
            const temp = el.split('taskAffinity=');
            if (temp[1] && temp[1] !== 'null') {
              await spawnWaitText(`am force-stop ${temp[1]}`);
              await spawnWaitText(`pm clear ${temp[1]}`);
            }
          }
        }
      }

      await deviceClient.value?.controller?.injectKeyCode({
        action: AndroidKeyEventAction.Up,
        keyCode: AndroidKeyCode.AndroidHome,
        repeat: 0,
        metaState: 0,
      });
    } catch (error) {
      console.log('清除任务失败:', error);
    }
  }

  function openSetting() {
    spawnWaitText('am start -a android.settings.SETTINGS');
  }

  function openApp(e) {
    const path = `am start -n ${e.packageName}/${e.activityName}`;
    spawnWaitText(path);
  }

  function goUrl(url) {
    const path = `am start -a android.intent.action.VIEW -d ${url}`;
    spawnWaitText(path);
  }

  return {
    MOUSE_EVENT_BUTTON_TO_ANDROID_BUTTON,
    deviceInfo,
    deviceClient,
    getDeviceStore,
    setDeviceSocket,
    writeUInt32BE,
    spawnWaitText,
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
  };
}
