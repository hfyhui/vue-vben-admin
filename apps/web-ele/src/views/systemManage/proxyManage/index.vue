<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { Connection, Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { ElTable as ElTableType } from 'element-plus';

import {
  allocationNetworkAllocateApi,
  getAllocationNetworkListApi,
  getAllocationNetworkPageApi,
  getAllocationNetworkUserListApi,
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

/** 网络分配列表 records 适配到表格字段 */
function mapProxyRecord(raw: Record<string, any>) {
  const ownersFromField = String(raw.owner ?? '')
    .split(/[,\u3001\uff0c]/)
    .map((name) => name.trim())
    .filter(Boolean);
  const owners = Array.from(new Set(ownersFromField));
  return {
    ...raw,
    owners,
    region: raw.region ?? raw.area ?? '',
    deviceGroup: raw.deviceGroup ?? raw.suiteName ?? '',
    link: raw.link ?? raw.networkLink ?? '',
    expireTime: raw.expireTime ?? raw.expirationTime ?? '',
  };
}

function getOwnerList(row: any): string[] {
  if (!Array.isArray(row?.userInfos)) return [];
  return row.userInfos
    .map((item: any) => String(item?.userName ?? '').trim())
    .filter(Boolean);
}

function getOwnerLockList(row: Record<string, any> | null | undefined): string[] {
  if (Array.isArray(row?.owners)) {
    return row.owners.map((item: any) => String(item ?? '').trim()).filter(Boolean);
  }
  const rawOwner = String(row?.owner ?? '').trim();
  if (!rawOwner) return [];
  return rawOwner
    .split(/[,\u3001\uff0c]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getOwnerText(row: { owners?: string[] } | null | undefined) {
  return getOwnerList(row).join('、');
}

function isRowDisabled(row: any) {
  return row?.status === '1' || row?.isLock === true;
}

function getSelectedSystemUserNameById(userId: string): string {
  const targetId = String(userId ?? '').trim();
  if (!targetId) return '';
  const allRows = [...selectedSystemUserRows.value, ...systemUserRows.value];
  for (const row of allRows) {
    const id = String(row?.userId ?? row?.id ?? '').trim();
    if (id === targetId) {
      return String(row?.userName ?? '').trim();
    }
  }
  return '';
}

function getSelectedContainerOwnerListById(networkId: string): string[] {
  const targetId = String(networkId ?? '').trim();
  if (!targetId) return [];
  const allRows = [...selectedContainerRows.value, ...containerRows.value];
  for (const row of allRows) {
    const id = getIdFromRow(row, ['networkId', 'proxyId', 'id']);
    if (id === targetId) {
      return getOwnerLockList(row);
    }
  }
  return [];
}

function getSelectedSystemUserNameSetByIds(userIds: string[]): Set<string> {
  const userNameSet = new Set<string>();
  for (const userId of userIds) {
    const userName = getSelectedSystemUserNameById(userId);
    if (userName) userNameSet.add(userName);
  }
  return userNameSet;
}

function getSelectedContainerOwnerSetByIds(networkIds: string[]): Set<string> {
  const ownerSet = new Set<string>();
  for (const networkId of networkIds) {
    const owners = getSelectedContainerOwnerListById(networkId);
    for (const owner of owners) {
      if (owner) ownerSet.add(owner);
    }
  }
  return ownerSet;
}

function isLockedContainerByOwner(row: any) {
  if (activeTab.value !== 'assignSystemUsers') return false;
  const selectedUserNameSet = getSelectedSystemUserNameSetByIds(selectedSystemUserIds.value);
  if (selectedUserNameSet.size !== 1) return false;
  const selectedUserName = Array.from(selectedUserNameSet)[0] ?? '';
  if (!selectedUserName) return false;
  const ownerList = getOwnerLockList(row);
  return ownerList.includes(selectedUserName);
}

function containerRowSelectable(row: any) {
  return !isRowDisabled(row) && !isLockedContainerByOwner(row);
}

function containerRowClassName({ row }: { row: any }) {
  return isRowDisabled(row) || isLockedContainerByOwner(row) ? 'locked-row' : '';
}

function isLockedSystemUser(row: any) {
  if (isRowDisabled(row)) return true;
  if (activeTab.value !== 'assignContainers') return false;
  const ownerSet = getSelectedContainerOwnerSetByIds(selectedContainerIds.value);
  if (ownerSet.size !== 1) return false;
  const ownerName = Array.from(ownerSet)[0] ?? '';
  if (!ownerName) return false;
  const userName = String(row?.userName ?? '').trim();
  return userName ? userName === ownerName : false;
}

function systemUserSelectable(row: any) {
  return !isLockedSystemUser(row);
}

function systemUserRowClassName({ row }: { row: any }) {
  return isLockedSystemUser(row) ? 'locked-row' : '';
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

async function loadContainers() {
  containerLoading.value = true;
  try {
    const res = await getAllocationNetworkPageApi({
      current: containerPage.value,
      size: containerPageSize.value,
      condition: containerKeyword.value || undefined,
    });
    const mappedRows = (res.records ?? []).map((r) => mapProxyRecord(r as Record<string, any>));
    containerRows.value = mappedRows;
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
  } finally {
    systemUserLoading.value = false;
  }
}

async function syncUsersSelectionByNetworks(networkIds: string[]) {
  const table = systemUserTableRef.value;
  if (!table) return;
  if (!networkIds.length) {
    syncingSystemUserSelection = true;
    table.clearSelection();
    selectedSystemUserRows.value = [];
    await nextTick();
    syncingSystemUserSelection = false;
    return;
  }
  const res = await getAllocationNetworkListApi({
    networkIds,
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
    if (id && bindUserIds.has(id)) {
      selectedRows.push(row);
      table.toggleRowSelection(row, true, true);
    }
  }
  selectedSystemUserRows.value = selectedRows;
  selectedSystemUserIds.value = toIdList(selectedRows, ['userId', 'id']);
  await nextTick();
  syncingSystemUserSelection = false;
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

async function syncContainersSelectionByUsers(userIds: string[]) {
  const table = containerTableRef.value;
  if (!table) return;
  if (!userIds.length) {
    syncingContainerSelection = true;
    table.clearSelection();
    selectedContainerRows.value = [];
    await nextTick();
    syncingContainerSelection = false;
    return;
  }
  const res = await getAllocationNetworkUserListApi({
    userIds,
    current: 1,
    size: 100000,
  });
  const bindNetworkIds = new Set<string>(
    (res.records ?? [])
      .map((row: any) => String(row?.networkId ?? row?.proxyId ?? row?.id ?? '').trim())
      .filter((id): id is string => Boolean(id)),
  );
  const selectedUserNameSet = new Set(
    userIds
      .map((id) => getSelectedSystemUserNameById(id))
      .filter((name): name is string => Boolean(name)),
  );
  // 如果右侧代理是“当前勾选用户本人创建”，也要加入选中
  for (const row of containerRows.value) {
    const id = getIdFromRow(row, ['networkId', 'proxyId', 'id']);
    if (!id) continue;
    const ownerList = getOwnerLockList(row);
    if (ownerList.some((owner) => selectedUserNameSet.has(owner))) {
      bindNetworkIds.add(id);
    }
  }
  const allSelectedIds: string[] = Array.from(bindNetworkIds);
  const currentContainerMap = new Map<string, any>();
  for (const row of containerRows.value) {
    const id = getIdFromRow(row, ['networkId', 'proxyId', 'id']);
    if (id) currentContainerMap.set(id, row);
  }
  const previousSelectedMap = new Map<string, any>();
  for (const row of selectedContainerRows.value) {
    const id = getIdFromRow(row, ['networkId', 'proxyId', 'id']);
    if (id) previousSelectedMap.set(id, row);
  }
  syncingContainerSelection = true;
  table.clearSelection();
  for (const row of containerRows.value) {
    const id = String(row?.networkId ?? row?.proxyId ?? row?.id ?? '').trim();
    if (id && bindNetworkIds.has(id)) {
      table.toggleRowSelection(row, true, true);
    }
  }
  const mergedSelectedRows = allSelectedIds
    .map((id) => {
      if (currentContainerMap.has(id)) return currentContainerMap.get(id);
      if (previousSelectedMap.has(id)) return previousSelectedMap.get(id);
      const fallback = (res.records ?? []).find((item: any) => {
        const itemId = getIdFromRow(item, ['networkId', 'proxyId', 'id']);
        return itemId === id;
      });
      return fallback ? mapProxyRecord(fallback as Record<string, any>) : null;
    })
    .filter(Boolean);
  selectedContainerIds.value = allSelectedIds;
  selectedContainerRows.value = mergedSelectedRows.map((row) =>
    mapProxyRecord(row as Record<string, any>),
  );
  await nextTick();
  syncingContainerSelection = false;
}

function syncContainerSelection() {
  const table = containerTableRef.value;
  if (!table) return;
  const selectedIds = new Set(toIdList(selectedContainerRows.value, ['networkId', 'proxyId', 'id']));
  syncingContainerSelection = true;
  table.clearSelection();
  for (const row of displayContainerRows.value) {
    const id = String(row?.networkId ?? row?.proxyId ?? row?.id ?? '').trim();
    if (id && selectedIds.has(id)) {
      table.toggleRowSelection(row, true, true);
    }
  }
  nextTick(() => {
    syncingContainerSelection = false;
  });
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
  const currentPageIds = new Set(toIdList(currentPageRows, ['networkId', 'proxyId', 'id']));
  const remainRows = selectedContainerRows.value.filter((row) => {
    const id = String(row?.networkId ?? row?.proxyId ?? row?.id ?? '').trim();
    return id && !currentPageIds.has(id);
  });
  selectedContainerRows.value = [...remainRows, ...rows];
  selectedContainerIds.value = toIdList(selectedContainerRows.value, ['networkId', 'proxyId', 'id']);
  if (activeTab.value === 'assignContainers') {
    void syncUsersSelectionByNetworks(selectedContainerIds.value);
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

function getIdFromRow(row: any, keys: string[]): string {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

async function onSave() {
  const bindDirection = activeTab.value === 'assignContainers';
  const userIds = toIdList(selectedSystemUserRows.value, ['userId', 'id']);
  const networkIds = toIdList(selectedContainerRows.value, ['networkId', 'proxyId', 'id']);

  // 与社媒分配页一致：校验“当前左侧激活列表”必须有选择
  if (activeTab.value === 'assignContainers' && networkIds.length === 0) {
    ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
    return;
  }
  if (activeTab.value === 'assignSystemUsers' && userIds.length === 0) {
    ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
    return;
  }

  let delIds: string[] = [];
  if (activeTab.value === 'assignSystemUsers') {
    // 分配代理至系统用户：以 userIds 查询“已绑定代理”，delIds 传 networkId
    const relationRes = await getAllocationNetworkUserListApi({
      userIds,
      current: 1,
      size: 100000,
    });
    const defaultIds = (relationRes.records ?? [])
      .map((row: any) => String(row?.networkId ?? row?.proxyId ?? row?.id ?? '').trim())
      .filter((id): id is string => Boolean(id));
    const tempInfo = networkIds;
    delIds = defaultIds.filter((id) => !tempInfo.includes(id));
  } else {
    // 分配系统用户至代理：以 networkIds 查询“已绑定用户”，delIds 传 userId
    const relationRes = await getAllocationNetworkListApi({
      networkIds,
      current: 1,
      size: 100000,
    });
    const defaultIds = (relationRes.records ?? [])
      .map((row: any) => String(row?.userId ?? row?.id ?? '').trim())
      .filter((id): id is string => Boolean(id));
    const tempInfo = userIds;
    delIds = defaultIds.filter((id) => !tempInfo.includes(id));
  }
  const res = await allocationNetworkAllocateApi({
    userIds,
    networkIds,
    bindDirection,
    delIds,
  });
  if (res && successCode(res.code)) {
    ElMessage.success($t('systemManage.opSuccess'));
    selectedContainerRows.value = [];
    selectedSystemUserRows.value = [];
    selectedSystemUserIds.value = [];
    selectedContainerIds.value = [];
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
function resetContainers() {
  containerKeyword.value = '';
  searchContainers();
}
function searchSystemUsers() {
  systemUserShowSelectedOnly.value = false;
  systemUserPage.value = 1;
  void loadSystemUsers().then(() => {
    if (activeTab.value === 'assignContainers') {
      void syncUsersSelectionByNetworks(selectedContainerIds.value);
    }
  });
}
function resetSystemUsers() {
  systemUserKeyword.value = '';
  searchSystemUsers();
}

function onSystemUserOnlySelectedChange() {
  const snapshotIds = [...selectedSystemUserIds.value];
  const snapshotRows = [...selectedSystemUserRows.value];
  // 切换数据源会触发表格一次空 selection-change，先加锁避免把已选缓存清空
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
  <Page :title="$t('page.dashboard.proxyManage')">
    <div class="header-bar">
      <ElTabs v-model="activeTab" type="card" class="tabs" @tab-click="onTabChange">
        <ElTabPane
          :label="$t('systemManage.proxyManage.assignSystemUserToContainer')"
          name="assignContainers"
        />
        <ElTabPane
          :label="$t('systemManage.proxyManage.assignContainerToSystemUser')"
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
            :placeholder="$t('systemManage.proxyManage.searchPlaceholderContainer')"
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
          :row-key="(row) => String(row.networkId ?? row.proxyId ?? row.id ?? '')"
          :row-class-name="containerRowClassName"
          class="no-lines-table"
          height="420"
          @selection-change="onContainerSelect"
        >
          <ElTableColumn
            type="selection"
            width="48"
            :reserve-selection="true"
            :selectable="containerRowSelectable"
          />
          <ElTableColumn
            :label="$t('systemManage.proxyManage.colOwner')"
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
            prop="region"
            :label="$t('systemManage.proxyManage.colRegion')"
            min-width="120"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="ip"
            :label="$t('systemManage.proxyManage.colIp')"
            min-width="120"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="link"
            :label="$t('systemManage.proxyManage.colLink')"
            min-width="160"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="expireTime"
            :label="$t('systemManage.proxyManage.colExpireTime')"
            min-width="150"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="deviceGroup"
            :label="$t('systemManage.proxyManage.colDeviceGroup')"
            min-width="140"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="remark"
            :label="$t('systemManage.proxyManage.colRemark')"
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
            @size-change="
              (size) => {
                containerPageSize = size;
                containerPage = 1;
                loadContainers();
              }
            "
            @current-change="
              (page) => {
                containerPage = page;
                loadContainers();
              }
            "
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
            :placeholder="$t('systemManage.proxyManage.searchPlaceholderSystem')"
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
          :row-key="(row) => String(row.userId ?? row.id ?? '')"
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
            @size-change="
              (size) => {
                systemUserPageSize = size;
                systemUserPage = 1;
                loadSystemUsers();
              }
            "
            @current-change="
              (page) => {
                systemUserPage = page;
                loadSystemUsers();
              }
            "
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
