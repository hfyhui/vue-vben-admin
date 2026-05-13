<script lang="ts" setup>
import type { Directive } from 'vue';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import { $t } from '@vben/locales';

import { Close, RefreshRight } from '@element-plus/icons-vue';
import { AndroidKeyCode, AndroidKeyEventAction } from '@yume-chan/scrcpy';
import { ElMessage } from 'element-plus';

import { getAccountSecApi } from '#/api/core/account';
import {
  getDeviceAppListApi,
  getDeviceDetailApi,
  modifyDeviceAliasApi,
} from '#/api/core/device';
import { patchProjectionDeviceUpdate } from '#/api/projection-matrix';
import HoverHeader from '#/components/Scrcpy/WebAdb/components/HoverHeader.vue';
import SimulateCameraQrPopover from '#/components/Scrcpy/WebAdb/components/SimulateCameraQrPopover.vue';
import DeviceOperateButton from '#/components/Scrcpy/WebAdb/FooterBtn/index.vue';
import FileManagerDrawer from '#/components/WebAdb/FileManagerDrawer.vue';
import WebAdb from '#/components/WebAdb/index.vue';
import LiveManage from '#/components/WebAdb/LiveManage.vue';
import { useDictStore, useProjectionMatrixStore } from '#/store';
import { useAccountPromotionScrcpyStore } from '#/store/modules/AccountPromotionScrcpy';
import { useScrcpyStore } from '#/store/scrcpy';
import { formatProcessUrl } from '#/utils/asset-url';
import { isDeviceUpdateRowSucceeded } from '#/utils/device-update-response';

type DeviceRow = Record<string, any>;
type DictOption = { content?: string; logo?: string; name?: string };

type AppShortcutRow = {
  activityName: string;
  apkName?: string;
  logo?: string;
  packageName: string;
};

const props = withDefaults(
  defineProps<{
    device: DeviceRow;
    isHeaderBtn?: boolean;
    /** 投屏矩阵传入：勾选 + 大屏行 → deviceIds；日程侧不传 */
    resolveDeviceIdsForUpdate?: () => unknown[];
    showCheckbox?: boolean;
    showDropdownTab?: boolean;
    showFileManager?: boolean;
    showHD?: boolean;
    showLiveManage?: boolean;
    showOperatingPlaceholder?: boolean;
    showOperationTab?: boolean;
    showRefreshCode?: boolean;
    showStatusDot?: boolean;
    widthLarge?: number | string;
    widthSmall?: number | string;
  }>(),
  {
    showCheckbox: true,
    widthLarge: 360,
    widthSmall: 170,
    isHeaderBtn: false,
    showOperationTab: false,
    showStatusDot: false,
    showLiveManage: true,
    showFileManager: true,
    showHD: true,
    showDropdownTab: true,

    showRefreshCode: false,
    showOperatingPlaceholder: true,
  },
);

const $emit = defineEmits<{
  (e: 'closeScrcpy'): void;
}>();
const promotionStore = useAccountPromotionScrcpyStore();
const projectionMatrixStore = useProjectionMatrixStore();
const dictStore = useDictStore();
const scrcpyStore = useScrcpyStore();

const webAdbRef = ref<any>(null);
const webAdbDevice = ref<DeviceRow>({});
const webAdbKey = ref(0);
const isEditAliases = ref(false);
const deviceAliases = ref('');
const aliasSaving = ref(false);
const inputRef = ref<HTMLInputElement>();
/** 对齐 qrCodeMixins：详情缓存；仅用于合并投屏数据 */
const deviceDetailInfo = ref<DeviceRow>({});
const appList = ref<AppShortcutRow[]>([]);
const qrCode = ref('');
const codeLoading = ref(false);
const isScrcpyHD = ref(false);

const CUSTOM_MODAL_MAP: Record<
  string,
  'visibleAPK' | 'visibleLocationForm' | 'visibleResolutionRatio'
> = {
  LOCATION: 'visibleLocationForm',
  RESOLUTION_RATIO: 'visibleResolutionRatio',
  UPLOAD_APK: 'visibleAPK',
  APK: 'visibleAPK',
  INSTALL_APK: 'visibleAPK',
  INSTALL_SOFTWARE: 'visibleAPK',
  SOFTWARE_INSTALL: 'visibleAPK',
};

const OPERATION_ALIAS_MAP: Record<string, string> = {
  SET_APK_MODAL: 'UPLOAD_APK',
  SET_LOCATION_MODAL: 'LOCATION',
  SET_RESOLUTION_RATIO_MODAL: 'RESOLUTION_RATIO',
};

const ADB_KEY_MAP: Record<string, keyof typeof AndroidKeyCode> = {
  APP_SWITCH: 'AndroidAppSwitch',
  BACK: 'AndroidBack',
  HOME: 'AndroidHome',
  POWER: 'Power',
  VOLUME_DOWN: 'VolumeDown',
  VOLUME_UP: 'VolumeUp',
};

/** 与 BtnOptions `updateDeviceStatuses` 一致：这些操作后拉全量设备页（paginationAll → /device/page?current=&size=100） */
const DEVICE_PAGE_REFRESH_OPS = ['SHUTDOWN', 'POWER_ON', 'RESTART'] as const;
function getDragPositionKey() {
  // 账号社媒与投屏矩阵分开记忆，避免互相污染位置导致“大屏只露一角”
  return props.resolveDeviceIdsForUpdate
    ? 'drag_position_projection'
    : 'drag_position_account';
}

const activeScrcpyRow = computed(() =>
  props.resolveDeviceIdsForUpdate
    ? projectionMatrixStore.scrcpyRow
    : promotionStore.scrcpyRow,
);

const isLarge = computed(() => {
  const row = activeScrcpyRow.value;
  const d = props.device;
  return !!(row && d && row.deviceId == d.deviceId);
});

const allowSmallControl = computed(() => {
  if (!props.resolveDeviceIdsForUpdate) return true;
  return !!projectionMatrixStore.isSmallControl;
});

