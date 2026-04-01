<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElMessage, ElMessageBox } from 'element-plus';
import { TopRight } from '@element-plus/icons-vue';

import { $t } from '#/locales';

import {
  getContainerAssetPageApi,
  unbindAccountApi,
  unbindProxyApi,
  type DeviceEnableItem,
  type DeviceItem,
} from '#/api/core/asset';

import LargeScreen from '#/components/WebAdb/LargeScreen.vue';

import DevicePinActions from './DevicePinActions.vue';
import DeviceGrid from './DeviceGrid.vue';
import DeviceTable from './DeviceTable.vue';

const router = useRouter();
const props = defineProps<{
  groupOptions?: Array<{ id: string; suiteName: string }>;
  /** 拖拽账号/代理到设备前调用 POST /asset/check/account-device，返回 false 时不落地绑定 */
  checkDropDeviceEnables?: (
    deviceEnables: DeviceEnableItem[],
  ) => Promise<boolean>;
}>();

const emit = defineEmits<{
  (e: 'refreshSummary'): void;
  (e: 'refreshProxyList'): void;
}>();
const loading = ref(false);
const finished = ref(false);

const filterForm = reactive({
  screening: '',
  search: '',
  suiteIds: [] as string[],
  associationStatus: '',
  sort: '',
});

const viewMode = ref<'grid' | 'table'>('grid');

const tablePagination = reactive({
  current: 1,
  size: 20,
  total: 0,
});

const tableData = ref<DeviceItem[]>([]);

const pagination = reactive({
  current: 1,
  size: 20,
  total: 0,
});

const list = ref<DeviceItem[]>([]);
const allMockRecords = ref<DeviceItem[]>([]);
const boardContentRef = ref<HTMLElement | null>(null);
const autoFillRunning = ref(false);

const largeScreenVisible = ref(false);
const largeScreenDevice = ref<DeviceItem | null>(null);
const selectedDeviceKeys = ref<string[]>([]);
const pinnedDeviceKeys = ref<string[]>([]);
const pinMode = ref(false);
const pinnedRecords = computed(() => {
  if (!pinnedDeviceKeys.value.length) return [];
  return allMockRecords.value.filter((item) =>
    pinnedDeviceKeys.value.includes(getDeviceKey(item)),
  );
});
const showPinnedOnly = computed(() => pinMode.value);
const displayGridList = computed(() =>
  showPinnedOnly.value ? pinnedRecords.value : list.value,
);

type BoundAccount = {
  accountId?: string;
  account?: string;
  userAccount?: string;
  appId?: string;
  platform?: string;
  logoPath?: string;
  /** true：列表接口带回，可解绑；false：拖拽/自动关联，未正式启用不可解绑 */
  fromServer?: boolean;
};

type BoundProxy = {
  proxyId?: string;
  id?: string;
  /** 设备-代理关联 id，解绑接口使用 */
  assId?: string;
  accountId?: string;
  area?: string;
  ip?: string;
  proxy?: string;
  proxyArea?: string;
  proxyGroup?: string;
  bandingCount?: number;
  /** true：列表/接口带回，可解绑；false：拖拽/自动关联，未正式启用不可解绑 */
  fromServer?: boolean;
};

function getProxyId(proxy: Partial<BoundProxy> & Record<string, any>) {
  return proxy.proxyId as string;
}

/** 代理展示值：优先使用原始 proxy 串，缺失时再回退 area + ip / ip */
function getProxyDisplayText(proxy: Partial<BoundProxy> & Record<string, any>) {
  return proxy.proxy as string;
}

function getProxyBindingCount(proxy: Partial<BoundProxy> & Record<string, any>) {
  return Number(proxy?.bandingCount ?? 0);
}

