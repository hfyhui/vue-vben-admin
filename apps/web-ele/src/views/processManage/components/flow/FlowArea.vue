<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useThrottleFn } from '@vueuse/core';
import { jsPlumb } from 'jsplumb';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';

import { useProcessVisualStore } from '#/store/modules/processVisual';
import { jsplumbConnectOptions, jsplumbSetting } from '../../jsplumbConfig';
import { processEventBus } from '../../eventBus';
import ContextMenu from './ContextMenu.vue';
import type { MenuItem } from './ContextMenu.vue';

const processVisualStore = useProcessVisualStore();
const {
  nodeList, linkList, plumb: storedPlumb, flow, activeNodes,
  rightClickedNodeId, flowStack, backFlowStack, copiedNodes,
  connectDragging, currentCoverPort, resource, changeMenuState,
} = storeToRefs(processVisualStore);

// Refs
const efContainer = ref<HTMLElement | null>(null);
let jsPlumbInstance: any = null;
const menuRef = ref<InstanceType<typeof ContextMenu> | null>(null);

// Container state (matching source exactly)
const container = reactive({
  pos: { top: 0, left: 0 },
  zoom: 1,
  scaleOrigin: { x: 0, y: 0 },
  dragging: false,
  button: 0,
});

// Mouse state
const mouse = reactive({
  position: { x: 0, y: 0 },
  tempPos: { x: 0, y: 0 },
});

// Rectangle multi-select
const rectangleMultiple = reactive({
  multipling: false,
  pos: { top: 0, left: 0 },
  height: 0,
  width: 0,
});

// Context menu data
const nodeContextMenuData = reactive({
  menuName: 'node-menu',
  axis: { x: 0, y: 0 },
  menulists: [] as MenuItem[],
});
const nodeContextMenuVisible = ref(false);

const areaContextMenuData = reactive({
  menuName: 'area-menu',
  axis: { x: 0, y: 0 },
});
const areaContextMenuVisible = ref(false);

// Line context menu
const lineContextMenuData = reactive({
  menuName: 'line-menu',
  axis: { x: 0, y: 0 },
});
const lineContextMenuVisible = ref(false);
let connInfo: any = null;

// Emit
const emit = defineEmits<{
  (e: 'mouse', pos: { x: number; y: number }): void;
  (e: 'mouseContainerPos', pos: { x: number; y: number }): void;
}>();

// ============ jsPlumb Init ============
function initJsPlumb() {
  if (!efContainer.value) return;
  jsPlumbInstance = jsPlumb.getInstance(jsplumbSetting as any);
  jsPlumbInstance.ready(() => {
    jsPlumbInstance.setSuspendDrawing(false, true);
    jsPlumbInstance.bind('beforeDrop', (info: any) => {
      // Basic checks before allowing drop — detailed validation in FlowPort.checkConnectingPorts
      const { sourceId, targetId } = info;
      if (sourceId === targetId) {
        ElMessage.error('不能同节点连接');
        return false;
      }
      return true;
    });
    jsPlumbInstance.bind('connection', () => {});
    jsPlumbInstance.bind('connectionDrag', () => {
      const port = currentCoverPort.value;
      const node = port?.node;
      if (!port?.id) console.warn('  ⚠️ currentCoverPort EMPTY — hover over port before dragging?');
      processVisualStore.setConnectDragging({ isDragging: true, portId: port?.id || '', nodeId: port?.node?.id || '' } as any);
    });
    jsPlumbInstance.bind('connectionDragStop', (conn: any, ev: MouseEvent) => {
      const saved = connectDragging.value;
      const target = currentCoverPort.value;
      if (!target?.id) console.warn('  ⚠️ target currentCoverPort EMPTY');
      processVisualStore.setConnectDragging({ isDragging: false, portId: saved.portId || '', nodeId: saved.nodeId || '', x: ev?.x, y: ev?.y } as any);
    });
    jsPlumbInstance.bind('contextmenu', (conn: any, ev: MouseEvent) => {
      connInfo = conn;
      lineContextMenuData.axis = { x: ev.clientX, y: ev.clientY };
      lineContextMenuVisible.value = true;
    });
    jsPlumbInstance.bind('beforeDetach', () => true);
    jsPlumbInstance.setContainer(efContainer.value);
    processVisualStore.setPlumb(jsPlumbInstance);
  });
}

