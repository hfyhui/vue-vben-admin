import { proxyClient } from '../request';

export interface DictItem {
  code: string;
  name: string;
  value: string;
  children?: DictItem[];
}

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
  data: Record<string, DictDataItem | undefined>;
  msg?: string;
  message?: string;
}

/**
 * 获取所有枚举数据
 */
export async function getDictApi(_keys?: string[]): Promise<DictResponse> {
  return proxyClient.get('/asset/enums');
}
