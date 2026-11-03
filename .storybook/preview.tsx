/**
 * Storybook 8 预览配置
 * 全局装饰器、参数、参数类型
 */

import type { Preview } from '@storybook/react';
import React from 'react';
import { UIProviders } from '../src/providers/UIProviders';
import '../src/styles/globals.css';

// 全局装饰器：包裹所有故事
const providers = [
  (Story: React.FC) => (
    <UIProviders>
      <div className="p-4 min-h-[200px]">
        <Story />
      </div>
    </UIProviders>
  ),
];

const preview: Preview = {
  decorators: providers,
  
  // 全局参数
  parameters: {
    // 控制面板配置
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true,
      sort: 'requiredFirst',
    },
    
    // 背景配置
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#020617' },
        { name: 'gray', value: '#f1f5f9' },
      ],
    },
    
    // 布局配置
    layout: 'centered',
    
    // a11y 配置
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
    
    // 视图模式
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '800px' },
        },
        wide: {
          name: 'Wide',
          styles: { width: '1920px', height: '1080px' },
        },
      },
    },
    
    // 交互测试
    interactions: {
      // 交互测试配置
    },
    
    // 暗色模式插件
    darkMode: {
      // 由 storybook-dark-mode 插件处理
      darkClass: 'dark',
      lightClass: 'light',
      stylePreview: true,
    },
    
    // 文档配置
    docs: {
      autodocs: true,
      description: {
        component: 'UI 组件库文档',
      },
    },
  },
  
  // 全局参数类型
  argTypes: {
    // 通用参数类型
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'ghost', 'subtle', 'outline'],
      description: '组件变体',
      table: { category: 'Appearance' },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: '组件尺寸',
      table: { category: 'Appearance' },
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
      table: { category: 'State' },
    },
    loading: {
      control: 'boolean',
      description: '加载状态',
      table: { category: 'State' },
    },
    fullWidth: {
      control: 'boolean',
      description: '全宽显示',
      table: { category: 'Layout' },
    },
    // 语义色参数
    color: {
      control: 'color',
      description: '自定义颜色（不建议，优先使用语义色）',
      table: { category: 'Appearance' },
    },
  },
  
  // 全局类型
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'system', title: 'System' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      name: 'Locale',
      description: 'Internationalization locale',
      defaultValue: 'zh-CN',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'zh-CN', title: '中文' },
          { value: 'en-US', title: 'English' },
        ],
        dynamicTitle: true,
      },
    },
    reducedMotion: {
      name: 'Reduced Motion',
      description: 'Disable animations',
      defaultValue: false,
      toolbar: {
        icon: 'pause',
        items: [
          { value: false, title: 'Animations On' },
          { value: true, title: 'Animations Off' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;