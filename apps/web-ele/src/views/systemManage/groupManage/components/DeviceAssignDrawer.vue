<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';

import { ElMessage } from 'element-plus';

import { getSocialDevicePageApi } from '#/api/core/social-device-account';
import { updateSocialSuiteApi } from '#/api/core/social-suite';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const props = defineProps<{
  detail: Record<string, any> | null;
}>();

const assetEnums = useAssetEnumsStore();
const tableRef = ref();
const loading = ref(false);
const saving = ref(false);
const tableRows = ref<any[]>([]);
const total = ref(0);
const page = reactive({ current: 1, size: 20 });
const searchMode = ref<'device' | 'status'>('device');
const searchForm = reactive<{ deviceIdx?: string; deviceStatuses?: string }>({});
const onlySelected = ref(false);
const selectedMap = ref(new Map<string, any>());
/** 分页列表接口返回的完整行，用于「仅显示已选」时补全 isLock 等字段（详情里的 suiteOrgs 可能不含） */
const lastKnownApiRowByDeviceId = ref(new Map<string, any>());
/** 与列表/接口顺序一致，避免「仅显示已选」时用 Map 顺序导致锁定行跑到最后 */
const selectionRowOrder = ref<string[]>([]);
let syncingSelection = false;

function deviceMapKey(id: unknown): string {
  if (id === null || id === undefined || id === '') return '';
  return String(id);
}

function removeKeyFromSelectionOrder(key: string) {
  if (!key) return;
  selectionRowOrder.value = selectionRowOrder.value.filter((k) => k !== key);
}

function appendKeyToSelectionOrderIfNeeded(key: string) {
  if (!key || selectionRowOrder.value.includes(key)) return;
  selectionRowOrder.value.push(key);
}

/** 用当前页接口返回顺序，校正已选项之间的相对位置（与全量列表一致） */
function mergeApiPageOrderIntoSelectionOrder(pageRows: any[]) {
  const pageKeys = pageRows
    .map((r) => deviceMapKey(r.deviceId))
    .filter((k): k is string => Boolean(k) && selectedMap.value.has(k));
  if (!pageKeys.length) return;
  const pageSet = new Set(pageKeys);
  const prev = selectionRowOrder.value;
  const positions = pageKeys.map((k) => prev.indexOf(k)).filter((i) => i >= 0);
  const insertAt = positions.length ? Math.min(...positions) : prev.length;
  const withoutPage = prev.filter((k) => !pageSet.has(k));
  const removedBefore = prev.slice(0, insertAt).filter((k) => pageSet.has(k)).length;
  const newInsertAt = insertAt - removedBefore;
  selectionRowOrder.value = [
    ...withoutPage.slice(0, newInsertAt),
    ...pageKeys,
    ...withoutPage.slice(newInsertAt),
  ];
}

const modeOptions = computed(() => [
  { label: $t('systemManage.groupManage.device'), value: 'device' as const },
  { label: $t('systemManage.groupManage.status'), value: 'status' as const },
]);

const statusOptions = computed(() =>
  assetEnums.getEnumOptions('MOBILE_STATUS', {
    childrenKey: 'children',
    labelKey: 'content',
    valueKey: 'name',
  }),
);

function successCode(code: number) {
  return code === 200 || code === 100000;
}

function statusLabel(code?: string) {
  if (!code) return '';
  return statusOptions.value.find((o) => o.value === code)?.label ?? '';
}

function brandLabel(code?: string) {
  if (!code) return '';
  const children = assetEnums.getEnumByKey<any>('MOBILE_BRAND')?.children ?? [];
  return children.find((c: any) => c.name === code)?.content ?? '';
}

/** 先按枚举码，再退回接口名称（避免 suiteOrgs 里名称字段为 i18n 路径时优先展示错） */
function displayStatus(row: any) {
  return statusLabel(row.deviceStatus) || row.deviceStatusName || '';
}

function displayBrand(row: any) {
  return brandLabel(row.deviceCategory) || row.deviceCategoryName || '';
}

async function ensureEnums() {
  await assetEnums.ensureAssetEnumsLoaded();
}

function resetFromDetail() {
  selectedMap.value = new Map();
  lastKnownApiRowByDeviceId.value = new Map();
  const orgs = props.detail?.suiteOrgs ?? [];
  const orderKeys: string[] = [];
  for (const r of orgs) {
    const k = deviceMapKey(r?.deviceId);
    if (k) {
      selectedMap.value.set(k, { ...r });
      orderKeys.push(k);
    }
  }
  selectionRowOrder.value = orderKeys;
  onlySelected.value = false;
  searchForm.deviceIdx = '';
  searchForm.deviceStatuses = '';
  page.current = 1;
}

