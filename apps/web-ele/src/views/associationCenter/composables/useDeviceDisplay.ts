import type { DeviceItem } from '#/api/core/asset';

/** 平台图标标签 */
export function getPlatformIconLabel(platform?: string): string {
  if (!platform) return '';
  const name = platform.toLowerCase();
  if (name.includes('抖音') || name.includes('douyin')) return '抖';
  if (name.includes('快手') || name.includes('kuaishou')) return '快';
  if (name.includes('小红书') || name.includes('xhs')) return '书';
  return platform.slice(0, 1);
}

/** 平台图标背景样式（与账号看板卡片一致） */
export function getPlatformIconStyle(platform?: string): Record<string, string> {
  const name = (platform || '').toLowerCase();
  if (name.includes('抖音') || name.includes('douyin')) {
    return { background: 'linear-gradient(135deg, #ff2442 0%, #ff6b6b 100%)' };
  }
  if (name.includes('快手') || name.includes('kuaishou')) {
    return { background: 'linear-gradient(135deg, #ff6600 0%, #ff9933 100%)' };
  }
  if (name.includes('小红书') || name.includes('xhs')) {
    return { background: 'linear-gradient(135deg, #ff2442 0%, #ff6b6b 100%)' };
  }
  return { background: 'linear-gradient(135deg, #409eff 0%, #79bbff 100%)' };
}

/** 状态颜色映射 */
export function getStatusColor(color?: string): string {
  const colorMap: Record<string, string> = {
    gray: 'gray',
    green: 'green',
    yellow: 'yellow',
    orange: 'orange',
    red: 'red',
    black: 'black',
  };
  return colorMap[color?.toLowerCase() ?? ''] ?? 'gray';
}

/** 解析账号显示：account 可能是逗号分隔的平台/账号列表 */
export function parseAccountList(
  account?: string,
): Array<{ platform?: string; id?: string }> {
  if (!account) return [];
  const parts = account.trim().split(/[,，、]/).filter(Boolean);
  return parts.map((p) => {
    const trimmed = p.trim();
    const match = trimmed.match(/^(\d+)$/);
    if (match) return { id: match[1] };
    return { platform: trimmed };
  });
}

/** 设备版本显示：优先 romVersion，或组合 phoneBrand */
export function getDeviceVersion(item: DeviceItem): string {
  return item.romVersion || item.phoneBrand || item.phoneModel || '-';
}

/** 代理 IP / 次要 IP：server 为所属服务器 */
export function getProxyIp(item: DeviceItem): string {
  return item.server || '-';
}