async function allocateProxiesForAutoAssociate(
  proxies: BoundProxy[],
  bindCount: number,
) {
  if (!proxies.length || bindCount <= 0) return [] as BoundProxy[];

  const states = proxies.map((proxy, index) => ({
    index,
    proxy,
    current: getProxyBindingCount(proxy),
    reused: 0,
  }));

  const needReuse = bindCount > proxies.length;
  if (needReuse) {
    try {
      await ElMessageBox.confirm(
        $t('associationCenter.proxyReuseConfirmMessage'),
        $t('associationCenter.proxyReuseConfirmTitle'),
        {
          type: 'warning',
          confirmButtonText: $t('associationCenter.confirmButtonText'),
          cancelButtonText: $t('associationCenter.cancelButtonText'),
        },
      );
    } catch {
      ElMessage.info($t('associationCenter.proxyReuseCancelled'));
      return null;
    }
  }

  const pickLowestWithRandomTie = (
    pool: Array<{ index: number; proxy: BoundProxy; current: number; reused: number }>,
  ) => {
    const minCurrent = Math.min(...pool.map((item) => item.current));
    const currentCandidates = pool.filter((item) => item.current === minCurrent);
    const minReused = Math.min(...currentCandidates.map((item) => item.reused));
    const finalCandidates = currentCandidates.filter(
      (item) => item.reused === minReused,
    );
    const randomIndex = Math.floor(Math.random() * finalCandidates.length);
    return finalCandidates[randomIndex];
  };

  // 代理数 > 设备数：优先使用关联数更低的代理；同数量随机
  if (!needReuse) {
    const pool = [...states];
    const result: BoundProxy[] = [];
    for (let i = 0; i < bindCount; i++) {
      if (!pool.length) break;
      const picked = pickLowestWithRandomTie(pool);
      if (!picked) break;
      result.push(picked.proxy);
      const removeIndex = pool.findIndex((item) => item.index === picked.index);
      if (removeIndex > -1) pool.splice(removeIndex, 1);
    }
    return result;
  }

  // 设备数 > 代理数：先按选择顺序一轮分配，再复用“使用数更低”的代理（同数量随机）
  const result: BoundProxy[] = proxies.slice();
  const remaining = bindCount - proxies.length;
  if (remaining <= 0) return result.slice(0, bindCount);

  for (const state of states) {
    state.current += 1;
    state.reused += 1;
  }

  for (let i = 0; i < remaining; i++) {
    const picked = pickLowestWithRandomTie(states);
    if (!picked) break;
    result.push(picked.proxy);
    picked.current += 1;
    picked.reused += 1;
  }
  return result;
}

/** 统一读取账号 appId（用于同设备唯一校验） */
function getAccountAppId(
  account: Partial<BoundAccount> & Record<string, any>,
): string {
  return account.appId as string;
}

/** 收集设备已绑定的 appId（含后端 accountInfos 与前端 boundAccounts） */
function getDeviceBoundAppIds(item: DeviceItem) {
  const appIds: string[] = [];
  const boundAccounts = (item.boundAccounts as BoundAccount[] | undefined) || [];
  const accountInfos = (item.accountInfos as Record<string, any>[] | undefined) || [];

  boundAccounts.forEach((acc) => {
    const appId = getAccountAppId(acc as Record<string, any>);
    if (appId && !appIds.includes(appId)) appIds.push(appId);
  });
  accountInfos.forEach((acc) => {
    const appId = getAccountAppId(acc);
    if (appId && !appIds.includes(appId)) appIds.push(appId);
  });
  return appIds;
}

/** 合并 accountInfos（接口）与 boundAccounts（前端新增），按 accountId 去重 */
function getMergedBoundAccounts(item: DeviceItem): BoundAccount[] {
  const fromApi = (item.accountInfos as Record<string, any>[] | undefined) || [];
  const fromBound = (item.boundAccounts as BoundAccount[] | undefined) || [];
  const byId = new Map<string, BoundAccount>();
  fromApi.forEach((a) => {
    const accountId = a.accountId as string;
    if (accountId) {
      byId.set(accountId, {
        accountId,
        appId: a.appId,
        userAccount: a.userAccount,
        account: a.accountNickname,
        logoPath: a.appLogo,
        fromServer: a.fromServer === true,
      });
    }
  });
  fromBound.forEach((a) => {
    const accountId = a.accountId;
    if (!accountId) return;
    byId.set(accountId, {
      ...a,
      accountId,
      userAccount: a.userAccount,
      account: a.account,
    });
  });
  return [...byId.values()];
}

/** 将 boundAccounts 同步回接口字段 accountInfos，确保新增绑定可回显 */
function syncAccountInfosFromBound(item: DeviceItem) {
  const accounts = (item.boundAccounts as BoundAccount[] | undefined) || [];
  item.accountInfos = accounts.map((acc) => ({
    ...acc,
    appId: acc.appId,
    appLogo: acc.logoPath,
    accountId: acc.accountId,
    userAccount: acc.userAccount,
    accountNickname: (() => {
      const nickname = acc.account;
      const userAccount = acc.userAccount;
      return nickname && nickname !== userAccount ? nickname : '';
    })(),
    color: item.color,
    fromServer: acc.fromServer === true,
  }));
}

