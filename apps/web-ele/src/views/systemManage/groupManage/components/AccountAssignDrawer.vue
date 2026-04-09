<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';

import { ElMessage } from 'element-plus';

import { postSocialAccountListApi, updateSocialAccountSuiteApi } from '#/api/core/social-device-account';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const props = defineProps<{
  detail: Record<string, any> | null;
}>();

const assetEnums = useAssetEnumsStore();
const tableRef = ref();
const loading = ref(false);
const saving = ref(false);
const tableRows = ref<any[]>([]);
const total = ref(0);
const page = reactive({ current: 1, size: 20 });
const searchMode = ref<'account' | 'userAccount'>('account');
const searchForm = reactive<{ id?: string; appAccount?: string }>({});
const onlySelected = ref(false);
const selectedMap = ref(new Map<string, any>());
let syncingSelection = false;

const modeOptions = computed(() => [
  { label: $t('systemManage.groupManage.account'), value: 'account' as const },
  { label: $t('systemManage.groupManage.userAccount'), value: 'userAccount' as const },
]);


const primarySearchInput = computed({
  get() {
    return searchMode.value === 'account'
      ? (searchForm.id ?? '')
      : (searchForm.appAccount ?? '');
  },
  set(v: string) {
    if (searchMode.value === 'account') {
      searchForm.id = v;
    } else {
      searchForm.appAccount = v;
    }
  },
});

const searchPlaceholder = computed(() =>
  searchMode.value === 'account'
    ? $t('systemManage.groupManage.pleaseInputAccountId')
    : $t('systemManage.groupManage.pleaseInputUserAccount'),
);

const loginStatusOptions = computed(() =>
  assetEnums.getEnumOptions('LOGIN_STATUS', {
    childrenKey: 'children',
    labelKey: 'content',
    valueKey: 'name',
  }),
);

function successCode(code: number) {
  return code === 200 || code === 100000;
}

function loginStatusLabel(code?: string) {
  if (!code) return '';
  return loginStatusOptions.value.find((o) => o.value === code)?.label ?? code;
}


async function ensureEnums() {
  await assetEnums.ensureAssetEnumsLoaded();
}

function resetFromDetail() {
  selectedMap.value = new Map();
  const orgs = props.detail?.suiteAccOrgs ?? [];
  for (const r of orgs) {
    if (r?.id != null) selectedMap.value.set(r.id, { ...r });
  }
  onlySelected.value = false;
  searchForm.id = '';
  searchForm.appAccount = '';
  page.current = 1;
}

async function loadList() {
  await ensureEnums();
  if (onlySelected.value) {
    applyLocalFilter();
    return;
  }
  loading.value = true;
  try {
    const body: Record<string, any> = {
      current: page.current,
      size: page.size,
    };
    if (searchMode.value === 'account' && searchForm.id) {
      body.id = searchForm.id;
    } else if (searchMode.value === 'userAccount' && searchForm.appAccount) {
      body.appAccount = searchForm.appAccount;
    }
    const res = await postSocialAccountListApi(body);
    if (res && successCode(res.code)) {
      tableRows.value = res.data?.records ?? [];
      total.value = res.data?.total ?? 0;
    } else {
      tableRows.value = [];
      total.value = 0;
    }
    await nextTick();
    syncSelection();
  } finally {
    loading.value = false;
  }
}

function applyLocalFilter() {
  const list = [...selectedMap.value.values()];
  const idKw = (searchForm.id ?? '').trim();
  const accKw = (searchForm.appAccount ?? '').trim().toLowerCase();
  const filtered = list.filter((el) => {
    if (searchMode.value === 'account' && idKw) {
      return el.id.includes(idKw);
    }
    if (searchMode.value === 'userAccount' && accKw) {
      return el.appAccount.toLowerCase().includes(accKw);
    }
    return true;
  });
  tableRows.value = filtered;
  total.value = filtered.length;
  nextTick(() => syncSelection());
}

