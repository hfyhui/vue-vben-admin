import { defineStore } from 'pinia';

export type ScrcpyDeviceRef = {
  serial?: string;
  deviceIp?: string;
};

function deviceSerial(device: ScrcpyDeviceRef) {
  return device?.serial || device?.deviceIp || '';
}

export const useScrcpyStore = defineStore('scrcpy', {
  state: () => ({
    deviceInfos: {} as Record<string, Record<string, unknown>>,
    deviceSockets: {} as Record<string, WebSocket | null>,
  }),
  actions: {
    setDeviceInfos(device: ScrcpyDeviceRef, info: Record<string, unknown>) {
      const serial = deviceSerial(device);
      if (device && serial) {
        this.deviceInfos[serial] = info;
      }
    },
    setDeviceSocket(device: ScrcpyDeviceRef, socket: WebSocket | null) {
      const serial = deviceSerial(device);
      if (device && serial) {
        this.deviceSockets[serial] = socket;
      }
    },
  },
});
