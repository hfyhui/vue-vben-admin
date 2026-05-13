import { ref } from 'vue';

import { defineStore } from 'pinia';

import { getDictPullArray } from '#/api';

type DictInfo = Record<string, any>;

const DICT_STORAGE_KEY = 'dictInfo';

function readCachedDictInfo(): DictInfo {
  try {
    const raw = sessionStorage.getItem(DICT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function hasDictData(dictInfo: DictInfo) {
  return !!dictInfo && Object.keys(dictInfo).length > 0;
}

export const useDictStore = defineStore('dict', () => {
  const dictInfo = ref<DictInfo>(readCachedDictInfo());

  function setDictInfo(nextDictInfo: DictInfo) {
    const safeValue =
      nextDictInfo && typeof nextDictInfo === 'object' ? nextDictInfo : {};
    dictInfo.value = safeValue;
    sessionStorage.setItem(DICT_STORAGE_KEY, JSON.stringify(safeValue));
  }

  async function fetchDictInfo(force = false) {
    if (!force && hasDictData(dictInfo.value)) {
      return dictInfo.value;
    }
    const response: any = await getDictPullArray();
    const payload = response?.data ?? response ?? {};
    setDictInfo(payload);
    return dictInfo.value;
  }

  function getDictOptions(dictKey: string) {
    const list = dictInfo.value?.[dictKey]?.children;
    return Array.isArray(list) ? list : [];
  }

  function $reset() {
    dictInfo.value = {};
    sessionStorage.removeItem(DICT_STORAGE_KEY);
  }

  return {
    $reset,
    dictInfo,
    fetchDictInfo,
    getDictOptions,
    setDictInfo,
  };
});
