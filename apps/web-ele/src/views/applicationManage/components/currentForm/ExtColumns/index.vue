<script lang="ts" setup>
import { CirclePlus } from '@element-plus/icons-vue';
import { computed, onMounted, ref, watch } from 'vue';

import { ElMessage } from 'element-plus';

import { getDynamicFormColumnConfigApi } from '#/api/core/application';
import { $t } from '#/locales';

const props = withDefaults(
  defineProps<{
    modelValue?: Record<string, any>[];
    baseColumns?: Record<string, any>[];
  }>(),
  {
    modelValue: () => [],
    baseColumns: () => [],
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>[]): void;
}>();

const selectModel = ref<string[]>([]);
const dragIndex = ref(-1);
const dynamicColumnConfig = ref<Record<string, any>[]>([]);

const extColumns = computed<Record<string, any>[]>({
  get() {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  },
  set(value) {
    emit('update:modelValue', Array.isArray(value) ? value : []);
  },
});

const fieldNames = {
  label: 'label',
  value: 'prop',
  children: 'children',
};

watch(
  () => [props.baseColumns, props.modelValue] as const,
  ([baseColumns, modelValue]) => {
    const baseList = baseColumns;
    const extList = modelValue;
    if (!extList.length && baseList.length) {
      // 对齐旧版：extColumns 为空时直接拷贝 baseFormColumns
      extColumns.value = [...baseList];
    }
  },
  { immediate: true },
);

function addEvent() {
  if (!(selectModel.value && selectModel.value.length >= 2)) {
    return;
  }
  const [parentProp, childProp] = selectModel.value;
  const parent = dynamicColumnConfig.value.find((item) => String(item.prop) === String(parentProp));
  const source = (parent?.children || []).find(
    (item: Record<string, any>) => String(item.prop) === String(childProp),
  );
  if (!source?.prop) {
    ElMessage.warning($t('applicationManage.currentForm.extColumns.selectValidField'));
    return;
  }
  const isExist = extColumns.value.some((item) => String(item?.prop) === String(source.prop));
  if (isExist) {
    ElMessage.warning($t('applicationManage.currentForm.extColumns.duplicateField'));
    return;
  }
  const next = [...extColumns.value];
  next.push({
    ...source,
    status: 'enable',
  });
  extColumns.value = next;
  selectModel.value = [];
}

function removeEvent(item: Record<string, any>) {
  const target = item;
  if (target?.currentId) return;
  const next = [...extColumns.value];
  const index = next.findIndex((it) => String(it?.prop) === String(item?.prop));
  if (index < 0) return;
  next.splice(index, 1);
  extColumns.value = next;
}

function updateItem(index: number, patch: Record<string, any>) {
  const next = [...extColumns.value];
  next[index] = {
    ...next[index],
    ...patch,
  };
  extColumns.value = next;
}

function dropdownClick(command: string, item: Record<string, any>, index: number) {
  if (command === 'del') {
    removeEvent(item);
    return;
  }
  if (command === 'enable' || command === 'disable') {
    updateItem(index, { status: command });
  }
}

function onDropdownCommand(command: any, item: Record<string, any>, index: number) {
  dropdownClick(String(command), item, index);
}

function onLabelChange(index: number, val: any) {
  updateItem(index, { label: String(val ?? '') });
}

function onDragStart(index: number) {
  dragIndex.value = index;
}

function onDrop(dropIndex: number) {
  if (dragIndex.value < 0 || dragIndex.value === dropIndex) return;
  const next = [...extColumns.value];
  const [moved] = next.splice(dragIndex.value, 1);
  if (!moved) return;
  next.splice(dropIndex, 0, moved);
  extColumns.value = next;
  dragIndex.value = -1;
}

async function fetchDynamicColumnConfig() {
  try {
    const res = await getDynamicFormColumnConfigApi();
    const data = (res as any)?.data;
    const list = Array.isArray(data) ? data : [];
    dynamicColumnConfig.value = list.map((el: Record<string, any>) => {
      const children = Array.isArray(el?.children)
        ? el.children.map((ele: Record<string, any>) => {
            const child: Record<string, any> = {
              ...ele,
              label: ele.comment || ele.field,
              prop: ele.field,
            };
            delete child.children;
            return child;
          })
        : [];
      return {
        ...el,
        label: el.tableName,
        prop: el.tableName,
        children,
      };
    });
  } catch {
    dynamicColumnConfig.value = [];
    ElMessage.warning($t('applicationManage.currentForm.extColumns.loadConfigFailed'));
  }
}

onMounted(() => {
  fetchDynamicColumnConfig();
});
</script>

<template>
  <div>
    <div class="header">
      <el-cascader
        v-model="selectModel"
        :options="dynamicColumnConfig"
        :props="fieldNames"
        clearable
        filterable
        style="width: 500px"
        :placeholder="$t('applicationManage.currentForm.extColumns.selectFieldPlaceholder')"
      />
      <el-button type="primary" @click="addEvent">
        {{ $t('applicationManage.currentForm.common.add') }}
      </el-button>
    </div>

    <div class="columns-box">
      <div
        v-for="(item, index) in extColumns"
        :key="String(item.prop || index)"
        :class="[
          'columns-item',
          { disabled: item.status === 'disable', border: extColumns.length === 1 },
        ]"
        draggable="true"
        @dragstart="onDragStart(index)"
        @dragover.prevent
        @drop="onDrop(index)"
      >
        <p class="item-header">
          <el-tag type="primary">{{ item.prop }}</el-tag>
          <el-dropdown
            trigger="click"
            @command="onDropdownCommand($event, item, index)"
          >
            <span class="dropdown-trigger" @click.stop>
              <el-icon class="dropdown-icon" :size="18">
                <CirclePlus />
              </el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  :command="item.status === 'disable' ? 'enable' : 'disable'"
                >
                  {{
                    item.status === 'disable'
                      ? $t('applicationManage.currentForm.common.enable')
                      : $t('applicationManage.currentForm.common.disable')
                  }}
                </el-dropdown-item>
                <el-dropdown-item v-if="!item.currentId" command="del">
                  {{ $t('applicationManage.currentForm.common.delete') }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </p>
        <span v-if="item.currentId" class="label">{{ item.label }}</span>
        <el-input
          v-else
          :model-value="item.label"
          @update:model-value="onLabelChange(index, $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.columns-box {
  margin-top: 20px;
  width: 100%;
  display: flex;
  overflow-x: auto;
  line-height: 1.5;
}

.columns-item {
  flex-shrink: 0;
  padding: 5px 10px;
  min-width: 150px;
  border-top: 1px solid rgb(0 0 0 / 30%);
  border-right: 1px solid rgb(0 0 0 / 30%);
  border-bottom: 1px solid rgb(0 0 0 / 30%);
  cursor: move;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}

.columns-item:first-child {
  border-left: 1px solid rgb(0 0 0 / 30%);
  border-radius: 4px 0 0 4px;
}

.columns-item:last-child {
  border-radius: 0 4px 4px 0;
}

.columns-item.border {
  border-radius: 4px;
}

.columns-item.disabled {
  background-color: rgb(0 0 0 / 10%);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.dropdown-trigger {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  line-height: 1;
}

.dropdown-icon {
  color: var(--el-color-primary);
}

.label {
  display: inline-block;
  width: 100%;
  height: 32px;
  padding: 4px 0;
  color: rgb(0 0 0 / 65%);
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid transparent;
}
</style>