const switchCheckInfo = computed<Record<string, any>>(() => {
  if (!props.resolveDeviceIdsForUpdate) {
    return {
      DEVICE_ID: true,
      IP: true,
    };
  }
  return projectionMatrixStore.switchCheckInfo || {};
});

const showDeviceId = computed(() => switchCheckInfo.value?.DEVICE_ID !== false);
const showDeviceIp = computed(() => switchCheckInfo.value?.IP !== false);

const checkedIps = computed<string[]>(() => {
  const inProjection = !!props.resolveDeviceIdsForUpdate;
  const list = inProjection
    ? projectionMatrixStore.checkDeviceList
    : promotionStore.checkDeviceList;
  const currentLargeId = inProjection
    ? projectionMatrixStore.scrcpyRow?.deviceId
    : promotionStore.scrcpyRow?.deviceId;
  return (list || [])
    .filter(
      (el: any) =>
        el?.check || (currentLargeId != null && el?.deviceId == currentLargeId),
    )
    .map((el: any) => el?.deviceIp)
    .filter(
      (ip: unknown): ip is string => typeof ip === 'string' && ip.length > 0,
    );
});

const deviceNumText = computed(() => {
  const n = props.device?.deviceNum;
  return n >= 10 ? `${n}` : `0${n}`;
});

/** 列表行 + 详情合并，用于头部信息悬浮提示 */
const mergedDeviceForTooltip = computed(
  () => ({ ...props.device, ...deviceDetailInfo.value }) as DeviceRow,
);

function tooltipField(v: unknown): string {
  if (v === undefined || v === null || v === '') return '--';
  return String(v);
}

const tooltipSerialDisplay = computed(() => {
  const n = props.device?.deviceNum ?? mergedDeviceForTooltip.value?.deviceNum;
  if (n === undefined || n === null || n === '') return '--';
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num >= 10 ? `${num}` : `0${num}`;
});

const deviceInfoTooltipRows = computed(() => {
  const m = mergedDeviceForTooltip.value;
  const aliasRaw = isEditAliases.value ? deviceAliases.value : m.deviceAliases;
  const aliasVal =
    aliasRaw === undefined ||
    aliasRaw === null ||
    String(aliasRaw).trim() === ''
      ? '--'
      : String(aliasRaw);
  const imei = m.imei ?? m.deviceImei ?? m.IMEI;
  const model =
    m.deviceModel ?? m.phoneModel ?? m.modelName ?? m.deviceCategory;
  const sys =
    m.systemVersion ?? m.androidVersion ?? m.sdkVersion ?? m.osVersion;

  return [
    {
      label: $t('webadb.scrcpy.serialNumber'),
      value: tooltipSerialDisplay.value,
    },
    { label: $t('webadb.scrcpy.deviceId'), value: tooltipField(m.deviceIdx) },
    { label: $t('webadb.scrcpy.alias'), value: aliasVal },
    { label: $t('webadb.scrcpy.ip'), value: tooltipField(m.deviceIp) },
    { label: $t('webadb.scrcpy.imei'), value: tooltipField(imei) },
    { label: $t('webadb.scrcpy.deviceModel'), value: tooltipField(model) },
    { label: $t('webadb.scrcpy.deviceSystem'), value: tooltipField(sys) },
  ];
});

/** 小圆点：仅接口 riskColor / riskTip */
const statusDotVisible = computed(
  () => props.showStatusDot && !!props.device?.riskColor,
);

