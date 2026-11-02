/**
 * 语义色映射表
 * 
 * 核心设计：将业务语义（workload/budget/unit/primary/success/warning/danger）
 * 映射到 CSS Variables，实现：
 * 1. 主题切换时自动适配（light/dark/system）
 * 2. 主题包扩展时只需覆盖语义色映射
 * 3. 组件代码中只使用语义色名称，不硬编码十六进制
 * 
 * 专业医疗/绩效软件配色原则：
 * - Workload（工作量/核算主业务）：蓝色系 — 专业、理性、信任
 * - Budget（预算/资源）：绿色系 — 增长、健康、正向
 * - Unit（单元/组织/人员）：紫色系 — 结构、层级、协作
 * - Primary（主要操作）：蓝色系 — 与 workload 共色，强化主业务
 * - Success（成功/确认）：绿色系 — 标准语义
 * - Warning（警告/拆分/待办）：琥珀/橙色系 — 注意、能量
 * - Danger（危险/撤回/删除）：红色系 — 标准语义
 */

// 语义色键名类型
export type SemanticColorKey = 
  // 业务实体色
  | 'workload' | 'budget' | 'unit'
  // 业务实体色变体
  | 'workload-hover' | 'workload-subtle' | 'workload-foreground'
  | 'budget-hover' | 'budget-subtle' | 'budget-foreground'
  | 'unit-hover' | 'unit-subtle' | 'unit-foreground'
  // 状态色
  | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  // 状态色变体
  | 'primary-hover' | 'primary-foreground' | 'primary-subtle'
  | 'secondary-hover' | 'secondary-foreground' | 'secondary-subtle'
  | 'success-hover' | 'success-foreground' | 'success-subtle'
  | 'warning-hover' | 'warning-foreground' | 'warning-subtle'
  | 'danger-hover' | 'danger-foreground' | 'danger-subtle'
  // 背景层级
  | 'bg-primary' | 'bg-secondary' | 'bg-tertiary'
  // 文字层级
  | 'text-primary' | 'text-secondary' | 'text-muted' | 'text-inverse'
  // 边框层级
  | 'border-primary' | 'border-secondary' | 'border-focus'
  // 卡片
  | 'card-bg' | 'card-border' | 'card-text' | 'card-hover'
  // 弹层
  | 'popover-bg' | 'popover-border' | 'popover-text' | 'popover-shadow'
  // 输入框
  | 'input-bg' | 'input-border' | 'input-placeholder' | 'input-focus-border' | 'input-focus-ring'
  // 禁用态
  | 'disabled-bg' | 'disabled-text' | 'disabled-border'
  // 滚动条
  | 'scrollbar-track' | 'scrollbar-thumb' | 'scrollbar-thumb-hover'
  // 选中
  | 'selection-bg' | 'selection-text'
  // 环形焦点
  | 'ring' | 'ring-offset';

// CSS Variable 名称映射
const cssVarMap: Record<SemanticColorKey, string> = {
  // 业务实体色
  workload: '--color-workload',
  budget: '--color-budget',
  unit: '--color-unit',
  
  // 状态色
  primary: '--color-primary',
  secondary: '--color-secondary',
  success: '--color-success',
  warning: '--color-warning',
  danger: '--color-danger',
  
  // 背景层级
  'bg-primary': '--color-bg-primary',
  'bg-secondary': '--color-bg-secondary',
  'bg-tertiary': '--color-bg-tertiary',
  
  // 文字层级
  'text-primary': '--color-text-primary',
  'text-secondary': '--color-text-secondary',
  'text-muted': '--color-text-muted',
  'text-inverse': '--color-text-inverse',
  
  // 边框层级
  'border-primary': '--color-border-primary',
  'border-secondary': '--color-border-secondary',
  'border-focus': '--color-border-focus',
  
  // 卡片
  'card-bg': '--color-card-bg',
  'card-border': '--color-card-border',
  'card-text': '--color-card-text',
  'card-hover': '--color-card-hover',
  
  // 弹层
  'popover-bg': '--color-popover-bg',
  'popover-border': '--color-popover-border',
  'popover-text': '--color-popover-text',
  'popover-shadow': '--color-popover-shadow',
  
  // 输入框
  'input-bg': '--color-input-bg',
  'input-border': '--color-input-border',
  'input-placeholder': '--color-input-placeholder',
  'input-focus-border': '--color-input-focus-border',
  'input-focus-ring': '--color-input-focus-ring',
  
  // 禁用态
  'disabled-bg': '--color-disabled-bg',
  'disabled-text': '--color-disabled-text',
  'disabled-border': '--color-disabled-border',
  
  // 滚动条
  'scrollbar-track': '--scrollbar-track',
  'scrollbar-thumb': '--scrollbar-thumb',
  'scrollbar-thumb-hover': '--scrollbar-thumb-hover',
  
  // 选中
  'selection-bg': '--color-selection-bg',
  'selection-text': '--color-selection-text',
  
  // 环形焦点
  ring: '--color-ring',
  'ring-offset': '--color-ring-offset',

  // 业务实体色变体
  'workload-hover': '--color-workload-hover',
  'workload-subtle': '--color-workload-subtle',
  'workload-foreground': '--color-workload-foreground',
  'budget-hover': '--color-budget-hover',
  'budget-subtle': '--color-budget-subtle',
  'budget-foreground': '--color-budget-foreground',
  'unit-hover': '--color-unit-hover',
  'unit-subtle': '--color-unit-subtle',
  'unit-foreground': '--color-unit-foreground',

  // 状态色变体
  'primary-hover': '--color-primary-hover',
  'primary-foreground': '--color-primary-foreground',
  'primary-subtle': '--color-primary-subtle',
  'secondary-hover': '--color-secondary-hover',
  'secondary-foreground': '--color-secondary-foreground',
  'secondary-subtle': '--color-secondary-subtle',
  'success-hover': '--color-success-hover',
  'success-foreground': '--color-success-foreground',
  'success-subtle': '--color-success-subtle',
  'warning-hover': '--color-warning-hover',
  'warning-foreground': '--color-warning-foreground',
  'warning-subtle': '--color-warning-subtle',
  'danger-hover': '--color-danger-hover',
  'danger-foreground': '--color-danger-foreground',
  'danger-subtle': '--color-danger-subtle',
};

