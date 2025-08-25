# 跨分页选择功能使用指南

## 概述

这是一个通用的跨分页选择功能组件，可以在任何使用VXE Table的页面中快速集成跨分页选择和批量操作功能。

## 文件结构

```
src/
├── composables/
│   └── useCrossPageSelection.ts        # 核心逻辑组合函数
├── components/
│   └── CrossPageSelection/
│       ├── CrossPageCheckbox.vue       # 通用checkbox组件
│       └── README.md                   # 使用文档
└── examples/
    └── CrossPageSelectionExample.vue  # 完整使用示例
```

## 快速开始

### 1. 在页面中引入

```vue
<script lang="ts" setup>
import { ref } from 'vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useCrossPageSelection, createCrossPageSelectionColumn } from '@/composables/useCrossPageSelection';
import CrossPageCheckbox from '@/components/CrossPageSelection/CrossPageCheckbox.vue';

// 其他imports...
</script>
```

### 2. 配置表格列

```typescript
const gridOptions = {
  columns: [
    // 使用通用函数创建选择列
    createCrossPageSelectionColumn({ width: 50, align: 'center' }),
    
    // 你的其他列...
    {
      field: 'name',
      title: '名称',
      minWidth: 120,
    },
    // ...
  ],
  // 其他配置...
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
  gridEvents: {},
});
```

### 3. 使用跨分页选择功能

```typescript
// 使用组合函数
const {
  selectedRowIds,        // 选中的ID列表
  checkboxKey,          // 强制刷新key
  selectedCount,        // 选中数量
  hasSelection,         // 是否有选中项
  isRowSelected,        // 检查行是否选中
  toggleRowSelection,   // 切换行选中状态
  toggleAllCurrentPage, // 全选/取消全选当前页
  isAllCurrentPageSelected,     // 当前页是否全选
  isCurrentPageIndeterminate,   // 当前页是否部分选中
  clearAllSelection,    // 清空所有选中
} = useCrossPageSelection(ref(gridApi));
```

### 4. 添加模板

```vue
<template>
  <Grid>
    <!-- 行级选择框 -->
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
    
    <!-- 表头全选框 -->
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
    
    <!-- 其他模板... -->
  </Grid>
</template>
```

### 5. 实现批量操作

```typescript
// 批量删除示例
async function onBatchDelete() {
  if (selectedRowIds.value.length === 0) {
    ElMessage.warning('请先选择要删除的数据');
    return;
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRowIds.value.length} 条记录吗？`,
      '批量删除确认',
      { type: 'warning' }
    );
    
    const ids = selectedRowIds.value;
    await batchDeleteApi(ids);
    
    // 清空选中状态
    clearAllSelection();
    
    gridApi.query();
    ElMessage.success(`成功删除 ${ids.length} 条记录`);
  } catch {
    // 用户取消
  }
}
```

## API 参考

### useCrossPageSelection(gridApiRef)

#### 参数
- `gridApiRef`: VXE Grid API的ref引用

#### 返回值

| 名称 | 类型 | 描述 |
|------|------|------|
| selectedRowIds | Ref<string[]> | 选中的行ID数组 |
| checkboxKey | Ref<number> | 强制刷新checkbox的key |
| selectedCount | ComputedRef<number> | 选中的数量 |
| hasSelection | ComputedRef<boolean> | 是否有选中项 |
| isRowSelected | (row) => boolean | 检查某行是否选中 |
| toggleRowSelection | (row) => void | 切换行选中状态 |
| toggleAllCurrentPage | () => void | 全选/取消全选当前页 |
| isAllCurrentPageSelected | () => boolean | 当前页是否全选 |
| isCurrentPageIndeterminate | () => boolean | 当前页是否部分选中 |
| clearAllSelection | () => void | 清空所有选中状态 |

### createCrossPageSelectionColumn(options?)

#### 参数
- `options.width?`: 列宽度，默认50
- `options.align?`: 对齐方式，默认'center'

#### 返回值
返回VXE Table的列配置对象

### CrossPageCheckbox组件属性

| 属性名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| row | any | 否 | 行数据（行级使用时必填） |
| isRowSelected | Function | 是 | 检查行选中状态的函数 |
| toggleRowSelection | Function | 是 | 切换行选中状态的函数 |
| toggleAllCurrentPage | Function | 是 | 全选当前页的函数 |
| isAllCurrentPageSelected | Function | 是 | 检查当前页全选状态的函数 |
| isCurrentPageIndeterminate | Function | 是 | 检查当前页部分选中状态的函数 |
| checkboxKey | number | 是 | 强制刷新的key |
## 注意事项

1. **ID字段**: 确保你的数据有唯一的`id`字段
2. **Grid API**: 必须传入正确的gridApi引用
3. **模板名称**: 使用固定的模板名称 `crossPageCheckbox` 和 `crossPageCheckboxHeader`
4. **清理状态**: 在适当的时机调用 `clearAllSelection()` 清理选中状态