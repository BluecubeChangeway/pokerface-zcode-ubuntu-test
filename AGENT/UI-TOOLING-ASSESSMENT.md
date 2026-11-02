# UI-TOOLING-ASSESSMENT.md — UI 阶段工具链、插件、Skills、第三方能力评估

> **生成时间**：2026-10-29
> **目的**：全面评估当前 ZCode 平台能力缺口，规划 UI 阶段所需的新增/配置项
> **原则**：用户无前端经验、无设计供应商，**全权授权 AI 主导**；以专业医疗/绩效软件配色风格为基线，简约/清爽/清晰

---

## 一、当前 ZCode 平台已有能力清单（可直接复用）

### 1. 核心开发工具（已就绪）
| 工具/能力 | 状态 | 用途 |
|----------|------|------|
| **Node.js / npm / Vite** | ✅ 已配置 | 构建、开发服务器、热更新 |
| **TypeScript 5.x** | ✅ 已配置 | 类型安全、组件 Props 约束 |
| **React 18 + React DOM** | ✅ 已配置 | 组件模型、并发特性 |
| **Vitest + happy-dom** | ✅ 已配置 | 单元/集成/DOM 测试（432/432 通过） |
| **ESLint + Prettier** | ✅ 已配置 | 代码规范 |
| **Git** | ✅ 已配置 | 版本控制 |

### 2. ZCode 内置 Skills（已可用）
| Skill | 用途 | UI 阶段复用度 |
|-------|------|--------------|
| `documents:docx` / `docx-viewer` | Word 文档处理/查看 | 需求文档、设计交接文档 |
| `presentations:pptx` / `pptx-viewer` | PPT 制作/查看 | 设计评审演示 |
| `spreadsheets:xlsx` / `xlsx-viewer` | Excel 处理/查看 | Design Token 表格、色板管理 |
| `pdf:pdf` / `pdf-viewer` | PDF 生成/查看 | 设计规范导出 |
| `visualize:visualize` | 交互式可视化/仿真 | **关键**：设计 Token 预览、主题切换实时演示、色板对比、组件状态机可视化 |
| `browser-use:control-browser` / `web-gui-tester` | 浏览器自动化、GUI 黑盒测试 | **关键**：Playwright 视觉回归前的冒烟测试、真实浏览器交互验证 |
| `dynamic-workflows` | 多子代理编排 | UI 组件库批量生成、Storybook 批量写 Story |
| `skill-creator` | 创建新 Skill | 如需封装 UI 专用工作流 |

### 3. 现有项目配置
- `vite.config.ts`：已有基础配置
- `tsconfig.json`：严格模式
- `vitest.config.ts`：happy-dom 环境
- `.github/workflows/`：CI 雏形（需扩展视觉回归）

---

## 二、UI 阶段**必须新增/配置**的工具链

### 1. 样式系统核心（P0 —— 不装不能动工）
```bash
# 必装依赖
npm i -D tailwindcss@latest @tailwindcss/vite@latest
npm i clsx tailwind-merge  # className 合并工具
```
| 配置文件 | 用途 | 备注 |
|---------|------|------|
| `tailwind.config.ts` | Token 映射、主题扩展、暗色模式策略 | **必须**：`darkMode: 'class'` + 自定义色板 |
| `src/styles/tokens.ts` | Design Token 单一事实来源（JS/TS 对象） | 导出给 Tailwind + CSS Variables 双轨同源 |
| `src/styles/globals.css` | `@import "tailwindcss"` + CSS Variables 定义 | `:root` / `[data-theme="dark"]` 双套变量 |

### 2. UI 组件库原语（P0 —— Radix UI 方案）
```bash
npm i @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-tooltip \
  @radix-ui/react-scroll-area @radix-ui/react-separator @radix-ui/react-avatar \
  @radix-ui/react-switch @radix-ui/react-label @radix-ui/react-hover-card \
  @radix-ui/react-popover @radix-ui/react-collapsible
```
| 原语 | 覆盖 UI 需求 |
|------|-------------|
| `Dialog` / `Popover` / `HoverCard` | 推荐详情、参数面板、撤回预览、卡牌悬浮查看（U-UI-20） |
| `Tabs` | 四界面切换（数据清洗/画布/核算/导出/设置） |
| `Select` / `DropdownMenu` | 主题切换器、语言切换器、卡槽操作菜单 |
| `Switch` | 动效开关、主题跟随系统开关 |
| `ScrollArea` | 画布虚拟化、推荐列表、参数面板滚动 |
| `Collapsible` | 槽展开/折叠（U-UI-7 太阳能板意象） |