/** 列表接口写入后：当前 accountInfos 均视为服务端数据，可解绑 */
function markAccountInfosFromServer(item: DeviceItem) {
  const infos = (item.accountInfos as Record<string, any>[] | undefined) || [];
  for (const a of infos) {
    a.fromServer = true;
  }
}

/** 列表接口写入后：boundProxies 视为服务端绑定 */
function markProxyBindingsFromServer(item: DeviceItem) {
  const r = item as Record<string, any>;
  const list = (r.boundProxies as BoundProxy[] | undefined) || [];
  for (const p of list) {
    p.fromServer = true;
  }
}

/** 收集设备已绑定的账号 ID（兼容后端 accountInfos 与前端 boundAccounts） */
function getDeviceBoundAccountIds(item: DeviceItem) {
  const accountIds: string[] = [];
  const boundAccounts = (item.boundAccounts as BoundAccount[] | undefined) || [];
  const accountInfos = (item.accountInfos as Record<string, any>[] | undefined) || [];

  boundAccounts.forEach((acc) => {
    const accountId = acc.accountId;
    if (accountId && !accountIds.includes(accountId)) accountIds.push(accountId);
  });
  accountInfos.forEach((acc) => {
    const accountId = acc.accountId as string;
    if (accountId && !accountIds.includes(accountId)) accountIds.push(accountId);
  });

  return accountIds;
}

/** 构建设备分页请求参数，与容器分页接口字段一致 */
function buildRequestParams() {
  const params: Record<string, any> = {
    current: pagination.current,
    size: pagination.size,
    screening: filterForm.screening,
    search: filterForm.search,
    relationStatus: filterForm.associationStatus,
  };
  if (filterForm.suiteIds.length) {
    params.suiteIds = filterForm.suiteIds;
  }
  return params;
}

/** 拉取并追加设备列表数据，同时维护分页与完成状态 */
async function fetchData() {
  if (loading.value) return;

  loading.value = true;
  try {
    const { records = [], total = 0 } =
      await getContainerAssetPageApi<DeviceItem>(buildRequestParams());
    pagination.total = total;
    tablePagination.total = total;
    for (const item of records) {
      markAccountInfosFromServer(item);
      markProxyBindingsFromServer(item);
    }
    allMockRecords.value.push(...records);
    finished.value = records.length === 0 || allMockRecords.value.length >= total;
    if (!finished.value) pagination.current += 1;
    refreshDisplayedDeviceData();
  } catch (error) {
    console.error(error);
    ElMessage.error($t('common.error.loadFailed'));
    finished.value = true;
  } finally {
    loading.value = false;
    if (viewMode.value === 'grid' && !showPinnedOnly.value && !finished.value) {
      void ensureGridScrollableOrFinished();
    }
  }
}

/** 网格模式下若首屏未出现可拖动滚动条，自动补拉后续页 */
async function ensureGridScrollableOrFinished() {
  if (autoFillRunning.value) return;
  if (viewMode.value !== 'grid' || showPinnedOnly.value) return;

  autoFillRunning.value = true;
  try {
    let guard = 0;
    while (!finished.value && guard < 20) {
      await nextTick();
      const scroller = boardContentRef.value?.querySelector(
        '.cards-wrapper',
      ) as HTMLElement | null;
      if (!scroller) break;
      if (scroller.scrollHeight > scroller.clientHeight + 2) break;
      if (loading.value) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        continue;
      }
      await fetchData();
      guard += 1;
    }
  } finally {
    autoFillRunning.value = false;
  }
}

/** 执行查询：重置分页/列表/选择状态并重新加载 */
function handleSearch() {
  pagination.current = 1;
  pagination.total = 0;
  tablePagination.current = 1;
  tablePagination.total = 0;
  list.value = [];
  allMockRecords.value = [];
  finished.value = false;
  selectedDeviceKeys.value = [];
  pinnedDeviceKeys.value = [];
  pinMode.value = false;
  void fetchData();
}

/** 对外：刷新设备列表并拉取最新数据 */
async function refreshDeviceList() {
  pagination.current = 1;
  tablePagination.current = 1;
  tablePagination.total = 0;
  list.value = [];
  allMockRecords.value = [];
  finished.value = false;
  selectedDeviceKeys.value = [];
  pinnedDeviceKeys.value = [];
  pinMode.value = false;
  await fetchData();
}

/** 无限滚动加载更多设备数据 */
function handleLoadMore() {
  if (showPinnedOnly.value) return;
  if (loading.value || finished.value) return;
  void fetchData();
}

