<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import { Connection, Refresh, Search } from '@element-plus/icons-vue';
import {
  ElAvatar,
  ElButton,
  ElCheckbox,
  ElIcon,
  ElInput,
  ElMessage,
  ElPagination,
  ElTabPane,
  ElTable,
  ElTableColumn,
  ElTabs,
  ElTooltip,
} from 'element-plus';

import { getApplicationPageApi } from '#/api/core/application';
import {
  postSystemAccountsBandApi,
  postSystemAccountsPageApi,
  postSystemAccountsUsersPageApi,
} from '#/api/core/social-system-accounts';
import { $t } from '#/locales';
import { useSocialMediaAccountStore } from '#/store';
import { formatAssetImageUrl } from '#/utils/asset-url';

const smStore = useSocialMediaAccountStore();

const activeTab = ref<'assignUsers' | 'assignAccounts'>('assignUsers');
const apps = ref<any[]>([]);
const currentAppId = ref('');

const accountLoading = ref(false);
const userLoading = ref(false);
const accountRows = ref<any[]>([]);
const userRows = ref<any[]>([]);
const accountTotal = ref(0);
const userTotal = ref(0);
const accountPage = reactive({ current: 1, size: 100 });
const userPage = reactive({ current: 1, size: 100 });
const pageSizeOptions = [10, 20, 50, 100];
const accountKeyword = ref('');
const userKeyword = ref('');

const accountTableRef = ref();
const userTableRef = ref();

const selectedAccountIds = ref<string[]>([]);
const selectedUserIds = ref<string[]>([]);
const selectedAccountUserIds = ref<string[]>([]);

/** 与参考项目一致：Tab1 在系统用户表、Tab2 在社媒账号表展示「仅展示已勾选」 */
const userShowSelectedOnly = ref(false);
const accountShowSelectedOnly = ref(false);

function getAccountKey(row: any) {
  return String(row?.accountId ?? row?.id ?? '');
}

function getUserKey(row: any) {
  return String(row?.userId ?? row?.id ?? '');
}

const checkInfoList = computed<any[]>(() =>
  Array.isArray(smStore.checkInfo) ? smStore.checkInfo : [],
);

const displayUserRows = computed(() => {
  if (activeTab.value === 'assignUsers' && userShowSelectedOnly.value) {
    return [...checkInfoList.value];
  }
  return userRows.value;
});

const displayAccountRows = computed(() => {
  if (activeTab.value === 'assignAccounts' && accountShowSelectedOnly.value) {
    return [...checkInfoList.value];
  }
  return accountRows.value;
});

/**
 * 与 social_media_web 一致：
 * - system/index 用户表：仅当左侧选中账号对应唯一 userId 时，禁用该用户行（checkUserIds.includes）
 * - social/index 社媒表：仅当左侧选中用户唯一时，禁用 userId 与之匹配的账号行
 * 不可用整份 checkInfo 列表做锁定，否则会把接口返回的其它行也置灰。
 */
let syncingAccount = false;
let syncingUser = false;

function successCode(code: number) {
  return code === 200 || code === 100000;
}

async function loadApps() {
  try {
    const res = await getApplicationPageApi({
      current: 1,
      size: 10000,
      applicationStatus: 0,
    });
    if (res?.code === 200 || res?.code === 100000) {
      const records = res.data?.records ?? [];
      apps.value = records;
      const firstId = records[0]?.id ?? '';
      currentAppId.value = firstId;
      smStore.setCheckAppList(records);
      if (firstId) smStore.setCheckAppId(firstId);
    }
  } catch {
    apps.value = [];
  }
}

async function loadAccounts() {
  if (!currentAppId.value) {
    accountRows.value = [];
    return;
  }
  accountLoading.value = true;
  try {
    const res = await postSystemAccountsPageApi({
      current: accountPage.current,
      size: accountPage.size,
      appId: currentAppId.value,
      keyword: accountKeyword.value || undefined,
    });
    if (res && successCode(res.code)) {
      accountRows.value = res.data?.records ?? [];
      accountTotal.value = res.data?.total ?? 0;
    }
    await nextTick();
    if (activeTab.value === 'assignAccounts') {
      syncAccountSelectionFromStore();
    } else {
      syncAccountSelection();
    }
  } finally {
    accountLoading.value = false;
  }
}

