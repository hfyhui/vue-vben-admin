import { defineStore } from 'pinia';

import {
  deleteProjectionCacheClearApi,
  getProjectionCacheQueryApi,
  getProjectionDevicePageApi,
  patchProjectionDeviceUpdate,
  postProjectionDeviceOpenAppApi,
  refreshProjectionDevices,
} from '#/api';

import { useAccountPromotionScrcpyStore } from './AccountPromotionScrcpy';

type ProjectionDeviceRow = Record<string, any> & {
  check?: boolean;
  deviceId?: number | string;
  deviceIp?: string;
};

function createRandomNumber() {
  return Number(`${Date.now()}${Math.floor(Math.random() * 100_000)}`);
}

function getSwitchCheckInfo() {
  const raw = sessionStorage.getItem('switchCheckInfo');
  if (!raw) {
    return {
      DEVICE_ID: true,
      IP: true,
      rotateNum: 0,
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {
      DEVICE_ID: true,
      IP: true,
      rotateNum: 0,
    };
  }
}

export const useProjectionMatrixStore = defineStore('ProjectionMatrix', {
  state: () => ({
    searchForm: {} as Record<string, any>,
    deviceList: [] as ProjectionDeviceRow[],
    pagination: {
      pageNum: 1,
      pageSize: 10,
      total: 0,
    },
    spinning: false,
    visibleAPK: false,
    visibleResolutionRatio: false,
    visibleLocationForm: false,
    downImg: {} as Record<string, any>,
    deviceListAll: [] as ProjectionDeviceRow[],
    paginationAll: {
      pageNum: 1,
      pageSize: 100,
      total: 0,
    },
    currentOperationId: '' as number | string,
    checkDeviceID: [] as Array<number | string>,
    checkDeviceList: [] as ProjectionDeviceRow[],
    checkDeviceListAccount: [] as ProjectionDeviceRow[],
    switchCheckInfo: getSwitchCheckInfo() as Record<string, any>,
    scrcpyRow: {} as ProjectionDeviceRow,
    scrcpyCurrentRow: {} as ProjectionDeviceRow,
    taskLogs: [] as Array<Record<string, any>>,
    treeDeviceList: [] as Array<Record<string, any>>,
    toggleMode: false,
    isSmallControl: false,
  }),
  actions: {
    setSearchForm(payload: Record<string, any>) {
      this.searchForm = payload || {};
    },
    setToggleMode(toggleMode: boolean) {
      this.toggleMode = !!toggleMode;
    },
    /** 大屏由 promotionStore.scrcpyRow 驱动；左侧把设备移出入选列表后须双端清空，否则再选回仍是大屏 */
    pruneLargeScreenIfNotSelected() {
      const promo = useAccountPromotionScrcpyStore();
      const largeId = promo.scrcpyRow?.deviceId ?? this.scrcpyRow?.deviceId;
      if (!largeId) return;
      const selected = new Set((this.checkDeviceID || []).map((id) => id));
      if (!selected.has(String(largeId))) {
        promo.scrcpyRow = {};
        this.scrcpyRow = {};
      }
    },
    setDeviceList(type: 'all' | 'default', value: ProjectionDeviceRow[]) {
      if (type === 'all') {
        this.deviceListAll = value || [];
      } else {
        this.deviceList = value || [];
      }
    },
    setPagination(
      type: 'all' | 'default',
      value: { pageNum: number; pageSize: number; total: number },
    ) {
      if (type === 'all') {
        this.paginationAll = value;
      } else {
        this.pagination = value;
      }
    },
    setSwitchCheckInfo(payload: Record<string, any>) {
      this.switchCheckInfo = payload || {};
      sessionStorage.setItem(
        'switchCheckInfo',
        JSON.stringify(this.switchCheckInfo),
      );
    },
    resolveCheckedRows(pageType: 'account' | 'default' = 'default') {
      const list =
        pageType === 'account'
          ? this.checkDeviceListAccount
          : this.checkDeviceList;
      return list.filter((el) => {
        return (
          el.check ||
          (this.scrcpyRow?.deviceId !== undefined &&
            this.scrcpyRow.deviceId !== null &&
            String(this.scrcpyRow.deviceId) === String(el.deviceId))
        );
      });
    },
    async getDeviceUpdate(params: {
      data: Record<string, any>;
      pageType?: 'account' | 'default';
    }) {
      const pageType = params?.pageType || 'default';
      const raw = params?.data || {};
      const checkedRows = this.resolveCheckedRows(pageType);
      const deviceIds = checkedRows
        .map((el) => el.deviceId)
        .filter((id) => id !== undefined && id !== null);
      return patchProjectionDeviceUpdate(deviceIds, raw);
    },
    async openApp(params: {
      data: Record<string, any>;
      pageType?: 'account' | 'default';
    }) {
      const pageType = params?.pageType || 'default';
      const data = params?.data || {};
      const checkedRows = this.resolveCheckedRows(pageType);
      const deviceNames = checkedRows.map((el) => el.deviceIp).filter(Boolean);
      return postProjectionDeviceOpenAppApi({
        ...data,
        deviceNames,
      });
    },
    async getDeviceList(params: Record<string, any> = {}) {
      const type = params.type === 'all' ? 'all' : 'default';
      const silentRefresh = !!(params.silent ?? params.skipSpinning);
      if (!silentRefresh) {
        this.spinning = true;
      }
      // 禁用 structuredClone(Pinia reactive)：Chrome 等对 Proxy 会抛 DataCloneError，列表拉取会直接进 catch
      const pagination = JSON.parse(
        JSON.stringify(type === 'all' ? this.paginationAll : this.pagination),
      );
      const searchForm = JSON.parse(JSON.stringify(this.searchForm || {}));
      try {
        if (searchForm.deviceStatuses) {
          searchForm.deviceStatuses = searchForm.deviceStatuses.toString();
        }
        const request = {
          ...searchForm,
          ...params,
          current: pagination.pageNum,
          size: pagination.pageSize,
        } as Record<string, any>;
        delete request.type;
        delete request.silent;
        delete request.skipSpinning;
        const res: any = await getProjectionDevicePageApi(request);
        const payload = res?.data || {};
        const records = (payload.records || []).map(
          (el: ProjectionDeviceRow) => ({
            ...el,
            check: false,
          }),
        );
        pagination.total = payload.total ?? 0;
        this.setDeviceList(type, records);
        this.setPagination(type, pagination);
      } catch {
        this.setDeviceList(type, []);
        this.setPagination(type, pagination);
      } finally {
        if (!silentRefresh) {
          this.spinning = false;
        }
      }
    },
    async refreshDevice() {
      const deviceIds = this.resolveCheckedRows('default')
        .map((el) => el.deviceId)
        .filter((id) => id !== undefined && id !== null);
      return refreshProjectionDevices(deviceIds);
    },
    async getCacheQuery() {
      try {
        const res: any = await getProjectionCacheQueryApi();
        const list = (res?.data ?? []).map((el: Record<string, any>) => ({
          ...el,
          randomId: createRandomNumber(),
        }));
        this.taskLogs = list;
      } catch {
        this.taskLogs = [];
      }
    },
    async delCacheQuery() {
      await deleteProjectionCacheClearApi();
      this.taskLogs = [];
    },
  },
});
