<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElMessage } from 'element-plus';
import { TopRight } from '@element-plus/icons-vue';

import { $t } from '#/locales';

import type { DeviceItem } from '#/api/core/asset';

import DeviceGrid from './DeviceGrid.vue';
import DeviceTable from './DeviceTable.vue';

const router = useRouter();
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

type BoundAccount = {
  accountId?: string;
  account?: string;
  userAccount?: string;
  platform?: string;
  logoPath?: string;
};

type BoundProxy = {
  id?: string;
  area?: string;
  ip?: string;
  proxy?: string;
  proxyGroup?: string;
};

/** 获取设备的代理数组，无 boundProxies 时从 proxy/server 解析 */
function getBoundProxies(item: DeviceItem): BoundProxy[] {
  const arr = (item.boundProxies as BoundProxy[] | undefined) || [];
  if (arr.length) return arr;
  const ps = (item.proxy || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  const ss = (item.server || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  return ps.map((p, i) => ({
    proxy: p,
    ip: ss[i] || p.match(/(\d{1,3}(?:\.\d{1,3}){3})/)?.[1] || '',
  }));
}

/** 从 boundProxies 同步到 proxy/server */
function syncProxyFromBound(item: DeviceItem) {
  const arr = (item.boundProxies as BoundProxy[] | undefined) || [];
  const proxyStrs = arr.map((p) => p.proxy).filter(Boolean);
  const ipStrs = arr.map((p) => p.ip || (p.proxy ? String(p.proxy).match(/(\d{1,3}(?:\.\d{1,3}){3})/)?.[1] : null)).filter(Boolean);
  item.proxy = proxyStrs.length ? proxyStrs.join(', ') : '';
  item.server = ipStrs.length ? ipStrs.join(', ') : item.server || '';
}

/** 构建设备看板的本地 mock 数据（当前用于页面联调与交互演示） */
function buildMockData() {
  if (allMockRecords.value.length) return;

  const colors = ['gray', 'green', 'yellow', 'orange', 'red', 'black'] as const;
  const brands = ['Samsung', 'Huawei', 'Xiaomi', 'OPPO', 'Vivo'];
  const models = ['S20', 'P50', 'Mi 13', 'Reno 9', 'X90'];
  const groups = ['S1B1', 'S1B2', 'S1B3', 'S1B4'];
  const operators = ['移动', '联通', '电信'];

  const records: DeviceItem[] = Array.from({ length: 56 }).map((_, index) => {
    const i = index + 1;
    const ip = `172.25.${Math.floor(i / 10) + 1}.${(i % 10) + 10}`;
    const phoneNumber = `13${(i % 10) + 5}${String(10000000 + i).slice(-8)}`;
    const color = colors[i % colors.length];

    return {
      server: `61.170.${(i % 250) + 1}.${(i % 255) + 1}`,
      inputTime: '2026-03-16 12:00:00',
      chip: i % 2 === 0 ? '865' : '9000',
      deviceIp: ip,
      romVersion: `V${1 + (i % 3)}.${(i % 10)}`,
      phoneBrand: brands[i % brands.length],
      phoneModel: models[i % models.length],
      operator: operators[i % operators.length],
      phoneNumber,
      deviceGroup: groups[i % groups.length],
      remark: i % 5 === 0 ? '业务账号' : '',
      account: i % 3 === 0 ? `8527${100000 + i}` : '',
      proxy: `HTTP 61.170.${(i % 250) + 1}.${(i % 255) + 1}:800${i % 10}`,
      deviceStatus: color === 'gray' ? 'idle' : 'online',
      color,
    };
  });

  allMockRecords.value = records;
  pagination.total = records.length;
}

/** 根据筛选条件过滤设备数据 */
function filterRecords(source: DeviceItem[]): DeviceItem[] {
  let records = source;

  if (filterForm.screening) {
    const kw = filterForm.screening.trim().toLowerCase();
    records = records.filter((item) =>
      (item.deviceIp || '').toLowerCase().includes(kw),
    );
  }

  if (filterForm.search) {
    const kw = filterForm.search.trim().toLowerCase();
    records = records.filter(
      (item) =>
        (item.phoneNumber || '').includes(kw) ||
        (item.server || '').toLowerCase().includes(kw) ||
        (item.proxy || '').toLowerCase().includes(kw),
    );
  }

  if (filterForm.groupId) {
    records = records.filter(
      (item) => item.deviceGroup && item.deviceGroup.includes(filterForm.groupId),
    );
  }

  if (filterForm.associationStatus === 'associated') {
    records = records.filter((item) => item.account && String(item.account).trim());
  } else if (filterForm.associationStatus === 'unassociated') {
    records = records.filter(
      (item) => !item.account || !String(item.account).trim(),
    );
  }

  return records;
}

/** 拉取并追加设备列表数据，同时维护分页与完成状态 */
function fetchData() {
  if (loading.value || finished.value) return;

  loading.value = true;

  try {
    const filtered = filterRecords(allMockRecords.value);
    pagination.total = filtered.length;

    const start = (pagination.current - 1) * pagination.size;
    const end = start + pagination.size;
    const pageRecords = filtered.slice(start, end);

    if (pageRecords.length === 0) {
      finished.value = true;
      return;
    }

    list.value.push(...pageRecords);

    if (list.value.length >= pagination.total) {
      finished.value = true;
    } else {
      pagination.current += 1;
    }

    tablePagination.total = filtered.length;
    updateTableData();
  } finally {
    loading.value = false;
  }
}

/** 执行查询：重置分页/列表/选择状态并重新加载 */
function handleSearch() {
  pagination.current = 1;
  list.value = [];
  finished.value = false;
  selectedDeviceKeys.value = [];
  fetchData();
}

/** 无限滚动加载更多设备数据 */
function handleLoadMore() {
  if (loading.value || finished.value) return;
  fetchData();
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
  const filtered = filterRecords(allMockRecords.value);
  tablePagination.total = filtered.length;
  const start = (tablePagination.current - 1) * tablePagination.size;
  const end = start + tablePagination.size;
  tableData.value = filtered.slice(start, end);
}

/** 表格分页切换事件 */
function handleTablePageChange(page: number) {
  tablePagination.current = page;
  updateTableData();
}

/** 获取设备唯一 key（当前使用 deviceIp） */
function getDeviceKey(item: DeviceItem) {
  return item.deviceIp || '';
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
      ElMessage.error('拖拽账号数据解析失败');
      return;
    }

    const existing = (target.boundAccounts as BoundAccount[] | undefined) || [];
    const existingPlatforms = new Set(
      existing.map((a) => (a.platform || '').trim()).filter(Boolean),
    );

    for (const acc of accounts) {
      const p = (acc.platform || '').trim();
      if (p && existingPlatforms.has(p)) {
        ElMessage.error('同一设备内，每个社媒平台只能绑定一个账号');
        return;
      }
    }

    target.boundAccounts = [...existing, ...accounts];
    updateTableData();
    return;
  }

  if (proxyData) {
    let proxy: BoundProxy;
    try {
      proxy = JSON.parse(proxyData) as BoundProxy;
    } catch {
      ElMessage.error('拖拽代理数据解析失败');
      return;
    }

    const arr = getBoundProxies(target);
    const isSame = (a: BoundProxy, b: BoundProxy) =>
      (a.id && b.id && a.id === b.id) ||
      (a.proxy && b.proxy && String(a.proxy) === String(b.proxy)) ||
      (a.ip && b.ip && a.ip === b.ip);
    if (arr.some((p) => isSame(p, proxy))) {
      ElMessage.error('该代理已绑定到此设备，请勿重复添加');
      return;
    }

    target.boundProxies = [...arr, proxy];
    syncProxyFromBound(target);
    updateTableData();
    ElMessage.success('代理已绑定到设备');
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
    ElMessage.warning('请先在账号看板、代理看板、设备看板中分别选择数据');
    return;
  }

  // 自动关联要求账号与设备严格 1v1，数量必须一致
  if (accounts.length !== devices.length) {
    ElMessage.error('自动关联需要账号数量与设备数量一致（1v1）');
    return;
  }

  const bindCount = devices.length;
  const usedProxies =
    proxies.length >= bindCount
      ? proxies.slice(0, bindCount)
      : Array.from({ length: bindCount }, (_, i) => proxies[i % proxies.length]);
  if (bindCount <= 0) {
    ElMessage.warning('可关联的数据不足');
    return;
  }

  for (let i = 0; i < bindCount; i++) {
    const target = devices[i];
    const account = accounts[i];
    const proxy = usedProxies[i];
    if (!target || !account || !proxy) continue;

    const existingAccounts =
      (target.boundAccounts as BoundAccount[] | undefined) || [];
    const existingPlatforms = new Set(
      existingAccounts.map((a) => (a.platform || '').trim()).filter(Boolean),
    );
    const accountPlatform = (account.platform || '').trim();
    if (accountPlatform && existingPlatforms.has(accountPlatform)) {
      ElMessage.error(
        `设备 ${target.deviceIp || ''} 已绑定 ${accountPlatform} 平台账号，无法重复绑定`,
      );
      return;
    }

    const existingProxies = getBoundProxies(target);
    const isSameProxy = (a: BoundProxy, b: BoundProxy) =>
      (a.id && b.id && a.id === b.id) ||
      (a.proxy && b.proxy && String(a.proxy) === String(b.proxy)) ||
      (a.ip && b.ip && a.ip === b.ip);
    if (existingProxies.some((p) => isSameProxy(p, proxy))) {
      ElMessage.error(`设备 ${target.deviceIp || ''} 已存在该代理，无法重复绑定`);
      return;
    }

    target.boundAccounts = [...existingAccounts, account];
    target.boundProxies = [...existingProxies, proxy];
    syncProxyFromBound(target);
  }

  updateTableData();
  const droppedProxyCount = Math.max(0, proxies.length - bindCount);
  const reusedProxyCount = Math.max(0, bindCount - proxies.length);
  if (droppedProxyCount > 0) {
    ElMessage.success(
      `自动关联成功，已关联 ${bindCount} 组数据，已丢弃 ${droppedProxyCount} 个多余代理`,
    );
    return;
  }
  if (reusedProxyCount > 0) {
    ElMessage.success(
      `自动关联成功，已关联 ${bindCount} 组数据，代理已复用 ${reusedProxyCount} 次`,
    );
    return;
  }
  ElMessage.success(`自动关联成功，已关联 ${bindCount} 组数据`);
}

/** 向父组件暴露的方法：切换视图、自动关联、清空设备选择 */
defineExpose({
  toggleViewMode,
  autoAssociateWithSelections,
  clearSelectedDevices,
});

/** 组件初始化：生成 mock 数据并加载第一页 */
onMounted(() => {
  buildMockData();
  fetchData();
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
        <el-input
          v-model="filterForm.groupId"
          :placeholder="$t('associationCenter.deviceGroup')"
          class="filter-input"
          clearable
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.associationStatus') }}</label>
        <el-select
          v-model="filterForm.associationStatus"
          :placeholder="$t('associationCenter.associationStatus')"
          class="filter-input"
          clearable
        >
          <el-option label="已关联" value="associated" />
          <el-option label="未关联" value="unassociated" />
        </el-select>
      </div>
      <el-button type="primary" @click="handleSearch">
        {{ $t('common.search') }}
      </el-button>
    </div>

    <div class="board-content">
      <DeviceGrid
        v-if="viewMode === 'grid'"
        :list="list"
        :loading="loading"
        :finished="finished"
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