// ============ Drawing ============
function drawLink(sourcePort: string, targetPort: string, strokeColor = '#959CB6') {
  if (!jsPlumbInstance) { console.warn('[drawLink] SKIP - no jsPlumb'); return; }
  nextTick(() => {
    jsPlumbInstance.connect({ uuids: [sourcePort, targetPort] }, {
      ...jsplumbConnectOptions,
      paintStyle: { stroke: strokeColor, strokeWidth: 2, outlineStroke: 'transparent', outlineWidth: 2 },
    });
    processVisualStore.setPlumb(jsPlumbInstance);
  });
}

// ============ Mouse Handlers ============

function updateMouseFromEvent(e: MouseEvent) {
  if (efContainer.value) {
    const rect = efContainer.value.getBoundingClientRect();
    mouse.position = {
      x: (e.clientX - rect.left) / container.zoom,
      y: (e.clientY - rect.top) / container.zoom,
    };
  }
}

function multiSelectNodes() {
  let h = mouse.position.y - mouse.tempPos.y;
  let w = mouse.position.x - mouse.tempPos.x;
  let t = mouse.tempPos.y;
  let l = mouse.tempPos.x;
  if (h >= 0 && w < 0) { w = -w; l -= w; }
  else if (h < 0 && w >= 0) { h = -h; t -= h; }
  else if (h < 0 && w < 0) { h = -h; w = -w; t -= h; l -= w; }
  rectangleMultiple.height = h;
  rectangleMultiple.width = w;
  rectangleMultiple.pos.left = l;
  rectangleMultiple.pos.top = t;
}

function multiSelectedNodes() {
  const { width, height } = rectangleMultiple;
  const { top, left } = rectangleMultiple.pos;
  const rectRight = left + width;
  const rectBottom = top + height;
  const nodes = nodeList.value || [];
  const selected: string[] = [];
  nodes.forEach((node: any) => {
    const nodeRight = node.x + (node.width || 100);
    const el = document.getElementById(node.id);
    const nodeBottom = node.y + (el?.offsetHeight || 60);
    // AABB overlap: select if any part of the node intersects the selection rectangle
    const overlaps = nodeRight > left && node.x < rectRight && nodeBottom > top && node.y < rectBottom;
    if (overlaps) {
      jsPlumbInstance?.addToDragSelection(node.id);
      selected.push(node.id);
    }
  });
  processVisualStore.setActiveNodes(selected);
}

function getViewportSize() {
  const parent = efContainer.value?.parentElement;
  const vw = parent?.clientWidth || window.innerWidth;
  const vh = parent?.clientHeight || window.innerHeight;
  return { width: vw, height: vh };
}

// Dynamic canvas size — expands based on node positions
const containerSize = computed(() => {
  const { width: vw, height: vh } = getViewportSize();
  const nodes = nodeList.value || [];

  let maxX = Math.max(vw * 2 / container.zoom, 4000);
  let maxY = Math.max(vh * 2 / container.zoom, 4000);

  nodes.forEach((n: any) => {
    maxX = Math.max(maxX, (n.x || 0) + (n.width || 300) + 2000);
    maxY = Math.max(maxY, (n.y || 0) + 400 + 2000);
  });

  return { width: Math.ceil(maxX), height: Math.ceil(maxY) };
});

