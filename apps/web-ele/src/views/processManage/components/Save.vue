<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';

import { useProcessVisualStore } from '#/store/modules/processVisual';
import { saveProcess } from '#/api/core/processManage';

const props = defineProps<{
  fid?: string;
}>();

const emit = defineEmits<{
  (e: 'saveFile', data: any): void;
  (e: 'saveCode'): void;
}>();

const processVisualStore = useProcessVisualStore();
const { nodeList, linkList, variables, flow, allFlow, autoSaveStack } =
  storeToRefs(processVisualStore);

const saving = ref(false);
const isSuccess = ref(false);
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_SAVE_THROTTLE = 2000; // 2s throttle — prevents firing during rapid drags

async function handleSave() {
  if (saving.value) return;
  saving.value = true;
  isSuccess.value = false;

  try {
    const saveData = {
      id: props.fid || flow.value.id,
      main: {
        id: props.fid || flow.value.id,
        nodeList: nodeList.value,
        linkList: linkList.value,
        variables: variables.value,
      },
      ...(allFlow.value || {}),
    };

    const res: any = await saveProcess(saveData);
    if (res.success || res.code === 200 || res) {
      isSuccess.value = true;
      // Silent save — no toast because this API is called frequently
      emit('saveCode');

      setTimeout(() => {
        isSuccess.value = false;
        saving.value = false;
      }, 500);
    } else {
      throw new Error('Save failed');
    }
  } catch {
    saving.value = false;
    // Silent fail for auto-save; only show error on manual save
  }
}

// Manual save (button click) — shows error on failure
async function handleManualSave() {
  if (saving.value) return;
  saving.value = true;
  isSuccess.value = false;

  try {
    const saveData = {
      id: props.fid || flow.value.id,
      main: {
        id: props.fid || flow.value.id,
        nodeList: nodeList.value,
        linkList: linkList.value,
        variables: variables.value,
      },
      ...(allFlow.value || {}),
    };

    const res: any = await saveProcess(saveData);
    if (res.success || res.code === 200 || res) {
      isSuccess.value = true;
      emit('saveCode');

      setTimeout(() => {
        isSuccess.value = false;
        saving.value = false;
      }, 500);
    } else {
      throw new Error('Save failed');
    }
  } catch {
    saving.value = false;
    ElMessage.error('保存失败');
  }
}

// Auto-save: throttled to prevent firing during rapid drag operations
watch(
  () => autoSaveStack.value.length,
  (len) => {
    if (len > 0) {
      processVisualStore.clearAutoSaveStack();
      // Throttle: only fire once every AUTO_SAVE_THROTTLE ms
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        handleSave();
        autoSaveTimer = null;
      }, AUTO_SAVE_THROTTLE);
    }
  },
);
</script>

<template>
  <div class="save-component">
    <el-tooltip content="保存流程" placement="bottom">
      <div class="save-btn" :class="{ saving, success: isSuccess }" @click="handleManualSave">
        <span v-if="saving && !isSuccess" class="saving-icon">⟳</span>
        <span v-else-if="isSuccess" class="check-icon">✓</span>
        <span v-else class="disk-icon">💾</span>
      </div>
    </el-tooltip>
  </div>
</template>

<style scoped>
.save-component {
  display: inline-flex;
}

.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.save-btn:hover {
  background: rgb(0 0 0 / 5%);
}

.saving-icon {
  animation: spin 0.8s linear infinite;
  font-size: 16px;
}

.check-icon {
  color: #67c23a;
  font-size: 16px;
}

.disk-icon {
  font-size: 14px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
