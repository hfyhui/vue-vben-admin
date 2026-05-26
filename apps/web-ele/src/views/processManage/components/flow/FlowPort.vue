<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { useProcessVisualStore } from '#/store/modules/processVisual';

const props = defineProps<{
  port: any;
  titleHeight: number;
  position: string;
}>();
const emit = defineEmits<{
  (e: 'height', h: number): void;
  (e: 'dotOffset', offset: number): void;
  (e: 'linkBlank'): void;
}>();

const store = useProcessVisualStore();
const { plumb, nodeList, linkList } = storeToRefs(store);
const router = useRouter();

// 获取当前流程 ID（优先 store.flow.id，其次 URL 参数 fid）
const flowId = computed(() => {
  if (store.flow?.id) return store.flow.id;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('fid') || '';
});

const isFlow = computed(() => props.port.portType === 'flow');
const isData = computed(() => !isFlow.value && !!props.port.elementType);
const portColor = computed(() => props.port.cls?.color || '#959CB6');
const isConnected = computed(() =>
  linkList.value.some(
    (l: any) =>
      l.sourcePort === props.port.id || l.targetPort === props.port.id,
  ),
);

const containerRef = ref<HTMLElement | null>(null);

// 初始化表单值：对于 number/float 类型使用 null 作为默认值，
// 避免 ElInputNumber 报 "Expected Number | Null, got String" 警告
function getInitialFormValue() {
  const { dataType, value } = props.port;
  if (dataType === 'number' || dataType === 'float') {
    return value != null && value !== '' ? value : null;
  }
  return value ?? '';
}
const formValue = ref(getInitialFormValue());
const selectOptions = ref<any[]>([]);

// ---- Debounce (300ms) ----
let dtimer: any = null;
function db<T extends (...args: any[]) => void>(fn: T, ms: number) {
  return (...args: any[]) => {
    clearTimeout(dtimer);
    dtimer = setTimeout(() => fn(...args), ms);
  };
}

// ---- getChoices (remote select) ----
async function getChoices(port: any) {
  try {
    if (port.choicesUrl) {
      // Replace {process_id} placeholder with current flow ID from URL
      const locationUrl = window.location.href;
      const queryInfo = locationUrl.split('?')[1] || '';
      const params = new URLSearchParams(queryInfo);
      const processId = params.get('fid') || '';
      let url = port.choicesUrl.replace('{process_id}', processId);
      const response = await fetch(`/platform${url}`);
      const res = await response.json();
      const list = port.choicesList ? res[port.choicesList] : res;
      if (Array.isArray(list))
        selectOptions.value = list.map((c: any) => ({
          label: c[port.choicesText || 'text'],
          value: c[port.choicesValue || 'value'],
        }));
    } else if (port.choices) {
      selectOptions.value = port.choices.map((c: any) => ({
        label: c.text,
        value: c.value,
      }));
    }
  } catch {
    selectOptions.value = [];
  }
}

// ---- el-form type resolution ----
const elType = computed(() => {
  const { elementType: et, dataType: dt } = props.port;
  if (et === 'textarea' || et === 'pythonEditor' || et === 'jsEditor')
    return 'textarea';
  if (et === 'inspect') return 'inspect';
  if (et === 'image') return 'image';
  if (et === 'subprocess') return 'subprocess';
  if (dt === 'number' || dt === 'float') return 'number';
  if (dt === 'password') return 'password';
  if (dt === 'date') return 'date';
  if (et === 'select') return 'select';
  if (et === 'searchSelect') return 'searchSelect';
  if (dt === 'bool') return 'checkbox';
  if (dt === 'array') return 'array';
  return 'text';
});

const isVisible = computed(() => props.port.visible !== 'no');

// ---- Subprocess navigation ----
function openSubFlow() {
  const nodeId = props.port.node?.id;
  if (!nodeId) return;
  const href = router.resolve({
    name: 'VisualEditor',
    query: { fid: flowId.value, fcid: nodeId },
  }).href;
  window.open(href, '_blank');
}

