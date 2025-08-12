import { proxyClient } from '../request';

/**
 * 许可证信息接口
 * 字段说明：
 * - customerId: 客户ID
 * - authorizationType: 授权类型 (TRIAL: 试用, OFFICIALLY: 正式)
 * - expirationTime: 过期时间 (格式: yyyy-MM-dd HH:mm:ss)
 * - features: 授权应用对象
 * - concurrentUsers: 最大并发数量
 * - fingerprintFeature: 指纹特征（文本存储）
 * - remark: 备注
 * - keyId: 密钥ID
 */
export interface LicenseInfo {
  id: string;
  customerId?: string;
  customerName?: string;
  authorizationType?: 'OFFICIALLY' | 'TRIAL';
  expirationTime?: string;
  features?: object;
  concurrentUsers?: number;
  fingerprintFeature?: string;
  remark?: string;
  keyId?: string;
}

export interface LicenseQueryParams {
  page: number;
  pageSize: number;
  optimizeCountSql?: boolean;
  searchCount?: boolean;
  optimizeJoinOfCountSql?: boolean;
  maxLimit?: number;
  countId?: string;
  customerId?: string;
  customerName?: string;
  authorizationType?: 'OFFICIALLY' | 'TRIAL';
  expirationTime?: string;
}

export interface LicenseCreateParams {
  customerId?: string;
  authorizationType?: 'OFFICIALLY' | 'TRIAL';
  expirationTime?: string;
  features?: object;
  concurrentUsers?: number;
  fingerprintFeature?: string;
  remark?: string;
  keyId?: string;
}

export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}
export interface PageResponse<T = any> {
  items: T[];
  total: number;
}

export async function getLicenseListApi(
  params: LicenseQueryParams,
): Promise<{ data: PageResponse<LicenseInfo> }> {
  const response = await proxyClient.post('/license/page', params);
  return response.data;
}

export async function createLicenseApi(
  data: LicenseCreateParams,
): Promise<LicenseInfo> {
  const response = await proxyClient.post('/license/save', data);
  if (response.data && response.data.code === 100000) {
    return response.data.data || response.data;
  } else {
    const errorMsg = response.data?.msg || '创建失败';
    throw new Error(errorMsg);
  }
}

export async function updateLicenseApi(
  id: string,
  data: Partial<LicenseCreateParams>,
): Promise<LicenseInfo> {
  const response = await proxyClient.put(`/license/${id}`, data);
  if (response.data && response.data.code === 100000) {
    return response.data.data || response.data;
  } else {
    const errorMsg = response.data?.msg || '更新失败';
    throw new Error(errorMsg);
  }
}

export async function deleteLicenseApi(ids: string | string[]): Promise<void> {
  let response;
  if (Array.isArray(ids)) {
    response = await proxyClient.delete('/license/delete', { data: { ids } });
  } else {
    response = await proxyClient.delete('/license/delete', { data: { ids: [ids] } });
  }
  if (response.data && response.data.code === 100000) {
    return;
  } else {
    const errorMsg = response.data?.msg || '删除失败';
    throw new Error(errorMsg);
  }
}

export async function getLicenseDetailApi(id: string): Promise<LicenseInfo> {
  const response = await proxyClient.get(`/license/${id}`);

  if (response.data && response.data.code === 100000) {
    return response.data.data || response.data;
  } else {
    const errorMsg = response.data?.msg || '获取详情失败';
    throw new Error(errorMsg);
  }
}

export async function importLicenseApi(file: File): Promise<any> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await proxyClient.post('/license/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (response.data && response.data.code === 100000) {
      return response.data;
    } else {
      const errorMsg = response.data?.msg || '导入失败';
      throw new Error(errorMsg);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('导入失败');
  }
}

export async function downloadLicenseApi(id: string): Promise<void> {
  const response = await proxyClient.get(`/license/download/${id}`, {
    responseType: 'blob',
  });

  // 创建下载链接
  const blob = new Blob([response.data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `license_${id}.lic`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export interface CustomerListQueryParams {
  page?: number;
  pageSize?: number;
  name?: string;
  type?: string;
}
// 查询客户列表接口
export async function getCustomerListApi() {
  try {
    const response = await proxyClient.post('/license/customer/list');
    if (response && response.data.code === 100000) {
      return response.data;
    }
  } catch (error) {
    return [];
  }
}
export interface CustomerKey {
  id?: string;
  customerId?: string;
  customersName?: string;
  name?: string;
  keyRemark?: string;
  publicKey?: string;
  privateKey?: string;
  createdAt?: string;
  customer?: string;
}

// 产品清单树形结构接口
export interface ProductTreeItem {
  menuId: string;
  menuName: string;
  parentId: string;
  hierarchy: number;
  children: ProductTreeItem[];
}
export interface KeyListQueryParams {
  customerId: string;
}
export interface KeyListResponse {
  data: {
    code: number;
    data: CustomerKey[];
  };
  message: string;
}

// 查询密钥列表接口
export async function getKeyListApi(
  params: KeyListQueryParams,
): Promise<KeyListResponse> {
  return await proxyClient.post<KeyListResponse>('/license/key/list', params);
}

export async function getCustomerKeys(
  customerId: string,
): Promise<CustomerKey[]> {
  try {
    const response = await getKeyListApi({ customerId });
    if (response && response.data && response.data.code === 100000) {
      return response.data.data;
    }
    return [];
  } catch {
    return [];
  }
}
// 生成密钥接口参数
export interface GenerateKeyParams {
  customerId?: string;
  keyRemark?: string;
}

export async function createCustomerKey(
  customerId: string,
  keyData: Partial<CustomerKey>,
): Promise<CustomerKey> {
  const params: GenerateKeyParams = {
    customerId: customerId,
    keyRemark: keyData.name || keyData.keyRemark,
  };
  const response = await proxyClient.post('/license/key/generate', params);
  if (response && response.data && response.data.code === 100000) {
    return response.data.data;
  }
  throw new Error('创建密钥失败');
}

export async function deleteCustomerKey(keyId: string): Promise<boolean> {
  try {
    const response = await proxyClient.delete(`/license/key/delete`, {
      data: { keyId },
    });
    if (response && response.data && response.data.code === 100000) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function getKeyDetail(
  keyId: string,
): Promise<CustomerKey | undefined> {
  try {
    const response = await proxyClient.get(`/license/key/detail/${keyId}`);
    if (response && response.data && response.data.code === 100000) {
      return response.data.data;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function switchCustomerKey(
  customerId: string,
  keyId: string,
): Promise<boolean> {
  try {
    const response = await proxyClient.post('/license/key/switch', {
      customerId,
      keyId,
    });
    if (response && response.data && response.data.code === 100000) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// 获取产品清单树形结构
export async function getProductTreeApi(): Promise<ProductTreeItem[]> {
  try {
    const response = await proxyClient.get('/license/product/tree');
    if (response && response.data && response.data.code === 100000) {
      return response.data.data;
    }
    return [];
  } catch {
    return [];
  }
}
// 同步 SSO 应用
export async function syncSsoAppApi(): Promise<boolean> {
  try {
    const response = await proxyClient.get('/license/sync/app');
    if (response && response.data && response.data.code === 100000) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