async function loadUsers() {
  userLoading.value = true;
  try {
    const res = await postSystemAccountsUsersPageApi({
      current: userPage.current,
      size: userPage.size,
      keyword: userKeyword.value || undefined,
    });
    if (res && successCode(res.code)) {
      userRows.value = res.data?.records ?? [];
      userTotal.value = res.data?.total ?? 0;
    }
    await nextTick();
    if (activeTab.value === 'assignUsers') {
      syncUserSelectionFromStore();
    }
  } finally {
    userLoading.value = false;
  }
}

function syncAccountSelection() {
  const tb = accountTableRef.value;
  if (!tb) return;
  syncingAccount = true;
  tb.clearSelection();
  for (const row of accountRows.value) {
    if (selectedAccountIds.value.includes(getAccountKey(row))) {
      tb.toggleRowSelection(row, true);
    }
  }
  nextTick(() => {
    syncingAccount = false;
  });
}

/** assignAccounts：checkInfo 为账号列表，与右侧账号表对齐 */
function syncAccountSelectionFromStore() {
  const tb = accountTableRef.value;
  if (!tb) return;
  syncingAccount = true;
  tb.clearSelection();
  const want = new Set(checkInfoList.value.map((a: any) => getAccountKey(a)));
  const rows =
    activeTab.value === 'assignAccounts' && accountShowSelectedOnly.value
      ? checkInfoList.value
      : accountRows.value;
  for (const row of rows) {
    if (want.has(getAccountKey(row))) {
      // 对应社媒项目：联动回填时即使行已禁用，也要保持“已勾选 + 置灰”
      tb.toggleRowSelection(row, true, true);
    }
  }
  nextTick(() => {
    syncingAccount = false;
  });
}

function syncUserSelectionFromStore() {
  const tb = userTableRef.value;
  if (!tb) return;
  syncingUser = true;
  tb.clearSelection();
  const want = new Set(checkInfoList.value.map((u: any) => getUserKey(u)));
  const rows =
    activeTab.value === 'assignUsers' && userShowSelectedOnly.value
      ? checkInfoList.value
      : userRows.value;
  for (const row of rows) {
    if (want.has(getUserKey(row))) {
      // 对应社媒项目：联动回填时即使行已禁用，也要保持“已勾选 + 置灰”
      tb.toggleRowSelection(row, true, true);
    }
  }
  nextTick(() => {
    syncingUser = false;
  });
}

async function onPickApp(id: string) {
  currentAppId.value = id;
  smStore.setCheckAppId(id);
  accountPage.current = 1;
  selectedAccountIds.value = [];
  selectedAccountUserIds.value = [];
  userShowSelectedOnly.value = false;
  accountShowSelectedOnly.value = false;
  smStore.resetBindings();
  if (activeTab.value === 'assignAccounts') {
    await smStore.fetchAccountsByUsers(selectedUserIds.value);
    loadAccounts();
  } else {
    await loadUsers();
    loadAccounts();
  }
}

function onAccountSelect(rows: any[]) {
  if (syncingAccount) return;
  if (
    activeTab.value === 'assignAccounts' &&
    accountShowSelectedOnly.value &&
    rows.length === 0 &&
    smStore.checkInfo.length > 0
  ) {
    return;
  }
  selectedAccountIds.value = rows.map((r) => getAccountKey(r)).filter(Boolean);
  selectedAccountUserIds.value = [
    ...new Set(rows.map((r) => String(r?.userId ?? '')).filter(Boolean)),
  ];
  if (activeTab.value === 'assignUsers') {
    /** 空选时由 store 直接清空，不请求 /accounts/users（保存后 clearSelection 会触发） */
    void smStore.fetchUsersByAccounts(selectedAccountIds.value);
  } else {
    smStore.setCheckInfo(rows);
  }
}

function onUserSelect(rows: any[]) {
  if (syncingUser) return;
  if (
    activeTab.value === 'assignUsers' &&
    userShowSelectedOnly.value &&
    rows.length === 0 &&
    smStore.checkInfo.length > 0
  ) {
    return;
  }
  selectedUserIds.value = rows.map((r) => getUserKey(r)).filter(Boolean);
  if (activeTab.value === 'assignAccounts') {
    void smStore.fetchAccountsByUsers(selectedUserIds.value);
  } else {
    smStore.setCheckInfo(rows);
  }
}

