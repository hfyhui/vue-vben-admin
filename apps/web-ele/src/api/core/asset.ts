import { proxyClient } from '../request';

/** 设备资产项，与接口 POST /asset/device/page 返回的 records 结构一致 */
export interface DeviceItem {
  server?: string;
  inputTime?: string;
  chip?: string;
  deviceIp?: string;
  romVersion?: string;
  phoneBrand?: string;
  phoneModel?: string;
  operator?: string;
  phoneNumber?: string;
  deviceGroup?: string;
  remark?: string;
  account?: string;
  proxy?: string;
  deviceStatus?: string;
  color?: string;
  [key: string]: any;
}

export interface PageQuery {
  current?: number;
  size?: number;
  [key: string]: any;
}

export interface PageResult<T = any> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

export async function getAccountAssetPageApi<T = any>(
  params: PageQuery,
): Promise<PageResult<T>> {
  // 目前后端接口未发布，先使用前端模拟数据
  const { current = 1, size = 20, accountName } = params;

  const platforms = ['小红书', '抖音', '快手'];
  const colors = ['gray', 'green', 'yellow', 'red', 'black'] as const;
  const accountNames = [
    'Callfans',
    '一幕小栀子',
    'INBOX',
    '出差假期',
    '夏日限定',
    '秋日私语',
    '冬日暖阳',
    '春日来信',
    '星辰大海',
    '云端漫步',
  ];

  const allMockRecords = Array.from({ length: 102 }).map((_, index) => {
    const id = index + 1;
    const accountId = String(8521564000 + id * 123456).slice(0, 11);
    const account = accountNames[id % accountNames.length];
    const platform = platforms[id % platforms.length];
    const color = colors[id % colors.length];
    return {
      accountId,
      account,
      userAccount: account,
      platform,
      color,
      riskTips: color === 'red' ? '触犯风险操作' : undefined,
      accountGroup: `S1B${(id % 4) + 1}`,
      proxy: `61.170.${(id % 250) + 1}.${(id % 255) + 1}`,
      inputTime: '2026-03-16 12:00:00',
      remark: '',
    };
  });

  let filteredRecords = allMockRecords;
  if (accountName && typeof accountName === 'string') {
    const keyword = accountName.toLowerCase();
    filteredRecords = allMockRecords.filter(
      (r) =>
        (r.account || '').toLowerCase().includes(keyword) ||
        (r.accountId || '').includes(keyword),
    );
  }

  const start = (current - 1) * size;
  const end = start + size;
  const pageRecords = filteredRecords.slice(start, end);

  return {
    records: pageRecords as T[],
    total: filteredRecords.length,
    size,
    current,
  };
}

export async function getProxyAssetPageApi<T = any>(
  params: PageQuery,
): Promise<PageResult<T>> {
  // 目前后端接口未完成，先使用前端模拟数据，字段与 POST /asset/proxy/page 返回一致
  const { current = 1, size = 20, area, proxy, groupId } = params;

  const areas = ['重庆', '北京', '上海', '广州'];
  const colors = ['gray', 'green', 'yellow', 'red', 'black'] as const;
  const amounts = [29, 180, 0, 7, 15, 88, 66];

  const allMockRecords = Array.from({ length: 120 }).map((_, index) => {
    const id = index + 1;
    const a = areas[id % areas.length];
    const ip = `61.170.${(id % 250) + 1}.${(id % 255) + 1}`;
    const color = colors[id % colors.length];
    const amount = amounts[id % amounts.length];
    return {
      id: `proxy-${id}`,
      area: a,
      ip,
      proxy: `${ip}:${8000 + (id % 100)}`,
      proxyGroup: `S1B${(id % 4) + 1}`,
      surplusDays: String(id % 100),
      bandingCount: id % 6,
      color,
      riskTips: color === 'red' ? '风险提示' : undefined,
      amount, // 展示用金额（元）， mock
      inputTime: '2026-03-16 12:00:00',
    };
  });

  let filteredRecords = allMockRecords;
  if (area && typeof area === 'string') {
    filteredRecords = filteredRecords.filter((r) => (r as any).area === area);
  }
  if (proxy && typeof proxy === 'string') {
    const kw = proxy.toLowerCase();
    filteredRecords = filteredRecords.filter(
      (r) =>
        ((r as any).proxy || '').toLowerCase().includes(kw) ||
        ((r as any).ip || '').includes(kw),
    );
  }
  if (groupId && Array.isArray(groupId) && groupId.length) {
    filteredRecords = filteredRecords.filter((r) =>
      groupId.includes((r as any).proxyGroup),
    );
  }
  if (groupId && typeof groupId === 'string') {
    filteredRecords = filteredRecords.filter(
      (r) => (r as any).proxyGroup === groupId,
    );
  }

  const start = (current - 1) * size;
  const end = start + size;
  const pageRecords = filteredRecords.slice(start, end);

  return {
    records: pageRecords as T[],
    total: filteredRecords.length,
    size,
    current,
  };
}

/** 获取容器资产分页信息 POST /asset/device/page */
export async function getDeviceAssetPageApi<T = DeviceItem>(
  params: PageQuery,
): Promise<PageResult<T>> {
  const reqParams = {
    current: params.current ?? 1,
    size: params.size ?? 20,
    screening: params.screening,
    search: params.search,
    groupId: params.groupId,
    sort: params.sort,
  };
  const response = await proxyClient.post<PageResult<T>>(
    '/asset/device/page',
    reqParams,
  );
  const data = response?.data ?? response;
  if (data && typeof data === 'object' && 'records' in data) {
    return {
      records: (data.records ?? []) as T[],
      total: data.total ?? 0,
      size: data.size ?? reqParams.size,
      current: data.current ?? reqParams.current,
    };
  }
  return {
    records: [],
    total: 0,
    size: reqParams.size,
    current: reqParams.current,
  };
}