/**
 * 获取语义色的 CSS Variable 引用
 * 用法：`color: ${semanticColor('workload')}` → `color: var(--color-workload)`
 */
export function semanticColor(key: SemanticColorKey): string {
  return `var(${cssVarMap[key]})`;
}

/**
 * 获取语义色的完整变体组（主色、悬浮、前景、淡色）
 * 用于组件内部需要多态变体时
 */
export function semanticColorVariants(baseKey: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'workload' | 'budget' | 'unit') {
  const suffixes = {
    primary: ['', '-hover', '-foreground', '-subtle'],
    secondary: ['', '-hover', '-foreground', '-subtle'],
    success: ['', '-hover', '-foreground', '-subtle'],
    warning: ['', '-hover', '-foreground', '-subtle'],
    danger: ['', '-hover', '-foreground', '-subtle'],
    workload: ['', '-hover', '-subtle', '-foreground'],
    budget: ['', '-hover', '-subtle', '-foreground'],
    unit: ['', '-hover', '-subtle', '-foreground'],
  } as const;
  
  const keys = suffixes[baseKey].map(suffix => `${baseKey}${suffix}` as SemanticColorKey);
  
  return Object.fromEntries(
    keys.map(k => [k.replace(`${baseKey}-`, '').replace(baseKey, 'base'), semanticColor(k)])
  ) as Record<'base' | 'hover' | 'foreground' | 'subtle', string>;
}

/**
 * 卡牌类型语义色映射
 * 组件中直接使用：`cardTypeColor('workload')` 获取完整配色组
 */
export function cardTypeColor(type: 'workload' | 'budget' | 'unit') {
  return {
    color: semanticColor(type),
    hover: semanticColor(`${type}-hover` as SemanticColorKey),
    subtle: semanticColor(`${type}-subtle` as SemanticColorKey),
    foreground: semanticColor(`${type}-foreground` as SemanticColorKey),
    cssVars: {
      '--card-type-color': semanticColor(type),
      '--card-type-hover': semanticColor(`${type}-hover` as SemanticColorKey),
      '--card-type-subtle': semanticColor(`${type}-subtle` as SemanticColorKey),
      '--card-type-foreground': semanticColor(`${type}-foreground` as SemanticColorKey),
    },
  };
}

/**
 * 状态色语义映射（Badge、Alert、Toast 等组件使用）
 */
export const statusColorMap = {
  recommended: { base: 'primary', label: '推荐' } as const,
  accepted: { base: 'success', label: '已接受' } as const,
  ignored: { base: 'warning', label: '暂不采用' } as const,
  dismissed: { base: 'danger', label: '已驳回' } as const,
  pending: { base: 'warning', label: '待处理' } as const,
  executing: { base: 'primary', label: '执行中' } as const,
  failed: { base: 'danger', label: '失败' } as const,
} as const;

export function statusColor(status: keyof typeof statusColorMap) {
  const { base } = statusColorMap[status];
  return {
    bg: semanticColor(`${base}-subtle` as SemanticColorKey),
    text: semanticColor(base as SemanticColorKey),
    border: semanticColor(`${base}` as SemanticColorKey),
  };
}

