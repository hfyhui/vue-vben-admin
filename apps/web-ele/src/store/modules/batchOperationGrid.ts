import { defineStore } from 'pinia';

/** 与旧版 Vuex `Account/selectedGridCells` 一致：批量操作表格多选格子 */
export type BatchOperationGridCell = {
  accountIndex: number;
  fieldProp: string;
  rowIndex: number;
};

export const useBatchOperationGridStore = defineStore('batchOperationGrid', {
  state: () => ({
    selectedGridCells: [] as BatchOperationGridCell[],
  }),
  actions: {
    setSelectedGridCells(cells: BatchOperationGridCell[]) {
      this.selectedGridCells = cells;
    },
    clearSelectedGridCells() {
      this.selectedGridCells = [];
    },
  },
});
