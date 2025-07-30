<script lang="ts" setup>
import { ref, watch } from 'vue';

import { $t } from '#/locales';

const props = defineProps<{
  idTypeOptions?: Array<{ label: string; value: string }>;
  modelValue: any[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: any[]): void;
  (e: 'change', value: any[]): void;
}>();

// 默认证件类型选项
const defaultIdTypeOptions = [
  $t('customerManage.form.idTypeIdCard'),
  $t('customerManage.form.idTypeSocialCard'),
  $t('customerManage.form.idTypeHKMacao'),
  $t('customerManage.form.idTypeHousehold'),
  $t('customerManage.form.idTypeOfficer'),
  $t('customerManage.form.idTypeArmedPolice'),
  $t('customerManage.form.idTypeVeteran'),
  $t('customerManage.form.idTypeDisability'),
  $t('customerManage.form.idTypeLiberiaPassport'),
  $t('customerManage.form.idTypePassport'),
  $t('customerManage.form.idTypeHKMacaoMainland'),
  $t('customerManage.form.idTypeTaiwanMainland'),
  $t('customerManage.form.idTypePermanentResident'),
  $t('customerManage.form.idTypeForeignerPermit'),
].map((label) => ({ label, value: label }));

// 使用传入的选项或默认选项
const idTypeOptions = props.idTypeOptions || defaultIdTypeOptions;

// 内部股东数据
const shareholders = ref<any[]>([]);

// 监听外部数据变化
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
    id: Date.now(),
    name: '',
    idType: '',
    idNo: '',
    isEditing: true, // 新增时直接进入编辑模式
  };
  shareholders.value.push(newShareholder);
};

// 删除股东
const removeShareholder = (index: number) => {
  shareholders.value.splice(index, 1);
  emitChange();
};

// 更新股东信息
const updateShareholder = (index: number, field: string, value: any) => {
  shareholders.value[index][field] = value;
};

// 编辑行
const editRow = (index: number) => {
  shareholders.value[index].isEditing = true;
};

// 保存行
const saveRow = (index: number) => {
  shareholders.value[index].isEditing = false;
  // 过滤掉空的股东信息
  const validShareholders = shareholders.value.filter(
    (shareholder) => shareholder.name && shareholder.idType && shareholder.idNo,
  );
  shareholders.value = validShareholders;
  emitChange();
};

// 取消行
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
  emit('update:modelValue', shareholders.value);
  emit('change', shareholders.value);
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
        width="200"
      >
        <template #default="{ row, $index }">
          <template v-if="row.isEditing">
            <el-input
              v-model="row.name"
              :placeholder="$t('customerManage.shareholder.namePlaceholder')"
              maxlength="20"
              @input="(value) => updateShareholder($index, 'name', value)"
            />
          </template>
          <template v-else>
            <span>{{ row.name || '-' }}</span>
          </template>
        </template>
      </el-table-column>

      <el-table-column
        :label="$t('customerManage.shareholder.idType')"
        width="200"
      >
        <template #default="{ row, $index }">
          <template v-if="row.isEditing">
            <el-select
              v-model="row.idType"
              :placeholder="$t('customerManage.shareholder.idTypePlaceholder')"
              style="width: 100%"
              filterable
              clearable
              @change="(value) => updateShareholder($index, 'idType', value)"
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
            <span>{{ row.idType || '-' }}</span>
          </template>
        </template>
      </el-table-column>

      <el-table-column
        :label="$t('customerManage.shareholder.idNo')"
        width="200"
      >
        <template #default="{ row, $index }">
          <template v-if="row.isEditing">
            <el-input
              v-model="row.idNo"
              :placeholder="$t('customerManage.shareholder.idNoPlaceholder')"
              maxlength="20"
              @input="(value) => updateShareholder($index, 'idNo', value)"
            />
          </template>
          <template v-else>
            <span>{{ row.idNo || '-' }}</span>
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
.shareholders-table {
  padding: 20px;
  margin-top: 20px;
}

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