function clampPanPosition(nTop: number, nLeft: number) {
  const { width: cw, height: ch } = containerSize.value;
  const { width: vw, height: vh } = getViewportSize();

  // Upper bound: allow overscroll past origin (half viewport) so (0,0) can be positioned freely
  const maxTop = vh / container.zoom * 0.5;
  const maxLeft = vw / container.zoom * 0.5;
  if (nTop > maxTop) nTop = maxTop;
  if (nLeft > maxLeft) nLeft = maxLeft;

  // Lower bound: canvas visual edge ≥ viewport edge on screen
  // Visual position: (pos + coord) * zoom. Lower bound ensures no whitespace beyond content.
  const minTop = vh / container.zoom - ch;
  const minLeft = vw / container.zoom - cw;
  nTop = Math.max(nTop, minTop);
  nLeft = Math.max(nLeft, minLeft);

  // Auto-center when canvas visual size < viewport
  if (cw * container.zoom < vw) nLeft = (vw - cw * container.zoom) / (2 * container.zoom);
  if (ch * container.zoom < vh) nTop = (vh - ch * container.zoom) / (2 * container.zoom);

  return { top: nTop, left: nLeft };
}

function dragContainer() {
  let nTop = container.pos.top + (mouse.position.y - mouse.tempPos.y) * container.zoom;
  let nLeft = container.pos.left + (mouse.position.x - mouse.tempPos.x) * container.zoom;
  const clamped = clampPanPosition(nTop, nLeft);
  container.pos.top = clamped.top;
  container.pos.left = clamped.left;
}

// Throttled drag movement handler (16ms ≈ 60fps)
const throttledDragMove = useThrottleFn(() => {
  if (!container.dragging) return;
  if (container.button === 0) multiSelectNodes();
  else if (container.button === 2) dragContainer();
}, 16);

// Document-level mouse move — handles drag even when mouse leaves canvas
function onDocumentDragMouseMove(e: MouseEvent) {
  updateMouseFromEvent(e);
  throttledDragMove();
}

// Document-level mouse up — guarantees cleanup regardless of mouse position
function onDocumentDragMouseUp(_e: MouseEvent) {
  document.removeEventListener('mousemove', onDocumentDragMouseMove);
  document.removeEventListener('mouseup', onDocumentDragMouseUp);

  if (rectangleMultiple.multipling) {
    multiSelectedNodes();
    rectangleMultiple.multipling = false;
    rectangleMultiple.width = 0;
    rectangleMultiple.height = 0;
    rectangleMultiple.pos.left = -2;
    rectangleMultiple.pos.top = 0;
  }
  container.dragging = false;
  container.button = 0;
}

function mousedownHandler(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const isOnNode = target.closest('.fn') !== null;

  // Clicks on FlowNode elements are handled exclusively by FlowNode.vue.
  if (isOnNode) {
    if (e.button === 2) e.preventDefault();
    if (jsPlumbInstance) jsPlumbInstance.clearDragSelection();
    return;
  }

  // Exclude UI elements (zoom indicator) from triggering canvas interactions
  if (e.button === 0 && target.closest('.zoom-indicator')) return;

  // Prevent double-init when event bubbles
  if (container.dragging) return;

  container.dragging = true;
  container.button = e.button;

  if (efContainer.value) {
    const rect = efContainer.value.getBoundingClientRect();
    mouse.tempPos = {
      x: (e.clientX - rect.left) / container.zoom,
      y: (e.clientY - rect.top) / container.zoom,
    };
  }

  document.addEventListener('mousemove', onDocumentDragMouseMove);
  document.addEventListener('mouseup', onDocumentDragMouseUp);

  if (e.button === 0) {
    rectangleMultiple.multipling = true;
  }
  if (e.button === 2) e.preventDefault();
  if (jsPlumbInstance) jsPlumbInstance.clearDragSelection();
}

// Lightweight template-level mousemove — tracks position for display + emit (unthrottled)
function mousemoveHandler(e: MouseEvent) {
  updateMouseFromEvent(e);
  emit('mouse', { x: e.clientX, y: e.clientY });
}

// Secondary cleanup (template @mouseup) — catches edge cases, primary is document listener
function mouseupHandler(_e: MouseEvent) {
  if (!container.dragging) return;
  document.removeEventListener('mousemove', onDocumentDragMouseMove);
  document.removeEventListener('mouseup', onDocumentDragMouseUp);

  if (rectangleMultiple.multipling) {
    multiSelectedNodes();
    rectangleMultiple.multipling = false;
    rectangleMultiple.width = 0;
    rectangleMultiple.height = 0;
    rectangleMultiple.pos.left = -2;
    rectangleMultiple.pos.top = 0;
  }
  container.dragging = false;
  container.button = 0;
}

