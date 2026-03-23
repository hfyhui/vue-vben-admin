import type { DeviceItem } from '#/api/core/asset';

/** 设备版本显示：优先 romVersion，或组合 phoneBrand */
export function getDeviceVersion(item: DeviceItem): string {
  return item.deviceVersion
}

/** 代理 IP：优先 proxyIp，其次 connIp/server */
export function getProxyIp(item: DeviceItem): string {
  return item.proxyIp
}
