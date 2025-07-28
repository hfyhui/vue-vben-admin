// license.ts 假数据和接口模板，所有类型和接口都在本文件内

export interface LicenseInfo {
  id: string;
  customer: string;
  apps: string[];
  licenseType: 'official' | 'trial';
  expireTime: string;
  maxUsers: number;
  licenseKey: string;
  fingerprint: string;
  remark: string;
}

export interface LicenseQueryParams {
  page: number;
  pageSize: number;
  customer?: string;
  licenseType?: string;
}

export interface LicenseCreateParams {
  customer: string;
  apps: string[];
  licenseType: 'official' | 'trial';
  expireTime: string;
  maxUsers: number;
  licenseKey: string;
  fingerprint: string;
  remark: string;
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

const MOCK_LICENSE_DATA: LicenseInfo[] = [
  {
    id: '1',
    customer: 'a',
    apps: ['local', 'local-1', 'cloud', 'cloud-1'],
    licenseType: 'trial',
    expireTime: '2025-12-30 23:59:59',
    maxUsers: 10,
    licenseKey: 'TRIAL-123456',
    fingerprint: 'trial-fingerprint-001',
    remark: '试用license',
  },
  {
    id: '2',
    customer: 'b',
    apps: ['cloud', 'cloud-2', 'seo'],
    licenseType: 'official',
    expireTime: '2026-12-30 23:59:59',
    maxUsers: 20,
    licenseKey: 'OFFICIAL-654321',
    fingerprint: 'official-fingerprint-002',
    remark: '正式license',
  },
];

function sleep(time = 400) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export async function getLicenseListApi(
  params: LicenseQueryParams,
): Promise<ApiResponse<PageResponse<LicenseInfo>>> {
  await sleep();
  const filtered = MOCK_LICENSE_DATA.filter((item) => {
    const matchCustomer = !params.customer || item.customer === params.customer;
    const matchType =
      !params.licenseType || item.licenseType === params.licenseType;
    return matchCustomer && matchType;
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

export async function createLicenseApi(
  data: LicenseCreateParams,
): Promise<ApiResponse<LicenseInfo>> {
  await sleep();
  const newLicense: LicenseInfo = {
    id: Date.now().toString(),
    ...data,
  };
  MOCK_LICENSE_DATA.unshift(newLicense);
  return {
    code: 0,
    data: newLicense,
    message: '创建成功',
  };
}

export async function updateLicenseApi(
  id: string,
  data: Partial<LicenseCreateParams>,
): Promise<ApiResponse<LicenseInfo>> {
  await sleep();
  const idx = MOCK_LICENSE_DATA.findIndex((item) => item.id === id);
  if (idx === -1) {
    return { code: 404, data: {} as LicenseInfo, message: '未找到license' };
  }
  // 合并时保证所有必填字段不为undefined
  const old = MOCK_LICENSE_DATA[idx];
  if (!old) {
    return { code: 404, data: {} as LicenseInfo, message: '未找到license' };
  }
  MOCK_LICENSE_DATA[idx] = {
    id: old.id,
    customer: data.customer ?? old.customer,
    apps: data.apps ?? old.apps,
    licenseType: data.licenseType ?? old.licenseType,
    expireTime: data.expireTime ?? old.expireTime,
    maxUsers: typeof data.maxUsers === 'number' ? data.maxUsers : old.maxUsers,
    licenseKey: data.licenseKey ?? old.licenseKey,
    fingerprint: data.fingerprint ?? old.fingerprint,
    remark: data.remark ?? old.remark,
  };
  return {
    code: 0,
    data: MOCK_LICENSE_DATA[idx],
    message: '更新成功',
  };
}

export async function deleteLicenseApi(id: string): Promise<ApiResponse<null>> {
  await sleep();
  const idx = MOCK_LICENSE_DATA.findIndex((item) => item.id === id);
  if (idx === -1) {
    return { code: 404, data: null, message: '未找到license' };
  }
  MOCK_LICENSE_DATA.splice(idx, 1);
  return { code: 0, data: null, message: '删除成功' };
}

export async function batchDeleteLicenseApi(
  ids: string[],
): Promise<ApiResponse<null>> {
  await sleep();
  let count = 0;
  for (const id of ids) {
    const idx = MOCK_LICENSE_DATA.findIndex((item) => item.id === id);
    if (idx !== -1) {
      MOCK_LICENSE_DATA.splice(idx, 1);
      count++;
    }
  }
  return { code: 0, data: null, message: `成功删除${count}条` };
}

export async function getLicenseDetailApi(
  id: string,
): Promise<ApiResponse<LicenseInfo>> {
  await sleep();
  const license = MOCK_LICENSE_DATA.find((item) => item.id === id);
  if (!license) {
    return { code: 404, data: {} as LicenseInfo, message: '未找到license' };
  }
  return { code: 0, data: { ...license }, message: 'success' };
}

export async function importLicenseApi(
  file: File,
): Promise<ApiResponse<LicenseInfo>> {
  await sleep();
  try {
    const content = await file.text();
    const licenseData = JSON.parse(content);
    if (!licenseData.customer || !licenseData.licenseType) {
      return {
        code: 400,
        data: {} as LicenseInfo,
        message: '无效的license文件格式',
      };
    }
    const newLicense: LicenseInfo = {
      id: Date.now().toString(),
      customer: licenseData.customer,
      apps: Array.isArray(licenseData.apps) ? licenseData.apps : [],
      licenseType: licenseData.licenseType,
      expireTime: licenseData.expireTime,
      maxUsers:
        typeof licenseData.maxUsers === 'number' ? licenseData.maxUsers : 10,
      licenseKey: licenseData.licenseKey || '',
      fingerprint: licenseData.fingerprint || '',
      remark: licenseData.remark || '',
    };
    MOCK_LICENSE_DATA.unshift(newLicense);
    return {
      code: 0,
      data: newLicense,
      message: '导入成功',
    };
  } catch {
    return {
      code: 400,
      data: {} as LicenseInfo,
      message: '解析license文件失败',
    };
  }
}

export async function downloadLicenseApi(
  id: string,
): Promise<ApiResponse<null>> {
  await sleep();
  const license = MOCK_LICENSE_DATA.find((item) => item.id === id);
  if (!license) {
    return { code: 404, data: null, message: '未找到license' };
  }
  const blob = new Blob([JSON.stringify(license, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `license_${license.customer}_${license.id}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { code: 0, data: null, message: '下载成功' };
}
