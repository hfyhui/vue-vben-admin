import { proxyClient } from '../request';

export interface CustomerInfo {
  id: string;
  customersName: string;
  customersType: 'COMPANY' | 'ORGANIZATION' | 'PERSONAL';
  customersTypeName: string;
  certificateCode: string;
  unifiedSocialCreditCode: string;
  legalPerson: string;
  legalPersonIdType: null | string;
  legalPersonIdTypeName: string;
  legalPersonIdNumber: string;
  individualBusinessLicenseCode: string;
  personIdType: null | string;
  personIdTypeName: string;
  personIdNumber: null | string;
}

// 查询参数类型
export interface CustomerQueryParams {
  page: number;
  pageSize: number;
  customersName?: string;
  customersType?: string;
}

// 创建/编辑参数类型
export interface CustomerCreateParams {
  customersName: string;
  customersType: 'COMPANY' | 'ORGANIZATION' | 'PERSONAL';
  unifiedSocialCreditCode?: string;
  legalPerson?: string;
  legalPersonIdType?: string;
  legalPersonIdNumber?: string;
  individualBusinessLicenseCode?: string;
  personalIdType?: string;
  personalIdNumber?: string;
  shareholderInfos?: Array<{
    shareholderIdNumber: string;
    shareholderIdType: string;
    shareholderName: string;
  }>;
}

// 通用API响应类型
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// 分页响应类型
export interface PageResponse<T = any> {
  records: T[];
  total: number;
}

export async function getCustomerListApi(params: CustomerQueryParams): Promise<{
  code: number;
  data: {
    data: {
      current: number;
      pages: number;
      records: CustomerInfo[];
      size: number;
      total: number;
    }
  };
  message: string;
}> {
  // 适配参数
  const { page, pageSize, ...rest } = params;
  const reqParams = {
    current: page,
    size: pageSize,
    ...rest,
  };
  return proxyClient.post('/license/customer/page', reqParams);
}

export async function createCustomerApi(
  data: CustomerCreateParams,
): Promise<ApiResponse<CustomerInfo>> {
  return proxyClient.post('/license/customer/save', data);
}

export async function updateCustomerApi(
  id: string,
  data: Partial<CustomerCreateParams>,
): Promise<ApiResponse<CustomerInfo>> {
  return proxyClient.put('/license/customer/update', { id, ...data });
}

export async function deleteCustomerApi(
  id: string,
): Promise<ApiResponse<null>> {
  return proxyClient.delete('/license/customer/delete', {
    data: { ids: [id] },
  });
}

export async function batchDeleteCustomerApi(
  ids: string[],
): Promise<ApiResponse<null>> {
  return proxyClient.delete('/license/customer/delete', {
    data: { ids },
  });
}

export async function getCustomerDetailApi(
  id: string,
): Promise<ApiResponse<{ data: CustomerInfo }>> {
  return proxyClient.get(`/license/customer/${id}`);
}

// 修改接口定义，支持FormData
export async function importCustomerApi(formData: FormData): Promise<ApiResponse<any>> {
  return proxyClient.post('/license/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // 声明为表单数据类型
    },
  });
}