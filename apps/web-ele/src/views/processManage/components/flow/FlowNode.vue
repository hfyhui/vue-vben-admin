<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useProcessVisualStore } from '#/store/modules/processVisual';
import { jsplumbSourceOptions } from '../../jsplumbConfig';
import FlowPort from './FlowPort.vue';

const props = defineProps<{ node: any; zoom?: number }>();
const emit = defineEmits<{
  (e: 'showNodeContextMenu', nodeId: string, event: MouseEvent): void;
  (e: 'changeNodeSite', data: { nodeId: string; x: number; y: number }): void;
  (e: 'clickNode', nodeId: string): void;
  (e: 'linkBlank'): void;
}>();

const store = useProcessVisualStore();
const { activeNodes, plumb, linkList } = storeToRefs(store);

const isActive = computed(() => activeNodes.value.includes(props.node.id));
const isDisable = computed(() => !!props.node.disable);
const nodeBorder = computed(() =>
  isActive.value ? '2px solid rgba(23,106,197,0.5)' : '2px solid #E3E3E3',
);
const nodeShadow = computed(() =>
  isActive.value
    ? '0 2px 4px 0 rgba(0,0,0,0.1)'
    : '0 2px 4px 0 rgba(0,0,0,0.06)',
);

const L = computed(() =>
  (props.node.ports?.input || []).map((p: any, i: number) => ({
    ...p,
    position: 'left',
    node: props.node,
    total: props.node.ports?.input.length,
    index: i,
  })),
);
const R = computed(() =>
  (props.node.ports?.output || []).map((p: any, i: number) => ({
    ...p,
    position: 'right',
    node: props.node,
    total: props.node.ports?.output.length,
    index: i,
  })),
);

const ph = reactive({ lh: 0, rh: 0, ln: 0, rn: 0 });
const pwh = ref<any[]>([]);
const TH = 40;