/** 表格区域拖拽悬停处理：仅允许账号/代理数据进入 */
function onTableDragOver(ev: DragEvent) {
  const dt = ev.dataTransfer;
  if (!dt) return;
  const types = Array.from(dt.types);
  if (
    types.includes('application/x-account-items') ||
    types.includes('application/x-proxy-item')
  ) {
    ev.preventDefault();
  }
}

/** 表格区域释放处理：定位目标行并复用卡片投放逻辑 */
function onTableDrop(ev: DragEvent) {
  const target = ev.target as HTMLElement | null;
  if (!target) return;

  const rowEl = target.closest('.el-table__row') as HTMLTableRowElement | null;
  if (!rowEl) return;

  const tbody = rowEl.parentElement;
  if (!tbody) return;
  const rows = Array.from(
    tbody.querySelectorAll<HTMLTableRowElement>('.el-table__row'),
  );
  const rowIndex = rows.indexOf(rowEl);
  if (rowIndex < 0 || rowIndex >= tableData.value.length) return;

  const row = tableData.value[rowIndex];
  if (!row) return;

  onCardDrop(ev, row);
}

/** 刷新表格分页数据（与筛选条件保持一致） */
function updateTableData() {
  const filtered = showPinnedOnly.value ? pinnedRecords.value : list.value;
  tablePagination.total = showPinnedOnly.value
    ? filtered.length
    : pagination.total;
  const start = (tablePagination.current - 1) * tablePagination.size;
  const end = start + tablePagination.size;
  tableData.value = filtered.slice(start, end);
}

function normalizePinnedDeviceKeys() {
  const existingKeys = allMockRecords.value.map((item) => getDeviceKey(item));
  pinnedDeviceKeys.value = pinnedDeviceKeys.value.filter((key) => existingKeys.includes(key));
  if (!pinnedDeviceKeys.value.length) pinMode.value = false;
}

function refreshDisplayedDeviceData() {
  normalizePinnedDeviceKeys();
  list.value = [...allMockRecords.value];
  updateTableData();
}

/** 表格分页切换事件 */
async function handleTablePageChange(page: number) {
  tablePagination.current = page;
  const needCount = page * tablePagination.size;
  while (allMockRecords.value.length < needCount && !finished.value) {
    await fetchData();
  }
  updateTableData();
}

/** 获取设备唯一 key（当前使用 deviceIp） */
function getDeviceKey(item: DeviceItem) {
  return item.deviceIp;
}

/** 从设备记录中提取可用于正式启用接口的设备 ID */
function getDeviceId(item: DeviceItem) {
  return item.deviceId
}

/** 从设备记录中提取可用于正式启用接口的代理 ID */
function getDeviceProxyId(item: DeviceItem) {
  const bound = (item.boundProxies as BoundProxy[] | undefined) || [];
  const fromBound = bound.length > 0 ? getProxyId(bound[0]!) : '';
  if (fromBound) return fromBound;
  return ((item as Record<string, any>)?.proxyId) as string;
}

/** 构造单台设备的 deviceEnables 项（与正式启用接口结构一致） */
function buildDeviceEnablePayload(
  item: DeviceItem,
  overrides?: { accountIds?: string[]; proxyId?: string },
): DeviceEnableItem | null {
  const deviceId = getDeviceId(item);
  if (!deviceId) return null;
  const accountIds =
    overrides?.accountIds ?? getDeviceBoundAccountIds(item);
  const proxyId = overrides?.proxyId ?? (getDeviceProxyId(item) || '');
  return {
    deviceId,
    deviceIp: item.deviceIp ?? '',
    accountIds,
    proxyId,
  };
}

/** 点击设备：仅切换选中状态（用于自动关联） */
function handleDeviceClick(item: DeviceItem) {
  toggleDeviceSelect(item);
}

/** 双击设备：打开 WebAdb 大屏 */
function handleDeviceDblClick(item: DeviceItem) {
  largeScreenDevice.value = item;
  largeScreenVisible.value = true;
}

function closeLargeScreen() {
  largeScreenVisible.value = false;
}

function onLargeScreenDialogClosed() {
  largeScreenDevice.value = null;
}

/** 切换设备选中状态（用于自动关联） */
function toggleDeviceSelect(item: DeviceItem) {
  const key = getDeviceKey(item);
  if (!key) return;
  const idx = selectedDeviceKeys.value.indexOf(key);
  if (idx > -1) selectedDeviceKeys.value.splice(idx, 1);
  else selectedDeviceKeys.value.push(key);
}