watch(
  () => smStore.checkInfo,
  () => {
    nextTick(() => {
      if (activeTab.value === 'assignUsers') {
        syncUserSelectionFromStore();
      } else {
        syncAccountSelectionFromStore();
      }
    });
  },
  { deep: true },
);

function onTabChange() {
  accountTableRef.value?.clearSelection?.();
  userTableRef.value?.clearSelection?.();
  smStore.resetBindings();
  selectedAccountIds.value = [];
  selectedAccountUserIds.value = [];
  selectedUserIds.value = [];
  accountKeyword.value = '';
  userKeyword.value = '';
  userShowSelectedOnly.value = false;
  accountShowSelectedOnly.value = false;
  accountPage.current = 1;
  userPage.current = 1;
  loadAccounts();
  loadUsers();
}

function searchAccounts() {
  accountShowSelectedOnly.value = false;
  accountPage.current = 1;
  loadAccounts();
}

function searchUsers() {
  userShowSelectedOnly.value = false;
  userPage.current = 1;
  loadUsers();
}

function redoAccounts() {
  accountKeyword.value = '';
  searchAccounts();
}

function redoUsers() {
  userKeyword.value = '';
  searchUsers();
}

function onAccountOnlySelectedChange() {
  nextTick(() => {
    if (activeTab.value === 'assignAccounts') {
      syncAccountSelectionFromStore();
    }
  });
}

function onUserOnlySelectedChange() {
  nextTick(() => {
    if (activeTab.value === 'assignUsers') {
      syncUserSelectionFromStore();
    }
  });
}

function isDisabledUser(row: any) {
  return row?.status == 1;
}

function isLockFlagTrue(row: any) {
  return row?.isLock === true;
}

function isLeftUserTable() {
  return activeTab.value === 'assignAccounts';
}

function isLockedAccount(row: any) {
  if (isLockFlagTrue(row)) {
    return true;
  }
  if (activeTab.value !== 'assignAccounts' || selectedUserIds.value.length !== 1) {
    return false;
  }
  const sel = selectedUserIds.value[0];
  return row?.userId == sel;
}

function isLockedUser(row: any) {
  if (isLeftUserTable() && isLockFlagTrue(row)) {
    return true;
  }
  if (activeTab.value !== 'assignUsers' || selectedAccountUserIds.value.length !== 1) {
    return false;
  }
  return row?.userId == selectedAccountUserIds.value[0];
}

function accountSelectable(row: any) {
  return !isLockedAccount(row);
}

function userSelectable(row: any) {
  return !isDisabledUser(row) && !isLockedUser(row);
}

function accountRowClassName({ row }: { row: any }) {
  return isLockedAccount(row) ? 'locked-row' : '';
}

function userRowClassName({ row }: { row: any }) {
  return isDisabledUser(row) || isLockedUser(row) ? 'locked-row' : '';
}

async function saveBind() {
  const accountRowsSel = accountTableRef.value?.getSelectionRows?.() ?? [];
  const userRowsSel = userTableRef.value?.getSelectionRows?.() ?? [];
  const accountIds = accountRowsSel.map((r: any) => r.accountId);
  const userIds = userRowsSel.map((r: any) => r.userId);

  /**
   * 与 social_media_web SocialMediaAccount/index.vue saveEvent 一致：
   * - assignUsers（socialRef）：左侧为社媒账号表，须先选账号
   * - assignAccounts（systemRef）：row-reverse 后左侧为系统用户表，须先选用户
   * 仅选另一侧时提示「当前激活列表」
   */
  if (activeTab.value === 'assignUsers') {
    if (!accountIds.length) {
      ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
      return;
    }
  } else if (!userIds.length) {
    ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
    return;
  }

  const defaultIds = smStore.defaultCheckInfo
    .map((el: any) => String(el.accountId ?? el.userId ?? ''))
    .filter(Boolean);

  /** delIds：对照另一侧当前勾选（参考 tempInfo = data[activeValue == systemRef ? socialRef : systemRef]） */
  const tempInfo =
    activeTab.value === 'assignUsers' ? userIds : accountIds;
  const delIds = defaultIds.filter((id) => !tempInfo.includes(id));

  try {
    const res = await postSystemAccountsBandApi({
      appId: smStore.checkAppId || currentAppId.value,
      accountIds,
      userIds,
      delIds,
      bindDirection: activeTab.value === 'assignUsers' ? 0 : 1,
    });
    if (res && successCode(res.code)) {
      ElMessage.success($t('systemManage.opSuccess'));
      smStore.resetBindings();
      selectedAccountIds.value = [];
      selectedAccountUserIds.value = [];
      selectedUserIds.value = [];
      accountTableRef.value?.clearSelection?.();
      userTableRef.value?.clearSelection?.();
      userShowSelectedOnly.value = false;
      accountShowSelectedOnly.value = false;
      loadAccounts();
      loadUsers();
    }
  } catch {
    /* client toast */
  }
}