// ============ Zoom ============
function mouseWheelAction(e: WheelEvent) {
  const prevZoom = container.zoom;
  let z = container.zoom;
  z += e.deltaY * -0.001;
  z = Math.min(Math.max(0.6, z), 2);

  // Zoom toward mouse position (floating-point precision)
  if (efContainer.value) {
    const rect = efContainer.value.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / prevZoom;
    const my = (e.clientY - rect.top) / prevZoom;
    const scale = z / prevZoom;
    container.pos.left += mx * (1 - scale);
    container.pos.top += my * (1 - scale);
  }

  container.zoom = z;
  container.scaleOrigin.x = 0;
  container.scaleOrigin.y = 0;

  // Clamp position after zoom change — prevents drift that causes jumps on next drag
  const clamped = clampPanPosition(container.pos.top, container.pos.left);
  container.pos.top = clamped.top;
  container.pos.left = clamped.left;

  jsPlumbInstance?.setZoom(z);
}

function zoomIn() {
  container.zoom = Math.min(container.zoom + 0.1, 2);
  jsPlumbInstance?.setZoom(container.zoom);
  const clamped = clampPanPosition(container.pos.top, container.pos.left);
  container.pos.top = clamped.top;
  container.pos.left = clamped.left;
}
function zoomOut() {
  container.zoom = Math.max(container.zoom - 0.1, 0.6);
  jsPlumbInstance?.setZoom(container.zoom);
  const clamped = clampPanPosition(container.pos.top, container.pos.left);
  container.pos.top = clamped.top;
  container.pos.left = clamped.left;
}
function resetZoom() {
  container.zoom = 1;
  container.pos = { top: 0, left: 0 };
  jsPlumbInstance?.setZoom(1);
}

// ============ Context Menus ============
function showContainerContextMenu(e: MouseEvent) {
  e.preventDefault();
  if (!container.dragging) {
    if ((e.target as HTMLElement).id === 'efContainer' &&
      mouse.position.x === mouse.tempPos.x && mouse.position.y === mouse.tempPos.y) {
      areaContextMenuData.axis = { x: e.clientX, y: e.clientY };
      areaContextMenuVisible.value = true;
    }
  }
}

function linkBlank() {
  const { x, y } = connectDragging.value as any;
  if (x !== undefined) {
    areaContextMenuData.axis = { x, y };
    areaContextMenuVisible.value = true;
  }
}

function showNodeContextMenu(nodeId: string, e: MouseEvent) {
  e.preventDefault();
  processVisualStore.setRightClickedNodeId(nodeId);
  nodeContextMenuData.axis = { x: e.clientX, y: e.clientY };
  changeNodeMenuContent(nodeId);
  nodeContextMenuVisible.value = true;
}

function changeNodeMenuContent(id: string) {
  const baseMenu: MenuItem[] = [
    { fnHandler: 'notOperation', btnName: '操作', isTitle: true },
    { fnHandler: 'deleteNodes', btnName: '删除' },
    { fnHandler: 'copyNodes', btnName: '复制' },
    { fnHandler: 'cutNodes', btnName: '剪切' },
    { fnHandler: 'copyAndPasteNodes', btnName: '原地复制粘贴' },
    { fnHandler: 'unLinkNodes', btnName: '断开所有连线' },
  ];
  const nodes = nodeList.value || [];
  const cur = nodes.find((n: any) => n.id === id);
  if (cur && cur.nodeType !== 'event' && cur.nodeType !== 'variable_get') {
    if (cur.disable) {
      baseMenu.push({ fnHandler: 'cancelForbiddenNodes', btnName: '取消禁用' });
    } else {
      baseMenu.push({ fnHandler: 'singleExecution', btnName: '单点执行' });
      baseMenu.push({ fnHandler: 'executeLast', btnName: '从当前执行' });
      baseMenu.push({ fnHandler: 'forbiddenNodes', btnName: '禁用节点' });
    }
  }
  const hasDisabled = nodes.find((n: any) => n.nodeType !== 'event' && n.nodeType !== 'variable_get' && n.disable);
  if (hasDisabled) baseMenu.push({ fnHandler: 'cancelAllForbiddenNodes', btnName: '取消所有禁用' });
  if (baseMenu.length >= 8) baseMenu.splice(6, 0, { fnHandler: 'notOperation', btnName: '调试', isTitle: true , isSeparator: false });
  nodeContextMenuData.menulists = [...baseMenu];
}