/**
 * 主题感知的内联样式生成器
 * 用于 React 组件中 style prop 直接使用语义色
 */
export function createSemanticStyle(obj: Record<string, SemanticColorKey | string>): React.CSSProperties {
  const result: Record<string, string> = {};
  for (const [prop, value] of Object.entries(obj)) {
    if (value in cssVarMap) {
      result[prop] = semanticColor(value as SemanticColorKey);
    } else {
      result[prop] = value;
    }
  }
  return result as React.CSSProperties;
}

/**
 * 导出所有语义色键的联合类型（供组件 Props 约束）
 */
export type SemanticColorKeys = SemanticColorKey;

/**
 * 组件级语义色 Token 接口
 * 每个组件可定义自己的语义色需求，由主题系统统一注入
 */
export interface ComponentSemanticTokens {
  // 基础
  bg: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  // 交互态
  hoverBg: string;
  activeBg: string;
  focusRing: string;
  focusBorder: string;
  // 禁用态
  disabledBg: string;
  disabledText: string;
  disabledBorder: string;
}

/**
 * 预定义组件语义色 Token（可被主题包覆盖）
 */
export const defaultComponentTokens: Record<string, ComponentSemanticTokens> = {
  button: {
    bg: semanticColor('primary'),
    border: semanticColor('primary'),
    text: semanticColor('primary-foreground'),
    textSecondary: semanticColor('secondary-foreground'),
    textMuted: semanticColor('text-muted'),
    hoverBg: semanticColor('primary-hover'),
    activeBg: semanticColor('primary'),
    focusRing: semanticColor('ring'),
    focusBorder: semanticColor('border-focus'),
    disabledBg: semanticColor('disabled-bg'),
    disabledText: semanticColor('disabled-text'),
    disabledBorder: semanticColor('disabled-border'),
  },
  card: {
    bg: semanticColor('card-bg'),
    border: semanticColor('card-border'),
    text: semanticColor('card-text'),
    textSecondary: semanticColor('text-secondary'),
    textMuted: semanticColor('text-muted'),
    hoverBg: semanticColor('card-hover'),
    activeBg: semanticColor('bg-tertiary'),
    focusRing: semanticColor('ring'),
    focusBorder: semanticColor('border-focus'),
    disabledBg: semanticColor('disabled-bg'),
    disabledText: semanticColor('disabled-text'),
    disabledBorder: semanticColor('disabled-border'),
  },
  input: {
    bg: semanticColor('input-bg'),
    border: semanticColor('input-border'),
    text: semanticColor('text-primary'),
    textSecondary: semanticColor('text-secondary'),
    textMuted: semanticColor('input-placeholder'),
    hoverBg: semanticColor('input-bg'),
    activeBg: semanticColor('input-bg'),
    focusRing: semanticColor('input-focus-ring'),
    focusBorder: semanticColor('input-focus-border'),
    disabledBg: semanticColor('disabled-bg'),
    disabledText: semanticColor('disabled-text'),
    disabledBorder: semanticColor('disabled-border'),
  },
  popover: {
    bg: semanticColor('popover-bg'),
    border: semanticColor('popover-border'),
    text: semanticColor('popover-text'),
    textSecondary: semanticColor('text-secondary'),
    textMuted: semanticColor('text-muted'),
    hoverBg: semanticColor('bg-tertiary'),
    activeBg: semanticColor('bg-tertiary'),
    focusRing: semanticColor('ring'),
    focusBorder: semanticColor('border-focus'),
    disabledBg: semanticColor('disabled-bg'),
    disabledText: semanticColor('disabled-text'),
    disabledBorder: semanticColor('disabled-border'),
  },
};

/**
 * 主题包扩展接口（V2+）
 * 未来主题包只需实现此接口覆盖语义色
 */
export interface ThemePackageTokens {
  name: string;
  displayName: string;
  description?: string;
  // 核心语义色覆盖（可选，未提供则回退到默认 light/dark）
  colors?: Partial<Record<SemanticColorKey, string>>;
  // 字体覆盖（可选）
  fonts?: {
    sans?: string;
    mono?: string;
  };
  // 圆角/阴影/动效等进阶 Token（可选）
  borderRadius?: Partial<Record<'sm' | 'md' | 'lg' | 'xl' | 'full', string>>;
  boxShadow?: Partial<Record<'sm' | 'md' | 'lg' | 'xl' | 'card' | 'popover', string>>;
  motion?: Partial<Record<'fast' | 'normal' | 'slow', string>>;
  // 自定义 CSS Variables（主题包独有效果，如发光、纹理）
  customProperties?: Record<string, string>;
}