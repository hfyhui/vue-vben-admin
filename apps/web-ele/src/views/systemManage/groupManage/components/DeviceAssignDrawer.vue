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
let syncingSelection = false;

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
  const opts = statusOptions.value;
  return opts.find((o) => o.value === code)?.label ?? code;
}

function brandLabel(code?: string) {
  if (!code) return '';
  const children = assetEnums.getEnumByKey<any>('MOBILE_BRAND')?.children ?? [];
  const hit = children.find((c: any) => c.name === code);
  return hit?.content ?? code;
}


function displayStatus(row: any) {
  return row.deviceStatusName || statusLabel(row.deviceStatus) || '';
}

function displayBrand(row: any) {
  return row.deviceCategoryName || brandLabel(row.deviceCategory) || '';
}

async function ensureEnums() {
  await assetEnums.ensureAssetEnumsLoaded();
}

function resetFromDetail() {
  selectedMap.value = new Map();
  const orgs = props.detail?.suiteOrgs ?? [];
  for (const r of orgs) {
    if (r?.deviceId) selectedMap.value.set(`${r.deviceId ?? ''}`, { ...r });
  }
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
  tableRows.value = filtered.map((el) => ({
    ...el,
    deviceStatusName: el.deviceStatusName ?? statusLabel(el.deviceStatus),
    deviceCategoryName: el.deviceCategoryName ?? brandLabel(el.deviceCategory),
  }));
  total.value = filtered.length;
  nextTick(() => syncSelection());
}

function syncSelection() {
  const tb = tableRef.value;
  if (!tb) return;
  syncingSelection = true;
  tb.clearSelection();
  for (const row of tableRows.value) {
    if (selectedMap.value.has(row.deviceId)) {
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
  const inSel = selection.some((r) => r.deviceId === row.deviceId);
  if (inSel) {
    selectedMap.value.set(row.deviceId, row);
  } else {
    selectedMap.value.delete(row.deviceId);
  }
}

function onSelectAll(selection: any[]) {
  if (syncingSelection) return;
  const onPage = tableRows.value;
  if (selection.length) {
    for (const r of selection) {
      selectedMap.value.set(r.deviceId, r);
    }
  } else {
    for (const r of onPage) {
      selectedMap.value.delete(r.deviceId);
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
    const mobiles = [...selectedMap.value.values()];
    const res = await updateSocialSuiteApi({
      id: suiteId,
      suiteName: d?.suiteName,
      suiteDesc: d?.suiteDesc,
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
        <ElTableColumn type="selection" width="48" align="center" />
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
