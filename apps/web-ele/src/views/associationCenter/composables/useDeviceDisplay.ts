import type { DeviceItem } from '#/api/core/asset';

/** 设备版本显示：优先 romVersion，或组合 phoneBrand */
export function getDeviceVersion(item: DeviceItem): string {
  return item.deviceVersion
}

/** 代理 IP：优先 proxyIp，其次 connIp/server */
export function getProxyIp(item: DeviceItem): string {
  return item.proxyIp
}

/**
 * 是否展示「网络代理」解绑按钮：与列表/解绑接口一致。
 * - 禁止仅 `fromServer === false` 的本地拖拽绑定；
 * - 不再使用 `fromServer === true`，避免接口返回 1 / 省略字段时误隐藏；
 * - 统一按 `proxyIp`（兼容 boundProxies.ip）判断是否具备可解绑代理。
 */
/** 列表接口 `isLock === true` 时：看板置灰且不可点击、不可拖拽绑定 */
export function isDeviceLocked(item: DeviceItem): boolean {
  return (item as Record<string, unknown>).isLock === true;
}

function pickNonEmptyStr(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number' && !Number.isNaN(v)) {
    if (v === 1) return '已启用';
    if (v === 0) return '未启用';
    return String(v);
  }
  const s = String(v).trim();
  return s;
}

/** 代理连通/检测状态：设备字段或 boundProxies[0]（兼容 camelCase / snake_case / 数字枚举） */
export function getProxyStatus(item: DeviceItem): string {
  const r = item as Record<string, unknown>;

  const fromDevice =
    pickNonEmptyStr(r.proxyStatus) ||
    pickNonEmptyStr(r.proxy_status) ||
    pickNonEmptyStr((r as Record<string, unknown>).ProxyStatus);
  if (fromDevice) return fromDevice;

  const bound = (item.boundProxies as Array<Record<string, unknown>> | undefined)?.[0];
  if (bound) {
    const fromBound =
      pickNonEmptyStr(bound.proxyStatus) ||
      pickNonEmptyStr(bound.proxy_status) ||
      pickNonEmptyStr((bound as Record<string, unknown>).ProxyStatus) ||
      pickNonEmptyStr(bound.status);
    if (fromBound) return fromBound;
  }
  return '';
}

/** 根据 `proxyStatus` 文案解析是否已启用代理（用于看板对勾/叉） */
export function getProxyEnabledState(
  item: DeviceItem,
): 'on' | 'off' | null {
  const raw = getProxyStatus(item);
  if (!raw) return null;
  /* 简体中文 + 繁体（启用/开启 等异形字）；后端按语言返回时简体正则不匹配会变 null，IP 将显示为正文色 */
  if (/未启用|未啟用|未开启/.test(raw)) return 'off';
  if (/已启用|已啟用|已开启/.test(raw)) return 'on';
  const s = raw.trim().toLowerCase();
  if (
    s === '0' ||
    s === 'false' ||
    s === 'off' ||
    s === 'disabled' ||
    s === 'no'
  ) {
    return 'off';
  }
  if (
    s === '1' ||
    s === 'true' ||
    s === 'on' ||
    s === 'enabled' ||
    s === 'yes'
  ) {
    return 'on';
  }
  return null;
}

export function canUnbindDeviceProxy(item: DeviceItem): boolean {
  const r = item as Record<string, unknown>;
  const boundProxy = (
    item.boundProxies as
      | Array<{ fromServer?: boolean; proxyIp?: string; ip?: string }>
      | undefined
  )?.[0];
  if (boundProxy) {
    if (boundProxy.fromServer === false) return false;
    return Boolean(boundProxy.proxyIp || boundProxy.ip);
  }
  const proxyIp = r.proxyIp;
  return Boolean(proxyIp);
}

