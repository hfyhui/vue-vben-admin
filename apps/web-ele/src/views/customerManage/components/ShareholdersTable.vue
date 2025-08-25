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
  // 新增股东后立即触发数据变化，让父组件知道有股东信息需要校验
  emitChange();
};

// 校验股东信息是否完整
const validateShareholders = () => {
  if (shareholders.value.length === 0) {
    return false;
  }
  
  return shareholders.value.every(shareholder => 
    shareholder.shareholderName && 
    shareholder.shareholderIdType && 
    shareholder.shareholderIdNumber
  );
};

// 获取校验错误信息
const getValidationErrors = () => {
  const errors: string[] = [];
  
  if (shareholders.value.length === 0) {
    errors.push($t('customerManage.message.addShareholders'));
    return errors;
  }
  
  shareholders.value.forEach((shareholder, index) => {
    if (!shareholder.shareholderName) {
      errors.push(`第${index + 1}行股东姓名不能为空`);
    }
    if (!shareholder.shareholderIdType) {
      errors.push(`第${index + 1}行证件类型不能为空`);
    }
    if (!shareholder.shareholderIdNumber) {
      errors.push(`第${index + 1}行证件号码不能为空`);
    }
  });
  
  return errors;
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
  validateShareholders,
  getValidationErrors,
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
        <template #header>
          <span class="required-field" v-if="shareholders.length > 0">
            {{ $t('customerManage.shareholder.name') }}
            <span class="required-star">*</span>
          </span>
          <span v-else>
            {{ $t('customerManage.shareholder.name') }}
          </span>
        </template>
        <template #default="{ row, $index }">
          <el-input
            v-model="row.shareholderName"
            :placeholder="$t('customerManage.shareholder.namePlaceholder')"
            maxlength="20"
            :class="{ 'is-error': shareholders.length > 0 && !row.shareholderName }"
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
        <template #header>
          <span class="required-field" v-if="shareholders.length > 0">
            {{ $t('customerManage.shareholder.idType') }}
            <span class="required-star">*</span>
          </span>
          <span v-else>
            {{ $t('customerManage.shareholder.idType') }}
          </span>
        </template>
        <template #default="{ row, $index }">
          <el-select
            v-model="row.shareholderIdType"
            :placeholder="$t('customerManage.shareholder.idTypePlaceholder')"
            style="width: 100%"
            filterable
            clearable
            :class="{ 'is-error': shareholders.length > 0 && !row.shareholderIdType }"
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
        <template #header>
          <span class="required-field" v-if="shareholders.length > 0">
            {{ $t('customerManage.shareholder.idNo') }}
            <span class="required-star">*</span>
          </span>
          <span v-else>
            {{ $t('customerManage.shareholder.idNo') }}
          </span>
        </template>
        <template #default="{ row, $index }">
          <el-input
            v-model="row.shareholderIdNumber"
            :placeholder="$t('customerManage.shareholder.idNoPlaceholder')"
            maxlength="20"
            :class="{ 'is-error': shareholders.length > 0 && !row.shareholderIdNumber }"
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

/* 必填字段错误状态样式 */
.is-error {
  border-color: #f56c6c !important;
}

.is-error .el-input__inner {
  border-color: #f56c6c !important;
}

.is-error .el-select .el-input__inner {
  border-color: #f56c6c !important;
}

/* 必填字段标签样式 */
.el-table .el-table__header .cell {
  color: #303133;
}

/* 必填字段样式 */
.required-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 红色星号样式 */
.required-star {
  color: #f56c6c;
  font-weight: bold;
  font-size: 14px;
}
</style>