/** 清空设备选中状态（对外暴露给父组件） */
function clearSelectedDevices() {
  selectedDeviceKeys.value = [];
}

function handleTogglePinDevices() {
  if (showPinnedOnly.value) {
    pinnedDeviceKeys.value = [];
    pinMode.value = false;
    tablePagination.current = 1;
    refreshDisplayedDeviceData();
    return;
  }
  if (!selectedDeviceKeys.value.length) {
    ElMessage.warning($t('associationCenter.selectDeviceBeforePin'));
    return;
  }
  pinnedDeviceKeys.value = selectedDeviceKeys.value.filter(Boolean);
  pinMode.value = true;
  tablePagination.current = 1;
  refreshDisplayedDeviceData();
}

/** 获取当前设备看板列表快照（用于调试打印） */
function getDeviceBoardList() {
  return allMockRecords.value;
}

/** 获取当前已选设备 ID 列表（用于反向查询） */
function getSelectedDeviceIds() {
  const selectedKeys = selectedDeviceKeys.value;
  return allMockRecords.value.reduce((ids, item) => {
    const deviceId = getDeviceId(item);
    if (selectedKeys.includes(getDeviceKey(item)) && deviceId) ids.push(deviceId);
    return ids;
  }, [] as string[]);
}

/** 应用反向查询结果（有数据则覆盖渲染，无数据则展示空） */
function applyReverseQueryDevices(devices: DeviceItem[] | null | undefined) {
  const nextList = Array.isArray(devices) ? devices : [];
  for (const item of nextList) {
    markAccountInfosFromServer(item);
    markProxyBindingsFromServer(item);
  }
  allMockRecords.value = [...nextList];
  list.value = [...nextList];
  selectedDeviceKeys.value = [];
  pinnedDeviceKeys.value = [];
  pinMode.value = false;
  pagination.current = 1;
  pagination.total = nextList.length;
  tablePagination.current = 1;
  tablePagination.total = nextList.length;
  finished.value = true;
  loading.value = false;
  updateTableData();
}

/** 构建正式启用接口所需的 deviceEnables 数组 */
function getSelectedDeviceEnables() {
  const selectedRecords = allMockRecords.value.filter((item) =>
    selectedDeviceKeys.value.includes(getDeviceKey(item)),
  );
  return selectedRecords
    .map((item) => {
      const accountIds = getDeviceBoundAccountIds(item);
      const proxyId = getDeviceProxyId(item);
      const deviceId = getDeviceId(item);
      const deviceIp = item.deviceIp ?? '';
      if (!deviceId) return null;
      const payload: {
        deviceId: string;
        deviceIp: string;
        accountIds: string[];
        proxyId: string;
      } = {
        deviceId,
        deviceIp,
        accountIds,
        proxyId,
      };
      return payload;
    })
    .filter(
      (item): item is {
        deviceId: string;
        deviceIp: string;
        accountIds: string[];
        proxyId: string;
      } =>
        Boolean(item),
    );
}

/** 卡片区域拖拽悬停处理：仅允许账号/代理数据进入 */
function onCardDragOver(ev: DragEvent) {
  const dt = ev.dataTransfer;
  if (!dt) return;
  const types = Array.from(dt.types);
  if (
    types.includes('application/x-account-items') ||
    types.includes('application/x-proxy-item')
  ) {
    ev.preventDefault();
  }
}

