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
/** 跨搜索/分页保留完整勾选；勿仅用表格 selection（过滤后不可见行不在 selection 内） */
const selectedAccountRows = ref<any[]>([]);
const selectedUserRows = ref<any[]>([]);

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

/** 绑定关系在 store.checkInfo（左侧选人/选账号后接口写入）；不能与 selected*Ids 混用否则会丢「左侧驱动右侧勾选」 */
const boundAccountIds = computed(() => {
  const s = new Set<string>();
  for (const item of checkInfoList.value) {
    const id = getAccountKey(item);
    if (id) s.add(id);
  }
  return s;
});

const boundUserIds = computed(() => {
  const s = new Set<string>();
  for (const item of checkInfoList.value) {
    const id = getUserKey(item);
    if (id) s.add(id);
  }
  return s;
});

const displayUserRows = computed(() => {
  if (activeTab.value === 'assignUsers' && userShowSelectedOnly.value) {
    /** 仅展示：当前搜索结果 userRows ∩ store 绑定用户（仍为当前页的子集） */
    const want = boundUserIds.value;
    return userRows.value.filter((row) => want.has(getUserKey(row)));
  }
  return userRows.value;
});

const displayAccountRows = computed(() => {
  if (activeTab.value === 'assignAccounts' && accountShowSelectedOnly.value) {
    /** 仅展示：当前搜索结果 accountRows ∩ store 绑定账号 */
    const want = boundAccountIds.value;
    return accountRows.value.filter((row) => want.has(getAccountKey(row)));
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

/**
 * assignAccounts（对齐 proxyManage searchContainers(assignSystemUsers)）：
 * 搜索社媒列表后应按「左侧已选用户」重新拉绑定，不保留右侧刚才手动全选的 checkInfo。
 */
async function loadAccounts(opts: { resyncBindingsFromSelectedUsers?: boolean } = {}) {
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
      if (opts.resyncBindingsFromSelectedUsers) {
        await smStore.fetchAccountsByUsers(selectedUserIds.value);
        await nextTick();
        const list = checkInfoList.value;
        selectedAccountIds.value = list.map((r: any) => getAccountKey(r)).filter(Boolean);
        selectedAccountUserIds.value = [
          ...new Set(
            list.map((r: any) => String(r?.userId ?? '')).filter(Boolean),
          ),
        ];
      }
      syncAccountSelectionFromStore();
    } else {
      syncAccountSelection();
    }
  } finally {
    accountLoading.value = false;
  }
}

/**
 * assignUsers（对齐 proxyManage.searchSystemUsers(assignContainers)）：
 * - 搜右侧用户：**不清空**左侧已选账号；selectedAccountIds 保留，仅用接口刷新右侧用户勾选
 */
async function loadUsers(opts: { resyncBindingsFromSelectedAccounts?: boolean } = {}) {
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
      if (opts.resyncBindingsFromSelectedAccounts) {
        await smStore.fetchUsersByAccounts(selectedAccountIds.value);
        await nextTick();
        selectedUserIds.value = checkInfoList.value
          .map((r: any) => getUserKey(r))
          .filter(Boolean);
      }
      syncUserSelectionFromStore();
    } else {
      syncUserSelectionByIds();
    }
  } finally {
    userLoading.value = false;
  }
}

/** 双层 nextTick：晚到的 clearSelection 空选仍带 syncing 标志，避免误清 store（container 为单层） */
function finishSelectionSync(done: () => void) {
  nextTick(() => {
    nextTick(() => {
      done();
    });
  });
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
  finishSelectionSync(() => {
    syncingAccount = false;
  });
}

/**
 * assignAccounts Tab 左侧用户表：勾选只在 selectedUserIds（老项目该侧 isCheck=false，search 会清空 store，不记另一侧勾选）
 * 翻页后需按 ID 恢复当前页勾选
 */
function syncUserSelectionByIds() {
  const tb = userTableRef.value;
  if (!tb) return;
  syncingUser = true;
  tb.clearSelection();
  for (const row of userRows.value) {
    if (selectedUserIds.value.includes(getUserKey(row))) {
      tb.toggleRowSelection(row, true);
    }
  }
  finishSelectionSync(() => {
    syncingUser = false;
  });
}

