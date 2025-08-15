<template>
  <!-- 行级选择框 -->
  <ElCheckbox 
    v-if="row"
    :key="`checkbox-${row.id}-${checkboxKey}`"
    :model-value="isRowSelected(row)"
    @change="toggleRowSelection(row)"
    class="cross-page-checkbox row-checkbox"
  />
  
  <!-- 表头全选框 -->
  <ElCheckbox 
    v-else
    :key="`header-checkbox-${checkboxKey}`"
    :model-value="isAllCurrentPageSelected()"
    :indeterminate="isCurrentPageIndeterminate()"
    @change="toggleAllCurrentPage"
    class="cross-page-checkbox header-checkbox"
  />
</template>

<script lang="ts" setup>
import { ElCheckbox } from 'element-plus';

interface Props {
  row?: any;
  isRowSelected: (row: any) => boolean;
  toggleRowSelection: (row: any) => void;
  toggleAllCurrentPage: () => void;
  isAllCurrentPageSelected: () => boolean;
  isCurrentPageIndeterminate: () => boolean;
  checkboxKey: number;
}

defineProps<Props>();

// 添加组件名称，便于调试
defineOptions({
  name: 'CrossPageCheckbox'
});
</script>

<style scoped>
/* 基础样式：统一表头和行内checkbox的样式 */
.cross-page-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* 移除checkbox的动画效果，避免闪烁 */
.cross-page-checkbox :deep(.el-checkbox__input) {
  transition: none !important;
}

.cross-page-checkbox :deep(.el-checkbox__inner) {
  transition: none !important;
  width: 14px;
  height: 14px;
  border-radius: 2px;
}

.cross-page-checkbox :deep(.el-checkbox__inner::after) {
  transition: none !important;
}

/* 确保选中状态样式一致 */
.cross-page-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.cross-page-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner::after) {
  border-color: #fff;
}

/* 确保半选状态样式一致（表头用） */
.cross-page-checkbox :deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner) {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.cross-page-checkbox :deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner::before) {
  content: '';
  position: absolute;
  display: block;
  background-color: #fff;
  height: 3px;
  width: 13px;
  left: 0px;
  top: 5px
}

/* 行内checkbox样式 */
.row-checkbox {
  /* 行内特定样式，如果需要的话 */
}

/* 表头checkbox样式 */
.header-checkbox {
  
  /* 表头特定样式，如果需要的话 */
}

/* 悬停效果统一 */
.cross-page-checkbox:hover :deep(.el-checkbox__inner) {
  border-color: var(--el-color-primary);
}

/* 禁用时样式统一 */
.cross-page-checkbox :deep(.el-checkbox__input.is-disabled .el-checkbox__inner) {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-border-color);
  cursor: not-allowed;
}
</style>