### 3. 国际化（P0）
```bash
npm i react-i18next i18next i18next-resources-to-backend i18next-browser-languagedetector
```
| 文件 | 用途 |
|------|------|
| `src/i18n/config.ts` | 初始化配置、namespace 拆分、懒加载 |
| `src/i18n/resources/zh-CN/*.json` | 中文资源（首批） |
| `src/i18n/resources/en-US/*.json` | 英文资源（首批） |
| `LocaleProvider.tsx` | 根级 Provider、语言切换逻辑、持久化 |

### 4. 动效（P0）
```bash
npm i framer-motion
```
| 文件 | 用途 |
|------|------|
| `MotionProvider.tsx` | 统一 `transition` 默认值、全局 `reducedMotion` 开关（U-UI-3） |
| `src/motion/presets.ts` | 预设缓动/时长/关键帧（供全项目复用） |

### 5. 图标（P0）
```bash
npm i lucide-react
```
- Tree-shakable、语义化命名、与 Tailwind/Radix 原生兼容

### 6. 主题系统架构（P0 —— 核心差异化能力）
```bash
# 无额外依赖，纯架构代码
```
| 核心模块 | 职责 |
|---------|------|
| `src/theme/ThemeRegistry.ts` | 主题包注册表（内置 light/dark + 扩展点） |
| `src/theme/ThemeLoader.ts` | 动态加载主题包（V2+ 支持远程/本地包） |
| `src/theme/tokens/` | 每个主题包的 Token 覆盖层 |
| `src/theme/semantic.ts` | **语义色映射表**（workload=blue、budget=green、unit=purple 等） |
| `ThemeProvider.tsx` | 运行时切换、CSS Variables 注入、localStorage 持久化、系统偏好监听 |

> **关键设计**：Token 分层 → `基础色板` → `语义色映射` → `组件级 Token` → `主题包覆盖层`，保证 U-UI-22 扩展性

### 7. Storybook 8（P1 —— 组件库交付标准）
```bash
npx storybook@latest init --builder vite
npm i -D @storybook/addon-a11y @storybook/addon-interactions \
  @storybook/test @chromatic-com/storybook storybook-dark-mode
```
| 配置 | 用途 |
|------|------|
| `.storybook/main.ts` | Vite builder、Story 目录、addons |
| `.storybook/preview.ts` | 全局装饰器：`ThemeProvider` + `LocaleProvider` + `MotionProvider` + Radix 主题 |
| `*.stories.tsx` | 每个原子组件的故事（交互态、a11y、主题预览） |

### 8. 视觉回归测试（P1 —— 质量闸）
```bash
npm i -D playwright @playwright/test pixelmatch pngjs
```
| 文件 | 用途 |
|------|------|
| `playwright.config.ts` | 多浏览器、视口、主题矩阵 |
| `tests/visual/*.spec.ts` | 关键页面/组件截图基线 + 对比阈值 |
| `scripts/visual-regression.ts` | 基线更新、CI 报告生成 |

---

## 三、推荐新增的 **ZCode Skills / 自定义工作流**

### 1. `ui-theme-generator` Skill（建议创建）
> **用途**：从设计参考图/色板自动生成 Tailwind Token + CSS Variables + 语义色映射
- 输入：用户提供的参考图（卡牌参考图等）、专业配色规范（如 Material 3 / Ant Design / Tailwind 官方色板）
- 输出：`tokens.ts`、`globals.css`、语义色映射表
- 调用：`visualize` 生成色板预览 → 用户确认 → 落盘

### 2. `storybook-batch` Skill（建议创建）
> **用途**：批量为原子组件生成标准化 Story 模板
- 基于组件 Props 自动推导 Controls、Args、交互测试用例
- 输出：`Button.stories.tsx`、`Card.stories.tsx` 等

### 3. `visual-regression-ci` Skill（建议创建）
> **用途**：封装 Playwright 视觉回归的 CI 流水线
- 基线管理、阈值配置、失败时自动生成对比报告（Diff 图）
- 集成 GitHub Actions / GitLab CI