function bindDragDialog(
  el: HTMLElement,
  binding?: { value?: { drag?: boolean } },
) {
  const params = {
    drag: true,
    ...binding?.value,
  };
  if (!params.drag) return;

  const dragDom = el.classList.contains('gy-drag-modal')
    ? el
    : (el.querySelector('.gy-drag-modal') as HTMLElement | null);
  if (!dragDom) return;

  const dragPositionKey = getDragPositionKey();
  // 仅大屏 fixed 模式恢复历史拖拽位置；小卡片应用 left/top 会被偏移到可视区外，表现为“左侧设备不显示”
  if (dragDom.classList.contains('fixed')) {
    const saved = window.sessionStorage.getItem(dragPositionKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { left?: string; top?: string };
        if (parsed.left && parsed.top) {
          const rawLeft = Number.parseFloat(parsed.left);
          const rawTop = Number.parseFloat(parsed.top);
          if (Number.isFinite(rawLeft) && Number.isFinite(rawTop)) {
            // 防止历史位置超出可视区（窗口尺寸变化/场景切换）
            const rect = dragDom.getBoundingClientRect();
            const maxLeft = Math.max(0, window.innerWidth - rect.width);
            const maxTop = Math.max(0, window.innerHeight - rect.height);
            const left = Math.min(Math.max(rawLeft, 0), maxLeft);
            const top = Math.min(Math.max(rawTop, 0), maxTop);
            dragDom.style.left = `${left}px`;
            dragDom.style.top = `${top}px`;
          }
          dragDom.style.transform = 'none';
        }
      } catch {
        // ignore invalid session value
      }
    }
  } else {
    dragDom.style.left = '';
    dragDom.style.top = '';
    dragDom.style.transform = '';
  }

  const dialogHeaderEl = dragDom.querySelector(
    '.gy-drag-modal-drag',
  ) as HTMLElement | null;
  if (!dialogHeaderEl) return;

  // 句柄变化（如小屏 -> 大屏）时，先解绑旧监听再绑定新句柄
  (el as any).__dragCleanup__?.();

  dialogHeaderEl.addEventListener('selectstart', () => false);
  dialogHeaderEl.style.cursor = 'move';

  const moveDown = (event: MouseEvent) => {
    if (!dragDom.classList.contains('fixed')) return;
    const rect = dragDom.getBoundingClientRect();
    const disX = event.clientX - rect.left;
    const disY = event.clientY - rect.top;

    const onMove = (e: MouseEvent) => {
      const left = e.clientX - disX;
      const top = e.clientY - disY;
      dragDom.style.left = `${left}px`;
      dragDom.style.top = `${top}px`;
      dragDom.style.transform = 'none';
      window.sessionStorage.setItem(
        dragPositionKey,
        JSON.stringify({ left: `${left}px`, top: `${top}px` }),
      );
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  dialogHeaderEl.addEventListener('mousedown', moveDown);
  (el as any).__dragCleanup__ = () => {
    dialogHeaderEl.removeEventListener('mousedown', moveDown);
  };
}

const vDragDialog: Directive<HTMLElement, undefined | { drag?: boolean }> = {
  mounted(el, binding) {
    bindDragDialog(el, binding as any);
  },
  updated(el, binding) {
    bindDragDialog(el, binding as any);
  },
  unmounted(el) {
    (el as any).__dragCleanup__?.();
  },
};

const btnList = computed<DictOption[]>(() => {
  const base = dictStore.getDictOptions('MOBILE_FUNCTION');
  const adb = dictStore.getDictOptions('MOBILE_ADB_FUNCTION');
  const merged = [...base, ...adb];
  return merged.filter((item: DictOption) => {
    const key = dictItemKey(item).toUpperCase();
    return !!key && !['DEVICE_ID', 'IP'].includes(key);
  });
});

const simulateCameraQrSupported = computed(() => {
  const merged = { ...props.device, ...deviceDetailInfo.value } as DeviceRow;
  return merged.chipCode == 'AIBOX_L02';
});

const btnListMenu = computed(() =>
  btnList.value.filter((item) => {
    const key = dictItemKey(item).toUpperCase();
    if (key === 'SIMULATE_CAMERA' && !simulateCameraQrSupported.value)
      return false;
    return true;
  }),
);

const cameraQrPageUrl = computed(() => {
  const d = { ...props.device, ...deviceDetailInfo.value } as DeviceRow;
  const { deviceCode: code, connIp, wsPort } = d;
  if (!code || !connIp || wsPort == null) return '';
  const locationOrigin = import.meta.env.DEV
    ? 'https://test.callfansai.cn'
    : window.location.origin;
  const locationHost = import.meta.env.DEV
    ? 'test.callfansai.cn'
    : window.location.host;
  return `${locationOrigin}/camera_web/index.html?padCode=VM${code}&remoteWsIp=${locationHost}&remoteWsPort=5092/${connIp}/${wsPort}`;
});

function isSimulateCameraMenuItem(item: DictOption) {
  if (!simulateCameraQrSupported.value) return false;
  return dictItemKey(item).toUpperCase() === 'SIMULATE_CAMERA';
}

function dictItemKey(item: DictOption) {
  const r = item as Record<string, unknown>;
  const v = r.name ?? r.value;
  if (v == null || v === '') return '';
  return `${v}`;
}

function dictItemLabel(item: DictOption) {
  return item.content ?? item.name ?? '';
}

function patchWebAdbDevice() {
  const scrcpyInfo = props.device || {};
  const detail = deviceDetailInfo.value || {};
  webAdbDevice.value = {
    ...scrcpyInfo,
    ...detail,
    serial: scrcpyInfo.deviceIp || scrcpyInfo.connIp,
  };
}

/** 等同 mixin getCrtFn：仅有真实 deviceId 时请求详情（勿用账号 id） */
async function loadDeviceDetailAndPatch() {
  const id = props.device?.deviceId;
  const hasId = id !== undefined && id !== null && id !== '';

  if (!hasId) {
    deviceDetailInfo.value = {};
    patchWebAdbDevice();
    webAdbKey.value += 1;
    return;
  }

  try {
    const res = (await getDeviceDetailApi(id as number | string)) as {
      data?: DeviceRow;
    };
    const data = res?.data;
    deviceDetailInfo.value =
      data && typeof data === 'object' ? { ...data } : {};
  } catch {
    deviceDetailInfo.value = {};
  }
  patchWebAdbDevice();
  webAdbKey.value += 1;
}

watch(
  () => props.device?.deviceId,
  () => {
    loadDeviceDetailAndPatch();
  },
  { immediate: true },
);

watch(
  () => props.device?.deviceStatus,
  (nv, ov) => {
    if (nv !== ov) {
      patchWebAdbDevice();
    }
  },
);

async function loadDeviceAppList() {
  appList.value = [];
  if (!isLarge.value || !props.device?.deviceIp || !props.showDropdownTab)
    return;
  try {
    const res = (await getDeviceAppListApi(props.device.deviceIp)) as {
      data?: any[];
    };
    appList.value = (res.data || []).map((el: any) => ({
      ...el,
      logo:
        el.logo && !el.logo.startsWith('data:')
          ? `data:image/png;base64,${el.logo}`
          : el.logo,
    }));
  } catch {
    appList.value = [];
  }
}

watch([isLarge, () => props.device?.deviceIp], () => loadDeviceAppList(), {
  immediate: true,
});

watch(
  [
    isLarge,
    () => props.showRefreshCode,
    () => activeScrcpyRow.value?.twiceCheck,
  ],
  ([large, show, twice]) => {
    if (large && show && twice) {
      getQrCode();
    } else if (!large) {
      qrCode.value = '';
    }
  },
  { immediate: true },
);

// 监听 isLarge，大屏切换成小屏 false 时执行 initWs
watch(
  isLarge,
  (newValue, oldValue) => {
    if (!newValue && oldValue && isScrcpyHD.value) {
      setScrcpyHD(false);
    }
  },
  { immediate: false }, // 不需要一进来就执行
);

async function patchDeviceUpdate(data: Record<string, any>) {
  const resolver = props.resolveDeviceIdsForUpdate;
  const deviceIds = resolver
    ? resolver()
    : promotionStore.resolveCheckedDeviceIds();
  return patchProjectionDeviceUpdate(deviceIds as (number | string)[], data);
}

function patchProjectionSuiteRowFromWebAdb(ele: DeviceRow, operation: string) {
  let row: any = null;
  projectionMatrixStore.treeDeviceList.some((suite: any) => {
    if (ele.suiteName?.includes?.(suite.suiteName)) {
      row = suite.deviceList?.find((d: any) => d.deviceId === ele.deviceId);
      return !!row;
    }
    return false;
  });
  if (row?.deviceId) {
    row.deviceStatus = operation === 'SHUTDOWN' ? 'OFFLINE' : 'ONLINE';
  }
}

function updateProjectionCheckedStatus(
  operation: string,
  updateRes: unknown,
  canonSuccess: string,
) {
  if (!props.resolveDeviceIdsForUpdate) return;
  const nextStatus = operation === 'SHUTDOWN' ? 'OFFLINE' : 'ONLINE';
  const currentLargeId = projectionMatrixStore.scrcpyRow?.deviceId;
  projectionMatrixStore.checkDeviceList.forEach((el: any) => {
    const touched =
      el.check || (currentLargeId != null && el.deviceId == currentLargeId);
    if (!touched) return;
    if (!isDeviceUpdateRowSucceeded(updateRes, el.deviceId, canonSuccess))
      return;
    el.deviceStatus = nextStatus;
    if (projectionMatrixStore.toggleMode) {
      patchProjectionSuiteRowFromWebAdb(el, operation);
    }
  });
}

function openCustomizeModal(
  key: 'visibleAPK' | 'visibleLocationForm' | 'visibleResolutionRatio',
) {
  if (props.resolveDeviceIdsForUpdate) {
    projectionMatrixStore[key] = true;
    return;
  }
  // 任务管理/账号侧：弹窗状态在 promotion store
  promotionStore[key] = true;
}

async function runByName(name: string, payload: Record<string, any> = {}) {
  const normalized = OPERATION_ALIAS_MAP[name] || name;
  if (normalized === 'SIMULATE_CAMERA') {
    return;
  }
  const modalKey = CUSTOM_MODAL_MAP[normalized];
  const hasModalSubmitPayload =
    (normalized === 'RESOLUTION_RATIO' && payload.ratioValue !== undefined) ||
    (normalized === 'LOCATION' && payload.locationReqVo !== undefined);
  if (modalKey && !hasModalSubmitPayload) {
    openCustomizeModal(modalKey);
    return;
  }

  if (normalized === 'REFRESH') {
    await webAdbRef.value?.reconnect?.();
    return;
  }

  // 旋转/截图/恢复分辨率/音量/设置均为本地大屏动作
  if (normalized === 'ROTATE') {
    await webAdbRef.value?.rotateFn?.();
    return;
  }
  if (normalized === 'RESTORE_RESOLUTION') {
    await webAdbRef.value?.restoreResolution?.();
    return;
  }
  if (normalized === 'SCREENSHOT_TO_ALBUM') {
    await webAdbRef.value?.screenshotToAlbum?.();
    return;
  }
  if (normalized === 'SCREENSHOT_TO_COMPUTER') {
    await webAdbRef.value?.screenshot?.();
    return;
  }
  if (normalized === 'SETUP' || normalized === 'SET_UP') {
    await webAdbRef.value?.openSetting?.();
    return;
  }
  if (normalized === 'VOLUME_UP' || normalized === 'VOLUME_DOWN') {
    await webAdbRef.value?.volumeFn?.(normalized);
    return;
  }

  if (normalized === 'RESOLUTION_RATIO') {
    if (payload.ratioValue !== undefined) {
      await webAdbRef.value?.setSizeFn?.(payload.ratioValue);
    }
    return;
  }

  const keyName = ADB_KEY_MAP[normalized];
  if (keyName) {
    const keyCode = AndroidKeyCode[keyName];
    if (keyCode !== undefined) {
      await webAdbRef.value?.executeKeyAction?.({
        action: AndroidKeyEventAction.Down,
        isVirtualBtn: true,
        keyCode,
        metaState: 0,
        repeat: 0,
      });
    }
    return;
  }

  const updateRes = (await patchDeviceUpdate({
    ...payload,
    operation: normalized,
  })) as any;

  const canonSuccess = $t('common.success');
  // 与旧 Web 对齐：code 100000 + msg≠「成功」表示部分失败等，仍需 warning
  if (
    updateRes?.code == 100_000 &&
    updateRes?.msg &&
    updateRes.msg !== canonSuccess
  ) {
    ElMessage.warning(updateRes.msg);
  }
  if (
    updateRes?.code == 100_000 &&
    (DEVICE_PAGE_REFRESH_OPS as readonly string[]).includes(normalized)
  ) {
    updateProjectionCheckedStatus(normalized, updateRes, canonSuccess);
    if (props.resolveDeviceIdsForUpdate && !projectionMatrixStore.toggleMode) {
      await projectionMatrixStore.getDeviceList({ type: 'all', silent: true });
    }
  }
}

function openLarge() {
  if (isEditAliases.value) return;
  if (props.resolveDeviceIdsForUpdate && projectionMatrixStore.isSmallControl) {
    return;
  }
  if (isLarge.value) return;
  const row = { ...props.device };
  if (props.resolveDeviceIdsForUpdate) {
    projectionMatrixStore.scrcpyRow = row;
  } else {
    promotionStore.scrcpyRow = row;
  }
}

function closeLarge() {
  if (props.resolveDeviceIdsForUpdate) {
    projectionMatrixStore.scrcpyRow = {};
  } else {
    promotionStore.scrcpyRow = {};
  }

  $emit('closeScrcpy');
}

function openCameraQrInBrowser() {
  const url = cameraQrPageUrl.value;
  if (!url) {
    ElMessage.error($t('webadb.scrcpy.goUrlQrCodeError'));
    return;
  }
  window.open(url, '_blank');
}

function handleMoreToolClick(item: DictOption) {
  const name = dictItemKey(item);
  if (!name) return;
  // 模拟相机仅悬停 Popover 展示，不走点击逻辑
  if (name.toUpperCase() === 'SIMULATE_CAMERA') return;
  runByName(name, item as Record<string, any>);
}

function openAppShortcut(item: AppShortcutRow) {
  const row = item as Record<string, unknown>;
  const packageName = (row.packageName ?? row.package_name) as
    | string
    | undefined;
  const activityName = (row.activityName ?? row.activity_name) as
    | string
    | undefined;
  if (!packageName || !activityName) return;
  webAdbRef.value?.openApp?.({ packageName, activityName });
}

async function handlePressKey(payload: { e: MouseEvent; key: string }) {
  if (payload.key === 'SetUp') {
    await webAdbRef.value?.openSetting?.();
    return;
  }
  webAdbRef.value?.handlePressKey?.(payload);
}

function setDeviceCheck(val: boolean) {
  (props.device as DeviceRow).check = val;
}

function aliasesDblClick() {
  // 与旧项目一致：仅投屏矩阵场景支持小屏别名编辑
  if (!props.isHeaderBtn || isLarge.value) return;
  isEditAliases.value = true;
  deviceAliases.value = props.device?.deviceAliases || '';
  nextTick(() => inputRef.value?.focus());
}

function cancelDeviceAliasesEdit() {
  isEditAliases.value = false;
}

async function submitDeviceAliasesEdit() {
  if (aliasSaving.value || !isEditAliases.value) return;
  const nextAlias = (deviceAliases.value || '').trim();
  if (nextAlias.length > 10) {
    ElMessage.error($t('webadb.scrcpy.limitCharacters'));
    nextTick(() => inputRef.value?.focus());
    return;
  }

  aliasSaving.value = true;
  try {
    await modifyDeviceAliasApi({
      deviceAliases: nextAlias,
      deviceId: props.device?.deviceId,
    });
    (props.device as DeviceRow).deviceAliases = nextAlias;
    isEditAliases.value = false;
  } catch {
    ElMessage.error($t('common.operationFailed'));
  } finally {
    aliasSaving.value = false;
  }
}

function setScrcpyHD(val: boolean) {
  isScrcpyHD.value = val;
  handleReconnect('HD');
}

async function handleReconnect(clarity = '') {
  await webAdbRef.value?.reconnect?.(clarity);
}

async function getQrCode() {
  const twiceCheck = activeScrcpyRow.value?.twiceCheck;
  if (!props.showRefreshCode || !twiceCheck) {
    qrCode.value = '';
    return;
  }
  try {
    codeLoading.value = true;
    const res = (await getAccountSecApi(twiceCheck)) as { data?: string };
    qrCode.value = `${res?.data ?? ''}`;
  } catch {
    ElMessage.error($t('webadb.scrcpy.codeGetFailed'));
  } finally {
    codeLoading.value = false;
  }
}

async function handleMessageSent(payload: {
  buffer?: ArrayBuffer;
  type?: string;
}) {
  const buffer = payload?.buffer;
  if (!buffer) return;
  const needDelay = payload?.type?.startsWith?.('am start -n') ?? false;
  const currentIp = props.device?.deviceIp;
  for (const ip of checkedIps.value) {
    if (needDelay) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (ip != currentIp) {
      scrcpyStore.deviceSockets[ip]?.send(buffer);
    }
  }
}

function handleHoverRefreshSuccess() {
  handleReconnect();
}

async function scrcpyCustomizeFn(
  operation: string,
  params: Record<string, any> = {},
) {
  const op = operation;
  if (op === 'OPENAPP' || op === 'OPEN_APP') {
    const packageName = params.packageName as string | undefined;
    const activityName = params.activityName as string | undefined;
    if (packageName && activityName) {
      webAdbRef.value?.openApp?.({ packageName, activityName });
    }
    return;
  }
  if (operation == 'SIMULATE_CAMERA' && simulateCameraQrSupported.value) {
    if (!cameraQrPageUrl.value) {
      ElMessage.error($t('webadb.scrcpy.getQrCodeError'));
      return;
    }
    openCameraQrInBrowser();
    return;
  }
  await runByName(operation, params);
}

defineExpose({ scrcpyCustomizeFn, openLarge });

onMounted(async () => {
  await dictStore.fetchDictInfo();
});

// isLarge 为 true 时绑定 ESC 关闭事件，false 时移除
watch(isLarge, (val) => {
  if (val) {
    document.addEventListener('keydown', closeLargeOnEsc);
  } else {
    document.removeEventListener('keydown', closeLargeOnEsc);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', closeLargeOnEsc);
});

function closeLargeOnEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeLarge();
  }
}
</script>

