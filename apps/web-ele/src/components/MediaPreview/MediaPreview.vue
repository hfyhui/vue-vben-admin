<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

import {
  ArrowLeft,
  ArrowRight,
  Close,
  Loading as LoadingIcon,
  RefreshLeft,
  RefreshRight,
  WarningFilled,
  ZoomIn,
  ZoomOut,
} from '@element-plus/icons-vue';

import { $t } from '#/locales';

defineOptions({ name: 'MediaPreview' });

const props = defineProps({
  mediaList: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['media-change', 'reach-end', 'cancel']);

const internalVisible = ref(false);
const currentIndex = ref(0);
const loading = ref(false);
const error = ref(false);
const scale = ref(1);
const rotation = ref(0);
const transformOrigin = ref('center center');
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const translateX = ref(0);
const translateY = ref(0);
const originalWidth = ref(0);
const originalHeight = ref(0);
const isOriginalSize = ref(false);

const currentMedia = computed(() => props.mediaList[currentIndex.value] || {});
const hasPrevious = computed(() => currentIndex.value > 0);
const hasNext = computed(() => currentIndex.value < props.mediaList.length - 1);

function isVideoType(fileType) {
  const videoTypes = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv'];
  return videoTypes.includes(fileType?.toLowerCase());
}

const isImageType = computed(
  () => currentMedia.value && !isVideoType(currentMedia.value.fileType),
);

const mediaStyle = computed(() => {
  const baseStyle = {
    maxWidth: '100vw',
    maxHeight: '100vh',
  };

  if (isImageType.value) {
    return {
      ...baseStyle,
      transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value}) rotate(${rotation.value}deg)`,
      transformOrigin: transformOrigin.value,
      cursor: isDragging.value ? 'grabbing' : 'grab',
    };
  }
  return {
    ...baseStyle,
    transform: `scale(${scale.value})`,
    transformOrigin: 'center center',
  };
});

function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (
    url.startsWith('blob:') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  return url;
}

function open(index = 0) {
  if (props.mediaList.length === 0) {
    console.warn('MediaPreview: mediaList is empty');
    return false;
  }

  const validIndex = Math.max(0, Math.min(index, props.mediaList.length - 1));
  currentIndex.value = validIndex;
  internalVisible.value = true;
  initPreview();
  addKeyboardListeners();
  return true;
}

function close() {
  internalVisible.value = false;
  removeKeyboardListeners();
}

function initPreview() {
  loading.value = true;
  error.value = false;
  resetTransform();
}

function rotateLeft() {
  rotation.value -= 90;
}

function rotateRight() {
  rotation.value += 90;
}

function zoomIn() {
  scale.value = Math.min(scale.value + 0.1, 5);
  if (isOriginalSize.value) {
    isOriginalSize.value = false;
  }
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.1, 0.1);
  if (isOriginalSize.value) {
    isOriginalSize.value = false;
  }
}

function resetTransform() {
  scale.value = 1;
  rotation.value = 0;
  translateX.value = 0;
  translateY.value = 0;
  transformOrigin.value = 'center center';
}

function toggleOriginalSize() {
  if (isOriginalSize.value) {
    isOriginalSize.value = false;
  } else {
    isOriginalSize.value = true;
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  }
}

function startDrag(event) {
  if (event.button !== 0) return;
  isDragging.value = true;
  dragStartX.value = event.clientX - translateX.value;
  dragStartY.value = event.clientY - translateY.value;
  event.preventDefault();
}

function handleDrag(event) {
  if (!isDragging.value) return;
  translateX.value = event.clientX - dragStartX.value;
  translateY.value = event.clientY - dragStartY.value;
  event.preventDefault();
}

function stopDrag() {
  isDragging.value = false;
}

function handleWheel(event) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  scale.value = Math.max(0.1, Math.min(10, scale.value + delta));
  if (isOriginalSize.value) {
    isOriginalSize.value = false;
  }
}

function handleVideoWheel(event) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  scale.value = Math.max(0.5, Math.min(3, scale.value + delta));
  if (isOriginalSize.value) {
    isOriginalSize.value = false;
  }
}

function getFileTypeText(fileType) {
  if (isVideoType(fileType)) {
    return $t('webadb.mediaPreview.videoFile');
  }
  return $t('webadb.mediaPreview.imageFile');
}

function switchMedia(direction) {
  const isNext = direction === 'next';
  const hasMedia = isNext ? hasNext.value : hasPrevious.value;

  if (hasMedia) {
    currentIndex.value += isNext ? 1 : -1;

    const newMedia = props.mediaList[currentIndex.value];
    const prevMedia =
      props.mediaList[isNext ? currentIndex.value - 1 : currentIndex.value + 1];

    if (
      !prevMedia ||
      newMedia.fileType !== prevMedia.fileType ||
      newMedia.fileUrl !== prevMedia.fileUrl
    ) {
      loading.value = true;
    }

    error.value = false;
    emit('media-change', newMedia, currentIndex.value);

    if (isNext && !hasNext.value) {
      emit('reach-end', currentIndex.value);
    }
  }
}

function handlePrevious() {
  switchMedia('prev');
}

function handleNext() {
  switchMedia('next');
}

function handleCancel() {
  close();
  emit('cancel');
}

function handleImageLoad(event) {
  loading.value = false;
  error.value = false;
  const img = event.target;
  originalWidth.value = img.naturalWidth;
  originalHeight.value = img.naturalHeight;
}

function handleImageError() {
  loading.value = false;
  error.value = true;
}

function handleVideoLoad() {
  loading.value = false;
  error.value = false;
}

function handleVideoError() {
  loading.value = false;
  error.value = true;
}

function addKeyboardListeners() {
  document.addEventListener('keydown', handleKeydown);
}

function removeKeyboardListeners() {
  document.removeEventListener('keydown', handleKeydown);
}

function handleKeydown(event) {
  const keyActions = {
    ArrowLeft: () => handlePrevious(),
    ArrowRight: () => handleNext(),
    Escape: () => handleCancel(),
    '+': () => isImageType.value && zoomIn(),
    '=': () => isImageType.value && zoomIn(),
    '-': () => isImageType.value && zoomOut(),
    _: () => isImageType.value && zoomOut(),
    r: () => isImageType.value && rotateRight(),
    R: () => isImageType.value && rotateRight(),
    l: () => isImageType.value && rotateLeft(),
    L: () => isImageType.value && rotateLeft(),
  };

  const action = keyActions[event.key];
  if (action) {
    event.preventDefault();
    action();
  }
}

defineExpose({ open, close });

onBeforeUnmount(() => {
  removeKeyboardListeners();
});
</script>

<template>
  <div
    v-if="internalVisible"
    class="media-preview-modal"
    @click.self="handleCancel"
  >
    <div class="media-preview-container">
      <div class="close-btn" @click="handleCancel">
        <el-icon :size="23"><Close /></el-icon>
      </div>

      <div
        v-if="hasPrevious"
        class="nav-arrow left-arrow"
        @click="handlePrevious"
      >
        <el-icon :size="20"><ArrowLeft /></el-icon>
      </div>

      <div class="media-content" @copy.prevent @cut.prevent @paste.prevent>
        <div
          v-if="isImageType"
          class="image-container"
          @mousedown="startDrag"
          @mousemove="handleDrag"
          @mouseup="stopDrag"
          @mouseleave="stopDrag"
          @wheel="handleWheel"
        >
          <img
            ref="mediaImage"
            :src="resolveMediaUrl(currentMedia.fileUrl)"
            :alt="currentMedia.fileName || $t('webadb.mediaPreview.image')"
            class="media-image"
            :style="mediaStyle"
            @load="handleImageLoad"
            @error="handleImageError"
          />
        </div>

        <div
          v-else-if="currentMedia && isVideoType(currentMedia.fileType)"
          class="video-container"
          @wheel="handleVideoWheel"
        >
          <video
            :src="resolveMediaUrl(currentMedia.fileUrl)"
            controls
            class="media-video"
            :style="mediaStyle"
            @loadeddata="handleVideoLoad"
            @error="handleVideoError"
          >
            {{ $t('webadb.mediaPreview.videoNotSupported') }}
          </video>
        </div>

        <div v-if="loading" class="loading-container">
          <el-icon class="toolbar-spin" :size="40"><LoadingIcon /></el-icon>
          <div class="loading-text">
            {{ $t('webadb.mediaPreview.loading') }}
          </div>
        </div>

        <div v-if="error" class="error-container">
          <el-icon class="error-icon" :size="48"><WarningFilled /></el-icon>
          <div class="error-text">
            {{ $t('webadb.mediaPreview.loadFailed') }}
          </div>
        </div>
      </div>

      <div v-if="hasNext" class="nav-arrow right-arrow" @click="handleNext">
        <el-icon :size="20"><ArrowRight /></el-icon>
      </div>

      <div class="media-info">
        <div class="file-type">
          {{ getFileTypeText(currentMedia?.fileType) }}
        </div>
        <div class="file-name">{{ currentMedia?.fileName || '' }}</div>
        <div class="pagination">
          {{ currentIndex + 1 }} / {{ mediaList.length }}
        </div>
      </div>

      <div v-if="isImageType" class="toolbar">
        <div
          class="toolbar-item"
          :title="$t('webadb.mediaPreview.rotateLeft')"
          @click="rotateLeft"
        >
          <el-icon :size="23"><RefreshLeft /></el-icon>
        </div>
        <div
          class="toolbar-item"
          :title="$t('webadb.mediaPreview.rotateRight')"
          @click="rotateRight"
        >
          <el-icon :size="23"><RefreshRight /></el-icon>
        </div>
        <div
          class="toolbar-item"
          :title="
            isOriginalSize
              ? $t('webadb.mediaPreview.nonOriginalSizeMode')
              : $t('webadb.mediaPreview.originalSizeMode')
          "
          @click="toggleOriginalSize"
        >
          <i
            :class="`icon iconfont ${isOriginalSize ? 'icon-icon-test' : 'icon-quanping'}`"
          ></i>
        </div>
        <div
          class="toolbar-item"
          :title="$t('webadb.mediaPreview.zoomOut')"
          @click="zoomOut"
        >
          <el-icon :size="23"><ZoomOut /></el-icon>
        </div>
        <div
          class="toolbar-item"
          :title="$t('webadb.mediaPreview.zoomIn')"
          @click="zoomIn"
        >
          <el-icon :size="23"><ZoomIn /></el-icon>
        </div>
      </div>

      <div v-if="mediaList.length > 1" class="keyboard-hint">
        <span>{{ $t('webadb.mediaPreview.previous') }}</span>
        <span>{{ $t('webadb.mediaPreview.next') }}</span>
        <span>{{ $t('webadb.mediaPreview.close') }}</span>
        <span v-if="isImageType">{{ $t('webadb.mediaPreview.zoom') }}</span>
        <span v-if="isImageType">{{ $t('webadb.mediaPreview.rotate') }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.toolbar-spin {
  animation: toolbar-rotate 1s linear infinite;
}

@keyframes toolbar-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.media-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
}

.media-preview-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

@button-base: {
  position: fixed;
  border-radius: 50%;
  background: #606266;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  color: white;
};

.close-btn {
  @button-base();
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  z-index: 1000;
}

.nav-arrow {
  @button-base();
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  z-index: 100;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-50%) scale(1.1);
  }

  &.left-arrow {
    left: 20px;
  }

  &.right-arrow {
    right: 20px;
  }
}

.media-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-container,
.video-container {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-image,
.media-video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.media-image {
  border-radius: 0;
  transition: transform 0.3s ease;
}

.media-video {
  border-radius: 0;
  min-width: 600px;
  min-height: 300px;
}

@status-container: {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
};

.loading-container,
.error-container {
  @status-container();

  .loading-text,
  .error-text {
    margin-top: 10px;
    font-size: 23px;
  }

  .error-icon {
    color: #f56c6c;
  }
}

.media-info {
  position: fixed;
  bottom: 20px;
  left: 0;
  right: 0;
  text-align: center;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 0 20px;
  z-index: 100;

  .file-name {
    font-size: 16px;
    font-weight: 500;
  }

  .file-type {
    font-size: 14px;
    opacity: 0.8;
    width: 80px;
    flex-shrink: 0;
  }

  .pagination {
    flex-shrink: 0;
    width: 80px;
    font-size: 14px;
    opacity: 0.8;
  }
}

.toolbar {
  position: fixed;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: #606266;
  border-radius: 20px;
  padding: 8px 16px;
  z-index: 100;

  .toolbar-item {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;
    color: white;

    &:hover {
      transform: scale(1.1);
    }

    .iconfont {
      color: white;
      font-size: 23px;
    }
  }
}

.keyboard-hint {
  position: fixed;
  top: 20px;
  left: 0;
  right: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  z-index: 100;

  span {
    margin: 0 8px;
    padding: 2px 6px;
    background: #606266;
    border-radius: 3px;
  }
}

@media (max-width: 768px) {
  .media-preview-container {
    height: 70vh;
  }

  .nav-arrow {
    width: 40px;
    height: 40px;

    &.left-arrow {
      left: 10px;
    }

    &.right-arrow {
      right: 10px;
    }
  }

  .close-btn {
    top: 10px;
    right: 10px;
    width: 35px;
    height: 35px;
  }

  .keyboard-hint {
    display: none;
  }
}
</style>
