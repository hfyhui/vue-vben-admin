<script lang="ts" setup>
import type { UploadRequestOptions } from 'element-plus';

import { computed, ref, watch } from 'vue';

import { ElMessage } from 'element-plus';

import { socialClient } from '#/api/request';
import { $t } from '#/locales';
import { formatAssetImageUrl } from '#/utils/asset-url';

const props = withDefaults(
  defineProps<{
    fileFormat?: string;
    fileSize?: number | string;
    modelValue?: string;
  }>(),
  {
    fileFormat: '.jpg,.jpeg,.png,.bmp,.gif',
    fileSize: 5120,
    modelValue: '',
  },
);

const emit = defineEmits<{
  (e: 'change', value: string): void;
  (e: 'update:modelValue', value: string): void;
}>();

const uploading = ref(false);
const currentValue = ref(props.modelValue || '');
const showImageViewer = ref(false);

watch(
  () => props.modelValue,
  (value) => {
    currentValue.value = value || '';
  },
  { immediate: true },
);

const previewUrl = computed(() => {
  const value = currentValue.value;
  if (!value) return '';
  return formatImageUrl(value);
});
const previewSrcList = computed(() =>
  previewUrl.value ? [previewUrl.value] : [],
);

/** 与 social_media_web 的 $formatProcessUrl 一致：相对路径按当前访问域名拼成可访问地址；若已是绝对地址则替换为当前 origin */
function formatImageUrl(url?: string) {
  if (!url) return '';
  return formatAssetImageUrl(url) || '';
}

function beforeUpload(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const allowFormatList = String(props.fileFormat || '')
    .toLowerCase()
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!allowFormatList.includes(`.${ext}`)) {
    ElMessage.warning(
      $t('common.fileFormatError', { format: props.fileFormat }) ||
        `文件格式错误，请上传 ${props.fileFormat} 格式`,
    );
    return false;
  }

  const maxSizeKb = Number(props.fileSize);
  if (!Number.isFinite(maxSizeKb) || maxSizeKb <= 0) {
    ElMessage.warning('上传大小配置无效');
    return false;
  }

  if (file.size / 1024 > maxSizeKb) {
    ElMessage.warning(
      $t('common.fileSizeError', { size: props.fileSize }) ||
        `文件大小不能超过 ${props.fileSize}KB`,
    );
    return false;
  }

  return true;
}

async function uploadImage(options: UploadRequestOptions) {
  try {
    uploading.value = true;
    const formData = new FormData();
    formData.append('file', options.file);

    const res = await socialClient.post('/oss/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const fileUrl =
      (res as any)?.data?.fileUrl ||
      (res as any)?.data?.url ||
      (res as any)?.fileUrl ||
      (res as any)?.url ||
      '';

    if (!fileUrl) {
      throw new Error('上传成功但未返回图片地址');
    }

    const fullFileUrl = formatImageUrl(fileUrl);
    currentValue.value = fullFileUrl;
    emit('update:modelValue', fullFileUrl);
    emit('change', fullFileUrl);
    options.onSuccess?.(res as any);
    ElMessage.success('上传成功');
  } catch (error) {
    options.onError?.(error as any);
  } finally {
    uploading.value = false;
  }
}

function clearImage() {
  currentValue.value = '';
  showImageViewer.value = false;
  emit('update:modelValue', '');
  emit('change', '');
}

function previewImage() {
  if (!previewUrl.value) return;
  showImageViewer.value = true;
}

function closeImageViewer() {
  showImageViewer.value = false;
}
</script>

<template>
  <div class="common-image-upload">
    <el-upload
      v-if="!currentValue"
      :accept="props.fileFormat"
      :before-upload="beforeUpload"
      :http-request="uploadImage"
      :show-file-list="false"
      class="uploader"
    >
      <div class="upload-box">
        <span v-if="uploading" class="loading-text">上传中</span>
        <span v-else class="plus">+</span>
      </div>
    </el-upload>

    <div v-else class="preview-box">
      <el-image :src="previewUrl" fit="cover" class="image" />
      <div class="mask">
        <i
          class="iconfont icon-search action-icon"
          title="预览"
          @click.stop="previewImage"
        />
        <i
          class="iconfont icon-delete action-icon"
          title="删除"
          @click.stop="clearImage"
        />
      </div>
    </div>
    <el-image-viewer
      v-if="showImageViewer"
      :url-list="previewSrcList"
      teleported
      @close="closeImageViewer"
    />
  </div>
</template>

<style scoped>
.common-image-upload {
  width: 86px;
  height: 86px;
}

.uploader,
.upload-box,
.preview-box,
.image {
  width: 86px;
  height: 86px;
}

.upload-box {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}

.plus {
  font-size: 24px;
  line-height: 1;
}

.loading-text {
  font-size: 12px;
}

.preview-box {
  position: relative;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgb(0 0 0 / 45%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.preview-box:hover .mask {
  opacity: 1;
}

.action-icon {
  font-size: 16px;
  color: #fff;
  cursor: pointer;
}

</style>

<style>
/* el-image-viewer 使用 teleport 挂到 body，需使用全局样式覆盖 */
.el-image-viewer__actions {
  background: rgb(17 24 39 / 88%) !important;
  border: 1px solid rgb(255 255 255 / 24%) !important;
  box-shadow: 0 8px 24px rgb(0 0 0 / 40%) !important;
}

.el-image-viewer__actions__inner,
.el-image-viewer__actions__inner i {
  color: #fff !important;
}

.el-image-viewer__actions__inner i:hover {
  color: #f87171 !important;
}

/* 右上角关闭按钮 */
.el-image-viewer__close {
  background: rgb(17 24 39 / 88%) !important;
  border: 1px solid rgb(255 255 255 / 24%) !important;
  box-shadow: 0 4px 14px rgb(0 0 0 / 35%) !important;
}

.el-image-viewer__close .el-icon {
  color: #fff !important;
}

.el-image-viewer__close:hover .el-icon {
  color: #f87171 !important;
}
</style>
