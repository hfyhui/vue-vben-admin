<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { getRpaComponents } from '#/api/core/processManage';

const props = defineProps<{
  contextMenuData: {
    menuName: string;
    axis: {
      x: number;
      y: number;
    };
  };
}>();

const emit = defineEmits<{
  (e: 'addNode', node: any): void;
}>();

// 状态
const search = ref('');
const treeData = ref<any[]>([]);
const savedData = ref<any[]>([]);
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

// 树配置
const replaceFields = {
  children: 'children',
  title: 'title',
  key: 'fullName',
};

// 显示状态
const showMenu = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const menuWidth = 300;

function show() {
  search.value = '';
  treeData.value = JSON.parse(JSON.stringify(savedData.value));
  selectedKeys.value = [];
  showMenu.value = true;
  nextTick(() => {
    if (menuRef.value) {
      const { x, y } = props.contextMenuData.axis;
      const { innerWidth, innerHeight } = window;
      menuRef.value.style.top = `${y > innerHeight ? innerHeight : y}px`;
      menuRef.value.style.left = `${x + menuWidth > innerWidth ? innerWidth - menuWidth : x}px`;
      menuRef.value.style.display = 'block';
    }
  });
}

function hide() {
  showMenu.value = false;
  if (menuRef.value) {
    menuRef.value.style.display = 'none';
  }
}

// 加载组件数据
async function loadComponents(searchText = '') {
  try {
    const res = await getRpaComponents({ search: searchText });
    treeData.value = filterAndMapTree(res || []);
    if (!searchText) {
      savedData.value = JSON.parse(JSON.stringify(treeData.value));
    }
  } catch (error) {
    console.error('Failed to load components:', error);
  }
}

// 过滤和映射树
function filterAndMapTree(nodes: any[]) {
  return nodes
    .filter((node) => {
      if (!search.value) return true;
      return node.title?.toLowerCase().includes(search.value.toLowerCase());
    })
    .map((node) => {
      if (node.children && node.children.length > 0) {
        node.children = filterAndMapTree(node.children);
      } else {
        node.scopedSlots = { title: 'custom' };
      }
      return node;
    });
}

// 树展开
function onExpand(keys: string[]) {
  expandedKeys.value = keys;
}

// 树节点选择
function onSelect(keys: string[], info: any) {
  const current = keys[0];
  const selectedNode = foundSelected(current, treeData.value);
  
  if (selectedNode) {
    selectedKeys.value.push(current);
    emit('addNode', selectedNode);
    hide();
  } else {
    // 切换展开状态
    const foundIndex = expandedKeys.value.findIndex((key) => key === current);
    if (foundIndex > -1) {
      expandedKeys.value.splice(foundIndex, 1);
    } else {
      expandedKeys.value.push(current);
    }
  }
}

// 查找选中的节点
function foundSelected(key: string, list: any[]): any {
  let result = null;
  for (let i = 0; i < list.length; i++) {
    if (list[i].children && list[i].children.length > 0) {
      result = foundSelected(key, list[i].children);
    }
    if (list[i][replaceFields.key] === key) {
      result = list[i];
    }
    if (result) return result;
  }
  return result;
}

// 搜索
function onSearch(val: string) {
  loadComponents(val);
}

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  if (val) {
    loadComponents(val);
  } else {
    treeData.value = JSON.parse(JSON.stringify(savedData.value));
  }
}

// 全局点击关闭菜单
function onGlobalClick(e: MouseEvent) {
  if (!menuRef.value) return;
  const target = e.target as HTMLElement;
  const cn = target.className;
  const tn = target.tagName;
  
  if (
    cn !== `context-menu contextmenuName-${props.contextMenuData.menuName}` &&
    cn !== 'context-menu-content' &&
    cn !== 'context-menu-title' &&
    tn !== 'SPAN' &&
    tn !== 'svg' &&
    tn !== 'path'
  ) {
    hide();
  }
}

onMounted(() => {
  loadComponents('');
  document.addEventListener('click', onGlobalClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onGlobalClick);
});

defineExpose({
  show,
  hide,
});
</script>

<template>
  <div
    ref="menuRef"
    class="context-menu"
    :class="`contextmenuName-${contextMenuData.menuName}`"
    style="display: none"
  >
    <div class="context-menu-title">基础模块</div>
    <div class="context-menu-content">
      <el-input
        v-model="search"
        placeholder="搜索"
        clearable
        @search="onSearch"
        @input="onInput"
      />
      <div class="context-menu-scroll">
        <el-tree
          :data="treeData"
          :props="replaceFields"
          :expanded-keys="expandedKeys"
          :selected-keys="selectedKeys"
          @select="onSelect"
          @expand="onExpand"
        >
          <template #default="{ data }">
            <div class="tree-node-custom">
              <div
                class="node-icon-wrapper"
                :style="{
                  'background-color': data.cls?.color || '#176ac5',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  'border-radius': '4px',
                  'margin-right': '8px',
                }"
              >
                <span :class="`fanxi ${data.cls?.icon || ''}`" style="font-size: 10px; color: #fff;"></span>
              </div>
              <span>{{ data.title }}</span>
            </div>
          </template>
        </el-tree>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.context-menu {
  overflow-y: auto;
  padding: 12px 10px;
  position: fixed;
  z-index: 9999;
  background: #fff;
  top: 0;
  left: 0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid #E3E3E3;
  font-size: 12px;
  width: 280px;

  .context-menu-title {
    font-size: 13px;
    font-weight: bold;
    margin-bottom: 10px;
    color: #303133;
  }

  .context-menu-content {
    :deep(.el-input) {
      margin-bottom: 10px;
    }

    .context-menu-scroll {
      overflow-y: auto;
      max-height: 300px;
    }
  }
}

.tree-node-custom {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

:deep(.el-tree-node__content:hover) {
  background-color: #E1E3E4;
}
</style>