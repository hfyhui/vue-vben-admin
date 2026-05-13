import { defineStore } from 'pinia';

import { updateDeviceApi } from '#/api';

export type PromotionCheckDeviceRow = Record<string, any> & {
  check?: boolean;
  deviceId?: number | string;
  deviceIp?: string;
};

/**
 * 日程 Promotion 抽屉内投屏 / 上传 APK / 分辨率 / 定位弹窗共用状态（对齐旧 Vuex `store/modules/AccountPromotionScrcpy.js`）。
 */
export const useAccountPromotionScrcpyStore = defineStore('accountPromotionScrcpy', {
  state: () => ({
    visibleAPK: false,
    visibleResolutionRatio: false,
    visibleLocationForm: false,
    checkDeviceList: [] as PromotionCheckDeviceRow[],
    /** 选中的设备 id 集合（活动页投屏与 SHUTDOWN 等状态同步，对齐旧版 Vuex checkDeviceID） */
    checkDeviceID: [] as Array<number | string>,
    scrcpyRow: {} as PromotionCheckDeviceRow,
  }),
  actions: {
    syncFromAccountInfo(accountInfo: Record<string, any>, accountId?: number | string) {
      const resolvedDeviceIp = accountInfo.deviceIp || accountInfo.connIp;
      const row: PromotionCheckDeviceRow = {
        ...accountInfo,
        // 仅使用社媒设备 id，勿用 account id 冒充：否则 /device/detail 会报「设备不存在/无权限」
        deviceId: accountInfo.deviceId,
        deviceIp: resolvedDeviceIp,
        check: true,
        id: accountInfo.id ?? accountInfo.accountId ?? accountId,
      };
      this.checkDeviceList =
        row.deviceId || (row.deviceIp && row.deviceIp !== '-') ? [row] : [];
      this.scrcpyRow = {};
    },

    closeModal(key: 'visibleAPK' | 'visibleResolutionRatio' | 'visibleLocationForm') {
      this[key] = false;
    },

    clearActivityScrcpyContext() {
      this.checkDeviceList = [];
      this.checkDeviceID = [];
      this.scrcpyRow = {};
    },

    resolveCheckedDeviceIds(): Array<number | string> {
      const row = this.scrcpyRow;
      const rawIds = this.checkDeviceList
        .filter(
          (el) =>
            el?.check ||
            (row?.deviceId != null && el?.deviceId == row.deviceId),
        )
        .map((el) => el.deviceId)
        .filter((id) => id !== undefined && id !== null);
      return [...new Set(rawIds)];
    },

    async getDeviceUpdate(payload: { data: Record<string, unknown> }) {
      const deviceIds = this.resolveCheckedDeviceIds();
      const raw = (payload.data || {}) as Record<string, any>;
      const body: Record<string, any> = {
        operation: raw.operation ?? raw.name,
        deviceIds,
      };
      if (raw.ratioValue !== undefined) body.ratioValue = raw.ratioValue;
      if (raw.locationReqVo !== undefined) body.locationReqVo = raw.locationReqVo;
      return updateDeviceApi(body as never);
    },
  },
});
