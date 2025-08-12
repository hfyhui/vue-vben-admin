import { proxyClient } from '../request';

export interface DictItem {
  code: string;
  name: string;
  value: string;
  children?: DictItem[];
}

// 根据实际数据结构定义
export interface DictDataItem {
  name: string;
  content: string;
  group: string;
  groupContent: string;
  layer: number;
  level: number;
  mark: string;
  children?: DictDataItem[];
}

export interface DictResponse {
  code: number;
  data: {
    data: Record<string, DictDataItem | undefined>;
  };
  message: string;
}

/**
 * 获取所有字典数据
 */
export async function getDictApi(): Promise<DictResponse> {
  return proxyClient.get('/dict/pull-array');
}
