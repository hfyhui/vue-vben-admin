import { ref } from 'vue';
import { defineStore } from 'pinia';

/** Deep clone helper — mirrors cloud_phone_web Vuex deepClone behavior */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone) as unknown as T;
  const cloned: Record<string, any> = {};
  for (const key of Object.keys(obj as Record<string, any>)) {
    cloned[key] = deepClone((obj as Record<string, any>)[key]);
  }
  return cloned as T;
}

export interface ProcessInfo {
  id?: string;
  name?: string;
  code?: string;
  type?: string;
  flow?: any;
  variables?: any[];
  nodeList?: any[];
  [key: string]: any;
}

export interface RunTestNode {
  startNode: string;
  endNode: string;
}

export interface FlowData {
  id: string;
  name: string;
  type?: string;
}

export interface CurrentCoverPort {
  id?: string;
  portId?: string;
  nodeId?: string;
  position?: string;
  isDragging?: boolean;
}

export interface ActiveInfo {
  type: 'node' | 'variable' | null;
  id: string | null;
  data: any;
}

export const useProcessVisualStore = defineStore('processVisual', () => {
  // ========== Core process state ==========
  const loading = ref(false);
  const processType = ref('');
  const processInfo = ref<ProcessInfo>({});
  const processId = ref('');
  const processName = ref('');
  const runTestNode = ref<RunTestNode>({ startNode: '', endNode: '' });
  const flow = ref<FlowData>({ id: '', name: '' });

  // ========== Flow data state ==========
  const nodeList = ref<any[]>([]);
  const linkList = ref<any[]>([]);
  const variables = ref<any[]>([]);
  const gridZoom = ref(1);
  const activeInfo = ref<ActiveInfo>({ type: null, id: null, data: null });
  const allFlow = ref<any>(null);
  const curFlow = ref<any>({});
  const curFlowId = ref('');

  // ========== UI state ==========
  const saveLoading = ref(false);
  const saveFlag = ref('');
  const locale = ref('zhCN');
  const showstate = ref(true);
  const resource = ref(localStorage.getItem('resource') || '');

  // ========== Operation tracking ==========
  const activeNodes = ref<string[]>([]);
  const rightClickedNodeId = ref('');
  const nodeOperation = ref('');
  const selectedPorts = ref<any[]>([]);

  // ========== jsPlumb state ==========
  const plumb = ref<any>(null);

  // ========== Change tracking ==========
  const changeNodeId = ref<Record<string, any>>({});
  const changeFlowId = ref('');
  const changeMenuState = ref('');

  // ========== Port dragging ==========
  const currentCoverPort = ref<CurrentCoverPort>({});
  const connectDragging = ref<CurrentCoverPort>({});

  // ========== Copy/paste ==========
  const copiedNodes = ref<any[]>([]);

  // ========== Undo/redo stacks ==========
  const flowStack = ref<any[]>([]);
  const backFlowStack = ref<any[]>([]);
  const autoSaveStack = ref<number[]>([]);

  // ========== Job execution state ==========
  const jobId = ref('');
  const jobPhoneId = ref('');

  // ========== Mouse interaction state ==========
  const addSelectChoices = ref<any[]>([]);
  const mouseClickProperties = ref<Record<string, any>>({});
  const executeOpreation = ref<any>(null);

  // ========== Actions ==========

  // --- Loading ---
  function START_LOADING() {
    loading.value = true;
  }
  function FINISH_LOADING() {
    loading.value = false;
  }
  function setLoading(value: boolean) {
    loading.value = value;
  }

  // --- Process ---
  function setProcessType(value: string) {
    processType.value = value;
  }
  function setProcessInfo(value: ProcessInfo) {
    processInfo.value = value;
  }
  function setProcessId(value: string) {
    processId.value = value;
  }
  function setProcessName(value: string) {
    processName.value = value;
  }

  // --- Run test ---
  function setRunTestNode(value: RunTestNode) {
    runTestNode.value = value;
  }

  // --- Flow ---
  function setFlow(value: FlowData) {
    flow.value = value;
  }
  function setCurFlow(value: any) {
    curFlow.value = value;
  }
  function setAllFlow(flowData: any) {
    allFlow.value = flowData;
  }

  // --- Node list ---
  function setNodeList(value: any[]) {
    nodeList.value = value;
  }

  // --- Link list ---
  function setLinkList(value: any[]) {
    linkList.value = value;
  }

  // --- Variables ---
  function setVariables(value: any[]) {
    variables.value = value;
  }

  // --- Grid zoom ---
  function setGridZoom(value: number) {
    gridZoom.value = value;
  }

  // --- Active info ---
  function setActiveInfo(value: ActiveInfo) {
    activeInfo.value = value;
  }
  function clearActiveInfo() {
    activeInfo.value = { type: null, id: null, data: null };
  }

  // --- Active nodes ---
  function setActiveNodes(nodes: string[]) {
    activeNodes.value = nodes;
  }

  // --- Right click ---
  function setRightClickedNodeId(nodeId: string) {
    rightClickedNodeId.value = nodeId;
  }

  // --- Node operation ---
  function setNodeOperation(operation = 'default') {
    nodeOperation.value = operation;
    // Push undo snapshot when flow has been loaded
    if (flow.value.id !== '') {
      const currentSnapshot = {
        id: flow.value.id,
        name: flow.value.name,
        type: flow.value.type,
        nodeList: deepClone(nodeList.value),
        linkList: deepClone(linkList.value),
        variables: deepClone(variables.value),
      };
      flowStack.value.push(currentSnapshot);
      // Keep max 15 undo entries
      if (flowStack.value.length > 15) {
        flowStack.value.splice(0, flowStack.value.length - 15);
      }
      // Trigger auto-save
      if (flow.value.id !== null && flow.value.id !== '') {
        autoSaveStack.value.push(Date.now());
      }
    }
  }

  // --- jsPlumb ---
  function setPlumb(instance: any) {
    plumb.value = instance;
  }

  // --- Save ---
  function setSaveLoading(value: boolean) {
    saveLoading.value = value;
  }
  function setSaveFlag(value: string) {
    saveFlag.value = value;
  }

  // --- Change tracking ---
  function CHANGE_NODEID(variable: Record<string, any>) {
    changeNodeId.value = variable;
  }
  function setChangeFlowId(variable: string) {
    changeFlowId.value = variable;
  }
  function setMenuState(variable: string) {
    changeMenuState.value = variable;
  }

  // --- Resource ---
  function CHANGE_RESOURCE(val: string) {
    resource.value = val;
    localStorage.setItem('resource', val);
  }

  // --- Show state ---
  function SHOW_SATE(val: boolean) {
    showstate.value = val;
  }

  // --- Language ---
  function CHANGE_LANGUAGE(language: string) {
    locale.value = language;
    localStorage.setItem('locale', language);
  }

  // --- Job ---
  function setJobId(id: string) {
    jobId.value = id;
  }
  function setJobPhoneId(id: string) {
    jobPhoneId.value = id;
  }

  // --- Auto save stack ---
  function clearAutoSaveStack() {
    autoSaveStack.value = [];
  }

  // --- Flow stack (undo) ---
  function setFlowStack(stack: any[]) {
    flowStack.value = stack;
  }
  function clearFlowStack() {
    flowStack.value = [];
  }
  function pushFlowStack(state: any) {
    flowStack.value.push(state);
  }
  function popFlowStack(): any | undefined {
    const { length } = flowStack.value;
    if (length > 0) {
      const latestSnapshot = deepClone(flowStack.value[length - 1]);
      // Restore flow metadata
      flow.value = {
        id: latestSnapshot.id,
        name: latestSnapshot.name,
        type: latestSnapshot.type,
      };

      // Diff nodes: find removed/added by comparing IDs
      const oldIds = nodeList.value.map((n: any) => n.id);
      const newIds = (latestSnapshot.nodeList || []).map((n: any) => n.id);
      // Nodes in old but not in new → remove from jsPlumb
      const removedIds = oldIds.filter((id: string) => !newIds.includes(id));
      removedIds.forEach((id: string) => {
        try { plumb.value?.remove(id); } catch (_) { /* ignore */ }
      });
      // Nodes in new but not in old → will be rendered by Vue, need jsPlumb reconnect later
      const addedIds = newIds.filter((id: string) => !oldIds.includes(id));

      // Restore data
      nodeList.value = deepClone(latestSnapshot.nodeList || []);
      linkList.value = deepClone(latestSnapshot.linkList || []);
      variables.value = deepClone(latestSnapshot.variables || []);

      // Reconnect lines for added nodes
      if (addedIds.length > 0) {
        setTimeout(() => {
          (latestSnapshot.linkList || [])
            .filter((l: any) => addedIds.includes(l.source) || addedIds.includes(l.target))
            .forEach((l: any) => {
              try {
                plumb.value?.connect(
                  { uuids: [l.sourcePort, l.targetPort] },
                  {
                    paintStyle: {
                      stroke: l.cls?.linkColor || '#959CB6',
                      strokeWidth: 2,
                      outlineStroke: 'transparent',
                      outlineWidth: 2,
                    },
                  },
                );
              } catch (_) { /* ignore */ }
            });
        }, 100);
      }

      flowStack.value.pop();
      backFlowStack.value.push(latestSnapshot);
      return latestSnapshot;
    }
    return undefined;
  }

  // --- Back flow stack (redo) ---
  function setBackFlowStack(stack: any[]) {
    backFlowStack.value = stack;
  }
  function pushBackFlowStack(state: any) {
    backFlowStack.value.push(state);
  }
  function popBackFlowStack(): any | undefined {
    const { length } = backFlowStack.value;
    if (length > 0) {
      const latestSnapshot = deepClone(backFlowStack.value[length - 1]);

      flow.value = {
        id: latestSnapshot.id,
        name: latestSnapshot.name,
        type: latestSnapshot.type,
      };

      // Diff nodes
      const oldIds = nodeList.value.map((n: any) => n.id);
      const newIds = (latestSnapshot.nodeList || []).map((n: any) => n.id);
      const removedIds = oldIds.filter((id: string) => !newIds.includes(id));
      removedIds.forEach((id: string) => {
        try { plumb.value?.remove(id); } catch (_) { /* ignore */ }
      });
      const addedIds = newIds.filter((id: string) => !oldIds.includes(id));

      nodeList.value = deepClone(latestSnapshot.nodeList || []);
      linkList.value = deepClone(latestSnapshot.linkList || []);
      variables.value = deepClone(latestSnapshot.variables || []);

      if (addedIds.length > 0) {
        setTimeout(() => {
          (latestSnapshot.linkList || [])
            .filter((l: any) => addedIds.includes(l.source) || addedIds.includes(l.target))
            .forEach((l: any) => {
              try {
                plumb.value?.connect(
                  { uuids: [l.sourcePort, l.targetPort] },
                  {
                    paintStyle: {
                      stroke: l.cls?.linkColor || '#959CB6',
                      strokeWidth: 2,
                      outlineStroke: 'transparent',
                      outlineWidth: 2,
                    },
                  },
                );
              } catch (_) { /* ignore */ }
            });
        }, 100);
      }

      backFlowStack.value.pop();
      flowStack.value.push(latestSnapshot);
      return latestSnapshot;
    }
    return undefined;
  }

  // --- Mouse interaction ---
  function setAddSelectChoices(choices: any[]) {
    addSelectChoices.value = choices;
  }
  function setMouseClickProperties(data: Record<string, any>) {
    mouseClickProperties.value = data;
  }
  function setExecuteOpreation(data: any) {
    executeOpreation.value = data;
  }

  // --- Port operations ---
  function setCurrentCoverPort(port: CurrentCoverPort) {
    currentCoverPort.value = port;
  }
  function setConnectDragging(data: CurrentCoverPort) {
    connectDragging.value = data;
  }

  // --- Copy/paste ---
  function setCopiedNodes(nodes: any[]) {
    copiedNodes.value = nodes;
  }

  // --- Reset ---
  function $reset() {
    loading.value = false;
    processType.value = '';
    processInfo.value = {};
    processId.value = '';
    processName.value = '';
    runTestNode.value = { startNode: '', endNode: '' };
    flow.value = { id: '', name: '' };
    nodeList.value = [];
    linkList.value = [];
    variables.value = [];
    gridZoom.value = 1;
    activeInfo.value = { type: null, id: null, data: null };
    allFlow.value = null;
    curFlow.value = {};
    curFlowId.value = '';
    saveLoading.value = false;
    saveFlag.value = '';
    locale.value = 'zhCN';
    showstate.value = true;
    resource.value = localStorage.getItem('resource') || '';
    activeNodes.value = [];
    rightClickedNodeId.value = '';
    nodeOperation.value = '';
    selectedPorts.value = [];
    plumb.value = null;
    changeNodeId.value = {};
    changeFlowId.value = '';
    changeMenuState.value = '';
    currentCoverPort.value = {};
    connectDragging.value = {};
    copiedNodes.value = [];
    flowStack.value = [];
    backFlowStack.value = [];
    autoSaveStack.value = [];
    jobId.value = '';
    jobPhoneId.value = '';
    addSelectChoices.value = [];
    mouseClickProperties.value = {};
    executeOpreation.value = null;
  }

  return {
    // State
    loading,
    processType,
    processInfo,
    processId,
    processName,
    runTestNode,
    flow,
    nodeList,
    linkList,
    variables,
    gridZoom,
    activeInfo,
    allFlow,
    curFlow,
    curFlowId,
    saveLoading,
    saveFlag,
    locale,
    showstate,
    resource,
    activeNodes,
    rightClickedNodeId,
    nodeOperation,
    selectedPorts,
    plumb,
    changeNodeId,
    changeFlowId,
    changeMenuState,
    currentCoverPort,
    connectDragging,
    copiedNodes,
    flowStack,
    backFlowStack,
    autoSaveStack,
    jobId,
    jobPhoneId,
    addSelectChoices,
    mouseClickProperties,
    executeOpreation,

    // Actions
    START_LOADING,
    FINISH_LOADING,
    setLoading,
    setProcessType,
    setProcessInfo,
    setProcessId,
    setProcessName,
    setRunTestNode,
    setFlow,
    setCurFlow,
    setAllFlow,
    setNodeList,
    setLinkList,
    setVariables,
    setGridZoom,
    setActiveInfo,
    clearActiveInfo,
    setActiveNodes,
    setRightClickedNodeId,
    setNodeOperation,
    setPlumb,
    setSaveLoading,
    setSaveFlag,
    CHANGE_NODEID,
    setChangeFlowId,
    setMenuState,
    CHANGE_RESOURCE,
    SHOW_SATE,
    CHANGE_LANGUAGE,
    setJobId,
    setJobPhoneId,
    clearAutoSaveStack,
    setFlowStack,
    clearFlowStack,
    pushFlowStack,
    popFlowStack,
    setBackFlowStack,
    pushBackFlowStack,
    popBackFlowStack,
    setAddSelectChoices,
    setMouseClickProperties,
    setExecuteOpreation,
    setCurrentCoverPort,
    setConnectDragging,
    setCopiedNodes,
    $reset,
  };
});
