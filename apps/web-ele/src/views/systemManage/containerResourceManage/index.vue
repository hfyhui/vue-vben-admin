<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import type { ElTable as ElTableType } from 'element-plus';

import { postSystemAccountsUsersPageApi } from '#/api/core/social-system-accounts';
import { $t } from '#/locales';

const activeTab = ref<'assignContainers' | 'assignSystemUsers'>('assignContainers');

const containerKeyword = ref('');
const systemUserKeyword = ref('');
const systemUserRows = ref<any[]>([]);
const containerTotal = ref(0);
const systemUserTotal = ref(0);
const containerPage = ref(1);
const systemUserPage = ref(1);
const pageSize = ref(20);
const pageSizeOptions = [10, 20, 50, 100];

const containerTableRef = ref<InstanceType<typeof ElTableType>>();
const systemUserTableRef = ref<InstanceType<typeof ElTableType>>();
const systemUserLoading = ref(false);

function getOwnerList(row: { owners?: string[] } | null | undefined): string[] {
  if (!row?.owners?.length) return [];
  return row.owners.map((x) => String(x).trim()).filter(Boolean);
}

function onTabChange() {
  containerTableRef.value?.clearSelection();
  systemUserTableRef.value?.clearSelection();
  void loadSystemUsers();
}
function onSave() {}
function searchContainers() {}
function resetContainers() {
  containerKeyword.value = '';
}
function successCode(code: number) {
  return code === 200 || code === 100000;
}

async function loadSystemUsers() {
  systemUserLoading.value = true;
  try {
    const res = await postSystemAccountsUsersPageApi({
      current: systemUserPage.value,
      size: pageSize.value,
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

function searchSystemUsers() {
  systemUserPage.value = 1;
  void loadSystemUsers();
}
function resetSystemUsers() {
  systemUserKeyword.value = '';
  systemUserPage.value = 1;
  void loadSystemUsers();
}

onMounted(() => {
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

        <ElTable
          ref="containerTableRef"
          :data="containerRows"
          class="no-lines-table"
          height="420"
        >
          <ElTableColumn type="selection" width="48" />
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
            prop="serverName"
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
            prop="deviceGroup"
            :label="$t('systemManage.containerResourceManage.colDeviceGroup')"
            min-width="140"
            show-overflow-tooltip
          />
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
            :page-size="pageSize"
            :current-page="containerPage"
            @size-change="
              (size) => {
                pageSize = size;
                containerPage = 1;
              }
            "
            @current-change="
              (page) => {
                containerPage = page;
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
            :placeholder="$t('systemManage.containerResourceManage.searchPlaceholderSystem')"
            @keyup.enter="searchSystemUsers"
          />
          <ElButton :icon="Search" circle type="primary" @click="searchSystemUsers" />
          <ElButton :icon="Refresh" circle @click="resetSystemUsers" />
        </div>

        <ElTable
          ref="systemUserTableRef"
          v-loading="systemUserLoading"
          :data="systemUserRows"
          :row-key="(row) => String(row.userId ?? row.id ?? '')"
          class="no-lines-table"
          height="420"
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

        <div class="pager">
          <ElPagination
            background
            size="small"
            layout="total, sizes, prev, pager, next"
            :total="systemUserTotal"
            :page-sizes="pageSizeOptions"
            :page-size="pageSize"
            :current-page="systemUserPage"
            @size-change="
              (size) => {
                pageSize = size;
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
</style>