function getPH(h: number, portId: string, pos: string) {
  let isUpdate = false;
  if (pos === 'left') {
    if (ph.ln < L.value.length) {
      pwh.value.push({ id: portId, height: h, position: pos, offset: 0 });
      ph.lh += h;
      ph.ln++;
    } else {
      isUpdate = true;
      const i = pwh.value.findIndex(
        (p: any) => p.id === portId && p.position === pos,
      );
      if (i > -1) {
        ph.lh = ph.lh - pwh.value[i].height + h;
        pwh.value[i].height = h;
      }
    }
  } else {
    if (ph.rn < R.value.length) {
      pwh.value.push({ id: portId, height: h, position: pos, offset: 0 });
      ph.rh += h;
      ph.rn++;
    } else {
      isUpdate = true;
      const i = pwh.value.findIndex(
        (p: any) => p.id === portId && p.position === pos,
      );
      if (i > -1) {
        ph.rh = ph.rh - pwh.value[i].height + h;
        pwh.value[i].height = h;
      }
    }
  }
  if (ph.ln === L.value.length && ph.rn === R.value.length) {
    const ch = Math.max(ph.lh, ph.rh);
    const el = document.getElementById(props.node.id);
    const H = el?.offsetHeight || (ch + TH * 1.5);
    L.value.forEach((p: any) => addAP(p, 'left', p.total, p.index, H));
    R.value.forEach((p: any) => addAP(p, 'right', p.total, p.index, H));
  }
  // Redraw + recalculate anchors when port heights update
  if (isUpdate && plumb.value) {
    const ch = Math.max(ph.lh, ph.rh);
    const el = document.getElementById(props.node.id);
    const H = el?.offsetHeight || (ch + TH * 1.5);
    L.value.forEach((p: any) => addAP(p, 'left', p.total, p.index, H));
    R.value.forEach((p: any) => addAP(p, 'right', p.total, p.index, H));
    linkList.value
      .filter((l: any) => l.source === props.node.id || l.target === props.node.id)
      .forEach((l: any) => {
        try {
          plumb.value.connect(
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
        } catch {}
      });
  }
}

function setPortOffset(offset: number, portId: string) {
  const p = pwh.value.find((x: any) => x.id === portId);
  if (p) p.offset = offset;
}

function addAP(
  port: any,
  pos: string,
  total: number,
  index: number,
  H: number,
) {
  if (!plumb.value) return;
  if (!document.getElementById(props.node.id)) {
    setTimeout(() => addAP(port, pos, total, index, H), 50);
    return;
  }

  const x = pos === 'left' ? 0.05 : 0.95;
  const dx = pos === 'left' ? -1 : 1;

  // CSS constants — must match .fpc { gap: 5px; padding: 8px 0; }
  const FPC_PADDING = 8;
  const FPC_GAP = 5;

  let ya = 0;
  for (let i = 0; i < index; i++) {
    const pid =
      pos === 'left'
        ? props.node.ports?.input[i]?.id
        : props.node.ports?.output[i]?.id;
    ya += pwh.value.find((p: any) => p.id === pid)?.height || 0;
  }
  // Account for vertical gap between ports + container padding
  ya += FPC_PADDING + index * FPC_GAP;

  const myData = pwh.value.find((p: any) => p.id === port.id);
  const myHeight = myData?.height || 0;
  const myOffset = myData?.offset ?? (myHeight / 2);
  // 动态测量标题栏底部位置，替代硬编码 1.5*TH
  const el = document.getElementById(props.node.id);
  const fntEl = el?.querySelector('.fnt') as HTMLElement;
  const nodeStyles = el ? getComputedStyle(el) : null;
  const fntStyles = fntEl ? getComputedStyle(fntEl) : null;
  const borderTop = nodeStyles ? parseFloat(nodeStyles.borderTopWidth) || 2 : 2;
  const fntBorderBottom = fntStyles ? parseFloat(fntStyles.borderBottomWidth) || 1 : 1;
  const titleBottom = fntEl
    ? borderTop + fntEl.offsetTop + fntEl.offsetHeight + fntBorderBottom
    : TH + borderTop + 1;
  const y = (titleBottom + ya + myOffset) / H;
  if (plumb.value.getEndpoint(port.id)) plumb.value.deleteEndpoint(port.id);
  plumb.value.addEndpoint(
    props.node.id,
    { endpoint: 'Blank', anchor: [x, y, dx, 0], uuid: port.id },
    { maxConnections: -1, isSource: false, isTarget: true },
  );
}

function drawNode() {
  if (!plumb.value) return;
  nextTick(() => {
    setTimeout(() => {
      if (!plumb.value) return;
      if (!document.getElementById(props.node.id)) {
        setTimeout(() => drawNode(), 50);
        return;
      }

      plumb.value.draggable(props.node.id, {
        containment: 'parent',
        filter: '.flow-node-drag',
        anchor: 'Continuous',
        allowLoopback: false,
        dropOptions: { hoverClass: 'ef-drop-hover' },
        ConnectionsDetachable: true,
      });
      plumb.value.makeSource(props.node.id, jsplumbSourceOptions);
    }, 50);
  });
}

watch(
  () => plumb.value,
  (v) => {
    if (v) {
      nextTick(drawNode);
      ph.ln = 0;
      ph.rn = 0;
      ph.lh = 0;
      ph.rh = 0;
    }
  },
  { immediate: true },
);

let drag = false,
  startClientX = 0,
  startClientY = 0,
  startNodeX = 0,
  startNodeY = 0;
function md(e: MouseEvent) {
  emit('clickNode', props.node.id);
  store.setActiveInfo({ type: 'node', id: props.node.id, data: null });
  if ((e.target as HTMLElement).classList.contains('flow-node-drag')) return;
  drag = true;
  startClientX = e.clientX;
  startClientY = e.clientY;
  startNodeX = props.node.x;
  startNodeY = props.node.y;
  document.addEventListener('mousemove', mm);
  document.addEventListener('mouseup', mu);
  e.preventDefault();
}
function mm(e: MouseEvent) {
  if (!drag) return;
  const z = props.zoom || 1;
  emit('changeNodeSite', {
    nodeId: props.node.id,
    x: startNodeX + (e.clientX - startClientX) / z,
    y: startNodeY + (e.clientY - startClientY) / z,
  });
}
function mu() {
  drag = false;
  document.removeEventListener('mousemove', mm);
  document.removeEventListener('mouseup', mu);
}
function cm(e: MouseEvent) {
  e.preventDefault();
  emit('showNodeContextMenu', props.node.id, e);
}
</script>

<template>
  <div
    :id="node.id"
    class="fn"
    :style="{
      left: node.x + 'px',
      top: node.y + 'px',
      width: (node.width || 100) + 'px',
      border: nodeBorder,
      boxShadow: nodeShadow,
    }"
    @mousedown="md"
    @contextmenu="cm"
  >
    <div v-if="isDisable" class="fb">
      <span class="iconfont icon-jinzhi" style="font-size: 46px; color: #fff" />
    </div>
    <div class="fnt" :style="{ height: TH + 'px' }">
      <div
        class="ir"
        :style="{ backgroundColor: node.cls?.color || '#176ac5' }"
      >
        <span v-if="node.cls?.icon" :class="['fanxi', node.cls.icon]" />
      </div>
      <span class="tt">{{ node.title || node.name }}</span>
    </div>
    <div class="fnc">
      <div class="fpc">
        <FlowPort
          v-for="p in L"
          :key="p.id"
          :port="p"
          :title-height="TH"
          position="left"
          @height="(h: number) => getPH(h, p.id, 'left')"
          @dot-offset="(o: number) => setPortOffset(o, p.id)"
          @link-blank="emit('linkBlank')"
        />
      </div>
      <div class="fpc">
        <FlowPort
          v-for="p in R"
          :key="p.id"
          :port="p"
          :title-height="TH"
          position="right"
          @height="(h: number) => getPH(h, p.id, 'right')"
          @dot-offset="(o: number) => setPortOffset(o, p.id)"
          @link-blank="emit('linkBlank')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.fn {
  position: absolute;
  border-radius: 5px;
  opacity: 0.9;
  background-color: #fff;
}
.fn:hover {
  background-color: #f0f7ff;
}
.fnt {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: bold;
  border-bottom: 1px solid #e3e3e3;
}
.ir {
  width: 20px;
  height: 20px;
  margin: 0 8px 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}
.ir .fanxi {
  margin-top: 1px;
  color: #fff;
}
.tt {
  cursor: context-menu;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fnc {
  border-radius: 5px;
  background-color: #fff;
  display: flex;
}
.fpc {
  width: 50%;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 0;
}
.fb {
  background: rgb(0 0 0/60%);
  border-radius: 0 0 4px 4px;
  width: 100%;
  height: calc(100% - 40px);
  position: absolute;
  top: 40px;
  left: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
