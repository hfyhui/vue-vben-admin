<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { $t } from '#/locales';

import type { DeviceItem } from '#/api/core/asset';

const loading = ref(false);
const finished = ref(false);

const filterForm = reactive({
  screening: '',
  search: '',
  groupId: '',
  associationStatus: '',
  sort: '',
});

const viewMode = ref<'grid' | 'list'>('grid');

const pagination = reactive({
  current: 1,
  size: 20,
  total: 0,
});

const list = ref<DeviceItem[]>([]);
const allMockRecords = ref<DeviceItem[]>([]);

/** 状态颜色映射 */
function getStatusColor(color?: string): string {
  const colorMap: Record<string, string> = {
    gray: 'gray',
    green: 'green',
    yellow: 'yellow',
    orange: 'orange',
    red: 'red',
    black: 'black',
  };
  return colorMap[color?.toLowerCase() ?? ''] ?? 'gray';
}

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
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.current = 1;
  list.value = [];
  finished.value = false;
  fetchData();
}

function handleLoadMore() {
  if (loading.value || finished.value) return;
  fetchData();
}

function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid';
}

/** 解析账号显示：account 可能是逗号分隔的平台/账号列表 */
function parseAccountList(account?: string): Array<{ platform?: string; id?: string }> {
  if (!account) return [];
  const parts = account.trim().split(/[,，、]/).filter(Boolean);
  return parts.map((p) => {
    const trimmed = p.trim();
    const match = trimmed.match(/^(\d+)$/);
    if (match) return { id: match[1] };
    return { platform: trimmed };
  });
}

/** 设备版本显示：优先 romVersion，或组合 phoneBrand */
function getDeviceVersion(item: DeviceItem): string {
  return item.romVersion || item.phoneBrand || item.phoneModel || '-';
}

/** 代理 IP / 次要 IP：server 为所属服务器 */
function getProxyIp(item: DeviceItem): string {
  return item.server || '-';
}

onMounted(() => {
  buildMockData();
  fetchData();
});
</script>

<template>
  <div class="device-board">
    <div class="board-header">
      <h2 class="board-title">{{ $t('associationCenter.deviceBoard') }}</h2>
      <el-button type="primary" @click="toggleViewMode">
        {{ $t('associationCenter.viewSwitch') }}
      </el-button>
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

    <div
      v-infinite-scroll="handleLoadMore"
      class="board-content"
      :infinite-scroll-distance="200"
      :infinite-scroll-disabled="loading || finished"
    >
      <template v-if="list.length">
        <div
          class="device-grid"
          :class="{ 'view-list': viewMode === 'list' }"
        >
          <div
            v-for="(item, index) in list"
            :key="item.deviceIp || `device-${index}`"
            class="device-card"
          >
            <div class="card-status" :class="getStatusColor(item.color)" />
            <div class="card-body">
              <div class="card-ip">{{ item.deviceIp || '-' }}</div>
              <div class="card-row">
                <span class="card-label">{{ $t('associationCenter.groupInfo') }}:</span>
                <span>{{ item.deviceGroup || '-' }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">{{ $t('associationCenter.networkProxy') }}:</span>
                <span>{{ item.proxy || '-' }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">{{ $t('associationCenter.proxyIp') }}:</span>
                <span>{{ getProxyIp(item) }}</span>
              </div>
              <div class="card-row">
                <span class="card-label">{{ $t('associationCenter.deviceVersion') }}:</span>
                <span>{{ getDeviceVersion(item) }}</span>
              </div>
              <div class="card-row card-phone">
                <el-icon><i-ep-iphone /></el-icon>
                <span>{{ item.phoneNumber || '-' }}</span>
              </div>
              <div v-if="item.account || item.remark" class="card-row card-account">
                <div v-if="item.remark" class="account-remark">
                  <span class="tiktok-icon" />
                  {{ item.remark }}
                </div>
                <div v-else class="account-icons">
                  <span
                    v-for="(acc, i) in parseAccountList(item.account)"
                    :key="i"
                    class="platform-badge"
                  >
                    {{ acc.id || acc.platform || '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <el-empty
        v-else-if="!loading"
        :description="$t('associationCenter.emptyDeviceBoard')"
      >
        <template #image>
          <el-icon :size="80" color="var(--el-border-color)">
            <i-ep-box />
          </el-icon>
        </template>
      </el-empty>

      <div v-if="loading" class="board-loading">
        <el-icon class="is-loading">
          <i-ep-loading />
        </el-icon>
        <span>{{ $t('associationCenter.loadingMore') }}</span>
      </div>
      <div v-else-if="finished && list.length" class="board-finished">
        {{ $t('associationCenter.noMoreData') }}
      </div>
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

.device-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 8px;
}

.device-grid.view-list {
  grid-template-columns: repeat(2, 1fr);
}

.device-card {
  position: relative;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 14px 10px;
  min-height: 190px;
}

.card-status {
  position: absolute;
  top: 18px;
  right: 14px;
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.card-status.gray {
  background: var(--el-text-color-placeholder);
}

.card-status.green {
  background: var(--el-color-success);
}

.card-status.yellow {
  background: var(--el-color-warning);
}

.card-status.orange {
  background: #e6a23c;
}

.card-status.red {
  background: var(--el-color-danger);
}

.card-status.black {
  background: #303133;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 4px;
}

.card-ip {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  margin-top: 4px;
}

.card-row {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-label {
  color: var(--el-text-color-regular);
  margin-right: 4px;
}

.card-phone {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-account {
  margin-top: 4px;
}

.account-remark {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.tiktok-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000000'%3E%3Cpath d='M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z'/%3E%3C/svg%3E") no-repeat center;
  background-size: contain;
}

.account-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.platform-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  color: var(--el-text-color-secondary);
}

.board-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.board-loading .el-icon {
  margin-right: 6px;
}

.board-finished {
  padding: 8px 0 4px;
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 1600px) {
  .device-grid {
    grid-template-columns: repeat(8, 1fr);
  }
}

@media (max-width: 1200px) {
  .device-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .device-grid.view-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .device-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .device-grid.view-list {
    grid-template-columns: 1fr;
  }
}
</style>
