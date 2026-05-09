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
let switchingSystemUserOnlySelected = false;
let switchingContainerOnlySelected = false;
const containerLoading = ref(false);
const systemUserLoading = ref(false);

function successCode(code: number) {
  return code === 200 || code === 100000;
}

function getOwnerList(row: any): string[] {
  return row.userInfos
    .map((item: any) => item?.userName)
}

function getOwnerLockList(row: Record<string, any> | null | undefined): string[] {
  const rawOwner = String(row?.owner ?? '').trim();
  if (!rawOwner) return [];
  return rawOwner
    .split(/[,\u3001\uff0c]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getOwnerText(row: { userInfos?: any[] } | null | undefined) {
  return getOwnerList(row).join('、');
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

function getSelectedContainerOwnerSet() {
  const selectedIdSet = new Set(toDeviceIdList(selectedContainerRows.value));
  const selectedRowsInCurrentList = containerRows.value.filter((row) =>
    selectedIdSet.has(String(row?.deviceId ?? row?.id ?? '').trim()),
  );
  return new Set(selectedRowsInCurrentList.flatMap((item) => getOwnerLockList(item)));
}

function isOwnerLockedSystemUser(row: any) {
  if (activeTab.value !== 'assignContainers') return false;
  const ownerSet = getSelectedContainerOwnerSet();
  if (!ownerSet.size) return false;
  const userName = String(row?.userName ?? '').trim();
  return userName && ownerSet.has(userName);
}

function isLockedSystemUser(row: any) {
  if (isRowDisabled(row)) return true;
  return isOwnerLockedSystemUser(row);
}

function systemUserSelectable(row: any) {
  return !isOwnerLockedSystemUser(row);
}

function systemUserRowClassName({ row }: { row: any }) {
  return isLockedSystemUser(row) ? 'locked-row' : '';
}

function containerRowKey(row: any) {
  return String(row?.deviceId ?? row?.id ?? '');
}

function systemUserRowKey(row: any) {
  return String(row?.userId ?? row?.id ?? '');
}

const displaySystemUserRows = computed(() => {
  if (activeTab.value === 'assignContainers' && systemUserShowSelectedOnly.value) {
    return [...selectedSystemUserRows.value];
  }
  return systemUserRows.value;
});

const displayContainerRows = computed(() => {
  if (activeTab.value === 'assignSystemUsers' && containerShowSelectedOnly.value) {
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

function toDeviceIdList(rows: any[]) {
  return toIdList(rows, ['deviceId', 'id']);
}

function toUserIdList(rows: any[]) {
  return toIdList(rows, ['userId', 'id']);
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
    await nextTick();
    if (selectedContainerIds.value.length) {
      syncContainerSelection();
    }
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
    await nextTick();
    if (selectedSystemUserIds.value.length) {
      if (activeTab.value === 'assignContainers') {
        selectedSystemUserRows.value = mergeSystemUserRowsForAllocatedDevices(
          selectedSystemUserIds.value,
          [],
          selectedSystemUserRows.value,
        );
      }
      syncSystemUserSelection();
    }
  } finally {
    systemUserLoading.value = false;
  }
}

/** Tab1「仅展示已勾选」：保留全量选中行，与 proxyManage Tab2 合并代理行语义一致 */
function mergeSystemUserRowsForAllocatedDevices(
  orderedUserIds: string[],
  resRecords: any[],
  previousRows: any[],
) {
  const currentRows = systemUserRows.value;
  const currentMap = new Map<string, any>();
  for (const row of currentRows) {
    const id = String(row?.userId ?? row?.id ?? '').trim();
    if (id) currentMap.set(id, row);
  }
  const previousMap = new Map<string, any>();
  for (const row of previousRows) {
    const id = String(row?.userId ?? row?.id ?? '').trim();
    if (id) previousMap.set(id, row);
  }
  return orderedUserIds
    .map((id) => {
      if (currentMap.has(id)) return currentMap.get(id);
      if (previousMap.has(id)) return previousMap.get(id);
      const fallback = resRecords.find((item: any) => {
        const itemId = String(item?.userId ?? item?.id ?? '').trim();
        return itemId === id;
      });
      return fallback ?? { userId: id, userName: '', nickName: '' };
    })
    .filter(Boolean);
}

async function syncUsersSelectionByDevices(deviceIds: string[]) {
  const table = systemUserTableRef.value;
  if (!table) return;
  if (!deviceIds.length) {
    syncingSystemUserSelection = true;
    table.clearSelection();
    selectedSystemUserRows.value = [];
    selectedSystemUserIds.value = [];
    await nextTick();
    syncingSystemUserSelection = false;
    return;
  }
  const res = await getAllocationContainerListApi({
    deviceIds,
    current: 1,
    size: 100000,
  });
  const records = res.records ?? [];
  const bindUserIds = new Set<string>(
    records
      .map((row: any) => String(row?.userId ?? row?.id ?? '').trim())
      .filter((id): id is string => Boolean(id)),
  );
  const boundIdSet = new Set<string>(bindUserIds);
  syncingSystemUserSelection = true;
  table.clearSelection();
  for (const row of systemUserRows.value) {
    const id = String(row?.userId ?? row?.id ?? '').trim();
    if (id && (bindUserIds.has(id) || isOwnerLockedSystemUser(row))) {
      table.toggleRowSelection(row, true, true);
      if (id) boundIdSet.add(id);
    }
  }
  const orderedUserIds: string[] = [];
  const seen = new Set<string>();
  for (const item of records) {
    const id = String(item?.userId ?? item?.id ?? '').trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      orderedUserIds.push(id);
    }
  }
  for (const id of boundIdSet) {
    if (!seen.has(id)) {
      seen.add(id);
      orderedUserIds.push(id);
    }
  }
  selectedSystemUserRows.value = mergeSystemUserRowsForAllocatedDevices(
    orderedUserIds,
    records,
    selectedSystemUserRows.value,
  );
  selectedSystemUserIds.value = [...orderedUserIds];
  syncingSystemUserSelection = false;
}

async function syncContainersSelectionByUsers(userIds: string[]) {
  const table = containerTableRef.value;
  if (!table) return;
  if (!userIds.length) {
    syncingContainerSelection = true;
    table.clearSelection();
    selectedContainerRows.value = [];
    selectedContainerIds.value = [];
    await nextTick();
    syncingContainerSelection = false;
    return;
  }
  const res = await getAllocationContainerUserListApi({
    userIds,
    current: 1,
    size: 100000,
  });
  const bindDeviceIds = new Set<string>(
    (res.records ?? [])
      .map((row: any) => String(row?.deviceId ?? row?.id ?? '').trim())
      .filter((id): id is string => Boolean(id)),
  );
  const allSelectedIds: string[] = Array.from(bindDeviceIds);
  syncingContainerSelection = true;
  table.clearSelection();
  for (const row of containerRows.value) {
    const id = String(row?.deviceId ?? row?.id ?? '').trim();
    if (id && bindDeviceIds.has(id)) {
      table.toggleRowSelection(row, true, true);
    }
  }
  selectedContainerIds.value = allSelectedIds;
  selectedContainerRows.value = Array.isArray(res.records) ? [...res.records] : [];
  syncingContainerSelection = false;
}

function onContainerSelect(rows: any[]) {
  if (syncingContainerSelection) return;
  if (switchingContainerOnlySelected && rows.length === 0) return;
  const idKeys = ['deviceId', 'id'] as const;
  const currentPageRows = displayContainerRows.value;
  const currentPageIds = new Set(toIdList(currentPageRows, [...idKeys]));
  const visibleIds = toIdList(rows, [...idKeys]);
  const nextIdSet = new Set<string>();
  for (const id of selectedContainerIds.value) {
    if (!currentPageIds.has(id)) nextIdSet.add(id);
  }
  for (const id of visibleIds) nextIdSet.add(id);
  selectedContainerIds.value = [...nextIdSet];

  const remainRows = selectedContainerRows.value.filter((row) => {
    const id = String(row?.deviceId ?? row?.id ?? '').trim();
    return id && !currentPageIds.has(id);
  });
  selectedContainerRows.value = [...remainRows, ...rows];
  if (activeTab.value === 'assignContainers') {
    void syncUsersSelectionByDevices(selectedContainerIds.value);
  }
}

function onSystemUserSelect(rows: any[]) {
  if (syncingSystemUserSelection) return;
  if (switchingSystemUserOnlySelected && rows.length === 0) return;
  const currentPageRows = displaySystemUserRows.value;
  const currentPageIds = new Set(toUserIdList(currentPageRows));
  const visibleIds = toUserIdList(rows);
  const nextIdSet = new Set<string>();
  for (const id of selectedSystemUserIds.value) {
    if (!currentPageIds.has(id)) nextIdSet.add(id);
  }
  for (const id of visibleIds) nextIdSet.add(id);
  selectedSystemUserIds.value = [...nextIdSet];

  const remainRows = selectedSystemUserRows.value.filter((row) => {
    const id = String(row?.userId ?? row?.id ?? '').trim();
    return id && !currentPageIds.has(id);
  });
  selectedSystemUserRows.value = [...remainRows, ...rows];
  if (activeTab.value === 'assignSystemUsers') {
    void syncContainersSelectionByUsers(selectedSystemUserIds.value);
  }
}

function onTabChange() {
  containerKeyword.value = '';
  systemUserKeyword.value = '';
  containerPage.value = 1;
  systemUserPage.value = 1;
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
  const userIds = Array.from(new Set(selectedSystemUserIds.value.filter(Boolean)));
  const deviceIds = Array.from(new Set(selectedContainerIds.value.filter(Boolean)));

  // 按当前 tab 校验左侧主列表
  if (activeTab.value === 'assignContainers' && deviceIds.length === 0) {
    ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
    return;
  }
  if (activeTab.value === 'assignSystemUsers' && userIds.length === 0) {
    ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
    return;
  }

  let delIds: string[] = [];
  if (activeTab.value === 'assignSystemUsers') {
    // 分配容器至系统用户：以 userIds 查询“已绑定容器”，delIds 传 deviceId
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
    // 分配系统用户至容器：以 deviceIds 查询“已绑定用户”，delIds 传 userId
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
    selectedContainerIds.value = [];
    containerShowSelectedOnly.value = false;
    systemUserShowSelectedOnly.value = false;
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
      const userIds = toUserIdList(selectedSystemUserRows.value);
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
  const selectedIds = new Set(
    selectedSystemUserIds.value.map((id) => String(id).trim()).filter(Boolean),
  );
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
  if (activeTab.value === 'assignContainers') {
    systemUserKeyword.value = '';
  }
  switchingSystemUserOnlySelected = true;
  nextTick(() => {
    if (activeTab.value === 'assignContainers') {
      syncSystemUserSelection();
    }
    switchingSystemUserOnlySelected = false;
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
  if (activeTab.value === 'assignSystemUsers') {
    containerKeyword.value = '';
  }
  switchingContainerOnlySelected = true;
  nextTick(() => {
    if (activeTab.value === 'assignSystemUsers') {
      syncContainerSelection();
    }
    switchingContainerOnlySelected = false;
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
              <ElTooltip
                placement="top"
                effect="dark"
                :show-after="200"
                :content="getOwnerText(row) || '—'"
              >
                <span class="owner-cell-text">{{ getOwnerText(row) || '—' }}</span>
              </ElTooltip>
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

        <div
          v-show="!(activeTab === 'assignSystemUsers' && containerShowSelectedOnly)"
          class="pager"
        >
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
          :row-class-name="systemUserRowClassName"
          class="no-lines-table"
          height="420"
          @selection-change="onSystemUserSelect"
        >
          <ElTableColumn
            type="selection"
            width="48"
            :reserve-selection="true"
            :selectable="systemUserSelectable"
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

        <div
          v-show="!(activeTab === 'assignContainers' && systemUserShowSelectedOnly)"
          class="pager"
        >
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
