# UI Design Operating Contract / Phase Gate

> 本文档是「正式 UI 设计阶段如何进入项目、如何交给 ZCode、如何验收」的**运行契约**。
> 它**不是**视觉设计规范，不定义任何品牌色、卡牌风格、布局范式或游戏化程度——这些属于 Human Product Decision（见 §4）。
> 本文档不改变任何既有 Decision（D-001～D-149）与 AGENTS.md 规则，只把它们转化为 UI 工程阶段的承接机制。
> 本文档为 Preparation Only：建立进入条件与交接机制，不设计、不实现。

---

## 1. UI Phase Gate

```text
PREPARATION → DESIGN INPUT READY → DESIGN DIRECTION LOCKED → UI DESIGN
→ DESIGN HANDOFF → UI IMPLEMENTATION → VISUAL QA → ACCEPTANCE
```

| Gate | 输入 | 输出 | 负责方 | ZCode 允许写代码？ | 进入下一阶段的条件 |
|------|------|------|--------|------------------|------------------|
| **PREPARATION** | 本文档 + UI Design Readiness Audit 结论 | 工程承接机制就绪 | ZCode（机制）+ Human（确认本契约） | 仅限本文档，禁止 UI 代码 | 本契约被人工确认 |
| **DESIGN INPUT READY** | Human 提供 Design Brief 草案 / 视觉参考 / 产品方向输入 | 可供设计决策的输入集合 | Human（主）/ ZCode（指出缺失项与工程冲突） | 否 | 输入覆盖 §6 Handoff 最小集或明确声明哪些项缺失且如何补齐 |
| **DESIGN DIRECTION LOCKED** | DESIGN INPUT READY 的输出 | 视觉方向定案：视觉语言、信息层级、布局范式取舍 | **Human（唯一裁决）** | 否 | 人工明确宣布方向锁定 |
| **UI DESIGN** | 锁定的方向 | 设计稿 / Design Tokens / Component·Interaction·Responsive Spec | Human / 外部设计工具（ZCode 当前无设计生成能力） | 否 | §6 Handoff 契约全部满足 |
| **DESIGN HANDOFF** | UI DESIGN 输出 | 一次完整、可执行的交接包（§6） | Human → ZCode | 交接验证类代码（token 解析脚本等，不触及产品 UI） | ZCode 确认交接包完整、无阻断性歧义，并把歧义全部列报 |
| **UI IMPLEMENTATION** | 交接包 | React UI 实现 + automated tests | **ZCode** | 是（仅限表现层，见 §8 隔离原则） | 实现完成 + 行为测试全绿 |
| **VISUAL QA** | 实现 + 运行中的 App | 截图证据 + 问题分类清单 | **ZCode 执行**（§7 流程）；严重度裁定含 Human | 修正实现（不改变设计语义） | 所有 P0/P1 视觉问题关闭 |
| **ACCEPTANCE** | VISUAL QA 输出 | 正式验收结论 | **Human** | 否 | 人工宣布验收通过 |

### 两条硬性 Gate 规则（禁止条款前置）

1. **没有 DESIGN DIRECTION LOCKED：ZCode 不得自行设计正式视觉方向。** 包括但不限于：选择品牌色、定义卡牌视觉语言、决定游戏化程度、确定布局范式。
2. **没有 DESIGN HANDOFF：ZCode 不得根据自身审美自行补齐正式 UI 视觉细节。** 实现中遇到的视觉空白必须列为 Issue 并回到 Human（见 §9）。

---

## 2. 当前状态归位

- **正式产品 UI 设计：尚未开始（NOT STARTED）。**
- 已有的 `src/app/`（App / Canvas / Recommendation / Confirm UI）定义为 **Runtime Verification UI / Vertical Slice**——其作用是验证 Q-09-C Runtime 契约，不是正式 Product UI Design。
- 未来正式 UI 阶段开始后，这些 Runtime UI 可以作为：
  - **行为参考**（交互链路已被行为级测试验证）；
  - **业务验证参考**（推荐生命周期 / confirm 流程已闭合）；
  - **技术验证参考**（store 订阅 / DnD 事件 / DOM 测试 harness 已可用）。
- 但 Runtime UI **不能自动成为正式视觉设计的 Source of Truth**，也不代表 UI 设计已完成。

---

## 3. 职责边界

