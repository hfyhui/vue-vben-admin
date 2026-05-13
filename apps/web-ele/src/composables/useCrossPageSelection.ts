import { computed, ref } from 'vue';

/**
 * 跨分页选择功能的组合函数
 * @param gridApiRef VXE Grid API的引用
 * @returns 跨分页选择相关的状态和方法
 */
export function useCrossPageSelection(gridApiRef: any) {
  // 跨分页选中状态管理 - 使用简单的数组存储ID
  const selectedRowIds = ref<string[]>([]);

  // 强制checkbox重新渲染的key
  const checkboxKey = ref(0);

  // 强制刷新checkbox
  const forceRefreshCheckboxes = () => {
    checkboxKey.value++;
  };

  // 获取当前页数据的通用方法
  const getCurrentPageData = () => {
    try {
      const vxeGrid = gridApiRef.value?.grid;
      if (!vxeGrid) return [];

      // 优先使用getTableData方法获取当前页可见数据
      const tableData = vxeGrid.getTableData?.();
      if (tableData?.visibleData?.length > 0) {
        return tableData.visibleData;
      }

      // 备选方案：使用getData方法
      const data = vxeGrid.getData?.();
      if (data && data.length > 0) {
        return data;
      }

      return [];
    } catch (error) {
      console.warn('获取当前页数据失败:', error);
      return [];
    }
  };

  // 检查某行是否被选中
  const isRowSelected = (row: any) => {
    return selectedRowIds.value.includes(row.id);
  };

  // 简单直接的选中状态管理
  const toggleRowSelection = (row: any) => {
    const isSelected = selectedRowIds.value.includes(row.id);
    if (isSelected) {
      // 取消选中：从列表中移除
      selectedRowIds.value = selectedRowIds.value.filter((id) => id !== row.id);
    } else {
      // 选中：添加到列表
      selectedRowIds.value.push(row.id);
    }
  };

  // 全选/取消全选当前页
  const toggleAllCurrentPage = () => {
    try {
      const currentPageData = getCurrentPageData();
      if (currentPageData.length === 0) return;
      // 检查当前页是否全部选中
      const allSelected = currentPageData.every((row: any) =>
        selectedRowIds.value.includes(row.id),
      );
      if (allSelected) {
        // 取消全选：移除当前页所有ID
        const currentPageIds = new Set(
          currentPageData.map((row: any) => row.id),
        );
        selectedRowIds.value = selectedRowIds.value.filter(
          (id) => !currentPageIds.has(id),
        );
      } else {
        // 全选：添加当前页所有ID
        currentPageData.forEach((row: any) => {
          if (!selectedRowIds.value.includes(row.id)) {
            selectedRowIds.value.push(row.id);
          }
        });
      }
      // 强制刷新checkbox显示状态
      forceRefreshCheckboxes();
    } catch (error) {
      console.error('全选操作失败:', error);
    }
  };
  // 检查当前页是否全选
  const isAllCurrentPageSelected = () => {
    try {
      const currentPageData = getCurrentPageData();
      if (currentPageData.length === 0) return false;
      return currentPageData.every((row: any) =>
        selectedRowIds.value.includes(row.id),
      );
    } catch {
      return false;
    }
  };

  // 检查当前页是否部分选中
  const isCurrentPageIndeterminate = () => {
    try {
      const currentPageData = getCurrentPageData();
      if (currentPageData.length === 0) return false;
      const selectedCount = currentPageData.filter((row: any) =>
        selectedRowIds.value.includes(row.id),
      ).length;
      return selectedCount > 0 && selectedCount < currentPageData.length;
    } catch {
      return false;
    }
  };

  // 清空所有选中状态
  const clearAllSelection = () => {
    selectedRowIds.value = [];
    forceRefreshCheckboxes();
  };
  // 计算属性：选中数量
  const selectedCount = computed(() => selectedRowIds.value.length);
  // 计算属性：是否有选中项
  const hasSelection = computed(() => selectedRowIds.value.length > 0);
  return {
    // 状态
    selectedRowIds,
    checkboxKey,
    selectedCount,
    hasSelection,

    // 方法
    isRowSelected,
    toggleRowSelection,
    toggleAllCurrentPage,
    isAllCurrentPageSelected,
    isCurrentPageIndeterminate,
    clearAllSelection,
    forceRefreshCheckboxes,
    getCurrentPageData,
  };
}

/**
 * 创建跨分页选择的表格列配置
 * @param options 配置选项
 * @returns VXE Table的列配置
 */
export function createCrossPageSelectionColumn(
  options: {
    align?: string;
    width?: number;
  } = {},
) {
  return {
    field: 'crossPageCheckbox',
    title: '',
    width: options.width || 50,
    align: options.align || 'center',
    slots: {
      default: 'crossPageCheckbox',
      header: 'crossPageCheckboxHeader',
    },
  };
}

/**
 * 跨分页选择的模板组件Props
 */
export interface CrossPageSelectionTemplateProps {
  row?: any;
  isRowSelected: (row: any) => boolean;
  toggleRowSelection: (row: any) => void;
  toggleAllCurrentPage: () => void;
  isAllCurrentPageSelected: () => boolean;
  isCurrentPageIndeterminate: () => boolean;
  checkboxKey: number;
}
