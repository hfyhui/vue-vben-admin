<script setup lang="ts">
import { useRouter } from 'vue-router';

import { $t } from '#/locales';

interface StatItem {
  key: string;
  current: number;
  total: number;
}

defineProps<{
  stats?: StatItem[];
}>();

const router = useRouter();

const defaultStats: StatItem[] = [
  { key: 'containerPool', current: 20, total: 56 },
  { key: 'accountPool', current: 20, total: 102 },
  { key: 'proxyPool', current: 20, total: 25 },
  { key: 'userCount', current: 3, total: 3 },
];

const linkMap: Record<string, string> = {
  containerPool: '/containerPool',
  accountPool: '/accountPool',
  proxyPool: '/proxyPool',
};

function handleStatClick(item: StatItem) {
  const path = linkMap[item.key];
  if (path) {
    router.push(path);
  }
}

function isClickable(key: string) {
  return key in linkMap;
}
</script>

<template>
  <div class="stats-overview">
    <el-row :gutter="16">
      <el-col
        v-for="item in stats ?? defaultStats"
        :key="item.key"
        :xs="24"
        :sm="12"
        :md="6"
      >
        <el-card class="stat-card" shadow="hover">
          <div
            class="stat-title"
            :class="{ 'stat-title--link': isClickable(item.key) }"
            @click="handleStatClick(item)"
          >
            {{ $t(`associationCenter.${item.key}`) }}
          </div>
          <div class="stat-value">
            <span class="current">{{ item.current }}</span>
            <span class="divider">/</span>
            <span class="total">{{ item.total }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.stats-overview {
  margin-bottom: 12px;
}

.stat-card {
  text-align: center;
}

.stat-title {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 12px;
}

.stat-title--link {
  color: var(--el-color-primary);
  cursor: pointer;
}

.stat-title--link:hover {
  text-decoration: underline;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
}

.stat-value .current {
  color: var(--el-color-success);
}

.stat-value .divider {
  margin: 0 4px;
  color: var(--el-color-primary);
}

.stat-value .total {
  color: var(--el-color-primary);
}
</style>
