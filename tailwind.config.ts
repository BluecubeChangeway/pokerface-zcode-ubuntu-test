/**
 * Tailwind CSS v4 配置
 * 基于 Design Tokens 单一事实来源
 * 支持：CSS Variables 主题切换、Radix UI 兼容、自定义工具类
 */

import type { Config } from 'tailwindcss';
import { designTokens } from './tokens';

const { colors, spacing, fontFamily, fontSize, fontWeight, borderRadius, boxShadow, breakpoints, motion } = designTokens;

export default {
  // 核心内容扫描路径
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    './stories/**/*.{ts,tsx,js,jsx}',
  ],

  // 暗色模式策略：class 策略（由 ThemeProvider 控制 data-theme 属性）
  darkMode: 'class',

  // 主题扩展：直接映射 Design Tokens
  theme: {
    extend: {
      // === 颜色系统 ===
      colors: {
        // 语义色（组件级直接使用，随主题自动切换）
        // 这些将在 globals.css 中通过 CSS Variables 定义
        // 这里只做 Tailwind 工具类映射
        
        // 品牌色
        brand: {
          50: colors.blue[50],
          100: colors.blue[100],
          200: colors.blue[200],
          300: colors.blue[300],
          400: colors.blue[400],
          500: colors.blue[500],
          600: colors.blue[600],
          700: colors.blue[700],
          800: colors.blue[800],
          900: colors.blue[900],
          950: colors.blue[950],
        },
        // 语义色别名（供组件直接使用 bg-primary 等）
        primary: {
          50: colors.blue[50],
          100: colors.blue[100],
          200: colors.blue[200],
          300: colors.blue[300],
          400: colors.blue[400],
          500: colors.blue[500],
          600: colors.blue[600],
          700: colors.blue[700],
          800: colors.blue[800],
          900: colors.blue[900],
          950: colors.blue[950],
          DEFAULT: colors.blue[600],
          foreground: '#ffffff',
        },
        secondary: {
          50: colors.slate[50],
          100: colors.slate[100],
          200: colors.slate[200],
          300: colors.slate[300],
          400: colors.slate[400],
          500: colors.slate[500],
          600: colors.slate[600],
          700: colors.slate[700],
          800: colors.slate[800],
          900: colors.slate[900],
          950: colors.slate[950],
          DEFAULT: colors.slate[600],
          foreground: colors.slate[900],
        },
        success: {
          50: colors.green[50],
          100: colors.green[100],
          200: colors.green[200],
          300: colors.green[300],
          400: colors.green[400],
          500: colors.green[500],
          600: colors.green[600],
          700: colors.green[700],
          800: colors.green[800],
          900: colors.green[900],
          950: colors.green[950],
          DEFAULT: colors.green[600],
          foreground: '#ffffff',
        },
        warning: {
          50: colors.amber[50],
          100: colors.amber[100],
          200: colors.amber[200],
          300: colors.amber[300],
          400: colors.amber[400],
          500: colors.amber[500],
          600: colors.amber[600],
          700: colors.amber[700],
          800: colors.amber[800],
          900: colors.amber[900],
          950: colors.amber[950],
          DEFAULT: colors.amber[500],
          foreground: '#ffffff',
        },
        danger: {
          50: colors.red[50],
          100: colors.red[100],
          200: colors.red[200],
          300: colors.red[300],
          400: colors.red[400],
          500: colors.red[500],
          600: colors.red[600],
          700: colors.red[700],
          800: colors.red[800],
          900: colors.red[900],
          950: colors.red[950],
          DEFAULT: colors.red[600],
          foreground: '#ffffff',
        },
        // 业务语义色（卡牌类型色，随主题适配）
        workload: {
          light: colors.blue[600],
          dark: colors.blue[400],
          DEFAULT: colors.blue[600],
          foreground: '#ffffff',
        },
        budget: {
          light: colors.green[600],
          dark: colors.green[400],
          DEFAULT: colors.green[600],
          foreground: '#ffffff',
        },
        unit: {
          light: colors.purple[600],
          dark: colors.purple[400],
          DEFAULT: colors.purple[600],
          foreground: '#ffffff',
        },
        // 背景/前景/边框/静音色（语义化）
        background: 'var(--color-bg-primary)',
        'background-secondary': 'var(--color-bg-secondary)',
        'background-tertiary': 'var(--color-bg-tertiary)',
        foreground: 'var(--color-text-primary)',
        'foreground-secondary': 'var(--color-text-secondary)',
        'foreground-muted': 'var(--color-text-muted)',
        border: 'var(--color-border-primary)',
        'border-secondary': 'var(--color-border-secondary)',
        ring: 'var(--color-ring)',
        // 卡片专用
        card: 'var(--color-card-bg)',
        'card-border': 'var(--color-card-border)',
        'card-foreground': 'var(--color-card-text)',
        // 弹层专用
        popover: 'var(--color-popover-bg)',
        'popover-foreground': 'var(--color-popover-text)',
      },

      // === 间距 ===
      spacing,

      // === 字体 ===
      fontFamily,
      fontSize,
      fontWeight,

      // === 圆角 ===
      borderRadius,

      // === 阴影 ===
      boxShadow,

      // === 断点 ===
      screens: breakpoints,

      // === 动效 ===
      transitionDuration: {
        instant: motion.duration.instant,
        fast: motion.duration.fast,
        normal: motion.duration.normal,
        slow: motion.duration.slow,
        slower: motion.duration.slower,
      },
      transitionTimingFunction: {
        standard: `cubic-bezier(${motion.easing.standard.join(',')})`,
        entrance: `cubic-bezier(${motion.easing.entrance.join(',')})`,
        exit: `cubic-bezier(${motion.easing.exit.join(',')})`,
        emphasized: `cubic-bezier(${motion.easing.emphasized.join(',')})`,
      },

      // === Z-Index ===
      zIndex,

      // === 自定义关键帧 ===
      keyframes: {
        fadeIn: motion.keyframes.fadeIn,
        fadeOut: motion.keyframes.fadeOut,
        slideUp: motion.keyframes.slideUp,
        slideDown: motion.keyframes.slideDown,
        scaleIn: motion.keyframes.scaleIn,
        scaleOut: motion.keyframes.scaleOut,
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-out': 'fadeOut 150ms ease-in',
        'slide-up': 'slideUp 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
        'scale-out': 'scaleOut 150ms ease-in',
      },
    },
  },

  // 插件系统（v4 内置大部分功能，额外插件按需）
  plugins: [
    // 这里可添加自定义插件，如：
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],

  // 未来兼容性标志
  future: {
    hoverOnlyWhenSupported: true,
  },
} satisfies Config;