function handleNodeMenuAction(fnHandler: string) {
  nodeContextMenuVisible.value = false;
  const handlers: Record<string, () => void> = {
    deleteNodes: onDeleteNodes, copyNodes: onCopyNodes, cutNodes: onCutNodes,
    copyAndPasteNodes: onCopyAndPasteNodes, unLinkNodes: onUnLinkNodes,
    singleExecution, executeLast,
    forbiddenNodes: () => forbiddenNodes('forbiddenNodes'),
    cancelForbiddenNodes: () => forbiddenNodes('cancelForbiddenNodes'),
    cancelAllForbiddenNodes: () => forbiddenNodes('cancelAllForbiddenNodes'),
  };
  handlers[fnHandler]?.();
}

function handleAreaMenuAction() {
  areaContextMenuVisible.value = false;
  // Emit to parent AppMain to add node at mouse position
  processVisualStore.setActiveInfo({ type: 'node' as any, id: '', data: { action: 'addFromCanvas', pos: mouse.position } });
}

// Delete connection line (right-click menu)
function deleteLine() {
  if (!connInfo) return;
  const conn = connInfo;
  const source = conn.sourceId;
  const target = conn.targetId;
  const links = [...(linkList.value || [])];
  // Remove from linkList by matching source/target
  const idx = links.findIndex((l: any) => l.source === source && l.target === target);
  if (idx > -1) links.splice(idx, 1);
  // Remove jsPlumb connection
  jsPlumbInstance
    ?.getConnections()
    .filter((c: any) => c.sourceId === source && c.targetId === target)
    .forEach((line: any) => jsPlumbInstance?.deleteConnection(line));
  processVisualStore.setLinkList(links);
  processVisualStore.setNodeOperation('delLink');
  connInfo = null;
}

// ============ Node CRUD ============
function rightOperationNodeIds(): string[] {
  const rid = rightClickedNodeId.value;
  if (!rid) return activeNodes.value || [];
  return activeNodes.value.includes(rid) ? activeNodes.value : [rid];
}

function onDeleteNodes() {
  rightOperationNodeIds().forEach(id => deleteNode(id));
  if (activeNodes.value.length === 1) processVisualStore.setActiveNodes([]);
}

function deleteNode(nodeId: string) {
  jsPlumbInstance?.remove(nodeId);
  const nodes = [...(nodeList.value || [])];
  const idx = nodes.findIndex((n: any) => n.id === nodeId);
  if (idx > -1) nodes.splice(idx, 1);
  unLinkConnection(nodeId);
  processVisualStore.setNodeList(nodes);
  processVisualStore.setNodeOperation('delete');
}

function unLinkConnection(nodeId: string) {
  const links = [...(linkList.value || [])];
  const relative = links.filter((l: any) => l.source === nodeId || l.target === nodeId);
  relative.forEach((fl: any) => {
    const i = links.findIndex((l: any) => fl.id === l.id);
    if (i > -1) links.splice(i, 1);
  });
  jsPlumbInstance?.getConnections()
    .filter((c: any) => c.sourceId === nodeId || c.targetId === nodeId)
    .forEach((line: any) => jsPlumbInstance?.deleteConnection(line));
  processVisualStore.setLinkList(links);
}

function onCopyNodes() {
  const nodes = nodeList.value || [];
  const copyNodes = rightOperationNodeIds().map(id => nodes.find((n: any) => n.id === id)).filter(Boolean);
  processVisualStore.setCopiedNodes(copyNodes);
  ElMessage.success('已复制');
}