<template>
  <div class="scrcpy-container" :class="{ zIndex: isLarge }">
    <div
      v-show="isLarge && props.showOperatingPlaceholder"
      class="screen_casting"
      :class="{ top_25: props.isHeaderBtn }"
      :style="{
        height: `${Math.ceil(widthSmall * 1.77) + 41}px`,
        width: `${widthSmall}px`,
      }"
    >
      <div class="text">{{ $t('webadb.scrcpy.operating') }}</div>
    </div>

    <div
      class="small-hover-wrap"
      :class="{ 'small-hover-wrap--enabled': !isLarge && props.isHeaderBtn }"
    >
      <HoverHeader
        v-if="!isLarge && props.isHeaderBtn"
        :device="device"
        @refresh-success="handleHoverRefreshSuccess"
      />
      <div
        v-drag-dialog
        class="gy-drag-modal"
        :class="{ fixed: isLarge }"
        :style="isLarge ? { width: `${widthLarge}px` } : undefined"
        @click="openLarge"
      >
        <div
          v-if="!isLarge"
          class="header"
          :style="{ width: `${widthSmall}px` }"
        >
          <div class="header_inner">
            <el-tooltip
              v-if="statusDotVisible"
              :content="device.riskTip"
              placement="top"
            >
              <span
                class="status-circle"
                :style="{ 'background-color': device.riskColor }"
                @click.stop
              ></span>
            </el-tooltip>
            <el-tooltip
              class="header-scrcpy-tooltip"
              effect="dark"
              placement="right-start"
              :show-after="300"
              popper-class="scrcpy-device-info-tooltip"
            >
              <template #content>
                <div class="scrcpy-device-info-tooltip__content">
                  <div
                    v-for="(row, idx) in deviceInfoTooltipRows"
                    :key="idx"
                    class="scrcpy-device-info-tooltip__row"
                  >
                    <span class="scrcpy-device-info-tooltip__label"
                      >{ >{{ row.label }}:</span
                    >
                    <span class="scrcpy-device-info-tooltip__value">{{
                      row.value
                    }}</span>
                  </div>
                </div>
              </template>
              <div class="header_device_tip_trigger">
                <div v-show="showDeviceId" class="num">{{ deviceNumText }}</div>
                <div
                  class="header_content"
                  :class="{ 'header_content--no-checkbox': !showCheckbox }"
                >
                  <div
                    v-if="!isEditAliases"
                    class="view"
                    @click.stop
                    @dblclick.stop="aliasesDblClick"
                  >
                    <div class="idx ellipsis">
                      {{ device.deviceAliases || device.deviceIdx || '--' }}
                    </div>
                    <div v-show="showDeviceIp" class="ip">
                      {{ device.deviceIp || '--' }}
                    </div>
                  </div>
                  <div
                    v-else
                    class="device_aliases"
                    @click.stop
                    @mousedown.stop
                  >
                    <input
                      ref="inputRef"
                      v-model="deviceAliases"
                      maxlength="10"
                      @click.stop
                      @mousedown.stop
                      @blur="submitDeviceAliasesEdit"
                      @keydown.enter.prevent="submitDeviceAliasesEdit"
                      @keydown.esc.prevent="cancelDeviceAliasesEdit"
                    />
                  </div>
                </div>
              </div>
            </el-tooltip>
            <div v-if="showCheckbox" class="check_box" @click.stop>
              <el-checkbox
                :model-value="device.check"
                @update:model-value="setDeviceCheck"
              />
            </div>
          </div>
        </div>

        <div v-else class="gy-drag-modal-header" @click.stop>
          <div class="title gy-drag-modal-drag" @click.stop>
            <el-tooltip
              v-if="statusDotVisible"
              :content="device.riskTip"
              placement="top"
            >
              <span
                class="status-circle status-circle--large"
                :style="{ 'background-color': device.riskColor }"
                @click.stop
              ></span>
            </el-tooltip>
            <el-tooltip
              class="header-scrcpy-tooltip header-scrcpy-tooltip--large"
              effect="dark"
              placement="right-start"
              :show-after="300"
              popper-class="scrcpy-device-info-tooltip"
            >
              <template #content>
                <div class="scrcpy-device-info-tooltip__content">
                  <div
                    v-for="(row, idx) in deviceInfoTooltipRows"
                    :key="idx"
                    class="scrcpy-device-info-tooltip__row"
                  >
                    <span class="scrcpy-device-info-tooltip__label"
                      >{{ row.label }}:</span
                    >
                    <span class="scrcpy-device-info-tooltip__value">{{
                      row.value
                    }}</span>
                  </div>
                </div>
              </template>
              <div class="title_device_tip_trigger">
                <span class="deviceIdx">{{
                  device.deviceIdx || device.deviceAliases || '--'
                }}</span>
                <span class="deviceIp">{{ device.deviceIp || '--' }}</span>
              </div>
            </el-tooltip>
            <el-icon class="close" :size="24" @click.stop="closeLarge">
              <Close />
            </el-icon>
          </div>
        </div>

        <div
          class="gy-drag-modal-body"
          :class="{ 'gy-drag-modal-body--large': isLarge }"
        >
          <div v-show="isLarge" class="body_header" @click.stop>
            <div class="left">
              <template v-if="props.showRefreshCode">
                <div class="verification-code-row">
                  <span class="verification-code-label">{{
                    $t('webadb.scrcpy.verificationCode')
                  }}</span>
                  <span
                    class="verification-code-value"
                    :class="{ 'is-empty': !qrCode }"
                  >
                    {{ qrCode || $t('webadb.scrcpy.pleaseRefresh') }}
                  </span>
                  <el-tooltip
                    :content="$t('webadb.scrcpy.refreshCode')"
                    placement="top"
                  >
                    <el-icon
                      class="refresh-code-icon"
                      :class="{ 'is-loading': codeLoading }"
                      @click.stop="getQrCode"
                    >
                      <RefreshRight />
                    </el-icon>
                  </el-tooltip>
                </div>
              </template>
            </div>
            <div class="right">
              <el-button
                v-if="props.showHD"
                type="warning"
                link
                @click="setScrcpyHD(true)"
              >
                HD
              </el-button>
              <LiveManage
                v-if="
                  props.showLiveManage &&
                  deviceDetailInfo.chipCode === 'AIBOX_L02'
                "
                :device="webAdbDevice"
              />
              <FileManagerDrawer
                v-if="props.showFileManager"
                :device="webAdbDevice"
              />
              <el-dropdown trigger="click" v-if="props.showDropdownTab">
                <span class="op_trigger" @click.stop>
                  <i class="icon iconfont icon-more"></i>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <template v-for="item in btnListMenu">
                      <el-dropdown-item
                        v-if="isSimulateCameraMenuItem(item)"
                        :key="`sim-${dictItemKey(item)}`"
                        @click.stop
                      >
                        <div
                          class="dropdown-tooltip-anchor dropdown-tooltip-anchor--simulate-camera"
                        >
                          <SimulateCameraQrPopover
                            :qr-page-url="cameraQrPageUrl"
                          >
                            <template #reference>
                              <el-tooltip
                                effect="dark"
                                placement="right"
                                :show-after="200"
                                :content="dictItemLabel(item)"
                              >
                                <div
                                  class="menu-item-row menu-item-row--popover-ref"
                                  @click.stop
                                >
                                  <img
                                    v-if="item.logo"
                                    :src="formatProcessUrl(item.logo)"
                                    alt=""
                                    class="menu-item-logo"
                                  />
                                  <span>{{ item.content || item.name }}</span>
                                </div>
                              </el-tooltip>
                            </template>
                          </SimulateCameraQrPopover>
                        </div>
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-else
                        :key="`normal-${dictItemKey(item)}`"
                        @click.stop="handleMoreToolClick(item)"
                      >
                        <div class="dropdown-tooltip-anchor">
                          <el-tooltip
                            effect="dark"
                            placement="right"
                            :show-after="200"
                            :content="dictItemLabel(item)"
                          >
                            <div class="menu-item-row">
                              <img
                                v-if="item.logo"
                                :src="formatProcessUrl(item.logo)"
                                alt=""
                                class="menu-item-logo"
                              />
                              <span>{{ item.content || item.name }}</span>
                            </div>
                          </el-tooltip>
                        </div>
                      </el-dropdown-item>
                    </template>
                    <el-dropdown-item
                      v-for="(item, idx) in appList"
                      :key="`${item.packageName}/${item.activityName}`"
                      :divided="idx === 0 && btnListMenu.length > 0"
                      @click.stop="openAppShortcut(item)"
                    >
                      <div class="dropdown-tooltip-anchor">
                        <el-tooltip
                          effect="dark"
                          placement="right"
                          :show-after="200"
                          :content="item.apkName ?? ''"
                        >
                          <div class="menu-item-row">
                            <img
                              v-if="item.logo"
                              :src="formatProcessUrl(item.logo)"
                              alt=""
                              class="menu-item-logo"
                            />
                            <span>{{ item.apkName }}</span>
                          </div>
                        </el-tooltip>
                      </div>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <div
            class="scrcpy_box"
            :style="{
              height: `${Math.ceil((isLarge ? widthLarge : widthSmall) * 1.77)}px`,
              width: `${isLarge ? widthLarge : widthSmall}px`,
            }"
          >
            <WebAdb
              v-if="webAdbDevice.deviceId"
              :key="webAdbKey"
              ref="webAdbRef"
              :device="webAdbDevice"
              :large-screen="isLarge"
              embedded
              @message-sent="handleMessageSent"
            />
            <div v-else class="scrcpy-placeholder">
              <div class="loading-container loading-container--small-card">
                <div
                  class="loading-spinner"
                  v-show="
                    !(
                      (device && device.deviceStatus === 'OFFLINE') ||
                      (device &&
                        !device.connIp &&
                        device.deviceStatus === 'ONLINE')
                    )
                  "
                ></div>
                <div class="loading-text">
                  {{
                    device && device.deviceStatus === 'OFFLINE'
                      ? $t('webadb.scrcpy.deviceOffline')
                      : device &&
                          !device.connIp &&
                          device.deviceStatus === 'ONLINE'
                        ? $t('webadb.scrcpy.noConnIp')
                        : $t('webadb.scrcpy.connectingDevice')
                  }}
                </div>
              </div>
            </div>
            <div v-if="!allowSmallControl && !isLarge" class="mask"></div>
          </div>
          <DeviceOperateButton
            v-if="isLarge && props.showOperationTab"
            @press-key="handlePressKey"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.scrcpy-container {
  position: relative;
}

