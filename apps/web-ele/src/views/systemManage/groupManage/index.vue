<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ArrowDown } from '@element-plus/icons-vue';

import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon,
  ElMessage,
  ElMessageBox,
} from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteSocialSuiteApi,
  getSocialSuiteDetailApi,
} from '#/api/core/social-suite';
import { $t } from '#/locales';

import AccountAssignDrawer from './components/AccountAssignDrawer.vue';
import DeviceAssignDrawer from './components/DeviceAssignDrawer.vue';
import GroupFormModal from './components/GroupFormModal.vue';
import {
  getGroupManageFormOptions,
  getGroupSuiteListApi,
  useGroupManageColumns,
} from './group-manage-table-config';

const formVisible = ref(false);
const formInitial = ref<Record<string, any> | null>(null);

const deviceDrawerVisible = ref(false);
const accountDrawerVisible = ref(false);
const detailRecord = ref<Record<string, any> | null>(null);

function successCode(code: number) {
  return code === 200 || code === 100000;
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: getGroupManageFormOptions(),
  gridOptions: {
    columns: useGroupManageColumns(),
    height: 'auto',
    pagerConfig: {
      enabled: true,
      pageSize: 20,
      pageSizes: [10, 20, 50, 100],
      layouts: ['PrevPage', 'JumpNumber', 'NextPage', 'Sizes', 'Total'],
    },
    checkboxConfig: {
      checkMethod: ({ row }: { row: Record<string, any> }) =>
        row.suiteType !== 'PRODUCT',
    },
    proxyConfig: {
      response: {
        result: 'records',
        total: 'total',
      },
      ajax: {
        query: async ({ page }, formValues) => {
          return await getGroupSuiteListApi({
            page: page.currentPage,
            pageSize: page.pageSize,
            suiteName: formValues?.suiteName,
          });
        },
      },
    },
    toolbarConfig: {
      custom: true,
      refresh: true,
      resizable: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions,
});

function openAdd() {
  formInitial.value = {};
  formVisible.value = true;
}

async function openEdit(row: any) {
  try {
    const res = await getSocialSuiteDetailApi(row.id);
    if (res && successCode(res.code)) {
      const data = res.data ?? {};
      formInitial.value = {
        ...data,
        suiteId: row.id,
      };
      formVisible.value = true;
    }
  } catch {
    /* client */
  }
}

async function openDetailForDevices(row: any) {
  try {
    const res = await getSocialSuiteDetailApi(row.id);
    if (res && successCode(res.code)) {
      const data = res.data ?? {};
      detailRecord.value = { ...data, id: data.id ?? row.id };
      deviceDrawerVisible.value = true;
    }
  } catch {
    /* client */
  }
}

async function openDetailForAccounts(row: any) {
  try {
    const res = await getSocialSuiteDetailApi(row.id);
    if (res && successCode(res.code)) {
      const data = res.data ?? {};
      detailRecord.value = { ...data, id: data.id ?? row.id };
      accountDrawerVisible.value = true;
    }
  } catch {
    /* client */
  }
}

async function removeRow(row: any) {
  await ElMessageBox.confirm(
    `${$t('systemManage.groupManage.confirmDelete')}：${row.suiteName}？`,
    $t('common.prompt'),
    { type: 'warning' },
  );
  const res = await deleteSocialSuiteApi([row.id]);
  if (res && successCode(res.code)) {
    ElMessage.success($t('systemManage.opSuccess'));
    gridApi.reload();
  }
}

async function batchRemove() {
  const checkboxRecords = (gridApi as any).grid.getCheckboxRecords() as any[];
  if (!checkboxRecords.length) {
    ElMessage.warning($t('systemManage.groupManage.pleaseSelect'));
    return;
  }
  await ElMessageBox.confirm(
    $t('systemManage.groupManage.confirmDeleteBatch'),
    $t('common.prompt'),
    { type: 'warning' },
  );
  const suiteIds = checkboxRecords.map((r) => r.id);
  const res = await deleteSocialSuiteApi(suiteIds);
  if (res && successCode(res.code)) {
    ElMessage.success($t('systemManage.opSuccess'));
    gridApi.reload();
  }
}

function onGridSuccess() {
  gridApi.reload();
}
</script>

<template>
  <Page auto-content-height content-class="group-manage-page">
    <Grid>
      <template #toolbar-actions>
        <ElButton class="mr-2" type="primary" @click="openAdd">
          {{ $t('systemManage.groupManage.addGroup') }}
        </ElButton>
        <ElButton type="danger" plain @click="batchRemove">
          {{ $t('common.delBatch') }}
        </ElButton>
      </template>

      <template #action="{ row }">
        <div class="action-cell">
          <template v-if="row.suiteType !== 'PRODUCT'">
            <ElButton link type="primary" @click="openEdit(row)">
              {{ $t('common.edit') }}
            </ElButton>
            <ElButton link type="danger" @click="removeRow(row)">
              {{ $t('common.del') }}
            </ElButton>
          </template>
          <ElDropdown v-if="row.amount || row.accAmount" trigger="click">
            <span class="group-detail-dropdown-trigger">
              {{ $t('common.details') }}
              <ElIcon class="group-detail-dropdown-icon"><ArrowDown /></ElIcon>
            </span>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem v-if="row.amount" @click="openDetailForDevices(row)">
                  {{ $t('systemManage.groupManage.deviceDetails') }}
                </ElDropdownItem>
                <ElDropdownItem v-if="row.accAmount" @click="openDetailForAccounts(row)">
                  {{ $t('systemManage.groupManage.accountDetails') }}
                </ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </template>
    </Grid>

    <GroupFormModal v-model:visible="formVisible" :initial="formInitial" @success="onGridSuccess" />
    <DeviceAssignDrawer
      v-model:visible="deviceDrawerVisible"
      :detail="detailRecord"
      @success="onGridSuccess"
    />
    <AccountAssignDrawer
      v-model:visible="accountDrawerVisible"
      :detail="detailRecord"
      @success="onGridSuccess"
    />
  </Page>
</template>

<style scoped>
.group-manage-page {
  padding: 24px;
}

.mr-2 {
  margin-right: 8px;
}

.action-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.group-detail-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--el-color-primary);
  font-size: 14px;
  user-select: none;
}

.group-detail-dropdown-icon {
  font-size: 12px;
}
</style>
