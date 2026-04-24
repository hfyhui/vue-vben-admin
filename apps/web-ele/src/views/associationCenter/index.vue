<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElMessage, ElMessageBox } from 'element-plus';
import { TopRight } from '@element-plus/icons-vue';

import {
  checkAccountDeviceApi,
  enableAssetApi,
  assetUserAllocationApi,
  getAssetGroupApi,
  getAssetSummaryApi,
  resetContainerApi,
  reverseQueryAssetApi,
  type DeviceEnableItem,
} from '#/api/core/asset';
import { postSystemAccountsUsersPageApi } from '#/api/core/social-system-accounts';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

import StatsOverview from './components/StatsOverview.vue';
import AccountBoard from './components/AccountBoard.vue';
import ProxyBoard from './components/ProxyBoard.vue';
import DeviceBoard from './components/DeviceBoard.vue';

const router = useRouter();
const accountBoardRef = ref<InstanceType<typeof AccountBoard> | null>(null);
const proxyBoardRef = ref<InstanceType<typeof ProxyBoard> | null>(null);
const deviceBoardRef = ref<InstanceType<typeof DeviceBoard> | null>(null);

type OverviewStatRow = { key: string; current: number; total: number };

function toSafeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

const overviewStats = ref<OverviewStatRow[]>([
  { key: 'containerPool', current: 0, total: 0 },
  { key: 'accountPool', current: 0, total: 0 },
  { key: 'proxyPool', current: 0, total: 0 },
  { key: 'userCount', current: 0, total: 0 },
]);
const sharedGroupOptions = ref<Array<{ id: string; suiteName: string }>>([]);
const sharedSortOptions = ref<Array<{ label: string; value: string }>>([]);
const assetEnumsStore = useAssetEnumsStore();
const userAllocateDialogVisible = ref(false);
const userAllocateLoading = ref(false);
const userAllocateSaving = ref(false);
const userTableRef = ref<any>(null);
const userList = ref<any[]>([]);
const userSelection = ref<any[]>([]);
const userPagination = reactive({
  current: 1,
  size: 20,
  total: 0,
});
const userQuery = reactive({
  keyword: '',
});

/** 与后端 POST /asset/check/account-device 约定：需二次确认后方可继续绑定 */
const ACCOUNT_DEVICE_CHECK_NEED_CONFIRM_CODE = 500511;

async function loadAssetSummary() {
  try {
    const response = await getAssetSummaryApi();
    const summary = response?.data ?? (response as any) ?? {};
    overviewStats.value = [
      {
        key: 'containerPool',
        current: toSafeNumber(summary.deviceUsedNum),
        total: toSafeNumber(summary.deviceTotalNum),
      },
      {
        key: 'accountPool',
        current: toSafeNumber(summary.accountUsedNum),
        total: toSafeNumber(summary.accountTotalNum),
      },
      {
        key: 'proxyPool',
        current: toSafeNumber(summary.proxyUsedNum),
        total: toSafeNumber(summary.proxyTotalNum),
      },
      {
        key: 'userCount',
        current: toSafeNumber(summary.userUsedNum),
        total: toSafeNumber(summary.userTotalNum),
      },
    ];
  } catch (error) {
    console.error('[associationCenter] 获取汇总信息失败:', error);
  }
}

async function loadGroupOptions() {
  try {
    const response = await getAssetGroupApi();
    const groups = Array.isArray(response?.data) ? response.data : [];
    sharedGroupOptions.value = groups
  } catch (error) {
    console.error('[associationCenter] 获取分组失败:', error);
  }
}

async function loadSortOptions() {
  try {
    sharedSortOptions.value = await assetEnumsStore.getEnumOptionsAsync(
      'ACCOUNT_ORDER',
    );
  } catch (error) {
    console.error('[associationCenter] 获取排序枚举失败:', error);
    sharedSortOptions.value = [];
  }
}

onMounted(() => {
  loadAssetSummary();
  loadGroupOptions();
  loadSortOptions();
});

function onViewSwitch() {
  deviceBoardRef.value?.toggleViewMode?.();
}

async function onDeviceBoardRefreshSummary() {
  await loadAssetSummary();
}

