import { ref } from 'vue';

import { useAccessStore } from '@vben/stores';
import { defineStore } from 'pinia';

import { getAssetEnumsApi } from '#/api/core/asset';

export const ASSET_ENUMS_CACHE_KEY = 'asset-enums';

type AssetEnumsData = Record<string, any>;
type AssetEnumOption = { label: string; value: string };

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

  function getEnumOptions(
    key: string,
    {
      childrenKey = 'children',
      labelKey = 'content',
      valueKey = 'name',
    }: {
      childrenKey?: string;
      labelKey?: string;
      valueKey?: string;
    } = {},
  ): AssetEnumOption[] {
    const enumNode = enums.value?.[key];
    const children = Array.isArray(enumNode?.[childrenKey])
      ? enumNode[childrenKey]
      : [];
    return children
      .map((item: Record<string, unknown>) => ({
        label: String(item?.[labelKey] ?? ''),
        value: String(item?.[valueKey] ?? ''),
      }))
      .filter((item) => item.label && item.value);
  }

  async function getEnumOptionsAsync(
    key: string,
    config?: {
      childrenKey?: string;
      labelKey?: string;
      valueKey?: string;
    },
  ): Promise<AssetEnumOption[]> {
    await ensureAssetEnumsLoaded();
    return getEnumOptions(key, config);
  }

  function $reset() {
    enums.value = {};
    loaded.value = false;
    loading.value = false;
    window.localStorage.removeItem(ASSET_ENUMS_CACHE_KEY);
  }

  return {
    $reset,
    enums,
    loaded,
    loading,
    ensureAssetEnumsLoaded,
    getEnumByKey,
    getEnumOptions,
    getEnumOptionsAsync,
  };
});