### A. Human Product Decision（必须由人工裁决，ZCode 不得代行）

- 产品目标与信息优先级；
- 医院专业性与游戏化程度的取舍；
- 卡牌视觉语言（Card 视觉风格、Skin 方向——受 D-057/D-058 约束：Skin ≠ 业务类型）；
- Deck / Canvas / Inspector 的正式范式；
- 品牌色 / 主题方向（D-058：完整主题属 V2+，V1 只需定 V1 视觉语言）；
- 信息密度与正式视觉层级；
- 任何会改变用户对业务对象理解的取舍。

### B. Design Source / Design Input（设计侧输入，由 Human 或外部设计工具产出）

- 视觉稿（Figma / 图片 / 其他任意形态——以 §5 裁定为准）；
- 设计参考图；
- Design Brief；
- Visual Direction；
- Design Tokens；
- Component / Interaction Spec；
- Responsive Spec。

### C. ZCode Engineering Responsibility（工程承接，ZCode 负责）

- UI 结构实现；
- Design token 工程化（token 文件 / 主题接入）；
- Component implementation；
- State / interaction implementation；
- Responsive implementation；
- Accessibility implementation；
- Automated tests（行为级）；
- Browser interaction verification（browser-use）；
- Screenshot capture（证据留档）；
- Visual QA execution（§7 流程）；
- 根据明确设计反馈进行修正。

**边界规则**：ZCode 可以提出工程实现建议（性能、可测性、结构），但**不得把工程建议升级为未经确认的产品/视觉决策**。工程建议以建议形式列报，由 Human 裁决。

---

## 4. Source of Truth 三层分类

本契约**不替 Human 选择最终方案**，只定义候选形态与职责，概念严格区分如下：

### 一、Design Source of Truth（设计真源——候选仅 A / B，由 Human 未来裁定）

| 候选 | 含义 | 职责 |
|------|------|------|
| A. 原始设计工具 | 如 Figma 文件 | 设计真源；工具内改动即设计改动，需要重新进入 Design Handoff |
| B. 设计文档 + 参考图 | 设计描述 + 图片（当前环境下最可行的形态） | 设计真源；文档/图片变更即设计变更，需要重新进入 Design Handoff |

### 二、Engineering Source of Truth（工程真源）

| 形态 | 含义 | 职责 |
|------|------|------|
| C. 经确认的 Design Tokens / Component / Interaction / Responsive Spec | 从 A/B 固化的工程契约 | 工程真源；实现以此为准。**C 是设计真源的工程固化产物，本身不是设计真源** |

### 三、Implementation Truth（实现真源）

| 形态 | 含义 | 职责 |
|------|------|------|
| D. 实际实现代码 | 表现层代码 | 实现真源；受 C 约束，**不得反向成为设计真源** |

### 关键概念

**Design Source of Truth 与 Engineering Source of Truth 不是同一个概念。**
A/B 回答"设计以什么为准"；C 回答"工程以什么为准"；D 只是"当前代码长什么样"。

### 变更分类

- **修改 A / B** → 属于**设计变更**，需要重新进入 Design Handoff；
- **修改 C 的设计语义** → 属于**设计契约变更**，需要重新经 Human 确认（因为 C 的语义来自 A/B）；
- **纯 D 实现修正** → 属于**工程实现修正**，不构成设计变更。

### 未来任何时刻必须能回答

- **当前设计以什么为准？** → **A 或 B**（具体哪种由 Human 裁定，本契约不代选）。
- **当前工程以什么为准？** → **C**。
- **当前代码是什么？** → **D**（实现真源，受 C 约束）。
- **设计与实现冲突时？** → **Design Source of Truth（A/B）优先**；实现偏差为实现 Issue，修实现不修设计（除非 Human 裁定设计本身要改）。
- **工程代码是否可反向成为设计真源？** → **不得。** 工程代码（D）与工程契约（C）都不具备设计真源地位；任何"以现有代码为准"的默认都是对 §8 禁自补设计规则的违反。

> **待人工裁定（Open Question）**：本项目最终采用 A 还是 B 作为设计真源。这是 UI 阶段开始前的第一项人工决策。

---

## 5. Design → Code Handoff Contract

未来设计交给 ZCode 时，交接包**至少**应具备以下项（定义"必须存在"，不虚构内容）：