function syncSelection() {
  const tb = tableRef.value;
  if (!tb) return;
  syncingSelection = true;
  tb.clearSelection();
  for (const row of tableRows.value) {
    if (selectedMap.value.has(row.id)) {
      tb.toggleRowSelection(row, true);
    }
  }
  nextTick(() => {
    syncingSelection = false;
  });
}

function onModeChange() {
  searchForm.id = '';
  searchForm.appAccount = '';
}

function onSearch() {
  page.current = 1;
  loadList();
}

function onOnlySelectedChange(val: boolean) {
  onlySelected.value = val;
  page.current = 1;
  if (val) {
    applyLocalFilter();
  } else {
    loadList();
  }
}

function onSelect(selection: any[], row: any) {
  if (syncingSelection) return;
  const inSel = selection.some((r) => r.id === row.id);
  if (inSel) {
    selectedMap.value.set(row.id, row);
  } else {
    selectedMap.value.delete(row.id);
  }
}

function onSelectAll(selection: any[]) {
  if (syncingSelection) return;
  const onPage = tableRows.value;
  if (selection.length) {
    for (const r of selection) {
      selectedMap.value.set(r.id, r);
    }
  } else {
    for (const r of onPage) {
      selectedMap.value.delete(r.id);
    }
  }
}

function onPageChange(p: number) {
  page.current = p;
  loadList();
}

function onSizeChange(s: number) {
  page.size = s;
  page.current = 1;
  loadList();
}

watch(
  () => visible.value,
  async (v) => {
    if (v) {
      resetFromDetail();
      await loadList();
    }
  },
);

function close() {
  visible.value = false;
}

function resolveSuiteId(d: Record<string, any> | null | undefined) {
  if (!d) return undefined;
  const v = d.id ?? d.suiteId;
  if (v === null || v === undefined || v === '') return undefined;
  return v;
}