async function onDeviceBoardRefreshProxyList() {
  await proxyBoardRef.value?.refreshProxyList?.();
}

async function confirmAccountDeviceCheckWarning(msg: string | undefined) {
  try {
    await ElMessageBox.confirm(
      msg || $t('associationCenter.checkAccountDeviceNeedConfirmMessage'),
      $t('associationCenter.checkAccountDeviceNeedConfirmTitle'),
      {
        type: 'warning',
        confirmButtonText: $t('associationCenter.confirmButtonText'),
        cancelButtonText: $t('associationCenter.cancelButtonText'),
      },
    );
    return true;
  } catch {
    return false;
  }
}

/** 拖拽账号/代理到容器前：校验账号-容器、代理-容器关系 */
async function checkDropDeviceEnables(deviceEnables: DeviceEnableItem[]) {
  try {
    const checkResponse = await checkAccountDeviceApi({ deviceEnables });
    if (checkResponse?.code === 100000) {
      return true;
    }
    if (Number(checkResponse?.code) === ACCOUNT_DEVICE_CHECK_NEED_CONFIRM_CODE) {
      return confirmAccountDeviceCheckWarning(checkResponse?.msg);
    }
    if (!checkResponse?.msg) {
      ElMessage.error($t('associationCenter.dropBindCheckFailed'));
    }
    return false;
  } catch (error) {
    console.error('[associationCenter] 拖拽关联校验失败:', error);
    ElMessage.error($t('associationCenter.dropBindCheckFailed'));
    return false;
  }
}

