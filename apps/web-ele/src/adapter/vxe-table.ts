import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import { h } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { $te } from '@vben/locales';
import { setupVbenVxeTable, useVbenVxeGrid } from '@vben/plugins/vxe-table';
import { isFunction, isString } from '@vben/utils';

import { ElButton, ElImage } from 'element-plus';

import { $t } from '#/locales';

import { useVbenForm } from './form';

// 类型定义
type OperationButton = {
  [key: string]: any; // 支持任意额外属性
  code: string;
  disabled?: ((row: any) => boolean) | boolean;
  icon?: string;
  show?: ((row: any) => boolean) | boolean;
  text?: string;
};

type OperationOption = OperationButton | string;

// 预设按钮配置
const PRESET_BUTTONS: Record<string, Partial<OperationButton>> = {
  delete: { type: 'danger', text: $t('common.delete') },
  edit: { text: $t('common.edit') },
  view: { text: $t('common.view') },
  detail: { type: 'warning', text: $t('common.detail') },
  enable: { type: 'success', text: $t('common.enable') },
  disable: { type: 'warning', text: $t('common.disable') },
};

// 对齐方式映射
const ALIGN_MAP: Record<string, string> = {
  center: 'center',
  left: 'start',
  right: 'end',
  default: 'center',
};

// 初始化 vxe-table 的全局配置
setupVbenVxeTable({
  configVxeTable: (vxeUI) => {
    vxeUI.setConfig({
      grid: {
        align: 'center', // 表格内容居中
        border: false, // 不显示边框
        columnConfig: {
          resizable: true, // 列可拖动调整宽度
        },
        minHeight: 180, // 表格最小高度
        formConfig: {
          // 全局禁用 vxe-table 的表单配置，使用自定义 formOptions
          enabled: false,
        },
        proxyConfig: {
          autoLoad: true, // 自动加载数据
          response: {
            result: 'items', // 数据字段名，接口返回的主数据字段
            total: 'total', // 总数字段名
            list: 'items', // 列表字段名
          },
          showActiveMsg: true, // 显示操作提示
          showResponseMsg: false, // 不显示响应提示
        },
        round: true, // 圆角样式
        showOverflow: true, // 内容溢出时显示省略号
        size: 'small', // 表格尺寸
      } as VxeTableGridOptions,
    });

    /**
     * 优化后的图片单元格渲染器 - 支持三种场景
     * 1. 单个 URL 字符串
     * 2. URL 字符串数组
     * 3. 对象数组 [{url: ''}, {url: ''}]
     * 同时修复预览弹出框位置问题
     */
    vxeUI.renderer.add('CellImage', {
      renderTableDefault(_renderOpts, params) {
        const { column, row } = params;
        const fieldValue = row[column.field];

        // 场景1: 单个 URL 字符串
        if (isString(fieldValue)) {
          return renderImageCell([fieldValue]);
        }

        // 场景2: URL 字符串数组
        if (
          Array.isArray(fieldValue) &&
          fieldValue.every((item) => isString(item))
        ) {
          return renderImageCell(fieldValue);
        }

        // 场景3: 对象数组 [{url: ''}, {url: ''}]
        if (
          Array.isArray(fieldValue) &&
          fieldValue.every((item) => item && item.url)
        ) {
          const urls = fieldValue.map((item) => item.url).filter(Boolean);
          return renderImageCell(urls);
        }

        // 其他情况：单个对象 {url: ''}
        if (fieldValue && fieldValue.url) {
          return renderImageCell([fieldValue.url]);
        }

        // 无效数据情况
        return h('span', '--');
      },
    });

    vxeUI.renderer.add('CellVideo', {
      renderTableDefault(_renderOpts, params) {
        const { column, row } = params;
        const src = row[column.field]; // 获取视频地址
        return h('video', {
          src,
          controls: true,
          style: 'max-width: 100px; max-height: 60px;',
        }); // 渲染视频控件
      },
    });

    // 自定义渲染器：链接按钮单元格
    vxeUI.renderer.add('CellLink', {
      renderTableDefault(renderOpts) {
        const { props } = renderOpts;
        return h(
          ElButton,
          { size: 'small', link: true }, // 渲染为链接样式的小按钮
          { default: () => props?.text }, // 按钮文本
        );
      },
    });

    /**
     * 注册表格的操作按钮渲染器
     */
    vxeUI.renderer.add('CellOperation', {
      renderTableDefault({ attrs, options, props }, { column, row }) {
        // 1. 对齐方式处理
        const align = ALIGN_MAP[column.align] || ALIGN_MAP.default;

        // 2. 获取事件处理函数（支持两种位置）
        const onClick = attrs?.onClick || props?.onClick;

        // 3. 按钮配置标准化
        const buttonOptions = (options || []).map((opt) =>
          normalizeOption(opt, attrs),
        );

        // 4. 生成操作按钮
        const operations = buttonOptions
          .map((opt) => resolveButtonProps(opt, row))
          .filter((opt) => opt.show !== false);

        // 5. 渲染按钮组
        return renderButtonGroup(operations, align, props, row, onClick);
      },
    });

    // 可在此扩展更多 vxe-table 的全局配置
  },
  useVbenForm, // 表单适配
});