### 4. `design-handoff` Skill（复用现有 `documents:docx` + `visualize`）
> **用途**：生成设计交接文档（Design Handoff Package）
- 包含：Token 表、组件清单、交互规范、响应式断点、a11y 清单
- 导出 DOCX + PDF + 交互式 HTML（`visualize` 生成）

---

## 四、第三方工具/服务集成建议

| 工具/服务 | 集成方式 | 用途 | 优先级 |
|----------|---------|------|--------|
| **Figma API / Figma MCP** | MCP Server 或 REST API | 如未来有设计师介入，同步设计 Token、组件规范 | P2（当前无设计师，可暂缓） |
| **Chromatic** | GitHub App + npm 包 | Storybook 云端视觉审查、组件库发布 | P1（免费额度足够） |
| **Playwright Trace Viewer** | 本地/ CI Artifact | 失败用例复现、交互轨迹分析 | P1 |
| **Bundle Analyzer** | `vite-bundle-analyzer` | 监控主题包体积、代码分包效果 | P2 |
| **Lighthouse CI** | GitHub Action | 性能/无障碍/SEO 回归守护 | P2 |

---

## 五、ZCode 平台配置清单（需人工在 ZCode 客户端操作）

### 1. MCP Servers（如需）
| Server | 安装命令 | 用途 |
|--------|---------|------|
| `figma-mcp` | `npx -y @modelcontextprotocol/server-figma` | 设计稿同步（可选） |
| `playwright-mcp` | `npx -y @playwright/mcp` | 浏览器自动化增强（可选，已有 browser-use） |

### 2. Slash Commands（建议新增）
| 命令 | 用途 |
|------|------|
| `/ui:token-sync` | 从参考图生成/同步 Design Token |
| `/ui:story-gen` | 批量生成 Storybook Stories |
| `/ui:visual-test` | 运行视觉回归、更新基线 |
| `/ui:theme-audit` | 审计当前主题覆盖度、语义色一致性 |

### 3. Hooks（建议新增）
| Hook | 触发时机 | 动作 |
|------|---------|------|
| `pre-commit:ui-tokens` | 提交前 | 检查 `tokens.ts` 与 `globals.css` 同步、无硬编码色值 |
| `pre-push:visual` | 推送前 | 跑核心页面视觉回归（可选，耗时） |
| `post-merge:storybook` | 合并后 | 自动部署 Storybook 到 Chromatic/GitHub Pages |

---

## 六、项目内部配置新增清单

### 1. `package.json` scripts 扩展
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:ui": "vitest --ui",
    "storybook": "storybook dev -p 6006",
    "build:storybook": "storybook build",
    "test:visual": "playwright test tests/visual",
    "test:visual:update": "playwright test tests/visual --update-snapshots",
    "theme:audit": "tsx scripts/audit-theme-tokens.ts",
    "i18n:extract": "tsx scripts/extract-i18n-keys.ts",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write ."
  }
}
```

### 2. 目录结构规划（UI 阶段新增）
```
src/
├── components/
│   ├── ui/              # 原子组件（Button, Card, Input, Select...）
│   ├── layout/          # 布局组件（AppShell, Panel, Sidebar, Toolbar...）
│   ├── canvas/          # 画布专用（Card, Slot, Connection, FocusTrail...）
│   ├── recommendation/  # 推荐列表/详情/参数面板
│   ├── revocation/      # 撤回预览/确认面板
│   └── settings/        # 设置面板（主题/语言/动效）
├── theme/
│   ├── ThemeProvider.tsx
│   ├── ThemeRegistry.ts
│   ├── ThemeLoader.ts
│   ├── semantic.ts      # 语义色映射
│   └── tokens/          # 主题包目录
│       ├── light/
│       ├── dark/
│       └── extensions/  # 未来：medieval/, magic/, sci-fi/
├── i18n/
│   ├── config.ts
│   ├── LocaleProvider.tsx
│   └── resources/
│       ├── zh-CN/
│       └── en-US/
├── motion/
│   ├── MotionProvider.tsx
│   └── presets.ts
├── styles/
│   ├── tokens.ts        # Design Token 单一事实来源
│   ├── globals.css      # Tailwind + CSS Variables
│   └── theme.css        # 主题变量注入工具类
├── hooks/
│   ├── useTheme.ts
│   ├── useLocale.ts
│   ├── useReducedMotion.ts
│   └── useKeyboardShortcuts.ts
└── providers/
    └── UIProviders.tsx  # 根级 Provider 组合（导出给 App.tsx）
