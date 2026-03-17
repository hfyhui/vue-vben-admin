<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { ElMessage } from 'element-plus';

import { $t } from '#/locales';

import { getProxyAssetPageApi } from '#/api/core/asset';

/** 代理资产项，与接口 POST /asset/proxy/page 返回的 records 结构一致 */
interface ProxyItem {
  id?: string;
  area?: string;
  ip?: string;
  proxy?: string;
  proxyGroup?: string;
  surplusDays?: string;
  bandingCount?: number;
  color?: string;
  riskTips?: string;
  amount?: number;
  inputTime?: string;
  [key: string]: any;
}

const loading = ref(false);
const finished = ref(false);

const filterForm = reactive({
  area: '',
  proxySearch: '',
  proxyGroup: '',
  sortCondition: '',
});

const pagination = reactive({
  current: 1,
  size: 20,
  total: 0,
});

const list = ref<ProxyItem[]>([]);

/** 右侧色条颜色，直接使用接口返回的 color，无则默认 gray */
function getRiskColor(color?: string): string {
  return color || 'gray';
}

function buildRequestParams() {
  const params: Record<string, any> = {
    current: pagination.current,
    size: pagination.size,
  };
  if (filterForm.area) params.area = filterForm.area;
  if (filterForm.proxySearch) params.proxy = filterForm.proxySearch;
  if (filterForm.proxyGroup) params.groupId = filterForm.proxyGroup;
  if (filterForm.sortCondition) {
    try {
      params.sortCondition = JSON.parse(filterForm.sortCondition);
    } catch {
      params.sortCondition = { [filterForm.sortCondition]: 'asc' };
    }
  }
  return params;
}

async function fetchData() {
  if (loading.value || finished.value) return;

  loading.value = true;
  try {
    const data = await getProxyAssetPageApi<ProxyItem>(buildRequestParams());

    if (!data || !Array.isArray(data.records)) {
      ElMessage.error($t('common.error.loadFailed'));
      finished.value = true;
      return;
    }

    list.value.push(...data.records);
    pagination.total = data.total ?? pagination.total;

    const loaded = list.value.length;
    if (loaded >= pagination.total || data.records.length === 0) {
      finished.value = true;
    } else {
      pagination.current += 1;
    }
  } catch (error) {
    console.error(error);
    ElMessage.error($t('common.error.loadFailed'));
    finished.value = true;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  list.value = [];
  pagination.current = 1;
  finished.value = false;
  fetchData();
}

function handleLoadMore() {
  if (loading.value || finished.value) return;
  fetchData();
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="board">
    <div class="filter-bar">
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.regionFilter') }}</label>
        <el-select
          v-model="filterForm.area"
          placeholder="地区筛选"
          class="filter-input"
          clearable
          @change="handleSearch"
        >
          <el-option label="重庆" value="重庆" />
          <el-option label="北京" value="北京" />
          <el-option label="上海" value="上海" />
          <el-option label="广州" value="广州" />
        </el-select>
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.proxySearch') }}</label>
        <el-input
          v-model="filterForm.proxySearch"
          placeholder="代理搜索"
          class="filter-input"
          clearable
          @keyup.enter="handleSearch"
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.proxyGroup') }}</label>
        <el-input
          v-model="filterForm.proxyGroup"
          placeholder="账号分组"
          class="filter-input"
          clearable
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.sortCondition') }}</label>
        <el-select
          v-model="filterForm.sortCondition"
          placeholder="排序条件"
          class="filter-input"
          clearable
          @change="handleSearch"
        >
          <el-option label="默认" value="" />
        </el-select>
      </div>
    </div>

    <div
      v-infinite-scroll="handleLoadMore"
      class="board-content"
      :infinite-scroll-distance="200"
      :infinite-scroll-disabled="loading || finished"
    >
      <template v-if="list.length">
        <div class="proxy-grid">
          <div
            v-for="(item, index) in list"
            :key="item.id || `proxy-${index}`"
            class="proxy-card"
          >
            <div class="card-info">
              <span class="card-amount" :class="getRiskColor(item.color)">
                {{ (item.amount ?? 0) }}元
              </span>
              <span class="card-area">{{ item.area || '-' }}</span>
              <span class="card-ip">{{ item.ip || item.proxy || '-' }}</span>
              <span class="card-count">{{ item.bandingCount ?? 0 }}</span>
            </div>
            <div
              class="status-bar"
              :class="getRiskColor(item.color)"
            />
          </div>
        </div>
      </template>

      <el-empty
        v-else-if="!loading && finished"
        :description="$t('associationCenter.emptyProxyBoard')"
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
.board {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-bar {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 12px;
}

.filter-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.filter-label {
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
  white-space: nowrap;
}

.filter-input {
  flex: 1;
}

.filter-input :deep(.el-input__wrapper),
.filter-input :deep(.el-select__wrapper) {
  border-radius: 6px;
}

.board-content {
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
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

.proxy-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.proxy-card {
  display: flex;
  align-items: stretch;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 4px 10px;
  height: 46px;
  min-height: 44px;
}

.card-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  flex: 1;
  min-width: 0;
}

.card-amount {
  font-size: 14px;
  font-weight: 600;
}

.card-amount.green {
  color: var(--el-color-success);
}

.card-amount.red {
  color: var(--el-color-danger);
}

.card-amount.gray {
  color: var(--el-text-color-placeholder);
}

.card-amount.yellow {
  color: var(--el-color-warning);
}

.card-area,
.card-ip,
.card-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.status-bar {
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-left: 8px;
}

/* 风险等级：灰色=未使用，绿色=无风险，黄色=低风险，红色=高风险，黑色=已禁用 */
.status-bar.gray {
  background: var(--el-text-color-placeholder);
}

.status-bar.green {
  background: var(--el-color-success);
}

.status-bar.yellow {
  background: var(--el-color-warning);
}

.status-bar.red {
  background: var(--el-color-danger);
}

.status-bar.black {
  background: linear-gradient(135deg, #303133 0%, #606266 100%);
}

.board-loading,
.board-finished {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.board-loading .el-icon {
  margin-right: 6px;
}

@media (max-width: 1200px) {
  .proxy-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .proxy-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