void loadApps().then(() => {
  void loadAccounts();
  void loadUsers();
});
</script>

<template>
  <Page :title="$t('page.dashboard.socialMediaAccount')">
    <div class="header-bar">
      <ElTabs v-model="activeTab" type="card" class="tabs" @tab-click="onTabChange">
        <ElTabPane
          :label="$t('systemManage.socialMediaAccount.assignSystemUserToAccount')"
          name="assignUsers"
        />
        <ElTabPane
          :label="$t('systemManage.socialMediaAccount.assignAccountToSystemUser')"
          name="assignAccounts"
        />
      </ElTabs>
      <ElButton class="save-btn" type="primary" @click="saveBind">
        {{ $t('common.save') }}
      </ElButton>
    </div>

    <div
      class="panels"
      :class="{ row_reverse: activeTab === 'assignAccounts' }"
    >
      <section class="panel">
        <div class="panel-inner">
          <div class="app-bar">
            <ElTooltip v-for="app in apps" :key="app.id" :content="app.applicationName">
              <div
                class="app-icon"
                :class="{ active: app.id === currentAppId }"
                @click="onPickApp(app.id)"
              >
                <ElAvatar v-if="app.logoPath" :size="36" :src="formatAssetImageUrl(app.logoPath)" />
                <ElAvatar v-else :size="36">{{ (app.applicationName || '?').slice(0, 1) }}</ElAvatar>
              </div>
            </ElTooltip>
          </div>

          <div class="table-toolbar">
            <div class="table-toolbar-row">
              <ElInput
                v-model="accountKeyword"
                clearable
                :placeholder="$t('systemManage.socialMediaAccount.searchPlaceholderSocial')"
                @keyup.enter="searchAccounts"
              />
              <ElButton :icon="Search" circle type="primary" @click="searchAccounts" />
              <ElButton :icon="Refresh" circle @click="redoAccounts" />
            </div>
            <div v-show="activeTab === 'assignAccounts'" class="only-selected-wrap">
              <ElCheckbox
                v-model="accountShowSelectedOnly"
                @change="onAccountOnlySelectedChange"
              >
                {{ $t('systemManage.socialMediaAccount.onlyShowSelected') }}
              </ElCheckbox>
            </div>
          </div>

          <div class="table-scroll">
            <ElTable
              ref="accountTableRef"
              v-loading="accountLoading"
              :data="displayAccountRows"
              row-key="accountId"
              :row-class-name="accountRowClassName"
              class="no-lines-table"
              height="100%"
              @selection-change="onAccountSelect"
            >
            <ElTableColumn
              type="selection"
              width="48"
              :reserve-selection="true"
              :selectable="accountSelectable"
            />
            <ElTableColumn
              prop="owner"
              :label="$t('systemManage.socialMediaAccount.owner')"
              min-width="100"
            />
            <ElTableColumn
              prop="account"
              :label="$t('systemManage.socialMediaAccount.account')"
              min-width="120"
              show-overflow-tooltip
            />
            <ElTableColumn
              prop="nickName"
              :label="$t('systemManage.socialMediaAccount.nickname')"
              min-width="100"
            />
            <ElTableColumn
              prop="email"
              :label="$t('systemManage.socialMediaAccount.email')"
              min-width="140"
              show-overflow-tooltip
            />
            <ElTableColumn
              prop="group"
              :label="$t('systemManage.socialMediaAccount.group')"
              min-width="120"
              show-overflow-tooltip
            />
            </ElTable>
          </div>

          <div
            v-show="!(activeTab === 'assignAccounts' && accountShowSelectedOnly)"
            class="pager"
          >
            <ElPagination
              background
              size="small"
              layout="total, sizes, prev, pager, next"
              :total="accountTotal"
              :page-sizes="pageSizeOptions"
              :page-size="accountPage.size"
              :current-page="accountPage.current"
              @size-change="
                (s) => {
                  accountPage.size = s;
                  accountPage.current = 1;
                  loadAccounts();
                }
              "
              @current-change="
                (p) => {
                  accountPage.current = p;
                  loadAccounts();
                }
              "
            />
          </div>
        </div>
      </section>

      <div class="link-icon" aria-hidden="true">
        <ElIcon :size="36" color="var(--el-color-primary)"><Connection /></ElIcon>
      </div>

      <section class="panel panel-narrow">
        <div class="panel-inner">
          <div class="panel-sync-spacer" aria-hidden="true" />
          <div class="table-toolbar">
            <div class="table-toolbar-row">
              <ElInput
                v-model="userKeyword"
                clearable
                :placeholder="$t('systemManage.socialMediaAccount.searchPlaceholderSystem')"
                @keyup.enter="searchUsers"
              />
              <ElButton :icon="Search" circle type="primary" @click="searchUsers" />
              <ElButton :icon="Refresh" circle @click="redoUsers" />
            </div>
            <div v-show="activeTab === 'assignUsers'" class="only-selected-wrap">
              <ElCheckbox v-model="userShowSelectedOnly" @change="onUserOnlySelectedChange">
                {{ $t('systemManage.socialMediaAccount.onlyShowSelected') }}
              </ElCheckbox>
            </div>
          </div>

          <div class="table-scroll">
            <ElTable
              ref="userTableRef"
              v-loading="userLoading"
              :data="displayUserRows"
              row-key="userId"
              :row-class-name="userRowClassName"
              class="no-lines-table"
              height="100%"
              @selection-change="onUserSelect"
            >
            <ElTableColumn
              type="selection"
              width="48"
              :reserve-selection="true"
              :selectable="userSelectable"
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
          </div>

          <div
            v-show="!(activeTab === 'assignUsers' && userShowSelectedOnly)"
            class="pager"
          >
            <ElPagination
              background
              size="small"
              layout="total, sizes, prev, pager, next"
              :total="userTotal"
              :page-sizes="pageSizeOptions"
              :page-size="userPage.size"
              :current-page="userPage.current"
              @size-change="
                (s) => {
                  userPage.size = s;
                  userPage.current = 1;
                  loadUsers();
                }
              "
              @current-change="
                (p) => {
                  userPage.current = p;
                  loadUsers();
                }
              "
            />
          </div>
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
  min-height: 0;
  padding: 12px 16px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}
