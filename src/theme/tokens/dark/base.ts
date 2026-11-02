/**
 * Dark Theme Base Tokens
 * 
 * 深色模式下的基础设计 Token 值
 * 所有值为 CSS Variable 可用的格式（十六进制、RGB、HSL 等）
 * 
 * 设计原则：
 * - 背景层级清晰：bg-primary < bg-secondary < bg-tertiary（深色系反向）
 * - 文字层级分明：text-primary > text-secondary > text-muted
 * - 语义色在深色背景下保持足够对比度 (WCAG AA 标准)
 * - 色相保持一致，仅调整明度/饱和度适配深色背景
 */

export const darkThemeTokens = {
  // ============================================
  // 核心品牌色（深色模式下提高亮度/饱和度）
  // ============================================
  '--color-primary': '#3b82f6',         // Blue 500 (比 light 更亮)
  '--color-primary-hover': '#60a5fa',   // Blue 400
  '--color-primary-foreground': '#0f172a', // Slate 900
  '--color-primary-subtle': '#1e3a5f',  // Blue 900/800 混合

  '--color-secondary': '#94a3b8',       // Slate 400
  '--color-secondary-hover': '#cbd5e1', // Slate 300
  '--color-secondary-foreground': '#0f172a',
  '--color-secondary-subtle': '#1e293b', // Slate 800

  '--color-success': '#34d399',         // Emerald 400
  '--color-success-hover': '#6ee7b7',   // Emerald 300
  '--color-success-foreground': '#064e3b', // Emerald 900
  '--color-success-subtle': '#064e3b',  // Emerald 900

  '--color-warning': '#fbbf24',         // Amber 400
  '--color-warning-hover': '#fcd34d',   // Amber 300
  '--color-warning-foreground': '#78350f', // Amber 900
  '--color-warning-subtle': '#78350f',  // Amber 900

  '--color-danger': '#f87171',          // Red 400
  '--color-danger-hover': '#fca5a5',    // Red 300
  '--color-danger-foreground': '#7f1d1d', // Red 900
  '--color-danger-subtle': '#7f1d1d',   // Red 900

  // ============================================
  // 业务实体色
  // ============================================
  '--color-workload': '#3b82f6',        // Blue 500
  '--color-workload-hover': '#60a5fa',  // Blue 400
  '--color-workload-subtle': '#1e3a5f', // Blue 900/800
  '--color-workload-foreground': '#0f172a',

  '--color-budget': '#34d399',          // Emerald 400
  '--color-budget-hover': '#6ee7b7',    // Emerald 300
  '--color-budget-subtle': '#064e3b',   // Emerald 900
  '--color-budget-foreground': '#064e3b',

  '--color-unit': '#a78bfa',            // Violet 400
  '--color-unit-hover': '#c4b5fd',      // Violet 300
  '--color-unit-subtle': '#4c1d95',     // Violet 900
  '--color-unit-foreground': '#2e1065',

  // ============================================
  // 背景层级（深色模式：越深越底层）
  // ============================================
  '--color-bg-primary': '#0f172a',      // Slate 900 - 页面主背景
  '--color-bg-secondary': '#1e293b',    // Slate 800 - 卡片/面板背景
  '--color-bg-tertiary': '#334155',     // Slate 700 - 悬浮/次级背景

  // ============================================
  // 文字层级
  // ============================================
  '--color-text-primary': '#f8fafc',     // Slate 50 - 主标题/正文
  '--color-text-secondary': '#cbd5e1',   // Slate 300 - 次级文字
  '--color-text-muted': '#94a3b8',       // Slate 400 - 辅助/占位符
  '--color-text-inverse': '#0f172a',     // Slate 900 - 浅色背景上的文字

  // ============================================
  // 边框层级
  // ============================================
  '--color-border-primary': '#334155',    // Slate 700 - 默认边框
  '--color-border-secondary': '#475569',  // Slate 600 - 较深边框
  '--color-border-focus': '#60a5fa',      // Blue 400 - 聚焦态边框

  // ============================================
  // 卡片
  // ============================================
  '--color-card-bg': '#1e293b',           // Slate 800
  '--color-card-border': '#334155',       // Slate 700
  '--color-card-text': '#f8fafc',         // Slate 50
  '--color-card-hover': '#334155',        // Slate 700

  // ============================================
  // 弹层
  // ============================================
  '--color-popover-bg': '#1e293b',        // Slate 800
  '--color-popover-border': '#334155',    // Slate 700
  '--color-popover-text': '#f8fafc',      // Slate 50
  '--color-popover-shadow': '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3)',

  // ============================================
  // 输入框
  // ============================================
  '--color-input-bg': '#1e293b',          // Slate 800
  '--color-input-border': '#334155',      // Slate 700
  '--color-input-placeholder': '#64748b',  // Slate 500
  '--color-input-focus-border': '#60a5fa', // Blue 400
  '--color-input-focus-ring': '#1e3a5f',   // Blue 900/800

  // ============================================
  // 禁用态
  // ============================================
  '--color-disabled-bg': '#1e293b',        // Slate 800
  '--color-disabled-text': '#64748b',      // Slate 500
  '--color-disabled-border': '#334155',    // Slate 700

  // ============================================
  // 滚动条
  // ============================================
  '--scrollbar-track': '#0f172a',         // Slate 900
  '--scrollbar-thumb': '#475569',         // Slate 600
  '--scrollbar-thumb-hover': '#64748b',   // Slate 500

  // ============================================
  // 选中
  // ============================================
  '--color-selection-bg': '#3b82f6',       // Blue 500
  '--color-selection-text': '#0f172a',     // Slate 900

  // ============================================
  // 环形焦点
  // ============================================
  '--color-ring': '#3b82f6',               // Blue 500
  '--color-ring-offset': '#0f172a',        // Slate 900

  // ============================================
  // 字体 Token（可被主题包覆盖）
  // ============================================
  '--font-sans': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  '--font-mono': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',

  // ============================================
  // 圆角
  // ============================================
  '--radius-sm': '0.25rem',   // 4px
  '--radius-md': '0.375rem',  // 6px
  '--radius-lg': '0.5rem',    // 8px
  '--radius-xl': '0.75rem',   // 12px
  '--radius-full': '9999px',  // 圆形

  // ============================================
  // 阴影（深色模式阴影更深、更透明）
  // ============================================
  '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
  '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
  '--shadow-card': '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.2)',
  '--shadow-popover': '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3)',

  // ============================================
  // 动效时长（与 light 保持一致）
  // ============================================
  '--motion-fast': '150ms',
  '--motion-normal': '200ms',
  '--motion-slow': '300ms',
};