// ---- Form change with dataType dispatch ----
function onFormChange() {
  db((val: any) => {
    // duration 字段禁止负数输入
    if (props.port.name === 'duration' && String(val).includes('-')) return;
    const nodes = [...nodeList.value];
    const ni = nodes.findIndex((n: any) => n.id === props.port.node.id);
    if (ni < 0) return;
    const type = props.position === 'left' ? 'input' : 'output';
    const p = nodes[ni].ports[type][props.port.index];
    switch (props.port.dataType) {
      case 'bool':
        p.value = Array.isArray(val) ? val.length > 0 : !!val;
        store.setNodeList(nodes);
        store.setNodeOperation('uploadBool');
        break;
      case 'number':
      case 'float':
        // Validate numeric format: +/- digits, optional decimal, optional exponent
        if (!/^[+-]?\d*(\.\d*)?(e[+-]?\d+)?$/.test(String(val))) return;
        p.value = val;
        store.setNodeList(nodes);
        store.setNodeOperation('uploadNormal');
        break;
      case 'password':
        p.value = typeof val === 'object' ? val.text : val;
        p.visible =
          typeof val === 'object' ? (val.visible ? 'yes' : 'no') : 'yes';
        store.setNodeList(nodes);
        store.setNodeOperation('uploadPassword');
        break;
      default:
        p.value = val;
        store.setNodeList(nodes);
        store.setNodeOperation('uploadNormal');
        break;
    }

    // 坐标联动：X轴/Y轴端口变更时同步 detailPanel 的坐标字段
    if (
      (props.port.title === 'X轴坐标' || props.port.title === 'Y轴坐标') &&
      props.port.nodeIndex >= 0
    ) {
      const nd = nodes[props.port.nodeIndex];
      const type2 = props.position === 'left' ? 'input' : 'output';
      const ports2 = nd.ports[type2];
      const xIdx = ports2.findIndex((it: any) => it.title === 'X轴坐标');
      const yIdx = ports2.findIndex((it: any) => it.title === 'Y轴坐标');
      if (xIdx > -1 && yIdx > -1) {
        const dp = nd.detailPanel;
        if (dp?.common?.formDatas) {
          const coordIdx = dp.common.formDatas.findIndex(
            (fd: any) => fd.title === '坐标',
          );
          if (coordIdx > -1) {
            dp.common.formDatas[coordIdx].value = [
              ports2[xIdx].value,
              ports2[yIdx].value,
            ].join(',');
          }
        }
        if (dp?.options?.formDatas) {
          const paramIdx = dp.options.formDatas.findIndex(
            (fd: any) => fd.title === '参数',
          );
          if (paramIdx > -1) {
            const params = dp.options.formDatas[paramIdx].value
              ? JSON.parse(dp.options.formDatas[paramIdx].value)
              : { pos: [] };
            params.pos = [ports2[xIdx].value, ports2[yIdx].value];
            dp.options.formDatas[paramIdx].value = JSON.stringify(
              params,
              null,
              2,
            );
          }
        }
      }
    }
  }, 300)(formValue.value);
}

// Height tracking
function emitHeight() {
  nextTick(() => {
    const el = containerRef.value;
    if (el) {
      const mb = parseFloat(getComputedStyle(el).marginBottom) || 0;
      emit('height', el.offsetHeight + mb);

      // Measure dot/fp center for jsPlumb endpoint alignment
      const dot = el.querySelector('.sp, .fp') as HTMLElement | null;
      if (dot) {
        const dotCenter = dot.offsetTop + dot.offsetHeight / 2;
        emit('dotOffset', dotCenter);
      }
    }
  });
}
onMounted(emitHeight);
watch(() => props.port.value, emitHeight);
watch(formValue, emitHeight);

// Mouse over port
function onMouseOver() {
  const p = props.port;

  store.setCurrentCoverPort(p);
}

