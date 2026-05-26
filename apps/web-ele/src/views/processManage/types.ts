/** Visual flow editor type definitions */

export interface ProcessInfo {
  id?: string;
  name?: string;
  code?: string;
  type?: string;
  flow?: Record<string, any>;
  variables?: VariableData[];
  nodeList?: NodeData[];
  [key: string]: any;
}

export interface RunTestNode {
  startNode: string;
  endNode: string;
}

export interface FlowData {
  id: string;
  name: string;
  type?: string;
}

export interface NodeCls {
  color?: string;
  icon?: string;
  linkColor?: string;
  css?: string;
}

export interface PortCls {
  color: string;
  css?: string;
}

export interface PortConfig {
  id: string;
  name: string;
  portType: string;
  title: string;
  dataType: string;
  value?: any;
  visible?: string;
  elementType?: string;
  cls: PortCls;
  [key: string]: any;
}

export interface NodePorts {
  input: PortConfig[];
  output: PortConfig[];
}

export interface DetailPanelConfig {
  common: PanelSection;
  options: PanelSection;
}

export interface PanelSection {
  title: string;
  formDatas: FormDataItem[];
}

export interface FormDataItem {
  name: string;
  title: string;
  elementType: string;
  dataType: string;
  value: any;
  visible?: string;
  choices?: ChoiceItem[];
  scoped?: string;
  [key: string]: any;
}

export interface ChoiceItem {
  text: string;
  value: any;
}

export interface NodeData {
  id: string;
  name: string;
  title?: string;
  nodeType?: string;
  variableId?: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  cls: NodeCls;
  ports: NodePorts;
  detailPanel: DetailPanelConfig;
  [key: string]: any;
}

export interface LinkData {
  id?: string;
  sourceId: string;
  targetId: string;
  sourcePort: string;
  targetPort: string;
  cls?: { linkColor?: string };
  [key: string]: any;
}

export interface VariableData {
  id: string;
  name: string;
  dataType: string;
  value?: any;
  scope?: string;
  visible?: string;
  job_editable?: boolean;
  cuser?: string;
  [key: string]: any;
}

export interface ActiveInfo {
  type: 'node' | 'variable' | null;
  id: string | null;
  data: any;
}

export interface CurrentCoverPort {
  id?: string;
  portId?: string;
  nodeId?: string;
  position?: string;
  isDragging?: boolean;
}

export interface FlowNode {
  id: string;
  name: string;
  title?: string;
  type?: string;
  dataType?: string;
  value?: any;
  visible?: string;
  scoped?: string;
  icon?: string;
  color?: string;
}
