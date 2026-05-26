<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { Delete } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';

import { useProcessVisualStore } from '#/store/modules/processVisual';
import { getTaskLog } from '#/api/core/processManage';

const props = defineProps<{
  fid?: string;
}>();

const processVisualStore = useProcessVisualStore();
const { jobId } = storeToRefs(processVisualStore);

interface LogEntry {
  id: string;
  log: string;
  time: string;
  is_delete: boolean;
}

const logList = ref<LogEntry[]>([]);
const timer = ref<any>(null);
const activeNames = ref<string[]>(['console']);

const filteredLogs = computed(() => logList.value.filter((item) => !item.is_delete));

function onClearConsole() {
  logList.value.forEach((item) => (item.is_delete = true));
}

function startPolling() {
  if (timer.value) clearInterval(timer.value);
  timer.value = setInterval(async () => {
    try {
      const res: any = await getTaskLog({ task_id: jobId.value });
      const existingIdx = logList.value.findIndex(
        (item) => item.id === res.id,
      );
      if (existingIdx === -1) {
        logList.value.push({
          id: res.id || `log-${Date.now()}`,
          log: res.log || '',
          time: res.time || new Date().toLocaleTimeString(),
          is_delete: false,
        });
      }
    } catch {
      // Task may not have started yet, ignore
    }
  }, 5000);
}

watch(
  () => jobId.value,
  (val) => {
    if (val) {
      activeNames.value = ['console'];
      startPolling();
    }
  },
);

// Clear console when flow changes
watch(
  () => processVisualStore.flow,
  () => {
    onClearConsole();
  },
  { deep: true },
);

onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value);
    timer.value = null;
  }
});
</script>

<template>
  <el-collapse v-model="activeNames" class="console-panel">
    <el-collapse-item name="console">
      <template #title>
        <div class="console-header">
          <span>控制台输出</span>
          <el-button
            v-if="filteredLogs.length"
            link
            type="primary"
            size="small"
            @click.stop="onClearConsole"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </template>
      <div class="log-list">
        <div v-for="item in filteredLogs" :key="item.id" class="log-item">
          <span class="log-time">[{{ item.time }}]</span>
          <pre class="log-content">{{ item.log }}</pre>
        </div>
        <div v-if="filteredLogs.length === 0" class="no-logs">暂无日志输出</div>
      </div>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>
.console-panel {
  border-top: 1px solid #eeeff1;
  flex-shrink: 0;
}

.console-panel :deep(.el-collapse-item__header) {
  padding: 0 12px;
  height: 36px;
  line-height: 36px;
  background: #fafafa;
}

.console-panel :deep(.el-collapse-item__content) {
  padding: 0;
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: 13px;
  font-weight: 500;
}

.log-list {
  height: 200px;
  overflow-y: auto;
  padding: 8px 12px;
  background: #1e1e1e;
  font-family: Monaco, monospace;
  font-size: 12px;
}

.log-item {
  margin-bottom: 4px;
  display: flex;
  gap: 8px;
}

.log-time {
  color: #858585;
  flex-shrink: 0;
}

.log-content {
  color: #d4d4d4;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.no-logs {
  text-align: center;
  color: #858585;
  padding: 20px;
}
</style>
