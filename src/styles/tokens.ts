/**
 * Design Tokens — 单一事实来源
 * 所有颜色、间距、字体、圆角、阴影、动效时长等设计决策的集中定义
 * 导出给：Tailwind CSS (tailwind.config.ts)、CSS Variables (globals.css)、语义色映射 (semantic.ts)
 * 
 * 设计原则：
 * - 专业医疗/绩效软件风格：简约、清爽、清晰
 * - 基线采用 Tailwind 官方色板（蓝/绿/紫/橙/红/灰），语义化映射
 * - 支持三模式：light / dark / system
 * - 预留主题包扩展点（extensions/）
 */

// ============================================
// 基础色板 —— Tailwind 官方色板为基线
// ============================================

export const colorPalette = {
  // 主色调：医疗/绩效软件常用蓝系
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // 主品牌色
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  // 辅助色：绿色（预算/成功/正向）
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  // 单元色：紫色（组织/结构）
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  },
  // 警告/拆分/能量色：橙/琥珀
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  // 危险/撤回/错误：红色
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  // 中性灰：UI 骨架、文字、边框、背景
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
} as const;

// ============================================
// 间距系统 —— 4px 基础单位
// ============================================

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const;

// ============================================
// 字体系统
// ============================================

export const fontFamily = {
  sans: [
    'Inter',
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ].join(', '),
  mono: [
    'JetBrains Mono',
    'ui-monospace',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Consolas',
    'monospace',
  ].join(', '),
} as const;

export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
  sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
  base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
  lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
  xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// ============================================
// 圆角系统
// ============================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  DEFAULT: '0.375rem', // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// ============================================
// 阴影系统
// ============================================

export const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  // 卡片专用阴影
  card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
  'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  // 悬浮面板阴影
  popover: '0 10px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

// ============================================
// 动效时长与缓动（统一规范）
// ============================================

export const motion = {
  // 统一缓动曲线：Material 3 / Tailwind 推荐
  easing: {
    standard: [0.4, 0, 0.2, 1] as const,        // 标准缓动
    entrance: [0.4, 0, 1, 1] as const,          // 进入
    exit: [0, 0, 0.2, 1] as const,              // 退出
    emphasized: [0.4, 0, 0.2, 1] as const,      // 强调
  },
  // 统一动效时长
  duration: {
    instant: '0ms',
    fast: '100ms',       // 微交互、悬浮
    normal: '200ms',     // 标准切换、面板展开
    slow: '300ms',       // 页面转场、复杂动画
    slower: '500ms',     // 重度转场
  },
  // 关键帧预设
  keyframes: {
    fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
    fadeOut: { from: { opacity: 1 }, to: { opacity: 0 } },
    slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
    slideDown: { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
    scaleIn: { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
    scaleOut: { from: { opacity: 1, transform: 'scale(1)' }, to: { opacity: 0, transform: 'scale(0.95)' } },
  },
} as const;

// ============================================
// Z-Index 层级
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
} as const;

// ============================================
// 断点系统
// ============================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// 导出聚合对象（供 Tailwind config 直接使用）
// ============================================

export const designTokens = {
  colors: colorPalette,
  spacing,
  fontFamily,
  fontSize,
  fontWeight,
  borderRadius,
  boxShadow,
  motion,
  zIndex,
  breakpoints,
} as const;

// 类型导出
export type ColorPalette = typeof colorPalette;
export type Spacing = typeof spacing;
export type FontFamily = typeof fontFamily;
export type FontSize = typeof fontSize;
export type FontWeight = typeof fontWeight;
export type BorderRadius = typeof borderRadius;
export type BoxShadow = typeof boxShadow;
export type Motion = typeof motion;
export type ZIndex = typeof zIndex;
export type Breakpoints = typeof breakpoints;
export type DesignTokens = typeof designTokens;