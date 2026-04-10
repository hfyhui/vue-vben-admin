<script lang="ts" setup>
import { nextTick, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import { Connection, Refresh, Search } from '@element-plus/icons-vue';
import {
  ElAvatar,
  ElButton,
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
const accountKeyword = ref('');
const userKeyword = ref('');

const accountTableRef = ref();
const userTableRef = ref();

const selectedAccountIds = ref<string[]>([]);
const selectedUserIds = ref<string[]>([]);

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
      const firstId = records[0]?.id
      currentAppId.value = firstId;
      smStore.setCheckAppList(records);
      smStore.setCheckAppId(firstId);
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
    syncAccountSelection();
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
    syncUserSelectionFromStore();
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
    if (selectedAccountIds.value.includes(row.accountId)) {
      tb.toggleRowSelection(row, true);
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
  const want = new Set(smStore.checkInfo.map((u: any) => u.userId));
  for (const row of userRows.value) {
    if (want.has(row.userId)) {
      tb.toggleRowSelection(row, true);
    }
  }
  nextTick(() => {
    syncingUser = false;
  });
}

function onPickApp(id: string) {
  currentAppId.value = id;
  smStore.setCheckAppId(id);
  accountPage.current = 1;
  selectedAccountIds.value = [];
  smStore.resetBindings();
  loadAccounts();
  loadUsers();
}

function onAccountSelect(rows: any[]) {
  if (syncingAccount) return;
  selectedAccountIds.value = rows.map((r) => r.accountId);
  if (activeTab.value === 'assignUsers') {
    void smStore.fetchUsersByAccounts(selectedAccountIds.value);
  } else {
    smStore.setCheckInfo(rows);
  }
}

function onUserSelect(rows: any[]) {
  if (syncingUser) return;
  selectedUserIds.value = rows.map((r) => r.userId);
  if (activeTab.value === 'assignAccounts') {
    void smStore.fetchAccountsByUsers(selectedUserIds.value);
  } else {
    smStore.setCheckInfo(rows);
  }
}

watch(
  () => smStore.checkInfo,
  () => {
    nextTick(() => syncUserSelectionFromStore());
  },
  { deep: true },
);

function onTabChange() {
  smStore.resetBindings();
  selectedAccountIds.value = [];
  selectedUserIds.value = [];
  accountPage.current = 1;
  userPage.current = 1;
  loadAccounts();
  loadUsers();
}

function searchAccounts() {
  accountPage.current = 1;
  loadAccounts();
}

function searchUsers() {
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

async function saveBind() {
  const accountRowsSel = accountTableRef.value?.getSelectionRows?.() ?? [];
  const userRowsSel = userTableRef.value?.getSelectionRows?.() ?? [];
  const accountIds = accountRowsSel.map((r: any) => r.accountId);
  const userIds = userRowsSel.map((r: any) => r.userId);

  if (activeTab.value === 'assignUsers') {
    if (!userIds.length) {
      ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
      return;
    }
  } else if (!accountIds.length) {
    ElMessage.warning($t('systemManage.socialMediaAccount.pleaseSelectLeftList'));
    return;
  }

  const defaultIds = smStore.defaultCheckInfo
    .map((el: any) => String(el.accountId ?? el.userId ?? ''))
    .filter(Boolean);

  const tempInfo =
    activeTab.value === 'assignUsers' ? accountIds : userIds;
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
            <ElInput
              v-model="accountKeyword"
              clearable
              :placeholder="$t('systemManage.socialMediaAccount.searchPlaceholderSocial')"
              @keyup.enter="searchAccounts"
            />
            <ElButton :icon="Search" circle type="primary" @click="searchAccounts" />
            <ElButton :icon="Refresh" circle @click="redoAccounts" />
          </div>

          <div class="table-scroll">
            <ElTable
              ref="accountTableRef"
              v-loading="accountLoading"
              :data="accountRows"
              row-key="accountId"
              class="no-lines-table"
              height="100%"
              @selection-change="onAccountSelect"
            >
            <ElTableColumn type="selection" width="48" />
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

          <div class="pager">
            <ElPagination
              background
              small
              layout="total, prev, pager, next"
              :total="accountTotal"
              :page-size="accountPage.size"
              :current-page="accountPage.current"
              @current-change="
                (p: number) => {
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
            <ElInput
              v-model="userKeyword"
              clearable
              :placeholder="$t('systemManage.socialMediaAccount.searchPlaceholderSystem')"
              @keyup.enter="searchUsers"
            />
            <ElButton :icon="Search" circle type="primary" @click="searchUsers" />
            <ElButton :icon="Refresh" circle @click="redoUsers" />
          </div>

          <div class="table-scroll">
            <ElTable
              ref="userTableRef"
              v-loading="userLoading"
              :data="userRows"
              row-key="userId"
              class="no-lines-table"
              height="100%"
              @selection-change="onUserSelect"
            >
            <ElTableColumn type="selection" width="48" />
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

          <div class="pager">
            <ElPagination
              background
              small
              layout="total, prev, pager, next"
              :total="userTotal"
              :page-size="userPage.size"
              :current-page="userPage.current"
              @current-change="
                (p: number) => {
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
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.table-toolbar .el-input {
  flex: 1;
  min-width: 160px;
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
}
.pager :deep(.el-pagination.is-background .btn-next),
.pager :deep(.el-pagination.is-background .btn-prev),
.pager :deep(.el-pagination.is-background .el-pager li) {
  background-color: var(--el-fill-color);
}
</style>
