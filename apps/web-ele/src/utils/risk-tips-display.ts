import { h } from 'vue';

type ElTagType = 'primary' | 'success' | 'warning' | 'info' | 'danger';
type ElTagEffect = 'light' | 'dark' | 'plain';

/** 文案关键字优先，否则用接口 color（gray/green/yellow/red/black） */
type Tier = 'danger' | 'warning' | 'success' | 'muted' | 'dark' | 'default';

const TIER_COLOR: Record<Tier, string> = {
  danger: 'var(--el-color-danger)',
  warning: 'var(--el-color-warning)',
  success: 'var(--el-color-success)',
  muted: 'var(--el-text-color-placeholder)',
  dark: 'var(--el-text-color-primary)',
  default: 'var(--el-text-color-placeholder)',
};

const TIER_TAG: Record<Tier, { type: ElTagType; effect: ElTagEffect }> = {
  danger: { type: 'danger', effect: 'light' },
  warning: { type: 'warning', effect: 'light' },
  success: { type: 'success', effect: 'light' },
  muted: { type: 'info', effect: 'plain' },
  dark: { type: 'info', effect: 'dark' },
  default: { type: 'info', effect: 'plain' },
};

function tierFromApiColor(color?: string): Tier {
  switch (String(color || '').toLowerCase()) {
    case 'red':
      return 'danger';
    case 'yellow':
      return 'warning';
    case 'green':
      return 'success';
    case 'gray':
      return 'muted';
    case 'black':
      return 'dark';
    default:
      return 'default';
  }
}

function riskTier(row: { riskTips?: string; color?: string }): Tier {
  const t = (row.riskTips ?? '').trim();
  const l = t.toLowerCase();
  if (t) {
    if (t.includes('高风险') || l.includes('high risk')) return 'danger';
    if (
      t.includes('低风险') ||
      l.includes('low risk') ||
      t.includes('中风险') ||
      l.includes('medium risk')
    ) {
      return 'warning';
    }
    if (t.includes('无风险') || l.includes('no risk')) return 'success';
    if (t.includes('未使用') || l.includes('not used')) return 'muted';
    if (t.includes('已禁用') || l.includes('disabled')) return 'dark';
  }
  return tierFromApiColor(row.color);
}

/** VXE 表格：风险提示为着色纯文本 */
export function renderPoolRiskTipsCell(row: {
  riskTips?: string;
  color?: string;
}) {
  const trimmed = (row.riskTips ?? '').trim();
  if (!trimmed) {
    return h(
      'span',
      { style: { color: TIER_COLOR.default } },
      '—',
    );
  }
  const t = riskTier(row);
  return h(
    'span',
    {
      style: {
        color: TIER_COLOR[t],
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      },
      title: trimmed,
    },
    trimmed,
  );
}

/** 模板里若仍用 el-tag，可复用同一套分档 */
export function poolRiskTipsTagProps(row: {
  riskTips?: string;
  color?: string;
}): { type: ElTagType; effect: ElTagEffect } | null {
  if (!(row.riskTips ?? '').trim()) return null;
  return TIER_TAG[riskTier(row)];
}
