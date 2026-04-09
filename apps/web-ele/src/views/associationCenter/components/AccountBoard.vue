<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { ElMessage } from 'element-plus';
import { Box, Loading } from '@element-plus/icons-vue';

import { $t } from '#/locales';
import { formatProcessUrl } from '#/utils/asset-url';

import { getAccountAssetPageApi, getAssetAppListApi } from '#/api/core/asset';

/** 账号资产项，与接口 POST /asset/account/page 返回的 records 结构一致 */
interface AccountItem {
  accountId?: string;
  account?: string;
  userAccount?: string;
  nickName?: string;
  platform?: string;
  appId?: string;
  appCode?: string;
  appName?: string;
  logoPath?: string;
  color?: string;
  riskTips?: string;
  accountGroup?: string;
  proxy?: string;
  inputTime?: string;
  remark?: string;
  [key: string]: any;
}

/** 统一读取账号 appId（用于拖拽批次去重） */
function getAccountAppId(item: AccountItem) {
  return item.appId 
}

const loading = ref(false);
const finished = ref(false);
const props = defineProps<{
  groupOptions?: Array<{ id: string; suiteName: string }>;
  sortOptions?: Array<{ label: string; value: string }>;
}>();
const filterForm = reactive({
  platform: [] as string[],
  accountSearch: '',
  accountGroup: [] as string[],
  sortType: '' as string,
});

const pagination = reactive({
  current: 1,
  size: 20,
  total: 0,
});

const list = ref<AccountItem[]>([]);
const selectedIds = ref<string[]>([]);
const platformOptions = ref<Array<{ label: string; value: string }>>([]);
const boardContentRef = ref<HTMLElement | null>(null);
/** 按行决定气泡在上看板上半区用 top、下半区用 bottom，避免贴边被裁切 */
const tooltipPlacementByRow = reactive<Record<string, 'top' | 'bottom'>>({});
/** 根据接口的 logoPath 拼出完整图片 URL */
function getLogoUrl(logoPath?: string) {
  return formatProcessUrl(logoPath);
}

/** 生成列表项的稳定 key用 accountId */
function getKey(item: AccountItem, index: number) {
  return item.accountId
}

/** 判断某个列表项是否处于选中状态 */
function isSelected(item: AccountItem, index: number) {
  const key = getKey(item, index);
  return selectedIds.value.includes(key);
}

/** 切换某个列表项的选中状态（多选） */
function toggleSelect(item: AccountItem, index: number) {
  const key = getKey(item, index);
  const idx = selectedIds.value.indexOf(key);
  if (idx > -1) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(key);
}

/** 获取当前已选中的账号列表（按选择顺序返回，用于自动关联的一一配对） */
function getSelectedAccounts() {
  const map = new Map<string, AccountItem>();
  list.value.forEach((item, index) => {
    map.set(getKey(item, index), item);
  });
  return selectedIds.value
    .map((key) => map.get(key))
    .filter((item): item is AccountItem => Boolean(item));
}

/** 清空当前选择（对外暴露给父组件调用） */
function clearSelectedAccounts() {
  selectedIds.value = [];
}