.panel-narrow {
  flex: 0 0 32%;
  max-width: 520px;
}
.panel-inner {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}
.panel-sync-spacer {
  flex-shrink: 0;
  min-height: 44px;
  margin-bottom: 12px;
}
.app-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  min-height: 44px;
  margin-bottom: 12px;
  flex-shrink: 0;
}
.app-icon {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
}
.app-icon.active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 25%, transparent);
}
.table-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.table-toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.table-toolbar-row .el-input {
  flex: 1;
  min-width: 160px;
}
.only-selected-wrap {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
.table-scroll {
  flex-shrink: 0;
  width: 100%;
  height: 420px;
  overflow: hidden;
}
.link-icon {
  align-self: center;
  padding: 0 4px;
}
.pager {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  margin-top: 8px;
  background: transparent;
}
.pager :deep(.el-pagination) {
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: var(--el-text-color-regular);
  --el-pagination-button-color: var(--el-text-color-regular);
  --el-pagination-button-disabled-color: var(--el-text-color-disabled);
  --el-pagination-button-disabled-bg-color: var(--el-fill-color);
}
.pager :deep(.el-pagination.is-background .btn-next),
.pager :deep(.el-pagination.is-background .btn-prev),
.pager :deep(.el-pagination.is-background .el-pager li) {
  background-color: var(--el-fill-color);
  color: var(--el-text-color-regular);
  border: 1px solid var(--el-border-color);
}
.pager :deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: color-mix(in srgb, var(--el-color-primary) 18%, var(--el-fill-color));
  color: var(--el-color-primary);
  border-color: color-mix(in srgb, var(--el-color-primary) 35%, var(--el-border-color));
}
.pager :deep(.el-pagination .el-pagination__sizes .el-select .el-input__wrapper) {
  background-color: var(--el-fill-color);
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
}
.no-lines-table :deep(tr.locked-row td) {
  background: color-mix(in srgb, var(--el-fill-color-light) 45%, transparent);
  color: color-mix(in srgb, var(--el-text-color-secondary) 78%, var(--el-text-color-primary));
}
</style>
