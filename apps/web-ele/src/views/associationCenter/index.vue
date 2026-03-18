<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { TopRight } from '@element-plus/icons-vue';

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
  deviceBoardRef.value?.autoAssociateWithSelections?.(accounts, proxies);
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
        <el-button type="primary">{{ $t('associationCenter.officialEnable') }}</el-button>
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