async function save() {
  const d = props.detail;
  const suiteId = resolveSuiteId(d);
  if (suiteId === undefined) {
    ElMessage.warning($t('systemManage.groupManage.missingSuiteId'));
    return;
  }
  saving.value = true;
  try {
    const accountIds = [...selectedMap.value.keys()];
    const res = await updateSocialAccountSuiteApi({
      id: suiteId,
      suiteName: d?.suiteName,
      suiteDesc: d?.suiteDesc,
      accountIds,
    });
    if (res && successCode(res.code)) {
      ElMessage.success($t('systemManage.opSuccess'));
      close();
      emit('success');
    }
  } catch (e) {
    console.error(e);
    ElMessage.error($t('common.error.submitFailed'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <ElDrawer
    v-model="visible"
    :title="$t('systemManage.groupManage.accountDetails')"
    size="70%"
    destroy-on-close
    class="account-assign-drawer"
  >
    <div class="drawer-body">
      <!-- 与旧版 SubmitForm 只读分组信息一致：表单项 + 禁用输入框/文本域 -->
      <ElForm class="header-form" label-position="left" label-width="96px">
        <ElFormItem :label="$t('systemManage.groupManage.groupName')">
          <ElInput :model-value="detail?.suiteName ?? ''" disabled maxlength="50" />
        </ElFormItem>
        <ElFormItem :label="$t('systemManage.groupManage.groupDesc')">
          <ElInput
            type="textarea"
            :model-value="detail?.suiteDesc ?? ''"
            disabled
            :autosize="{ minRows: 3, maxRows: 5 }"
            maxlength="200"
          />
        </ElFormItem>
      </ElForm>

      <!-- 与旧版 a-input-group compact + 查询 + 勾选 同一行 -->
      <div class="toolbar">
        <div class="search-input-group">
          <ElInput
            v-model="primarySearchInput"
            clearable
            class="input-with-select"
            :placeholder="searchPlaceholder"
            @keyup.enter="onSearch"
          >
            <template #prepend>
              <ElSelect v-model="searchMode" class="mode-select" @change="onModeChange">
                <ElOption
                  v-for="m in modeOptions"
                  :key="m.value"
                  :label="m.label"
                  :value="m.value"
                />
              </ElSelect>
            </template>
          </ElInput>
        </div>
        <ElButton type="primary" class="query-btn" @click="onSearch">
          {{ $t('common.query') }}
        </ElButton>
        <ElCheckbox
          :model-value="onlySelected"
          class="only-selected-check"
          @update:model-value="onOnlySelectedChange"
        >
          {{ $t('systemManage.groupManage.onlyShowSelectedAccounts') }}
        </ElCheckbox>
      </div>

      <ElTable
        ref="tableRef"
        v-loading="loading"
        :data="tableRows"
        row-key="id"
        border
        class="account-table"
        height="420"
        @select="onSelect"
        @select-all="onSelectAll"
      >
        <ElTableColumn type="selection" width="48" align="center" />
        <ElTableColumn
          prop="id"
          :label="$t('systemManage.groupManage.accountId')"
          min-width="120"
          align="center"
          show-overflow-tooltip
        />
        <ElTableColumn
          prop="appName"
          :label="$t('systemManage.groupManage.appType')"
          min-width="100"
          align="center"
        />
        <ElTableColumn
          prop="appAccount"
          :label="$t('systemManage.groupManage.userAccount')"
          min-width="140"
          align="center"
          show-overflow-tooltip
        />
        <ElTableColumn :label="$t('systemManage.groupManage.accountStatus')" min-width="110" align="center">
          <template #default="{ row }">
            <span :class="row.loginStatus === 'LOGIN_FAILE' ? 'login-status--fail' : ''">
              <ElTooltip v-if="row.loginStatus === 'LOGIN_FAILE'" :content="row.failedReason || ''">
                <span>{{ loginStatusLabel(row.loginStatus) }}</span>
              </ElTooltip>
              <span v-else>{{ loginStatusLabel(row.loginStatus) }}</span>
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn
          :label="$t('systemManage.groupManage.deviceNumber')"
          min-width="100"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{row.deviceIdx}}
          </template>
        </ElTableColumn>
        <ElTableColumn
          :label="$t('systemManage.groupManage.deviceIp')"
          min-width="110"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.deviceIp }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          :label="$t('systemManage.groupManage.deviceAlias')"
          min-width="110"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.deviceAliases }}
          </template>
        </ElTableColumn>
      </ElTable>

      <div v-if="!onlySelected" class="pager">
        <ElPagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-size="page.size"
          :current-page="page.current"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <ElButton native-type="button" @click="close">{{ $t('common.cancel') }}</ElButton>
        <ElButton native-type="button" type="primary" :loading="saving" @click="save">
          {{ $t('common.confirm') }}
        </ElButton>
      </div>
    </template>
  </ElDrawer>
</template>

<style scoped>
.drawer-body {
  padding: 0 4px 24px;
}

.header-form {
  margin-bottom: 8px;
}

.header-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.header-form :deep(.el-form-item__label) {
  color: var(--el-text-color-regular);
  font-weight: normal;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 20px;
  gap: 0;
}

.search-input-group {
  flex-shrink: 0;
  width: 332px;
  max-width: 100%;
  margin-right: 15px;
}

.input-with-select :deep(.el-input-group__prepend) {
  padding: 0;
  background-color: transparent;
}

.mode-select {
  width: 100px;
  margin: 0;
}

.mode-select :deep(.el-select__wrapper) {
  min-height: 32px;
  border: none;
  box-shadow: none;
  border-radius: 0;
}

.query-btn {
  margin-right: 20px;
}

.only-selected-check {
  margin-left: 0;
}

.account-table {
  width: 100%;
}

.login-status--fail {
  cursor: default;
}

.pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.drawer-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
}
</style>

<style>
/* 抽屉内容区底部留白，避免被 footer 遮挡（对齐旧版 body-style paddingBottom） */
.account-assign-drawer .el-drawer__body {
  padding-bottom: 16px;
}

/* 底部按钮居中（覆盖 el-drawer__footer 默认右对齐） */
.account-assign-drawer .el-drawer__footer {
  display: flex;
  justify-content: center;
}
</style>
