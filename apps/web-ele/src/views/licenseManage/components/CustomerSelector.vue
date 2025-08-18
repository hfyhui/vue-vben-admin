<script setup lang="ts">
import type { PropType } from 'vue';

import { computed, nextTick, ref, watch } from 'vue';

import { ElMessage, ElIcon, ElTooltip } from 'element-plus';
import { Delete, Download } from '@element-plus/icons-vue';

import { $t } from '#/locales';

import {
  createCustomerKey,
  deleteCustomerKey,
  getCustomerKeys,
  downloadKeyApi
} from '../../../api/core/license';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  customerList: {
    type: Array as PropType<{ label: string; value: string }[]>,
    default: () => [],
  },
});
const emit = defineEmits([
  'update:modelValue',
  'keyStatusChange',
  'update:keyId',
]);

const customers = computed(() => props.customerList);
const customersLoading = ref(false);
const selectedCustomer = ref(props.modelValue || ''); // 当前选中客户
const keyList = ref<any[]>([]); // 当前客户密钥列表
const hasKey = ref(false); // 是否有密钥
const showDialog = ref(false); // Dialog显示
const newKeyName = ref(''); // 新密钥名称
const addKeyLoading = ref(false); // 新增密钥loading
const addKeySuccess = ref(false); // 新增密钥成功提示
const keyInputRef = ref(); // 输入框ref
const hoveredKeyId = ref<null | string>(null); // 鼠标悬停的密钥ID
const selectedKeyId = ref<null | string>(null); // 当前选中的密钥ID
const selectedKeyMap = ref<Record<string, string>>({}); // 记录每个客户选中的密钥ID
// 监听外部modelValue变化
watch(
  () => props.modelValue,
  (val) => {
    selectedCustomer.value = val;
    if (val) fetchKeys(val);
  },
  { immediate: true },
);
// 监听 keyList 变化，若有数据则默认选中第一条
watch(
  keyList,
  (list) => {
    if (list && list.length > 0) {
      // 只有未手动选中过密钥时才自动选中第一条
      if (!selectedKeyId.value) {
        const firstKeyId = String(list[0].id);
        selectedKeyId.value = firstKeyId;
        emit('update:keyId', firstKeyId);
      }
    }
  },
  { immediate: true }
);
function onCustomerChange(val: string) {
  emit('update:modelValue', val);
  selectedKeyId.value = null;
  emit('update:keyId', null);
  showDialog.value = false;
  if (val) {
    fetchKeys(val);
  }
}

// 拉取客户密钥
async function fetchKeys(customerId: string) {
  if (!customerId) {
    keyList.value = [];
    hasKey.value = false;
    emit('keyStatusChange', false);
    return;
  }
  const response = await getCustomerKeys(customerId);
  const keys = Array.isArray(response) ? response : response?.data || [];
  keyList.value = keys;
  hasKey.value = keys.length > 0;
  emit('keyStatusChange', hasKey.value);
  
  // 保证 key.id 和 selectedKeyId 都是字符串，并恢复上次选中的密钥ID
  const allKeyIds = keys.map(k => String(k.id));
  if (selectedKeyMap.value[customerId]) {
    const savedKeyId = String(selectedKeyMap.value[customerId]);
    const keyExists = allKeyIds.includes(savedKeyId);
    if (keyExists) {
      selectedKeyId.value = savedKeyId;
      emit('update:keyId', savedKeyId);
    } else {
      delete selectedKeyMap.value[customerId];
    }
  }
}

function onLogoClick() {
  if (!selectedCustomer.value) {
    ElMessage.warning($t('licenseManage.customer.select'));
    return;
  }
  fetchKeys(selectedCustomer.value);
  showDialog.value = true;
  newKeyName.value = '';
  addKeySuccess.value = false;
  nextTick(() => {
    keyInputRef.value?.focus();
  });
}

// 新增密钥
async function onAddKey() {
  if (!newKeyName.value || !newKeyName.value.trim() || !selectedCustomer.value)
    return;
  addKeyLoading.value = true;
  addKeySuccess.value = false;
  await createCustomerKey(selectedCustomer.value, {
    keyRemark: newKeyName.value.trim(),
  });
  addKeyLoading.value = false;
  addKeySuccess.value = true;
  fetchKeys(selectedCustomer.value);
  newKeyName.value = '';
  ElMessage.success($t('licenseManage.key.addSuccess'));
  setTimeout(() => {
    addKeySuccess.value = false;
  }, 800);
}

function onSwitchKey(key: any) {
  selectedKeyId.value = String(key.id);
  // 保存当前客户选中的密钥ID到map中
  if (selectedCustomer.value) {
    selectedKeyMap.value[selectedCustomer.value] = String(key.id);
  }
  emit('update:keyId', String(key.id));
  ElMessage.success(
    $t('licenseManage.key.switchSuccess') + (key.keyRemark || key.name),
  );
  showDialog.value = false;
}

