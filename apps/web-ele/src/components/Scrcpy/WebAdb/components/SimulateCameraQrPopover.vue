<script lang="ts" setup>
import { ElMessage } from 'element-plus';
import { $t } from '@vben/locales';

import SimulateCameraQrWithLogo from '#/components/Scrcpy/WebAdb/components/SimulateCameraQrWithLogo.vue';

const props = withDefaults(
  defineProps<{
    /** camera_web 完整 URL，空则展示失败文案 */
    qrPageUrl: string;    placement?: string;
    /** 内容区宽度，与 165 码 + 内边距对齐，不宜过大 */
    popoverWidth?: number;
  }>(),
  {
    placement: 'bottom-start',
    popoverWidth: 186,
  },
);

function openInBrowser() {
  if (!props.qrPageUrl) {
    ElMessage.error($t('webadb.scrcpy.goUrlQrCodeError'));
    return;
  }
  window.open(props.qrPageUrl, '_blank');
}
</script>

<template>
  <el-popover
    trigger="hover"
    :placement="placement"
    :width="popoverWidth"
    :show-after="80"
    :hide-after="400"
    popper-class="simulate-camera-qr-popper"
  >
    <template #reference>
      <span class="simulate-camera-qr-ref-hook">
        <slot name="reference" />
      </span>
    </template>
    <div v-if="qrPageUrl" class="simulate-camera-qr-box">
      <SimulateCameraQrWithLogo :qr-code-data="qrPageUrl" />
      <div class="simulate-camera-qr-box__tips">
        <div>{{ $t('webadb.scrcpy.qrCodeTip1') }}</div>
        <div class="simulate-camera-qr-box__tips-openline">
          <span class="simulate-camera-qr-box__tips-opentext">{{ $t('webadb.scrcpy.qrCodeTip2') }}</span>
          <el-button type="primary" link class="simulate-camera-qr-box__link" @click="openInBrowser">
            {{ $t('webadb.scrcpy.qrCodeTip3') }}
          </el-button>
        </div>
      </div>
    </div>
    <p v-else class="simulate-camera-qr-box__err">{{ $t('webadb.scrcpy.getQrCodeError') }}</p>
  </el-popover>
</template>

<style lang="less" scoped>
.simulate-camera-qr-box {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 10px;
}

.simulate-camera-qr-box__tips {
  box-sizing: border-box;
  width: 100%;
  max-width: 165px;
  font-size: 11px;
  line-height: 1.3;
  color: #606266;
}

.simulate-camera-qr-box__tips > div:first-child {
  margin-bottom: 4px;
}

.simulate-camera-qr-ref-hook {
  display: block;
  width: 100%;
}

.simulate-camera-qr-box__tips-openline {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.simulate-camera-qr-box__tips-opentext {
  flex-shrink: 0;
}

.simulate-camera-qr-box__link {
  margin-left: 3px;
  padding: 0;
  flex-shrink: 0;
  font-size: 11px;
  vertical-align: baseline;
}

.simulate-camera-qr-box__err {
  margin: 0;
  padding: 8px;
  font-size: 11px;
  color: #f56c6c;
  text-align: center;
}
</style>

<style lang="less">
.simulate-camera-qr-popper {
  box-sizing: border-box;
  max-width: min(92vw, 200px) !important;
  min-width: 0 !important;
  padding: 0 !important;
  z-index: 5000 !important;
}
</style>