/** 渲染图片单元格 - 修复预览位置问题 */
function renderImageCell(urls: string[]) {
  // 如果没有有效图片，显示占位符
  if (!urls || urls.every((url) => !url)) {
    return h('span', '--');
  }

  // 只显示第一张图片作为缩略图
  const firstImage = urls[0];

  // 创建图片组件 - 添加 preview-teleported 解决预览位置问题
  return h(ElImage, {
    src: firstImage,
    style: 'width: 60px; height: 60px;',
    previewSrcList: urls,
    hideOnClickModal: true,
    previewTeleported: true, // 关键：预览层挂载到 body
    showProgress: true, // 是否在预览图片时显示进度条
  });
}

/** 标准化按钮配置 - 支持全局属性继承 */
function normalizeOption(opt: OperationOption, attrs: any): OperationButton {
  // 字符串简写形式
  if (typeof opt === 'string') {
    return PRESET_BUTTONS[opt]
      ? { code: opt, link: true, type: 'primary', ...PRESET_BUTTONS[opt] }
      : {
          code: opt,
          link: true,
          type: 'primary',
          text: $te(`common.${opt}`) ? $t(`common.${opt}`) : opt,
        };
  }

  // 对象形式 - 合并全局属性
  return {
    link: true,
    type: 'primary',
    // 继承全局属性（如 nameField）
    ...attrs,
    // 合并预设配置
    ...PRESET_BUTTONS[opt.code],
    // 当前按钮配置
    ...opt,
  };
}

/** 解析动态属性 */
function resolveButtonProps(opt: OperationButton, row: any): OperationButton {
  const resolved: OperationButton = { ...opt };

  // 动态处理所有函数类型属性
  Object.keys(opt).forEach((key) => {
    if (isFunction(opt[key])) {
      // 特殊处理 disabled 属性，确保返回布尔值
      resolved[key] = key === 'disabled' ? !!opt[key](row) : opt[key](row);
    }
  });

  return resolved;
}

/** 渲染按钮组 */
function renderButtonGroup(
  operations: OperationButton[],
  align: string,
  globalProps: any,
  row: any,
  onClick?: (ctx: { code: string; row: any }) => void,
) {
  return h(
    'div',
    {
      class: 'flex table-operations',
      style: { justifyContent: align },
    },
    operations.map((opt) => renderButton(opt, globalProps, row, onClick)),
  );
}

/** 渲染单个按钮 */
function renderButton(
  opt: OperationButton,
  globalProps: any,
  row: any,
  onClick?: (ctx: { code: string; row: any }) => void,
) {
  const { icon, text, code, disabled, ...buttonProps } = opt;

  // 确保 disabled 是布尔值
  const isDisabled = disabled === true;

  // 合并全局属性
  const mergedProps = {
    size: 'small',
    link: true,
    ...globalProps,
    ...buttonProps,
    disabled: isDisabled,
    onClick: isDisabled ? undefined : () => onClick?.({ code, row }),
  };

  return h(ElButton, mergedProps, {
    default: () => [
      icon && h(IconifyIcon, { class: 'size-5', icon }),
      text && h('span', text),
    ],
  });
}

// 导出表格 hooks
export { useVbenVxeGrid };

// 导出类型
export type * from '@vben/plugins/vxe-table';
