<script setup lang="ts">
import { CircleClose } from '@element-plus/icons-vue';

import { $t } from '#/locales';
import { formatProcessUrl } from '#/utils/asset-url';

import {
  canUnbindDeviceProxy,
  getDeviceVersion,
  isDeviceLocked,
} from '../composables/useDeviceDisplay';

import type { DeviceItem } from '#/api/core/asset';

type BoundProxy = {
  id?: string;
  area?: string;
  proxyArea?: string;
  ip?: string;
  proxyIp?: string;
  proxy?: string;
};

/** 仅展示有明确平台图标的关联（抖/快/书等），无平台信息的不展示 */
function getLogoUrl(logoPath?: string) {
  return formatProcessUrl(logoPath);
}

function getProxyDisplay(row: DeviceItem) {
  const bound = (row.boundProxies as BoundProxy[] | undefined) || [];
  if (bound.length > 0) {
    return bound
      .map((p) => {
        // 切换视图后，统一按地区(area)+ip展示，避免读到 proxy/proxyArea 的混合值
        const area = p.area;
        const ip = p.ip ?? p.proxyIp;
        if (area) return `${area} ${ip ?? ''}`.trim();
        return ip ?? '';
      })
      .filter(Boolean)
      .join(',');
  }
  const area = row.area as string | undefined;
  const ip = (row.ip as string | undefined) ?? (row.proxyIp as string | undefined);
  if (area) return `${area} ${ip ?? ''}`.trim();
  return ip ?? (row.proxy as string | undefined) ?? '';
}

const props = defineProps<{
  tableData: DeviceItem[];
  tablePagination: { current: number; size: number; total: number };
  selectedDeviceKeys: string[];
}>();

const emit = defineEmits<{
  pageChange: [page: number];
  dragOver: [ev: DragEvent];
  drop: [ev: DragEvent];
  deviceClick: [item: DeviceItem];
  deviceDblclick: [item: DeviceItem];
  unbindAccount: [item: DeviceItem, accountId: string];
  unbindProxy: [item: DeviceItem];
}>();

function onDragOver(ev: DragEvent) {
  emit('dragOver', ev);
}

function onDrop(ev: DragEvent) {
  emit('drop', ev);
}

function handlePageChange(page: number) {
  emit('pageChange', page);
}

function handleRowClick(row: DeviceItem) {
  if (isDeviceLocked(row)) return;
  emit('deviceClick', row);
}

function handleRowDblClick(row: DeviceItem) {
  if (isDeviceLocked(row)) return;
  emit('deviceDblclick', row);
}

function getRowClassName({ row }: { row: DeviceItem }) {
  const classes: string[] = [];
  if (props.selectedDeviceKeys.includes(row.deviceIp || '')) {
    classes.push('selected-device-row');
  }
  if (isDeviceLocked(row)) {
    classes.push('device-row-locked');
  }
  return classes.join(' ');
}

function onUnbindAccount(ev: Event, row: DeviceItem, accountId?: string) {
  ev.stopPropagation();
  if (!accountId) return;
  emit('unbindAccount', row, accountId);
}

function onUnbindProxy(ev: Event, row: DeviceItem) {
  ev.stopPropagation();
  emit('unbindProxy', row);
}
</script>

