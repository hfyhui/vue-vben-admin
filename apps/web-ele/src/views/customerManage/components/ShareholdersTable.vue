<script lang="ts" setup>
import { ref, watch } from 'vue';

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
  '居民身份证',
  '社会保障卡',
  '港澳证',
  '户口簿',
  '军官证/士兵证/文职证',
  '武警证',
  '退役军人优待证',
  '残疾人证',
  '利比里亚护照',
  '护照',
  '港澳居民来往内地通行证',
  '台湾居民来往大陆通行证',
  '外国人永久居留身份证',
  '外国人入境许可证',
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
        新增股东
      </el-button>
    </div>

    <el-table :data="shareholders" border style="width: 100%">
      <el-table-column label="股东姓名" width="200">
        <template #default="{ row, $index }">
          <template v-if="row.isEditing">
            <el-input
              v-model="row.name"
              placeholder="请输入股东姓名"
              maxlength="20"
              @input="(value) => updateShareholder($index, 'name', value)"
            />
          </template>
          <template v-else>
            <span>{{ row.name || '-' }}</span>
          </template>
        </template>
      </el-table-column>

      <el-table-column label="证件类型" width="200">
        <template #default="{ row, $index }">
          <template v-if="row.isEditing">
            <el-select
              v-model="row.idType"
              placeholder="请选择证件类型"
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

      <el-table-column label="证件号码" width="200">
        <template #default="{ row, $index }">
          <template v-if="row.isEditing">
            <el-input
              v-model="row.idNo"
              placeholder="请输入证件号码"
              maxlength="20"
              @input="(value) => updateShareholder($index, 'idNo', value)"
            />
          </template>
          <template v-else>
            <span>{{ row.idNo || '-' }}</span>
          </template>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="150">
        <template #default="{ row, $index }">
          <template v-if="row.isEditing">
            <el-button type="success" size="small" @click="saveRow($index)">
              保存
            </el-button>
            <el-button type="info" size="small" @click="cancelRow($index)">
              取消
            </el-button>
          </template>
          <template v-else>
            <el-button type="primary" size="small" @click="editRow($index)">
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="removeShareholder($index)"
            >
              删除
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
