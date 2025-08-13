<script lang="ts" setup>
import { ref, watch } from 'vue';
import { Delete } from '@element-plus/icons-vue';

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
  };
  shareholders.value.push(newShareholder);
};

// 删除股东
const removeShareholder = (index: number) => {
  shareholders.value.splice(index, 1);
  emitChange();
};

// 更新股东信息时直接触发数据变化
const updateShareholder = (index: number, field: string, value: any) => {
  shareholders.value[index][field] = value;
  // 输入时直接传给后端数据
  emitChange();
};

// 根据证件类型值获取对应的标签
const getLabelByValue = (value: string) => {
  const option = idTypeOptions.find(opt => opt.value === value);
  return option ? option.label : value;
};

// 触发数据变化事件
const emitChange = () => {
  // 保留所有股东信息，包括不完整的，让父组件在提交时进行验证
  const cleanShareholders = shareholders.value.map(
    ({ id: _id, ...rest }) => rest,
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
          <el-input
            v-model="row.shareholderName"
            :placeholder="$t('customerManage.shareholder.namePlaceholder')"
            maxlength="20"
            @input="
              (value) => updateShareholder($index, 'shareholderName', value)
            "
          />
        </template>
      </el-table-column>

      <el-table-column
        :label="$t('customerManage.shareholder.idType')"
        width="150"
      >
        <template #default="{ row, $index }">
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
      </el-table-column>

      <el-table-column
        :label="$t('customerManage.shareholder.idNo')"
        width="150"
      >
        <template #default="{ row, $index }">
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
      </el-table-column>

      <el-table-column
        :label="$t('customerManage.shareholder.action')"
        width="100"
      >
        <template #default="{ $index }">
          <el-button
            type="danger"
            size="small"
            :icon="Delete"
            circle
            @click="removeShareholder($index)"
          />
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
/* 操作按钮间距 */
.el-button + .el-button {
  margin-left: 4px;
}
</style>
