<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import { ElMessage } from 'element-plus';
import { Box, Loading } from '@element-plus/icons-vue';

import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

import {
  getProxyAssetPageApi,
  getProxyRegionTreeApi,
} from '#/api/core/asset';

/** 代理资产项，与接口 POST /asset/proxy/page 返回的 records 结构一致 */
interface ProxyItem {
  proxyId?: string;
  id?: string;
  accountId?: string;
  area?: string;
  ip?: string;
  proxy?: string;
  proxyGroup?: string;
  surplusDays?: string;
  surplusDaysColor?: string;
  bandingCount?: number;
  color?: string;
  riskTips?: string;
  inputTime?: string;
  [key: string]: any;
}

interface RegionOption {
  label: string;
  value: string;
  children?: RegionOption[];
}
interface RegionTreeNode {
  name?: string;
  children?: RegionTreeNode[] | null;
}

const loading = ref(false);
const finished = ref(false);
const props = defineProps<{
  groupOptions?: Array<{ id: string; suiteName: string }>;
  sortOptions?: Array<{ label: string; value: string }>;
}>();

const filterForm = reactive({
  area: [] as string[],
  areaPath: [] as string[][],
  proxySearch: '',
  proxyGroup: [] as string[],
  sortType: '',
});

const pagination = reactive({
  current: 1,
  size: 20,
  total: 0,
});

const list = ref<ProxyItem[]>([]);
const selectedIds = ref<string[]>([]);
const regionOptions = ref<RegionOption[]>([]);
const localSortOptions = ref<Array<{ label: string; value: string }>>([]);
const assetEnumsStore = useAssetEnumsStore();
const resolvedSortOptions = computed(() =>
  props.sortOptions?.length ? props.sortOptions : localSortOptions.value,
);

const regionCascaderProps = {
  value: 'value',
  label: 'label',
  children: 'children',
  emitPath: true,
  multiple: true,
  checkStrictly: false,
};

function mapRegionTree(nodes: RegionTreeNode[] | null | undefined): RegionOption[] {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .filter((node) => Boolean(node?.name))
    .map((node) => ({
      label: node.name as string,
      value: node.name as string,
      children: mapRegionTree(node.children),
    }));
}

/** 生成列表项稳定 key（优先 id，其次 proxy，再次 index） */
function getKey(item: ProxyItem, index: number) {
  return item.proxyId || item.id || item.proxy || item.ip || `proxy-${index}`;
}

/** 判断代理卡片是否被选中 */
function isSelected(item: ProxyItem, index: number) {
  return selectedIds.value.includes(getKey(item, index));
}

/** 切换代理卡片选中状态（多选） */
function toggleSelect(item: ProxyItem, index: number) {
  const key = getKey(item, index);
  const idx = selectedIds.value.indexOf(key);
  if (idx > -1) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(key);
}

/** 获取当前已选代理列表（按选择顺序返回，用于自动关联配对） */
function getSelectedProxies() {
  const map = new Map<string, ProxyItem>();
  list.value.forEach((item, index) => {
    map.set(getKey(item, index), item);
  });
  return selectedIds.value
    .map((key) => map.get(key))
    .filter((item): item is ProxyItem => Boolean(item));
}

/** 清空当前已选代理（对外暴露给父组件调用） */
function clearSelectedProxies() {
  selectedIds.value = [];
}

/** 应用反向查询结果（有数据则覆盖渲染，无数据则展示空） */
function applyReverseQueryProxies(proxies: ProxyItem[] | null | undefined) {
  const nextList = Array.isArray(proxies) ? proxies : [];
  list.value = nextList;
  selectedIds.value = [];
  pagination.current = 1;
  pagination.total = nextList.length;
  finished.value = true;
  loading.value = false;
}

/** 右侧色条颜色，直接使用接口返回的 color，无则默认 gray */
function getRiskColor(color?: string): string {
  return color || 'gray';
}

/** 构建代理分页查询参数，与接口字段保持一致 */
function buildRequestParams() {
  const params: Record<string, any> = {
    current: pagination.current,
    size: pagination.size,
    proxy: filterForm.proxySearch,
    sortType: filterForm.sortType,
  };
  if (filterForm.area.length) params.area = filterForm.area;
  if (filterForm.proxyGroup.length) params.suiteIds = filterForm.proxyGroup;
  return params;
}

async function loadRegionTree() {
  try {
    const response = await getProxyRegionTreeApi();
    regionOptions.value = mapRegionTree(response.data);
  } catch (error) {
    console.error(error);
    ElMessage.error($t('common.error.loadFailed'));
  }
}

async function loadSortOptions() {
  if (props.sortOptions?.length) return;
  try {
    localSortOptions.value = await assetEnumsStore.getEnumOptionsAsync(
      'ACCOUNT_ORDER',
    );
  } catch (error) {
    console.error('[proxyBoard] 获取排序枚举失败:', error);
    localSortOptions.value = [];
  }
}

function handleRegionChange(paths: string[][]) {
  filterForm.area = (paths || [])
    .map((path) => path?.[path.length - 1])
  handleSearch();
}

/** 拉取代理分页数据（内部做列表追加、分页推进与结束判断） */
async function fetchData() {
  if (loading.value) return;

  loading.value = true;
  try {
    const { records = [], total = 0 } =
      await getProxyAssetPageApi<ProxyItem>(buildRequestParams());
    list.value.push(...records);
    pagination.total = total;
    finished.value = records.length === 0 || list.value.length >= total;
    if (!finished.value) pagination.current += 1;
  } catch (error) {
    console.error(error);
    ElMessage.error($t('common.error.loadFailed'));
    finished.value = true;
  } finally {
    loading.value = false;
  }
}