function onCutNodes() { onCopyNodes(); onDeleteNodes(); }

function onCopyAndPasteNodes() {
  const nodes = nodeList.value || [];
  rightOperationNodeIds().forEach(id => {
    const cur = nodes.find((n: any) => n.id === id);
    if (cur) createNodeWithPos(cur, cur.x + 100, cur.y + 100);
  });
  processVisualStore.setCopiedNodes([]);
}

function onUnLinkNodes() { rightOperationNodeIds().forEach(id => unLinkConnection(id)); }

function onPaste() {
  const copy = processVisualStore.copiedNodes;
  if (copy.length === 1) createNodeWithPos(copy[0], mouse.position.x, mouse.position.y);
  else copy.forEach((n: any) => createNodeWithPos(n, n.x, n.y));
  processVisualStore.setCopiedNodes([]);
}

function singleExecution() {
  processVisualStore.setRunTestNode({ startNode: rightClickedNodeId.value, endNode: rightClickedNodeId.value });
}

function executeLast() {
  const nodes = nodeList.value;
  const endId = nodes.length > 0 ? nodes[nodes.length - 1].id : '';
  processVisualStore.setRunTestNode({ startNode: rightClickedNodeId.value, endNode: endId });
}

function forbiddenNodes(op: string) {
  const nodes = [...(nodeList.value || [])];
  const ids = rightOperationNodeIds();
  switch (op) {
    case 'forbiddenNodes':
      ids.forEach(id => { const n = nodes.find((x: any) => x.id === id && x.nodeType !== 'event' && x.nodeType !== 'variable_get' && !x.disable); if (n) n.disable = true; });
      break;
    case 'cancelForbiddenNodes':
      nodes.forEach((n: any) => { if (n.id === rightClickedNodeId.value) n.disable = false; });
      break;
    case 'cancelAllForbiddenNodes':
      nodes.forEach((n: any) => { if (n.nodeType !== 'event' && n.nodeType !== 'variable_get' && n.disable) n.disable = false; });
      break;
  }
  processVisualStore.setNodeList(nodes);
  processVisualStore.setNodeOperation(op);
}

// ============ Node Events from FlowNode ============
function clickNode(nodeId: string) {
  jsPlumbInstance?.clearDragSelection();
  // Keep multi-selection when clicking an already-selected node
  if (activeNodes.value.includes(nodeId)) return;
  processVisualStore.setActiveNodes([nodeId]);
}

function changeNodeSite(data: { nodeId: string; x: number; y: number }) {
  const nodes = nodeList.value || [];
  const n = nodes.find((x: any) => x.id === data.nodeId);
  if (!n) return;

  const dx = data.x - n.x;
  const dy = data.y - n.y;

  // Multi-select drag: move all selected nodes by the same delta
  if (activeNodes.value.length > 1 && activeNodes.value.includes(data.nodeId)) {
    activeNodes.value.forEach((id: string) => {
      const sn = nodes.find((x: any) => x.id === id);
      if (sn) { sn.x += dx; sn.y += dy; }
    });
  } else {
    n.x = data.x;
    n.y = data.y;
  }

  jsPlumbInstance?.repaintEverything();
  processVisualStore.setNodeOperation('dragNode');
}

// ============ Port color mapping (matching source configs.getColorByDataType) ============
const colorByDataType: Record<string, string> = {
  string: '#f23433', number: '#837111', bool: '#123123', array: '#787',
  password: '#545fff', date: '#69f30f', object: '#ff0ff3',
};

const colorByPortType: Record<string, string> = {
  input: '#f23433',
  flow: '#959CB6',
};