async function loadList() {
  await ensureEnums();
  if (onlySelected.value) {
    applyLocalFilter();
    return;
  }
  loading.value = true;
  try {
    const params: Record<string, any> = {
      current: page.current,
      size: page.size,
    };
    if (searchMode.value === 'status' && searchForm.deviceStatuses) {
      params.deviceStatuses = searchForm.deviceStatuses;
    } else if (searchMode.value === 'device' && searchForm.deviceIdx) {
      params.deviceIdx = searchForm.deviceIdx;
    }
    const res = await getSocialDevicePageApi(params);
    if (res && successCode(res.code)) {
      tableRows.value = res.data?.records ?? [];
      total.value = res.data?.total ?? 0;
      for (const row of tableRows.value) {
        const k = deviceMapKey(row.deviceId);
        if (!k) continue;
        lastKnownApiRowByDeviceId.value.set(k, row);
        if (selectedMap.value.has(k)) {
          selectedMap.value.set(k, { ...selectedMap.value.get(k), ...row });
        }
      }
      mergeApiPageOrderIntoSelectionOrder(tableRows.value);
    } else {
      tableRows.value = [];
      total.value = 0;
    }
    await nextTick();
    syncSelection();
  } finally {
    loading.value = false;
  }
}

function applyLocalFilter() {
  const list = [...selectedMap.value.values()];
  const kw = searchForm.deviceIdx
  const st = searchForm.deviceStatuses ?? '';
  const filtered = list.filter((el) => {
    if (searchMode.value === 'status' && st) {
      return el.deviceStatus === st;
    }
    if (searchMode.value === 'device' && kw) {
      return [el.deviceIdx, el.deviceIp, el.deviceAliases]
        .some((f) =>  f.includes(kw));
    }
    return true;
  });
  const byKey = new Map(filtered.map((el) => [deviceMapKey(el.deviceId), el]));
  const orderedKeys = selectionRowOrder.value.filter((k) => byKey.has(k));
  for (const el of filtered) {
    const k = deviceMapKey(el.deviceId);
    if (k && !orderedKeys.includes(k)) orderedKeys.push(k);
  }
  tableRows.value = orderedKeys.map((key) => {
    const el = byKey.get(key)!;
    const cached = lastKnownApiRowByDeviceId.value.get(key);
    const merged = cached ? { ...el, ...cached } : el;
    return {
      ...merged,
      deviceStatusName: statusLabel(merged.deviceStatus) || merged.deviceStatusName || '',
      deviceCategoryName: brandLabel(merged.deviceCategory) || merged.deviceCategoryName || '',
    };
  });
  total.value = filtered.length;
  nextTick(() => syncSelection());
}

function syncSelection() {
  const tb = tableRef.value;
  if (!tb) return;
  syncingSelection = true;
  tb.clearSelection();
  for (const row of tableRows.value) {
    if (selectedMap.value.has(deviceMapKey(row.deviceId))) {
      tb.toggleRowSelection(row, true);
    }
  }
  nextTick(() => {
    syncingSelection = false;
  });
}

function onModeChange() {
  searchForm.deviceIdx = '';
  searchForm.deviceStatuses = '';
}

function onSearch() {
  page.current = 1;
  loadList();
}

function onOnlySelectedChange(val: boolean) {
  onlySelected.value = val;
  page.current = 1;
  if (val) {
    applyLocalFilter();
  } else {
    loadList();
  }
}

function onSelect(selection: any[], row: any) {
  if (syncingSelection) return;
  if (row?.isLock) return;
  const key = deviceMapKey(row.deviceId);
  const inSel = selection.some((r) => deviceMapKey(r.deviceId) === key);
  if (inSel) {
    selectedMap.value.set(key, row);
    appendKeyToSelectionOrderIfNeeded(key);
  } else {
    selectedMap.value.delete(key);
    removeKeyFromSelectionOrder(key);
  }
}

function onSelectAll(selection: any[]) {
  if (syncingSelection) return;
  const onPage = tableRows.value;
  if (selection.length) {
    for (const r of onPage) {
      if (!r?.isLock) {
        const k = deviceMapKey(r.deviceId);
        selectedMap.value.set(k, r);
        appendKeyToSelectionOrderIfNeeded(k);
      }
    }
    mergeApiPageOrderIntoSelectionOrder(onPage);
  } else {
    for (const r of onPage) {
      const k = deviceMapKey(r.deviceId);
      selectedMap.value.delete(k);
      removeKeyFromSelectionOrder(k);
    }
  }
}

function onPageChange(p: number) {
  page.current = p;
  loadList();
}

function onSizeChange(s: number) {
  page.size = s;
  page.current = 1;
  loadList();
}

watch(
  () => visible.value,
  async (v) => {
    if (v) {
      resetFromDetail();
      await loadList();
    }
  },
);

function close() {
  visible.value = false;
}

function resolveSuiteId(d: Record<string, any> | null | undefined) {
  if (!d) return undefined;
  const v = d.id ?? d.suiteId;
  if (v === null || v === undefined || v === '') return undefined;
  return v;
}

