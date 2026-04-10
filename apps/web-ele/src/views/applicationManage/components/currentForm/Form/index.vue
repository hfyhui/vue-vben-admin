<script lang="ts" setup>
import { Delete, Plus, Upload, ArrowDown } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';

import { $t } from '#/locales';

import ColumnModel from './ColumnModel.vue';

const props = withDefaults(
  defineProps<{
    modelValue?: Record<string, any>[];
    extColumns?: Record<string, any>[];
  }>(),
  {
    modelValue: () => [],
    extColumns: () => [],
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>[]): void;
  (e: 'update:extColumns', value: Record<string, any>[]): void;
}>();

const columnModelRef = ref<InstanceType<typeof ColumnModel>>();
const rowInfo = ref<Record<string, any>>({});
const dragIndex = ref(-1);

const columns = computed<Record<string, any>[]>({
  get() {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  },
  set(value) {
    emit('update:modelValue', Array.isArray(value) ? value : []);
  },
});

const extList = computed<Record<string, any>[]>({
  get() {
    return Array.isArray(props.extColumns) ? props.extColumns : [];
  },
  set(value) {
    emit('update:extColumns', Array.isArray(value) ? value : []);
  },
});

function isUnique(data: Record<string, any>, excludeCurrentId?: string | null) {
  const { label, prop } = data;
  return !columns.value.some((item) => {
    const clash = item.prop === prop || item.label === label;
    const notSelf = excludeCurrentId ? item.currentId !== excludeCurrentId : true;
    return clash && notSelf;
  });
}

function onEditInfo(data: Record<string, any>) {
  const payload = { ...data, status: 'enable' };
  const existing = columns.value.find((item) => item.currentId === data.currentId);
  let next = [...columns.value];
  let nextExt = [...extList.value];

  if (existing) {
    if (!isUnique(data, data.currentId)) {
      ElMessage.warning($t('applicationManage.currentForm.formDesigner.duplicateNameWarning'));
      return;
    }
    const idx = next.findIndex((item) => item.currentId === data.currentId);
    next[idx] = payload;
    const extIdx = nextExt.findIndex((item) => item.currentId === data.currentId);
    if (extIdx !== -1) {
      nextExt[extIdx] = payload;
    }
    columnModelRef.value?.closeFn?.();
  } else if (isUnique(data)) {
    next.push(payload);
    nextExt.push(payload);
    columnModelRef.value?.closeFn?.();
  } else {
    ElMessage.warning($t('applicationManage.currentForm.formDesigner.duplicateNameWarning'));
    return;
  }

  columns.value = next;
  extList.value = nextExt;
}

function viewFormFn(item?: Record<string, any>) {
  const params = item?.prop ? { ...item } : {};
  rowInfo.value = params;
  columnModelRef.value?.open(params);
}

function delFn(item: Record<string, any>) {
  const idx = columns.value.findIndex((el) => el.prop === item.prop);
  if (idx < 0) return;
  const next = [...columns.value];
  next.splice(idx, 1);
  columns.value = next;

  const extIdx = extList.value.findIndex((el) => el.prop === item.prop);
  if (extIdx >= 0) {
    const nextExt = [...extList.value];
    nextExt.splice(extIdx, 1);
    extList.value = nextExt;
  }

  if (item.currentId === rowInfo.value?.currentId) {
    rowInfo.value = {};
    columnModelRef.value?.open();
  }
}

function onDragStart(index: number) {
  dragIndex.value = index;
}

function syncExtOrder(formCols: Record<string, any>[]) {
  const order = formCols.map((c) => String(c.prop));
  const map = new Map(extList.value.map((e) => [String(e.prop), e]));
  const reordered = order.map((p) => map.get(p)).filter(Boolean) as Record<string, any>[];
  if (reordered.length === order.length) {
    extList.value = reordered;
  }
}

