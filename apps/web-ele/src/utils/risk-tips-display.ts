import { h } from 'vue';

import { ElTag } from 'element-plus';

type ElTagType = 'primary' | 'success' | 'warning' | 'info' | 'danger';
type ElTagEffect = 'light' | 'dark' | 'plain';

type TagOpts = { type: ElTagType; effect?: ElTagEffect };

/** 与关联中心色条一致：接口 color 为 gray | green | yellow | red | black */
function tagOptsFromApiColor(color?: string): TagOpts | null {
  const key = String(color || '').toLowerCase();
  const map: Record<string, TagOpts> = {
    gray: { type: 'info', effect: 'plain' },
    green: { type: 'success', effect: 'light' },
    yellow: { type: 'warning', effect: 'light' },
    red: { type: 'danger', effect: 'light' },
    black: { type: 'info', effect: 'dark' },
  };
  return map[key] ?? null;
}

/**
 * 风险提示展示名与颜色（与产品枚举一致）：
 * 高风险→红、无风险→绿、低风险→橙/黄、未使用→浅灰、已禁用→深灰
 * 优先按文案匹配；未命中再回退接口 color（gray/green/yellow/red/black）
 */
function tagOptsFromRiskTipsText(text: string): TagOpts | null {
  const t = text.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  // 含「风险」的需先匹配高/低，再匹配无风险，避免误伤
  if (t.includes('高风险') || lower.includes('high risk')) {
    return { type: 'danger', effect: 'light' };
  }
  if (t.includes('低风险') || lower.includes('low risk')) {
    return { type: 'warning', effect: 'light' };
  }
  if (t.includes('中风险') || lower.includes('medium risk')) {
    return { type: 'warning', effect: 'light' };
  }
  if (t.includes('无风险') || lower.includes('no risk')) {
    return { type: 'success', effect: 'light' };
  }
  if (t.includes('未使用') || lower.includes('not used')) {
    return { type: 'info', effect: 'plain' };
  }
  if (t.includes('已禁用') || lower.includes('disabled')) {
    return { type: 'info', effect: 'dark' };
  }
  return null;
}

function resolveTagOpts(row: { riskTips?: string; color?: string }): TagOpts {
  const text = (row.riskTips ?? '').trim();
  const fromText = text ? tagOptsFromRiskTipsText(text) : null;
  if (fromText) return fromText;
  return (
    tagOptsFromApiColor(row.color) ?? {
      type: 'info',
      effect: 'plain',
    }
  );
}

/** VXE 等表格列 slots：风险提示用标签展示 */
export function renderPoolRiskTipsCell(row: {
  riskTips?: string;
  color?: string;
}) {
  const text = row.riskTips ?? '';
  const trimmed = text.trim();
  if (!trimmed) {
    return h(
      'span',
      { style: { color: 'var(--el-text-color-placeholder)' } },
      '—',
    );
  }
  const opts = resolveTagOpts(row);
  return h(
    ElTag,
    {
      type: opts.type,
      effect: opts.effect ?? 'light',
      size: 'small',
      title: trimmed,
    },
    () => trimmed,
  );
}

/** 模板中绑定 el-tag（不含文案插槽） */
export function poolRiskTipsTagProps(row: {
  riskTips?: string;
  color?: string;
}): { type: ElTagType; effect: ElTagEffect } | null {
  const trimmed = (row.riskTips ?? '').trim();
  if (!trimmed) return null;
  const opts = resolveTagOpts(row);
  return {
    type: opts.type,
    effect: (opts.effect ?? 'light') as ElTagEffect,
  };
}