.zIndex {
  z-index: 9;
}

.screen_casting {
  align-items: center;
  background-color: #7da4e0;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-bottom: 8px;
  position: relative;

  .text {
    color: #fff;
    font-size: 12px;
  }
}

.top_25 {
  top: 25px;
}

.gy-drag-modal {
  border-radius: 6px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 12%);
  overflow: hidden;
  position: relative;
}

.small-hover-wrap {
  position: relative;
}

.small-hover-wrap--enabled {
  padding-top: 25px;
}

.small-hover-wrap--enabled:hover :deep(.hover-header) {
  display: flex;
}

.gy-drag-modal-body--large {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.fixed {
  left: 40%;
  position: fixed;
  top: 10%;
  z-index: 50;
}

.header {
  align-items: center;
  background: #5c3e5c;
  color: #fff;
  display: flex;
  font-size: 12px;
  justify-content: center;
  line-height: 1.3;
  min-height: 41px;
  padding: 3px 5px;
  text-align: center;
}

.header_inner {
  align-items: center;
  display: flex;
  gap: 4px;
  padding: 4px;
  width: 100%;
}

/* el-tooltip 默认触发器常为 inline-block，在 flex 里不拉伸会导致输入框可视区域异常裁切 */
.header_inner > .header-scrcpy-tooltip {
  flex: 1 1 0;
  max-width: 100%;
  min-width: 0;
}

.header_inner > .header-scrcpy-tooltip :deep(.el-tooltip__trigger) {
  box-sizing: border-box;
  display: flex;
  max-width: 100%;
  min-width: 0;
  overflow: visible;
  width: 100%;
}

.title .header-scrcpy-tooltip.header-scrcpy-tooltip--large {
  flex: 1 1 0;
  max-width: 100%;
  min-width: 0;
}

.title
  .header-scrcpy-tooltip.header-scrcpy-tooltip--large
  :deep(.el-tooltip__trigger) {
  box-sizing: border-box;
  display: flex;
  max-width: 100%;
  min-width: 0;
  overflow: visible;
  width: 100%;
}

.header_device_tip_trigger {
  align-items: center;
  display: flex;
  flex: 1;
  gap: 4px;
  min-width: 0;
}

.title_device_tip_trigger {
  align-items: center;
  display: flex;
  flex: 1;
  gap: 8px;
  min-height: 30px;
  min-width: 0;
}

.status-circle {
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  height: 8px;
  width: 8px;
}

.status-circle--large {
  margin-left: 10px;
  margin-right: 2px;
  height: 10px;
  width: 10px;
}

.check_box {
  flex-shrink: 0;
}

.check_box :deep(.el-checkbox__inner) {
  border-radius: 2px;
}

.num {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 400;
  min-width: 24px;
}

.header_content {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 0 2px;
}

.view {
  align-items: center;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 1px 8px;
}

.view:hover {
  border: 1px dashed rgb(255 255 255 / 50%);
}

.header_content--no-checkbox {
  align-items: center;
  text-align: center;
}

.device_aliases {
  align-items: center;
  display: flex;
  flex: 1 1 0;
  max-width: 100%;
  min-width: 0;
  overflow: visible;
  width: 100%;
}

.device_aliases input {
  /* 避免继承 .header 的 color:#fff + 透明底，否则像普通文字、看不出输入框 */
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: 24px;
  box-sizing: border-box;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  padding: 0 6px;
  font-size: 12px;
  line-height: 1.25;
  background-color: #fff;
  color: #303133;
  caret-color: #303133;
  direction: ltr;
  text-align: left;
  overflow-x: auto;
  overflow-y: hidden;
  user-select: text;
  -webkit-user-select: text;
  touch-action: auto;
  cursor: text;
  appearance: auto;
}

.device_aliases input:focus {
  border-color: #409eff;
  outline: none;
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.35);
}

