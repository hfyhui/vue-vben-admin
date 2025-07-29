import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import { h } from 'vue';

import { setupVbenVxeTable, useVbenVxeGrid } from '@vben/plugins/vxe-table';

import { ElButton, ElImage } from 'element-plus';

import { useVbenForm } from './form';

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

    // 自定义渲染器：图片单元格
    // 使用 cellRender: { name: 'CellImage' } 可启用
    vxeUI.renderer.add('CellImage', {
      renderTableDefault(_renderOpts, params) {
        const { column, row } = params;
        const src = row[column.field]; // 获取图片地址
        return h(ElImage, { src, previewSrcList: [src] }); // 渲染图片并支持预览
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
    // 使用 cellRender: { name: 'CellLink' } 可启用
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

    // 可在此扩展更多 vxe-table 的全局配置，比如自定义格式化
    // vxeUI.formats.add
  },
  useVbenForm, // 表单适配
});

// 导出表格 hooks
export { useVbenVxeGrid };

// 导出类型
export type * from '@vben/plugins/vxe-table';