/** 应用反向查询结果（有数据则覆盖渲染，无数据则展示空） */
function applyReverseQueryAccounts(accounts: AccountItem[] | null | undefined) {
  const nextList = Array.isArray(accounts) ? accounts : [];
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

/** 图标悬停：与卡片展示一致的应用名称（有则出提示） */
function accountPlatformHoverText(item: AccountItem) {
  const raw = item.appName || item.appCode || item.platform;
  return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
}

function rowUiKey(item: AccountItem, index: number) {
  return String(item.accountId ?? `account-row-${index}`);
}

function lineTooltipPlacement(item: AccountItem, index: number) {
  return tooltipPlacementByRow[rowUiKey(item, index)] ?? 'top';
}

function updateLineTooltipPlacement(ev: MouseEvent, item: AccountItem, index: number) {
  const board = boardContentRef.value;
  const target = ev.currentTarget as HTMLElement | null;
  if (!board || !target) return;
  const br = board.getBoundingClientRect();
  const tr = target.getBoundingClientRect();
  const triggerMidY = tr.top + tr.height / 2;
  const boardMidY = br.top + br.height / 2;
  tooltipPlacementByRow[rowUiKey(item, index)] =
    triggerMidY < boardMidY ? 'top' : 'bottom';
}

/** 构建请求参数，与接口文档一致 */
function buildRequestParams() {
  const params: Record<string, any> = {
    current: pagination.current,
    size: pagination.size,
  };
  if (filterForm.accountSearch) params.accountName = filterForm.accountSearch;
  if (filterForm.accountGroup.length) params.suiteIds = filterForm.accountGroup;
  if (filterForm.platform.length) params.appIds = filterForm.platform;
  if (filterForm.sortType) {
    params.sortType = filterForm.sortType;
  }
  return params;
}

/** 拉取账号分页数据（内部做追加、分页推进、结束判断） */
async function fetchData() {
  if (loading.value || finished.value) return;

  loading.value = true;
  try {
    const data = await getAccountAssetPageApi<AccountItem>(buildRequestParams());

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

/** 拉取平台筛选项（应用列表接口） */
async function fetchPlatformOptions() {
  try {
    const data = await getAssetAppListApi({
      current: 1,
      size: 200,
      applicationStatus: 0,
    });
    platformOptions.value = (data.records || [])
      .map((item) => ({
        label: item.applicationName ?? '',
        value: item.id ?? '',
      }));
  } catch (error) {
    console.error(error);
    ElMessage.error($t('associationCenter.platformOptionsLoadFailed'));
  }
}

/** 执行查询：重置列表与分页，并重新加载第一页 */
function handleSearch() {
  list.value = [];
  pagination.current = 1;
  finished.value = false;
  selectedIds.value = [];
  fetchData();
}

/** 无限滚动加载更多 */
function handleLoadMore() {
  if (loading.value || finished.value) return;
  fetchData();
}

/** 生成拖拽预览 DOM：多选时把本次拖拽的账号都展示在影子里 */
function createDragPreviewElement(items: AccountItem[]) {
  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.top = '-9999px';
  root.style.left = '-9999px';
  root.style.minWidth = '180px';
  root.style.maxWidth = '260px';
  root.style.maxHeight = '220px';
  root.style.overflowY = 'auto';
  root.style.padding = '6px 8px';
  root.style.borderRadius = '8px';
  root.style.background = 'rgba(48, 49, 51, 0.92)';
  root.style.color = '#fff';
  root.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.25)';
  root.style.fontSize = '12px';

  items.forEach((item) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '6px';
    row.style.padding = '2px 0';

    const img = document.createElement('img');
    img.src = getLogoUrl(item.logoPath);
    img.style.width = '16px';
    img.style.height = '16px';
    img.style.borderRadius = '4px';
    img.style.objectFit = 'cover';
    row.appendChild(img);

    const text = document.createElement('span');
    text.textContent = item.accountId ?? '-';
    text.style.whiteSpace = 'nowrap';
    text.style.overflow = 'hidden';
    text.style.textOverflow = 'ellipsis';
    row.appendChild(text);
    root.appendChild(row);
  });

  document.body.appendChild(root);
  return root;
}

/** 拖拽开始：把“已选账号 + 当前拖拽账号”打包到 dataTransfer（并校验同平台唯一） */
function onAccountDragStart(ev: DragEvent, item: AccountItem, index: number) {
  const dt = ev.dataTransfer;
  if (!dt) return;

  // 如果已有多选，则拖拽时把「已选中的账号 + 当前拖拽的账号」一起带上
  const dragKey = getKey(item, index);
  const keysSet = new Set(selectedIds.value);
  keysSet.add(dragKey);
  const keys = Array.from(keysSet);
  const dragItems = list.value.filter((row, i) =>
    keys.includes(getKey(row, i)),
  );

  const appIdMap: Record<string, number> = {};
  for (const it of dragItems) {
    const appId = getAccountAppId(it);
    if (!appId) continue;
    appIdMap[appId] = (appIdMap[appId] || 0) + 1;
    if (appIdMap[appId] > 1) {
      ElMessage.error($t('associationCenter.oneAccountPerPlatformPerDevice'));
      ev.preventDefault();
      return;
    }
  }

  dt.effectAllowed = 'copy';
  dt.setData(
    'application/x-account-items',
    JSON.stringify(
      dragItems.map((it) => ({
        accountId: it.accountId,
        account: it.account,
        userAccount: it.userAccount,
        platform: it.platform,
        appId: it.appId,
        appCode: it.appCode,
        appName: it.appName,
        logoPath: it.logoPath,
      })),
    ),
  );

  // 使用自定义拖拽预览，保证拖拽影子展示本次拖拽的全部账号
  const previewEl = createDragPreviewElement(dragItems);
  dt.setDragImage(previewEl, 20, 16);
  // 不能立即 remove，否则部分浏览器会退回默认单条影子
  setTimeout(() => {
    previewEl.remove();
  }, 100);
}

/** 组件初始化时加载第一页账号数据 */
onMounted(() => {
  fetchData();
  fetchPlatformOptions();
});

/** 向父组件暴露：读取已选账号、清空已选账号 */
defineExpose({
  getSelectedAccounts,
  clearSelectedAccounts,
  applyReverseQueryAccounts,
});
</script>

<template>
  <div class="board">
    <div class="filter-bar">
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.platformFilter') }}</label>
        <el-select
          v-model="filterForm.platform"
          :placeholder="$t('associationCenter.platformPlaceholder')"
          class="filter-input"
          filterable
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
        >
          <el-option
            v-for="item in platformOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.accountSearch') }}</label>
        <el-input
          v-model="filterForm.accountSearch"
          :placeholder="$t('associationCenter.accountSearchPlaceholder')"
          class="filter-input"
          clearable
          @keyup.enter="handleSearch"
        />
      </div>
      <div class="filter-item">
        <label class="filter-label">{{ $t('associationCenter.accountGroup') }}</label>
        <el-select
          v-model="filterForm.accountGroup"
          :placeholder="$t('associationCenter.accountGroupPlaceholder')"
          class="filter-input"
          filterable
          multiple
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
          filterable
          clearable
        >
          <el-option
            v-for="item in props.sortOptions || []"
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
      ref="boardContentRef"
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
            :class="{ selected: isSelected(item, index) }"
            draggable="true"
            @click.stop="toggleSelect(item, index)"
            @dragstart="onAccountDragStart($event, item, index)"
          >
            <div class="account-row-main">
              <div class="account-info">
                <el-tooltip
                  :placement="lineTooltipPlacement(item, index)"
                  :show-after="200"
                  :content="accountPlatformHoverText(item)"
                  :disabled="!accountPlatformHoverText(item)"
                  popper-class="account-board-line-tooltip"
                >
                  <div
                    class="platform-icon"
                    @mouseenter="updateLineTooltipPlacement($event, item, index)"
                  >
                    <img
                      v-if="item.logoPath"
                      :src="getLogoUrl(item.logoPath)"
                      class="platform-logo"
                      alt="logo"
                    />
                  </div>
                </el-tooltip>
                <div class="account-main">
                  <el-tooltip
                    :placement="lineTooltipPlacement(item, index)"
                    :show-after="200"
                    :content="item.account"
                    popper-class="account-board-line-tooltip"
                  >
                    <div
                      class="account-id"
                      @mouseenter="updateLineTooltipPlacement($event, item, index)"
                    >
                      {{ item.account }}
                    </div>
                  </el-tooltip>
                  <el-tooltip
                    :placement="lineTooltipPlacement(item, index)"
                    :show-after="200"
                    :content="item.nickName != null && String(item.nickName).trim() !== '' ? String(item.nickName) : '-'"
                    popper-class="account-board-line-tooltip"
                  >
                    <div
                      class="account-name"
                      @mouseenter="updateLineTooltipPlacement($event, item, index)"
                    >
                      {{ item.nickName }}
                    </div>
                  </el-tooltip>
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
  gap: 8px;
}