```

### 3. `vite.config.ts` 关键扩展
```typescript
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
      '@/components': '/src/components',
      '@/theme': '/src/theme',
      '@/hooks': '/src/hooks',
    },
  },
  // Storybook 8 Vite builder 兼容
  optimizeDeps: {
    include: ['@radix-ui/react-*', 'framer-motion', 'lucide-react'],
  },
})
```

---

## 七、实施路线图（工具链视角）

| 周期 | 里程碑 | 关键产出 |
|------|--------|---------|
| **Week 1** | 基础设施就绪 | 依赖安装、Tailwind/Radix/i18n/Motion 配置完成、ThemeProvider 三件套跑通、CSS Variables 切换可演示 |
| **Week 2** | 原子组件库 + Storybook | 15+ 原子组件、Storybook 可访问、a11y 通过、主题切换在 Storybook 中可预览 |
| **Week 3** | 四界面壳层 + 卡牌画布 | AppShell、Tabs 切换、卡牌画布组装、拖拽/聚焦/槽交互接线验证 |
| **Week 4** | 绩效核算 + Settings | 推荐列表/参数面板/撤回入口组装、Settings 界面（主题三模式/语言/动效开关） |
| **Week 5** | 视觉回归 + CI + 交付 | Playwright 基线建立、GitHub Actions 全链路、`npm run dev/storybook/test:visual` 全通 |

---

## 八、风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| **Tailwind v4 配置破坏性变更** | 构建失败、Token 不生效 | 锁定 `@tailwindcss/vite` 版本、充分测试 `darkMode: 'class'` |
| **Radix UI 无样式导致视觉空白** | 组件不可用 | 必须先写组件级基础样式（`globals.css` 含 Radix 重置） |
| **framer-motion 与 happy-dom 不兼容** | 单测报错 | 测试环境用 `MotionProvider` 注入 `reducedMotion: true` 或 mock `useReducedMotion` |
| **主题包扩展点设计不当** | V2 重构成本高 | 先做 `ThemeRegistry` 抽象接口、Token 分层严格隔离、语义色映射表先行 |
| **i18n 命名空间爆炸** | 维护成本高 | 按界面/功能拆分 namespace（`canvas`, `recommendation`, `revocation`, `settings`, `common`） |
| **视觉回归基线维护负担** | CI 耗时、误报 | 只对关键页面/组件做回归、设置合理阈值（0.1% 像素差）、失败时自动生成 Diff 报告 |

---

## 九、立即行动清单（下一步可直接执行）

1. **创建 `UI-READINESS.md` 完整版**（已完成更新，含 U-UI-21/22/23）
2. **执行依赖安装**（上文 P0 清单）
3. **创建 `tailwind.config.ts` + `tokens.ts` + `globals.css`** 三件套
4. **实现 `ThemeProvider` + `LocaleProvider` + `MotionProvider`**
5. **配置 Storybook 8 + 添加暗色模式插件**
6. **建立首批原子组件**（Button、Card、Select、Tabs、Switch、Tooltip）
7. **编写视觉回归基础设施**（Playwright config + 首个测试用例）

---

## 十、需用户裁决的关键决策点（纳入 UI-READINESS.md 等待）

| 决策点 | 选项 | 推荐 | 备注 |
|--------|------|------|------|
| **首批语言范围** | zh-CN only / zh-CN+en-US / 更多 | zh-CN+en-US | 医疗术语表双语对照需确认 |
| **主题三模式默认值** | light / dark / system | system | 跟随系统最符合现代应用预期 |
| **语义色映射表基线** | Tailwind 官方色板 / Material 3 / 自定义 | Tailwind 官方色板（蓝/绿/紫/橙/红） | 专业医疗软件常用蓝/绿主色调 |
| **卡牌参考图风格定调** | 用户提供参考图 → AI 抽取色板 | 等用户提供参考图 | 无参考图时用 Tailwind 专业色板做基线 |
| **是否启用 Chromatic** | 是 / 否 | 是（免费额度） | 组件库视觉审查、自动发布 |
| **视觉回归阈值** | 0.1% / 0.5% / 1% 像素差 | 0.1% | 严格模式，避免视觉退化 |

---

> **下一步**：请确认上述工具链评估无遗漏，我将开始执行 **依赖安装 + 三件套配置 + Provider 三件套** 的落地工作。同时请提供**卡牌参考图**（如有），用于色板提取与 Token 基线定调。