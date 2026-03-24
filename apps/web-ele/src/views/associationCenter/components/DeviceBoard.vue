<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElMessage } from 'element-plus';
import { TopRight } from '@element-plus/icons-vue';

import { $t } from '#/locales';

import {
  getContainerAssetPageApi,
  type DeviceItem,
} from '#/api/core/asset';

import DevicePinActions from './DevicePinActions.vue';
import DeviceGrid from './DeviceGrid.vue';
import DeviceTable from './DeviceTable.vue';

const router = useRouter();
const props = defineProps<{
  groupOptions?: Array<{ id: string; suiteName: string }>;
}>();
const loading = ref(false);
const finished = ref(false);

const filterForm = reactive({
  screening: '',
  search: '',
  groupId: '',
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
const selectedDeviceKeys = ref<string[]>([]);
const pinnedDeviceKeys = ref<string[]>([]);
const pinMode = ref(false);
const pinnedRecords = computed(() => {
  if (!pinnedDeviceKeys.value.length) return [];
  const pinnedKeySet = new Set(pinnedDeviceKeys.value);
  return allMockRecords.value.filter((item) => pinnedKeySet.has(getDeviceKey(item)));
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
};

type BoundProxy = {
  proxyId?: string;
  id?: string;
  accountId?: string;
  area?: string;
  ip?: string;
  proxy?: string;
  proxyArea?: string;
  proxyGroup?: string;
};

function getProxyId(proxy: Partial<BoundProxy> & Record<string, any>) {
  return proxy.proxyId as string;
}

/** 代理展示值：优先使用原始 proxy 串，缺失时再回退 area + ip / ip */
function getProxyDisplayText(proxy: Partial<BoundProxy> & Record<string, any>) {
  return proxy.proxy as string;
}

/** 统一读取账号 appId（用于同设备唯一校验） */
function getAccountAppId(
  account: Partial<BoundAccount> & Record<string, any>,
): string {
  return account.appId as string;
}

/** 收集设备已绑定的 appId（含后端 accountInfos 与前端 boundAccounts） */
function getDeviceBoundAppIds(item: DeviceItem) {
  const appIds = new Set<string>();
  const boundAccounts = (item.boundAccounts as BoundAccount[] | undefined) || [];
  const accountInfos = (item.accountInfos as Record<string, any>[] | undefined) || [];

  boundAccounts.forEach((acc) => {
    const appId = getAccountAppId(acc as Record<string, any>);
    if (appId) appIds.add(appId);
  });
  accountInfos.forEach((acc) => {
    const appId = getAccountAppId(acc);
    if (appId) appIds.add(appId);
  });
  return appIds;
}

/** 合并 accountInfos（接口）与 boundAccounts（前端新增），按 accountId 去重 */
function getMergedBoundAccounts(item: DeviceItem): BoundAccount[] {
  const fromApi = (item.accountInfos as Record<string, any>[] | undefined) || [];
  const fromBound = (item.boundAccounts as BoundAccount[] | undefined) || [];
  const byId = new Map<string, BoundAccount>();
  fromApi.forEach((a) => {
    if (a.accountId) {
      byId.set(a.accountId, {
        accountId: a.accountId,
        appId: a.appId,
        userAccount: a.userAccount,
        account: a.accountNickname,
        logoPath: a.appLogo,
      });
    }
  });
  fromBound.forEach((a) => {
    if (a.accountId) byId.set(a.accountId, a);
  });
  return [...byId.values()];
}

/** 将 boundAccounts 同步回接口字段 accountInfos，确保新增绑定可回显 */
function syncAccountInfosFromBound(item: DeviceItem) {
  const accounts = (item.boundAccounts as BoundAccount[] | undefined) || [];
  item.accountInfos = accounts.map((acc) => ({
    appId: acc.appId,
    appLogo: acc.logoPath,
    accountId: acc.accountId,
    userAccount: acc.userAccount,
    accountNickname: acc.account,
    color: item.color,
  }));
}

/** 收集设备已绑定的账号 ID（兼容后端 accountInfos 与前端 boundAccounts） */
function getDeviceBoundAccountIds(item: DeviceItem) {
  const accountIds = new Set<string>();
  const boundAccounts = (item.boundAccounts as BoundAccount[] | undefined) || [];
  const accountInfos = (item.accountInfos as Record<string, any>[] | undefined) || [];

  boundAccounts.forEach((acc) => {
    accountIds.add(acc.accountId as string);
  });
  accountInfos.forEach((acc) => {
    accountIds.add(acc.accountId as string);
  });

  return [...accountIds];
}

/** 构建设备分页请求参数，与容器分页接口字段一致 */
function buildRequestParams() {
  return {
    current: pagination.current,
    size: pagination.size,
    screening: filterForm.screening,
    search: filterForm.search,
    groupId: filterForm.groupId,
    relationStatus: filterForm.associationStatus,
  };
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
  }
}

/** 执行查询：重置分页/列表/选择状态并重新加载 */
function handleSearch() {
  pagination.current = 1;
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
  const existingKeys = new Set(allMockRecords.value.map((item) => getDeviceKey(item)));
  pinnedDeviceKeys.value = pinnedDeviceKeys.value.filter((key) => existingKeys.has(key));
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
  return item.deviceIp || '';
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
  return String((item as Record<string, any>)?.proxyId || '');
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

/** 构建正式启用接口所需的 deviceEnables 数组 */
function getSelectedDeviceEnables() {
  const keySet = new Set(selectedDeviceKeys.value);
  const selectedRecords = allMockRecords.value.filter((item) =>
    keySet.has(getDeviceKey(item)),
  );
  return selectedRecords
    .map((item) => {
      const accountIds = getDeviceBoundAccountIds(item);
      const proxyId = getDeviceProxyId(item);
      const deviceId = String(getDeviceId(item) || '');
      const deviceIp = String(item.deviceIp || '');
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
function onCardDrop(ev: DragEvent, item: DeviceItem) {
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
    const currentAppIds = new Set(existingAppIds);

    for (const acc of accounts) {
      const appId = getAccountAppId(acc as Record<string, any>);
      if (appId && currentAppIds.has(appId)) {
        ElMessage.error($t('associationCenter.oneAccountPerPlatformPerDevice'));
        return;
      }
      if (appId) currentAppIds.add(appId);
    }

    target.boundAccounts = [...existing, ...accounts];
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

    const displayProxy = getProxyDisplayText(proxy);
    target.boundProxies = [{ ...proxy, proxy: displayProxy, proxyArea: proxy.area }];
    target.proxy = displayProxy;
    target.proxyArea = proxy.area;
    updateTableData();
    ElMessage.success($t('associationCenter.proxyBoundToDevice'));
  }
}

/** 切换设备展示模式（卡片/表格） */
function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'table' : 'grid';
}

/** 自动关联：账号与设备按 1v1 绑定，代理支持复用到多个设备 */
function autoAssociateWithSelections(
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
  if (!accounts.length || !proxies.length || !devices.length) {
    ElMessage.warning($t('associationCenter.selectDataInAllBoardsFirst'));
    return;
  }

  // 自动关联要求账号与设备严格 1v1，数量必须一致
  if (accounts.length !== devices.length) {
    ElMessage.error($t('associationCenter.autoAssociateCountMismatch'));
    return;
  }

  const bindCount = devices.length;
  const usedProxies =
    proxies.length >= bindCount
      ? proxies.slice(0, bindCount)
      : Array.from({ length: bindCount }, (_, i) => proxies[i % proxies.length]);
  if (bindCount <= 0) {
    ElMessage.warning($t('associationCenter.insufficientDataToAssociate'));
    return;
  }

  for (let i = 0; i < bindCount; i++) {
    const target = devices[i];
    const account = accounts[i];
    const proxy = usedProxies[i];
    if (!target || !account || !proxy) continue;

    const existingAccounts = getMergedBoundAccounts(target);
    const existingAppIds = getDeviceBoundAppIds(target);
    const accountAppId = getAccountAppId(account as Record<string, any>);
    if (accountAppId && existingAppIds.has(accountAppId)) {
      ElMessage.error(
        $t('associationCenter.deviceAlreadyBoundAppId', {
          deviceIp: target.deviceIp || '',
        }),
      );
      return;
    }

    target.boundAccounts = [...existingAccounts, account];
    syncAccountInfosFromBound(target);
    const displayProxy = getProxyDisplayText(proxy);
    target.boundProxies = [{ ...proxy, proxy: displayProxy, proxyArea: proxy.area }];
    target.proxy = displayProxy;
    target.proxyArea = proxy.area;
  }

  updateTableData();
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
  ElMessage.success($t('associationCenter.autoAssociateSuccess', { bindCount }));
}

/** 向父组件暴露的方法：切换视图、自动关联、清空设备选择 */
defineExpose({
  toggleViewMode,
  autoAssociateWithSelections,
  clearSelectedDevices,
  getSelectedDeviceEnables,
  getDeviceBoardList,
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
          v-model="filterForm.groupId"
          :placeholder="$t('associationCenter.deviceGroup')"
          class="filter-input"
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

    <div class="board-content">
      <DeviceGrid
        v-if="viewMode === 'grid'"
        :list="displayGridList"
        :loading="showPinnedOnly ? false : loading"
        :finished="showPinnedOnly ? true : finished"
        :selected-device-keys="selectedDeviceKeys"
        @load-more="handleLoadMore"
        @drag-over="onCardDragOver"
        @drop="onCardDrop"
        @toggle-select="toggleDeviceSelect"
      />
      <DeviceTable
        v-else
        :table-data="tableData"
        :table-pagination="tablePagination"
        :selected-device-keys="selectedDeviceKeys"
        @page-change="handleTablePageChange"
        @drag-over="onTableDragOver"
        @drop="onTableDrop"
        @toggle-select="toggleDeviceSelect"
      />
    </div>
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

.board-content::-webkit-scrollbar {
  width: 6px;
}

.board-content::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}
</style>
