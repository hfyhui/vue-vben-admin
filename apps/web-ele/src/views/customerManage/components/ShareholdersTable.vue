<script lang="ts" setup>
import { ref, watch } from 'vue';

import { $t } from '#/locales';

const props = defineProps<{
  idTypeOptions?: Array<{ label: string; value: string }>;
  modelValue?: any[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: any[]): void;
  (e: 'change', value: any[]): void;
}>();

const idTypeOptions = props.idTypeOptions || [];
const shareholders = ref<any[]>([]);

watch(
  () => props.modelValue,
  (newVal) => {
    shareholders.value =
      newVal && Array.isArray(newVal)
        ? newVal.map((item) => ({
            ...item,
            isEditing: false,
          }))
        : [];
  },
  { immediate: true },
);

// 添加股东
const addShareholder = () => {
  const newShareholder = {
    shareholderName: '',
    shareholderIdType: '',
    shareholderIdNumber: '',
    isEditing: true, // 新增时直接进入编辑模式
  };
  shareholders.value.push(newShareholder);
};

// 删除股东
const removeShareholder = (index: number) => {
  shareholders.value.splice(index, 1);
  emitChange();
};

const updateShareholder = (index: number, field: string, value: any) => {
  shareholders.value[index][field] = value;
};

const editRow = (index: number) => {
  shareholders.value[index].isEditing = true;
};

const saveRow = (index: number) => {
  shareholders.value[index].isEditing = false;
  // 过滤掉空的股东信息
  const validShareholders = shareholders.value.filter(
    (shareholder) =>
      shareholder.shareholderName &&
      shareholder.shareholderIdType &&
      shareholder.shareholderIdNumber,
  );
  shareholders.value = validShareholders;
  emitChange();
};

const cancelRow = (index: number) => {
  shareholders.value[index].isEditing = false;
  // 恢复原始数据
  shareholders.value[index] =
    props.modelValue && Array.isArray(props.modelValue)
      ? {
          ...props.modelValue[index],
          isEditing: false,
        }
      : {
          ...shareholders.value[index],
          isEditing: false,
        };
};

// 触发数据变化事件
const emitChange = () => {
  const cleanShareholders = shareholders.value.map(
    ({ id: _id, isEditing: _isEditing, ...rest }) => rest,
  );
  emit('update:modelValue', cleanShareholders);
  emit('change', cleanShareholders);
};

// 默认导出组件
defineExpose({
  shareholders,
  addShareholder,
  removeShareholder,
  updateShareholder,
  editRow,
  saveRow,
  cancelRow,
});
</script>

<template>
  <div class="shareholders-table">
    <div class="table-header">
      <el-button type="primary" size="small" @click="addShareholder">
        {{ $t('customerManage.shareholder.add') }}
      </el-button>
    </div>

    <el-table :data="shareholders" border style="width: 100%">
      <el-table-column
        :label="$t('customerManage.shareholder.name')"
        width="150"
      >
        <template #default="{ row, $index }">
          <template v-if="row.isEditing">
            <el-input
              v-model="row.shareholderName"
              :placeholder="$t('customerManage.shareholder.namePlaceholder')"
              maxlength="20"
              @input="
                (value) => updateShareholder($index, 'shareholderName', value)
              "
            />
          </template>
          <template v-else>
            <span>{{ row.shareholderName || '-' }}</span>
          </template>
        </template>
      </el-table-column>

      <el-table-column
        :label="$t('customerManage.shareholder.idType')"
        width="150"
      >
        <template #default="{ row, $index }">
          <template v-if="row.isEditing">
            <el-select
              v-model="row.shareholderIdType"
              :placeholder="$t('customerManage.shareholder.idTypePlaceholder')"
              style="width: 100%"
              filterable
              clearable
              @change="
                (value) => updateShareholder($index, 'shareholderIdType', value)
              "
            >
              <el-option
                v-for="option in idTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </template>
          <template v-else>
            <span>{{ row.shareholderIdType || '-' }}</span>
          </template>
        </template>
      </el-table-column>

      <el-table-column
        :label="$t('customerManage.shareholder.idNo')"
        width="150"
      >
        <template #default="{ row, $index }">
          <template v-if="row.isEditing">
            <el-input
              v-model="row.shareholderIdNumber"
              :placeholder="$t('customerManage.shareholder.idNoPlaceholder')"
              maxlength="20"
              @input="
                (value) =>
                  updateShareholder($index, 'shareholderIdNumber', value)
              "
            />
          </template>
          <template v-else>
            <span>{{ row.shareholderIdNumber || '-' }}</span>
          </template>
        </template>
      </el-table-column>

      <el-table-column
        :label="$t('customerManage.shareholder.action')"
        width="150"
      >
        <template #default="{ row, $index }">
          <template v-if="row.isEditing">
            <el-button type="success" size="small" @click="saveRow($index)">
              {{ $t('customerManage.shareholder.save') }}
            </el-button>
            <el-button type="info" size="small" @click="cancelRow($index)">
              {{ $t('customerManage.shareholder.cancel') }}
            </el-button>
          </template>
          <template v-else>
            <el-button type="primary" size="small" @click="editRow($index)">
              {{ $t('customerManage.shareholder.edit') }}
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="removeShareholder($index)"
            >
              {{ $t('customerManage.shareholder.delete') }}
            </el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.table-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

/* 只读模式下的样式 */
.el-table .cell {
  line-height: 1.5;
}

.el-table .cell span {
  color: #606266;
}

/* 操作按钮间距 */
.el-button + .el-button {
  margin-left: 4px;
}
</style>
