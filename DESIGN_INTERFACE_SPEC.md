# 设计接口清单 — Poker Face UI 系统

> **版本**: v1.0 (2026-11-02)  
> **状态**: 生产就绪  
> **适用范围**: 设计团队、前端开发、QA 验收  
> **配套工程**: Storybook 8.6.19 (http://localhost:6006) | Playwright 视觉回归测试

---

## 目录

1. [设计系统概览](#设计系统概览)
2. [主题系统](#主题系统)
3. [语义色系统](#语义色系统)
4. [动效系统](#动效系统)
5. [国际化系统](#国际化系统)
6. [核心组件 API](#核心组件-api)
7. [视觉回归测试基线](#视觉回归测试基线)
8. [设计交付检查清单](#设计交付检查清单)

---

## 设计系统概览

### 技术栈
| 层级 | 技术选择 | 版本 |
|------|----------|------|
| UI 库 | Radix UI Primitives | 2.2.1+ (Select, DropdownMenu, Tabs, Dialog 等) |
| 样式方案 | Tailwind CSS v4 + CSS Variables | 4.3.3 |
| 动效 | Framer Motion | 14.8.0 |
| 国际化 | i18next + react-i18next | 26.5.11 / 17.1.9 |
| 图标 | Lucide React | 0.542.0 |
| 状态管理 | Zustand | 5.0.8 |
| 类型安全 | TypeScript 严格模式 | 5.9.2 |

### 架构原则
- **语义色优先**：组件代码仅使用语义色名称（如 `workload`、`primary`），不硬编码十六进制
- **CSS Variables 驱动**：主题切换、主题包扩展仅通过覆盖 CSS 变量实现，零 JS 逻辑变更
- **三层 Provider 组合**：`UIProviders = ThemeProvider + LocaleProvider + MotionProvider`，App 入口统一注入
- **Radix UI 封装**：所有基础组件基于 Radix Primitives 封装，保证无障碍、键盘导航、RTL 支持
- **Storybook 为真源**：所有组件状态、变体、主题在 Storybook 中可视化验收

---

## 主题系统

### ThemeProvider 配置接口

```typescript
interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: 'light' | 'dark' | 'system';      // 默认 'system'
  themePackages?: ThemePackageInfo[];              // V2+ 主题包扩展
  storageKey?: string;                             // 默认 'poker-face-theme'
  attribute?: 'data-theme' | 'class' | 'data-theme-mode'; // 默认 'data-theme'
  enableTransitions?: boolean;                     // 默认 true，200ms 过渡
  onThemeChange?: (resolvedTheme, themeMode) => void;
}
```

### 三模式切换行为

| 模式 | 行为 | 适用场景 |
|------|------|----------|
| `light` | 强制浅色 | 白天办公、打印预览 |
| `dark` | 强制深色 | 夜间值班、长时间盯屏 |
| `system` | 跟随 `prefers-color-scheme` | 默认，无感切换 |

### CSS Variable 注入机制
- **Light Token**: `src/theme/tokens/light/base.ts`
- **Dark Token**: `src/theme/tokens/dark/base.ts`
- 运行时由 `ThemeProvider` 根据 `resolvedTheme` 将所有 `--color-*` 变量注入 `:root`

### V2+ 主题包扩展接口
```typescript
interface ThemePackageInfo {
  name: string;                    // 唯一标识
  displayName: string;             // 显示名称
  description?: string;
  isBuiltIn?: boolean;
}

interface ThemePackageTokens {
  name: string;
  displayName: string;
  description?: string;
  colors?: Partial<Record<SemanticColorKey, string>>;  // 语义色覆盖
  fonts?: { sans?: string; mono?: string; };
  borderRadius?: Partial<Record<'sm'|'md'|'lg'|'xl'|'full', string>>;
  boxShadow?: Partial<Record<'sm'|'md'|'lg'|'xl'|'card'|'popover', string>>;
  motion?: Partial<Record<'fast'|'normal'|'slow', string>>;
  customProperties?: Record<string, string>;  // 独有效果（发光、纹理等）
}
```

### 组件消费 Hook
```typescript
// 完整上下文
const { resolvedTheme, themeMode, setThemeMode, toggleTheme, isSystem, systemTheme } = useTheme();

// 仅需 resolvedTheme
const resolvedTheme = useResolvedTheme();

// 仅需模式切换
const { themeMode, setThemeMode, toggleTheme } = useThemeMode();
```

---

## 语义色系统

### 设计原则（医疗/绩效软件专用）

| 业务实体 | 语义色键 | 色系 | 设计意图 |
|----------|----------|------|----------|
| **工作量/核算** | `workload` | **蓝色系** | 专业、理性、信任、核心业务 |
| **预算/资源** | `budget` | **绿色系** | 增长、健康、正向、资源分配 |
| **单元/组织/人员** | `unit` | **紫色系** | 结构、层级、协作、组织架构 |
| **主要操作** | `primary` | 蓝色系 | 与 workload 共色，强化主业务 |
| **成功/确认** | `success` | 绿色系 | 标准语义 |
| **警告/拆分/待办** | `warning` | 琥珀/橙色系 | 注意、能量、需决策 |
| **危险/撤回/删除** | `danger` | 红色系 | 标准语义 |

### 语义色键完整类型
```typescript
type SemanticColorKey = 
  // 业务实体色（含变体）
  | 'workload' | 'budget' | 'unit'
  | 'workload-hover' | 'workload-subtle' | 'workload-foreground'
  | 'budget-hover' | 'budget-subtle' | 'budget-foreground'
  | 'unit-hover' | 'unit-subtle' | 'unit-foreground'
  // 状态色（含变体）
  | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  | 'primary-hover' | 'primary-foreground' | 'primary-subtle'
  | 'secondary-hover' | 'secondary-foreground' | 'secondary-subtle'
  | 'success-hover' | 'success-foreground' | 'success-subtle'
  | 'warning-hover' | 'warning-foreground' | 'warning-subtle'
  | 'danger-hover' | 'danger-foreground' | 'danger-subtle'
  // 背景/文字/边框层级
  | 'bg-primary' | 'bg-secondary' | 'bg-tertiary'
  | 'text-primary' | 'text-secondary' | 'text-muted' | 'text-inverse'
  | 'border-primary' | 'border-secondary' | 'border-focus'
  // 组件专用
  | 'card-bg' | 'card-border' | 'card-text' | 'card-hover'
  | 'popover-bg' | 'popover-border' | 'popover-text' | 'popover-shadow'
  | 'input-bg' | 'input-border' | 'input-placeholder' | 'input-focus-border' | 'input-focus-ring'
  // 禁用/滚动/选中/焦点环
  | 'disabled-bg' | 'disabled-text' | 'disabled-border'
  | 'scrollbar-track' | 'scrollbar-thumb' | 'scrollbar-thumb-hover'
  | 'selection-bg' | 'selection-text'
  | 'ring' | 'ring-offset';
```

### 组件级语义色 Token（开箱即用）

```typescript
// Button 专用
button: {
  bg: 'primary', border: 'primary', text: 'primary-foreground',
  hoverBg: 'primary-hover', focusRing: 'ring', disabledBg: 'disabled-bg', ...
}

// Card 专用
card: {
  bg: 'card-bg', border: 'card-border', text: 'card-text',
  hoverBg: 'card-hover', focusRing: 'ring', ...
}

// Input 专用
input: {
  bg: 'input-bg', border: 'input-border', text: 'text-primary',
  focusRing: 'input-focus-ring', focusBorder: 'input-focus-border', ...
}

// Popover 专用
popover: {
  bg: 'popover-bg', border: 'popover-border', text: 'popover-text', ...
}
```

### 组件内使用方式
```tsx
import { semanticColor, cardTypeColor, statusColor } from '@/theme/semantic';

// 单色引用
style={{ backgroundColor: semanticColor('workload') }}

// 卡牌类型完整配色组
const { color, hover, subtle, foreground, cssVars } = cardTypeColor('workload');
// cssVars 可直接传给 style: <div style={cssVars} />

// 状态色（Badge/Alert/Toast）
const { bg, text, border } = statusColor('recommended');  // recommended/accepted/ignored/dismissed/pending/executing/failed
```

### 设计交付要求
| 交付物 | 格式 | 说明 |
|--------|------|------|
| Light/Dark 语义色值表 | Figma Variables / JSON | 对应 `src/theme/tokens/light(base).ts` 与 `dark(base).ts` |
| 业务实体色色板 | Figma Styles | Workload/Budget/Unit 主色 + hover/subtle/foreground 4 态 |
| 状态色色板 | Figma Styles | Primary/Success/Warning/Danger + 4 态 |
| 组件 Token 映射表 | Markdown | 对应 `defaultComponentTokens` |

---

## 动效系统

### MotionProvider 配置接口
```typescript
interface MotionProviderProps {
  children: ReactNode;
  initialReducedMotion?: boolean | 'system';  // 默认 'system'
  storageKey?: string;                        // 默认 'poker-face-motion'
  customPresets?: Partial<MotionContextValue>; // 覆盖默认预设
}
```

### 缓动预设（基于 Material Design 3）
| 名称 | 贝塞尔曲线 | 用途 |
|------|------------|------|
| `standard` | `[0.4, 0, 0.2, 1]` | 标准进出场、状态切换 |
| `entrance` | `[0.4, 0, 1, 1]` | 元素进入、展开 |
| `exit` | `[0, 0, 0.2, 1]` | 元素退出、折叠 |
| `emphasized` | `[0.4, 0, 0.2, 1]` | 强调动画（Modal、Toast） |

### 时长预设（毫秒）
| 名称 | 值 | 用途 |
|------|-----|------|
| `instant` | 0 | 无动效、reducedMotion 降级 |
| `fast` | 100ms | Hover、Focus、微反馈 |
| `normal` | 200ms | **标准时长**，大多数过渡 |
| `slow` | 300ms | 面板展开、复杂状态切换 |
| `slower` | 500ms | 页面级转场、全屏 Modal |

### 关键帧预设
```typescript
fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } }
fadeOut:   { from: { opacity: 1 }, to: { opacity: 0 } }
slideUp:   { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } }
slideDown: { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'translateY(0)' } }
scaleIn:   { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } }
scaleOut:  { from: { opacity: 1, transform: 'scale(1)' }, to: { opacity: 0, transform: 'scale(0.95)' } }
```

### Transition 预设（可直接传给 framer-motion）
```typescript
fast:      { duration: 0.1, ease: standard }
normal:    { duration: 0.2, ease: standard }   // ← 默认
slow:      { duration: 0.3, ease: standard }
spring:    { type: 'spring', stiffness: 300, damping: 30 }
springGentle: { type: 'spring', stiffness: 120, damping: 14 }  // 卡牌拖拽、柔和
springSnappy: { type: 'spring', stiffness: 500, damping: 35 }  // 按钮按下、干脆
```

### Variants 预设（组件级复用）
```typescript
fade:     { hidden: { opacity: 0 }, visible: { opacity: 1, transition: normal } }
slideUp:  { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: normal } }
slideDown: { hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0, transition: normal } }
scale:    { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: fast } }
stagger:  { visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }  // 列表渐入
```

### ReducedMotion 行为
| 触发方式 | 行为 |
|----------|------|
| 系统偏好 `prefers-reduced-motion: reduce` | 自动启用（首次访问） |
| 用户手动切换 Toolbar 开关 | 持久化到 localStorage，优先级高于系统偏好 |
| 启用后 | 所有 `transition` → `none`，`duration` → `0`，`spring` 失效 |

### 组件消费 Hook
```typescript
const { reducedMotion, easing, duration, keyframes, transitions, variants } = useMotion();
const { transitions, easing, duration } = useMotionTransitions();
const { fade, slideUp, slideDown, scale, stagger } = useMotionVariants();

// 组件级自适应
const transition = useAdaptiveTransition(transitions.normal, { transition: 'none' });
```

### 设计交付要求
| 交付物 | 格式 | 说明 |
|--------|------|------|
| 缓动曲线可视化 | Figma Prototype / CSS cubic-bezier | 4 条标准曲线 |
| 时长阶梯表 | Markdown / Figma | 5 级时长 + spring 参数 |
| 关键帧动效预览 | Figma Prototype / Lottie | 6 组关键帧 |
| Variants 组合示例 | Storybook Stories | fade/slideUp/scale/stagger 在真实组件中的表现 |

---

## 国际化系统

### LocaleProvider 配置接口
```typescript
interface LocaleProviderProps {
  children: ReactNode;
  defaultLocale?: SupportedLocale;        // 默认 'zh-CN'
  supportedLocales?: SupportedLocale[];   // 默认 ['zh-CN', 'en-US']
  namespaces?: string[];                  // 默认 5 个命名空间
  defaultNamespace?: string;              // 默认 'common'
  storageKey?: string;                    // 默认 'poker-face-locale'
  fallbackLocale?: SupportedLocale;       // 默认 'zh-CN'
  onLocaleChange?: (locale) => void;
}
```

### 支持语言
| 语言代码 | 显示名称 | 备注 |
|----------|----------|------|
| `zh-CN` | 简体中文 | 主语言、fallback |
| `en-US` | English | 次语言 |

### 命名空间拆分（按业务域）

| 命名空间 | 业务范围 | 典型键示例 |
|----------|----------|------------|
| `common` | 通用 UI：按钮、提示、空状态、确认框 | `common:button.confirm`, `common:empty.noData` |
| `canvas` | 画布交互：卡牌、槽位、拖拽、聚焦、聚合 | `canvas:slot.dropHere`, `canvas:card.workload` |
| `recommendation` | 推荐系统：列表、详情、确认面板、拆分参数 | `recommendation:action.confirmSplit`, `recommendation:split.parameters` |
| `revocation` | 撤回系统：预览、确认、层撤回 | `revocation:preview.title`, `revocation:confirm.cascade` |
| `settings` | 设置中心：主题、语言、动效、关于 | `settings:theme.mode`, `settings:motion.reduced` |

### 组件消费 Hook（带命名空间类型安全）
```typescript
// 通用
const { t } = useCommonTranslation();        // t('button.confirm')
const { t } = useCanvasTranslation();        // t('slot.dropHere')
const { t } = useRecommendationTranslation(); // t('action.confirmSplit')
const { t } = useRevocationTranslation();    // t('preview.title')
const { t } = useSettingsTranslation();      // t('theme.mode')

// 通用/多命名空间
const { t, i18n, locale, setLocale } = useTranslation(['common', 'canvas']);
```

### 资源文件结构
```
src/i18n/resources/
├── zh-CN/
│   ├── common.json
│   ├── canvas.json
│   ├── recommendation.json
│   ├── revocation.json
│   └── settings.json
└── en-US/
    ├── common.json
    ├── canvas.json
    ├── recommendation.json
    ├── revocation.json
    └── settings.json
```

### 设计交付要求
| 交付物 | 格式 | 说明 |
|--------|------|------|
| 5 个命名空间翻译文档 | JSON / Excel | zh-CN + en-US 完整对照 |
| 术语表 | Markdown | 业务术语统一：工作量/Workload、预算/Budget、单元/Unit、推荐/Recommendation、撤回/Revocation |
| 复数/插值规范 | Markdown | ICU MessageFormat 语法、变量命名约定 |

---

## 核心组件 API

以下 16 个组件已完成类型安全封装、Storybook 文档化、视觉回归测试基线建立。

### 1. Button — 主要交互入口
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'subtle' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;  // Radix Slot 模式
}
```
**语义色映射**：
- `primary` → `primary` / `primary-foreground`
- `danger` → `danger` / `danger-foreground`
- `ghost` → `transparent` / `text-primary` + hover `primary-subtle`
- `outline` → `border-primary` / `text-primary` + hover `primary-subtle`

**States**: default / hover / focus / active / loading / disabled

### 2. Card — 信息承载容器
```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'filled' | 'outlined';
  hoverable?: boolean;
  selected?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  asChild?: boolean;
}

// 复合组件
Card.Header, Card.Title, Card.Description, Card.Content, Card.Footer, Card.Action
```
**语义色映射**：`card-bg` / `card-border` / `card-text` / `card-hover`

### 3. Select — 下拉选择（单选/多选/搜索/分组）
```tsx
interface SelectProps<T = string> {
  options?: SelectOption<T>[] | SelectGroup<T>[];
  value?: T | T[];
  defaultValue?: T | T[];
  onValueChange?: (value: T | T[]) => void;
  placeholder?: string;
  multiple?: boolean;
  maxDisplayCount?: number;     // 多选显示上限
  filter?: (query, option) => boolean;  // 自定义搜索
  renderOption?: (option, selected) => ReactNode;
  renderValue?: (value, options) => ReactNode;
  size?: 'sm' | 'md' | 'lg';
}
```
**复合组件**：`SelectTrigger` `SelectContent` `SelectViewport` `SelectGroup` `SelectLabel` `SelectItem` `SelectItemText` `SelectItemIndicator` `SelectSeparator` `SelectScrollUpButton` `SelectScrollDownButton` `SelectValue` `SelectArrow`

### 4. Tabs — 标签页切换
```tsx
interface TabsProps {
  defaultValue: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'line' | 'enclosed' | 'soft';
  className?: string;
}
Tabs.List, Tabs.Trigger, Tabs.Content
```

### 5. Input — 文本输入
```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}
```
**语义色映射**：`input-bg` / `input-border` / `input-focus-border` / `input-focus-ring`

### 6. Switch — 开关切换
```tsx
interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}
```

### 7. Dialog / AlertDialog — 模态对话框
```tsx
// Dialog: 通用模态
Dialog.Trigger, Dialog.Portal, Dialog.Overlay, Dialog.Content, Dialog.Close, Dialog.Title, Dialog.Description, Dialog.Footer

// AlertDialog: 危险操作确认
AlertDialog.Trigger, AlertDialog.Portal, AlertDialog.Overlay, AlertDialog.Content, AlertDialog.Title, AlertDialog.Description, AlertDialog.Action, AlertDialog.Cancel
```

### 8. DropdownMenu — 下拉菜单（含 RadioGroup/CheckboxItem）
```tsx
DropdownMenu.Trigger, DropdownMenu.Portal, DropdownMenu.Content,
DropdownMenu.Item, DropdownMenu.CheckboxItem, DropdownMenu.RadioGroup, DropdownMenu.RadioItem,
DropdownMenu.Label, DropdownMenu.Separator, DropdownMenu.Shortcut, DropdownMenu.Sub, DropdownMenu.SubTrigger, DropdownMenu.SubContent
```

### 9. Tooltip — 悬浮提示
```tsx
Tooltip.Provider, Tooltip.Trigger, Tooltip.Content
// side: 'top' | 'right' | 'bottom' | 'left', align: 'start' | 'center' | 'end', sideOffset: 4
```

### 10. Popover — 悬浮面板
```tsx
Popover.Trigger, Popover.Portal, Popover.Content, Popover.Close
```

### 11. HoverCard — 悬浮卡片
```tsx
HoverCard.Trigger, HoverCard.Content
```

### 12. ScrollArea — 自定义滚动区域
```tsx
ScrollArea, ScrollBar, ScrollArea.Viewport, ScrollArea.Corner
```

### 13. Collapsible — 折叠面板
```tsx
Collapsible, Collapsible.Trigger, Collapsible.Content
```

### 14. Separator — 分割线
```tsx
Separator, Separator.Horizontal, Separator.Vertical
// decorative?: boolean, orientation?: 'horizontal' | 'vertical'
```

### 15. Label — 表单标签
```tsx
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}
```

### 16. Avatar — 头像
```tsx
interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;      // 首字母 fallback
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
}
```

---

### 组件通用 Props 模式

| Props 类别 | 标准命名 | 说明 |
|------------|----------|------|
| 尺寸 | `size?: 'sm' \| 'md' \| 'lg' \| 'xl'` | 统一 4 档 |
| 变体 | `variant?: 'primary' \| 'secondary' \| ...` | 语义色驱动 |
| 状态 | `disabled?` `loading?` `error?` | 受控/非受控 |
| 布局 | `fullWidth?` `orientation?` `padding?` | 灵活组合 |
| 无障碍 | `aria-label?` `aria-describedby?` | Radix 自动注入 |
| 组合 | `asChild?` | Radix Slot 模式，透传 ref/props |
| 图标 | `leftIcon?` `rightIcon?` | Lucide React 兼容 |

---

## 视觉回归测试基线

### 测试矩阵
| 维度 | 配置 |
|------|------|
| **浏览器** | Chromium / Firefox / WebKit (Desktop + Mobile) |
| **主题** | Light / Dark |
| **视口** | Desktop (1280×800) / Tablet (768×1024) / Mobile (375×667) |
| **组件** | 16 核心组件 × 关键状态 |
| **总用例** | ~944 (16 组件 × 多状态 × 3 视口 × 2 主题 × 3 浏览器) |

### 关键状态覆盖
| 组件 | 测试状态 |
|------|----------|
| Button | default, hover, focus, active, loading, disabled, 各 variant/size |
| Card | default, hover, selected, 各 variant |
| Select | default, open, disabled, multiple, search, grouped |
| Tabs | default, active-tab-2, vertical/horizontal |
| Switch | default, checked, disabled |
| Input | default, focus, error, disabled, with icons |
| Tooltip | default, hover, 各 side/align |
| Dialog/AlertDialog | open, 各 size |

### 基线管理
```bash
# 生成/更新基线
npm run test:visual:update

# 运行回归测试
npm run test:visual

# 查看报告
npm run test:visual:report
```

### 阈值配置
```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,           // 最大像素差
    maxDiffPixelRatio: 0.001,     // 0.1% 像素差比例
    threshold: 0.1,               // 像素级阈值
  }
}
```

### 失败处理流程
1. **首次运行** → 自动生成基线（`--update-snapshots`）
2. **回归检测** → 失败用例输出 diff 图（实际/期望/差异）
3. **设计评审** → 设计确认是否为预期变更
4. **基线更新** → 确认后重新生成基线

---

## 设计交付检查清单

### ✅ 已完成（工程侧就绪）
- [x] **主题系统**：Light/Dark/System 三模式、CSS Variables 注入、SSR 防闪烁脚本
- [x] **语义色系统**：55 个语义色键、3 业务实体色、5 状态色、组件 Token 映射
- [x] **动效系统**：4 缓动、5 时长、6 关键帧、7 Transition、5 Variants、ReducedMotion
- [x] **国际化系统**：zh-CN/en-US、5 命名空间、懒加载、语言检测持久化
- [x] **16 核心组件**：类型安全、Radix 封装、复合组件模式、asChild 支持
- [x] **Storybook 8**：全组件故事、Controls/ArgsTable、Dark Mode Toolbar、a11y 插件
- [x] **视觉回归测试**：Playwright + pixelmatch、多浏览器/主题/视口、基线管理
- [x] **TypeScript 严格模式**：零类型错误、组件 Props 完整类型推导

### 📋 待设计交付
| 优先级 | 交付物 | 格式 | 截止 | 备注 |
|--------|--------|------|------|------|
| P0 | Light/Dark 语义色值表 | Figma Variables / JSON | 设计评审前 | 对应 `tokens/light|dark/base.ts` |
| P0 | 业务实体色色板（4态） | Figma Styles | 设计评审前 | Workload/Budget/Unit × base/hover/subtle/foreground |
| P0 | 状态色色板（4态） | Figma Styles | 设计评审前 | Primary/Success/Warning/Danger × 4态 |
| P0 | 组件 Token 映射表 | Markdown | 设计评审前 | 对应 `defaultComponentTokens` |
| P1 | 5 命名空间翻译文档 | JSON / Excel | 开发联调前 | zh-CN + en-US 完整对照 |
| P1 | 术语表 | Markdown | 开发联调前 | 业务术语统一定义 |
| P1 | 缓动曲线可视化 | Figma Prototype | 设计评审前 | 4 条标准贝塞尔曲线 |
| P1 | 时长阶梯 + Spring 参数 | Markdown | 设计评审前 | 5 级时长 + 3 spring 配置 |
| P1 | Variants 组合示例 | Storybook Stories | 设计评审前 | 已有代码，需设计验收动效手感 |
| P2 | 主题包扩展示例 | Figma / Code | V2 规划期 | 展示 `ThemePackageTokens` 覆盖效果 |

### 🔍 设计验收标准
| 检查项 | 验收方式 | 通过标准 |
|--------|----------|----------|
| 色值一致性 | Storybook Chromatic / 视觉回归 | 与 Figma Variables 像素级一致 |
| 动效手感 | Storybook 交互面板 | 缓动/时长/关键帧与设计规范一致 |
| 组件状态完整性 | Storybook ArgsTable | 所有 variant/size/state 可切换预览 |
| 国际化文案 | 切换语言 Toolbar | 5 命名空间全覆盖、无缺失键 |
| 无障碍合规 | Storybook a11y 插件 | 0 Violations、键盘可达、ARIA 完整 |
| 响应式断点 | 视口 Toolbar | Desktop/Tablet/Mobile 布局正常 |

---

## 附录：关键文件路径索引

| 系统 | 核心文件 | 说明 |
|------|----------|------|
| **主题** | `src/theme/ThemeProvider.tsx` | Provider + Context + Hooks |
| | `src/theme/semantic.ts` | 语义色映射、工具函数、组件 Token |
| | `src/theme/tokens/light/base.ts` | Light CSS Variables 定义 |
| | `src/theme/tokens/dark/base.ts` | Dark CSS Variables 定义 |
| **动效** | `src/motion/MotionProvider.tsx` | Provider + Context + Hooks + 预设 |
| **国际化** | `src/i18n/LocaleProvider.tsx` | Provider + Context + 命名空间 Hooks |
| | `src/i18n/resources/{zh-CN,en-US}/*.json` | 翻译资源文件 |
| **组件** | `src/components/ui/*.tsx` | 16 个核心组件实现 |
| | `src/components/ui/*.stories.tsx` | Storybook 故事 |
| **入口** | `src/providers/UIProviders.tsx` | 三合一 Provider 组合导出 |
| | `src/app/App.tsx` | 应用根组件使用示例 |
| **测试** | `tests/visual/core-components.spec.ts` | 视觉回归测试用例 |
| | `playwright.config.ts` | Playwright 多项目配置 |
| | `.storybook/main.ts` `preview.tsx` | Storybook 配置 |

---

## 版本历史

| 版本 | 日期 | 变更 | 作者 |
|------|------|------|------|
| v1.0 | 2026-11-02 | 初始版本：核心系统就绪、16组件完成、视觉回归基线建立 | Engineering |

---

> **文档维护**：本文档随 UI 系统演进同步更新。设计变更需同步更新 Figma Variables、Storybook Stories、翻译资源、视觉基线。
> **联系人**：前端技术负责人 / 设计系统 Owner