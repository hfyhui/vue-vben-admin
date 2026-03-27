<script setup lang="ts">
import { CircleClose } from '@element-plus/icons-vue';

import { $t } from '#/locales';

import {
  canUnbindDeviceProxy,
  getDeviceVersion,
} from '../composables/useDeviceDisplay';

import type { DeviceItem } from '#/api/core/asset';

type BoundAccount = {
  accountId?: string;
  account?: string;
  userAccount?: string;
  platform?: string;
  logoPath?: string;
  fromServer?: boolean;
};

type BoundProxy = {
  id?: string;
  area?: string;
  proxyArea?: string;
  ip?: string;
  proxy?: string;
};

/** 仅展示有明确平台图标的关联（抖/快/书等），无平台信息的不展示 */
const logoPrefix = import.meta.env.VITE_OSS_BASE_URL
function getLogoUrl(logoPath?: string) {
  if (!logoPath) return '';
  return `${logoPrefix}/${logoPath}`;
}

function getBoundAccounts(
  row: DeviceItem,
): Array<{
  id?: string;
  tooltip: string;
  logoPath?: string;
  color?: string;
  fromServer?: boolean;
}> {
  const result: Array<{
    id?: string;
    tooltip: string;
    logoPath?: string;
    color?: string;
    fromServer?: boolean;
  }> = [];
  const accountInfos = (row.accountInfos as Array<Record<string, any>> | undefined) || [];
  const bound =
    accountInfos.length > 0
      ? accountInfos.map((it) => ({
          accountId: it.accountId,
          logoPath: it.appLogo,
          color: it.color as string | undefined,
          fromServer: it.fromServer === true,
        }))
      : ((row.boundAccounts as BoundAccount[] | undefined) || []).map((it) => ({
          ...it,
          color: row.color as string | undefined,
          fromServer: it.fromServer === true,
        }));
  for (const acc of bound) {
    const id = acc.accountId;
    if (!id) continue;
    result.push({
      id,
      tooltip: id || '',
      logoPath: acc.logoPath,
      color: acc.color || (row.color as string | undefined),
      fromServer: acc.fromServer === true,
    });
  }
  return result;
}

function getGroupDisplay(row: DeviceItem) {
  if (Array.isArray(row.groups)) return row.groups.filter(Boolean).join(',');
  return row.deviceGroup
}

function getPhoneDisplay(row: DeviceItem) {
  return row.deviceNum
}

function getProxyDisplay(row: DeviceItem) {
  const bound = (row.boundProxies as BoundProxy[] | undefined) || [];
  if (bound.length > 0) {
    return bound
      .map((p) => {
        const area = p.area;
        const ip = p.ip
        if (area) return `${area} ${ip ?? ''}`.trim();
        return ip ?? '';
      })
      .filter(Boolean)
      .join(',');
  } 
  return row.proxy
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
  emit('deviceClick', row);
}

function getRowClassName({ row }: { row: DeviceItem }) {
  return props.selectedDeviceKeys.includes(row.deviceIp || '')
    ? 'selected-device-row'
    : '';
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
    >
      <el-table-column
        label=""
        width="56"
        align="center"
      >
        <template #default="{ row }">
          <span class="table-status" :class="(row.color || 'gray').toLowerCase()" />
        </template>
      </el-table-column>

      <el-table-column
        prop="deviceIp"
        :label="$t('associationCenter.deviceIp')"
        min-width="120"
      />
      <el-table-column :label="$t('associationCenter.groupInfo')" min-width="100">
        <template #default="{ row }">
          {{ getGroupDisplay(row) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('associationCenter.networkProxy')" min-width="200">
        <template #default="{ row }">
          <div class="table-proxy-cell">
            <span class="table-proxy-text" :title="getProxyDisplay(row)">{{
              getProxyDisplay(row)
            }}</span>
            <el-tooltip
              v-if="canUnbindDeviceProxy(row)"
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
      <el-table-column :label="$t('associationCenter.proxyIp')" min-width="150">
        <template #default="{ row }">
          {{ row.proxyIp }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('associationCenter.deviceVersion')" min-width="100">
        <template #default="{ row }">
          {{ getDeviceVersion(row) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('associationCenter.phoneNumber')" min-width="140">
        <template #default="{ row }">
          {{ getPhoneDisplay(row) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('associationCenter.associationStatus')" min-width="140" align="left">
        <template #default="{ row }">
          <div
            v-if="getBoundAccounts(row).length > 0"
            class="table-bound-accounts"
          >
            <div
              v-for="(acc, i) in getBoundAccounts(row)"
              :key="`acc-${i}-${acc.id}`"
              class="table-bound-account-row"
            >
              <el-tooltip :content="acc.tooltip" placement="top">
                <img
                  v-if="acc.logoPath"
                  :src="getLogoUrl(acc.logoPath)"
                  class="platform-logo-cell"
                  alt="account-logo"
                />
              </el-tooltip>
              <span
                class="table-account-color-pill"
                :class="(acc.color || 'gray').toLowerCase()"
                aria-hidden="true"
              />
              <el-tooltip
                v-if="acc.fromServer"
                :content="$t('associationCenter.unbindAccount')"
                placement="top"
              >
                <button
                  type="button"
                  class="table-unbind-account-btn"
                  @click="onUnbindAccount($event, row, acc.id)"
                >
                  <el-icon><CircleClose /></el-icon>
                </button>
              </el-tooltip>
            </div>
          </div>
          <span v-else class="table-empty-status">-</span>
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
</style>
