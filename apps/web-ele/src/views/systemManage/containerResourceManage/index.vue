<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { Connection, Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { ElTable as ElTableType } from 'element-plus';

import {
  allocationContainerAllocateApi,
  getAllocationContainerListApi,
  getAllocationContainerPageApi,
  getAllocationContainerUserListApi,
} from '#/api/core/asset';
import { postSystemAccountsUsersPageApi } from '#/api/core/social-system-accounts';
import { $t } from '#/locales';

const activeTab = ref<'assignContainers' | 'assignSystemUsers'>('assignContainers');

const containerKeyword = ref('');
const systemUserKeyword = ref('');
const containerRows = ref<any[]>([]);
const systemUserRows = ref<any[]>([]);
const containerTotal = ref(0);
const systemUserTotal = ref(0);
const containerPage = ref(1);
const systemUserPage = ref(1);
const containerPageSize = ref(20);
const systemUserPageSize = ref(20);
const pageSizeOptions = [10, 20, 50, 100];

const containerTableRef = ref<InstanceType<typeof ElTableType>>();
const systemUserTableRef = ref<InstanceType<typeof ElTableType>>();
const selectedContainerRows = ref<any[]>([]);
const selectedSystemUserRows = ref<any[]>([]);
const selectedSystemUserIds = ref<string[]>([]);
const selectedContainerIds = ref<string[]>([]);
const containerShowSelectedOnly = ref(false);
const systemUserShowSelectedOnly = ref(false);
let syncingSystemUserSelection = false;
let syncingContainerSelection = false;
const containerLoading = ref(false);
const systemUserLoading = ref(false);

function successCode(code: number) {
  return code === 200 || code === 100000;
}

function getOwnerList(row: { userInfos?: any[] } | null | undefined): string[] {
  if (!Array.isArray(row?.userInfos)) return [];
  return row.userInfos
    .map((item) => String(item?.nickName ?? item?.userName ?? '').trim())
    .filter(Boolean);
}

function isRowDisabled(row: any) {
  return row?.status === 1 || row?.status === '1' || row?.isLock === true;
}

function rowSelectable(row: any) {
  return !isRowDisabled(row);
}

function rowClassName({ row }: { row: any }) {
  return isRowDisabled(row) ? 'locked-row' : '';
}

function containerRowKey(row: any) {
  return String(row?.deviceId ?? row?.id ?? '');
}

function systemUserRowKey(row: any) {
  return String(row?.userId ?? row?.id ?? '');
}

const displaySystemUserRows = computed(() => {
  if (activeTab.value === 'assignContainers' && systemUserShowSelectedOnly.value) {
    const selectedIdSet = new Set(selectedSystemUserIds.value);
    const currentPageSelected = systemUserRows.value.filter((row) =>
      selectedIdSet.has(String(row?.userId ?? row?.id ?? '').trim()),
    );
    if (currentPageSelected.length) return currentPageSelected;
    return [...selectedSystemUserRows.value];
  }
  return systemUserRows.value;
});

const displayContainerRows = computed(() => {
  if (activeTab.value === 'assignSystemUsers' && containerShowSelectedOnly.value) {
    const selectedIdSet = new Set(selectedContainerIds.value);
    const currentPageSelected = containerRows.value.filter((row) =>
      selectedIdSet.has(String(row?.deviceId ?? row?.id ?? '').trim()),
    );
    if (currentPageSelected.length) return currentPageSelected;
    return [...selectedContainerRows.value];
  }
  return containerRows.value;
});

function toIdList(rows: any[], keys: string[]): string[] {
  return rows
    .map((row) => {
      for (const key of keys) {
        const value = row?.[key];
        if (value !== null && value !== undefined && String(value).trim()) {
          return String(value).trim();
        }
      }
      return '';
    })
    .filter(Boolean);
}

async function loadContainers() {
  containerLoading.value = true;
  try {
    const res = await getAllocationContainerPageApi({
      current: containerPage.value,
      size: containerPageSize.value,
      condition: containerKeyword.value || undefined,
    });
    const records = res.records ?? [];
    containerRows.value = records;
    containerTotal.value = res.total ?? 0;
  } finally {
    containerLoading.value = false;
  }
}

async function loadSystemUsers() {
  systemUserLoading.value = true;
  try {
    const res = await postSystemAccountsUsersPageApi({
      current: systemUserPage.value,
      size: systemUserPageSize.value,
      keyword: systemUserKeyword.value || undefined,
    });
    if (res && successCode(res.code)) {
      systemUserRows.value = res.data?.records ?? [];
      systemUserTotal.value = res.data?.total ?? 0;
    } else {
      systemUserRows.value = [];
      systemUserTotal.value = 0;
    }
  } finally {
    systemUserLoading.value = false;
  }
}

async function syncUsersSelectionByDevices(deviceIds: string[]) {
  const table = systemUserTableRef.value;
  if (!table) return;
  if (!deviceIds.length) {
    syncingSystemUserSelection = true;
    table.clearSelection();
    selectedSystemUserRows.value = [];
    syncingSystemUserSelection = false;
    return;
  }
  const res = await getAllocationContainerListApi({
    deviceIds,
    current: 1,
    size: 100000,
  });
  const bindUserIds = new Set(
    (res.records ?? [])
      .map((row: any) => String(row?.userId ?? row?.id ?? '').trim())
      .filter((id): id is string => Boolean(id)),
  );
  syncingSystemUserSelection = true;
  table.clearSelection();
  const selectedRows: any[] = [];
  for (const row of systemUserRows.value) {
    const id = String(row?.userId ?? row?.id ?? '').trim();
    if (id && bindUserIds.has(id) && rowSelectable(row)) {
      selectedRows.push(row);
      table.toggleRowSelection(row, true, true);
    }
  }
  selectedSystemUserRows.value = selectedRows;
  selectedSystemUserIds.value = toIdList(selectedRows, ['userId', 'id']);
  syncingSystemUserSelection = false;
}

async function syncContainersSelectionByUsers(userIds: string[]) {
  const table = containerTableRef.value;
  if (!table) return;
  if (!userIds.length) {
    syncingContainerSelection = true;
    table.clearSelection();
    selectedContainerRows.value = [];
    syncingContainerSelection = false;
    return;
  }
  const res = await getAllocationContainerUserListApi({
    userIds,
    current: 1,
    size: 100000,
  });
  const bindDeviceIds = new Set(
    (res.records ?? [])
      .map((row: any) => String(row?.deviceId ?? row?.id ?? '').trim())
      .filter((id): id is string => Boolean(id)),
  );
  syncingContainerSelection = true;
  table.clearSelection();
  const selectedRows: any[] = [];
  for (const row of containerRows.value) {
    const id = String(row?.deviceId ?? row?.id ?? '').trim();
    if (id && bindDeviceIds.has(id) && rowSelectable(row)) {
      selectedRows.push(row);
      table.toggleRowSelection(row, true);
    }
  }
  selectedContainerRows.value = selectedRows;
  selectedContainerIds.value = toIdList(selectedRows, ['deviceId', 'id']);
  syncingContainerSelection = false;
}

function onContainerSelect(rows: any[]) {
  if (syncingContainerSelection) return;
  if (
    activeTab.value === 'assignSystemUsers' &&
    containerShowSelectedOnly.value &&
    rows.length === 0 &&
    selectedContainerIds.value.length > 0
  ) {
    return;
  }
  const currentPageRows = displayContainerRows.value;
  const currentPageIds = new Set(toIdList(currentPageRows, ['deviceId', 'id']));
  const remainRows = selectedContainerRows.value.filter((row) => {
    const id = String(row?.deviceId ?? row?.id ?? '').trim();
    return id && !currentPageIds.has(id);
  });
  selectedContainerRows.value = [...remainRows, ...rows];
  selectedContainerIds.value = toIdList(selectedContainerRows.value, ['deviceId', 'id']);
  if (activeTab.value === 'assignContainers') {
    void syncUsersSelectionByDevices(selectedContainerIds.value);
  }
}

function onSystemUserSelect(rows: any[]) {
  if (syncingSystemUserSelection) return;
  if (
    activeTab.value === 'assignContainers' &&
    systemUserShowSelectedOnly.value &&
    rows.length === 0 &&
    selectedSystemUserIds.value.length > 0
  ) {
    return;
  }
  const currentPageRows = displaySystemUserRows.value;
  const currentPageIds = new Set(toIdList(currentPageRows, ['userId', 'id']));
  const remainRows = selectedSystemUserRows.value.filter((row) => {
    const id = String(row?.userId ?? row?.id ?? '').trim();
    return id && !currentPageIds.has(id);
  });
  selectedSystemUserRows.value = [...remainRows, ...rows];
  selectedSystemUserIds.value = toIdList(selectedSystemUserRows.value, ['userId', 'id']);
  if (activeTab.value === 'assignSystemUsers') {
    const userIds = toIdList(selectedSystemUserRows.value, ['userId', 'id']);
    void syncContainersSelectionByUsers(userIds);
  }
}

function onTabChange() {
  containerTableRef.value?.clearSelection();
  systemUserTableRef.value?.clearSelection();
  selectedContainerRows.value = [];
  selectedSystemUserRows.value = [];
  selectedSystemUserIds.value = [];
  selectedContainerIds.value = [];
  containerShowSelectedOnly.value = false;
  systemUserShowSelectedOnly.value = false;
  void loadContainers();
  void loadSystemUsers();
}

async function onSave() {
  const bindDirection = activeTab.value === 'assignContainers';
  const userIds = toIdList(selectedSystemUserRows.value, ['userId', 'id']);
  const deviceIds = toIdList(selectedContainerRows.value, ['deviceId', 'id']);

  if (!bindDirection && deviceIds.length === 0) {
    ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
    return;
  }
  if (bindDirection && userIds.length === 0) {
    ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
    return;
  }

  let delIds: string[] = [];
  if (bindDirection) {
    const relationRes = await getAllocationContainerUserListApi({
      userIds,
      current: 1,
      size: 100000,
    });
    const defaultIds = (relationRes.records ?? [])
      .map((row: any) => String(row?.deviceId ?? row?.id ?? '').trim())
      .filter((id): id is string => Boolean(id));
    const tempInfo = deviceIds;
    delIds = defaultIds.filter((id) => !tempInfo.includes(id));
  } else {
    const relationRes = await getAllocationContainerListApi({
      deviceIds,
      current: 1,
      size: 100000,
    });
    const defaultIds = (relationRes.records ?? [])
      .map((row: any) => String(row?.userId ?? row?.id ?? '').trim())
      .filter((id): id is string => Boolean(id));
    const tempInfo = userIds;
    delIds = defaultIds.filter((id) => !tempInfo.includes(id));
  }

  const res = await allocationContainerAllocateApi({
    userIds,
    deviceIds,
    bindDirection,
    delIds,
  });
  if (res && successCode(res.code)) {
    ElMessage.success($t('systemManage.opSuccess'));
    selectedContainerRows.value = [];
    selectedSystemUserRows.value = [];
    selectedSystemUserIds.value = [];
    containerTableRef.value?.clearSelection();
    systemUserTableRef.value?.clearSelection();
    await loadContainers();
    await loadSystemUsers();
  }
}

function searchContainers() {
  containerShowSelectedOnly.value = false;
  containerPage.value = 1;
  void loadContainers().then(() => {
    if (activeTab.value === 'assignSystemUsers') {
      const userIds = toIdList(selectedSystemUserRows.value, ['userId', 'id']);
      void syncContainersSelectionByUsers(userIds);
    }
  });
}
function onContainerSizeChange(size: number) {
  containerPageSize.value = size;
  containerPage.value = 1;
  void loadContainers();
}
function onContainerCurrentChange(page: number) {
  containerPage.value = page;
  void loadContainers();
}
function resetContainers() {
  containerKeyword.value = '';
  searchContainers();
}
function searchSystemUsers() {
  systemUserShowSelectedOnly.value = false;
  systemUserPage.value = 1;
  void loadSystemUsers().then(() => {
    if (activeTab.value === 'assignContainers') {
      void syncUsersSelectionByDevices(selectedContainerIds.value);
    }
  });
}
function onSystemUserSizeChange(size: number) {
  systemUserPageSize.value = size;
  systemUserPage.value = 1;
  void loadSystemUsers();
}
function onSystemUserCurrentChange(page: number) {
  systemUserPage.value = page;
  void loadSystemUsers();
}
function resetSystemUsers() {
  systemUserKeyword.value = '';
  searchSystemUsers();
}

function syncSystemUserSelection() {
  const table = systemUserTableRef.value;
  if (!table) return;
  const selectedIds = new Set(toIdList(selectedSystemUserRows.value, ['userId', 'id']));
  syncingSystemUserSelection = true;
  table.clearSelection();
  for (const row of displaySystemUserRows.value) {
    const id = String(row?.userId ?? row?.id ?? '').trim();
    if (id && selectedIds.has(id)) {
      table.toggleRowSelection(row, true, true);
    }
  }
  nextTick(() => {
    syncingSystemUserSelection = false;
  });
}

function onSystemUserOnlySelectedChange() {
  const snapshotIds = [...selectedSystemUserIds.value];
  const snapshotRows = [...selectedSystemUserRows.value];
  syncingSystemUserSelection = true;
  nextTick(() => {
    if (!selectedSystemUserIds.value.length && snapshotIds.length) {
      selectedSystemUserIds.value = snapshotIds;
    }
    if (!selectedSystemUserRows.value.length && snapshotRows.length) {
      selectedSystemUserRows.value = snapshotRows;
    }
    syncSystemUserSelection();
  });
}

function syncContainerSelection() {
  const table = containerTableRef.value;
  if (!table) return;
  const selectedIds = new Set(toIdList(selectedContainerRows.value, ['deviceId', 'id']));
  syncingContainerSelection = true;
  table.clearSelection();
  for (const row of displayContainerRows.value) {
    const id = String(row?.deviceId ?? row?.id ?? '').trim();
    if (id && selectedIds.has(id)) {
      table.toggleRowSelection(row, true, true);
    }
  }
  nextTick(() => {
    syncingContainerSelection = false;
  });
}

function onContainerOnlySelectedChange() {
  const snapshotIds = [...selectedContainerIds.value];
  const snapshotRows = [...selectedContainerRows.value];
  syncingContainerSelection = true;
  nextTick(() => {
    if (!selectedContainerIds.value.length && snapshotIds.length) {
      selectedContainerIds.value = snapshotIds;
    }
    if (!selectedContainerRows.value.length && snapshotRows.length) {
      selectedContainerRows.value = snapshotRows;
    }
    syncContainerSelection();
  });
}

onMounted(() => {
  void loadContainers();
  void loadSystemUsers();
});
</script>

<template>
  <Page :title="$t('page.dashboard.containerResourceManage')">
    <div class="header-bar">
      <ElTabs v-model="activeTab" type="card" class="tabs" @tab-click="onTabChange">
        <ElTabPane
          :label="$t('systemManage.containerResourceManage.assignSystemUserToContainer')"
          name="assignContainers"
        />
        <ElTabPane
          :label="$t('systemManage.containerResourceManage.assignContainerToSystemUser')"
          name="assignSystemUsers"
        />
      </ElTabs>
      <ElButton class="save-btn" type="primary" @click="onSave">
        {{ $t('common.save') }}
      </ElButton>
    </div>

    <div class="panels" :class="{ row_reverse: activeTab === 'assignSystemUsers' }">
      <section class="panel">
        <div class="table-toolbar-row">
          <ElInput
            v-model="containerKeyword"
            clearable
            :placeholder="$t('systemManage.containerResourceManage.searchPlaceholderContainer')"
            @keyup.enter="searchContainers"
          />
          <ElButton :icon="Search" circle type="primary" @click="searchContainers" />
          <ElButton :icon="Refresh" circle @click="resetContainers" />
        </div>
        <div v-show="activeTab === 'assignSystemUsers'" class="only-selected-wrap">
          <ElCheckbox
            v-model="containerShowSelectedOnly"
            @change="onContainerOnlySelectedChange"
          >
            {{ $t('systemManage.socialMediaAccount.onlyShowSelected') }}
          </ElCheckbox>
        </div>
        <div
          v-show="activeTab !== 'assignSystemUsers'"
          class="only-selected-wrap only-selected-wrap--placeholder"
        >
          <span> </span>
        </div>

        <ElTable
          ref="containerTableRef"
          v-loading="containerLoading"
          :data="displayContainerRows"
          :row-key="containerRowKey"
          :row-class-name="rowClassName"
          class="no-lines-table"
          height="420"
          @selection-change="onContainerSelect"
        >
          <ElTableColumn
            type="selection"
            width="48"
            :reserve-selection="true"
            :selectable="rowSelectable"
          />
          <ElTableColumn
            :label="$t('systemManage.containerResourceManage.colOwner')"
            min-width="140"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <template v-if="getOwnerList(row).length > 1">
                <ElTooltip placement="top" effect="light" :show-after="200">
                  <template #content>
                    <div class="owner-tooltip-lines">
                      <div v-for="(name, idx) in getOwnerList(row)" :key="idx">
                        {{ name }}
                      </div>
                    </div>
                  </template>
                  <span class="owner-cell-text">{{ getOwnerList(row).join('、') }}</span>
                </ElTooltip>
              </template>
              <span v-else class="owner-cell-text">{{ getOwnerList(row)[0] || '—' }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="server"
            :label="$t('systemManage.containerResourceManage.colServer')"
            min-width="140"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="deviceIp"
            :label="$t('systemManage.containerResourceManage.colDeviceIp')"
            min-width="120"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="deviceVersion"
            :label="$t('systemManage.containerResourceManage.colDeviceVersion')"
            min-width="140"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="suiteNames"
            :label="$t('systemManage.containerResourceManage.colDeviceGroup')"
            min-width="140"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ Array.isArray(row?.suiteNames) ? row.suiteNames.join(', ') : '—' }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="remark"
            :label="$t('systemManage.containerResourceManage.colRemark')"
            min-width="140"
            show-overflow-tooltip
          />
        </ElTable>

        <div class="pager">
          <ElPagination
            background
            size="small"
            layout="total, sizes, prev, pager, next"
            :total="containerTotal"
            :page-sizes="pageSizeOptions"
            :page-size="containerPageSize"
            :current-page="containerPage"
            @size-change="onContainerSizeChange"
            @current-change="onContainerCurrentChange"
          />
        </div>
      </section>

      <div class="link-icon" aria-hidden="true">
        <ElIcon :size="36" color="var(--el-color-primary)"><Connection /></ElIcon>
      </div>

      <section class="panel panel-narrow">
        <div class="table-toolbar-row">
          <ElInput
            v-model="systemUserKeyword"
            clearable
            :placeholder="$t('systemManage.containerResourceManage.searchPlaceholderSystem')"
            @keyup.enter="searchSystemUsers"
          />
          <ElButton :icon="Search" circle type="primary" @click="searchSystemUsers" />
          <ElButton :icon="Refresh" circle @click="resetSystemUsers" />
        </div>
        <div v-show="activeTab === 'assignContainers'" class="only-selected-wrap">
          <ElCheckbox
            v-model="systemUserShowSelectedOnly"
            @change="onSystemUserOnlySelectedChange"
          >
            {{ $t('systemManage.socialMediaAccount.onlyShowSelected') }}
          </ElCheckbox>
        </div>
        <div
          v-show="activeTab !== 'assignContainers'"
          class="only-selected-wrap only-selected-wrap--placeholder"
        >
          <span> </span>
        </div>

        <ElTable
          ref="systemUserTableRef"
          v-loading="systemUserLoading"
          :data="displaySystemUserRows"
          :row-key="systemUserRowKey"
          :row-class-name="rowClassName"
          class="no-lines-table"
          height="420"
          @selection-change="onSystemUserSelect"
        >
          <ElTableColumn
            type="selection"
            width="48"
            :reserve-selection="true"
            :selectable="rowSelectable"
          />
          <ElTableColumn
            prop="userName"
            :label="$t('systemManage.socialMediaAccount.name')"
            min-width="120"
          />
          <ElTableColumn
            prop="nickName"
            :label="$t('systemManage.socialMediaAccount.nickname')"
            min-width="120"
          />
        </ElTable>

        <div class="pager">
          <ElPagination
            background
            size="small"
            layout="total, sizes, prev, pager, next"
            :total="systemUserTotal"
            :page-sizes="pageSizeOptions"
            :page-size="systemUserPageSize"
            :current-page="systemUserPage"
            @size-change="onSystemUserSizeChange"
            @current-change="onSystemUserCurrentChange"
          />
        </div>
      </section>
    </div>
  </Page>
</template>

<style scoped>
.header-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 0 16px;
  flex-wrap: wrap;
}
.tabs {
  flex: 0 1 auto;
  min-width: 280px;
}
.tabs :deep(.el-tabs__header) {
  margin: 0;
}
.save-btn {
  margin-left: 12px;
}
.panels {
  display: flex;
  gap: 16px;
  align-items: stretch;
}
.panels.row_reverse {
  flex-direction: row-reverse;
}
.panel {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-width: 0;
  padding: 12px 16px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}
.panel-narrow {
  flex: 0 0 32%;
  max-width: 520px;
}
.table-toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.table-toolbar-row .el-input {
  flex: 1;
  min-width: 160px;
}
.only-selected-wrap {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin: 0 0 10px;
  min-height: 24px;
}
.only-selected-wrap--placeholder {
  visibility: hidden;
}
.link-icon {
  align-self: center;
  padding: 0 4px;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.owner-cell-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
.owner-tooltip-lines {
  line-height: 1.5;
  text-align: left;
  max-width: 240px;
}
.owner-tooltip-lines > div + div {
  margin-top: 2px;
}
.no-lines-table :deep(tr.locked-row td) {
  background: color-mix(in srgb, var(--el-fill-color-light) 45%, transparent);
  color: color-mix(in srgb, var(--el-text-color-secondary) 78%, var(--el-text-color-primary));
}
</style>
