# ROADMAP.md — 独立开发线推进路线图

> 版本：v1.0（2026-10-21，经用户授权的自主推进模式）
> 定位：详细规划 + 逐步严谨执行与验证。每步验收标准明确，完成后留痕（git + AGENT_STATUS）。
> 升级规则：业务语义裁决 / 生产环境 / 真实数据 / 凭据 / 不可逆 / 权限外资源 → 呈报用户（场景式表述）；其余连续推进。

## 阶段总览

| 阶段 | 内容 | 性质 | 阻塞依赖 |
|---|---|---|---|
| **R0** | 工程可复现性基础设施（U-10） | 纯技术，完全自主 | 无 |
| **R1** | D-151 剩余①：撤回后自动重新 Resolution 接线 | 已裁定方向 + 配对范围按假设协议推进 | 无（假设记录 A-001 呈用户复核） |
| **R2** | D-151 剩余②：移动/解除关系语义 | **需用户裁决** | 场景式提案呈报 |
| **R3** | D-157 前置研究：拆分原则结构化表达 + 渠道模型 | 分析报告（裁定素材），只读不改语义 | 部分需用户裁决 |
| **R4** | 生产 DataService 适配器（deleteCards/deleteWorkloadResults 等全量接口） | 生产阻塞项 | **需用户裁决存储选型** |
| **R5** | UI 产品化（Canvas/Deck/Slot/Inspector） | 受 8-Gate 契约 | DESIGN HANDOFF 前禁止 |

**Deferred 不动**：sourceDataObjects（H-1 裁定 A）、second-card（D-148 CASE/SEE）、aggregate 执行能力（D-137~139）、数据库并发唯一性（WK §16.5）、"同一业务键撤回后重建"语义。

---

## R0｜工程可复现性基础设施（U-10）

**目标**：新环境可按文档一键复现验证链，消除"无 README、无版本锚、无 CI"风险（本机已有实测基线，落地为最低成本）。

| # | 事项 | 验收标准 |
|---|---|---|
| R0-1 | 新增 `README.md`（本工作线启动指引：恢复、安装、验证、边界声明） | 新 Agent 按文档可在隔离目录复现 424/424 |
| R0-2 | 新增 `.nvmrc`（锚定本线实测版本 v22.22.3；生成机 v22.14.0 亦经全量验证，README 记录兼容范围） | `nvm use` 可用 |
| R0-3 | `package.json` 增加 `engines`（`>=22.14.0 <23`）与 `verify` 脚本（typecheck + test + build 一键链） | `npm run verify` 全绿 |
| R0-4 | 全量验证 + git 提交 | verify 输出留痕 |

**边界**：CI（外部服务）暂不引入——无远端仓库，本地 verify 链即当前最优解；引入 CI 属权限外资源（需远端账号），届时呈报。

## R1｜D-151 剩余①：撤回后自动重新 Resolution

**语义依据**：D-151@Q-01-Q-09_DECISION_LEDGER.md#当前反馈只服务当前有效业务上下文；关系变化即失效并自动重新 Resolution——"自动"只表示自动重新分析和推荐，绝不自动执行业务动作（UserDecision 边界不变）。

**执行步骤**：
1. 只读研究：revocationEntry / revocationSubmissionService / revocationService（impact 计算对 assign 的处理）/ resolutionTrigger / dropTrigger / recommendationStore / feedbackInvalidation 测试模式。
2. 形成假设 **A-001**（配对范围）：五项必填记录入 DECISIONS-AND-ASSUMPTIONS.md。
3. 实现：撤回提交成功后，对假设界定的配对集合自动调用既有 resolutionTrigger（复用 D-142 稳定 ID / re-offer 语义，不新增推荐通道）。
4. 测试：撤回后自动重推的行为级断言（含"不自动执行"边界、D-142 语义回归）。
5. 全量 verify + 文档同步（AGENT_STATUS、Ledger 不改——Ledger 属快照权威，本线记录入 AGENT 层）+ git 提交。
6. 场景式呈报用户复核 A-001（非阻塞）。

**验收标准**：424 基线扩展且全绿；新测试证明"层撤回/全路径撤回后，符合假设的配对自动出现新推荐，且无任何业务事实被自动创建"。

## R2｜移动/解除关系语义（需用户裁决）

**准备**：只读梳理现状（关系建立后不可移动/解除，只能撤回重建）+ 用实际场景（王大夫工作量卡从内科挪到急诊科）编制方案 A/B/C 提案与后果对照，呈用户点选。裁定前不实现。

## R3｜D-157 前置研究（分析报告，裁定素材）

**目标**：不动语义，产出两份裁定素材：①"相同拆分原则/完整计算条件"的结构化表达候选方案（现状最大缺口）；②"渠道"正式模型表达候选（Open Question 2）。完成后以场景式呈报，供用户裁决后进入实现。

## R4｜生产 DataService 适配器（需用户参与）

**现状**：唯一实现 MockDataService 内存版；deleteCards/deleteWorkloadResults 生产侧零代码（生产阻塞）。
**路径**：先呈报存储技术选型场景（浏览器本地 IndexedDB / 桌面 SQLite+后端 / 其他），用户选定后按 D-143/D-148 迁移约束实现。**在选型裁定前不启动**。

## R5｜UI 产品化（受 8-Gate 契约）

DESIGN INPUT READY 等待人工输入（视觉方向/Design Brief/Source of Truth A/B 裁定）；本线不自行设计。可选准备项：ZCode 侧交接清单核对工具（契约 §5 的工程化辅助）——在用户启动 UI 阶段意愿明确后再做。

---

## 验证纪律（每步通用）

1. 每次代码修改后：`npm run verify`（typecheck + 全量测试 + build）全绿才算完成。
2. 基线演进记录：测试数只增不减（除非有裁定依据并留痕）。
3. 每阶段收尾：AGENT_STATUS.md 更新 + git commit（信息含验证证据摘要）。
4. 假设/推断一律 `[假设]` 标注，不冒充裁定；发现与封板语义冲突立即停下呈报。