/** assignAccounts：右侧勾选必须由 checkInfo（接口绑定）驱动；「仅展示已勾选」时再限制为当前 accountRows */
function syncAccountSelectionFromStore() {
  const tb = accountTableRef.value;
  if (!tb) return;
  syncingAccount = true;
  tb.clearSelection();
  const want = boundAccountIds.value;
  const rows =
    activeTab.value === 'assignAccounts' && accountShowSelectedOnly.value
      ? accountRows.value.filter((row) => want.has(getAccountKey(row)))
      : accountRows.value;
  for (const row of rows) {
    if (want.has(getAccountKey(row))) {
      tb.toggleRowSelection(row, true, true);
    }
  }
  finishSelectionSync(() => {
    syncingAccount = false;
  });
}

function syncUserSelectionFromStore() {
  const tb = userTableRef.value;
  if (!tb) return;
  syncingUser = true;
  tb.clearSelection();
  const want = boundUserIds.value;
  const rows =
    activeTab.value === 'assignUsers' && userShowSelectedOnly.value
      ? userRows.value.filter((row) => want.has(getUserKey(row)))
      : userRows.value;
  for (const row of rows) {
    if (want.has(getUserKey(row))) {
      tb.toggleRowSelection(row, true, true);
    }
  }
  finishSelectionSync(() => {
    syncingUser = false;
  });
}

