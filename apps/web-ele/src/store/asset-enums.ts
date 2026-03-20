import { ref } from 'vue';

import { useAccessStore } from '@vben/stores';
import { defineStore } from 'pinia';

import { getAssetEnumsApi } from '#/api/core/asset';

const ASSET_ENUMS_CACHE_KEY = 'asset-enums-cache-v1';

type AssetEnumsData = Record<string, any>;

function readAssetEnumsCache(): AssetEnumsData {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(ASSET_ENUMS_CACHE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAssetEnumsCache(data: AssetEnumsData) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ASSET_ENUMS_CACHE_KEY, JSON.stringify(data || {}));
}

export const useAssetEnumsStore = defineStore('asset-enums', () => {
  const enums = ref<AssetEnumsData>(readAssetEnumsCache());
  const loaded = ref(Object.keys(enums.value).length > 0);
  const loading = ref(false);

  async function ensureAssetEnumsLoaded(force = false) {
    if (!force && loaded.value) {
      return enums.value;
    }

    if (loading.value) {
      return enums.value;
    }

    const accessStore = useAccessStore();
    if (!accessStore.accessToken && !force) {
      return enums.value;
    }

    loading.value = true;
    try {
      const response = await getAssetEnumsApi();
      if (response?.code === 100000 && response?.data) {
        enums.value = response.data;
        loaded.value = true;
        writeAssetEnumsCache(enums.value);
      }
      return enums.value;
    } finally {
      loading.value = false;
    }
  }

  function getEnumByKey<T = any[]>(key: string): T {
    return ((enums.value?.[key] ?? []) as T);
  }

  return {
    enums,
    loaded,
    loading,
    ensureAssetEnumsLoaded,
    getEnumByKey,
  };
});

