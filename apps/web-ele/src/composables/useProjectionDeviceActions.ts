import { nextTick } from 'vue';
import { ElMessage } from 'element-plus';

import { $t } from '@vben/locales';
import {
  patchProjectionDeviceUpdate,
  refreshProjectionDevices,
} from '#/api/projection-matrix';
import { useProjectionMatrixStore } from '#/store';

function patchSuiteRowOnToggleMode(
  store: ReturnType<typeof useProjectionMatrixStore>,
  device: Record<string, any>,
  operation: string,
) {
  let row: any = null;
  store.treeDeviceList.some((suite: any) => {
    if (device?.suiteName?.includes?.(suite.suiteName)) {
      row = suite.deviceList?.find((ele: any) => ele.deviceId === device?.deviceId);
      return row !== undefined;
    }
    return false;
  });
  if (row?.deviceId) {
    row.deviceStatus = operation === 'SHUTDOWN' ? 'OFFLINE' : 'ONLINE';
  }
}

/**
 * 投屏矩阵：顶栏批量、小卡 Hover、大屏内 PATCH 等设备操作的统一入口（业务层，非仅 API 定义）
 */
export function useProjectionDeviceActions() {
  const projectionStore = useProjectionMatrixStore();

  function canonSuccessMsg() {
    return $t('common.success');
  }

  /** PUT /device/refresh */
  function refreshByDeviceIds(
    deviceIds: (string | number)[],
    options?: { isRestart?: boolean },
  ) {
    return refreshProjectionDevices(deviceIds, options);
  }

  /** WebAdb / 其它处：已知 deviceIds + 与 store 一致的 raw 字段 */
  function patchByDeviceIds(deviceIds: (string | number)[], raw: Record<string, any>) {
    return patchProjectionDeviceUpdate(deviceIds, raw);
  }

  /** 小卡 Hover：关机 / 开机 / 重启 */
  async function hoverRunPowerOrRestart(
    device: Record<string, any>,
    operation: string,
  ) {
    const deviceId = device?.deviceId;
    if (deviceId === undefined || deviceId === null) {
      return { ok: false as const };
    }

    let res: any;
    try {
      res = (await patchProjectionDeviceUpdate([deviceId], {
        operation,
      })) as any;
    } catch {
      return { ok: false as const };
    }
    if (res.msg !== canonSuccessMsg()) {
      ElMessage.warning(res.msg);
      return { ok: false as const, res };
    }

    ElMessage.success($t('common.operationSuccess'));
    projectionStore.checkDeviceList.forEach((el: any) => {
      if (el.deviceId === deviceId) {
        el.deviceStatus = operation === 'SHUTDOWN' ? 'OFFLINE' : 'ONLINE';
      }
    });
    await nextTick();
    if (projectionStore.toggleMode) {
      patchSuiteRowOnToggleMode(projectionStore, device, operation);
    } else {
      await projectionStore.getDeviceList({ type: 'all', silent: true });
    }
    return { ok: true as const, res };
  }

  /** 小卡 Hover：刷新设备 */
  async function hoverRunRefresh(
    deviceId: string | number,
    onAfterRequest?: () => void,
  ) {
    try {
      await refreshProjectionDevices([deviceId]);
      onAfterRequest?.();
      ElMessage.success($t('common.operationSuccess'));
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  }

  /**
   * 顶栏菜单 getDeviceUpdate 成功后的提示（与 BtnOptions 原逻辑一致）
   * @returns code 是否业务成功且已弹出提示
   */
  function toastAfterBatchDeviceUpdate(res: any): boolean {
    const code = res?.code;
    if (!(code == 100000 || code == 200)) {
      return false;
    }
    const cs = canonSuccessMsg();
    const respMsg = res?.msg ?? '';
    if (respMsg === cs || !respMsg) {
      ElMessage.success($t('projectionMatrix.btnOptions.operationSuccess'));
    } else {
      ElMessage.warning(respMsg);
    }
    return true;
  }

  return {
    canonSuccessMsg,
    refreshByDeviceIds,
    patchByDeviceIds,
    hoverRunPowerOrRestart,
    hoverRunRefresh,
    toastAfterBatchDeviceUpdate,
  };
}
