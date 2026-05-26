import { ref, shallowRef } from 'vue';
import jsPlumb from 'jsplumb';

// Fix: jsPlumb 2.x 在 ES 模块中需要通过 .jsPlumb 访问
const jsPlumbInstance = (jsPlumb as any).jsPlumb || (jsPlumb as any).default?.jsPlumb || jsPlumb;

// jsPlumb configuration
export const jsplumbSetting = {
  // Anchor positions
  anchor: ['Left', 'Right'],
  // Connector type
  connector: 'Bezier',
  // Connection style
  connectorStyle: {
    stroke: '#959CB6',
    strokeWidth: 2,
    outlineStroke: 'transparent',
    outlineWidth: 2,
  },
  // Hover style
  connectorHoverStyle: {
    stroke: '#176ac5',
    strokeWidth: 3,
  },
  // Endpoint type
  endpoint: {
    width: 10,
    height: 10,
    stroke: '#176ac5',
    fill: '#fff',
    strokeWidth: 1,
    outlineWidth: 3,
    outlineStroke: 'transparent',
  },
  // Endpoint hover
  endpointHoverStyle: {
    fill: '#176ac5',
    stroke: '#176ac5',
  },
  // Endpoint style
  endpointStyle: {
    fill: '#fff',
    stroke: '#176ac5',
  },
  // Source endpoint
  sourceEndpoint: {
    width: 10,
    height: 10,
    stroke: '#176ac5',
    fill: '#fff',
    strokeWidth: 1,
    outlineWidth: 3,
    outlineStroke: 'transparent',
  },
  // Target endpoint
  targetEndpoint: {
    width: 10,
    height: 10,
    stroke: '#176ac5',
    fill: '#fff',
    strokeWidth: 1,
    outlineWidth: 3,
    outlineStroke: 'transparent',
  },
  // Connection type
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
  // Log enabled
  logEnabled: false,
  // Check connection
  allowLoop: false,
};

// Connection style for drawing
export const jsplumbConnectOptions = {
  isSource: true,
  isTarget: true,
  // Drag options
  draggable: true,
  // Connector
  connector: ['Bezier', { curviness: 60 }],
  // Style
  paintStyle: {
    stroke: '#959CB6',
    strokeWidth: 2,
  },
  hoverPaintStyle: {
    stroke: '#176ac5',
    strokeWidth: 3,
  },
};

export function useJsPlumb() {
  const plumbInstance = shallowRef<any>(null);

  // Initialize jsPlumb
  function initJsPlumb(container: HTMLElement) {
    plumbInstance.value = jsPlumbInstance.getInstance({
      ...jsplumbSetting,
      container,
    });

    plumbInstance.value.ready(() => {
      plumbInstance.value.setSuspendDrawing(false, true);
    });

    return plumbInstance.value;
  }

  // Get instance
  function getInstance() {
    return plumbInstance.value;
  }

  // Connect two points
  function connect(sourceId: string, targetId: string, paintStyle?: any) {
    if (!plumbInstance.value) return null;

    return plumbInstance.value.connect({
      source: sourceId,
      target: targetId,
      ...jsplumbConnectOptions,
      paintStyle: paintStyle || jsplumbConnectOptions.paintStyle,
    });
  }

  // Delete connection
  function deleteConnection(connection: any) {
    if (!plumbInstance.value) return;
    plumbInstance.value.deleteConnection(connection);
  }

  // Delete all connections
  function deleteEveryConnection() {
    if (!plumbInstance.value) return;
    plumbInstance.value.deleteEveryConnection();
  }

  // Repaint everything
  function repaintEverything() {
    if (!plumbInstance.value) return;
    plumbInstance.value.repaintEverything();
  }

  // Remove element
  function remove(elementId: string) {
    if (!plumbInstance.value) return;
    plumbInstance.value.remove(elementId);
  }

  // Add to drag selection
  function addToDragSelection(elementId: string) {
    if (!plumbInstance.value) return;
    plumbInstance.value.addToDragSelection(elementId);
  }

  // Clear drag selection
  function clearDragSelection() {
    if (!plumbInstance.value) return;
    plumbInstance.value.clearDragSelection();
  }

  // Set zoom
  function setZoom(zoom: number) {
    if (!plumbInstance.value) return;
    plumbInstance.value.setZoom(zoom);
  }

  // Get zoom
  function getZoom() {
    if (!plumbInstance.value) return 1;
    return plumbInstance.value.getZoom();
  }

  // Get all connections
  function getConnections() {
    if (!plumbInstance.value) return [];
    return plumbInstance.value.getConnections();
  }

  return {
    plumbInstance,
    initJsPlumb,
    getInstance,
    connect,
    deleteConnection,
    deleteEveryConnection,
    repaintEverything,
    remove,
    addToDragSelection,
    clearDragSelection,
    setZoom,
    getZoom,
    getConnections,
  };
}

// Generate unique ID
export function generateNodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate port ID
export function generatePortId(side: 'l' | 'r', nodeId: string, index: number): string {
  return `${side}-${nodeId}-${index}`;
}