/** 卡片投放处理：支持账号与代理拖拽绑定，并做重复/冲突校验 */
async function onCardDrop(ev: DragEvent, item: DeviceItem) {
  const dt = ev.dataTransfer;
  if (!dt) return;
  ev.preventDefault();

  const accountData = dt.getData('application/x-account-items');
  const proxyData = dt.getData('application/x-proxy-item');

  const target =
    allMockRecords.value.find((d) => d.deviceIp === item.deviceIp) || item;

  if (accountData) {
    let accounts: BoundAccount[] = [];
    try {
      accounts = JSON.parse(accountData) as BoundAccount[];
    } catch {
      ElMessage.error($t('associationCenter.accountDragParseFailed'));
      return;
    }

    const existing = getMergedBoundAccounts(target);
    const existingAppIds = getDeviceBoundAppIds(target);
    const currentAppIds = [...existingAppIds];

    for (const acc of accounts) {
      const appId = getAccountAppId(acc as Record<string, any>);
      if (appId && currentAppIds.includes(appId)) {
        ElMessage.error($t('associationCenter.oneAccountPerPlatformPerDevice'));
        return;
      }
      if (appId) currentAppIds.push(appId);
    }

    const nextAccountIds = [...getDeviceBoundAccountIds(target)];
    for (const acc of accounts) {
      const id = acc.accountId;
      if (id && !nextAccountIds.includes(id)) nextAccountIds.push(id);
    }
    const deviceEnable = buildDeviceEnablePayload(target, {
      accountIds: nextAccountIds,
    });
    if (!deviceEnable) {
      ElMessage.warning($t('associationCenter.deviceMissingForBind'));
      return;
    }
    if (props.checkDropDeviceEnables) {
      const ok = await props.checkDropDeviceEnables([deviceEnable]);
      if (!ok) return;
    }

    target.boundAccounts = [
      ...existing,
      ...accounts.map((a) => ({ ...a, fromServer: false })),
    ];
    syncAccountInfosFromBound(target);
    updateTableData();
    return;
  }

  if (proxyData) {
    let proxy: BoundProxy;
    try {
      proxy = JSON.parse(proxyData) as BoundProxy;
    } catch {
      ElMessage.error($t('associationCenter.proxyDragParseFailed'));
      return;
    }

    const newProxyId = getProxyId(proxy) || '';
    const deviceEnable = buildDeviceEnablePayload(target, {
      proxyId: newProxyId,
    });
    if (!deviceEnable) {
      ElMessage.warning($t('associationCenter.deviceMissingForBind'));
      return;
    }
    if (props.checkDropDeviceEnables) {
      const ok = await props.checkDropDeviceEnables([deviceEnable]);
      if (!ok) return;
    }

    const displayProxy = getProxyDisplayText(proxy);
    target.boundProxies = [
      { ...proxy, proxy: displayProxy, proxyArea: proxy.area, fromServer: false },
    ];
    target.proxy = displayProxy;
    target.proxyArea = proxy.area;
    updateTableData();
    ElMessage.success($t('associationCenter.proxyBoundToDevice'));
  }
}

/** 切换设备展示模式（卡片/表格） */
function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'table' : 'grid';
  if (viewMode.value === 'grid') {
    void ensureGridScrollableOrFinished();
  }
}

/** 解绑成功后静默拉第一页列表：不触发全局 loading、不先清空列表，避免闪烁 */
async function refreshDeviceListAfterUnbind() {
  try {
    const { records = [], total = 0 } =
      await getContainerAssetPageApi<DeviceItem>({
        ...buildRequestParams(),
        current: 1,
      });
    pagination.total = total;
    tablePagination.total = total;
    for (const item of records) {
      markAccountInfosFromServer(item);
      markProxyBindingsFromServer(item);
    }
    allMockRecords.value = [...records];
    finished.value =
      records.length === 0 || allMockRecords.value.length >= total;
    pagination.current = finished.value ? 1 : 2;
    tablePagination.current = 1;
    refreshDisplayedDeviceData();
  } catch (error) {
    console.error(error);
    ElMessage.error($t('common.error.loadFailed'));
  }
}

/** 解绑设备上的代理（仅列表/正式绑定可解绑） */
async function handleUnbindProxy(item: DeviceItem) {
  const proxyId = item?.proxyId
  const assId = item?.assId

  const payload: { assId: string; proxyId: string } = { assId, proxyId };
  try {
    const res = await unbindProxyApi(payload);
    if (res?.code === 100000) {
      if (res.msg) {
        ElMessage.success(res.msg);
      }
      await refreshDeviceListAfterUnbind();
      emit('refreshSummary');
      emit('refreshProxyList');
    }
  } catch (e) {
    console.error(e);
    ElMessage.error($t('associationCenter.unbindProxyFailed'));
  }
}

/** 解绑设备上的单个账号 */
async function handleUnbindAccount(item: DeviceItem, accountId: string) {
  if (!accountId) return;
  const deviceId = getDeviceId(item);
  if (!deviceId) {
    ElMessage.warning($t('associationCenter.unbindMissingDeviceId'));
    return;
  }
  const row = (item.accountInfos as Record<string, any>[] | undefined)?.find(
    (a) => a.accountId === accountId,
  );
  if (!row?.fromServer) {
    ElMessage.warning($t('associationCenter.unbindOnlyServerAccount'));
    return;
  }
  try {
    const res = await unbindAccountApi({
      deviceId,
      accountIds: [accountId],
      bind: 'UNBINDING',
    });
    if (res?.code === 100000) {
      if (res.msg) {
        ElMessage.success(res.msg);
      }
      await refreshDeviceListAfterUnbind();
      emit('refreshSummary');
    }
  } catch (e) {
    console.error(e);
    ElMessage.error($t('associationCenter.unbindAccountFailed'));
  }
}

