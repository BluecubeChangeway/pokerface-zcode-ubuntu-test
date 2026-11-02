/**
 * Light Theme Base Tokens
 * 
 * 明亮模式下的基础设计 Token 值
 * 所有值为 CSS Variable 可用的格式（十六进制、RGB、HSL 等）
 * 
 * 设计原则：
 * - 背景层级清晰：bg-primary < bg-secondary < bg-tertiary
 * - 文字层级分明：text-primary > text-secondary > text-muted
 * - 语义色在浅色背景下保持足够对比度 (WCAG AA 标准)
 */

export const lightThemeTokens = {
  // ============================================
  // 核心品牌色
  // ============================================
  '--color-primary': '#2563eb',        // Blue 600
  '--color-primary-hover': '#1d4ed8',  // Blue 700
  '--color-primary-foreground': '#ffffff',
  '--color-primary-subtle': '#dbeafe',  // Blue 50

  '--color-secondary': '#64748b',       // Slate 500
  '--color-secondary-hover': '#475569', // Slate 600
  '--color-secondary-foreground': '#ffffff',
  '--color-secondary-subtle': '#f1f5f9', // Slate 50

  '--color-success': '#059669',         // Emerald 600
  '--color-success-hover': '#047857',   // Emerald 700
  '--color-success-foreground': '#ffffff',
  '--color-success-subtle': '#d1fae5',  // Emerald 50

  '--color-warning': '#d97706',         // Amber 600
  '--color-warning-hover': '#b45309',   // Amber 700
  '--color-warning-foreground': '#ffffff',
  '--color-warning-subtle': '#fef3c7',  // Amber 50

  '--color-danger': '#dc2626',          // Red 600
  '--color-danger-hover': '#b91c1c',    // Red 700
  '--color-danger-foreground': '#ffffff',
  '--color-danger-subtle': '#fee2e2',   // Red 50

  // ============================================
  // 业务实体色
  // ============================================
  '--color-workload': '#2563eb',        // Blue 600 (Workload = 核算主业务)
  '--color-workload-hover': '#1d4ed8',  // Blue 700
  '--color-workload-subtle': '#dbeafe', // Blue 50
  '--color-workload-foreground': '#ffffff',

  '--color-budget': '#059669',          // Emerald 600 (Budget = 预算/资源)
  '--color-budget-hover': '#047857',    // Emerald 700
  '--color-budget-subtle': '#d1fae5',   // Emerald 50
  '--color-budget-foreground': '#ffffff',

  '--color-unit': '#7c3aed',            // Violet 600 (Unit = 单元/组织)
  '--color-unit-hover': '#6d28d9',      // Violet 700
  '--color-unit-subtle': '#ede9fe',     // Violet 50
  '--color-unit-foreground': '#ffffff',

  // ============================================
  // 背景层级
  // ============================================
  '--color-bg-primary': '#ffffff',       // 纯白 - 页面主背景
  '--color-bg-secondary': '#f8fafc',     // Slate 50 - 卡片/面板背景
  '--color-bg-tertiary': '#f1f5f9',      // Slate 100 - 悬浮/次级背景

  // ============================================
  // 文字层级
  // ============================================
  '--color-text-primary': '#0f172a',      // Slate 900 - 主标题/正文
  '--color-text-secondary': '#334155',    // Slate 700 - 次级文字
  '--color-text-muted': '#64748b',        // Slate 500 - 辅助/占位符
  '--color-text-inverse': '#ffffff',      // 白色 - 深色背景上的文字

  // ============================================
  // 边框层级
  // ============================================
  '--color-border-primary': '#e2e8f0',    // Slate 200 - 默认边框
  '--color-border-secondary': '#cbd5e1',  // Slate 300 - 较深边框
  '--color-border-focus': '#2563eb',      // Blue 600 - 聚焦态边框

  // ============================================
  // 卡片
  // ============================================
  '--color-card-bg': '#ffffff',
  '--color-card-border': '#e2e8f0',
  '--color-card-text': '#0f172a',
  '--color-card-hover': '#f8fafc',        // Slate 50

  // ============================================
  // 弹层
  // ============================================
  '--color-popover-bg': '#ffffff',
  '--color-popover-border': '#e2e8f0',
  '--color-popover-text': '#0f172a',
  '--color-popover-shadow': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',

  // ============================================
  // 输入框
  // ============================================
  '--color-input-bg': '#ffffff',
  '--color-input-border': '#e2e8f0',
  '--color-input-placeholder': '#94a3b8',  // Slate 400
  '--color-input-focus-border': '#2563eb',  // Blue 600
  '--color-input-focus-ring': '#93c5fd',    // Blue 200

  // ============================================
  // 禁用态
  // ============================================
  '--color-disabled-bg': '#f1f5f9',       // Slate 100
  '--color-disabled-text': '#94a3b8',     // Slate 400
  '--color-disabled-border': '#e2e8f0',   // Slate 200

  // ============================================
  // 滚动条
  // ============================================
  '--scrollbar-track': '#f1f5f9',         // Slate 100
  '--scrollbar-thumb': '#cbd5e1',         // Slate 300
  '--scrollbar-thumb-hover': '#94a3b8',   // Slate 400

  // ============================================
  // 选中
  // ============================================
  '--color-selection-bg': '#2563eb',       // Blue 600
  '--color-selection-text': '#ffffff',

  // ============================================
  // 环形焦点
  // ============================================
  '--color-ring': '#2563eb',               // Blue 600
  '--color-ring-offset': '#ffffff',

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
  // 阴影
  // ============================================
  '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '--shadow-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  '--shadow-popover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',

  // ============================================
  // 动效时长
  // ============================================
  '--motion-fast': '150ms',
  '--motion-normal': '200ms',
  '--motion-slow': '300ms',
};