.idx {
  font-size: 13px;
  line-height: 1.1;
}

.ip {
  font-size: 12px;
  opacity: 0.95;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gy-drag-modal-header {
  align-items: center;
  background: #5c3e5c;
  color: #fff;
  display: flex;
  justify-content: space-between;
  min-height: 40px;
  padding: 2px 2px 0 0;
  /* 画布带 transform 时会向上叠出容器，盖住头部导致关闭/工具条点击落到画面上 */
  position: relative;
  z-index: 2;
}

.title {
  align-items: center;
  display: flex;
  flex: 1;
  gap: 8px;
  min-height: 30px;
  min-width: 0;
  padding: 4px 0 6px 4px;
}

.gy-drag-modal-drag {
  cursor: move;
  user-select: none;
}

.deviceIdx {
  min-width: 100px;
  overflow: hidden;
  padding-left: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deviceIp {
  font-size: 14px;
}

.close {
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  margin-left: auto;
  margin-right: 2px;
  margin-top: -2px;
  border-radius: 4px;
  padding: 2px;
  transition: background-color 0.2s;
}

.close:hover {
  background-color: rgb(255 255 255 / 10%);
}

/* 视觉上加粗：矢量略放大（不改变点击热区由 padding 承担） */
.close :deep(svg) {
  filter: drop-shadow(0 0 0.4px #fff);
  transform: scale(1.06);
}

.body_header {
  align-items: center;
  background: #5c3e5c;
  border-bottom: none;
  color: #fff;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-height: 38px;
  padding: 8px 12px;
  position: relative;
  z-index: 2;
}

.left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.verification-code-row {
  padding-left: 12px;
  align-items: center;
  color: #fff;
  display: inline-flex;
  font-size: 14px;
}

.verification-code-label {
  flex-shrink: 0;
  margin-right: 4px;
}

.verification-code-value {
  font-weight: 400;
  letter-spacing: 0.02em;
}

.verification-code-value.is-empty {
  opacity: 0.92;
}

.refresh-code-icon {
  cursor: pointer;
  font-size: 14px;
  margin-left: 8px;
  opacity: 0.9;
}

.refresh-code-icon.is-loading {
  animation: scrcpy-webadb-spin 0.85s linear infinite;
}

.refresh-code-icon:hover {
  opacity: 1;
}

.right {
  align-items: center;
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.op_trigger {
  align-items: center;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  height: 24px;
  justify-content: center;
  margin-right: 10px;
  width: 24px;

  .icon-more {
    color: #fff;
    font-size: 20px;
    line-height: 1;
  }
}

:deep(.menu-item-row) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

:deep(.menu-item-logo) {
  width: 15px;
  height: 15px;
  object-fit: contain;
  flex-shrink: 0;
}

.scrcpy_box {
  background: #000;
  position: relative;
  z-index: 0;
}

.scrcpy-placeholder {
  height: 100%;
  position: relative;
  width: 100%;
}

.loading-container--small-card {
  align-items: center;
  background: #ececec;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  inset: 0;
  justify-content: center;
  padding: 16px;
  position: absolute;
  z-index: 2;
}

.loading-container--small-card .loading-spinner {
  animation: scrcpy-webadb-spin 0.85s linear infinite;
  border: 2px solid rgb(64 158 255 / 35%);
  border-radius: 50%;
  border-top-color: #409eff;
  flex-shrink: 0;
  height: 28px;
  margin: 0 auto 10px;
  width: 28px;
}

.loading-container--small-card .loading-text {
  color: #6f7684;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.2;
  text-align: center;
  width: 100%;
}

@keyframes scrcpy-webadb-spin {
  to {
    transform: rotate(360deg);
  }
}

.mask {
  background: rgb(0 0 0 / 0%);
  bottom: 0;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  z-index: 2;
  pointer-events: none;
}

:deep(.file-manager-drawer .folder-icon-container) {
  color: #f4ce66;
}

:deep(.file-manager-drawer .folder-icon) {
  font-size: 20px;
}
</style>

<style lang="less">
/* Teleport 到 body，需非 scoped */
.scrcpy-device-info-tooltip {
  max-width: 380px;

  .scrcpy-device-info-tooltip__row {
    display: flex;
    gap: 10px;
    font-size: 12px;
    line-height: 22px;
    text-align: left;
  }

  .scrcpy-device-info-tooltip__label {
    flex-shrink: 0;
    color: rgba(255, 255, 255, 0.72);
  }

  .scrcpy-device-info-tooltip__value {
    color: #fff;
    word-break: break-all;
  }
}
</style>