function onAutoAssociate() {
  const accounts = accountBoardRef.value?.getSelectedAccounts?.() || [];
  const proxies = proxyBoardRef.value?.getSelectedProxies?.() || [];
  deviceBoardRef.value?.autoAssociateWithSelections?.(accounts, proxies);
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

async function loadUsersPage() {
  userAllocateLoading.value = true;
  try {
    const response = await postSystemAccountsUsersPageApi({
      current: userPagination.current,
      size: userPagination.size,
      keyword: userQuery.keyword,
    });
    const page = response?.data ?? {};
    userList.value = Array.isArray(page.records) ? page.records : [];
    userPagination.total = Number(page.total ?? 0);
    await nextTick();
    const selectedIds = new Set(toIdList(userSelection.value, ['userId', 'id']));
    if (selectedIds.size && userTableRef.value?.toggleRowSelection) {
      for (const row of userList.value) {
        const rowId = String(row?.userId ?? row?.id ?? '').trim();
        if (rowId && selectedIds.has(rowId)) {
          userTableRef.value.toggleRowSelection(row, true);
        }
      }
    }
  } catch (error) {
    console.error('[associationCenter] 获取用户分页失败:', error);
    ElMessage.error('获取用户列表失败');
  } finally {
    userAllocateLoading.value = false;
  }
}

async function onOpenUserAllocateDialog() {
  const accounts = accountBoardRef.value?.getSelectedAccounts?.() || [];
  const proxies = proxyBoardRef.value?.getSelectedProxies?.() || [];
  const deviceIds = deviceBoardRef.value?.getSelectedDeviceIds?.() || [];
  const accountIds = uniqueIds(toIdList(accounts, ['accountId', 'id'])) as string[];
  const networkIds = uniqueIds(toIdList(proxies, ['networkId', 'proxyId', 'id'])) as string[];
  const finalDeviceIds = uniqueIds(deviceIds) as string[];
  if (!accountIds.length && !networkIds.length && !finalDeviceIds.length) {
    ElMessage.warning('请先选择账号、代理或设备');
    return;
  }
  userSelection.value = [];
  userQuery.keyword = '';
  userPagination.current = 1;
  userPagination.total = 0;
  userAllocateDialogVisible.value = true;
  await loadUsersPage();
}

function onUsersSelectionChange(rows: any[]) {
  const currentPageIds = new Set(toIdList(userList.value, ['userId', 'id']));
  const remain = userSelection.value.filter((row) => {
    const id = String(row?.userId ?? row?.id ?? '').trim();
    return id && !currentPageIds.has(id);
  });
  userSelection.value = [...remain, ...rows];
}

function onUsersPageChange(page: number) {
  userPagination.current = page;
  void loadUsersPage();
}

function onUsersSearch() {
  userPagination.current = 1;
  void loadUsersPage();
}

async function onSubmitUserAllocate() {
  const accounts = accountBoardRef.value?.getSelectedAccounts?.() || [];
  const proxies = proxyBoardRef.value?.getSelectedProxies?.() || [];
  const deviceIds = deviceBoardRef.value?.getSelectedDeviceIds?.() || [];
  const accountIds = uniqueIds(toIdList(accounts, ['accountId', 'id'])) as string[];
  const networkIds = uniqueIds(toIdList(proxies, ['networkId', 'proxyId', 'id'])) as string[];
  const finalDeviceIds = uniqueIds(deviceIds) as string[];
  const userIds = uniqueIds(toIdList(userSelection.value, ['userId', 'id'])) as string[];

  if (!accountIds.length && !networkIds.length && !finalDeviceIds.length) {
    ElMessage.warning('请先选择账号、代理或设备');
    return;
  }
  if (!userIds.length) {
    ElMessage.warning('请至少选择一个用户');
    return;
  }

  const payload: {
    accountIds?: string[];
    networkIds?: string[];
    deviceIds?: string[];
    userIds: string[];
  } = { userIds };
  if (accountIds.length) payload.accountIds = accountIds;
  if (networkIds.length) payload.networkIds = networkIds;
  if (finalDeviceIds.length) payload.deviceIds = finalDeviceIds;

  userAllocateSaving.value = true;
  try {
    const response = await assetUserAllocationApi(payload);
    if (response?.code === 100000) {
      ElMessage.success(response.msg || '用户分配成功');
      userAllocateDialogVisible.value = false;
      userSelection.value = [];
      accountBoardRef.value?.clearSelectedAccounts?.();
      proxyBoardRef.value?.clearSelectedProxies?.();
      deviceBoardRef.value?.clearSelectedDevices?.();
      await loadAssetSummary();
      return;
    }
    ElMessage.error(response?.msg || '用户分配失败');
  } catch (error) {
    console.error('[associationCenter] 用户分配失败:', error);
    ElMessage.error('用户分配失败');
  } finally {
    userAllocateSaving.value = false;
  }
}

async function onContainerReset() {
  const rawIds = deviceBoardRef.value?.getSelectedDeviceIds?.() || [];
  const deviceIds = uniqueIds(rawIds) as string[];
  if (!deviceIds.length) {
    ElMessage.warning($t('associationCenter.selectDeviceBeforeContainerReset'));
    return;
  }

  const count = deviceIds.length;
  try {
    await ElMessageBox.confirm(
      $t('associationCenter.containerResetConfirmMessage', { count }),
      $t('associationCenter.containerReset'),
      {
        type: 'warning',
        confirmButtonText: $t('associationCenter.confirmButtonText'),
        cancelButtonText: $t('associationCenter.cancelButtonText'),
        closeOnClickModal: false,
        beforeClose: async (action: string, instance: any, done: any) => {
          if (action !== 'confirm') {
            done();
            return;
          }

          instance.confirmButtonLoading = true;
          try {
            const response = await resetContainerApi({ deviceIds });
            if (response?.code === 100000) {
              ElMessage.success(
                response.msg || $t('associationCenter.containerResetSuccess'),
              );
              // 重置成功后，刷新代理看板与汇总区
              await proxyBoardRef.value?.refreshProxyList?.();
              await loadAssetSummary();
              // 保留刷新设备列表（避免设备看板仍显示旧绑定状态）
              await deviceBoardRef.value?.refreshDeviceList?.();
              done();
              return;
            }

            ElMessage.error(
              response?.msg || $t('associationCenter.containerResetFailed'),
            );
            done(false);
          } catch (error) {
            console.error('[associationCenter] 容器重置失败:', error);
            ElMessage.error($t('associationCenter.containerResetFailed'));
            done(false);
          } finally {
            instance.confirmButtonLoading = false;
          }
        },
      },
    );
  } catch {
    // 用户取消，不做任何处理
  }
}

async function onOfficialEnable() {
  const deviceEnables = deviceBoardRef.value?.getSelectedDeviceEnables?.() || [];
  if (!deviceEnables.length) {
    ElMessage.warning($t('associationCenter.selectDeviceBeforeOfficialEnable'));
    return;
  }

  try {
    const response = await enableAssetApi({ deviceEnables });
    if (response?.code === 100000) {
      ElMessage.success(
        response.msg || $t('associationCenter.officialEnableSuccess'),
      );
      await deviceBoardRef.value?.refreshDeviceList?.();
      await proxyBoardRef.value?.refreshProxyList?.();
      await loadAssetSummary();
      return;
    }
    if (!response?.msg) {
      ElMessage.error($t('associationCenter.officialEnableFailed'));
    }
  } catch (error) {
    console.error(error);
    // ElMessage.error($t('associationCenter.officialEnableFailed'));
  }
}

function uniqueIds<T>(values: T[]) {
  const idSet = new Set(values);
  return [...idSet] as T[];
}

function normalizeStringIds(values: unknown[]) {
  return uniqueIds(
    values
      .map((item) => String(item ?? '').trim())
      .filter((item): item is string => Boolean(item)),
  );
}

async function onReverseQuery() {
  const accounts = accountBoardRef.value?.getSelectedAccounts?.() || [];
  const proxies = proxyBoardRef.value?.getSelectedProxies?.() || [];
  const deviceIds = deviceBoardRef.value?.getSelectedDeviceIds?.() || [];

  const accountIds = normalizeStringIds(
    accounts.map((item: any) => item?.accountId),
  );
  const proxyIds = normalizeStringIds(
    proxies.map((item: any) => item?.proxyId),
  );
  const finalDeviceIds = normalizeStringIds(deviceIds as any[]);

  const selectedTypeCount = [accountIds, proxyIds, finalDeviceIds].filter(
    (ids) => ids.length > 0,
  ).length;

  if (selectedTypeCount === 0) {
    ElMessage.warning($t('associationCenter.selectOneTypeBeforeReverseQuery'));
    return;
  }
  if (selectedTypeCount > 1) {
    ElMessage.warning($t('associationCenter.selectOnlyOneTypeForReverseQuery'));
    return;
  }

  try {
    const payload: {
      accountIds?: string[];
      proxyIds?: string[];
      deviceIds?: string[];
    } = accountIds.length
      ? { accountIds }
      : proxyIds.length
        ? { proxyIds }
        : { deviceIds: finalDeviceIds };
    const selectedType: 'account' | 'proxy' | 'device' = accountIds.length
      ? 'account'
      : proxyIds.length
        ? 'proxy'
        : 'device';
    console.log('[associationCenter] 反向查询基本信息:', payload);
    const response = await reverseQueryAssetApi(payload);
    if (response?.code === 100000) {
      const reverseData = (response?.data ?? {}) as {
        accountInfos?: any[] | null;
        proxyInfos?: any[] | null;
        deviceInfos?: any[] | null;
      };
      // 查询源看板保持原样，仅刷新其它两个看板。
      if (selectedType !== 'account') {
        accountBoardRef.value?.applyReverseQueryAccounts?.(
          reverseData.accountInfos,
        );
      }
      if (selectedType !== 'proxy') {
        proxyBoardRef.value?.applyReverseQueryProxies?.(
          reverseData.proxyInfos,
        );
      }
      if (selectedType !== 'device') {
        deviceBoardRef.value?.applyReverseQueryDevices?.(
          reverseData.deviceInfos,
        );
      }
      ElMessage.success(response?.msg);
      return;
    }
    ElMessage.error(response?.msg);
  } catch (error) {
    console.error('[associationCenter] 反向查询失败:', error);
    ElMessage.error($t('associationCenter.reverseQueryFailed'));
  }
}

type ClearSelectionType = 'deviceBoard' | 'accountBoard' | 'proxyBoard' | 'all';

function onClearSelection(command: ClearSelectionType) {
  if (command === 'accountBoard' || command === 'all') {
    accountBoardRef.value?.clearSelectedAccounts?.();
  }
  if (command === 'proxyBoard' || command === 'all') {
    proxyBoardRef.value?.clearSelectedProxies?.();
  }
  if (command === 'deviceBoard' || command === 'all') {
    deviceBoardRef.value?.clearSelectedDevices?.();
  }
}
</script>

<template>
  <div style="padding: 12px">
    <StatsOverview :stats="overviewStats" />

    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-card class="board-card">
          <template #header>
            <div class="board-header">
              <span>{{ $t('associationCenter.accountBoard') }}</span>
              <el-link type="primary" underline="never" @click="router.push('/accountPool')">
                <el-icon :size="22"><TopRight /></el-icon>
              </el-link>
            </div>
          </template>
          <AccountBoard
            ref="accountBoardRef"
            :group-options="sharedGroupOptions"
            :sort-options="sharedSortOptions"
          />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="board-card">
          <template #header>
            <div class="board-header">
              <span>{{ $t('associationCenter.proxyBoard') }}</span>
              <el-link type="primary" underline="never" @click="router.push('/proxyPool')">
                <el-icon :size="22"><TopRight /></el-icon>
              </el-link>
            </div>
          </template>
          <ProxyBoard
            ref="proxyBoardRef"
            :group-options="sharedGroupOptions"
            :sort-options="sharedSortOptions"
          />
        </el-card>
      </el-col>
    </el-row>
    <!-- 操作按钮 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button type="primary" @click="onAutoAssociate">
          {{ $t('associationCenter.autoAssociate') }}
        </el-button>
        <el-button type="primary" @click="onOfficialEnable">
          {{ $t('associationCenter.officialEnable') }}
        </el-button>
        <el-button type="danger" @click="onContainerReset">
          {{ $t('associationCenter.containerReset') }}
        </el-button>
        <el-button type="primary" @click="onReverseQuery">
          {{ $t('associationCenter.reverseQuery') }}
        </el-button>
        <el-button type="primary" @click="onOpenUserAllocateDialog">
          用户分配
        </el-button>
        <el-dropdown @command="onClearSelection">
          <el-button type="primary">
            {{ $t('associationCenter.clearSelection') }}
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="accountBoard">
                {{ $t('associationCenter.clearSelectionAccountBoard') }}
              </el-dropdown-item>
              <el-dropdown-item command="proxyBoard">
                {{ $t('associationCenter.clearSelectionProxyBoard') }}
              </el-dropdown-item>
              <el-dropdown-item command="deviceBoard">
                {{ $t('associationCenter.clearSelectionDeviceBoard') }}
              </el-dropdown-item>
              <el-dropdown-item command="all">
                {{ $t('associationCenter.clearSelectionAll') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <el-button type="primary" @click="onViewSwitch">
        {{ $t('associationCenter.viewSwitch') }}
      </el-button>
    </div>

    <!-- 设备看板 -->
    <el-card>
      <DeviceBoard
        ref="deviceBoardRef"
        :group-options="sharedGroupOptions"
        :check-drop-device-enables="checkDropDeviceEnables"
        @refresh-summary="onDeviceBoardRefreshSummary"
        @refresh-proxy-list="onDeviceBoardRefreshProxyList"
      />
    </el-card>

    <el-dialog
      v-model="userAllocateDialogVisible"
      title="用户分配"
      width="760px"
      destroy-on-close
    >
      <div class="user-allocate-toolbar">
        <el-input
          v-model="userQuery.keyword"
          clearable
          placeholder="请输入用户名/昵称"
          @keyup.enter="onUsersSearch"
        />
        <el-button type="primary" @click="onUsersSearch">
          查询
        </el-button>
      </div>
      <el-table
        ref="userTableRef"
        v-loading="userAllocateLoading"
        :data="userList"
        row-key="userId"
        max-height="420"
        @selection-change="onUsersSelectionChange"
      >
        <el-table-column type="selection" width="48" :reserve-selection="true" />
        <el-table-column prop="userName" label="用户名" min-width="160" />
        <el-table-column prop="nickName" label="昵称" min-width="160" />
        <el-table-column prop="status" label="状态" width="100" />
      </el-table>
      <div class="user-allocate-pagination">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :current-page="userPagination.current"
          :page-size="userPagination.size"
          :total="userPagination.total"
          @current-change="onUsersPageChange"
        />
      </div>
      <template #footer>
        <el-button @click="userAllocateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="userAllocateSaving" @click="onSubmitUserAllocate">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  padding: 6px 0;
}

.action-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.board-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.board-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-allocate-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.user-allocate-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>