function createNodeWithPos(node: any, x: number, y: number) {
  const nodes = [...(nodeList.value || [])];
  if (node.title === '开始') {
    if (nodes.find((n: any) => n.title === '开始')) {
      ElMessage.warning('开始节点只能有一个');
      return;
    }
  }
  const nodeId = `node-${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  const w = (node.ports?.input?.length === 0 || node.ports?.output?.length === 0) ? 100 : 300;
  // Deep clone and assign port colors
  const newNode = JSON.parse(JSON.stringify({ ...node, id: nodeId, x, y, width: w }));
  if (newNode.ports) {
    ['input', 'output'].forEach((side) => {
      (newNode.ports[side] || []).forEach((p: any, i: number) => {
        p.id = p.id || `port-${side}-${nodeId}-${i}`;
        if (p.cls && !p.cls.color) p.cls.color = colorByPortType[p.portType] || colorByDataType[p.dataType] || '#176ac5';
      });
    });
  }
  nodes.push(newNode);
  processVisualStore.setNodeList(nodes);
  nextTick(() => jsPlumbInstance?.repaintEverything());
  processVisualStore.setNodeOperation('add');
}

// ============ Undo/Redo ============
function onBackStack() {
  const fs = flowStack.value;
  if (fs.length > 0) {
    jsPlumbInstance?.deleteEveryConnection();
    processVisualStore.popFlowStack();
    nextTick(() => {
      jsPlumbInstance?.repaintEverything();
      linkList.value.forEach((l: any) => drawLink(l.sourcePort, l.targetPort, l.cls?.linkColor || '#959CB6'));
    });
  }
}

function onFrontStack() {
  const bfs = backFlowStack.value;
  if (bfs.length > 0) {
    jsPlumbInstance?.deleteEveryConnection();
    processVisualStore.popBackFlowStack();
    jsPlumbInstance?.repaintEverything();
    setTimeout(() => {
      linkList.value.forEach((l: any) => drawLink(l.sourcePort, l.targetPort, l.cls?.linkColor || '#959CB6'));
    }, 0);
  }
}

// ============ Keyboard Shortcuts ============
function onKeyDown(e: KeyboardEvent) {
  const t = e.target as HTMLElement;
  if (t.classList.contains('el-input__inner') || t.classList.contains('el-textarea__inner')) return;
  const key = e.keyCode;
  if (e.ctrlKey && key !== 17) {
    switch (key) {
      case 67: e.preventDefault(); onCopyNodes(); break;
      case 86: e.preventDefault(); onPaste(); break;
      case 88: e.preventDefault(); onCutNodes(); break;
      case 89: e.preventDefault(); onFrontStack(); break;
      case 90: e.preventDefault(); onBackStack(); break;
    }
  } else if (key === 46) {
    e.preventDefault(); onDeleteNodes();
  }
}

// ============ Canvas Style ============
const efContainerStyle = computed(() => ({
  top: `${container.pos.top}px`,
  left: `${container.pos.left}px`,
  width: `${containerSize.value.width}px`,
  height: `${containerSize.value.height}px`,
  transform: `scale(${container.zoom})`,
  transformOrigin: `${container.scaleOrigin.x}px ${container.scaleOrigin.y}px`,
}));

// Infinite canvas grid — background on parent, follows pan + zoom
const flowAreaStyle = computed(() => ({
  backgroundPosition: `${container.pos.left}px ${container.pos.top}px`,
  backgroundSize: `${1 * container.zoom}rem ${1 * container.zoom}rem`,
}));

const zoomPercent = computed(() => `${(container.zoom * 100).toFixed(0)}%`);

// ============ Drag & Drop from NodeMenu ============
function onDragOver(e: DragEvent) {
  e.preventDefault();
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  if (!efContainer.value) return;
  const json = e.dataTransfer?.getData('application/json');
  if (!json) return;
  try {
    const node = JSON.parse(json);
    const rect = efContainer.value.getBoundingClientRect();
    const x = (e.clientX - rect.left) / container.zoom;
    const y = (e.clientY - rect.top) / container.zoom;
    createNodeWithPos(node, x, y);
  } catch { /* ignore parse errors */ }
}
watch(() => mouse.position, (val) => emit('mouseContainerPos', val), { deep: true });

// Re-clamp position when node list changes (canvas dimensions may have changed)
watch(() => nodeList.value.length, () => {
  const clamped = clampPanPosition(container.pos.top, container.pos.left);
  container.pos.top = clamped.top;
  container.pos.left = clamped.left;
});

// ============ Lifecycle ============
onMounted(() => {
  initJsPlumb();
  // Ensure default 100% zoom on mount (prevents stale zoom from reactive init quirks)
  container.zoom = 1;
  container.pos = { top: 0, left: 0 };
  document.addEventListener('keydown', onKeyDown);
  // Listen for external addNode events
  processEventBus.on('addNode', (node: any) => createNodeWithPos(node, mouse.position.x, mouse.position.y));
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('mousemove', onDocumentDragMouseMove);
  document.removeEventListener('mouseup', onDocumentDragMouseUp);
  container.dragging = false;
  container.button = 0;
  processEventBus.off('addNode');
});

defineExpose({ zoomIn, zoomOut, resetZoom, drawLink, getJsPlumbInstance: () => jsPlumbInstance, container, mouse, showNodeContextMenu, clickNode, changeNodeSite, linkBlank, createNodeWithPos, clampPanPosition });
</script>

<template>
  <div class="flow-area-container" :style="flowAreaStyle" @mousedown="mousedownHandler" @wheel="mouseWheelAction">
    <div
      id="efContainer"
      ref="efContainer"
      class="container"
      :style="efContainerStyle"
      @contextmenu="showContainerContextMenu"
      @mousedown="mousedownHandler"
      @mousemove="mousemoveHandler"
      @mouseup="mouseupHandler"
      @dragover="onDragOver"
      @drop="onDrop"
    >
      <slot />
      <!-- Rectangle multi-select -->
      <div
        v-if="rectangleMultiple.multipling"
        class="rectangle-multiple"
        :style="{
          left: `${rectangleMultiple.pos.left}px`,
          top: `${rectangleMultiple.pos.top}px`,
          width: `${rectangleMultiple.width}px`,
          height: `${rectangleMultiple.height}px`,
        }"
      />
    </div>

    <!-- Zoom indicator -->
    <div class="zoom-indicator">缩放: {{ zoomPercent }}</div>

    <!-- Node context menu -->
    <ContextMenu
      :visible="nodeContextMenuVisible"
      :x="nodeContextMenuData.axis.x"
      :y="nodeContextMenuData.axis.y"
      :menu-items="nodeContextMenuData.menulists"
      @action="handleNodeMenuAction"
      @close="nodeContextMenuVisible = false"
    />

    <!-- Area context menu -->
    <ContextMenu
      :visible="areaContextMenuVisible"
      :x="areaContextMenuData.axis.x"
      :y="areaContextMenuData.axis.y"
      :menu-items="[{ fnHandler: 'addNode', btnName: '添加节点' }]"
      @action="handleAreaMenuAction"
      @close="areaContextMenuVisible = false"
    />

    <!-- Line context menu -->
    <ContextMenu
      :visible="lineContextMenuVisible"
      :x="lineContextMenuData.axis.x"
      :y="lineContextMenuData.axis.y"
      :menu-items="[{ fnHandler: 'deleteLine', btnName: '删除连线' }]"
      @action="(fn: string) => { if (fn === 'deleteLine') deleteLine(); lineContextMenuVisible = false; }"
      @close="() => { lineContextMenuVisible = false; connInfo = null; }"
    />
  </div>
</template>

<style scoped>
.flow-area-container {
  position: relative;
  width: 100%;
  height: 100%;
  user-select: none;
  background-color: #f9f9f9;
  background-image:
    linear-gradient(90deg, rgb(235 235 235 / 100%) 5%, rgb(0 0 0 / 0%) 5%),
    linear-gradient(rgb(235 235 235 / 100%) 5%, rgb(0 0 0 / 0%) 5%);
}

#efContainer {
  position: absolute;
}

.zoom-indicator {
  position: absolute;
  bottom: 10px;
  right: 20px;
  background-color: rgb(0 0 0 / 50%);
  color: #fff;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  z-index: 100;
}

.rectangle-multiple {
  position: absolute;
  border: 1px dashed #176ac5;
  background: rgb(23 106 197 / 8%);
  pointer-events: none;
  z-index: 50;
}
</style>
