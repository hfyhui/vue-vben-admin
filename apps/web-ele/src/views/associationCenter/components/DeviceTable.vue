<script setup lang="ts">
import {
  getStatusColor,
  getDeviceVersion,
  getPlatformIconLabel,
  getPlatformIconStyle,
  parseAccountList,
} from '../composables/useDeviceDisplay';

import type { DeviceItem } from '#/api/core/asset';

type BoundAccount = {
  accountId?: string;
  account?: string;
  userAccount?: string;
  platform?: string;
  logoPath?: string;
};

/** 仅展示有明确平台图标的关联（抖/快/书等），无平台信息的不展示 */
const logoPrefix = String(import.meta.env.VITE_OSS_BASE_URL || '');
function getLogoUrl(logoPath?: string) {
  if (!logoPath) return '';
  return `${logoPrefix}/${logoPath}`;
}

function getBoundAccounts(
  row: DeviceItem,
): Array<{ platform?: string; id?: string; label: string; tooltip: string; logoPath?: string }> {
  const result: Array<{ platform?: string; id?: string; label: string; tooltip: string; logoPath?: string }> = [];
  const bound = (row.boundAccounts as BoundAccount[] | undefined) || [];
  for (const acc of bound) {
    const platform = acc.platform || acc.account || acc.userAccount || '';
    const id = acc.accountId || acc.account || acc.userAccount || '';
    const label = getPlatformIconLabel(platform) || platform?.slice(0, 1) || '';
    if (acc.logoPath) {
      result.push({
        platform,
        id,
        label,
        tooltip: id ? `${platform || '账号'}: ${id}` : platform || '',
        logoPath: acc.logoPath,
      });
      continue;
    }
    if (label && label !== '?') {
      result.push({
        platform,
        id,
        label,
        tooltip: id ? `${platform || '账号'}: ${id}` : platform || '',
      });
    }
  }
  const parsed = parseAccountList(row.account);
  for (const p of parsed) {
    if (p.id) continue; // 纯数字 ID 无平台图标，不展示
    const label = getPlatformIconLabel(p.platform) || p.platform?.slice(0, 1) || '';
    if (label && label !== '?') {
      result.push({
        platform: p.platform,
        id: p.id,
        label,
        tooltip: p.id || p.platform || '',
      });
    }
  }
  return result;
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
  toggleSelect: [item: DeviceItem];
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
  emit('toggleSelect', row);
}

function getRowClassName({ row }: { row: DeviceItem }) {
  return props.selectedDeviceKeys.includes(row.deviceIp || '')
    ? 'selected-device-row'
    : '';
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
          <span class="table-status" :class="getStatusColor(row.color)" />
        </template>
      </el-table-column>

      <el-table-column prop="deviceIp" label="设备IP" min-width="120" />
      <el-table-column prop="deviceGroup" label="分组信息" min-width="100" />
      <el-table-column prop="proxy" label="网络代理" min-width="180" />
      <el-table-column prop="server" label="代理IP" min-width="150" />
      <el-table-column label="设备版本" min-width="100">
        <template #default="{ row }">
          {{ getDeviceVersion(row) }}
        </template>
      </el-table-column>
      <el-table-column prop="phoneNumber" label="手机号" min-width="140" />
      <el-table-column label="关联状态" min-width="140" align="left">
        <template #default="{ row }">
          <div
            v-if="getBoundAccounts(row).length > 0"
            class="table-bound-accounts"
          >
            <el-tooltip
              v-for="(acc, i) in getBoundAccounts(row)"
              :key="`acc-${i}-${acc.id || acc.platform}`"
              :content="acc.tooltip"
              placement="top"
            >
              <img
                v-if="acc.logoPath"
                :src="getLogoUrl(acc.logoPath)"
                class="platform-logo-cell"
                alt="account-logo"
              />
              <span
                v-else
                class="platform-icon-cell"
                :style="getPlatformIconStyle(acc.platform)"
              >
                {{ acc.label }}
              </span>
            </el-tooltip>
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

.table-bound-accounts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.platform-icon-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
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