/** 执行筛选查询：重置列表、分页与选中状态后加载第一页 */
function handleSearch() {
  list.value = [];
  pagination.current = 1;
  finished.value = false;
  selectedIds.value = [];
  fetchData();
}

/** 对外：刷新代理列表并拉取最新数据 */
async function refreshProxyList() {
  list.value = [];
  pagination.current = 1;
  pagination.total = 0;
  finished.value = false;
  selectedIds.value = [];
  await fetchData();
}

/** 无限滚动加载更多代理数据 */
function handleLoadMore() {
  if (loading.value) return;
  void fetchData();
}

/** 代理拖拽开始：写入 dataTransfer，供设备看板接收绑定 */
function onProxyDragStart(ev: DragEvent, item: ProxyItem) {
  const dt = ev.dataTransfer;
  if (!dt) return;
  dt.effectAllowed = 'copy';
  dt.setData(
    'application/x-proxy-item',
    JSON.stringify({
      proxyId: item.proxyId,
      id: item.id,
      accountId: item.accountId,
      area: item.area,
      ip: item.ip,
      proxy: item.proxy,
      proxyGroup: item.proxyGroup,
    }),
  );
}

/** 组件初始化时加载第一页代理数据 */
onMounted(() => {
  loadRegionTree();
  loadSortOptions();
  fetchData();
});

/** 向父组件暴露：读取已选代理、清空已选代理 */
defineExpose({
  getSelectedProxies,
  clearSelectedProxies,
  applyReverseQueryProxies,
  refreshProxyList,
});
</script>

<template>
  <div class="board">
    <div class="filter-bar">
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.regionFilter') }}</label>
        <el-cascader
          v-model="filterForm.areaPath"
          :options="regionOptions"
          :props="regionCascaderProps"
          :show-all-levels="false"
          :placeholder="$t('associationCenter.regionFilterPlaceholder')"
          class="filter-input"
          clearable
          @change="handleRegionChange"
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.proxySearch') }}</label>
        <el-input
          v-model="filterForm.proxySearch"
          :placeholder="$t('associationCenter.proxySearchPlaceholder')"
          class="filter-input"
          clearable
          @keyup.enter="handleSearch"
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.proxyGroup') }}</label>
        <el-select
          v-model="filterForm.proxyGroup"
          :placeholder="$t('associationCenter.proxyGroupPlaceholder')"
          class="filter-input"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          @change="handleSearch"
        >
          <el-option
            v-for="item in props.groupOptions || []"
            :key="item.id"
            :label="item.suiteName"
            :value="item.id"
          />
        </el-select>
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.sortType') }}</label>
        <el-select
          v-model="filterForm.sortType"
          :placeholder="$t('associationCenter.sortTypePlaceholder')"
          class="filter-input"
          clearable
          @change="handleSearch"
        >
          <el-option
            v-for="item in resolvedSortOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
      <div class="filter-actions">
        <el-button type="primary" @click="handleSearch">
          {{ $t('associationCenter.search') }}
        </el-button>
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
            :class="{ selected: isSelected(item, index) }"
            draggable="true"
            @click.stop="toggleSelect(item, index)"
            @dragstart="onProxyDragStart($event, item)"
          >
            <div class="proxy-card-main">
              <div class="card-info">
                <span class="card-amount" :class="getRiskColor(item.surplusDaysColor)">
                  {{
                    item.surplusDays != null ? item.surplusDays : ''
                  }}{{
                    item.surplusDays != null
                      ? $t('associationCenter.daySuffix')
                      : ''
                  }}
                </span>
                <span class="card-area">{{ item.area ?? '' }}</span>
                <el-tooltip
                  v-if="item.ip"
                  :content="item.ip"
                  placement="top"
                >
                  <span class="card-ip">
                    {{ item.ip }}
                  </span>
                </el-tooltip>
                <span v-else class="card-ip"></span>
                <span class="card-count" :class="getRiskColor(item.color)">{{
                  item.bandingCount ?? 0
                }}</span>
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
        :description="$t('associationCenter.emptyProxyBoard')"
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

.filter-actions {
  flex-shrink: 0;
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
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 4px;
}

.proxy-card {
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  width: 100%;
  min-width: 120px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 4px 10px;
  height: 46px;
  min-height: 44px;
  cursor: grab;
  user-select: none;
}

/* 与账号看板一致：占满单元格，避免内容短时触发区过窄 */
.proxy-card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: stretch;
}

.proxy-card-main :deep(.el-tooltip__trigger) {
  flex: 1;
  min-width: 0;
  display: inline-flex !important;
  align-items: center;
}

.proxy-card.selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-5);
}

.card-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  flex: 1;
  width: 100%;
  min-width: 0;
}

.card-amount {
  font-size: 14px;
  font-weight: 600;
}

.card-amount.gray {
  color: var(--el-text-color-placeholder);
}

.card-amount.green {
  color: var(--el-color-success);
}

.card-amount.yellow {
  color: var(--el-color-warning);
}

.card-amount.red {
  color: var(--el-color-danger);
}

.card-amount.black {
  color: var(--el-text-color-primary);
}

.card-area,
.card-ip,
.card-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-ip {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-count {
  margin-left: auto;
  font-weight: 700;
  text-align: right;
}

.card-count.gray {
  color: var(--el-text-color-placeholder);
}

.card-count.green {
  color: var(--el-color-success);
}

.card-count.yellow {
  color: var(--el-color-warning);
}

.card-count.red {
  color: var(--el-color-danger);
}

.card-count.black {
  color: var(--el-text-color-primary);
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
    grid-template-columns: repeat(3, minmax(120px, 1fr));
  }
}

@media (max-width: 768px) {
  .proxy-grid {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
}
</style>