.board-subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.filter-bar {
  display: flex;
  flex-wrap: nowrap;
  /* 多选分组标签换行增高时，勿用 flex-end 底对齐，否则其它列会被顶到底部导致与标签列错位 */
  align-items: flex-start;
  gap: 12px;
}

.filter-item {
  display: flex;
  flex-direction: row;
  /* 标签与控件顶部对齐；多行 tag 时标签仍与输入框上沿对齐，避免相对整块竖直居中 */
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.filter-label {
  flex-shrink: 0;
  padding-top: 6px;
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

.filter-actions {
  flex-shrink: 0;
  padding-top: 6px;
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

/* minmax 下限保证字少时单列仍有可点宽度；minmax(0,1fr) 防止超长无空格字符串撑开列宽 */
.account-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  gap: 4px;
}

@media (max-width: 1400px) {
  .account-list {
    grid-template-columns: repeat(4, minmax(120px, 1fr));
  }
}

@media (max-width: 992px) {
  .account-list {
    grid-template-columns: repeat(3, minmax(120px, 1fr));
  }
}

@media (max-width: 768px) {
  .account-list {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
}

.account-row {
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  /* 与网格 minmax 一致，避免字极少时整卡视觉上过窄、难对准 */
  min-width: 120px;
  overflow: hidden;
  background: var(--el-fill-color-blank);
  border-radius: 6px;
  padding: 4px 10px;
  border: 1px solid var(--el-border-color-lighter);
  position: relative;
  height: 46px;
  min-height: 44px;
  cursor: grab;
  user-select: none;
}

.account-row.selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-5);
}

/* 占满网格单元格剩余宽度，避免字少时 el-tooltip 触发器收缩成窄条、难点难悬停 */
.account-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: stretch;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.account-info > .el-tooltip {
  flex-shrink: 0;
  display: inline-flex;
}

.account-info > .el-tooltip :deep(.el-tooltip__trigger) {
  display: flex;
  align-items: center;
}

.account-main :deep(.el-tooltip__trigger) {
  display: block;
  width: 100%;
  min-width: 0;
}

.platform-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
  overflow: hidden;
}

.platform-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.account-main {
  flex: 1;
  /* 文本区保底宽度，避免两行都是短数字时缩成一条 */
  min-width: 96px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.account-id {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-name {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding:1px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

<!-- 使用主题变量，避免暗色模式下仍强制白底导致文字/内容看不清或与页面冲突 -->
<style>
.account-board-line-tooltip.el-popper {
  background: var(--el-fill-color-blank) !important;
  color: var(--el-text-color-primary) !important;
  border: 1px solid var(--el-border-color-lighter) !important;
  box-shadow: var(--el-box-shadow-light) !important;
  min-width: 120px;
  max-width: min(420px, 92vw);
  padding: 8px 12px !important;
}

.account-board-line-tooltip .el-popper__arrow::before {
  background: var(--el-fill-color-blank) !important;
  border: 1px solid var(--el-border-color-lighter) !important;
}
</style>
