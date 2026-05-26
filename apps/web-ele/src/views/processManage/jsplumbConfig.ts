/**
 * jsPlumb configuration for the visual flow editor.
 * Migrated from the Vue 2 project (src/configs/index.js).
 * All values preserved exactly from the original configuration.
 */

export const jsplumbSetting: Record<string, unknown> = {
  // 动态锚点、位置自适应
  Anchors: ['Left', 'Right'],
  // 容器ID
  Container: 'efContainer',
  // 连线的样式 — Bezier曲线
  Connector: ['Bezier', { curviness: 150 }],
  // 鼠标不能拖动删除线
  ConnectionsDetachable: true,
  // 删除线的时候节点不删除
  DeleteEndpointsOnDetach: false,
  // 连线的两端端点样式
  EndpointStyle: { fill: '#1879ffa1', outlineWidth: 1 },
  // 是否打开jsPlumb的内部日志记录
  LogEnabled: false,
  DoNotThrowErrors: true,
  // 连线的样式
  PaintStyle: {
    stroke: '#959CB6',
    strokeWidth: 2,
    outlineStroke: 'transparent',
    outlineWidth: 2,
  },
  // 连线末端箭头
  connectionOverlays: [
    [
      'Arrow',
      {
        location: 1,
        visible: true,
        width: 10,
        length: 10,
        paint: '#959CB6',
      },
    ],
  ],
  DragOptions: { cursor: 'pointer', zIndex: 2000 },
  // 叠加
  Overlays: [],
  // 绘制图的模式 svg
  RenderMode: 'svg',
  // 鼠标滑过线的样式
  HoverPaintStyle: { stroke: '#176ac5', strokeWidth: 3 },
  // 范围，具有相同scope的点才可连接
  Scope: 'jsPlumb_DefaultScope',
};

export const jsplumbConnectOptions: Record<string, unknown> = {
  isSource: true,
  isTarget: true,
  anchor: ['Left', 'Right'],
};

export const jsplumbSourceOptions: Record<string, unknown> = {
  // 设置可以拖拽的类名
  filter: '.flow-node-drag',
  filterExclude: false,
  anchor: ['Left', 'Right'],
  // 是否允许自己连接自己
  allowLoopback: false,
  maxConnections: -1,
};

export const jsplumbTargetOptions: Record<string, unknown> = {
  filter: '.flow-node-drag',
  filterExclude: false,
  anchor: ['Left', 'Right'],
  allowLoopback: false,
  dropOptions: { hoverClass: 'ef-drop-hover' },
};

export const endpointOptions: Record<string, unknown> = {
  paintStyle: { fill: '#somecolor' },
  isSource: true,
  connectorStyle: { stroke: '#somecolor', strokeWidth: 3 },
  connector: ['Bezier', { curviness: 63 }],
  maxConnections: -1,
};