| 项 | 说明 | 缺失后果 |
|----|------|---------|
| Design Brief | 产品/界面目标与信息优先级 | ZCode 无法判断实现取舍 → 列报阻塞 |
| Visual Direction | 视觉方向（参考图 / 描述） | ZCode 不得自行补 → 列报阻塞 |
| Tokens | 颜色 / 字体 / 间距 / 圆角 / 阴影 / 动效参数等 | 表现细节无法工程化 → 列报缺失项 |
| Component rules | 组件清单与外观/行为规则 | 结构无法映射 → 列报缺失项 |
| Layout rules | 布局结构（Deck / Canvas / Inspector 范式） | ZCode 不得自创布局 → 列报阻塞 |
| Interaction rules | 交互规范（拖放 / focus / hover / states） | 交互空白 → 列报，按 §9 处理 |
| Responsive rules | 响应式断点与行为 | 缺失则按"未定义"列报，不得自行发明 |
| States | 组件状态集（default / hover / selected / disabled / dragging / recommended 等） | 状态空白 → 列报 |
| Assets | 图标 / 图片资源或其获取方式 | 列报缺失 |
| Source-of-truth reference | §4 裁定的真源指向 | 无法仲裁冲突 → 阻塞 |
| Acceptance criteria | 验收标准 | ACCEPTANCE Gate 无法判定 |

交接时 ZCode 的动作：**逐项核对 → 完整性判定 → 把所有缺失/歧义项列成明确清单 → Human 补齐后才进入实现**。不得默默补齐。

---

## 6. Visual QA Contract

基于当前已存在的：browser-use（control-browser / web-gui-tester）+ screenshot + DOM/interaction verification + 363/363 baseline。

### 最小闭环

```text
Design Input → Implementation → Browser Render（npm run dev + browser-use 打开 localhost）
→ Screenshot（每关键状态留档）→ Visual Inspection（截图 + Read 证据）
→ Interaction Verification（真实点击流 + 只读 DOM 交叉验证）
→ Issue classification → Fix（实现层）→ Re-test → 证据复截
```

### 验收维度（不得互相替代）

| 维度 | 判定内容 | 证据形式 |
|------|---------|---------|
| 功能正确 | 业务行为按预期发生 | 行为测试 + DOM 状态 |
| 交互正确 | 用户路径按 Interaction rules 响应 | 点击流 + DOM |
| 布局正确 | 结构/位置/层次符合 Layout rules | 截图 |
| 视觉一致 | 颜色/字体/间距/状态样式符合 Tokens/Direction | 截图 + token 对照 |
| 响应式正确 | 各断点行为符合 Responsive rules | 多宽度截图 |

**硬规则**：**"测试通过" ≠ "视觉通过"**——363/363 行为测试绿是必要条件，视觉维度必须由截图证据 + token 对照单独判定。

### 已知能力缺口（如实记录）

- 无自动网页视觉 diff 代理（visual-judge 系列仅覆盖文档/图表渲染物）；视觉一致由截图 + ZCode 目视判读执行，**可运行但非自动化**。
- 后续若引入专用工具（视觉回归工具、真机截屏），属工具决策，另行裁定。

---

## 7. UI 与 Domain 的隔离原则（既有裁定的工程化转写，非新决策）

- `visualGroup / visualCode / badgeCode / skinId` 等字段是**表现层锚点**（domain 模型自带的展示属性）；
- **视觉属性不得反向成为业务判定条件**：Card Color / Skin / Icon 不得承担业务语义（D-057）；
- Domain 不依赖具体 CSS / 组件 / 视觉主题；视觉主题属 V2+（D-058：V1 为 Skin 系统预留架构边界，不实现完整主题/Skin Marketplace）；
- Canvas / Deck / Inspector 是表现层；Relation / Workload / Unit / Budget 业务事实仍由 domain 层唯一负责；
- 表现层改动（AGENTS §18：卡片颜色、皮肤、图案、图标、动画、发光、堆叠、卡牌展开效果、视觉主题、游戏化表现）**不改变任何业务语义**。

以上为 D-057 / D-058 / AGENTS §18 既有裁定的 UI 工程化转写，不重新解释、不新增业务决策。

---

## 8. 禁止 ZCode 自行补设计（长期规则）

**当设计输入不完整时，ZCode：**

