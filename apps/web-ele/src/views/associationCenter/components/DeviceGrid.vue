<script setup lang="ts">
import { Box, CircleClose, Iphone, Loading } from '@element-plus/icons-vue';

import { $t } from '#/locales';
import { formatProcessUrl } from '#/utils/asset-url';

import type { DeviceItem } from '#/api/core/asset';

import {
  canUnbindDeviceProxy,
  getDeviceVersion,
  getProxyIp,
} from '../composables/useDeviceDisplay';

type BoundAccountRow = {
  accountId?: string;
  logoPath?: string;
  userAccount?: string;
  accountNickname?: string | null;
  displayId?: string;
  tooltip?: string;
  color?: string;
  /** 列表接口带回才可解绑 */
  fromServer?: boolean;
};

function getLogoUrl(logoPath?: string) {
  return formatProcessUrl(logoPath);
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
  deviceClick: [item: DeviceItem];
  deviceDblclick: [item: DeviceItem];
  unbindAccount: [item: DeviceItem, accountId: string];
  unbindProxy: [item: DeviceItem];
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

function onDeviceClick(item: DeviceItem) {
  emit('deviceClick', item);
}

function onDeviceDblClick(item: DeviceItem) {
  emit('deviceDblclick', item);
}

function onUnbindClick(ev: Event, item: DeviceItem, accountId?: string) {
  ev.stopPropagation();
  if (!accountId) return;
  emit('unbindAccount', item, accountId);
}

function onUnbindProxyClick(ev: Event, item: DeviceItem) {
  ev.stopPropagation();
  emit('unbindProxy', item);
}

function getDeviceKey(item: DeviceItem) {
  return item.deviceIp || '';
}

function getGroupDisplay(item: DeviceItem) {
  return (item.groups as string[]).join(',');
}

function getPhoneDisplay(item: DeviceItem) {
  return item.deviceNum;
}

function getProxyDisplay(item: DeviceItem) {
  const boundProxy = item.boundProxies?.[0] as Record<string, any> | undefined;
  if (boundProxy) {
    const area = boundProxy.proxyArea ?? boundProxy.area;
    const proxyIp = boundProxy.proxyIp ?? boundProxy.ip;
    if (area && proxyIp) return `${area} ${proxyIp}`;
    if (area) return area;
    return proxyIp ?? '';
  }
  const area =  item.area;
  const proxyIp = item.proxyIp;
  if (area && proxyIp) return `${area} ${proxyIp}`;
  if (area) return area;
  return proxyIp || '';
}

function getBoundAccounts(item: DeviceItem): BoundAccountRow[] {
  const rows =
    (item.accountInfos as Array<Record<string, any>> | undefined)
      ?.map((acc) => ({
        accountId: acc.accountId,
        logoPath: acc.appLogo,
        userAccount: acc.userAccount,
        accountNickname: acc.accountNickname,
        tooltip:  acc.accountId,
        color: (acc.color as string | undefined),
        fromServer: acc.fromServer === true,
      })) || [];
  return rows;
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
          :class="{ selected: selectedDeviceKeys.includes(getDeviceKey(item)) }"
          @click.stop="onDeviceClick(item)"
          @dblclick.stop="onDeviceDblClick(item)"
          @dragover="onDragOver"
          @drop="onDrop($event, item)"
        >
          <div class="card-status" :class="item.color" />
          <div class="card-body">
            <div class="card-ip">{{ item.deviceIp }}</div>
            <div class="card-row">
              <span class="card-label">{{ $t('associationCenter.groupInfo') }}:</span>
              <span>{{ getGroupDisplay(item) }}</span>
            </div>
            <div class="card-row card-proxy-row">
              <span class="card-label">{{ $t('associationCenter.networkProxy') }}:</span>
              <div class="card-proxy-line">
                <el-tooltip
                  :content="getProxyDisplay(item)"
                  placement="top"
                >
                  <span class="card-proxy-ellipsis">
                    {{ getProxyDisplay(item) }}
                  </span>
                </el-tooltip>
                <el-tooltip
                  v-if="canUnbindDeviceProxy(item)"
                  :content="$t('associationCenter.unbindProxy')"
                  placement="top"
                >
                  <button
                    type="button"
                    class="unbind-account-btn"
                    @click="onUnbindProxyClick($event, item)"
                  >
                    <el-icon><CircleClose /></el-icon>
                  </button>
                </el-tooltip>
              </div>
            </div>
            <div class="card-row">
              <span class="card-label">{{ $t('associationCenter.deviceVersion') }}:</span>
              <span>{{ getDeviceVersion(item) }}</span>
            </div>
            <div
              v-if="getBoundAccounts(item).length"
              class="card-row card-account"
            >
              <div class="account-icons">
                <div
                  v-for="acc in getBoundAccounts(item)"
                  :key="'bound-' + acc.accountId"
                  class="bound-account-row"
                >
                  <div class="bound-account-main">
                    <div class="bound-account-logo-slot">
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
                    </div>
                    <div class="bound-account-text">
                      <div class="bound-account-line1">
                        {{ acc.userAccount }}
                      </div>
                      <div class="bound-account-line2">
                        {{ acc.accountNickname }}
                      </div>
                    </div>
                  </div>
                  <span
                    v-if="acc.fromServer"
                    class="account-color-pill"
                    :class="acc.color"
                    aria-hidden="true"
                  />
                  <div class="bound-account-actions">
                    <el-tooltip
                      v-if="acc.fromServer"
                      :content="$t('associationCenter.unbindAccount')"
                      placement="top"
                    >
                      <button
                        type="button"
                        class="unbind-account-btn"
                        @click="onUnbindClick($event, item, acc.accountId)"
                      >
                        <el-icon><CircleClose /></el-icon>
                      </button>
                    </el-tooltip>
                  </div>
                </div>
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
  height: 100%;
  min-height: 100%;
  overflow-y: scroll;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;
}

.cards-wrapper::-webkit-scrollbar {
  width: 6px;
}

.cards-wrapper::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
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

.card-proxy-row {
  align-items: center;
}

.card-proxy-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.card-proxy-ellipsis {
  display: block;
  flex: 1;
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
  align-items: stretch;
  gap: 4px;
  width: 100%;
  min-width: 0;
}

.bound-account-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.bound-account-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 0;
  min-width: 0;
}

.bound-account-logo-slot {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bound-account-actions {
  flex-shrink: 0;
  width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.unbind-account-btn {
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

.unbind-account-btn:hover {
  color: var(--el-color-danger);
  background: var(--el-fill-color-light);
}

.bound-account-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.2;
}

.bound-account-line1,
.bound-account-line2 {
  font-size: 11px;
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bound-account-line2 {
  color: var(--el-text-color-secondary);
  font-size: 10px;
}

.account-color-pill {
  flex-shrink: 0;
  width: 4px;
  min-height: 28px;
  align-self: stretch;
  border-radius: 4px;
}

.account-color-pill.gray {
  background: var(--el-text-color-placeholder);
}

.account-color-pill.green {
  background: var(--el-color-success);
}

.account-color-pill.yellow {
  background: var(--el-color-warning);
}

.account-color-pill.orange {
  background: #e6a23c;
}

.account-color-pill.red {
  background: var(--el-color-danger);
}

.account-color-pill.black {
  background: #303133;
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
