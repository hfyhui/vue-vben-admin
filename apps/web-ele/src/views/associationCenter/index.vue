<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElMessage } from 'element-plus';
import { TopRight } from '@element-plus/icons-vue';

import { enableAssetApi } from '#/api/core/asset';
import { $t } from '#/locales';

import StatsOverview from './components/StatsOverview.vue';
import AccountBoard from './components/AccountBoard.vue';
import ProxyBoard from './components/ProxyBoard.vue';
import DeviceBoard from './components/DeviceBoard.vue';

const router = useRouter();
const accountBoardRef = ref<InstanceType<typeof AccountBoard> | null>(null);
const proxyBoardRef = ref<InstanceType<typeof ProxyBoard> | null>(null);
const deviceBoardRef = ref<InstanceType<typeof DeviceBoard> | null>(null);

function onViewSwitch() {
  deviceBoardRef.value?.toggleViewMode?.();
}

function onAutoAssociate() {
  const accounts = accountBoardRef.value?.getSelectedAccounts?.() || [];
  const proxies = proxyBoardRef.value?.getSelectedProxies?.() || [];

  // 代理超出时，丢弃 bandingCount 更大的代理，但保持剩余代理原始顺序（保证一一对应顺序）
  let usedProxies = proxies;
  if (proxies.length > accounts.length) {
    const dropCount = proxies.length - accounts.length;
    const dropIndexes = new Set(
      proxies
        .map((item: any, index: number) => ({
          index,
          bandingCount: Number(item?.bandingCount ?? 0),
        }))
        .sort((a, b) => b.bandingCount - a.bandingCount || b.index - a.index)
        .slice(0, dropCount)
        .map((item) => item.index),
    );
    usedProxies = proxies.filter((_, index) => !dropIndexes.has(index));
  }

  deviceBoardRef.value?.autoAssociateWithSelections?.(accounts, usedProxies);
}

async function onOfficialEnable() {
  const boardList = deviceBoardRef.value?.getDeviceBoardList?.() || [];
  console.log('[associationCenter] 设备看板列表数据:', boardList);

  const deviceEnables = deviceBoardRef.value?.getSelectedDeviceEnables?.() || [];
  if (!deviceEnables.length) {
    ElMessage.warning($t('associationCenter.selectDeviceBeforeOfficialEnable'));
    return;
  }

  try {
    const response = await enableAssetApi({ deviceEnables });
    if (response?.code === 100000) {
      ElMessage.success(
        response.msg || $t('associationCenter.officialEnableSuccess'),
      );
      return;
    }
    ElMessage.error(response?.msg || $t('associationCenter.officialEnableFailed'));
  } catch (error) {
    console.error(error);
    ElMessage.error($t('associationCenter.officialEnableFailed'));
  }
}
</script>

<template>
  <div style="padding: 12px">
    <StatsOverview />

    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-card class="board-card">
          <template #header>
            <div class="board-header">
              <span>{{ $t('associationCenter.accountBoard') }}</span>
              <el-link type="primary" underline="never" @click="router.push('/accountPool')">
                <el-icon :size="22"><TopRight /></el-icon>
              </el-link>
            </div>
          </template>
          <AccountBoard ref="accountBoardRef" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="board-card">
          <template #header>
            <div class="board-header">
              <span>{{ $t('associationCenter.proxyBoard') }}</span>
              <el-link type="primary" underline="never" @click="router.push('/proxyPool')">
                <el-icon :size="22"><TopRight /></el-icon>
              </el-link>
            </div>
          </template>
          <ProxyBoard ref="proxyBoardRef" />
        </el-card>
      </el-col>
    </el-row>
    <!-- 操作按钮 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button type="primary" @click="onAutoAssociate">
          {{ $t('associationCenter.autoAssociate') }}
        </el-button>
        <el-button type="primary" @click="onOfficialEnable">
          {{ $t('associationCenter.officialEnable') }}
        </el-button>
        <el-button type="danger">{{ $t('associationCenter.containerReset') }}</el-button>
        <el-button type="primary">{{ $t('associationCenter.reverseQuery') }}</el-button>
      </div>
      <el-button type="primary" @click="onViewSwitch">
        {{ $t('associationCenter.viewSwitch') }}
      </el-button>
    </div>

    <!-- 设备看板 -->
    <el-card>
      <DeviceBoard ref="deviceBoardRef" />
    </el-card>
  </div>
</template>

<style scoped>
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  padding: 6px 0;
}

.action-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.board-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.board-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>