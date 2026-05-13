<script setup>
import { ref } from 'vue';

import folderPng from '#/assets/image/folder.png';

import FileManager from './fileManage/index.vue';

defineProps({
  device: {
    type: Object,
    required: true,
  },
});

const drawerVisible = ref(false);

function openDrawer() {
  drawerVisible.value = true;
}
</script>

<template>
  <div class="file-manager-drawer">
    <el-tooltip :content="$t('webadb.fileManager.drawer.tooltip')" placement="bottom">
      <div class="folder-icon-container" @click="openDrawer">
        <img class="folder" :src="folderPng" alt="" @click="openDrawer" />
      </div>
    </el-tooltip>

    <el-drawer
      v-model="drawerVisible"
      :title="$t('webadb.fileManager.drawer.title')"
      direction="rtl"
      size="80%"
      append-to-body
      destroy-on-close
      :body-style="{
        padding: '0 16px 16px',
        background: '#ffffff',
        color: '#303133',
      }"
    >
      <div class="drawer-content">
        <FileManager :device="device" />
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.file-manager-drawer {
  display: inline-block;
}

.folder-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.folder {
  font-size: 20px;
  cursor: pointer;
}

img {
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: block;
  object-fit: contain;
}

.folder-icon-container:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.drawer-content {
  height: calc(100vh - 120px);
  overflow: hidden;
  padding: 0;
  box-sizing: border-box;
}
</style>
