import {
  AndroidKeyCode,
  AndroidKeyEventAction,
  AndroidMotionEventButton,
} from '@yume-chan/scrcpy';
import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue';

import { useScrcpyStore } from '#/store/scrcpy';

/** Android motion event button mapping array. */
export const MOUSE_EVENT_BUTTON_TO_ANDROID_BUTTON = [
  AndroidMotionEventButton.Primary,
  AndroidMotionEventButton.Tertiary,
  AndroidMotionEventButton.Secondary,
  AndroidMotionEventButton.Back,
  AndroidMotionEventButton.Forward,
];

type DeviceLike = { serial?: string; deviceIp?: string };

export type ScrcpyEmitFn = (event: string, ...args: unknown[]) => void;

/**
 * Composable for scrcpy device operations.
 * Provides device info management, WebSocket connection handling,
 * and common ADB operations for a scrcpy-connected device.
 *
 * @param deviceRef - Reactive reference to the device object
 * @param emit - Emit function for sending events
 * @returns Object containing device utilities and operations
 */
export function useScrcpyDevice(
  deviceRef: MaybeRefOrGetter<DeviceLike | undefined>,
  emit?: ScrcpyEmitFn,
) {
  const store = useScrcpyStore();

  function serialKey(): string {
    const d = toValue(deviceRef);
    return d?.serial || d?.deviceIp || '';
  }

  /** WebSocket 直连模式下未使用，保留与 mixin 一致 */
  const deviceClient = ref<{ controller?: { injectKeyCode: (params: Record<string, unknown>) => Promise<void> } } | null>(null);

  const deviceInfo = computed({
    get(): Record<string, unknown> {
      const key = serialKey();
      return store.deviceInfos[key] || {};
    },
    set(val: Record<string, unknown>) {
      const d = toValue(deviceRef);
      if (d) {
        store.setDeviceInfos(d, val);
      }
    },
  });

  /**
   * Get the current device WebSocket store instance.
   * @returns WebSocket instance or null
   */
  function getDeviceStore(): WebSocket | null {
    return store.deviceSockets[serialKey()] || null;
  }

  /**
   * Set the device WebSocket in the store.
   * @param socket - WebSocket instance to set
   */
  function setDeviceSocket(socket: WebSocket | null) {
    const d = toValue(deviceRef);
    if (d) {
      store.setDeviceSocket(d, socket);
    }
  }

  /**
   * Write a 32-bit big-endian unsigned integer to a buffer at the given offset.
   * @param buffer - Target Uint8Array
   * @param offset - Byte offset in the buffer
   * @param value - 32-bit unsigned integer value
   */
  function writeUInt32BE(
    buffer: Uint8Array,
    offset: number,
    value: number,
  ) {
    buffer[offset] = (value >>> 24) & 0xff;
    buffer[offset + 1] = (value >>> 16) & 0xff;
    buffer[offset + 2] = (value >>> 8) & 0xff;
    buffer[offset + 3] = value & 0xff;
  }

  /**
   * Execute a shell command on the device via WebSocket.
   * @param argString - Shell command string
   * @returns Promise resolving to null (result is emitted via callback)
   */
  async function spawnWaitText(
    argString: string,
  ): Promise<string | null> {
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
        buffer[5 + i] = paramsBytes[i]!;
      }

      emit?.('messageSent', buffer);
      deviceSocket.send(buffer);
    } catch (error) {
      console.error('❌ 操作执行失败:', error);
    } finally {
      return result;
    }
  }

  /** Take a screenshot of the device screen. */
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

  /** Take a screenshot and save it to the device album. */
  function screenshotToAlbum() {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 100000);
    void spawnWaitText(
      `screencap -p /sdcard/${timestamp}-${randomNum}.png`,
    );
  }

  /**
   * Adjust device volume.
   * @param type - Volume key type (e.g. KEYCODE_VOLUME_UP, KEYCODE_VOLUME_DOWN)
   */
  function volumeFn(type: number | string) {
    void spawnWaitText(`input keyevent ${type}`);
  }

  /** Rotate the device screen. */
  function rotateFn() {
    const message = new Uint8Array([0x16]);
    const deviceSocket = getDeviceStore();
    if (deviceSocket) {
      deviceSocket.send(message);
    }
  }

  /**
   * Set the device screen resolution.
   * @param size - Resolution string in format "WIDTHxHEIGHT"
   */
  function setSizeFn(size: string) {
    const sizes = size.split('x');
    void spawnWaitText(`wm size ${sizes[0]}x${sizes[1]}`);
  }

  /** Restore device resolution to default. */
  function restoreResolution() {
    void spawnWaitText('wm size reset');
  }

  /** Clear all running tasks/applications on the device. */
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

  /** Open the device settings application. */
  function openSetting() {
    void spawnWaitText('am start -a android.settings.SETTINGS');
  }

  /**
   * Open an application on the device.
   * @param e - Object with packageName and activityName
   */
  function openApp(e: { packageName: string; activityName: string }) {
    const path = `am start -n ${e.packageName}/${e.activityName}`;
    void spawnWaitText(path);
  }

  /**
   * Open a URL on the device.
   * @param url - URL to open
   */
  function goUrl(url: string) {
    const path = `am start -a android.intent.action.VIEW -d ${url}`;
    void spawnWaitText(path);
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
