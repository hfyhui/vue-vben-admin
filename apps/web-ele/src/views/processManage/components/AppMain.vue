<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { useProcessVisualStore } from '#/store/modules/processVisual';
import { queryProcess } from '#/api/core/processManage';
import type { NodeData, VariableData } from '../types';
import { processEventBus } from '../eventBus';
import FlowArea from './flow/FlowArea.vue';
import FlowNode from './flow/FlowNode.vue';

const props = defineProps<{
  fid?: string;
  processInfo?: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'codeChange', code: string): void;
}>();

const processVisualStore = useProcessVisualStore();
const { nodeList, linkList, variables, processType, flow } =
  storeToRefs(processVisualStore);

const codeValue = ref('');
const codeHeight = ref(400);
const flowAreaRef = ref<InstanceType<typeof FlowArea> | null>(null);

// Computed
const isPython = computed(() => processType.value === 'PYTHON');
const isRPA = computed(() => !processType.value || processType.value === 'RPA-Mobile');
const currentZoom = computed(() => flowAreaRef.value?.container.zoom ?? 1);

// Watch processInfo
watch(
  () => props.processInfo,
  (val) => {
    if (val) {
      codeValue.value = val.code || '';
    }
  },
  { immediate: true, deep: true },
);

function onCodeChange(code: string) {
  codeValue.value = code;
  emit('codeChange', code);
}

// Zoom controls
function zoomIn() {
  flowAreaRef.value?.zoomIn();
}
function zoomOut() {
  flowAreaRef.value?.zoomOut();
}
function resetZoom() {
  flowAreaRef.value?.resetZoom();
}

// Load flow data
async function getFlowData(fid: string, target = '') {
  if (!fid) return;
  try {
    processVisualStore.START_LOADING();
    const res: any = await queryProcess(fid);
    const data = res.data ? res.data : res;
    if (!data.id) return;

    // Parse allFlow — supports main flow + sub-flows
    const allFlowData = data.flow
      ? data.flow
      : {
          main: {
            id: data.id,
            variables: data.variables || [],
          },
        };
    if (allFlowData.variables) delete allFlowData.variables;

    processVisualStore.setAllFlow(allFlowData);

    // Determine whether to load main or sub-flow
    const fcid = (new URLSearchParams(window.location.search)).get('fcid') || '';
    let flowData;
    if (fid && !fcid) {
      flowData = allFlowData.main || { id: fid };
    } else if (fcid) {
      flowData = allFlowData[fcid] || { id: fcid };
    } else {
      flowData = { id: fid };
    }

    // Restore data
    if (!target || target === 'NodeList')
      processVisualStore.setNodeList(flowData.nodeList || []);
    if (!target || target === 'Variables')
      processVisualStore.setVariables(allFlowData.main?.variables || []);
    if (!target || target === 'LinkList')
      processVisualStore.setLinkList(flowData.linkList || []);

    processVisualStore.setFlow({ id: flowData.id, name: flowData.name || '' });
    processVisualStore.setProcessType(data.type || 'RPA-Mobile');
    processVisualStore.setProcessInfo(data);

    // Compute canvas position to center nodes
    if (flowData.nodeList && flowData.nodeList.length > 0) {
      computeCanvasPosition(flowData.nodeList);
    }
  } catch {
    // TODO: show error notification
  } finally {
    processVisualStore.FINISH_LOADING();
  }
}

// Compute canvas center position based on node bounds
function computeCanvasPosition(nodes: any[]) {
  if (!flowAreaRef.value || nodes.length === 0) return;
  let minX = nodes[0].x;
  let minY = nodes[0].y;
  nodes.forEach((node: any) => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
  });
  const rawTop = -minY + 50;
  const rawLeft = -minX + 50;
  // Apply unified clamping to respect dynamic canvas boundaries
  const clampFn = flowAreaRef.value.clampPanPosition;
  const clamped = clampFn ? clampFn(rawTop, rawLeft) : { top: rawTop, left: rawLeft };
  flowAreaRef.value.container.pos = {
    top: clamped.top,
    left: clamped.left,
  };
}