允许：
- 指出缺失项（对照 §5 Handoff 清单）；
- 指出工程冲突（如实现结构与布局规则矛盾）；
- 提供实现候选（标注"候选"，等 Human 选择）；
- 提供技术风险与可验证性建议；
- 提供 token 工程化方案。

不允许：
- 默默自行选择视觉方向；
- 自行发明品牌色 / 品牌色系；
- 自行改变信息层级；
- 自行改变卡牌语义；
- 自行引入新的交互范式；
- 以"代码方便"为理由改变产品设计。

违反即停下、列报、等 Human 裁决。**这不是流程偏好，是运行契约的硬规则。**

---

## 9. 与现有项目阶段的关系

- Q-01～Q-09（含 Q-09-C Interaction Runtime，2026-10-07 CLOSED / PASS）全部已关闭；本契约不触碰其任何决策正文。
- **当前 Q-09-C 结束后，项目下一条正式 UI 主线是：**

```text
PREPARATION
→ DESIGN INPUT READY
→ DESIGN DIRECTION LOCKED
→ UI DESIGN
→ DESIGN HANDOFF
→ UI IMPLEMENTATION
→ VISUAL QA
→ ACCEPTANCE
```

- **完整 Canvas / Deck / Slot 产品化、完整 Matching Basis Inspector、DataService production adapter 属于后续产品化 / 基础设施工作，必须遵守：**
  - **不能绕过上述 UI Design Gate**——正式 UI 实现只能从 DESIGN HANDOFF 之后开始；
  - **不能因为已有 Runtime UI 就直接开始正式 UI 实现**——竖切片不是 Handoff；
  - **基础设施工作若独立进行（如 DataService production adapter），不得改变正式 UI 设计真源**（§4 的 A/B 裁定状态不因基础设施进度而被动"顺带"成立）。
- **Runtime Verification UI 的定位**：只能作为行为 / 业务 / 技术参考；**不得将 Runtime UI 自动"升级"为正式 Product UI**。
- ZCode 当前角色边界（经 Readiness Audit 确认）：**能承接工程实现与 Visual QA 执行，不具备设计生成能力**；设计方向必须由 Human 或外部设计输入提供。

---

## 10. Readiness Checklist

| 项 | 状态 | 说明 |
|----|------|------|
| [x] UI Phase Gate 定义 | **具备** | 本文档 |
| [x] 职责边界定义 | **具备** | §3 |
| [x] Design→Code Handoff 契约 | **具备** | §5（定义"须存在什么"） |
| [x] Visual QA 流程定义 | **具备** | §6 |
| [x] UI/D 隔离原则 | **具备** | §7（既有裁定的工程化转写） |
| [x] Browser screenshot 验证能力 | **具备** | browser-use / web-gui-tester / Read 图片 |
| [x] 行为测试基线 | **具备** | 363/363 PASS |
| [x] 契约文档归档 | **具备** | 本文档 |
| [ ] Product direction confirmed | **不具备，必须人工** | 视觉语言 / 游戏化取舍 / 优先级 |
| [ ] Design Brief exists | **不具备，必须人工** | ZCode 可起草模板，内容必须人工 |
| [ ] Visual Direction exists | **不具备，必须人工或外部设计输入** | ZCode 无设计生成能力 |
| [ ] Design Source of Truth confirmed | **不具备，必须人工**（Open Question） | §4 候选 A/B 的选择 |
| [ ] Tokens defined | **不具备，由后续设计产出 + ZCode 工程化** | |
| [ ] Component rules defined | **不具备，由后续设计产出** | |
| [ ] Interaction rules defined | **不具备，由后续设计产出** | |
| [ ] Responsive rules defined | **不具备，由后续设计产出** | |
| [ ] Design → Code handoff ready | **不具备，依赖上方各项** | |
| [ ] Acceptance criteria ready | **不具备，由后续设计产出** | |

### 结论

**工程承接侧（ZCode）已就绪**：Gate 机制 / 交接契约 / Visual QA 流程 / 隔离规则 / 截图验证能力全部具备。
**设计侧（Human）未就绪**：视觉方向、Design Brief、Source of Truth 裁定、Tokens/Spec 全部等待人工输入。

**下一 Gate：DESIGN INPUT READY——等待人工提供产品方向与设计输入（含 Source of Truth 裁定）。**
