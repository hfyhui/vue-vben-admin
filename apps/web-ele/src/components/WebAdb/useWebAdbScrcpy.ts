import type { ScrcpyEmitFn } from './useScrcpyDevice';

import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  toRef,
  watch,
} from 'vue';

import { useUserStore } from '@vben/stores';

import {
  Float32PcmPlayer,
  Float32PlanerPcmPlayer,
  Int16PcmPlayer,
} from '@yume-chan/pcm-player';
import {
  AndroidKeyCode,
  AndroidKeyEventAction,
  AndroidMotionEventAction,
  h264ParseConfiguration,
  h265ParseConfiguration,
  ScrcpyAudioCodec,
  ScrcpyPointerId,
  ScrcpyVideoCodecId,
} from '@yume-chan/scrcpy';
import {
  BitmapVideoFrameRenderer,
  WebCodecsVideoDecoder,
} from '@yume-chan/scrcpy-decoder-webcodecs';
import { WritableStream } from '@yume-chan/stream-extra';
import { ElMessage } from 'element-plus';

// @ts-expect-error - JS file without type declarations
import {
  AacDecodeStream,
  OpusDecodeStream,
} from '#/utils/scrcpy/audio-decode-stream.js';
import { clamp, trailingThrottle } from '#/utils/webadb';

import { useScrcpyDevice } from './useScrcpyDevice';
// @ts-expect-error - JS file without type declarations
import { wsHeartbeat, wsScreenshot, wsSetClipboard } from './utils.js';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface MediaPacket {
  type: 'configuration' | 'data' | 'frame';
  keyframe?: boolean;
  pts?: bigint;
  data: Uint8Array;
}

type ConnectionState =
  | 'connected'
  | 'connectedTrue'
  | 'disconnected'
  | 'error'
  | 'loading';

interface KeyParams {
  action: AndroidKeyEventAction;
  keyCode: number;
  repeat: number;
  metaState: number;
  isVirtualBtn: boolean;
}

