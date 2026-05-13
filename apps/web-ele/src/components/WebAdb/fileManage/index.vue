<script setup>
import { Delete, Download, FolderAdd, Upload } from '@element-plus/icons-vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MediaPreview from '#/components/MediaPreview/MediaPreview.vue';

import fileGeneric from '#/assets/image/file-manager/file-generic.svg';
import fileImage from '#/assets/image/file-manager/file-image.svg';
import fileVideo from '#/assets/image/file-manager/file-video.svg';
import folderPng from '#/assets/image/folder.png';

defineOptions({ name: 'FileManager' });

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
});

const { t } = useI18n();

const deviceSerial = computed(() => props.device?.serial || props.device?.deviceIp || '');

const isDeviceConnected = computed(() => !!deviceSerial.value && !!httpPath.value);

const loading = ref(false);
const fileList = ref([]);
const currentPath = ref('');
const selectedRowKeys = ref([]);
const selectedItems = ref([]);
const createFolderModalVisible = ref(false);
const deleteConfirmVisible = ref(false);
const createFolderForm = reactive({ folderName: '' });
const mediaList = ref([]);
const httpPath = ref('');
const mediaPreview = ref(null);

const currentPathArray = computed(() =>
  currentPath.value ? currentPath.value.split('/').filter(Boolean) : [],
);

async function init() {
  if (!isDeviceConnected.value) {
    return false;
  }

  try {
    loading.value = true;
    await navigateToRoot();
  } catch (error) {
    console.error('初始化失败:', error);
  } finally {
    loading.value = false;
  }
}

async function navigateToRoot() {
  await navigateToPath('');
}

async function navigateToPath(path) {
  if (!isDeviceConnected.value) return;

  try {
    loading.value = true;
    currentPath.value = path;
    selectedRowKeys.value = [];
    selectedItems.value = [];

    const command = path ? `ls -lL ${path}` : 'ls -lL';
    const result = await getSpawnWaitText(command);

    if (result) {
      fileList.value = parseFileList(result);
    } else {
      fileList.value = [];
    }
  } catch (error) {
    fileList.value = [];
    console.error('获取文件列表失败:', error);
  } finally {
    loading.value = false;
  }
}

async function getSpawnWaitText(args) {
  const res = await axios.post(`${httpPath.value}/adb/shell`, {
    serial: deviceSerial.value,
    args,
  });

  return res.data.result;
}

function parseFileList(output) {
  const normalizedOutput = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedOutput.split('\n').filter(Boolean);
  const files = [];

  if (lines.length > 0) {
    let startIndex = 0;
    if (lines[0].startsWith('total ')) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/\s+/).filter(Boolean);

      if (
        parts.length >= 8 &&
        (parts[0].startsWith('d') || parts[0].startsWith('-') || parts[0].startsWith('l'))
      ) {
        if (parts.length < 8) continue;

        const permissions = parts[0];
        const owner = parts[2];
        const group = parts[3];
        const size = parts[4];
        let date;
        let time;
        let name;

        if (/^\d{4}-\d{2}-\d{2}$/.test(parts[5])) {
          date = parts[5];
          time = parts[6];
          const nameParts = parts.slice(7);
          name = nameParts.join(' ');
        } else if (parts.length >= 9) {
          const month = parts[5];
          const day = parts[6];
          time = parts[7];
          const nameParts = parts.slice(8);
          date = `${month} ${day}`;
          name = nameParts.join(' ');
        } else {
          continue;
        }

        if (name === '.' || name === '..') continue;

        const linkIndex = name.indexOf(' -> ');
        const displayName = linkIndex > -1 ? name.substring(0, linkIndex) : name;

        const isDirectory = displayName.split('.').length <= 1;
        const fileType = isDirectory ? t('webadb.fileManager.fileTypes.folder') : getFileType(displayName);

        files.push({
          name: displayName,
          isDirectory,
          type: fileType,
          size: parseInt(size, 10),
          owner,
          group,
          modifiedAt: `${date} ${time}`,
          path: currentPath.value ? `${currentPath.value}/${displayName}` : displayName,
          permissions,
        });
      } else {
        if (line === '.' || line === '..') continue;

        const isDirectory = true;
        const fileType = t('webadb.fileManager.fileTypes.folder');

        files.push({
          name: line,
          isDirectory,
          type: fileType,
          path: currentPath.value ? `${currentPath.value}/${line}` : line,
        });
      }
    }
  }

  return files;
}

