<template>
  <div class="example-page">
    <div class="action-bar">
      <ElButton type="primary" @click="onAdd">
        新增
      </ElButton>
      <ElButton 
        type="danger" 
        :disabled="!hasSelection"
        @click="onBatchDelete"
      >
        批量删除 ({{ selectedCount }})
      </ElButton>
      <ElButton 
        type="info" 
        :disabled="!hasSelection"
        @click="clearAllSelection"
      >
        清空选择
      </ElButton>
    </div>
    
    <Grid>
      <!-- 跨分页选择框 - 行级 -->
      <template #crossPageCheckbox="{ row }">
        <CrossPageCheckbox
          :row="row"
          :is-row-selected="isRowSelected"
          :toggle-row-selection="toggleRowSelection"
          :toggle-all-current-page="toggleAllCurrentPage"
          :is-all-current-page-selected="isAllCurrentPageSelected"
          :is-current-page-indeterminate="isCurrentPageIndeterminate"
          :checkbox-key="checkboxKey"
        />
      </template>
      
      <!-- 跨分页选择框 - 表头 -->
      <template #crossPageCheckboxHeader>
        <CrossPageCheckbox
          :is-row-selected="isRowSelected"
          :toggle-row-selection="toggleRowSelection"
          :toggle-all-current-page="toggleAllCurrentPage"
          :is-all-current-page-selected="isAllCurrentPageSelected"
          :is-current-page-indeterminate="isCurrentPageIndeterminate"
          :checkbox-key="checkboxKey"
        />
      </template>
      
      <!-- 其他列的模板... -->
      <template #action="{ row }">
        <ElButton link @click="onEdit(row)">
          编辑
        </ElButton>
        <ElButton link @click="onDelete(row)">
          删除
        </ElButton>
      </template>
    </Grid>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { ElButton, ElMessage, ElMessageBox } from 'element-plus';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useCrossPageSelection, createCrossPageSelectionColumn } from '@/composables/useCrossPageSelection';
import CrossPageCheckbox from '@/components/CrossPageSelection/CrossPageCheckbox.vue';

// VXE Grid配置
const gridOptions = {
  columns: [
    // 使用通用函数创建选择列
    createCrossPageSelectionColumn(),
    {
      field: 'name',
      title: '名称',
      minWidth: 120,
    },
    {
      field: 'status',
      title: '状态',
      width: 100,
    },
    {
      field: 'action',
      title: '操作',
      width: 150,
      slots: { default: 'action' }
    }
  ],
  pagerConfig: { enabled: true },
  proxyConfig: {
    ajax: {
      query: async ({ page }: any) => {
        // 这里调用你的API
        const res = await fetchDataApi({
          pageNum: page.currentPage,
          pageSize: page.pageSize,
        });
        return res.data;
      },
    },
  },
};

const gridEvents = {};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
  gridEvents,
});

// 使用跨分页选择功能
const {
  selectedRowIds,
  checkboxKey,
  selectedCount,
  hasSelection,
  isRowSelected,
  toggleRowSelection,
  toggleAllCurrentPage,
  isAllCurrentPageSelected,
  isCurrentPageIndeterminate,
  clearAllSelection,
} = useCrossPageSelection(ref(gridApi));

// 业务方法
function onAdd() {
  console.log('新增');
}

function onEdit(row: any) {
  console.log('编辑:', row);
}

async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '确认删除', {
      type: 'warning',
    });
    
    // 调用删除API
    await deleteApi(row.id);
    
    // 从选中列表中移除
    if (selectedRowIds.value.includes(row.id)) {
      selectedRowIds.value = selectedRowIds.value.filter(id => id !== row.id);
    }
    
    gridApi.query();
    ElMessage.success('删除成功');
  } catch {
    // 用户取消
  }
}

async function onBatchDelete() {
  if (selectedRowIds.value.length === 0) {
    ElMessage.warning('请先选择要删除的数据');
    return;
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRowIds.value.length} 条记录吗？`, 
      '批量删除确认', 
      {
        type: 'warning',
      }
    );
    
    const ids = selectedRowIds.value;
    await batchDeleteApi(ids);
    
    // 清空跨分页选中状态
    clearAllSelection();
    
    gridApi.query();
    ElMessage.success(`成功删除 ${ids.length} 条记录`);
  } catch {
    // 用户取消或删除失败
  }
}

// 模拟API函数
async function fetchDataApi(params: any) {
  // 替换为真实的API调用
  return { data: { records: [], total: 0 } };
}

async function deleteApi(id: string) {
  // 替换为真实的删除API
  console.log('删除:', id);
}

async function batchDeleteApi(ids: string[]) {
  // 替换为真实的批量删除API
  console.log('批量删除:', ids);
}
</script>

<style scoped>
.example-page {
  padding: 20px;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
