import { ref } from 'vue';

import { defineStore } from 'pinia';

import {
  postSystemAccountsByUsersApi,
  postSystemAccountsUsersApi,
} from '#/api/core/social-system-accounts';

const success = (code: number) => code === 200 || code === 100000;

export const useSocialMediaAccountStore = defineStore('social-media-account', () => {
  const appList = ref<any[]>([]);
  const checkAppId = ref('');
  const checkInfo = ref<any[]>([]);
  const defaultCheckInfo = ref<any[]>([]);
  const checkUserIds = ref<string[]>([]);

  function setCheckAppList(list: any[]) {
    appList.value = list;
  }
  function setCheckAppId(id: string) {
    checkAppId.value = id;
  }
  function setCheckInfo(list: any[]) {
    checkInfo.value = list;
  }
  function setCheckUserIds(ids: string[]) {
    checkUserIds.value = ids;
  }
  function setDefaultCheckInfo(list: any[]) {
    defaultCheckInfo.value = list;
  }

  async function fetchAccountsByUsers(selectedRowKeys: string[] = []) {
    if (!selectedRowKeys.length) {
      setCheckInfo([]);
      setDefaultCheckInfo([]);
      return;
    }
    try {
      const res = await postSystemAccountsByUsersApi({
        userIds: selectedRowKeys,
        appId: checkAppId.value,
      });
      if (res && success(res.code)) {
        const list = Array.isArray(res.data) ? res.data : [];
        setCheckInfo(list);
        setDefaultCheckInfo(list);
      } else {
        setCheckInfo([]);
      }
    } catch {
      setCheckInfo([]);
    }
  }

  async function fetchUsersByAccounts(selectedRowKeys: string[] = []) {
    if (!selectedRowKeys.length) {
      setCheckInfo([]);
      setDefaultCheckInfo([]);
      setCheckUserIds([]);
      return;
    }
    try {
      const res = await postSystemAccountsUsersApi({
        accountIds: selectedRowKeys,
      });
      if (res && success(res.code)) {
        const list = Array.isArray(res.data) ? res.data : [];
        setCheckInfo(list);
        setDefaultCheckInfo(list);
      } else {
        setCheckInfo([]);
      }
    } catch {
      setCheckInfo([]);
    }
  }

  function resetBindings() {
    setDefaultCheckInfo([]);
    setCheckUserIds([]);
    setCheckInfo([]);
  }

  /** 供 Pinia resetAllStores / 登出时清空；setup store 需自行实现 */
  function $reset() {
    appList.value = [];
    checkAppId.value = '';
    checkInfo.value = [];
    defaultCheckInfo.value = [];
    checkUserIds.value = [];
  }

  return {
    appList,
    checkAppId,
    checkInfo,
    defaultCheckInfo,
    checkUserIds,
    setCheckAppList,
    setCheckAppId,
    setCheckInfo,
    setCheckUserIds,
    setDefaultCheckInfo,
    fetchAccountsByUsers,
    fetchUsersByAccounts,
    resetBindings,
    $reset,
  };
});