// 删除密钥
async function onDeleteKey(keyId: string) {
  try {
    const success = await deleteCustomerKey(keyId);
    if (success) {
      ElMessage.success($t('licenseManage.key.deleteSuccess') || '删除成功');
      // 如果删除的是当前选中的密钥，清除选中状态和map记录
      if (selectedKeyId.value === keyId) {
        selectedKeyId.value = null;
        if (selectedCustomer.value) {
          delete selectedKeyMap.value[selectedCustomer.value];
        }
        emit('update:keyId', null);
      }
      fetchKeys(selectedCustomer.value);
    } else {
      ElMessage.error($t('licenseManage.key.deleteFailed') || '删除失败');
    }
  } catch {
    ElMessage.error($t('licenseManage.key.deleteFailed') || '删除失败');
  }
}
</script>

<template>
  <div class="customer-selector">
    <div class="customer-row">
      <el-select
        v-model="selectedCustomer"
        :placeholder="$t('licenseManage.customer.select')"
        @change="onCustomerChange"
        clearable
        :loading="customersLoading"
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
      :title="$t('licenseManage.key.add')"
      width="420px"
      :close-on-click-modal="false"
      :destroy-on-close="true"
    >
      <div class="dialog-content">
        <!-- 新增密钥输入区 -->
        <div class="add-key-block">
          <el-input
            v-model="newKeyName"
            :placeholder="$t('licenseManage.key.inputRemark')"
            ref="keyInputRef"
            @keyup.enter="onAddKey"
            @blur="onAddKey"
            style="width: 180px"
            maxlength="15"
            show-word-limit
          />
        </div>
        <!-- 密钥列表 -->
        <div class="key-list-block">
          <div
            v-if="keyList.length === 0"
            class="empty-key-message"
          >
            {{ $t('licenseManage.key.empty') }}
          </div>
          <div v-else class="key-list" style="margin-top: 16px">
            <div
              v-for="(key, index) in keyList"
              :key="key.id || index"
              class="key-item"
              :class="{ 'key-item-active': String(selectedKeyId) === String(key.id) }"
              @dblclick="onSwitchKey(key)"
              @mouseenter="hoveredKeyId = key.id"
              @mouseleave="hoveredKeyId = null"
            >
              <div class="key-info">
                <el-tooltip 
                  placement="bottom-start" 
                  :content="key.keyRemark"
                  :disabled="!(key.keyRemark) || (key.keyRemark).length <= 8"
                >
                  <span class="key-name">{{
                    key.keyRemark
                  }}</span>
                </el-tooltip>
                <span class="key-date">{{
                  key.keyDate
                }}</span>
              </div>
              <div class="key-actions">
                <el-icon 
                  class="download-icon" 
                  :class="{ 'show': hoveredKeyId === key.id }"
                  @click="downloadKeyApi(key.id)"
                  title="下载密钥"
                >
                  <Download />
                </el-icon>
                <el-popconfirm
                  @confirm="onDeleteKey(key.id)"
                  :title="$t('licenseManage.key.deleteConfirm')"
                  :width="180"
                  popper-class="popconfirm-single-line"
                  confirm-button-text="确定删除"
                  cancel-button-text="取消"
                >
                  <template #reference>
                    <el-icon 
                      class="delete-icon" 
                      :class="{ 'show': hoveredKeyId === key.id }"
                    >
                      <Delete />
                    </el-icon>
                  </template>
                </el-popconfirm>
              </div>
            </div>
          </div>
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
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.key-list-block {
  margin-top: 8px;
}

.popconfirm-single-line .el-popconfirm__main {
  white-space: nowrap;
}

/* 密钥列表样式 */
.key-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.key-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.key-item:hover {
  background: rgb(64 158 255 / 10%);
  box-shadow: 0 2px 8px rgb(64 158 255 / 10%);
}

.key-item-active {
  background: rgb(64 158 255 / 10%) !important;
  color: #ffffff !important;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgb(64 158 255 / 20%);
}

.key-info {
  display: flex;
  flex: 1;
  flex-direction: row;
  gap: 16px;
  align-items: center;
}

.key-name {
  display: inline-block;
  font-size: 14px;
  font-weight: normal;
  line-height: 1.4;
  white-space: nowrap;
  width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.key-date {
  font-size: 14px;
  line-height: 1.2;
  white-space: nowrap;
}

.key-actions {
  display: flex;
  align-items: center;
  margin-left: 12px;
}

.delete-icon {
  font-size: 22px;
  color: #f56c6c;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 4px;
  font-weight: bold;
}

.delete-icon.show {
  opacity: 1;
}

.delete-icon:hover {
  color: #f56c6c;
  background: #fef0f0;
}

.download-icon {
  font-size: 22px;
  color: #409eff;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 4px;
  margin-right: 8px;
  font-weight: bold;
}

.download-icon.show {
  opacity: 1;
}

.download-icon:hover {
  color: #409eff;
  background: #f0f9ff;
}

.empty-key-message {
  margin-top: 16px;
  color: #999;
  text-align: center;
  padding: 20px 0;
  font-size: 14px;
}
</style>