/** 自动关联：账号与设备按 1v1 绑定，代理支持复用到多个设备 */
async function autoAssociateWithSelections(
  accounts: BoundAccount[],
  proxies: BoundProxy[],
) {
  const deviceMap = new Map<string, DeviceItem>();
  allMockRecords.value.forEach((d) => {
    const key = getDeviceKey(d);
    if (key) deviceMap.set(key, d);
  });
  const devices = selectedDeviceKeys.value
    .map((key) => deviceMap.get(key))
    .filter((item): item is DeviceItem => Boolean(item));
  const hasAccounts = accounts.length > 0;
  const hasProxies = proxies.length > 0;
  if (!devices.length || (!hasAccounts && !hasProxies)) {
    ElMessage.warning($t('associationCenter.selectDataInAllBoardsFirst'));
    return;
  }

  const selectedAppIds = hasAccounts
    ? Array.from(
        new Set(
          accounts
            .map((item) => getAccountAppId(item as Record<string, any>))
            .filter(Boolean),
        ),
      )
    : [];

  if (hasAccounts && devices.length > 1) {
    if (selectedAppIds.length > 1) {
      ElMessage.error($t('associationCenter.multiAppOnlyOneDevice'));
      return;
    }
  }

  if (hasAccounts && devices.length > 1 && selectedAppIds.length === 1 && accounts.length !== devices.length) {
    ElMessage.error($t('associationCenter.samePlatformCountMismatch'));
    return;
  }

  // 自动关联要求账号与设备严格 1v1，数量必须一致
  if (hasAccounts && accounts.length !== devices.length) {
    ElMessage.error($t('associationCenter.autoAssociateCountMismatch'));
    return;
  }

  const bindCount = devices.length;
  let usedProxies: BoundProxy[] = [];
  if (hasProxies) {
    const allocatedProxies = await allocateProxiesForAutoAssociate(
      proxies,
      bindCount,
    );
    if (!allocatedProxies) return;
    usedProxies = allocatedProxies;
  }
  if (bindCount <= 0) {
    ElMessage.warning($t('associationCenter.insufficientDataToAssociate'));
    return;
  }

  for (let i = 0; i < bindCount; i++) {
    const target = devices[i];
    if (!target) continue;

    if (hasAccounts) {
      const account = accounts[i];
      if (!account) continue;
      const existingAccounts = getMergedBoundAccounts(target);
      const existingAppIds = getDeviceBoundAppIds(target);
      const accountAppId = getAccountAppId(account as Record<string, any>);
      if (accountAppId && existingAppIds.includes(accountAppId)) {
        ElMessage.error(
          $t('associationCenter.deviceAlreadyBoundAppId', {
            deviceIp: target.deviceIp,
          }),
        );
        return;
      }
      target.boundAccounts = [
        ...existingAccounts,
        { ...account, fromServer: false },
      ];
      syncAccountInfosFromBound(target);
    }

    if (hasProxies) {
      const proxy = usedProxies[i];
      if (!proxy) continue;
      const displayProxy = getProxyDisplayText(proxy);
      target.boundProxies = [
        { ...proxy, proxy: displayProxy, proxyArea: proxy.area, fromServer: false },
      ];
      target.proxy = displayProxy;
      target.proxyArea = proxy.area;
    }
  }

  updateTableData();
  if (hasProxies) {
    const droppedProxyCount = Math.max(0, proxies.length - bindCount);
    const reusedProxyCount = Math.max(0, bindCount - proxies.length);
    if (droppedProxyCount > 0) {
      ElMessage.success(
        $t('associationCenter.autoAssociateSuccessDropped', {
          bindCount,
          droppedProxyCount,
        }),
      );
      return;
    }
    if (reusedProxyCount > 0) {
      ElMessage.success(
        $t('associationCenter.autoAssociateSuccessReused', {
          bindCount,
          reusedProxyCount,
        }),
      );
      return;
    }
  }
  ElMessage.success($t('associationCenter.autoAssociateSuccess', { bindCount }));
}

/** 向父组件暴露的方法：切换视图、自动关联、清空设备选择 */
defineExpose({
  toggleViewMode,
  autoAssociateWithSelections,
  clearSelectedDevices,
  refreshDeviceList,
  getSelectedDeviceEnables,
  getDeviceBoardList,
  getSelectedDeviceIds,
  applyReverseQueryDevices,
});

