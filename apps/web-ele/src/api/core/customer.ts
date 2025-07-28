// 客户相关类型和接口全部维护在本文件

// 客户信息类型
export interface CustomerInfo {
  id: string;
  name: string;
  type: 'company' | 'org' | 'person';
  creditCode: string;
  legalName: string;
  legalIdType: string;
  legalIdNo: string;
}

// 查询参数类型
export interface CustomerQueryParams {
  page: number;
  pageSize: number;
  name?: string;
  type?: string;
}

// 创建/编辑参数类型
export interface CustomerCreateParams {
  name: string;
  type: 'company' | 'org' | 'person';
  creditCode: string;
  legalName: string;
  legalIdType: string;
  legalIdNo: string;
}

// 通用API响应类型
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// 分页响应类型
export interface PageResponse<T = any> {
  items: T[];
  total: number;
}

const MOCK_CUSTOMER_DATA: CustomerInfo[] = Array.from({ length: 20 }).map(
  (_, i) => {
    // 用变量存储根据i%3计算出的结果
    let legalName, name, type;
    if (i % 3 === 0) {
      name = '张三公司';
      type = 'company';
      legalName = '张三';
    } else if (i % 3 === 1) {
      name = '李四';
      type = 'org';
      legalName = '李四';
    } else {
      name = '王五';
      type = 'person';
      legalName = '王五';
    }

    return {
      id: (i + 1).toString(),
      name, // 使用上面定义的变量
      type,
      creditCode: i % 3 === 0 ? '91310000MA1K4XXXX' : '', // 这行是单三元表达式，无嵌套，无需修改
      legalName,
      legalIdType: '身份证',
      legalIdNo: `31010119900101${String(i).padStart(4, '0')}`,
    };
  },
);

function sleep(time = 400) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export async function getCustomerListApi(
  params: CustomerQueryParams,
): Promise<ApiResponse<PageResponse<CustomerInfo>>> {
  await sleep();
  const filtered = MOCK_CUSTOMER_DATA.filter((item) => {
    const matchName = !params.name || item.name.includes(params.name);
    const matchType = !params.type || item.type === params.type;
    return matchName && matchType;
  });
  const total = filtered.length;
  const items = filtered.slice(
    (params.page - 1) * params.pageSize,
    params.page * params.pageSize,
  );
  return {
    code: 0,
    data: { items, total },
    message: 'success',
  };
}

export async function createCustomerApi(
  data: CustomerCreateParams,
): Promise<ApiResponse<CustomerInfo>> {
  await sleep();
  const newCustomer: CustomerInfo = {
    id: Date.now().toString(),
    ...data,
  };
  MOCK_CUSTOMER_DATA.unshift(newCustomer);
  return {
    code: 0,
    data: newCustomer,
    message: '创建成功',
  };
}

export async function updateCustomerApi(
  id: string,
  data: Partial<CustomerCreateParams>,
): Promise<ApiResponse<CustomerInfo>> {
  await sleep();
  const idx = MOCK_CUSTOMER_DATA.findIndex((item) => item.id === id);
  if (idx === -1) {
    return { code: 404, data: {} as CustomerInfo, message: '未找到客户' };
  }
  MOCK_CUSTOMER_DATA[idx] = { ...MOCK_CUSTOMER_DATA[idx], ...data };
  return {
    code: 0,
    data: MOCK_CUSTOMER_DATA[idx],
    message: '更新成功',
  };
}

export async function deleteCustomerApi(
  id: string,
): Promise<ApiResponse<null>> {
  await sleep();
  const idx = MOCK_CUSTOMER_DATA.findIndex((item) => item.id === id);
  if (idx === -1) {
    return { code: 404, data: null, message: '未找到客户' };
  }
  MOCK_CUSTOMER_DATA.splice(idx, 1);
  return { code: 0, data: null, message: '删除成功' };
}

export async function batchDeleteCustomerApi(
  ids: string[],
): Promise<ApiResponse<null>> {
  await sleep();
  let count = 0;
  for (const id of ids) {
    const idx = MOCK_CUSTOMER_DATA.findIndex((item) => item.id === id);
    if (idx !== -1) {
      MOCK_CUSTOMER_DATA.splice(idx, 1);
      count++;
    }
  }
  return { code: 0, data: null, message: `成功删除${count}条` };
}

export async function getCustomerDetailApi(
  id: string,
): Promise<ApiResponse<CustomerInfo>> {
  await sleep();
  const customer = MOCK_CUSTOMER_DATA.find((item) => item.id === id);
  if (!customer) {
    return { code: 404, data: {} as CustomerInfo, message: '未找到客户' };
  }
  return { code: 0, data: customer, message: 'success' };
}
