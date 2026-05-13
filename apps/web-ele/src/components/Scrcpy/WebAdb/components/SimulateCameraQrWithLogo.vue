<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import QRCode from 'qrcode';

import logoDefault from '#/assets/image/svg/callfans_icon_black.svg';

const props = withDefaults(
  defineProps<{
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    height?: number;
    logoOpacity?: number;
    logoSrc?: string;
    qrCodeData: string;
    width?: number;
  }>(),
  {
    width: 165,
    height: 165,
    logoSrc: '',
    logoOpacity: 0.9,
    errorCorrectionLevel: 'H',
  },
);

const qrCodeDataUrl = ref('');
const loading = ref(false);

const effectiveLogoSrc = computed(
  () => props.logoSrc || (logoDefault as string),
);

async function generateQRCode(content: string) {
  if (!content) {
    qrCodeDataUrl.value = '';
    return;
  }
  loading.value = true;
  qrCodeDataUrl.value = '';
  try {
    const options = {
      width: props.width,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: props.errorCorrectionLevel,
    };
    let dataUrl = await QRCode.toDataURL(content, options);
    if (effectiveLogoSrc.value) {
      dataUrl = await addLogoToQRCode(dataUrl);
    }
    qrCodeDataUrl.value = dataUrl;
  } catch (error) {
    console.error('[SimulateCameraQrWithLogo]', error);
    qrCodeDataUrl.value = '';
  } finally {
    loading.value = false;
  }
}

function addLogoToQRCode(qrCodeDataUrlIn: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = props.width;
    canvas.height = props.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('no canvas context'));
      return;
    }

    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.addEventListener('load', () => {
      ctx.drawImage(qrImg, 0, 0, props.width, props.height);

      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.onload = () => {
        const blankAreaSize = 60;
        const logoSize = 40;
        const margin = 10;
        const blankAreaX = (props.width - blankAreaSize) / 2;
        const blankAreaY = (props.height - blankAreaSize) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(blankAreaX, blankAreaY, blankAreaSize, blankAreaSize, 8);
        } else {
          ctx.fillRect(blankAreaX, blankAreaY, blankAreaSize, blankAreaSize);
        }
        ctx.fill();

        const logoX = blankAreaX + margin;
        const logoY = blankAreaY + margin;
        ctx.globalAlpha = props.logoOpacity;
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.globalAlpha = 1;

        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = reject;
      logoImg.src = effectiveLogoSrc.value;
    });
    qrImg.onerror = reject;
    qrImg.src = qrCodeDataUrlIn;
  });
}

watch(
  () => [props.qrCodeData, props.logoSrc, props.width, props.height] as const,
  () => {
    void generateQRCode(props.qrCodeData);
  },
  { immediate: true },
);

const containerStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}));
</script>

<template>
  <div class="simulate-camera-qr-logo" :style="containerStyle">
    <div v-if="qrCodeDataUrl" class="simulate-camera-qr-logo__img">
      <img :src="qrCodeDataUrl" :alt="qrCodeData" />
    </div>
    <div v-else-if="loading" class="simulate-camera-qr-logo__loading">…</div>
    <div v-else class="simulate-camera-qr-logo__loading" ></div>
  </div>
</template>

<style lang="less" scoped>
.simulate-camera-qr-logo {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
  background-color: #f5f5f5;
}

.simulate-camera-qr-logo__img {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background-color: #fff;
}

.simulate-camera-qr-logo__img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.simulate-camera-qr-logo__loading {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  color: #666;
  font-size: 14px;
}
</style>