// ---- Connection logic ----
function checkConnectingPorts(spId: string, snId: string, cover: any) {


  const sn = nodeList.value.find((n: any) => n.id === snId);
  if (!sn) {
    console.error('  ❌ source node not found');
    return;
  }
  const spPos =
    sn.ports.input.findIndex((p: any) => p.id === spId) === -1
      ? 'right'
      : 'left';

  let sp =
    spPos === 'right'
      ? { ...sn.ports.output.find((p: any) => p.id === spId), node: sn }
      : { ...sn.ports.input.find((p: any) => p.id === spId), node: sn };

  if (snId === cover.node.id) {
    console.warn('  ❌ [1/6] REJECTED: same node');
    return ElMessage.error('不能同节点连接');
  }
  // if (spPos === cover.position) {
  //   console.warn(
  //     '  ❌ [2/6] REJECTED: same side (',
  //     spPos,
  //     '===',
  //     cover.position,
  //     ')',
  //   );
  //   return ElMessage.error('同侧端口无法相连');
  // }

  const src = spPos === 'right' ? sp : cover;
  const tgt = spPos === 'left' ? sp : cover;

  if (
    linkList.value.find(
      (l: any) => l.sourcePort === src.id && l.targetPort === tgt.id,
    )
  ) {
    console.warn('  ❌ [3/6] REJECTED: duplicate');
    return ElMessage.error('该连线已存在');
  }
  // Check 4: portType matching — strict type-based rules
  const allowedPairs: Record<string, string> = {
    flow: 'flow',
    input: 'output',
    output: 'input',
  };
  const expectedTargetType = allowedPairs[src.portType];
  if (!expectedTargetType) {
    console.warn(
      '  ❌ [4/6] REJECTED: unsupported port type (src:',
      src.portType,
      ')',
    );
    return ElMessage.error(`不支持的端口类型：${src.portType}`);
  }
  if (expectedTargetType !== tgt.portType) {
    console.warn(
      '  ❌ [4/6] REJECTED: type mismatch (src:',
      src.portType,
      '→ expected:',
      expectedTargetType,
      'actual tgt:',
      tgt.portType,
      ')',
    );
    return ElMessage.error(
      `端口类型不匹配：${src.portType} 不能连接到 ${tgt.portType}`,
    );
  }

  // Check 5: flow ports — single outgoing connection (source side)
  if (src.portType === 'flow') {
    const del = linkList.value.filter(
      (l: any) => l.source === snId && l.sourcePort === spId,
    );
    if (del.length) {
      unLink(del);
    }
  }
  // Check 6: non-flow target ports — single incoming connection
  if (tgt.portType !== 'flow') {
    const del = linkList.value.filter(
      (l: any) => l.target === tgt.node.id && l.targetPort === tgt.id,
    );
    if (del.length) {
      unLink(del);
    }
  }

  addLink(src.id, tgt.id, src.node.id, tgt.node.id, sp.cls?.color || '#959CB6');
}