async function onPickApp(id: string) {
  currentAppId.value = id;
  smStore.setCheckAppId(id);
  accountPage.current = 1;
  selectedAccountIds.value = [];
  selectedAccountUserIds.value = [];
  selectedAccountRows.value = [];
  selectedUserRows.value = [];
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
  const currentPageRows = displayAccountRows.value;
  const currentPageIds = new Set(
    currentPageRows.map((r) => getAccountKey(r)).filter(Boolean),
  );
  const remainRows = selectedAccountRows.value.filter((row) => {
    const id = getAccountKey(row);
    return id && !currentPageIds.has(id);
  });
  selectedAccountRows.value = [...remainRows, ...rows];
  selectedAccountIds.value = selectedAccountRows.value
    .map((r) => getAccountKey(r))
    .filter(Boolean);
  selectedAccountUserIds.value = [
    ...new Set(
      selectedAccountRows.value.map((r) => String(r?.userId ?? '')).filter(Boolean),
    ),
  ];
  if (activeTab.value === 'assignUsers') {
    /** 空选时由 store 直接清空，不请求 /accounts/users（保存后 clearSelection 会触发） */
    void smStore.fetchUsersByAccounts(selectedAccountIds.value);
  } else {
    smStore.setCheckInfo(selectedAccountRows.value);
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
  const currentPageRows = displayUserRows.value;
  const currentPageIds = new Set(
    currentPageRows.map((r) => getUserKey(r)).filter(Boolean),
  );
  const remainRows = selectedUserRows.value.filter((row) => {
    const id = getUserKey(row);
    return id && !currentPageIds.has(id);
  });
  selectedUserRows.value = [...remainRows, ...rows];
  selectedUserIds.value = selectedUserRows.value
    .map((r) => getUserKey(r))
    .filter(Boolean);
  if (activeTab.value === 'assignAccounts') {
    void smStore.fetchAccountsByUsers(selectedUserIds.value);
  } else {
    smStore.setCheckInfo(selectedUserRows.value);
  }
}

watch(
  () => smStore.checkInfo,
  () => {
    nextTick(() => {
      if (activeTab.value === 'assignUsers') {
        selectedUserRows.value = [...checkInfoList.value];
        selectedUserIds.value = selectedUserRows.value
          .map((r: any) => getUserKey(r))
          .filter(Boolean);
        syncUserSelectionFromStore();
      } else {
        selectedAccountRows.value = [...checkInfoList.value];
        selectedAccountIds.value = selectedAccountRows.value
          .map((r: any) => getAccountKey(r))
          .filter(Boolean);
        selectedAccountUserIds.value = [
          ...new Set(
            selectedAccountRows.value
              .map((r: any) => String(r?.userId ?? ''))
              .filter(Boolean),
          ),
        ];
        syncAccountSelectionFromStore();
      }
    });
  },
  { deep: true },
);

async function onTabChange() {
  accountTableRef.value?.clearSelection?.();
  userTableRef.value?.clearSelection?.();
  smStore.resetBindings();
  selectedAccountIds.value = [];
  selectedAccountUserIds.value = [];
  selectedUserIds.value = [];
  selectedAccountRows.value = [];
  selectedUserRows.value = [];
  accountKeyword.value = '';
  userKeyword.value = '';
  userShowSelectedOnly.value = false;
  accountShowSelectedOnly.value = false;
  accountPage.current = 1;
  userPage.current = 1;
  /** 等 Tab 切换后带 :key 的表格重挂，再拉数（对齐 proxy 切 Tab 全清） */
  await nextTick();
  void loadAccounts();
  void loadUsers();
}

/**
 * 与 social_media_web mixins + proxyManage 一致：
 * - Tab1 搜社媒：mixins isCheck=false 侧清空双侧关联 store
 * - Tab2 搜社媒：同 proxy——**保留左侧已选用户**，仅按绑定重绘右侧勾选（resyncBindingsFromSelectedUsers）
 */
function searchAccounts() {
  accountShowSelectedOnly.value = false;
  if (activeTab.value === 'assignUsers') {
    smStore.setCheckInfo([]);
    smStore.setCheckUserIds([]);
    selectedAccountIds.value = [];
    selectedAccountUserIds.value = [];
    selectedUserIds.value = [];
    selectedAccountRows.value = [];
    selectedUserRows.value = [];
  }
  accountPage.current = 1;
  void loadAccounts({
    resyncBindingsFromSelectedUsers: activeTab.value === 'assignAccounts',
  });
}

/**
 * Tab1 搜用户：同 proxy——**保留左侧已选社媒**，按绑定重绘右侧用户勾选
 * Tab2 搜用户：mixins isCheck=false 侧清空双侧关联 store
 */
function searchUsers() {
  userShowSelectedOnly.value = false;
  if (activeTab.value === 'assignAccounts') {
    smStore.setCheckInfo([]);
    smStore.setCheckUserIds([]);
    selectedUserIds.value = [];
    selectedAccountIds.value = [];
    selectedAccountUserIds.value = [];
    selectedAccountRows.value = [];
    selectedUserRows.value = [];
  }
  userPage.current = 1;
  void loadUsers({
    resyncBindingsFromSelectedAccounts: activeTab.value === 'assignUsers',
  });
}

function redoAccounts() {
  accountKeyword.value = '';
  searchAccounts();
}

function redoUsers() {
  userKeyword.value = '';
  searchUsers();
}

/** 与 social_media_web mixins.js watch.checkValue：勾选/取消「仅展示已勾选」时清空搜索关键字 */
function onAccountOnlySelectedChange() {
  if (activeTab.value === 'assignAccounts') {
    accountKeyword.value = '';
  }
  nextTick(() => {
    if (activeTab.value === 'assignAccounts') {
      syncAccountSelectionFromStore();
    }
  });
}

function onUserOnlySelectedChange() {
  if (activeTab.value === 'assignUsers') {
    userKeyword.value = '';
  }
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
  const accountIds = selectedAccountRows.value
    .map((r: any) => getAccountKey(r))
    .filter(Boolean);
  const userIds = selectedUserRows.value
    .map((r: any) => getUserKey(r))
    .filter(Boolean);

  if (activeTab.value === 'assignUsers') {
    if (!accountIds.length) {
      ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
      return;
    }
  } else if (!userIds.length) {
    ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
    return;
  }

  const isAssignUsers = activeTab.value === 'assignUsers';
  const defaultIds = smStore.defaultCheckInfo
    .map((el: any) => (isAssignUsers ? el.userId : el.accountId))
    .filter(Boolean);
  const tempInfo = isAssignUsers ? userIds : accountIds;
  const delIds = defaultIds.filter((id) => !tempInfo.includes(id));

  try {
    const res = await postSystemAccountsBandApi({
      appId: smStore.checkAppId || currentAppId.value,
      accountIds,
      userIds,
      delIds,
      bindDirection: isAssignUsers ? 0 : 1,
    });
    if (res && successCode(res.code)) {
      ElMessage.success($t('systemManage.opSuccess'));
      smStore.resetBindings();
      selectedAccountIds.value = [];
      selectedAccountUserIds.value = [];
      selectedUserIds.value = [];
      selectedAccountRows.value = [];
      selectedUserRows.value = [];
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
              :key="`sm-account-${activeTab}`"
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
              :key="`sm-user-${activeTab}`"
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
