<script setup lang="ts">
import { getCurrentInstance, nextTick, ref, watch } from 'vue';

import { ElMessage } from 'element-plus';

import { $t } from '#/locales';

import {
  createCustomerKey,
  deleteCustomerKey,
  getCustomerKeys,
} from '../../../api/core/license';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
});
const emit = defineEmits(['update:modelValue', 'keyStatusChange']);
const { proxy } = getCurrentInstance();

// 客户列表
const customers = [
  { label: $t('licenseManage.customer.a'), value: 'a' },
  { label: $t('licenseManage.customer.b'), value: 'b' },
];

const selectedCustomer = ref(props.modelValue || ''); // 当前选中客户
const keyList = ref<any[]>([]); // 当前客户密钥列表
const hasKey = ref(false); // 是否有密钥
const showDialog = ref(false); // Dialog显示
const newKeyName = ref(''); // 新密钥名称
const addKeyLoading = ref(false); // 新增密钥loading
const addKeySuccess = ref(false); // 新增密钥成功提示
const keyInputRef = ref(); // 输入框ref

// 监听外部modelValue变化
watch(
  () => props.modelValue,
  (val) => {
    selectedCustomer.value = val;
    if (val) fetchKeys(val);
  },
  { immediate: true },
);

// 选择客户时，更新modelValue并拉取密钥
function onCustomerChange(val: string) {
  emit('update:modelValue', val);
  fetchKeys(val);
  showDialog.value = false;
}

// 拉取客户密钥
async function fetchKeys(customerId: string) {
  if (!customerId) {
    keyList.value = [];
    hasKey.value = false;
    emit('keyStatusChange', false);
    return;
  }
  const keys = await getCustomerKeys(customerId);
  keyList.value = keys;
  hasKey.value = keys.length > 0;
  emit('keyStatusChange', hasKey.value);
}

// 点击logo按钮，未选客户时弹出提示，否则弹出Dialog
function onLogoClick() {
  if (!selectedCustomer.value) {
    proxy?.$message?.warning($t('licenseManage.customer.select'));
    return;
  }
  showDialog.value = true;
  newKeyName.value = '';
  addKeySuccess.value = false;
  nextTick(() => {
    keyInputRef.value?.focus();
  });
}

// 新增密钥
async function onAddKey() {
  if (!newKeyName.value || !selectedCustomer.value) return;
  addKeyLoading.value = true;
  addKeySuccess.value = false;
  await createCustomerKey(selectedCustomer.value, { name: newKeyName.value });
  addKeyLoading.value = false;
  addKeySuccess.value = true;
  fetchKeys(selectedCustomer.value);
  newKeyName.value = '';
  ElMessage.success($t('licenseManage.key.addSuccess'));
  setTimeout(() => {
    addKeySuccess.value = false;
  }, 800);
}

// 切换密钥（这里只做提示，可扩展实际业务）
function onSwitchKey(key) {
  proxy?.$message?.success($t('licenseManage.key.switchSuccess') + key.name);
  showDialog.value = false;
}

// 删除密钥
async function onDeleteKey(keyId) {
  await deleteCustomerKey(keyId);
  fetchKeys(selectedCustomer.value);
}
</script>

<template>
  <div class="customer-selector">
    <!-- 客户选择下拉框和密钥按钮同一行 -->
    <div class="customer-row">
      <el-select
        v-model="selectedCustomer"
        :placeholder="$t('licenseManage.customer.select')"
        @change="onCustomerChange"
        clearable
      >
        <el-option
          v-for="item in customers"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <span
        class="key-logo"
        :class="selectedCustomer ? (hasKey ? 'colored' : 'gray') : 'gray'"
        @click="onLogoClick"
      >
        🔑
      </span>
    </div>
    <!-- 密钥管理Dialog -->
    <el-dialog
      v-model="showDialog"
      :title="$t('licenseManage.key.manage')"
      width="480px"
      :close-on-click-modal="false"
      :destroy-on-close="true"
    >
      <div class="dialog-content">
        <!-- 新增密钥输入区 -->
        <div class="add-key-block">
          <span style="font-size: 14px; font-weight: bold">
            {{ $t('licenseManage.key.add') }}&nbsp;&nbsp;
          </span>
          <el-input
            v-model="newKeyName"
            :placeholder="$t('licenseManage.key.inputName')"
            ref="keyInputRef"
            @keyup.enter="onAddKey"
            style="width: 220px; margin-right: 8px"
          />
          <el-button
            type="primary"
            size="small"
            @click="onAddKey"
            :loading="addKeyLoading"
          >
            {{ $t('licenseManage.form.save') }}
          </el-button>
        </div>
        <!-- 密钥列表 -->
        <div class="key-list-block">
          <div
            v-if="keyList.length === 0"
            style="margin-top: 16px; color: #999"
          >
            {{ $t('licenseManage.key.empty') }}
          </div>
          <el-table
            v-else
            :data="keyList"
            border
            size="small"
            style="margin-top: 16px"
          >
            <el-table-column
              prop="name"
              :label="$t('licenseManage.key.name')"
              min-width="120"
            />
            <el-table-column
              prop="createdAt"
              :label="$t('licenseManage.key.createdAt')"
              min-width="120"
            />
            <el-table-column
              :label="$t('licenseManage.actionTitle')"
              min-width="120"
            >
              <template #default="scope">
                <div style="display: flex; gap: 2px; align-items: center">
                  <el-button
                    size="small"
                    type="success"
                    @click="onSwitchKey(scope.row)"
                  >
                    {{ $t('licenseManage.key.switch') }}
                  </el-button>
                  <el-popconfirm
                    @confirm="onDeleteKey(scope.row.id)"
                    :title="$t('licenseManage.key.deleteConfirm')"
                    :width="180"
                    popper-class="popconfirm-single-line"
                  >
                    <template #reference>
                      <el-button size="small" type="danger">
                        {{ $t('licenseManage.action.delete') }}
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.customer-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 40px;
}

.customer-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.customer-label {
  min-width: 80px;
  margin-right: 4px;
  font-size: 14px;
  font-weight: normal;
  color: #fff;
}

.el-select {
  min-width: 180px;
}

.key-logo {
  display: flex;
  align-items: center;
  font-size: 22px;
  cursor: pointer;

  /* 无hover变色 */
  transition: none;
}

.key-logo.gray {
  color: #888;
  filter: grayscale(0.7) brightness(1.2);
}

.key-logo.colored {
  color: #ffd700;
  filter: drop-shadow(0 0 2px #ffd700);
}

.dialog-content {
  padding: 8px 0;
}

.add-key-block {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.key-list-block {
  margin-top: 8px;
}

.popconfirm-single-line .el-popconfirm__main {
  white-space: nowrap;
}
</style>