interface TouchParams {
  action: AndroidMotionEventAction;
  pointerId: number;
  videoWidth: number;
  videoHeight: number;
  pointerX: number;
  pointerY: number;
  pressure: number;
  actionButton: number;
  buttons: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isConfigurationData(data: Uint8Array): boolean {
  if (!data?.length) return false;
  return (
    (data[0] === 0 && data[1] === 0 && data[2] === 1) ||
    (data[0] === 0 && data[1] === 0 && data[2] === 0 && data[3] === 1)
  );
}

async function safeDisposeDecoderInstance(
  decoder: null | { dispose: () => Promise<void> },
) {
  if (!decoder) return;
  try {
    if (typeof decoder.dispose === 'function') {
      await decoder.dispose();
    }
  } catch (error) {
    console.warn(
      '[WebAdb] decoder.dispose 已忽略:',
      (error as Error)?.message || error,
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Composable                                                         */
/* ------------------------------------------------------------------ */

export function useWebAdbScrcpy(
  props: {
    [key: string]: unknown;
    autoGoUrl?: boolean;
    device?: {
      chipCode?: string;
      connIp?: string;
      deviceStatus?: string;
      serial?: string;
    };
    embedded?: boolean;
    largeScreen?: boolean;
  },
  emit: ((event: 'connection-state', state: ConnectionState) => void) &
    ScrcpyEmitFn,
  renderRef: { value: null | { $el: HTMLElement } },
) {
  const deviceRef = toRef(props, 'device');
  const {
    MOUSE_EVENT_BUTTON_TO_ANDROID_BUTTON,
    deviceInfo,
    getDeviceStore,
    setDeviceSocket,
    writeUInt32BE,
    spawnWaitText,
    goUrl,
    screenshot,
    screenshotToAlbum,
    volumeFn,
    rotateFn,
    setSizeFn,
    restoreResolution,
    clearTasks,
    openSetting,
    openApp,
  } = useScrcpyDevice(deviceRef, emit);

  /* ---- Refs ---- */
  const connectionState = ref<ConnectionState>('disconnected');
  const lastKeyframe = ref(0n);
  const width = ref(0);
  const height = ref(0);
  // 必须用 shallowRef：WebCodecsVideoDecoder 含私有字段，经 ref→reactive 的 Proxy 包装后会报 Cannot read from private field
  const decoder = shallowRef<any>(null);
  const rotation = ref(0);
  const aspectRatio = ref<null | number>(null);
  const deviceRealWidth = ref(0);
  const deviceRealHeight = ref(0);
  const openInput = ref(false);
  const containerStyle = ref({});
  const windowHeight = ref(window.innerHeight);
  const windowWidth = ref(window.innerWidth);
  const shellValue = ref('');
  const lastClipboardContent = ref('');
  const isDestroyed = ref(false);
  const messageQueue = ref<Uint8Array[]>([]);
  const videoRenderer = ref<null | { canvas: HTMLCanvasElement }>(null);
  const metadata = ref({ codec: ScrcpyVideoCodecId.H264 });
  const videoStream = ref<null | ReadableStream>(null);
  const videoStreamController =
    ref<null | ReadableStreamDefaultController<MediaPacket>>(null);
  const videoStreamClosed = ref(false);
  const wsReconnectTimer = ref<null | ReturnType<typeof setTimeout>>(null);
  const isStreamActive = ref(false);
  const isDecoderReady = ref(false);
  const abortController = new AbortController();
  const httpPath = ref('');
  const hasInitializedDecoder = ref(false);
  const decoderConfigured = ref(false);
  const receivedKeyframe = ref(false);

  /* ---- Audio refs ---- */
  const audioPlayer = ref<any>(null);
  const audioCodec = ref<string>('RAW');
  const audioStream = ref<null | ReadableStream>(null);
  const audioStreamController =
    ref<null | ReadableStreamDefaultController<MediaPacket>>(null);
  const audioStreamClosed = ref(false);

  /* ---- Occupancy refs ---- */
  const occupyInfo = ref<Record<string, unknown>>({});

  /* ---- Computed ---- */
  const classes = computed(() => ({
    video: {
      transformOrigin: 'center center',
      touchAction: 'none',
    },
  }));

  /* ---- Core helpers ---- */

  function preventEventDefaults(event: Event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function sendBinaryMessage(
    messageType: number,
    params: Record<string, unknown>,
  ) {
    const deviceSocket = getDeviceStore();

    if (!deviceSocket || deviceSocket?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未连接');
      return;
    }

    try {
      const safeParams = JSON.parse(
        JSON.stringify(params, (_key, value) => {
          return typeof value === 'bigint' ? value.toString() : value;
        }),
      );

      const paramsJson = JSON.stringify(safeParams);
      const paramsBytes = new TextEncoder().encode(paramsJson);
      const buffer = new Uint8Array(5 + paramsBytes.length);

      buffer[0] = messageType;
      writeUInt32BE(buffer, 1, paramsBytes.length);
      buffer.set(paramsBytes, 5);

      deviceSocket.send(buffer);

      emit('messageSent', buffer);
    } catch (error) {
      console.error('发送二进制消息失败:', error);
    }
  }

  function clearWsReconnectTimer() {
    if (wsReconnectTimer.value) {
      clearTimeout(wsReconnectTimer.value);
      wsReconnectTimer.value = null;
    }
  }

  /* ---- Video stream ---- */

  function createVideoStream() {
    videoStream.value = new ReadableStream({
      start(controller) {
        videoStreamController.value =
          controller as ReadableStreamDefaultController<MediaPacket>;
      },
      cancel() {
        /* noop */
      },
    });
  }

  async function initializeDecoder(clientArg: any) {
    try {
      let videoPacketStream: ReadableStream;
      let streamMetadata: { codec: ScrcpyVideoCodecId };
      if (
        typeof clientArg.videoStream === 'object' &&
        clientArg.videoStream !== null
      ) {
        videoPacketStream = clientArg.videoStream.stream;
        streamMetadata = clientArg.videoStream.metadata;
      } else {
        const { stream, metadata: meta } = await clientArg.videoStream;
        videoPacketStream = stream;
        streamMetadata = meta;
      }

      const renderer = new BitmapVideoFrameRenderer();

      decoder.value = new (WebCodecsVideoDecoder as any)({
        codec: streamMetadata.codec,
        renderer,
        onError: (error: Error) => {
          console.warn('⚠️ 解码器错误:', error.message);
        },
      });

      if (!renderRef.value) {
        console.error('❌ 渲染容器未找到');
        return;
      }

      const el = renderRef.value.$el;
      const existingCanvas = el.querySelector('canvas');
      if (existingCanvas) {
        el.replaceChild(renderer.canvas as unknown as Node, existingCanvas);
      } else {
        el.append(renderer.canvas as unknown as Node);
      }

      lastKeyframe.value = 0n;
      decoderConfigured.value = false;
      receivedKeyframe.value = false;

      let localDecoderConfigured = false;
      let localReceivedKeyframe = false;

      const handler = new TransformStream<MediaPacket, MediaPacket>({
        transform: (packet, controller) => {
          try {
            if (packet.type === 'configuration') {
              handleConfiguration(packet.data, streamMetadata);
              localDecoderConfigured = true;
              decoderConfigured.value = true;
              console.log('[VideoDecoder] 解码器已配置，等待关键帧');
              controller.enqueue(packet);
              return;
            }

            if (!localDecoderConfigured) {
              console.warn('[VideoDecoder] 解码器未配置，跳过帧数据');
              return;
            }

            if (packet.keyframe) {
              localReceivedKeyframe = true;
              receivedKeyframe.value = true;
              connectionState.value = 'connected';
              console.log('[VideoDecoder] 收到关键帧，开始解码');
              if (props.autoGoUrl) {
                goUrl('https://www.ip138.com/');
              }
            }

            if (!localReceivedKeyframe) {
              console.warn('[VideoDecoder] 等待关键帧，跳过非关键帧');
              return;
            }

            controller.enqueue(packet);
          } catch (error) {
            console.warn('⚠️ 处理视频包时出错:', (error as Error).message);
          }
        },
      });

      if (videoPacketStream && typeof videoPacketStream.pipeTo === 'function') {
        videoPacketStream
          .pipeThrough(handler)
          .pipeTo(decoder.value.writable)
          .catch((error) => {
            if (isDestroyed.value || abortController.signal.aborted) {
              return;
            }
            if (
              error.name !== 'AbortError' &&
              !error.message.includes('locked') &&
              !error.message.includes('closed')
            ) {
              console.error('❌ 视频流处理错误:', error.message);
            }
          });
      } else {
        console.error('❌ videoPacketStream 无效或不可用');
      }

      hasInitializedDecoder.value = true;
    } catch (error) {
      console.error('❌ 初始化解码器时出错:', (error as Error).message);
    }
  }

  function handleConfiguration(
    data: Uint8Array,
    meta: { codec?: ScrcpyVideoCodecId },
  ) {
    try {
      let croppedWidth: number;
      let croppedHeight: number;
      const codec = meta.codec || ScrcpyVideoCodecId.H264;
      switch (codec) {
        case ScrcpyVideoCodecId.H264: {
          ({ croppedWidth, croppedHeight } = h264ParseConfiguration(data));
          break;
        }
        case ScrcpyVideoCodecId.H265: {
          ({ croppedWidth, croppedHeight } = h265ParseConfiguration(data));
          break;
        }
        default: {
          throw new Error('Unsupported codec');
        }
      }
      if (croppedWidth > 0 && croppedHeight > 0) {
        width.value = croppedWidth;
        height.value = croppedHeight;
        changeStyle();
      } else {
        console.warn(
          `[Configuration] 解析到无效的视频尺寸: ${croppedWidth}x${croppedHeight}`,
        );
        width.value = 1080;
        height.value = 1920;
        changeStyle();
      }
    } catch (error) {
      console.error('[Configuration] 解析配置失败:', error);
      width.value = 1080;
      height.value = 1920;
      changeStyle();
    }
  }

  function handleKeyframe(packet: MediaPacket) {
    if (lastKeyframe.value) {
      Math.floor(Number(packet.pts! - lastKeyframe.value) / 1000);
    }
    lastKeyframe.value = packet.pts!;
  }

  /* ---- Style / layout ---- */

  function setRendererStyle(
    renderer: HTMLElement,
    calcWidth: number,
    calcHeight: number,
  ) {
    renderer.style.width = `${calcWidth}px`;
    renderer.style.height = `${calcHeight}px`;
  }

  function updateContainerStyle(calcWidth: number, calcHeight: number) {
    const rotatedWidth = rotation.value & 1 ? height.value : width.value;
    const rotatedHeight = rotation.value & 1 ? width.value : height.value;

    containerStyle.value = {
      width: `${calcWidth}px`,
      height: `${calcHeight}px`,
      borderRadius: '0',
      overflow: 'hidden',
      transform: `translate(${(rotatedWidth - width.value) / 2}px, ${(rotatedHeight - height.value) / 2}px) rotate(${rotation.value * 90}deg)`,
    };
  }

  function swapWidthHeight(
    widthVal: number,
    heightVal: number,
  ): [number, number] {
    const w = calculateWidth();
    const h = windowHeight.value - 145;
    return widthVal > heightVal ? [h, w] : [w, h];
  }

  function calculateWidth(): number {
    if (!aspectRatio.value && width.value > 0 && height.value > 0) {
      aspectRatio.value = width.value / height.value;
    }
    if (!aspectRatio.value) {
      aspectRatio.value = 9 / 16;
    }
    return Number(((windowHeight.value - 145) * aspectRatio.value).toFixed(0));
  }

  function changeStyle() {
    if (width.value <= 0 || height.value <= 0) {
      console.warn(
        `[Style] 宽高未初始化，无法调整样式: ${width.value}x${height.value}`,
      );
      return;
    }

    if (!aspectRatio.value) {
      aspectRatio.value = width.value / height.value;
    }

    const [calcWidth, calcHeight] = swapWidthHeight(width.value, height.value);

    const renderer =
      videoRenderer.value ||
      (decoder.value &&
        (
          decoder.value as unknown as {
            renderer: { canvas: HTMLCanvasElement };
          }
        ).renderer);
    if (
      renderer &&
      (renderer as unknown as { canvas: HTMLCanvasElement }).canvas
    ) {
      setRendererStyle(
        (renderer as unknown as { canvas: HTMLCanvasElement }).canvas,
        calcWidth,
        calcHeight,
      );
    }

    updateContainerStyle(calcWidth, calcHeight);
  }

  function handleResize() {
    windowHeight.value = window.innerHeight;
    windowWidth.value = window.innerWidth;
    if (width.value > 0 && height.value > 0) {
      changeStyle();
    }
  }

  /* ---- Position / touch helpers ---- */

  function adjustPositionForRotation(
    pointerViewX: number,
    pointerViewY: number,
    rot: number,
  ) {
    let adjustedX = pointerViewX;
    let adjustedY = pointerViewY;

    const ROTATION_90 = 1;
    const ROTATION_180 = 2;
    const ROTATION_270 = 3;

    switch (rot) {
      case ROTATION_90: {
        [adjustedX, adjustedY] = [adjustedY, adjustedX];
        adjustedY = 1 - adjustedY;
        break;
      }
      case ROTATION_180: {
        adjustedX = 1 - adjustedX;
        adjustedY = 1 - adjustedY;
        break;
      }
      case ROTATION_270: {
        [adjustedX, adjustedY] = [adjustedY, adjustedX];
        adjustedX = 1 - adjustedX;
        break;
      }
    }

    return { x: adjustedX, y: adjustedY };
  }

  function clientPositionToDevicePosition(clientX: number, clientY: number) {
    const canvas = (
      decoder.value as unknown as { renderer?: { canvas: HTMLCanvasElement } }
    )?.renderer?.canvas;
    if (!canvas) {
      console.warn('Canvas 未找到，使用容器进行坐标计算');
      if (!renderRef.value) {
        return { x: 0, y: 0 };
      }
      const viewRect = renderRef.value.$el.getBoundingClientRect();
      const pointerViewX = clamp((clientX - viewRect.x) / viewRect.width, 0, 1);
      const pointerViewY = clamp(
        (clientY - viewRect.y) / viewRect.height,
        0,
        1,
      );
      const adjustedPosition = adjustPositionForRotation(
        pointerViewX,
        pointerViewY,
        rotation.value,
      );
      return {
        x: adjustedPosition.x * width.value,
        y: adjustedPosition.y * height.value,
      };
    }

    const canvasRect = canvas.getBoundingClientRect();
    const pointerViewX = clamp(
      (clientX - canvasRect.x) / canvasRect.width,
      0,
      1,
    );
    const pointerViewY = clamp(
      (clientY - canvasRect.y) / canvasRect.height,
      0,
      1,
    );

    const adjustedPosition = adjustPositionForRotation(
      pointerViewX,
      pointerViewY,
      rotation.value,
    );

    const videoX = clamp(adjustedPosition.x * width.value, 0, width.value - 1);
    const videoY = clamp(
      adjustedPosition.y * height.value,
      0,
      height.value - 1,
    );

    return {
      x: videoX,
      y: videoY,
    };
  }

  /* ---- WebSocket video packet handlers ---- */

  function handleWebSocketVideoPacket(packet: {
    data: string;
    keyframe: boolean;
    pts?: string;
    type: string;
  }) {
    if (
      isDestroyed.value ||
      !isStreamActive.value ||
      !videoStreamController.value ||
      videoStreamClosed.value
    ) {
      console.warn('[VideoStream] 视频流控制器未初始化');
      return;
    }

    try {
      const data = base64ToUint8Array(packet.data);

      const mediaPacket: MediaPacket = {
        type: packet.type as MediaPacket['type'],
        keyframe: packet.keyframe,
        pts: packet.pts ? BigInt(packet.pts) : undefined,
        data,
      };

      videoStreamController.value.enqueue(mediaPacket);
    } catch (error) {
      console.error('[VideoStream] 处理视频包失败:', error);
      if ((error as Error).message.includes('closed')) {
        videoStreamClosed.value = true;
        isStreamActive.value = false;
      } else {
        console.error('入队失败:', error);
      }
    }
  }

  async function handleWebSocketBinaryPacket(
    header: { keyframe: boolean; type: string },
    binaryData: ArrayBuffer | Blob,
  ) {
    if (!decoder.value) {
      console.warn('[VideoDecoder] 解码器未初始化');
      return;
    }

    try {
      let data: Uint8Array;
      if (binaryData instanceof Blob) {
        const arrayBuffer = await binaryData.arrayBuffer();
        data = new Uint8Array(arrayBuffer);
      } else if (binaryData instanceof ArrayBuffer) {
        data = new Uint8Array(binaryData);
      } else {
        console.error('[VideoDecoder] 未知的二进制数据类型:', binaryData);
        return;
      }

      if (
        header.type === 'configuration' ||
        (data.length > 0 && isConfigurationData(data))
      ) {
        handleConfiguration(data, metadata.value);
      } else {
        if (header.keyframe) {
          // noop
        }
        if (decoderConfigured.value) {
          decoder.value.decode(data);
        } else {
          console.warn('[VideoDecoder] 解码器未配置，等待配置包');
        }
      }
    } catch (error) {
      console.error('[VideoDecoder] 处理二进制视频包失败:', error);
    }
  }

  function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  function handlePacket(
    packet: MediaPacket,
    meta: { codec: ScrcpyVideoCodecId },
  ) {
    if (
      isDestroyed.value ||
      !isStreamActive.value ||
      !decoder.value ||
      !decoderConfigured.value ||
      !receivedKeyframe.value
    ) {
      return;
    }

    if (packet.type === 'configuration') {
      handleConfiguration(packet.data, meta);
    } else {
      if (packet.keyframe) {
        handleKeyframe(packet);
      }
      if (isDecoderReady.value) {
        try {
          // 流通过 pipeTo 解码
        } catch (error) {
          if (
            !(error as Error).message.includes('unconfigured') &&
            !(error as Error).message.includes('closed')
          ) {
            console.error('解码失败:', error);
          }
        }
      }
    }
  }

  /* ---- Touch / mouse / keyboard ---- */

  async function executeTouchAction(
    action: AndroidMotionEventAction,
    event: {
      button: number;
      buttons: number;
      clientX: number;
      clientY: number;
    },
  ) {
    try {
      const { x, y } = clientPositionToDevicePosition(
        event.clientX,
        event.clientY,
      );
      const params: TouchParams = {
        action,
        pointerId: ScrcpyPointerId.Finger as unknown as number,
        videoWidth: width.value,
        videoHeight: height.value,
        pointerX: x,
        pointerY: y,
        pressure: event.buttons === 0 ? 0 : 1,
        actionButton:
          MOUSE_EVENT_BUTTON_TO_ANDROID_BUTTON[(event.button as number) || 0] ||
          MOUSE_EVENT_BUTTON_TO_ANDROID_BUTTON[0]!,
        buttons: event.buttons,
      };

      sendBinaryMessage(0x10, params as unknown as Record<string, unknown>);
    } catch (error) {
      console.error('触控操作失败:', error);
    }
  }

  function calculateSyncPosition(
    event: { clientX: number; clientY: number },
    targetSize: { height: number; width: number },
    targetRotation: number,
  ): null | { x: number; y: number } {
    if (!renderRef.value || !renderRef.value.$el) return null;

    const containerRect = renderRef.value.$el.getBoundingClientRect();
    const relativeX = clamp(
      (event.clientX - containerRect.x) / containerRect.width,
      0,
      1,
    );
    const relativeY = clamp(
      (event.clientY - containerRect.y) / containerRect.height,
      0,
      1,
    );

    const adjustedPos = adjustPositionForRotation(
      relativeX,
      relativeY,
      targetRotation,
    );

    return {
      x: adjustedPos.x * targetSize.width,
      y: adjustedPos.y * targetSize.height,
    };
  }

  async function handleWheel(event: WheelEvent) {
    preventEventDefaults(event);

    const { x, y } = clientPositionToDevicePosition(
      event.clientX,
      event.clientY,
    );

    try {
      const params = {
        pointerX: x,
        pointerY: y,
        videoWidth: width.value,
        videoHeight: height.value,
        scrollX: -event.deltaX / 100,
        scrollY: -event.deltaY / 100,
        buttons: 0,
      };
      sendBinaryMessage(0x11, params);
    } catch (error) {
      console.error('滚轮事件注入失败:', error);
    }
  }

  async function handlePointerEnter() {
    openKeyInput('open');
  }

  async function handlePointerDown(event: PointerEvent) {
    let pasteVal = '';
    if (navigator?.clipboard?.readText) {
      try {
        pasteVal = await navigator.clipboard.readText();
      } catch (error) {
        console.warn('剪贴板读取失败:', (error as Error).message);
      }
    }

    if (pasteVal?.length && pasteVal !== lastClipboardContent.value) {
      const params = {
        sequence: '1',
        paste: true,
        content: pasteVal,
      };
      sendBinaryMessage(0x13, params);
      lastClipboardContent.value = pasteVal;
    }

    preventEventDefaults(event);
    await executeTouchAction(AndroidMotionEventAction.Down, event);
  }

  const handlePointerMove = trailingThrottle(async (event: any) => {
    preventEventDefaults(event);

    if (event.buttons === 0) {
      AndroidMotionEventAction.HoverMove;
    } else {
      const action = AndroidMotionEventAction.Move;
      await executeTouchAction(action, event);
    }
  }, 5);

  async function handlePointerUp(event: PointerEvent) {
    preventEventDefaults(event);
    await executeTouchAction(AndroidMotionEventAction.Up, event);
  }

  async function handlePointerLeave(event: PointerEvent) {
    openKeyInput('close');
    preventEventDefaults(event);
    try {
      const deviceSocket = getDeviceStore();

      if (!deviceSocket || deviceSocket?.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket未连接');
        return;
      }

      const getClipboardMessage = new Uint8Array([0x18]);
      deviceSocket.send(getClipboardMessage);
    } catch (error) {
      console.error('发送获取剪切板请求失败:', error);
    }
  }

  function handleContextMenu(event: Event) {
    preventEventDefaults(event);
  }

  /* ---- Keyboard ---- */

  function openKeyInput(type: 'close' | 'open') {
    openInput.value = type === 'open';
    window.removeEventListener('keydown', handleKeyEvent);
    window.removeEventListener('keyup', handleKeyEvent);

    if (openInput.value) {
      window.addEventListener('keydown', handleKeyEvent);
      window.addEventListener('keyup', handleKeyEvent);
    }
  }

  async function handleKeyEvent(e: any, code: null | number = null) {
    if (code) {
      await handleKeyCode(e, code);
    } else if (openInput.value) {
      await handleKeyCode(e as KeyboardEvent);
    }
  }

  async function executeKeyAction(keyParams: KeyParams) {
    try {
      const { action, keyCode, repeat, metaState } = keyParams;

      const params: Record<string, unknown> = {
        action,
        keyCode,
        repeat,
        metaState,
      };
      sendBinaryMessage(0x12, params);

      if (keyParams.isVirtualBtn && action === AndroidKeyEventAction.Down) {
        const upParams: Record<string, unknown> = {
          action: AndroidKeyEventAction.Up,
          keyCode,
          repeat: 0,
          metaState,
        };
        sendBinaryMessage(0x12, upParams);
      }
    } catch (error) {
      console.error('❌ 键盘操作失败:', (error as Error).message);
      console.error('详细错误:', error);
    }
  }

  async function handleKeyCode(e: any, code: null | number = null) {
    if (e?.code === 'ControlLeft' || e?.code === 'ControlRight') {
      return;
    }

    if (e && e.ctrlKey) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }

    const action =
      e && 'type' in e
        ? (e.type === 'keydown'
          ? AndroidKeyEventAction.Down
          : AndroidKeyEventAction.Up)
        : AndroidKeyEventAction.Down;
    const keyRepeat = e && 'repeat' in e ? (e.repeat ? 1 : 0) : 0;
    const isVirtualBtn = !e;

    let metaState = 0;
    if (e?.ctrlKey) metaState |= 0x10_00;
    if (e?.shiftKey) metaState |= 0x01;
    if (e?.altKey) metaState |= 0x02;

    const finalKeyCode: number =
      code ||
      (e && 'code' in e
        ? (AndroidKeyCode[e.code as keyof typeof AndroidKeyCode] as number)
        : 0);
    const keyParams: KeyParams = {
      action,
      keyCode: finalKeyCode,
      repeat: keyRepeat,
      metaState,
      isVirtualBtn,
    };

    try {
      await executeKeyAction(keyParams);
    } catch (error) {
      console.error('❌ 当前设备按键注入失败:', (error as Error).message);
    }
  }

  /* ---- WebSocket lifecycle ---- */

  function flushMessageQueue() {
    while (messageQueue.value.length > 0) {
      const message = messageQueue.value.shift();
      if (!message) continue;
      try {
        const deviceSocket = getDeviceStore();
        deviceSocket!.send(message);
      } catch (error) {
        console.error('[WebSocketStream] 发送队列消息失败:', error);
      }
    }
  }

  async function handleSocketOpen(clarity = '') {
    try {
      const deviceSocket = getDeviceStore();
      if (!deviceSocket) return;

      flushMessageQueue();
      clearWsReconnectTimer();

      const userStore = useUserStore();
      const connectData = {
        serial: props.device?.serial,
        userName: userStore.userInfo?.nickName || '',
        clarity,
      };
      const connectDataStr = JSON.stringify(connectData);
      const connectDataBuffer = new TextEncoder().encode(connectDataStr);
      const connectMessage = new Uint8Array(connectDataBuffer.length + 1);
      connectMessage[0] = 0x01;
      connectMessage.set(connectDataBuffer, 1);

      if (deviceSocket.readyState === WebSocket.OPEN) {
        try {
          deviceSocket.send(connectMessage);
        } catch (error) {
          console.error('[WebSocketStream] 发送消息失败:', error);
        }
      }
    } catch (error) {
      console.error('[WebSocketStream] 连接打开处理失败:', error);
    }
  }

  function handleSocketClose(e: CloseEvent) {
    console.log(
      `[WebSocketStream] 连接关闭: code=${e.code}, reason=${e.reason}`,
    );

    if ([4000, 4001, 4002].includes(e.code)) {
      try {
        const reason = JSON.parse(e.reason);
        occupyInfo.value = reason;
        connectionState.value = 'connectedTrue';
        return;
      } catch {
        // ignore parse errors
      }
    }

    connectionState.value = 'disconnected';
    if (
      [1006, 1011, 1013].includes(e.code) ||
      (e.code === 1000 && e.reason === '视频流结束')
    ) {
      scheduleWsReconnect();
    }
  }

  function handleSocketError(e: Event) {
    console.error('[WebSocketStream] 连接错误:', e);
    const deviceSocket = getDeviceStore();

    if (deviceSocket) {
      console.error(
        `[WebSocketStream] WebSocket readyState: ${deviceSocket.readyState}`,
      );
    }
    connectionState.value = 'error';
    scheduleWsReconnect();
  }

  async function scheduleWsReconnect() {
    if (isDestroyed.value) return;

    const shouldReconnect = !(
      (props.device && props.device.deviceStatus === 'OFFLINE') ||
      (props.device &&
        !props.device.connIp &&
        props.device.deviceStatus === 'ONLINE')
    );

    if (!shouldReconnect) {
      return;
    }

    await destroyClient();
    clearWsReconnectTimer();
    const delay = 10_000;

    wsReconnectTimer.value = setTimeout(() => {
      initWs();
    }, delay);
  }

  function checkDeviceStatus() {
    const shouldDestroy =
      (props.device && props.device.deviceStatus === 'OFFLINE') ||
      (props.device &&
        !props.device.connIp &&
        props.device.deviceStatus === 'ONLINE');

    if (shouldDestroy) {
      destroyClient();
    } else {
      initWs();
    }
  }

  /* ---- Audio stream ---- */

  function createAudioStream() {
    audioStream.value = new ReadableStream({
      start(controller) {
        audioStreamController.value =
          controller as ReadableStreamDefaultController<MediaPacket>;
      },
      cancel() {
        console.log('[AudioStream] 流被取消');
      },
    });
  }

  async function initializeAudio({
    audioStream: audioStreamParam,
  }: {
    audioStream: {
      metadata: { optionValue?: string; webCodecId?: string };
      stream: ReadableStream;
    };
  }) {
    try {
      let player: any = null;
      const optionValue = audioCodec.value.optionValue;

      switch (optionValue) {
        case ScrcpyAudioCodec.Aac.optionValue: {
          player = new Float32PlanerPcmPlayer(48_000, 2);
          audioStreamParam.stream
            .pipeThrough(
              new AacDecodeStream({
                codec: audioStreamParam.metadata.webCodecId,
                numberOfChannels: 2,
                sampleRate: 48_000,
              }),
            )
            .pipeTo(
              new WritableStream({
                write: (chunk: Float32Array[]) => {
                  (player as Float32PlanerPcmPlayer).feed(chunk);
                },
              }),
            );
          break;
        }
        case ScrcpyAudioCodec.Opus.optionValue: {
          player = new Float32PcmPlayer(48_000, 2);
          audioStreamParam.stream
            .pipeThrough(
              new OpusDecodeStream({
                codec: audioStreamParam.metadata.webCodecId,
                numberOfChannels: 2,
                sampleRate: 48_000,
              }),
            )
            .pipeTo(
              new WritableStream({
                write: (chunk: Float32Array) => {
                  (player as Float32PcmPlayer).feed(chunk);
                },
              }),
            );
          break;
        }
        case ScrcpyAudioCodec.Raw.optionValue: {
          player = new Int16PcmPlayer(48_000, 2);
          audioStreamParam.stream.pipeTo(
            new WritableStream({
              write: (chunk: MediaPacket) => {
                (player as Int16PcmPlayer).feed(
                  new Int16Array(
                    chunk.data.buffer,
                    chunk.data.byteOffset,
                    chunk.data.byteLength / Int16Array.BYTES_PER_ELEMENT,
                  ),
                );
              },
            }),
          );
          break;
        }
        default: {
          throw new Error(`Unsupported audio codec ${audioCodec.value}`);
        }
      }
      audioPlayer.value = player;
      if (player) await player.start();
      console.log('[initializeAudio] 音频播放器已就绪');
    } catch (error) {
      console.log('[initializeAudio] 错误:', error);
    }
  }

  /* ---- WebSocket message handlers ---- */

  function wsShell(buffer: Uint8Array) {
    const dataStr = new TextDecoder().decode(buffer.slice(1));
    const data = JSON.parse(dataStr);
    if (data.error) {
      console.error('[WebSocketStream] Shell命令执行失败:', data.error);
    }
  }

  function wsStreamEnd(_buffer: Uint8Array, socket: WebSocket) {
    connectionState.value = 'disconnected';
    if (videoStreamController.value) {
      videoStreamController.value.close();
    }
    socket.close();
    scheduleWsReconnect();
  }

  function wsErrorLog(_buffer: Uint8Array, socket: WebSocket) {
    const dataStr = new TextDecoder().decode(_buffer.slice(1));
    const data = JSON.parse(dataStr);
    console.error('[WebSocketStream] 收到错误消息:', data.error);
    socket.close();
    connectionState.value = 'error';
    scheduleWsReconnect();
  }

  function wsDeviceInfo(buffer: Uint8Array) {
    const dataStr = new TextDecoder().decode(buffer.slice(1));
    const data = JSON.parse(dataStr);
    deviceInfo.value = data;
    if (data.audioCodec) {
      audioCodec.value = data.audioCodec;
      initializeAudio({
        audioStream: {
          stream: audioStream.value!,
          metadata: data.audioCodec,
        },
      });
    }
    if (props.autoGoUrl) {
      goUrl('https://www.ip138.com/');
    }
  }

  function wsVideoStream(buffer: Uint8Array) {
    if (
      isDestroyed.value ||
      !isStreamActive.value ||
      videoStreamClosed.value ||
      !videoStreamController.value
    ) {
      console.warn('[WebSocketStream] 流已关闭或组件已销毁，跳过视频包');
      return;
    }

    if (videoStreamController.value && !videoStreamClosed.value) {
      try {
        const dataLength =
          (buffer[1]! << 24) |
          (buffer[2]! << 16) |
          (buffer[3]! << 8) |
          buffer[4]!;
        const packetType = buffer[5]!;
        const isKeyframe = buffer[6] === 1;
        const ptsHigh =
          (buffer[7]! << 24) |
          (buffer[8]! << 16) |
          (buffer[9]! << 8) |
          buffer[10]!;
        const ptsLow =
          (buffer[11]! << 24) |
          (buffer[12]! << 16) |
          (buffer[13]! << 8) |
          buffer[14]!;
        const pts = BigInt(ptsHigh) * BigInt(0x1_00_00_00_00) + BigInt(ptsLow);
        const videoData = buffer.slice(15, 15 + dataLength);

        const mediaPacket: MediaPacket = {
          type: packetType === 2 ? 'configuration' : 'frame',
          keyframe: isKeyframe,
          pts,
          data: videoData,
        };

        if (videoStreamController.value && !videoStreamClosed.value) {
          videoStreamController.value.enqueue(mediaPacket);
        }
      } catch (error) {
        console.error('[WebSocketStream] 处理视频数据包失败:', error);
        if (
          (error as Error).message?.includes('closed') ||
          (error as Error).name === 'TypeError'
        ) {
          console.warn('[WebSocketStream] 流已关闭，停止添加数据');
          videoStreamClosed.value = true;
          videoStreamController.value = null;
        }
      }
    }
  }

  function wsAudioStream(buffer: Uint8Array) {
    if (isDestroyed.value || !isStreamActive.value) return;
    try {
      const dataLength =
        (buffer[1]! << 24) |
        (buffer[2]! << 16) |
        (buffer[3]! << 8) |
        buffer[4]!;
      if (dataLength <= 0) return;
      const packetType = buffer[5]!;
      const ptsHigh =
        (buffer[6]! << 24) |
        (buffer[7]! << 16) |
        (buffer[8]! << 8) |
        buffer[9]!;
      const ptsLow =
        (buffer[10]! << 24) |
        (buffer[11]! << 16) |
        (buffer[12]! << 8) |
        buffer[13]!;
      const pts = BigInt(ptsHigh) * BigInt(0x1_00_00_00_00) + BigInt(ptsLow);
      const audioData = buffer.slice(14, 14 + dataLength);

      const mediaPacket: MediaPacket = {
        type: (packetType === 2
          ? 'configuration'
          : 'data') as MediaPacket['type'],
        pts,
        data: audioData,
      };

      if (audioStreamController.value && !audioStreamClosed.value) {
        try {
          audioStreamController.value.enqueue(mediaPacket);
        } catch {
          audioStreamClosed.value = true;
          audioStreamController.value = null;
        }
      }
    } catch (error) {
      console.error('[WebSocketStream] 处理音频数据包失败:', error);
    }
  }

  /* ---- Occupancy ---- */

  async function dblclick() {
    try {
      console.log('dblclick');
      occupyInfo.value = {};
      connectionState.value = 'loading';
      const res = await fetch(`${httpPath.value}/adb/device/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial: props.device?.deviceIp }),
      });
      const data = await res.json();
      console.log('断开设备:', data);
      initWs();
    } catch (error) {
      console.log(error);
    }
  }

  async function getDevicesStatus() {
    try {
      const res = await fetch(`${httpPath.value}/adb/device/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial: props.device?.deviceIp }),
      });
      const data = await res.json();
      console.log('获取设备状态:', data);
      occupyInfo.value = data;
      if (data.connected) {
        ElMessage.warning('设备已连接');
        connectionState.value = 'connectedTrue';
        return false;
      }
      initWs();
    } catch (error) {
      console.error('获取设备状态失败:', error);
    }
  }

  /* ---- init / destroy ---- */

  async function initWs(_clarity = '') {
    try {
      createVideoStream();
      createAudioStream();
      await initializeDecoder({
        videoStream: {
          stream: videoStream.value!,
          metadata: metadata.value,
        },
      });

      const existingSocket = getDeviceStore();
      if (existingSocket) {
        existingSocket.close();
        setDeviceSocket(null);
      }

      videoStreamClosed.value = false;
      isStreamActive.value = true;
      if (
        (props.device && props.device.deviceStatus === 'OFFLINE') ||
        (props.device &&
          !props.device.connIp &&
          props.device.deviceStatus === 'ONLINE')
      ) {
        return false;
      }

      const socket = new WebSocket(httpPath.value);
      socket.binaryType = 'arraybuffer';
      socket.addEventListener('open', () => handleSocketOpen(_clarity));

      socket.onmessage = (e) => {
        if (isDestroyed.value || !isStreamActive.value) return;

        if (e.data instanceof ArrayBuffer) {
          const buffer = new Uint8Array(e.data);
          const messageType = buffer[0];

          switch (messageType) {
            case 0x02: {
              wsDeviceInfo(buffer);
              break;
            }
            case 0x03: {
              wsVideoStream(buffer);
              break;
            }
            case 0x04: {
              wsAudioStream(buffer);
              break;
            }
            case 0x05: {
              wsStreamEnd(buffer, socket);
              break;
            }
            case 0x07: {
              wsErrorLog(buffer, socket);
              break;
            }
            case 0x14: {
              wsShell(buffer);
              break;
            }
            case 0x15: {
              wsScreenshot(buffer, socket, {
                deviceInfo: deviceInfo.value,
                deviceRealWidth: deviceRealWidth.value,
                deviceRealHeight: deviceRealHeight.value,
                width: width.value,
                height: height.value,
              });
              break;
            }
            case 0x17: {
              wsHeartbeat(buffer, socket);
              break;
            }
            case 0x18: {
              wsSetClipboard(buffer, socket);
              break;
            }
          }
        }
      };

      socket.addEventListener('close', handleSocketClose);
      socket.onerror = handleSocketError;

      setDeviceSocket(socket);
    } catch (error) {
      console.log(error);
    }
  }

  async function destroyClient() {
    try {
      connectionState.value = 'disconnected';

      openKeyInput('close');
      isDecoderReady.value = false;
      decoderConfigured.value = false;
      receivedKeyframe.value = false;

      if (decoder.value) {
        await safeDisposeDecoderInstance(decoder.value);
        decoder.value = null;
      }

      if (videoRenderer.value) {
        videoRenderer.value = null;
      }

      const deviceSocket = getDeviceStore();

      if (deviceSocket) {
        try {
          deviceSocket.close();
          setDeviceSocket(null);
        } catch (error) {
          console.warn('客户端销毁出错:', error);
        }
      }

      if (renderRef.value && renderRef.value.$el) {
        const el = renderRef.value.$el;
        while (el.firstChild) {
          el.firstChild.remove();
        }
      }

      width.value = 0;
      height.value = 0;
      deviceRealWidth.value = 0;
      deviceRealHeight.value = 0;
      rotation.value = 0;
      hasInitializedDecoder.value = false;
      decoderConfigured.value = false;
      receivedKeyframe.value = false;
    } catch (error) {
      console.error('销毁 scrcpy 客户端资源时出错:', error);
    }
  }

  async function reconnect(clarity = '') {
    if (isDestroyed.value) return;

    try {
      await destroyClient();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await initWs(clarity);
    } catch (error) {
      console.error('手动重连失败:', error);
    }
  }

  /* ---- Keyboard shortcuts ---- */

  function handlePressKey({ key }: { key: string }) {
    const keyCode = AndroidKeyCode[key as keyof typeof AndroidKeyCode];
    if (keyCode) {
      const keyParams: KeyParams = {
        action: AndroidKeyEventAction.Down,
        keyCode,
        repeat: 0,
        metaState: 0,
        isVirtualBtn: true,
      };
      executeKeyAction(keyParams);
    }
  }

  async function executeShellCommand() {
    await spawnWaitText(shellValue.value);
  }

  /* ---- Lifecycle ---- */

  watch(
    () => props.device?.deviceStatus,
    (newStatus, oldStatus) => {
      if (newStatus !== oldStatus) {
        checkDeviceStatus();
      }
    },
  );

  onMounted(() => {
    const hostname =
      import.meta.env.MODE === 'development'
        ? 'test.callfansai.cn'
        : window.location.hostname;
    const pathSegment = props.device?.connIp || hostname;
    const wsUrl = `https://${hostname}/${pathSegment}/3333`;
    //     httpPath.value = wsUrl;
    const ip = 'http://192.168.9.31:3333';
    httpPath.value = ip;
    getDevicesStatus();
    window.addEventListener('resize', handleResize, {
      signal: abortController.signal,
    });
  });

  onBeforeUnmount(() => {
    isDestroyed.value = true;
    isStreamActive.value = false;
    isDecoderReady.value = false;

    abortController.abort();

    const sock = getDeviceStore();
    if (sock) {
      sock.onopen = null;
      sock.onmessage = null;
      sock.onclose = null;
      sock.onerror = null;
      if (sock.readyState === WebSocket.OPEN) {
        sock.close(1000, 'component destroyed');
      }
      setDeviceSocket(null);
    }

    if (videoStreamController.value) {
      try {
        videoStreamController.value?.close();
      } catch {
        /* ignore */
      }
      videoStreamController.value = null;
    }
    videoStreamClosed.value = true;

    if (audioStreamController.value) {
      try {
        audioStreamController.value?.close();
      } catch {
        /* ignore */
      }
      audioStreamController.value = null;
    }
    audioStreamClosed.value = true;

    if (audioPlayer.value) {
      try {
        audioPlayer.value?.stop();
      } catch {
        /* ignore */
      }
      audioPlayer.value = null;
    }

    clearWsReconnectTimer();
    destroyClient().then(() => {
      decoder.value = null;
      hasInitializedDecoder.value = false;
      decoderConfigured.value = false;
      receivedKeyframe.value = false;
    });
    openKeyInput('close');
  });

  /* ---- Return ---- */

  return {
    classes,
    connectionState,
    containerStyle,
    embedded: toRef(props, 'embedded'),
    largeScreen: toRef(props, 'largeScreen'),
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handleContextMenu,
    handleWheel,
    handlePointerEnter,
    reconnect,
    handlePressKey,
    executeShellCommand,
    executeKeyAction,
    spawnWaitText,
    screenshot,
    screenshotToAlbum,
    volumeFn,
    rotateFn,
    setSizeFn,
    restoreResolution,
    clearTasks,
    openSetting,
    openApp,
    goUrl,
    calculateSyncPosition,
    handleWebSocketVideoPacket,
    handleWebSocketBinaryPacket,
    handlePacket,
    clientPositionToDevicePosition,
    occupyInfo,
    dblclick,
    getDevicesStatus,
  };
}
