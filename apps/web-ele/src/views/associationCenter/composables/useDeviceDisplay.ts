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

