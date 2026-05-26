<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useProcessVisualStore } from '#/store/modules/processVisual';

import AppMain from './components/AppMain.vue';
import ConsolePanel from './components/ConsolePanel.vue';
import DetailPanel from './components/DetailPanel.vue';
import RunTest from './components/RunTest.vue';
import Save from './components/Save.vue';
import Sidebar from './components/Sidebar.vue';

// Store
const processVisualStore = useProcessVisualStore();
const { loading, processType, processInfo, runTestNode, flow } =
  storeToRefs(processVisualStore);

// Route
const route = useRoute();

// Local state
const variableCollapse = ref(false);
const panelCollapse = ref(false);
const fid = ref((route.query.fid as string) || '');

// Watch route changes for reactive fid
watch(
  () => route.query.fid,
  (val) => {
    fid.value = (val as string) || '';
    if (fid.value) getProcessInfo();
  },
);

const runTestModal = ref({
  visible: false,
  startNode: '',
  endNode: '',
  flowId: '',
});

// Refs
const panelSide = ref<InstanceType<typeof DetailPanel> | null>(null);

// Computed
const processName = computed(() => processInfo.value?.name || '');
const isLoading = computed(() => loading.value);

// Methods
function running() {
  processVisualStore.setRunTestNode({ startNode: '', endNode: '' });
}

function openRunTestModal() {
  runTestModal.value = {
    startNode: runTestNode.value?.startNode || '',
    endNode: runTestNode.value?.endNode || '',
    flowId: processInfo.value?.id || fid.value || '',
    visible: true,
  };
}

function closeRunTestModal() {
  runTestModal.value.visible = false;
}

async function getProcessInfo() {
  if (!fid.value) return;
  processVisualStore.START_LOADING();
  try {
    // TODO: Replace with actual API call when available
    processVisualStore.setProcessType('RPA-Mobile');
  } finally {
    processVisualStore.FINISH_LOADING();
  }
}

function saveCode() {
  if (processType.value !== 'PYTHON') return;
  // Handled by Save component emit
}

function parentSaveFile(_e: any) {
  // Handled by Save component
}

function onPanelMouseOver() {
  if (panelSide.value) {
    panelSide.value.showCollapse = true;
  }
}

function onPanelMouseOut() {
  if (panelSide.value) {
    panelSide.value.showCollapse = false;
  }
}

function onCollapseVariable(val: boolean) {
  variableCollapse.value = val;
}

function onCollapsePanel(val: boolean) {
  panelCollapse.value = val;
}

function refresh(val: string) {
  fid.value = val;
  getProcessInfo();
}

// Watch runTestNode to auto-open dialog
watch(
  () => runTestNode.value,
  () => {
    openRunTestModal();
  },
  { deep: true },
);

// Lifecycle
onMounted(() => {
  if (fid.value) {
    getProcessInfo();
  }
});

defineExpose({ refresh });
</script>

<template>
  <div class="visual-wrapper">
    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>

    <template v-else>
      <el-container class="visual-container">
        <!-- Header -->
        <el-header height="40px" class="visual-header">
          <div class="header-left">{{ processName }}</div>
          <div class="header-actions">
            <Save :fid="fid" @save-file="parentSaveFile" @save-code="saveCode" />
            <el-tooltip content="运行" placement="bottom">
              <div class="run-btn" @click="running">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#176ac5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </el-tooltip>
          </div>
        </el-header>

        <!-- Main content -->
        <el-container class="main-layout">
          <!-- Left sidebar -->
          <el-aside :width="variableCollapse ? '0' : '260px'" class="left-aside">
            <Sidebar :process-type="processType" @collapse="onCollapseVariable" />
          </el-aside>

          <!-- Center content -->
          <el-main class="center-main" @contextmenu.prevent>
            <AppMain :fid="fid" :process-info="processInfo" />
            <ConsolePanel
              v-if="processType === 'RPA-Mobile'"
              :fid="fid"
            />
          </el-main>

          <!-- Right sidebar -->
          <el-aside
            :width="panelCollapse ? '0' : '320px'"
            class="right-aside"
            @mouseover="onPanelMouseOver"
            @mouseout="onPanelMouseOut"
          >
            <DetailPanel ref="panelSide" @collapse="onCollapsePanel" />
          </el-aside>
        </el-container>
      </el-container>
    </template>

    <!-- Run test dialog -->
    <RunTest v-model:visible="runTestModal.visible" :start-node="runTestModal.startNode"
      :end-node="runTestModal.endNode" :flow-id="runTestModal.flowId" @close="closeRunTestModal" />
  </div>
</template>

<style scoped>
.visual-wrapper {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #fff;
}

.visual-container {
  height: 100%;
}

/* Loading */
.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  gap: 12px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e8e8e8;
  border-top-color: #176ac5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Header */
.visual-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 0;
  border-bottom: 1px solid #eeeff1;
  height: 40px;
  box-sizing: border-box;
}

.header-left {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  padding: 0 20px;
  color: #000;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 12px;
}

.run-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.run-btn:hover {
  background: rgb(23 106 197 / 8%);
}

/* Main layout */
.main-layout {
  height: calc(100vh - 40px);
  overflow: hidden;
}

.left-aside {
  border-right: 1px solid #eeeff1;
  transition: width 0.3s;
  overflow: visible;
}

.center-main {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.right-aside {
  border-left: 1px solid #eeeff1;
  transition: width 0.3s;
  overflow: visible;
}
</style>
