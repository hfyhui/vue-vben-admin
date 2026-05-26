<script setup lang="ts">
import { watch, nextTick, ref, onMounted, onUnmounted } from 'vue';

export interface MenuItem {
  fnHandler: string;
  btnName: string;
  icoName?: string;
  isTitle?: boolean;
  isSeparator?: boolean;
}

const props = defineProps<{
  visible: boolean;
  x: number;
  y: number;
  menuItems: MenuItem[];
}>();

const emit = defineEmits<{
  (e: 'action', fnHandler: string): void;
  (e: 'close'): void;
}>();

const menuRef = ref<HTMLElement | null>(null);
const adjustedX = ref(0);
const adjustedY = ref(0);

function adjustPosition() {
  const menu = menuRef.value;
  if (!menu) return;
  const rect = menu.getBoundingClientRect();
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  adjustedX.value = props.x + rect.width > ww ? props.x - rect.width : props.x;
  adjustedY.value = props.y + rect.height > wh ? props.y - rect.height : props.y;
}

function onAction(fnHandler: string) {
  emit('action', fnHandler);
  emit('close');
}

function onDocumentClick(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close');
  }
}

watch(() => props.visible, async (v) => {
  if (v) {
    await nextTick();
    adjustPosition();
  }
});

onMounted(() => document.addEventListener('mousedown', onDocumentClick));
onUnmounted(() => document.removeEventListener('mousedown', onDocumentClick));
</script>

<template>
  <Teleport to="body">
    <div
      v-show="visible"
      ref="menuRef"
      class="cf-context-menu"
      :style="{ left: `${adjustedX}px`, top: `${adjustedY}px` }"
    >
      <template v-for="(item, idx) in menuItems" :key="idx">
        <div
          v-if="item.isSeparator"
          class="menu-separator"
        />
        <div
          v-else-if="item.isTitle"
          class="menu-title"
        >
          {{ item.btnName }}
        </div>
        <div
          v-else
          class="menu-item"
          @click.stop="onAction(item.fnHandler)"
        >
          <span v-if="item.icoName" class="menu-ico">{{ item.icoName }}</span>
          <span class="menu-label">{{ item.btnName }}</span>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.cf-context-menu {
  position: fixed;
  z-index: 10000;
  background: #ffffff;
  border-radius: 2px;
  box-shadow: 0 2px 2px 0 #cccccc;
  padding: 0;
  min-width: 140px;
  font-size: 12px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  cursor: pointer;
  color: #333333;
  height: 26px;
  line-height: 16px;
}

.menu-item:hover {
  background: #ecf5ff;
  color: #176ac5;
}

.menu-title {
  padding: 5px 10px;
  font-weight: 600;
  color: #666666;
  font-size: 11px;
  border-bottom: 1px solid #e8e8e8;
  margin: 0;
  cursor: default;
  height: 26px;
  line-height: 16px;
}

.menu-separator {
  height: 1px;
  background: #e8e8e8;
  margin: 0;
}

.menu-ico {
  margin-right: 6px;
  width: 14px;
  font-size: 12px;
  text-align: center;
}

.menu-label {
  flex: 1;
}
</style>
