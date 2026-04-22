<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Connection, Refresh, Search } from '@element-plus/icons-vue';
import {
  ElButton,
  ElIcon,
  ElInput,
  ElPagination,
  ElTabPane,
  ElTable,
  ElTableColumn,
  ElTabs,
} from 'element-plus';

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
const pageSize = ref(20);
const pageSizeOptions = [10, 20, 50, 100];

function onTabChange() {}
function onSave() {}
function searchContainers() {}
function resetContainers() {
  containerKeyword.value = '';
}
function searchSystemUsers() {}
function resetSystemUsers() {
  systemUserKeyword.value = '';
}
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

    <div class="panels">
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

        <ElTable :data="containerRows" class="no-lines-table" height="420">
          <ElTableColumn type="selection" width="48" />
          <ElTableColumn
            prop="owner"
            :label="$t('systemManage.proxyManage.owner')"
            min-width="120"
          />
          <ElTableColumn
            prop="serverName"
            :label="$t('systemManage.proxyManage.server')"
            min-width="140"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="deviceIp"
            :label="$t('systemManage.proxyManage.deviceIp')"
            min-width="120"
          />
          <ElTableColumn
            prop="deviceVersion"
            :label="$t('systemManage.proxyManage.deviceVersion')"
            min-width="140"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="deviceGroup"
            :label="$t('systemManage.proxyManage.deviceGroup')"
            min-width="140"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="remark"
            :label="$t('systemManage.proxyManage.remark')"
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
            :placeholder="$t('systemManage.proxyManage.searchPlaceholderSystem')"
            @keyup.enter="searchSystemUsers"
          />
          <ElButton :icon="Search" circle type="primary" @click="searchSystemUsers" />
          <ElButton :icon="Refresh" circle @click="resetSystemUsers" />
        </div>

        <ElTable :data="systemUserRows" class="no-lines-table" height="420">
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
              }
            "
            @current-change="
              (page) => {
                systemUserPage = page;
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
</style>
