/**
 * Storybook 8 配置 - CommonJS 配置
 * Vite builder + React + TypeScript
 */

const path = require('path');
const tailwindcss = require('@tailwindcss/vite');

const srcPath = path.resolve(__dirname, '../src');

/** @type {import('@storybook/react-vite').StorybookConfig} */
const config = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    config.plugins = config.plugins || [];
    config.plugins.push(tailwindcss.default);
    
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

module.exports = config;