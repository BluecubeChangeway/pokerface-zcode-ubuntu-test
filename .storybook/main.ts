/**
 * Storybook 8 配置
 * Vite builder + React + TypeScript
 */

import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    'storybook-dark-mode',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    // Tailwind CSS v4 集成
    const { default: tailwindcss } = await import('@tailwindcss/vite');
    config.plugins = config.plugins || [];
    config.plugins.push(tailwindcss());
    
    // 路径别名 - 使用相对路径解析，兼容 GitHub Actions 环境
    const srcPath = path.resolve(__dirname, '../src');
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': srcPath,
      '@/components': path.join(srcPath, 'components'),
      '@/theme': path.join(srcPath, 'theme'),
      '@/hooks': path.join(srcPath, 'hooks'),
      '@/lib': path.join(srcPath, 'lib'),
      '@/i18n': path.join(srcPath, 'i18n'),
      '@/motion': path.join(srcPath, 'motion'),
      '@/providers': path.join(srcPath, 'providers'),
    };
    
    return config;
  },
};

export default config;
