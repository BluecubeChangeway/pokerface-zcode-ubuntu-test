/**
 * Storybook 8 配置
 * Vite builder + React + TypeScript
 */

import type { StorybookConfig } from '@storybook/react-vite';

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
    
    // 路径别名
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '/src',
      '@/components': '/src/components',
      '@/theme': '/src/theme',
      '@/hooks': '/src/hooks',
      '@/lib': '/src/lib',
      '@/i18n': '/src/i18n',
      '@/motion': '/src/motion',
      '@/providers': '/src/providers',
    };
    
    return config;
  },
};

export default config;