function onDrop(dropIndex: number) {
  if (dragIndex.value < 0 || dragIndex.value === dropIndex) return;
  const next = [...columns.value];
  const [moved] = next.splice(dragIndex.value, 1);
  if (!moved) return;
  next.splice(dropIndex, 0, moved);
  columns.value = next;
  syncExtOrder(next);
  dragIndex.value = -1;
}
</script>

<template>
  <div class="default-wrap">
    <div class="form-box">
      <div
        v-for="(item, index) in columns"
        :key="String(item.currentId || item.prop || index)"
        class="draggable-column"
        draggable="true"
        @dragstart="onDragStart(index)"
        @dragover.prevent
        @drop="onDrop(index)"
        @click.stop="viewFormFn(item)"
      >
        <div :class="['label-cell', { required: item.required }]">
          <span class="text">{{ item.label }}</span>
          <el-tooltip v-if="item.controlTip" :content="item.controlTip" placement="top">
            <span class="tip-mark">?</span>
          </el-tooltip>
          <span> : </span>
        </div>

        <div class="value-cell">
          <div v-if="['uploadImg', 'uploadVideo'].includes(item.type)" class="mock-upload">
            <el-icon><Plus /></el-icon>
          </div>
          <div v-else-if="item.type === 'uploadFile'" class="mock-file-btn">
            <el-icon><Upload /></el-icon>
            {{ $t('applicationManage.currentForm.formDesigner.chooseFile') }}
          </div>
          <div v-else-if="item.type === 'textarea'" class="mock-textarea-wrap">
            <el-input
              type="textarea"
              disabled
              :autosize="{ minRows: item.minRows || 2, maxRows: item.maxRows || 6 }"
            />
            <div class="mask" />
          </div>
          <div v-else class="mock-input">
            <el-icon v-if="item.type === 'select'" class="chevron"><ArrowDown /></el-icon>
          </div>
        </div>

        <el-icon class="btn-del" @click.stop="delFn(item)">
          <Delete />
        </el-icon>
      </div>

      <el-button class="add-block" @click="viewFormFn()">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>

    <ColumnModel ref="columnModelRef" class="column-box" @edit-info="onEditInfo" />
  </div>
</template>

<style scoped>
.default-wrap {
  display: flex;
  gap: 0;
  align-items: flex-start;
  width: 100%;
}

.form-box {
  flex: 1 1 0;
  min-width: 0;
  padding-right: 20px;
}

.column-box {
  flex: 1 1 0;
  min-width: 280px;
  border-left: 1px solid var(--el-border-color);
  padding-left: 20px;
}

.draggable-column {
  cursor: move;
  line-height: 32px;
  margin-bottom: 16px;
  display: grid;
  grid-template-columns: 120px 1fr 36px;
  align-items: start;
  gap: 8px;
}

.draggable-column:hover .btn-del {
  opacity: 1;
}

.label-cell {
  text-align: right;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 4px;
  word-break: break-all;
}

.label-cell .text {
  line-height: 1.3;
  padding-top: 6px;
}

.label-cell.required::before {
  content: '*';
  color: var(--el-color-danger);
  line-height: 1.3;
  padding-top: 6px;
}

.tip-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--el-color-danger);
  color: var(--el-color-danger);
  font-size: 11px;
  cursor: help;
  margin-top: 6px;
}

.value-cell {
  min-width: 0;
}

.mock-upload {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80px;
  height: 80px;
  background: var(--el-fill-color-light);
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  color: var(--el-text-color-placeholder);
}

.mock-file-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.mock-textarea-wrap {
  position: relative;
}

.mock-textarea-wrap .mask {
  position: absolute;
  inset: 0;
  cursor: pointer;
}

.mock-input {
  height: 32px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-light);
  position: relative;
  color: var(--el-text-color-placeholder);
}

.mock-input .chevron {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
}

.btn-del {
  color: var(--el-color-danger);
  font-size: 18px;
  cursor: pointer;
  padding-top: 6px;
  opacity: 0;
  transition: opacity 0.2s;
  justify-self: center;
}

.add-block {
  width: 100%;
  margin-top: 4px;
}
</style>