function addLink(
  spId: string,
  tpId: string,
  snId: string,
  tnId: string,
  color: string,
) {

  if (!plumb.value) {
    console.error('  ❌ plumb NULL');
    return;
  }
  const id = `link-${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  const spEp = plumb.value.getEndpoint(spId);
  const tpEp = plumb.value.getEndpoint(tpId);
  if (!spEp || !tpEp) {
    console.error('  ❌ endpoint missing — sp:', !!spEp, 'tp:', !!tpEp);
    return;
  }
  plumb.value.connect(
    { uuids: [spId, tpId] },
    {
      paintStyle: {
        stroke: color,
        strokeWidth: 2,
        outlineStroke: 'transparent',
        outlineWidth: 2,
      },
    },
  );
  store.setLinkList([
    ...linkList.value,
    {
      id,
      source: snId,
      sourcePort: spId,
      target: tnId,
      targetPort: tpId,
      cls: { linkColor: color },
    },
  ]);
  plumb.value.repaintEverything();
  store.setNodeOperation('addLink');
}

function unLink(dels: any[]) {
  const links = [...linkList.value];
  dels.forEach((l: any) => {
    plumb.value
      ?.getConnections()
      .filter((c: any) => c.sourceId === l.source && c.targetId === l.target)
      .forEach((x: any) => plumb.value?.deleteConnection(x));
    const i = links.findIndex((y: any) => y.id === l.id);
    if (i > -1) links.splice(i, 1);
  });
  store.setLinkList(links);
}

const { connectDragging, currentCoverPort } = storeToRefs(store);
watch(
  () => connectDragging.value,
  (v: any) => {
    if (!v.isDragging && v.portId)
      setTimeout(() => {

        if (currentCoverPort.value.id === v.portId) {
          store.setCurrentCoverPort({});
          emit('linkBlank');
        } else if (v.portId === props.port.id) {
          checkConnectingPorts(v.portId, v.nodeId, currentCoverPort.value);
        }
      }, 0);
  },
);

onMounted(() => {
  setTimeout(emitHeight, 150);
  if (props.port.choicesUrl || props.port.choices) getChoices(props.port);
});
</script>

<template>
  <div
    ref="containerRef"
    class="fpc2"
    :style="
      position === 'left'
        ? { paddingLeft: '10%', paddingRight: '2px' }
        : { paddingRight: '10%', paddingLeft: '2px' }
    "
  >
    <div
      class="npc"
      :style="{
        justifyContent: position === 'left' ? 'flex-start' : 'flex-end',
      }"
    >
      <!-- Flow triangle -->
      <div
        v-if="isFlow"
        class="flow-node-drag fnd fp"
        :class="{ cf: isConnected }"
        @mouseover="onMouseOver"
      />

      <!-- Data port with form -->
      <template v-else-if="isData">
        <!-- Right side: port title only (output ports — no form) -->
        <template v-if="position === 'right'">
          <div class="pf pr" @mousedown.stop>
            <span class="port-title">{{ props.port.title }}</span>
          </div>
          <div
            class="flow-node-drag fnd sp"
            :class="{ 'sp-hidden': props.port.elementType === 'select' }"
            :style="{
              backgroundColor: isConnected ? portColor : '#fff',
              border: `1px solid ${portColor}`,
            }"
            @mouseover="onMouseOver"
          />
        </template>
        <!-- Left side: dot first, then form -->
        <template v-else>
          <div
            class="flow-node-drag fnd sp"
            :class="{ 'sp-hidden': props.port.elementType === 'select' }"
            :style="{
              backgroundColor: isConnected ? portColor : '#fff',
              border: `1px solid ${portColor}`,
            }"
            @mouseover="onMouseOver"
          />
          <div class="pf" :style="{ paddingLeft: '5px' }" @mousedown.stop>
            <span class="port-title">{{ props.port.title }}</span>
            <!-- textarea -->
            <el-input
              v-if="elType === 'textarea'"
              v-model="formValue"
              type="textarea"
              :rows="2"
              size="small"
              @change="onFormChange"
              v-show="isVisible"
            />
            <!-- number -->
            <el-input-number
              v-else-if="elType === 'number'"
              v-model="formValue"
              size="small"
              :min="0"
              controls-position="right"
              @change="onFormChange"
              v-show="isVisible"
            />
            <!-- password -->
            <template v-else-if="elType === 'password'">
              <div
                v-show="isVisible"
                style="display: flex; align-items: center; gap: 4px"
              >
                <el-input
                  v-model="formValue"
                  type="password"
                  size="small"
                  show-password
                  @change="onFormChange"
                  style="flex: 1"
                />
              </div>
            </template>
            <!-- date -->
            <el-date-picker
              v-else-if="elType === 'date'"
              v-model="formValue"
              type="date"
              size="small"
              @change="onFormChange"
              v-show="isVisible"
            />
            <!-- select -->
            <el-select
              v-else-if="elType === 'select'"
              v-model="formValue"
              size="small"
              @change="onFormChange"
              v-show="isVisible"
            >
              <el-option
                v-for="o in selectOptions"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </el-select>
            <!-- searchSelect (RPA流程 / 机器人) -->
            <template v-else-if="elType === 'searchSelect'">
              <span style="font-size: 10px; color: #909399; line-height: 1.2">
                {{ props.port.name === 'rpaProcess' ? 'RPA流程' : '机器人' }}
              </span>
              <el-select
                v-model="formValue"
                size="small"
                filterable
                @change="onFormChange"
                v-show="isVisible"
              >
                <el-option
                  v-for="o in selectOptions"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value"
                />
              </el-select>
            </template>
            <!-- checkbox -->
            <el-checkbox
              v-else-if="elType === 'checkbox'"
              v-model="formValue"
              size="small"
              @change="onFormChange"
              v-show="isVisible"
              >{{ props.port.title }}</el-checkbox
            >
            <!-- inspect -->
            <el-button
              v-else-if="elType === 'inspect'"
              size="small"
              v-show="isVisible"
              >捕获元素</el-button
            >
            <!-- image -->
            <span
              v-else-if="elType === 'image'"
              v-show="isVisible"
              style="font-size: 11px; color: #176ac5"
              >图片预览</span
            >
            <!-- subprocess -->
            <el-button
              v-else-if="elType === 'subprocess'"
              size="small"
              v-show="isVisible"
              @click="openSubFlow"
              >子流程</el-button
            >
            <!-- array -->
            <template v-else-if="elType === 'array'">
              <div
                v-for="(item, idx) in Array.isArray(formValue) ? formValue : []"
                :key="idx"
                style="display: flex; gap: 4px; align-items: center"
              >
                <el-input
                  v-model="(formValue as any[])[idx]"
                  size="small"
                  @change="onFormChange"
                />
              </div>
              <el-button
                size="small"
                text
                @click="
                  () => {
                    if (!Array.isArray(formValue)) formValue = [];
                    (formValue as any[]).push('');
                    onFormChange();
                  }
                "
                >+ 添加</el-button
              >
            </template>
            <!-- default text -->
            <el-input
              v-else
              v-model="formValue"
              size="small"
              @change="onFormChange"
              v-show="isVisible"
            />
          </div>
        </template>
      </template>

      <!-- No-form circle (no elementType — pure data port) -->
      <div
        v-else
        class="flow-node-drag fnd sp"
        :style="{
          backgroundColor: isConnected ? portColor : '#fff',
          border: `1px solid ${portColor}`,
        }"
        @mouseover="onMouseOver"
      />
    </div>
  </div>
</template>

<style scoped>
.fpc2 {
  display: flex;
  align-items: center;
  position: relative;
}
.npc {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 2px;
}
.fnd {
  cursor: crosshair;
}
.fp {
  display: inline-block;
  width: 8px;
  height: 10px;
  border-left: 8px solid #959cb6;
  border-bottom: 6px solid transparent;
  border-top: 6px solid transparent;
  position: relative;
  flex-shrink: 0;
}
.fp::after {
  content: '';
  border-left: 6px solid #fff;
  border-bottom: 4px solid transparent;
  border-top: 4px solid transparent;
  position: absolute;
  top: -4px;
  left: -7px;
}
.cf::after {
  border-left-color: #959cb6;
}
.sp {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 2px;
}
.sp-hidden {
  visibility: hidden;
}
.pf {
  flex: 1;
  min-width: 60px;
}
.pr {
  padding-right: 5px;
  text-align: right;
}
.pl {
  flex-shrink: 0;
  font-size: 11px;
  color: #606266;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.plt {
  line-height: 1.2;
}
.port-title {
  display: block;
  font-size: 11px;
  color: #176ac5;
  font-weight: 500;
  margin-bottom: 2px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}
</style>
