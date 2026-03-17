<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElMessage } from 'element-plus';

import { $t } from '#/locales';

import { getAccountAssetPageApi } from '#/api/core/asset';

const router = useRouter();

function goToAccountPool() {
  router.push('/accountPool');
}

/** 账号资产项，与接口 POST /asset/account/page 返回的 records 结构一致 */
interface AccountItem {
  accountId?: string;
  account?: string;
  userAccount?: string;
  platform?: string;
  color?: string;
  riskTips?: string;
  accountGroup?: string;
  proxy?: string;
  inputTime?: string;
  remark?: string;
  [key: string]: any;
}

const loading = ref(false);
const finished = ref(false);
const filterForm = reactive({
  platform: '' as string,
  accountSearch: '',
  accountGroup: '',
  sortCondition: '' as string,
});

const pagination = reactive({
  current: 1,
  size: 20,
  total: 0,
});

const list = ref<AccountItem[]>([]);

/** 右侧色条颜色，直接使用接口返回的 color，无则默认 gray */
function getRiskColor(color?: string): string {
  return color || 'gray';
}

/** 构建请求参数，与接口文档一致 */
function buildRequestParams() {
  const params: Record<string, any> = {
    current: pagination.current,
    size: pagination.size,
  };
  if (filterForm.accountSearch) params.accountName = filterForm.accountSearch;
  if (filterForm.accountGroup) params.groupId = [filterForm.accountGroup];
  if (filterForm.platform) params.appId = filterForm.platform;
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
    const data = await getAccountAssetPageApi<AccountItem>(buildRequestParams());

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

/** 显示账号名称：优先 account，其次 userAccount */
function getAccountDisplayName(item: AccountItem) {
  return item.account || item.userAccount || $t('associationCenter.accountUnknown');
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="board">
    <div class="filter-bar">
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.platformFilter') }}</label>
        <el-select
          v-model="filterForm.platform"
          placeholder="社媒平台"
          class="filter-input"
          clearable
        >
          <el-option
            label="社媒平台"
            value="social"
          />
        </el-select>
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.accountSearch') }}</label>
        <el-input
          v-model="filterForm.accountSearch"
          placeholder="账号搜索"
          class="filter-input"
          clearable
          @keyup.enter="handleSearch"
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.accountGroup') }}</label>
        <el-input
          v-model="filterForm.accountGroup"
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
        >
          <el-option
            label="默认"
            value=""
          />
        </el-select>
      </div>
      <el-tooltip
        :content="$t('associationCenter.accountPool')"
        placement="top"
      >
        <el-button
          type="primary"
          link
          class="jump-btn"
          @click="goToAccountPool"
        >
          <el-icon :size="18">
            <i-ep-top-right />
          </el-icon>
        </el-button>
      </el-tooltip>
    </div>

    <div
      v-infinite-scroll="handleLoadMore"
      class="board-content"
      :infinite-scroll-distance="200"
      :infinite-scroll-disabled="loading || finished"
    >
      <template v-if="list.length">
        <div class="account-list">
          <div
            v-for="(item, index) in list"
            :key="item.accountId || `account-${index}`"
            class="account-row"
          >
            <div class="account-info">
              <div class="platform-icon platform-xiaohongshu">
                {{ item.platform || '小红书' }}
              </div>
              <div class="account-main">
                <div class="account-id">
                  {{ item.accountId || '-' }}
                </div>
                <div class="account-name">
                  {{ getAccountDisplayName(item) }}
                  <span
                    v-if="item.riskTips"
                    class="risk-warning"
                  >
                    {{ item.riskTips }}
                  </span>
                </div>
              </div>
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
        :description="$t('associationCenter.emptyAccountBoard')"
        :image-size="120"
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
  gap: 8px;
}

.board-subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
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
  font-size: 14px;
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

.jump-btn {
  flex-shrink: 0;
  margin-left: 4px;
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

.board-content::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-placeholder);
}

.board-content::-webkit-scrollbar-track {
  background: transparent;
}

.account-list {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

@media (max-width: 1400px) {
  .account-list {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 992px) {
  .account-list {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .account-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

.account-row {
  display: flex;
  align-items: stretch;
  background: var(--el-fill-color-blank);
  border-radius: 6px;
  padding: 4px 10px;
  border: 1px solid var(--el-border-color-lighter);
  position: relative;
  height: 46px;
  min-height: 44px;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.platform-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #fff;
  flex-shrink: 0;
}

.platform-xiaohongshu {
  background: linear-gradient(135deg, #ff2442 0%, #ff6b6b 100%);
}

.account-main {
  flex: 1;
  min-width: 0;
}

.account-id {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.account-name {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 1px;
}

.risk-warning {
  color: var(--el-color-danger);
  margin-left: 4px;
}

.growth-rate {
  font-size: 12px;
  color: var(--el-color-danger);
  margin-left: 8px;
}

.status-bar {
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-left: 8px;
}

/* 风险等级颜色：灰色=未使用/待使用，绿色=无风险，黄色=低风险，红色=高风险，黑色=已禁用 */
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
  padding: 8px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.board-loading .el-icon {
  margin-right: 6px;
}
</style>