async function save() {
  const d = props.detail;
  const suiteId = resolveSuiteId(d);
  if (suiteId === undefined) {
    ElMessage.warning($t('systemManage.groupManage.missingSuiteId'));
    return;
  }
  saving.value = true;
  try {
    const mobiles = selectionRowOrder.value
      .filter((k) => selectedMap.value.has(k))
      .map((k) => selectedMap.value.get(k));
    for (const k of selectedMap.value.keys()) {
      if (!selectionRowOrder.value.includes(k)) {
        mobiles.push(selectedMap.value.get(k));
      }
    }
    const res = await updateSocialSuiteApi({
      suiteId,
      suiteName: d?.suiteName,
      suiteDesc: d?.suiteDesc,
      suiteType: d?.suiteType,
      mobiles,
    });
    if (res && successCode(res.code)) {
      ElMessage.success($t('systemManage.opSuccess'));
      close();
      emit('success');
    }
  } catch (e) {
    console.error(e);
    ElMessage.error($t('common.error.submitFailed'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <ElDrawer
    v-model="visible"
    :title="$t('systemManage.groupManage.deviceDetails')"
    size="70%"
    destroy-on-close
    class="device-assign-drawer"
  >
    <div class="drawer-body">
      <!-- 与旧版 SetGrouping 一致：config 中分组名称/描述已注释，抽屉内仅筛选区 + 表格 -->
      <div class="toolbar">
        <div class="search-input-group">
          <div class="compact-input-row">
            <ElSelect v-model="searchMode" class="mode-select" @change="onModeChange">
              <ElOption
                v-for="m in modeOptions"
                :key="m.value"
                :label="m.label"
                :value="m.value"
              />
            </ElSelect>
            <ElSelect
              v-if="searchMode === 'status'"
              v-model="searchForm.deviceStatuses"
              clearable
              class="second-control"
              :placeholder="$t('systemManage.groupManage.pleaseSelectStatus')"
            >
              <ElOption
                v-for="o in statusOptions"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </ElSelect>
            <ElInput
              v-else
              v-model="searchForm.deviceIdx"
              clearable
              class="second-control"
              :placeholder="$t('systemManage.groupManage.pleaseInputIpSerialAlias')"
              @keyup.enter="onSearch"
            />
          </div>
        </div>
        <ElButton type="primary" class="query-btn" @click="onSearch">
          {{ $t('common.query') }}
        </ElButton>
        <ElCheckbox
          :model-value="onlySelected"
          class="only-selected-check"
          @update:model-value="onOnlySelectedChange"
        >
          {{ $t('systemManage.groupManage.onlyShowSelectedDevices') }}
        </ElCheckbox>
      </div>

      <ElTable
        ref="tableRef"
        v-loading="loading"
        :data="tableRows"
        row-key="deviceId"
        border
        class="device-table"
        height="420"
        @select="onSelect"
        @select-all="onSelectAll"
      >
        <ElTableColumn
          type="selection"
          width="48"
          align="center"
          :selectable="(row: any) => !row?.isLock"
        />
        <ElTableColumn
          :label="$t('systemManage.groupManage.serialNumber')"
          min-width="100"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.deviceIdx }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          :label="$t('systemManage.groupManage.deviceIp')"
          min-width="120"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.deviceIp }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          :label="$t('systemManage.groupManage.deviceAlias')"
          min-width="120"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.deviceAliases }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          :label="$t('systemManage.groupManage.status')"
          min-width="100"
          align="center"
        >
          <template #default="{ row }">
            {{ displayStatus(row) }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          :label="$t('systemManage.groupManage.deviceBrandModel')"
          min-width="120"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ displayBrand(row) }}
          </template>
        </ElTableColumn>
      </ElTable>

      <div v-if="!onlySelected" class="pager">
        <ElPagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-size="page.size"
          :current-page="page.current"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <ElButton native-type="button" @click="close">{{ $t('common.cancel') }}</ElButton>
        <ElButton native-type="button" type="primary" :loading="saving" @click="save">
          {{ $t('common.confirm') }}
        </ElButton>
      </div>
    </template>
  </ElDrawer>
</template>

<style scoped>
.drawer-body {
  padding: 0 4px 24px;
}

.toolbar {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  margin-bottom: 20px;
  gap: 0;
  min-width: 0;
}

.search-input-group {
  flex-shrink: 0;
  width: 332px;
  max-width: 100%;
  margin-right: 15px;
}

.compact-input-row {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  overflow: hidden;
  background: var(--el-fill-color-blank);
}

.mode-select {
  width: 100px;
  flex-shrink: 0;
}

.mode-select :deep(.el-select__wrapper) {
  min-height: 32px;
  border: none;
  border-radius: 0;
  box-shadow: none;
  border-right: 1px solid var(--el-border-color);
}

.second-control {
  flex: 1;
  min-width: 0;
}

.second-control :deep(.el-input__wrapper),
.second-control :deep(.el-select__wrapper) {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.query-btn {
  margin-right: 20px;
}

.device-table {
  width: 100%;
}

.pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.drawer-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
}
</style>

<style>
.device-assign-drawer .el-drawer__body {
  padding-bottom: 16px;
}

.device-assign-drawer .el-drawer__footer {
  display: flex;
  justify-content: center;
}
</style>