/** 组件初始化：生成 mock 数据并加载第一页 */
onMounted(() => {
  void fetchData();
});
</script>

<template>
  <div class="device-board">
    <div class="board-header">
      <h2 class="board-title">{{ $t('associationCenter.deviceBoard') }}</h2>
      <el-link type="primary" underline="never" @click="router.push('/containerPool')">
        <el-icon :size="22"><TopRight /></el-icon>
      </el-link>
    </div>

    <div class="filter-bar">
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.deviceFilter') }}</label>
        <el-input
          v-model="filterForm.screening"
          :placeholder="$t('associationCenter.deviceFilter')"
          class="filter-input"
          clearable
          @keyup.enter="handleSearch"
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.deviceSearch') }}</label>
        <el-input
          v-model="filterForm.search"
          :placeholder="$t('associationCenter.deviceSearch')"
          class="filter-input"
          clearable
          @keyup.enter="handleSearch"
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.deviceGroup') }}</label>
        <el-select
          v-model="filterForm.suiteIds"
          :placeholder="$t('associationCenter.deviceGroup')"
          class="filter-input"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          @change="handleSearch"
        >
          <el-option
            v-for="item in props.groupOptions || []"
            :key="item.id"
            :label="item.suiteName"
            :value="item.id"
          />
        </el-select>
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.associationStatus') }}</label>
        <el-select
          v-model="filterForm.associationStatus"
          :placeholder="$t('associationCenter.associationStatus')"
          class="filter-input"
          clearable
        >
          <el-option :label="$t('associationCenter.associated')" value="associated" />
          <el-option :label="$t('associationCenter.unassociated')" value="unassociated" />
        </el-select>
      </div>
      <el-button type="primary" @click="handleSearch">
        {{ $t('associationCenter.search') }}
      </el-button>
      <DevicePinActions
        :pinned-active="showPinnedOnly"
        @toggle-pin="handleTogglePinDevices"
      />
    </div>

    <div
      ref="boardContentRef"
      class="board-content"
      :class="{ 'board-content--grid': viewMode === 'grid' }"
    >
      <DeviceGrid
        v-if="viewMode === 'grid'"
        :list="displayGridList"
        :loading="showPinnedOnly ? false : loading"
        :finished="showPinnedOnly ? true : finished"
        :selected-device-keys="selectedDeviceKeys"
        @load-more="handleLoadMore"
        @drag-over="onCardDragOver"
        @drop="onCardDrop"
        @device-click="handleDeviceClick"
        @device-dblclick="handleDeviceDblClick"
        @unbind-account="handleUnbindAccount"
        @unbind-proxy="handleUnbindProxy"
      />
      <DeviceTable
        v-else
        :table-data="tableData"
        :table-pagination="tablePagination"
        :selected-device-keys="selectedDeviceKeys"
        @page-change="handleTablePageChange"
        @drag-over="onTableDragOver"
        @drop="onTableDrop"
        @device-click="handleDeviceClick"
        @device-dblclick="handleDeviceDblClick"
        @unbind-account="handleUnbindAccount"
        @unbind-proxy="handleUnbindProxy"
      />
    </div>

    <el-dialog
      v-model="largeScreenVisible"
      :show-close="false"
      :modal="false"
      width="auto"
      align-center
      destroy-on-close
      class="device-board-large-screen-dialog"
      append-to-body
      @closed="onLargeScreenDialogClosed"
    >
      <LargeScreen
        v-if="largeScreenDevice"
        :device="largeScreenDevice"
        :width="380"
        @close="closeLargeScreen"
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.device-board {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.board-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.filter-bar {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 8px;
  justify-content: flex-start;
}

.filter-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  flex: 0 0 240px;
  min-width: 240px;
}

.filter-bar :deep(.el-button) {
  flex-shrink: 0;
}

.filter-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.filter-input {
  flex: 1;
  min-width: 0;
}

.board-content {
  min-height: 280px;
  max-height: 520px;
  padding-right: 4px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;
}

.board-content--grid {
  height: 520px;
  overflow-y: hidden;
}

.board-content::-webkit-scrollbar {
  width: 6px;
}

.board-content::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}
</style>

<style lang="less">
.device-board-large-screen-dialog {
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  border-radius: 0 !important;
  overflow: visible;

  .el-dialog__header {
    display: none;
  }

  .el-dialog__body {
    padding: 0 !important;
  }
}
</style>