function getFileType(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();

  if (IMAGE_EXTENSIONS.includes(extension)) {
    return t('webadb.fileManager.fileTypes.image');
  } else if (['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv'].includes(extension)) {
    return t('webadb.fileManager.fileTypes.video');
  } else if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(extension)) {
    return t('webadb.fileManager.fileTypes.document');
  } else if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
    return t('webadb.fileManager.fileTypes.spreadsheet');
  } else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension)) {
    return t('webadb.fileManager.fileTypes.archive');
  } else {
    return t('webadb.fileManager.fileTypes.file');
  }
}

function getFileIconSrc(file) {
  if (file.isDirectory) {
    return folderPng;
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (IMAGE_EXTENSIONS.includes(extension)) {
    return fileImage;
  }
  if (['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv'].includes(extension)) {
    return fileVideo;
  }
  return fileGeneric;
}

function handleRowClick(record, event) {
  const target = event?.target;
  if (target && (target.closest('.file-list-item-checkbox') || target.tagName === 'INPUT')) {
    return;
  }

  selectedRowKeys.value = [record.path];
  selectedItems.value = [record];
}

function handleSelectAll(val) {
  if (val) {
    selectedRowKeys.value = fileList.value.map(item => item.path);
    selectedItems.value = [...fileList.value];
  } else {
    selectedRowKeys.value = [];
    selectedItems.value = [];
  }
}

function handleItemCheck(val, record) {
  const checked = Boolean(val);
  if (checked) {
    selectedRowKeys.value = [...selectedRowKeys.value, record.path];
    selectedItems.value = [...selectedItems.value, record];
  } else {
    selectedRowKeys.value = selectedRowKeys.value.filter(key => key !== record.path);
    selectedItems.value = selectedItems.value.filter(item => item.path !== record.path);
  }
}

function handleDoubleClick(record) {
  const isCompressedFile = /\.(zip|rar|tar|gz|7z)$/i.test(record.name);

  if (record.isDirectory || isCompressedFile) {
    navigateToPath(record.path);
  }
}

async function customRequest(options) {
  try {
    loading.value = true;
    const file = options.file;
    const remotePath = currentPath.value ? `/${currentPath.value}/${file.name}` : `/${file.name}`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('serial', deviceSerial.value);
    formData.append('filePath', remotePath);

    const res = await axios.post(`${httpPath.value}/adb/pushServer`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (res.data.success !== true) {
      ElMessage.closeAll();
      ElMessage.error(t('webadb.fileManager.messages.uploadFailed', { error: res.data.error }));
      return;
    }

    await navigateToPath(currentPath.value);
    ElMessage.closeAll();
    ElMessage.success(t('webadb.fileManager.messages.uploadSuccess', { fileName: file.name }));
  } catch (error) {
    console.error('上传文件失败:', error);
    ElMessage.closeAll();
    ElMessage.error(t('webadb.fileManager.messages.uploadFailed', { error: error.message }));
  } finally {
    loading.value = false;
  }
}

async function handleFileNameClick(record) {
  const ext = record.name.split('.').pop()?.toLowerCase();
  if (!IMAGE_EXTENSIONS.includes(ext)) return;

  try {
    const paths = [`/${currentPath.value}/${record.name}`];

    const res = await axios.post(
      `${httpPath.value}/adb/download`,
      {
        serial: deviceSerial.value,
        paths,
      },
      {
        responseType: 'blob',
      },
    );

    const url = URL.createObjectURL(res.data);

    mediaList.value = [
      {
        fileUrl: url,
        fileName: record.name,
        fileType: ext,
      },
    ];

    mediaPreview.value?.open();
  } catch (error) {
    ElMessage.closeAll();
    ElMessage.error(t('webadb.fileManager.messages.readImageFailed', { error: error.message }));
  }
}

async function cancelMedia() {
  if (mediaList.value && mediaList.value.length > 0) {
    mediaList.value.forEach(item => {
      if (item.fileUrl) {
        URL.revokeObjectURL(item.fileUrl);
      }
    });
    mediaList.value = [];
  }
}

function handleCreateFolder() {
  createFolderForm.folderName = '';
  createFolderModalVisible.value = true;
}

function formatFileSize(bytes) {
  if (bytes === undefined || bytes === null || isNaN(bytes)) {
    return '0 KB';
  }

  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function handleDownload() {
  try {
    const hasDirectory = selectedItems.value.some(item => item.isDirectory);
    if (hasDirectory) {
      ElMessage.closeAll();
      ElMessage.warning(t('webadb.fileManager.messages.directoryDownloadError'));
      return;
    }

    const paths = selectedItems.value.map(el => `/${currentPath.value}/${el.name}`);

    const res = await axios.post(
      `${httpPath.value}/adb/download`,
      {
        serial: deviceSerial.value,
        paths,
      },
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const contentDisposition = res.headers['content-disposition'];
    let fileName = 'download';

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match?.[1]) {
        fileName = decodeURIComponent(match[1]);
      }
    }

    fileName = fileName.replace(/[<>:"\/|?*]/g, '_');

    if (!fileName || fileName === '') {
      fileName = 'download';
    }

    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    selectedItems.value = [];
    selectedRowKeys.value = [];
  } catch (error) {
    console.error('下载失败:', error);
    if (error.response) {
      if (error.response.status !== 200) {
        ElMessage.closeAll();
        ElMessage.error(error.response.data?.message || '下载失败');
        return false;
      }
      ElMessage.closeAll();
      ElMessage.error(t('webadb.fileManager.messages.downloadFailed', { error: '请重试' }));
    } else {
      ElMessage.closeAll();
      ElMessage.error(t('webadb.fileManager.messages.downloadFailed', { error: '网络错误，请检查连接' }));
    }
  }
}

function handleDelete() {
  if (selectedItems.value.length > 0) {
    deleteConfirmVisible.value = true;
  }
}

async function confirmCreateFolder() {
  if (!createFolderForm.folderName?.trim()) return;

  try {
    loading.value = true;
    const folderPath = currentPath.value
      ? `/${currentPath.value}/${createFolderForm.folderName}`
      : createFolderForm.folderName;

    const command = `mkdir -p ${folderPath}`;
    await getSpawnWaitText(command);

    await navigateToPath(currentPath.value);
    createFolderModalVisible.value = false;
  } catch (error) {
    console.error('创建文件夹失败:', error);
  } finally {
    loading.value = false;
  }
}

async function confirmDelete() {
  try {
    loading.value = true;

    for (const item of selectedItems.value) {
      const command = item.isDirectory ? `rm -rf /${item.path}` : `rm /${item.path}`;
      await getSpawnWaitText(command);
    }

    await navigateToPath(currentPath.value);
    deleteConfirmVisible.value = false;
  } catch (error) {
    console.error('删除失败:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  const hostname = import.meta.env.MODE === 'development' ? 'test.callfansai.cn' : window.location.hostname;
  const connIp =
    props.device.chipCode == 'AIBOX_L02'
      ? `https://${hostname}/${props.device.connIp}/3333`
      : `https://${hostname}/${hostname}/3333`;
  httpPath.value = connIp;
  init();
});
</script>

<template>
  <div class="file-manager">
    <div v-if="!isDeviceConnected" class="connection-error">
      <el-alert
        type="error"
        show-icon
        :closable="false"
        :title="$t('webadb.fileManager.connectionError.title')"
        :description="$t('webadb.fileManager.connectionError.description')"
      />
    </div>

    <div v-else class="file-manager-content">
      <div class="toolbar">
        <div class="toolbar-left">
          <template v-if="!selectedItems.length">
            <el-upload :show-file-list="false" :http-request="customRequest">
              <el-button type="primary" :icon="Upload" :disabled="loading">
                {{ $t('webadb.fileManager.toolbar.upload') }}
              </el-button>
            </el-upload>
            <el-button type="primary" :icon="FolderAdd" :disabled="loading" @click="handleCreateFolder">
              {{ $t('webadb.fileManager.toolbar.createFolder') }}
            </el-button>
          </template>
          <template v-else>
            <el-button type="primary" :icon="Download" :disabled="loading" @click="handleDownload">
              {{ $t('webadb.fileManager.toolbar.download') }}
            </el-button>
            <el-button
              class="toolbar-btn-ghost-danger"
              type="danger"
              plain
              :icon="Delete"
              :disabled="loading"
              @click="handleDelete"
            >
              {{ $t('webadb.fileManager.toolbar.delete') }}
            </el-button>
          </template>
        </div>
      </div>

      <div class="breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>
            <el-button
              link
              type="primary"
              :disabled="currentPathArray.length === 0"
              @click="navigateToRoot"
            >
              {{ $t('webadb.fileManager.breadcrumb.device') }}
            </el-button>
          </el-breadcrumb-item>
          <el-breadcrumb-item v-for="(item, index) in currentPathArray" :key="index">
            <el-button
              link
              type="primary"
              :disabled="index === currentPathArray.length - 1"
              @click="
                index < currentPathArray.length - 1
                  ? navigateToPath('/' + currentPathArray.slice(0, index + 1).join('/'))
                  : undefined
              "
            >
              {{ item }}
            </el-button>
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <div class="file-list-container">
        <div v-if="loading" class="loading-container">
          <el-skeleton animated :rows="10" />
        </div>

        <div v-else class="file-list">
          <div class="file-list-header">
            <div class="file-list-header-checkbox">
              <el-checkbox
                :model-value="
                  selectedRowKeys.length === fileList.length && fileList.length > 0
                "
                :indeterminate="
                  selectedRowKeys.length > 0 && selectedRowKeys.length < fileList.length
                "
                @change="handleSelectAll"
              />
            </div>
            <div class="file-list-header-name">{{ $t('webadb.fileManager.fileList.name') }}</div>
            <div class="file-list-header-owner">{{ $t('webadb.fileManager.fileList.owner') }}</div>
            <div class="file-list-header-size">{{ $t('webadb.fileManager.fileList.size') }}</div>
            <div class="file-list-header-modified">{{ $t('webadb.fileManager.fileList.modified') }}</div>
          </div>

          <div
            v-for="record in fileList"
            :key="record.path"
            class="file-list-item"
            :class="{ selected: selectedRowKeys.includes(record.path) }"
            @click="event => handleRowClick(record, event)"
            @dblclick="handleDoubleClick(record)"
          >
            <div class="file-list-item-checkbox" @click.stop>
              <el-checkbox
                :model-value="selectedRowKeys.includes(record.path)"
                @change="val => handleItemCheck(val, record)"
              />
            </div>
            <div class="file-list-item-name">
              <img
                class="file-row-icon"
                :src="getFileIconSrc(record)"
                alt=""
                width="24"
                height="24"
              />
              <span
                :class="`${record.isDirectory ? 'folder-name' : 'file-name-text'}`"
                @click.stop.prevent="handleFileNameClick(record)"
                >{{ record.name }}</span
              >
            </div>
            <div class="file-list-item-owner">{{ record.owner }}</div>
            <div class="file-list-item-size">{{ formatFileSize(record.size) }}</div>
            <div class="file-list-item-modified">{{ record.modifiedAt }}</div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="createFolderModalVisible"
      :title="$t('webadb.fileManager.createFolder.title')"
      width="480px"
      destroy-on-close
      @closed="createFolderModalVisible = false"
    >
      <el-form :model="createFolderForm" label-position="top">
        <el-form-item :label="$t('webadb.fileManager.createFolder.folderName')">
          <el-input
            v-model="createFolderForm.folderName"
            :placeholder="$t('webadb.fileManager.createFolder.placeholder')"
            :disabled="loading"
            @keyup.enter="confirmCreateFolder"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createFolderModalVisible = false">{{
          $t('webadb.fileManager.buttons.cancel')
        }}</el-button>
        <el-button type="primary" :loading="loading" @click="confirmCreateFolder">{{
          $t('webadb.fileManager.buttons.confirm')
        }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="deleteConfirmVisible"
      :title="$t('webadb.fileManager.deleteConfirm.title')"
      width="480px"
      destroy-on-close
    >
      <p>{{ $t('webadb.fileManager.deleteConfirm.message', { count: selectedItems.length }) }}</p>
      <p class="text-warning">{{ $t('webadb.fileManager.deleteConfirm.warning') }}</p>
      <template #footer>
        <el-button @click="deleteConfirmVisible = false">{{
          $t('webadb.fileManager.buttons.cancel')
        }}</el-button>
        <el-button type="danger" :loading="loading" @click="confirmDelete">{{
          $t('webadb.fileManager.buttons.confirm')
        }}</el-button>
      </template>
    </el-dialog>

    <MediaPreview ref="mediaPreview" :media-list="mediaList" @cancel="cancelMedia" />
  </div>
</template>

<style scoped lang="less">
/* 抽屉内为白底文件列表：显式使用浅色主题的文案/填充变量，避免继承暗色主题导致字色过浅不可读 */
.file-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #303133;
  --el-text-color-primary: #303133;
  --el-text-color-regular: #606266;
  --el-text-color-secondary: #909399;
  --el-text-color-placeholder: #a8abb2;
  --el-fill-color-light: #f5f7fa;
  --el-fill-color-blank: #ffffff;
  --el-bg-color: #ffffff;
  --el-border-color-lighter: #ebeef5;
}

.file-manager > .connection-error {
  flex-shrink: 0;
  margin: 16px;
}

.file-manager > .connection-error :deep(.el-alert.el-alert--error) {
  --el-alert-icon-size: 20px;

  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 2px;
  padding: 10px 14px;
  align-items: flex-start;
  column-gap: 6px;
}

.file-manager > .connection-error :deep(.el-alert__icon) {
  color: #ff4d4f;
  font-size: 20px;
  width: 22px;
  height: 22px;
  margin: 0;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.file-manager > .connection-error :deep(.el-alert__icon svg) {
  width: 20px;
  height: 20px;
}

.file-manager > .connection-error :deep(.el-alert__title) {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.85);
}

.file-manager > .connection-error :deep(.el-alert__description) {
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5715;
  color: rgba(0, 0, 0, 0.65);
}

.file-manager-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .current-directory {
    cursor: default;
    color: #333;
    font-weight: 500;
  }

  .current-directory:hover {
    color: #333;
    text-decoration: none;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-radius: 4px;
  }

  .toolbar-left {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    :deep(.toolbar-btn-ghost-danger.el-button.is-plain.el-button--danger) {
      --el-button-bg-color: #ffffff;
      --el-button-hover-bg-color: #fef0f0;
    }
  }

  .breadcrumb {
    margin-bottom: 12px;

    :deep(.el-breadcrumb__inner) {
      color: rgba(0, 0, 0, 0.65);
    }

    :deep(.el-button.is-link) {
      color: rgba(0, 0, 0, 0.65);
    }

    :deep(.el-button.is-link:not([disabled]):hover) {
      color: var(--el-color-primary);
    }
  }

  .file-list-container {
    flex: 1;
    overflow: auto;
  }

  .file-list {
    height: 100%;
    overflow-y: auto;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
  }

  .file-list-header {
    display: grid;
    grid-template-columns: 60px 1fr 120px 120px 160px;
    align-items: center;
    padding: 8px 16px;
    background-color: #fafafa;
    border-bottom: 1px solid #ebeef5;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.88);
  }

  .file-list-header-checkbox,
  .file-list-item-checkbox {
    width: 60px;
    display: flex;
    align-items: center;
  }

  .file-list-header-owner,
  .file-list-header-size,
  .file-list-header-modified {
    text-align: left;
  }

  .file-list-item {
    display: grid;
    grid-template-columns: 60px 1fr 120px 120px 160px;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid #ebeef5;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .file-list-item:hover {
    background-color: #f5f7fa;
  }

  .file-list-item.selected {
    background-color: #ecf5ff;
  }

  .file-list-item-name {
    min-width: 200px;
    display: flex;
    align-items: center;
  }

  .file-list-item-owner,
  .file-list-item-size,
  .file-list-item-modified {
    text-align: left;
    color: rgba(0, 0, 0, 0.65);
  }

  .file-row-icon {
    margin-right: 8px;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    display: block;
    object-fit: contain;
  }

  .folder-name {
    font-weight: 500;
    color: #409eff;
  }

  .file-name-text {
    color: #303133;
  }

  .loading-container {
    padding: 24px;
  }

  .text-warning {
    color: var(--el-color-warning);
    font-size: 14px;
    padding-top: 8px;
  }
}
</style>
