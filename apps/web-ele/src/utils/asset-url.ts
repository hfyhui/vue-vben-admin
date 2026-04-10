/**
 * 标准化处理URL地址
 * @param {string} url - 需要处理的原始URL
 * @param {object} [options] - 配置选项
 * @param {string} [options.overrideOrigin] - 强制替换的origin
 * @param {boolean} [options.ssrMode=false] - 是否开启服务端渲染模式
 * @returns {string} 处理后的完整URL
 */
export const formatProcessUrl = (
  url?: string,
  options: { overrideOrigin?: string; ssrMode?: boolean } = {},
) => {
  // 空值处理
  if (!url?.length) return url;

  // 1. Base64数据和Blob URL直接返回
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // 2. 获取当前origin（兼容SSR环境）
  let currentOrigin = '';
  if (!options.ssrMode && typeof window !== 'undefined') {
    currentOrigin = window.location.origin;

    // 开发环境origin映射
    if (window.location.host.includes('localhost')) {
      currentOrigin = 'http://172.25.1.213:8889';
      // currentOrigin = 'https://callfansai.cn:18443';
    }
  }

  // 3. 使用自定义origin优先级最高
  if (options.overrideOrigin) {
    currentOrigin = options.overrideOrigin.endsWith('/')
      ? options.overrideOrigin.slice(0, -1)
      : options.overrideOrigin;
  }

  // 4. 处理合法URL
  try {
    const urlObj = new URL(url);
    return currentOrigin
      ? `${currentOrigin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`
      : url;
  } catch {
    // 非标准URL继续处理
  }

  // 5. 路径标准化处理
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;

  return currentOrigin ? `${currentOrigin}${normalizedPath}` : normalizedPath;
};

/** 图片地址处理（按上面的统一逻辑） */
export const formatAssetImageUrl = (url?: string) => formatProcessUrl(url);
