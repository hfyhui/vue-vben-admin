<script setup lang="ts">
import { $t } from '#/locales';

import StatsOverview from './components/StatsOverview.vue';
import AccountBoard from './components/AccountBoard.vue';
import ProxyBoard from './components/ProxyBoard.vue';
import DeviceBoard from './components/DeviceBoard.vue';
</script>

<template>
  <div style="padding: 12px">
    <StatsOverview />

    <el-row :gutter="16" align="stretch">
      <el-col :xs="24" :md="12">
        <el-card class="board-card">
          <template #header>
            <span>{{ $t('associationCenter.accountBoard') }}</span>
          </template>
          <AccountBoard />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="board-card">
          <template #header>
            <span>{{ $t('associationCenter.proxyBoard') }}</span>
          </template>
          <ProxyBoard />
        </el-card>
      </el-col>
    </el-row>
    <!-- 操作按钮 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button type="primary">{{ $t('associationCenter.autoAssociate') }}</el-button>
        <el-button type="primary">{{ $t('associationCenter.officialEnable') }}</el-button>
        <el-button type="danger">{{ $t('associationCenter.containerReset') }}</el-button>
        <el-button type="primary">{{ $t('associationCenter.reverseQuery') }}</el-button>
      </div>
      <el-button type="primary">{{ $t('associationCenter.viewSwitch') }}</el-button>
    </div>

    <!-- 设备看板 -->
    <el-card>
      <DeviceBoard />
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

.board-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>