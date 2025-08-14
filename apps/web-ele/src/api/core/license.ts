import { proxyClient } from '../request';

/**
 * 许可证信息接口
 * 字段说明：
 * - customerId: 客户ID
 * - authorizationType: 授权类型 (TRIAL: 试用, OFFICIALLY: 正式)
 * - expirationTimes: 执行时间范围 (格式: ["2025-08-11 00:00:00","2025-08-12 23:59:59"])
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
  expirationTimes?: string[];
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
  expirationTimes?: string[];
}

export interface LicenseCreateParams {
  customerId?: string;
  authorizationType?: 'OFFICIALLY' | 'TRIAL';
  expirationTimes?: string[];
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
  return response.data
}

export async function createLicenseApi(
  data: LicenseCreateParams,
): Promise<LicenseInfo> {
  const response = await proxyClient.post('/license/save', data);
  return response.data 
}

export async function updateLicenseApi(
  id: string,
  data: Partial<LicenseCreateParams>,
): Promise<LicenseInfo> {
  const response = await proxyClient.put(`/license/${id}`, data);
  return response.data 
}

export async function deleteLicenseApi(ids: string | string[]): Promise<void> {
  let response;
  if (Array.isArray(ids)) {
    response = await proxyClient.delete('/license/delete', { data: { ids } });
  } else {
    response = await proxyClient.delete('/license/delete', { data: { ids: [ids] } });
  }
  return response;
}

export async function getLicenseDetailApi(id: string): Promise<LicenseInfo> {
  const response = await proxyClient.get(`/license/${id}`);
  return response.data 
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
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('导入失败');
  }
}

export async function downloadLicenseApi(id: string): Promise<void> {
  try {
    // 使用 request client 的 download 方法
    const blob = await proxyClient.download(`/license/download/${id}`);
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license.lic`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('下载失败:', error);
    throw new Error('下载失败');
  }
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
    return response;
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
export async function getKeyListApi(params: KeyListQueryParams){
  return await proxyClient.post<KeyListResponse>('/license/key/list', params);
}

export async function getCustomerKeys(customerId: string){
  try {
    const response = await getKeyListApi({ customerId: customerId });
    return response.data
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
  return response.data;
}

export async function deleteCustomerKey(keyId: string): Promise<boolean> {
  try {
    const response = await proxyClient.delete(`/license/key/delete`, {
      data: { keyId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getKeyDetail(
  keyId: string,
): Promise<CustomerKey | undefined> {
  try {
    const response = await proxyClient.get(`/license/key/detail/${keyId}`);
    return response.data;
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
    return true;
  } catch {
    return false;
  }
}

// 下载密钥文件
export async function downloadKeyApi(keyId: string): Promise<void> {
  try {
    // 使用 request client 的 download 方法
    const blob = await proxyClient.download(`/license/key/download?keyId=${keyId}`);
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `key.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('密钥下载失败:', error);
    throw new Error('密钥下载失败');
  }

  
}

// 获取产品清单树形结构
export async function getProductTreeApi(): Promise<ProductTreeItem[]> {
  try {
    const response = await proxyClient.get('/license/product/tree');
    return response.data;
  } catch {
    return [];
  }
}

// 同步 SSO 应用
export async function syncSsoAppApi(): Promise<boolean> {
  try {
    await proxyClient.get('/license/sync/app');
    return true;
  } catch {
    return false;
  }
}