// Add node from variable drag
function addNode(x: number, y: number, variable: VariableData, type: 'set' | 'fetch') {
  const nodeId = `node-${Date.now()}`;
  const newNode: NodeData = {
    id: nodeId,
    name: variable.name,
    title: variable.name,
    nodeType: type === 'set' ? 'variable_set' : 'variable_get',
    x,
    y,
    width: type === 'set' ? 280 : 150,
    cls: { color: '#176ac5', icon: '' },
    ports: {
      input:
        type === 'set'
          ? [
              { id: `${nodeId}-l-0`, name: '', portType: 'flow', title: '', dataType: '', value: '', cls: { color: '' } },
              { id: `${nodeId}-l-1`, name: variable.name, portType: 'input', title: variable.name, dataType: variable.dataType, value: variable.value, cls: { color: '#176ac5' } },
            ]
          : [],
      output:
        type === 'set'
          ? [
              { id: `${nodeId}-r-0`, name: '', portType: 'flow', title: '', dataType: '', value: '', cls: { color: '' } },
              { id: `${nodeId}-r-1`, name: variable.name, portType: 'output', title: variable.name, dataType: variable.dataType, value: variable.value, cls: { color: '#176ac5' } },
            ]
          : [
              { id: `${nodeId}-r-0`, name: variable.name, portType: 'output', title: '', dataType: variable.dataType, value: variable.value, cls: { color: '#176ac5' } },
            ],
    },
    detailPanel: { common: { title: '通用配置', formDatas: [] }, options: { title: '选项配置', formDatas: [] } },
  };

  const nodes = [...nodeList.value, newNode];
  processVisualStore.setNodeList(nodes);
  processVisualStore.setNodeOperation('add');
}

// Delete connection line
function deleteLine(conn: any) {
  if (!conn) return;
  const links = linkList.value.filter(
    (l: any) => !(l.sourceId === conn.sourceId && l.targetId === conn.targetId),
  );
  processVisualStore.setLinkList(links);
  processVisualStore.setNodeOperation('delLink');
}

// Page close warning
function listenPage() {
  window.onbeforeunload = () => '您输入的内容尚未保存，确定要离开吗？';
}

onMounted(async () => {
  // Listen for variable refresh from external triggers
  processEventBus.on('variable-refresh', () => {
    if (props.fid) getFlowData(props.fid, 'Variables');
  });

  if (props.fid) {
    listenPage();
    await getFlowData(props.fid);
    // Draw links after data loaded + DOM rendered
    setTimeout(() => {
      const links = linkList.value;
      links.forEach((l: any) => {
        flowAreaRef.value?.drawLink(
          l.sourcePort,
          l.targetPort,
          l.cls?.linkColor || '#959CB6',
        );
      });
    }, 300);
  }
});
</script>

<template>
  <div class="app-main-container">
    <!-- Python code editor -->
    <div v-if="isPython" class="code-area" :style="{ height: `${codeHeight}px` }">
      <div class="editor-header">Python 代码</div>
      <textarea
        v-model="codeValue"
        class="code-textarea"
        placeholder="请输入 Python 代码..."
        @input="onCodeChange(($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <!-- RPA flow area -->
    <div v-if="isRPA" class="flow-area-wrapper">
      <!-- Zoom toolbar -->
      <div class="flow-toolbar">
        <el-button-group size="small">
          <el-button @click="zoomIn">+</el-button>
          <el-button @click="zoomOut">−</el-button>
          <el-button @click="resetZoom">100%</el-button>
        </el-button-group>
      </div>

      <!-- Flow canvas -->
      <FlowArea ref="flowAreaRef">
        <FlowNode
          v-for="node in nodeList"
          :key="node.id"
          :node="node"
          :zoom="currentZoom"
          @show-node-context-menu="(id, e) => flowAreaRef?.showNodeContextMenu(id, e)"
          @change-node-site="(d) => flowAreaRef?.changeNodeSite(d)"
          @click-node="(id) => flowAreaRef?.clickNode(id)"
          @link-blank="flowAreaRef?.linkBlank()"
        />
      </FlowArea>

      <!-- Empty state -->
      <div v-if="!nodeList || nodeList.length === 0" class="empty-canvas">
        <div class="empty-text">从左侧拖拽组件到此处构建流程</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-main-container {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.code-area {
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.editor-header {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  border-bottom: 1px solid #eee;
}

.code-textarea {
  flex: 1;
  border: none;
  resize: none;
  padding: 8px;
  font-family: Monaco, Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
  outline: none;
  background: #fff;
}

.flow-area-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.flow-toolbar {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: #fafafa;
  border-bottom: 1px solid #eee;
  z-index: 20;
}

.empty-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 5;
}

.empty-text {
  font-size: 14px;
  color: #909399;
}
</style>