<template>
  <div
    class="table-wrapper"
    @dragover.prevent="onDragOver"
    @dragenter.prevent="onDragOver"
    @drop.prevent="onDrop"
  >
    <el-table
      :data="tableData"
      border
      size="small"
      style="width: 100%"
      row-key="deviceIp"
      :row-class-name="getRowClassName"
      @row-click="handleRowClick"
      @row-dblclick="handleRowDblClick"
    >
      <el-table-column
        label=""
        width="56"
        align="center"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="row.devicePrompt"
            placement="top"
            :disabled="!row.devicePrompt"
          >
            <span class="table-status" :class="row.color || 'gray'" />
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column
        prop="deviceIp"
        :label="$t('associationCenter.deviceIp')"
        min-width="120"
      />
      <el-table-column :label="$t('associationCenter.groupInfo')" min-width="100">
        <template #default="{ row }">
          {{ row.suiteNames?.join(',') }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('associationCenter.networkProxy')" min-width="260">
        <template #default="{ row }">
          <div class="table-proxy-cell">
            <span class="table-proxy-text" :title="getProxyDisplay(row)">{{
              getProxyDisplay(row)
            }}</span>
            <el-tooltip
              v-if="canUnbindDeviceProxy(row) && !isDeviceLocked(row)"
              :content="$t('associationCenter.unbindProxy')"
              placement="top"
            >
              <button
                type="button"
                class="table-unbind-proxy-btn"
                @click="onUnbindProxy($event, row)"
              >
                <el-icon><CircleClose /></el-icon>
              </button>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="$t('associationCenter.deviceVersion')" min-width="100">
        <template #default="{ row }">
          {{ getDeviceVersion(row) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('associationCenter.associatedApps')" min-width="220" align="left">
        <template #default="{ row }">
          <div
            v-if="Array.isArray(row.accountInfos) && row.accountInfos.length > 0"
            class="table-bound-accounts"
          >
            <div
              v-for="(acc, i) in row.accountInfos"
              :key="`acc-${i}-${acc.accountId || ''}`"
              class="table-bound-account-row"
            >
              <el-tooltip
                :content="[acc.userAccount, acc.accountNickname].filter(Boolean).join(' / ')"
                placement="top"
              >
                <img
                  v-if="acc.appLogo"
                  :src="getLogoUrl(acc.appLogo)"
                  class="platform-logo-cell"
                  alt="account-logo"
                />
              </el-tooltip>
              <div
                class="table-account-text"
                :title="[acc.userAccount, acc.accountNickname].filter(Boolean).join(' / ')"
              >
                <div v-if="acc.userAccount" class="table-account-line1">{{ acc.userAccount }}</div>
                <div v-if="acc.accountNickname" class="table-account-line2">{{ acc.accountNickname }}</div>
              </div>
              <span
                v-if="acc.fromServer === true"
                class="table-account-color-pill"
                :class="(acc.color || row.color || 'gray').toLowerCase()"
                aria-hidden="true"
              />
              <el-tooltip
                v-if="acc.fromServer === true && !isDeviceLocked(row)"
                :content="$t('associationCenter.unbindAccount')"
                placement="top"
              >
                <button
                  type="button"
                  class="table-unbind-account-btn"
                  @click="onUnbindAccount($event, row, acc.accountId)"
                >
                  <el-icon><CircleClose /></el-icon>
                </button>
              </el-tooltip>
            </div>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div class="table-pagination">
      <el-pagination
        :current-page="tablePagination.current"
        :page-size="tablePagination.size"
        :total="tablePagination.total"
        layout="prev, pager, next, jumper"
        background
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.table-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 260px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0 0;
}

.table-status {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.table-status.gray {
  background: var(--el-text-color-placeholder);
}

.table-status.green {
  background: var(--el-color-success);
}

.table-status.yellow {
  background: var(--el-color-warning);
}

.table-status.orange {
  background: #e6a23c;
}

.table-status.red {
  background: var(--el-color-danger);
}

.table-status.black {
  background: #303133;
}

.table-proxy-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  width: 100%;
}

.table-proxy-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-unbind-proxy-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.table-unbind-proxy-btn:hover {
  color: var(--el-color-danger);
  background: var(--el-fill-color-light);
}

.table-bound-accounts {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}

.table-bound-account-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  width: 100%;
}

.table-account-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  line-height: 1.1;
}

.table-account-line1,
.table-account-line2 {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-account-line2 {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.table-unbind-account-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  margin: 0 0 0 auto;
  border: none;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.table-unbind-account-btn:hover {
  color: var(--el-color-danger);
  background: var(--el-fill-color-light);
}

.table-account-color-pill {
  flex-shrink: 0;
  width: 4px;
  height: 26px;
  border-radius: 4px;
}

.table-account-color-pill.gray {
  background: var(--el-text-color-placeholder);
}

.table-account-color-pill.green {
  background: var(--el-color-success);
}

.table-account-color-pill.yellow {
  background: var(--el-color-warning);
}

.table-account-color-pill.orange {
  background: #e6a23c;
}

.table-account-color-pill.red {
  background: var(--el-color-danger);
}

.table-account-color-pill.black {
  background: #303133;
}

.platform-logo-cell {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  object-fit: cover;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
  cursor: pointer;
}

.table-empty-status {
  color: var(--el-text-color-placeholder);
}

:deep(.selected-device-row > td) {
  background: var(--el-color-primary-light-9) !important;
}

:deep(.device-row-locked > td) {
  opacity: 0.55;
  cursor: not-allowed;
  filter: grayscale(0.35);
  pointer-events: none;
}
</style>
