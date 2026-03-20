<script setup lang="ts">
import { Box, Iphone, Loading } from '@element-plus/icons-vue';

import { $t } from '#/locales';

import type { DeviceItem } from '#/api/core/asset';

import {
  getStatusColor,
  getDeviceVersion,
  getProxyIp,
} from '../composables/useDeviceDisplay';

type BoundProxy = {
  id?: string;
  ip?: string;
  proxy?: string;
};

type BoundAccount = {
  accountId?: string;
  logoPath?: string;
};

const logoPrefix = String(import.meta.env.VITE_OSS_BASE_URL || '');
function getLogoUrl(logoPath?: string) {
  if (!logoPath) return '';
  return `${logoPrefix}/${logoPath}`;
}

defineProps<{
  list: DeviceItem[];
  loading: boolean;
  finished: boolean;
  selectedDeviceKeys: string[];
}>();

const emit = defineEmits<{
  loadMore: [];
  dragOver: [ev: DragEvent];
  drop: [ev: DragEvent, item: DeviceItem];
  toggleSelect: [item: DeviceItem];
}>();

function handleLoadMore() {
  emit('loadMore');
}

function onDragOver(ev: DragEvent) {
  emit('dragOver', ev);
}

function onDrop(ev: DragEvent, item: DeviceItem) {
  emit('drop', ev, item);
}

function onToggleSelect(item: DeviceItem) {
  emit('toggleSelect', item);
}

function getProxyDisplay(item: DeviceItem) {
  return ((item.boundProxies as BoundProxy[] | undefined)?.map((p) => p.ip).join(',')) || '';
}

function getGroupDisplay(item: DeviceItem) {
  return (item.groups as string[]).join(',');
}

function getPhoneDisplay(item: DeviceItem) {
  return item.deviceNum;
}

function getBoundAccounts(item: DeviceItem): BoundAccount[] {
  return ((item.accountInfos as Array<Record<string, any>> | undefined)?.map((acc) => ({
    accountId: acc.accountId,
    logoPath: acc.appLogo,
  })) || []);
}
</script>

<template>
  <div
    v-infinite-scroll="handleLoadMore"
    class="cards-wrapper"
    :infinite-scroll-distance="200"
    :infinite-scroll-disabled="loading || finished"
  >
    <template v-if="list.length">
      <div class="device-grid">
        <div
          v-for="item in list"
          :key="item.deviceIp"
          class="device-card"
          :class="{ selected: selectedDeviceKeys.includes(item.deviceIp as string) }"
          @click.stop="onToggleSelect(item)"
          @dragover="onDragOver"
          @drop="onDrop($event, item)"
        >
          <div class="card-status" :class="getStatusColor(item.color)" />
          <div class="card-body">
            <div class="card-ip">{{ item.deviceIp }}</div>
            <div class="card-row">
              <span class="card-label">{{ $t('associationCenter.groupInfo') }}:</span>
              <span>{{ getGroupDisplay(item) }}</span>
            </div>
            <div class="card-row">
              <span class="card-label">{{ $t('associationCenter.networkProxy') }}:</span>
              <span
                class="card-proxy-ellipsis"
                :title="getProxyDisplay(item)"
              >
                {{ getProxyDisplay(item) }}
              </span>
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
              <el-icon><Iphone /></el-icon>
              <span>{{ getPhoneDisplay(item) }}</span>
            </div>
            <div
              v-if="getBoundAccounts(item).length"
              class="card-row card-account"
            >
              <div class="account-icons">
                <span
                  v-for="acc in getBoundAccounts(item)"
                  :key="'bound-' + acc.accountId"
                  class="bound-account"
                >
                  <el-tooltip
                    v-if="acc.logoPath"
                    :content="acc.accountId"
                    placement="top"
                  >
                    <img
                      :src="getLogoUrl(acc.logoPath)"
                      class="bound-account-logo"
                      alt="account-logo"
                    />
                  </el-tooltip>
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
          <Box />
        </el-icon>
      </template>
    </el-empty>

    <div v-if="loading" class="board-loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>{{ $t('associationCenter.loadingMore') }}</span>
    </div>
    <div v-else-if="finished && list.length" class="board-finished">
      {{ $t('associationCenter.noMoreData') }}
    </div>
  </div>
</template>

<style scoped>
.cards-wrapper {
  min-height: 100%;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 8px;
}

.device-card {
  position: relative;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 14px 10px;
  min-height: 190px;
}

.device-card.selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-5);
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
  display: flex;
  align-items: center;
  min-width: 0;
  width: 100%;
}

.card-label {
  color: var(--el-text-color-regular);
  margin-right: 4px;
  flex-shrink: 0;
}

.card-proxy-ellipsis {
  display: inline-block;
  width: 130px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
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
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.bound-account {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.bound-account-logo {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: cover;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6);
  cursor: pointer;
}

.platform-icon {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #fff;
  background: linear-gradient(135deg, #ff2442 0%, #ff6b6b 100%);
}

.platform-icon-bound {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6);
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
}

@media (max-width: 768px) {
  .device-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
