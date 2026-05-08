<script lang="ts" setup>
import type { VxeGridListeners, VxeGridProps } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElLink, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getImportTaskLogApi } from '#/api/core/proxy-pool-import-log';
import { $t } from '#/locales';

import { getImportTaskPageApi } from './config';

const submitting = ref(false);

const [Modal, modalApi] = useVbenModal({
  title: $t('proxyPool.importLog.title'),
  class: 'w-[800px]',
  closeOnClickModal: false,
  footer: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {},
  onOpenChange: async (isOpen) => {
    if (isOpen) {
      return false;
    }
  },
});

interface RowType {
  businessType: string; // "网络导入"
  createTime: string; // "2026-05-08 09:31:39"
  failedReason: string; // null
  failedRecords: string; // 0
  id: string; // "87"
  originalFileName: string; // "网络配置数据.csv"
  reportFileName: string; // null
  status: string; // "PENDING"
  statusName: string; // "待处理"
  successRecords: string; // 0
  totalRecords: string; // 0
  updateTime: string; // "2026-05-08 09:31:39"
  userName: string; // "管理员"
}

const gridOptions: VxeGridProps<RowType> = {
  columns: [
    { field: 'createTime', title: $t('proxyPool.importLog.createTime') },
    { field: 'userName', title: $t('proxyPool.importLog.userName') },
    {
      field: 'status',
      title: $t('proxyPool.importLog.status'),
      slots: { default: 'status' },
      width: 100,
    },
    {
      field: 'result',
      title: $t('proxyPool.importLog.result'),
      slots: { default: 'result' },
      width: 300,
    },
  ],
  data: [],
  pagerConfig: {
    enabled: true,
    pageSize: 10,
    pageSizes: [10, 20, 50, 100],
    layouts: ['PrevPage', 'JumpNumber', 'NextPage', 'Sizes', 'Total'],
  },
  // sortConfig: {
  //   multiple: true,
  // },
  checkboxConfig: {
    reserve: true,
  },
  rowConfig: {
    keyField: 'proxyId',
  },
  proxyConfig: {
    response: {
      result: 'list',
      total: 'total',
    },
    ajax: {
      query: async ({ page }, formValues) => {
        return await getImportTaskPageApi({
          current: page.currentPage,
          size: page.pageSize,
          businessType: 'NETWORK_IMPORT',
          ...formValues,
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
};

const gridEvents: VxeGridListeners<RowType> = {
  cellClick: ({ row }) => {
    // message.info(`cell-click: ${row.name}`);
  },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridEvents, gridOptions });

function downloadReport(row: RowType) {
  ElMessageBox.confirm(
    $t('proxyPool.importLog.confirmExport'),
    $t('common.prompt'),
    {
      confirmButtonText: $t('common.confirm'),
      cancelButtonText: $t('common.cancel'),
      type: 'warning',
    },
  )
    .then(async () => {
      await getImportTaskLogApi(row.id, row.reportFileName);
      ElMessage.success($t('common.OperationSuccess'));
    })
    .catch(() => {});
}
</script>

<template>
  <Modal :confirm-loading="submitting">
    <Grid>
      <template #status="{ row }">
        <template v-if="row.status === 'FAILED'">
          <el-tooltip
            raw-content
            effect="dark"
            :content="`${$t('proxyPool.importLog.failedReason')}:<br> ${row.failedReason}`"
          >
            <el-tag type="danger">
              {{ row.statusName }}
            </el-tag>
          </el-tooltip>
        </template>
        <template v-else>
          <el-tag :type="row.status === 'SUCCESS' ? 'success' : 'info'">
            {{ row.statusName }}
          </el-tag>
        </template>
      </template>

      <template #result="{ row }">
        <ElLink type="success" @click="downloadReport(row)">
          {{ row.reportFileName }}
        </ElLink>
      </template>
    </Grid>
  </Modal>
</template>
