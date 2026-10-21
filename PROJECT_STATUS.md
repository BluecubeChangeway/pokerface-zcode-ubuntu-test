# PROJECT_STATUS.md

> 医院绩效卡牌系统当前项目状态快照
>
> 本文件只回答一个核心问题：
>
> **“现在项目做到哪里了？哪些已经确定？哪些不能重新打开？下一步尚未开始什么？”**
>
> 详细历史与设计背景请参阅 `PROJECT_MASTER_CONTEXT.md`。
> 正式阶段裁定请参阅 `Q-01-Q-09_DECISION_LEDGER.md`（Q-01～Q-09 决策与 D-118～D-155 交互/撤回裁定）与 `docs/UI_DESIGN_OPERATING_CONTRACT.md`（UI 阶段契约）。

---

# 1. 当前状态

## 当前阶段

**Q-09-C Interaction Runtime：CLOSED / PASS（2026-10-07）**

核心生产闭环已全线贯通并经行为级（真实 React DOM）测试验证：

Drop → Resolution → Recommendation（D-142 稳定 ID）→ Matching Basis（D-149 Snapshot + 最小展示）
→ Confirm / Cancel / Dismiss → ActionExecutor → ActionSubmissionService
→ Domain Fact 持久化闭环（在 MockDataService 内存环境中验证） → accepted / ignored / dismissed。

关键契约全部落地并验证：accepted 只发生在事实持久化成功之后；cancel → ignored、dismiss → dismissed（P2-6 通道隔离 + spy 直接证据）；D-142 re-offer；D-145 identity 省略路径（split UI 不携带 placeholder id）；D-146 幂等恢复；D-147 显式 id 唯一；D-148 锚点型 identity + D-142 split re-confirm 回归；D-149 Matching Basis Snapshot（含 D-142 re-offer 快照更新与引用隔离）。
服务级链路（ResolutionContextBuilder 生产接入 D-139、Relations/workloadAssignments/mappingEvidences 投影 + evidence gate、Production Trigger、confirm_* 持久化闭环 D-144~148、状态闭环 P2-6）与 UI 竖切片（原生 DnD / Deck→Canvas 真实数据流 / Recommendation 列表+选择+详情 / Matching Basis 最小展示 / Confirm·Cancel·Dismiss / confirm_split 参数确认）均为本阶段 CLOSED 内容。

（边界说明：本阶段验证全部基于 MockDataService 内存持久化；"生产链路 / 生产入口 / Production"为项目术语，指**生产代码路径**（相对 mock 测试适配层），非真实生产后端。生产 DataService 适配器、生产持久化、数据库事务与并发控制未实现。）

## D-150 Drop → Relation 闭环：CLOSED / PASS（2026-10-09）

合法 Drop 先建立并持久化 workload_assign（dropTrigger → ActionSubmissionService.submitDropAssignRelation；P2-1 同业务键幂等，方向 UnitCard→WorkloadCard，metadata.origin="drop" 不参与业务键），持久化成功或确认已有 active 关系之后才触发 Resolution → Recommendation；持久化失败返回 relation_failed（不触发 Resolution、不注册 Recommendation，经既有 actionError 通道透出）；无效 Drop（含目标卡不存在/类型不符）与 revoked 卡（D-154）静默忽略。真实撤回产物 → 再次合法 Drop 组合场景已验证（revocation.test.ts：旧 assign 不复活、新 active 关系、持久化先于推荐注册）。关闭基线：**392/392 PASS（21 文件）**，typecheck PASS，build PASS。边界如实记录："同一业务键撤回后重建"语义未定义、未实现；数据库级并发唯一性保证仍属后续事项（WK §16.5 Deferred）。

## 实施记录与剩余阻塞项（原"下一项工作"；撤回入口与 D-151 A① 已完成，仅生产适配器等项未开始）

**撤回链实施记录（2026-10-09，Mock 内存环境）+ 生产适配器删除能力（持续生产阻塞项）**：撤回语义 D-153～D-156、D-158 已裁定；**D-156 + D-158 第一阶段已于 2026-10-09 在内存运行时实现并验收**——记录级闭包（collectDerivedResultsByRecords，含失活分支与多批次）、物理删除派生卡/结果（DataService deleteCards/deleteWorkloadResults，MockDataService 按 ID 过滤、不存在 = no-op）、来源不明对象 manualReview 清单（不删除；Case A 孤儿 Result 为声明盲区）、六阶段有序提交（标记记录先行）、防复活终结检查前置（executor + 持久化边界，显式/生成型双路径，正常批次幂等保持）、五个失败阶段逐一注入重试收敛、失败窗口内旧 UserDecision retry 拒绝（组合回归实测）。**撤回入口已接线（revocationEntry）**：层撤回（D-153）与全路径撤回（D-158）两个语义互斥入口；全路径为"只读预览 → 用户确认 → 执行"三段式——预览展示具体对象身份（待删卡/结果、失效核算、软删关系、manualReview 清单，非仅数量）；**确认范围守卫**在执行前重新计算影响集并与预览全字段比较，不一致在提交前中止（本次撤回零写入）并要求重新预览。该实施轮基线 414/414（23 文件，2026-10-09 实施轮实测；D-151 A① 实施轮后最新基线见下方 424/424，当前有效）。**生产阻塞**：生产 DataService 适配器尚未实现 deleteCards/deleteWorkloadResults——生产物理删除能力为后续阻塞项（MockDataService 为内存实现，不代表生产适配器完成；生产级事务/并发控制亦未实现，属 WK §16.5 Deferred）。仍待裁定：人工清单持久化形态、一果多卡缺失引用呈现（second-card，D-148 暂缓）、被删对象审计记录方式。其余后续项（完整 Canvas/Deck/Slot 产品化、完整 Inspector、DataService production adapter、sourceDataObjects、second-card、aggregate 能力、**D-151 剩余运行时接线（撤回后自动重新 Resolution、移动/解除关系路径；其中"撤回后旧反馈失效"A① 已于 2026-10-10 完成接线并验收）**）保持归档/Deferred 状态不变。

**D-151 A① 撤回后旧反馈失效（2026-10-10 已实现并验收）+ D-154 确认安全检查**：三个撤回入口（守卫确认/直通/层撤回）在撤回提交成功后按**当前事实状态**实时失效旧反馈——仅处理 kind=resolution 且 status=recommended 的推荐；双信号判定（锚点 WorkloadCard 不存在或 revoked；适用的 payload.targetResultId 结果不存在或 revoked）；预览、取消、守卫拒绝不触达；失效失败后重跑撤回入口按当前事实重算即收敛（removeRecommendation 故障注入测试验证）；accepted/ignored/dismissed 历史与非 resolution kind 不触碰；D-142 稳定 ID / re-offer / 状态机不变。同批补齐 D-154 确认安全检查（executor：executeUseExistingResult 目标卡 / executeFindExistingWorkload 目标父卡 / executeSplitWorkload 主体卡+父 Result；confirm_use_current 经委托路径接受同一检查）。测试覆盖：feedbackInvalidation.test.ts 10 项（A–K 行为断言 + H-2 已修为 confirm_use_existing_parent 真实分发 + confirm_use_current revoked 主体卡直接测试）。当前基线 **424/424（24 文件，2026-10-10 实施轮实测；本轮文档轮未重跑）**。**边界与 D-151 整体状态**：以上撤回链与 A① 已实现部分均为 **MockDataService 内存环境**实现（不代表生产持久化/事务/并发已实现）；**D-151 整体仍未完成**——剩余 = ①撤回后自动重新 Resolution（目标配对范围待澄清）②移动/解除关系操作路径（语义待产品裁定）。

**拆分结果跨渠道匹配复用（D-157，2026-10-09 已裁定、未实现）**：按需创建（规则 A/D 创建侧）现状已由 confirm_split 参数化满足；实施前置 = "相同拆分原则/完整计算条件"的结构化表达（当前无持久拆分条件记录，最大缺口）、"渠道"的正式模型表达、跨批次锚点/内容匹配复用服务（现状同锚点新批次会建第二份 Result，splitService.ts:322-325）、second-card（D-148 暂缓）能力裁决。**D-156 × 共享复用冲突已由 D-158（方案 A）裁决：整条路径撤回彻底删除优先于规则 E 共享保护，复用不构成保留理由。**

明确边界（关闭时归档，非未完成）：
- 当前 App / Canvas / Recommendation / Confirm UI 属于 **Runtime 验证用最小竖切片**，不代表正式产品 UI 设计完成；
- 完整 Canvas/Deck/Slot 产品化、完整 Matching Basis Inspector、DataService production adapter 属于**后续产品化 / 基础设施阶段**（归档记录，不属 Q-09-C 未完成）；
- sourceDataObjects 保持 H-1 裁定 A 的 DEFERRED（Phase 2，不伪造）；
- 已有 Result 创建第二张 WorkloadCard 保持 D-148 CASE/SEE 暂缓；
- aggregate 执行能力保持确定性 capability boundary（D-137~139）。

## 已完成阶段

```text
Q-01   CLOSED
Q-02   CLOSED
Q-03   CLOSED
Q-04   CLOSED
Q-05   CLOSED
Q-06   CLOSED
Q-07   CLOSED
Q-08   CLOSED
Q-09-A CLOSED / PASS
Q-09-B Resolution Domain Engine    CLOSED / PASS
Q-09-B Runtime Boundary           CLOSED / PASS
Q-09-C Atomicity & Failure Recovery CLOSED / PASS
Q-09-C Interaction Runtime        CLOSED / PASS（2026-10-07）
```

## 当前阻塞问题

```text
P0：无
P1：无
```

目前没有已确认需要立即修复的实质性领域语义问题。

---

# 1.1 Q-09-C Atomicity & Failure Recovery 状态

Status:

```text
CLOSED
```

Result:

```text
PASS
```

Completed:

```text
deterministic ID retry guarantee
upsert persistence recovery
failure recovery tests A-E
Recommendation status gate
Decision Ledger completed
```

核心保证：

```
Recoverable Commit（可恢复提交）
```

不是：

```
Transaction Atomicity（数据库事务原子提交）
```

固定持久化顺序：

```
1. WorkloadResult
2. WorkloadCard
3. workload_split Relation
4. WorkloadSplit
5. Recommendation accepted
```

任何 persistence step 失败时：

- Recommendation 不得进入 `accepted`
- 保持 `recommended`
- 允许 retry

Retry 幂等机制：

| 实体 | 幂等依据 |
|------|---------|
| WorkloadResult | deterministic child Result ID + upsert |
| WorkloadCard | `generateStableCardId(recommendationId, childWorkloadResultId)` + upsert |
| WorkloadSplit | deterministic Split ID + upsert |
| Relation | 业务唯一约束 `(type + sourceId + targetId)`，非 Relation.id |

测试覆盖：

| 测试 | 场景 |
|------|------|
| Test A | saveWorkloadSplits 失败 → retry 恢复 |
| Test B | D-120: 不同 Recommendation 对同一 Result 创建不同 Card |
| Test C | 同一 Recommendation retry 幂等 |
| Test D | saveWorkloadResults 失败 → retry 恢复 |
| Test E | saveCards 失败 → retry 恢复 |

测试入口：

```
recommendationStore.executeDecision()
→ ActionExecutor
→ ActionSubmissionService
→ DataService
```

阶段关闭时点基线（Q-09-C Atomicity 关闭时，2026-10-01；已被 §1 当前基线取代——最新为 424/424）：

```text
Tests: 226 passed
Typecheck: PASS
Build: PASS
```

---

# 2. 当前最重要的状态判断

**不要重新打开 Q-01～Q-08。**

Q-01～Q-08 已经经过：

- 设计讨论
- 领域裁定
- 代码实现
- 测试
- 专项审查
- 历史阶段封板

后续开发如果发现与既有设计相关的问题：

> 先检查既有 Decision / Invariant / Git Commit，再决定是否真的需要重新裁定。

不要因为后续代码实现便利而自动改变既有领域语义。

---

# 3. Q-09-A 状态

Q-09-A 主要解决：

> Workload Result、Workload Card、Unit Card 之间的 Resolution / Recommendation 领域模型问题。

---

## 3.1 Q-09-A 已确认 Decision

### D-118

Workload Result：

> Statistical Fact

Workload Card：

> Business-use Carrier

---

### D-119

Workload Card：

```text
workloadResultId
```

不复制 Workload Result 的业务事实。

---

### D-120

同一 Workload Result：

> 可以被多个 Workload Card 引用。

---

### D-121

当前 Workload Card：

> 可以跟随最新有效 Workload Result。

已保存 CalculationResult：

> 必须保持稳定。

---

### D-122

Workload Card 拖入 Unit Slot 后：

允许提供 Workload Split 建议。

但：

> 必须用户确认。

---

### D-123

补充 Split：

```text
parent Workload
→ child Workload
```

使用：

```text
workload_split
```

Unit hierarchy 不自动成为 Workload hierarchy。

---

### D-124

Workload Card 拖入 Unit Slot：

建立：

> Workload–Unit business association/use relation

不会改变 Workload 的统计层级。

---

### D-125

Split feasibility 必须根据：

- Source Data
- Definition
- Target Unit Children
- Mapping

判断。

不能只依据 Unit hierarchy。

---

### D-126

补充 Split 后：

- Parent Workload Card 保留
- Child Workload Result / Card 创建
- `workload_split`

支持：

- full
- partial

---

### D-127

Unsplit / Partial / Full：

属于派生状态。

不是独立 Relation fact。

---

### D-128

Unit Card 是 Workload Resolution 的业务上下文。

Resolution 不能简单理解为：

> 两张 Card 绑定。

必须考虑：

- hierarchy
- source
- Definition
- mapping

---

### D-129

Resolution 四种结果：

```text
Exact Match
Ancestor Match
Descendant Match
No Match
```

---

### D-130

Resolution：

> Recommendation Layer

Finding：

> 不改变 Domain Facts。

只有用户确认后：

```text
Recommendation
→ User Confirmation
→ Relation / New Result / New Card
```

---

### D-131

Sharing ≠ Splitting。

Sharing：

> 同一个 Workload Result / Card 被多个 Unit / Model 使用。

Splitting：

> 创建 child Workload。

---

### D-132

Shared 状态：

> 从 active use relations 派生。

不要增加：

```text
shared: boolean
```

作为正式业务事实。

---

### D-133

向上 Aggregation 时：

先检查已有匹配 Workload Result / Card。

如果不存在：

> 才提出 Aggregation Suggestion。

---

### D-134

允许 Partial Aggregation。

系统不能自动补齐用户没有选择的 children。

---

### D-135

Partial Aggregation Result：

必须保留真实统计条件。

不能伪装成：

> 完整目标 Unit Workload。

---

### D-136

Resolution：

> 必须向用户展示 Matching Basis。

---

# 4. Q-09-A Issue 审查状态

```text
Issue 1   PASS
Issue 2   PASS
Issue 3   PASS
Issue 4   PASS
Issue 5   PASS
Issue 6   PASS
Issue 7   PASS
Issue 8   PASS
Issue 9   PASS
Issue 10  PASS
```

因此：

> **Q-09-A 当前无需继续修改。**

---

# 5. Issue 3 最终修复状态

曾发现：

```text
budgetService.deriveBackCalculatedBudget()
```

错误使用：

```text
WorkloadCard.value
```

作为统计事实。

最终修改为使用：

```text
WorkloadResult.value
```

并补充：

```text
WorkloadResult.period
```

相关测试验证：

- WorkloadResult.value 为权威值
- WorkloadCard.value 即使不同也不能影响反算
- Period 正确传递

最终：

```text
PASS
```

---

# 6. Issue 6 最终状态

曾怀疑：

```text
getIdleWorkloads()
```

对：

- workload_assign
- workload_share

的处理存在问题。

专项审查后确认：

两者均可代表：

> Active Workload Use

因此：

```text
active assign
∪
active share
−
confirmed occupancy
```

的语义成立。

最终：

```text
PASS
```

---

# 7. Issue 7 最终状态

`scoreService.runCalculation()` 使用：

```text
CalculationInput.workloadValue
```

作为显式计算输入。

它执行：

```text
Unit Score × Workload Value
```

生产代码不存在：

```text
WorkloadCard.value
```

依赖。

测试中的：

```text
180
220
```

等硬编码属于该 Service 的纯计算单元测试输入。

无需为了“贴近 Mock 数据”而修改。

最终：

```text
PASS
```

---

# 8. Issue 9 最终状态

存在：

```text
recommendationStore
```

以及：

```text
deckStore.recommendation*
```

相关字段。

当前没有生产调用。

最终判断：

> 属于尚未接入的架构脚手架。

不是当前 Q-09-A 领域语义错误。

**暂不清理。**

---

# 9. Issue 10 最终状态

当前不存在正式：

```text
WorkloadCard
+
UnitCard
+
Source / Definition / Mapping
→ Resolution
→ ResolutionResult
→ Recommendation
```

调用链。

当前已有：

### 类型层

```text
ResolutionContext
ResolutionResult
ResolutionRecommendation
ResolutionMatchType
ResolutionRecommendationType
MatchBasis
```

### Recommendation 层

```text
Recommendation
RecommendationKind
RecommendationStatus
```

### Mock

```text
mockRecommendations
```

其中存在：

```text
kind = "resolution"
```

的静态 Mock 推荐。

### DataService

存在：

```text
getRecommendations(context)
```

### MockDataService

当前：

```ts
async getRecommendations(_context: unknown): Promise<Recommendation[]> {
  return mockRecommendations;
}
```

专项审查结论：

> `_context` 当前未使用不构成架构违规。

原因（Q-09-A 审查时点记录，保留为历史依据）：

- 当时 Resolution 算法尚未实现（现已由 Q-09-B 实现并通过测试）
- MockDataService 只是 Mock 数据访问实现
- DataService 不负责执行 Domain Resolution
- Resolution 应位于 Domain / Application Service
- context 参数属于未来正式 Resolution 接入的接口预留

最终：

```text
PASS
```

---

# 10. Resolution 当前状态

## 已完成

```text
类型定义（resolutionTypes.ts）
Mock Recommendation
DataService 接口
MockDataService
ResolutionService（resolveWorkloadToUnit 纯函数）
ResolutionContextBuilder（生产入口 buildFromDataService 已实现，生产文件零 mock import；mock 构建路径已迁至 src/mock/mockResolutionContextBuilder.ts 测试适配层）
ResolutionResult 动态生成
Resolution → Recommendation
RecommendationStore 生命周期管理
ActionExecutor（executeUserDecision / executeSplitWorkload 等）
ActionSubmissionService（五阶段有序持久化）
Split / Aggregation feasibility
四种 MatchType 互斥穷尽
Matching Basis 构建
```

## 未完成（本清单已于 2026-10-09 更新：原清单多数项已在 Q-09-C 关闭时完成）

```text
sourceDataObjects 生产来源（H-1 裁定 A，DEFERRED 归 Phase 2，不伪造；mappingEvidences 生产投影已于 2026-10-04 实现）
```

原清单其余各项——Production Resolution Trigger 的 UI/交互层接入、WorkloadCard → UnitSlot → Resolution 的 Drag/Drop Runtime、用户确认 UI 交互流、Matching Basis UI、Recommendation UI、Canvas / Deck / Slot / Inspector 最小集成——均已于 **Q-09-C Interaction Runtime CLOSED / PASS（2026-10-07）** 时完成；D-150 已于 2026-10-09 进一步补齐"Drop 先建立并持久化 workload_assign，再触发 Resolution"（CLOSED / PASS）。**注意**：上述验证均在 MockDataService 内存环境完成，不代表生产持久化、事务与并发控制已实现（生产 DataService 适配器未实现）。

因此当前状态（2026-10-09 更新）：

```text
Types                                        READY
Mock                                         READY
Algorithm                                     IMPLEMENTED（Q-09-B Domain Engine CLOSED / PASS）
Service                                       IMPLEMENTED（Q-09-B Runtime Boundary CLOSED / PASS）
Action Execution / Persistence Boundary       IMPLEMENTED（Q-09-B Runtime Boundary CLOSED / PASS）
Production Interaction Runtime               CLOSED / PASS（Q-09-C Interaction Runtime 2026-10-07：Drop → Relation（D-150，2026-10-09）→ Resolution → Recommendation → Confirm → Domain Fact 持久化闭环，行为级测试验证；完整产品化 UI 与 production adapter 归后续阶段）
```

明确区分：

- **已实现**：Resolution Domain Engine 已实现（含 Domain Generation、MatchType、Feasibility、Recommendation generation）。
- **已实现并验证**：Action Execution Chain（Recommendation → ActionExecutor → ActionSubmissionService → DataService）已通过 Q-09-C Atomicity 验证。
- **已实现**：ResolutionContextBuilder 生产入口 buildFromDataService（从 DataService 取数，生产文件零 mock import，D-139 落实；Definition 缺失时抛出含 definitionId 的显式错误）。
- **已完成**：Production Interaction Runtime 生产触发链（WorkloadCard → UnitSlot → dropTrigger → resolutionTrigger → recommendationStore，2026-10-07 全链贯通；D-150 于 2026-10-09 补齐 Drop 先建立并持久化 workload_assign 再触发 Resolution）。以上验证均在 Mock 内存环境，不等于生产持久化 / 事务 / 并发控制已实现。

已完成部分的详细审查记录见 Q-09-B Resolution Domain Engine Review 及 Q-09-B Runtime Integration Boundary Report。

---

# 11. 当前重要代码状态

已经完成并审查通过的重要文件包括：

```text
src/services/DataService.ts
src/services/MockDataService.ts

src/stores/deckStore.ts
src/stores/canvasStore.ts
src/stores/inspectorStore.ts

src/domain/score/scoreService.ts
src/domain/budget/budgetService.ts
src/domain/budget/budgetService.test.ts

src/domain/card/types.ts
src/domain/workload/types.ts
src/domain/workload/resolutionTypes.ts

src/mock/mockRelations.ts
```

---

# 12. 当前 Git 重要节点

```text
5a23123dac6230569171350f62bd59bcb619ad8f
baseline

5aabca4
Q-05 partial budget occupancy

e82be36
Q-06 measurement/calculation score domain alignment

6b23d47
Q-07 accepted card types

6b8640e
Q-07 INV-068 / D-102 / glossary fixes

3e29234
Q-08-H calculation graph execution

3a08700
Q-08 formal close

0b6d7a3
Q-01～Q-07 historical closure

8749266
Q-01～Q-08 type alignment

d00f579
Q-09-H Workload Resolution types

5f1d385
resolutionTypes duplicate resultSetId fix

09c59b1
Q-09-A type layer review close

6ff0712
Recommendation generic-container refactor

02866fb
Q-08-H / Q-09-A graph fixes

8d76dc5
mockWorkloadDefinitions cleanup

0693362
mockWorkloadChain ResultSet fixes

5130574
CalculationSnapshots / Wang-Li mock fixes

d1259c1
Wang/Li mock fact corrections

388887b
remove fabricated outpatient 600

1396f11
remove dangling workload_split

36a6810
deriveBackCalculatedBudget use WorkloadResult.value
```

---

# 13. 当前测试状态

（2026-10-09 更新，2026-10-10 基线指向修正：本节原为 Q-09-C Atomicity 关闭时点记录，其基线为历史阶段基线；**414/414（23 文件，2026-10-09 实施轮实测）为历史实施轮基线；当前最新实测基线见 §1——424/424（24 文件，2026-10-10 D-151 A① 实施轮实测）**。以下为该阶段关闭时点的验证记录，保留为历史。）

Q-09-C Atomicity & Failure Recovery 阶段关闭时点已验证：

```text
Tests: 226 PASS
Typecheck: PASS
Build: PASS
```

测试覆盖：

- ActionExecutor 确定性目标 / duplicate check
- cancelOrDismiss 生命周期校验
- confirm_use_current 语义
- Recommendation context mismatch
- ActionSubmissionService retry idempotency (Test A-E)
- saveWorkloadResults / saveCards / saveRelations / saveWorkloadSplits 各阶段失败恢复

后续如果代码发生修改：

> 必须重新运行对应测试、typecheck、build。

---

# 14. 当前项目目录 / 工作区

主要项目：

```text
C:\Users\bluec\Desktop\poker face
```

ZCode 当前测试工作区：

```text
C:\Users\bluec\Desktop\poker face-zcode-test
```

---

# 15. 当前没有要求 ZCode 执行的事项

截至本快照：

```text
无需修改代码
无需重新实现 Resolution（已实现并通过测试）
无需重做 Q-09-A / Q-09-B / Q-09-C Atomicity
无需开始任何 Q-09 阶段工作（Q-09-C Interaction Runtime 已于 2026-10-07 CLOSED / PASS）
无需重新打开 Q-01～Q-08
```

---

# 16. 后续潜在工作

Q-09-B Resolution Domain Engine：CLOSED / PASS
Q-09-B Runtime Boundary：CLOSED / PASS
Q-09-C Atomicity & Failure Recovery：CLOSED / PASS
Q-09-C Interaction Runtime：CLOSED / PASS（2026-10-07）

后续阶段（产品化 / 基础设施，不属 Q-09-C 未完成）：

```text
完整 Canvas / Deck / Slot 产品化（AGENTS §28 Phase 3）
完整 Matching Basis Inspector / UX（D-136 Runtime 契约已由最小展示满足，剩余为 UX 产品化）
DataService production adapter（后端基础设施；D-143/D-148 迁移约束已预设接入条件）
其他完整产品 UI（Card/Deck/Slot 视觉系统等）
```

重点方向（2026-10-07 与代码实况同步后）：

【明确 DEFERRED（既有裁定）】
1. sourceDataObjects 生产来源（Data Object 模型等待 Phase 2，H-1 裁定 A，不伪造）
2. 已有 Result 创建第二张 WorkloadCard（CASE/SEE 原则下明确暂缓）
3. canvasBootstrap 先置标记风险（已判定当前 V1 不可触发；真实持久化 adapter 临近时处理）

【尚未开始——完整产品化（竖切片已 CLOSED，勿重复列为未完成）】
4. 完整 Canvas / Deck / Slot 产品化（卡片拖动重定位 / 缩放 / 平移 / 自动布局 / React Flow——当前为固定 4 卡最小画布）
5. 完整 Matching Basis Inspector（当前为详情面板最小区块：无 per-child evidence 列表、无 feasibility 展开 UX）
6. DataService production adapter（唯一实现仍为 MockDataService）

已 CLOSED / PASS 的最小竖切片（2026-10-07 与代码实况核对，此前误列为未来工作）：
- WorkloadCard → UnitSlot Drag/Drop Runtime（dropTrigger + dropInteraction + 原生 HTML5 DnD，多轮 PASS）
- Recommendation UI（数据驱动列表 + selection + detail + 真实 React DOM 行为测试）
- Matching Basis 最小展示（D-149 Snapshot + selector 透出 + 区块渲染）
- Canvas / Deck / Slot 最小集成（canvasBootstrap + upsertCardPlacement + 动态 Slot，真实数据流）
- Confirm / Cancel / Dismiss UI 第一刀 + aggregate_descendants capability gating + confirm_split 参数确认 UI（D-145 省略路径 + D-142 re-confirm 回归）

更早完成并从清单移除：
- mappingEvidences 生产投影 + evidence gate（deriveMappingEvidences 已实现并被 assessSplitFeasibility 消费）
- ResolutionContext Relations 注入（workloadAssignments 投影已实现，split feasibility cannot_determine 双根因已解决）

已完成（2026-10-03，Q-09-C Interaction Runtime）：

- ResolutionContextBuilder 生产接入：buildFromDataService(dataService, workloadCardId, targetUnitId) 从 DataService 取数，生产文件零 mock import（D-139 落实），Definition 缺失时显式报错；mock 构建路径迁至 src/mock/mockResolutionContextBuilder.ts 测试适配层。
- Matching Basis 快照实施完成（D-149，CLOSED / PASS 2026-10-07）：推荐携带结构化 Matching Basis Snapshot（子集、深拷贝引用隔离、D-142 re-offer 更新快照）+ Matching Basis 最小展示；+7 测试，基线 344。
- UI Runtime 竖切片全线 CLOSED / PASS（2026-10-07）：Drop→Trigger 接线层（+6）、原生 HTML5 DnD（+6）、真实 Deck→Canvas 数据流（+9）、Recommendation 列表/选择/详情（+6）、其真实 React DOM 行为（+5，happy-dom 轻量 DOM）、D-149 快照与最小展示（+7）、Confirm/Cancel/Dismiss 生命周期 UI（+7）、aggregate capability gating + P2-6 spy 直接证据（+3）、confirm_split 参数确认 UI（+7）、D-145 identity 省略路径修复 + D-142 split re-confirm 回归（+2）；
- split → Result / WorkloadSplit / workload_split Relation / Card 四类真实持久化闭环（UI 全链 DOM 测试实证，含持久化失败一致性与防重复提交）；
- 测试基线演进：300 → 304（P2-6）→ 306（happy-path）→ 344（D-149）→ 351（Confirm UI）→ 354（aggregate gating + P2-6 spy）→ 361（confirm_split 参数 UI）→ 363（identity 修复 + re-confirm 回归）；关闭时点基线 363/363 PASS，typecheck PASS，build PASS。
- P2-6 已 CLOSED / PASS（2026-10-05）：executeDecision 对 cancel/dismiss 的入口门禁完成（通道隔离——两种动作在 dataService 存在/缺失下同一出口，均拒绝并指向 cancelOrDismiss，不再误标 accepted）；
- cancelOrDismiss happy-path 测试补齐：cancel → ignored、dismiss → dismissed 的正向状态转换断言（+2 测试）；
- 本轮（2026-10-05 收尾）生产代码零修改，仅测试文件新增 2 个 happy-path 测试；
- 测试基线演进（Q-09-C 全程保留）：300（E-2）→ 304（P2-6）→ 306（happy-path）→ 312（DropTrigger）→ 318（DnD 竖切片）→ 327（Deck→Canvas）→ 333（Recommendation UI）→ 338（React DOM 行为）→ 344（D-149）→ 351（Confirm UI）→ 354（aggregate gating + P2-6 spy）→ 361（confirm_split 参数 UI）→ 363（D-145 identity 修复 + D-142 re-confirm 回归）；关闭基线 363/363 PASS，typecheck PASS，build PASS。
- E-2 实施完成（D-148）：生成型 child Result ID 改锚点型（parent+batch+rs::ri 编码）、WorkloadSplit ID 改 childResultId 派生（保留批次段以维持 D-145 other 判定，偏差已记录于 D-148）、统计锚点唯一性校验落地、ownership 期望 ID 逐 child 计算——children 顺序不再参与任何 identity，换序 retry 幂等（生成型不再误拒、显式不再对调关联）；+12 测试，基线 300（2026-10-05）。
- E-2 语义裁定入库（D-148）：Split = 分解——统计锚点 (resultSetId, resultItemId) 一次执行唯一（显式 ID 不能绕过）、children 顺序无业务语义不参与两处 identity、重复使用/组合属后续业务（CASE/SEE 原则）；技术设计方向已确认（锚点型 child ID + childResultId 派生 Split ID + 锚点唯一性校验），实施另轮（2026-10-05）。
- E-1 重复显式 child ID P1 修复（D-147）：同一拆分决策中显式 children[].id 必须唯一，重复即整体拒绝（splitService 输入校验，零事实、推荐保持 recommended）；+5 测试，基线 288（2026-10-05）。
- current-ownership 内容一致性 P1 修复（D-144 规则 2 补强）：executor 与持久化边界的 current 分支不再无条件放行——同批次 + 同 child ID + 内容不同必拒（两层），内容全同才幂等放行；+2 测试，基线 283（2026-10-05）。
- H-2 幂等恢复例外实施完成（D-146）：显式 child ID 跨 execution 三分支检查落地（executor 前置 + 持久化边界兜底，先检查再保存）；"Result 已存、Split 未存"窗口下内容全同 → 幂等恢复，内容不同/他批归属 → 拒绝；Test B 与 card-id 共享测试重构为 H-2 拒断言；+13 测试，基线 281（2026-10-05）。
- H-2 裁定入库（D-145）：confirm_split.children[].id = 本次执行创建的 child Result 身份——同执行 retry 可复用、跨 execution 复用必拒、既有 Result 继续使用走 use_existing 引用路径；实施缺口（跨 execution 检查、部分失败窗口策略、两个存量测试重构）已记录于 D-145，待实施轮（2026-10-05）。
- WorkloadResult 身份裁定入库（D-144）：身份 = 一次确定的分析执行结果——新执行产新身份、同执行 retry 复用身份、上游变化不原地改写、咨询复用不产生新 Result、value 不单独作判据；既有代码核查全部符合，唯一边界（显式 children[].id 跨决策复用）待 H-2 裁定（2026-10-05）。
- child WorkloadCard ID 单射化（P2 修复，D-143）：generateStableCardId 由 32-bit 短哈希改为共享单射安全编码（src/shared/idEncoding.ts，与批次域 ID 同一编码规则），消除跨决策 Card 身份碰撞/覆盖窗口；retry 幂等与 D-120/D-142 语义不变（2026-10-04）。
- Production Resolution Trigger：src/services/resolutionTrigger.ts —— resolveWorkloadToUnitAndRecommend(dataService, workloadCardId, targetUnitId) 唯一正式生产触发入口：buildFromDataService → resolveWorkloadToUnit → Recommendation(kind="resolution", status="recommended") → recommendationStore.addRecommendation（含 ResolutionRecommendation → recommendationStore 正式接入）；稳定推荐 ID rec-resolution-<workloadCardId>-<targetUnitId>；D-142 重新触发语义落实；11 个 trigger 测试（全项目 226 tests）。

**以上剩余内容当前不开始。**

---

# 17. 后续开发必须遵守

任何后续实现都必须保持：

```text
Finding
→ Recommendation
→ User Confirmation
→ Domain Fact
```

以及：

```text
Workload Result
≠
Workload Card
```

```text
Unit Tree
≠
Workload Tree
≠
Budget Tree
```

```text
Relation
=
Formal Relationship Fact
```

```text
Snapshot
=
Immutable Calculation Footprint
```

---

# 18. 恢复项目时的最短路径

未来重新开始时：

### 第一步

读取：

```text
PROJECT_STATUS.md
```

### 第二步

读取：

```text
PROJECT_MASTER_CONTEXT.md
```

### 第三步

如果要处理具体阶段：

读取：

```text
docs/decisions/Q-xx.md
```

### 第四步

再检查：

```text
current source
tests
git history
```

不要从聊天历史重新猜测当前状态。

---

# 19. 当前一句话状态

> **医院绩效卡牌系统已完成 Q-01～Q-08 领域基础、Q-09-A 一致性审查、Q-09-B Resolution Domain Engine + Runtime Boundary、Q-09-C Atomicity & Failure Recovery；Q-09-C Interaction Runtime 已于 2026-10-07 CLOSED / PASS（Drop → Relation（D-150，2026-10-09 CLOSED / PASS）→ Resolution → Recommendation → Confirm → Domain Fact 持久化闭环，行为级测试验证）；当前无 P0/P1 问题，最新实测基线 424/424（24 文件）/ typecheck / build 全部通过（2026-10-10 D-151 A① 实施轮实测；其后文档轮未重新运行）。撤回链（D-153～D-158）已裁定并在 Mock 内存环境实现与接线（入口 + 只读预览 + 确认范围守卫 + 六阶段提交 + 撤回后旧反馈失效 A① + D-154 确认安全检查）；D-151 剩余 = 撤回后自动重新 Resolution 与移动/解除关系路径；生产 DataService 适配器、生产持久化、数据库事务与并发控制仍未实现（Mock 验证不等于生产保障）。**

---

# 20. 状态快照维护规则

当发生正式阶段变化时：

1. 更新本文件。
2. 更新 `PROJECT_MASTER_CONTEXT.md`。
3. 更新对应 `docs/decisions/Q-xx.md`。
4. 记录 Git Commit。
5. 更新 Tests / Typecheck / Build 状态。
6. 明确哪些内容进入 CLOSED。
7. 明确哪些内容进入下一阶段。

不要把：

- 临时想法
- 未确认方案
- 单纯讨论
- 猜测

直接写成正式状态。

---

# 21. 最终状态

```text
┌──────────────────────────────────────────────────────────────────┐
│ 医院绩效卡牌系统                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Q-01                                           CLOSED           │
│ Q-02                                           CLOSED           │
│ Q-03                                           CLOSED           │
│ Q-04                                           CLOSED           │
│ Q-05                                           CLOSED           │
│ Q-06                                           CLOSED           │
│ Q-07                                           CLOSED           │
│ Q-08                                           CLOSED           │
│ Q-09-A                                         CLOSED / PASS    │
│ Q-09-B Resolution Domain Engine                CLOSED / PASS    │
│ Q-09-B Runtime Boundary                       CLOSED / PASS    │
│ Q-09-C Atomicity & Failure Recovery            CLOSED / PASS    │
├──────────────────────────────────────────────────────────────────┤
│ P0 / P1                                        NONE             │
│ Resolution Domain Engine                       IMPLEMENTED      │
│ Action Exec / Persistence Boundary             IMPLEMENTED      │
│ Atomicity / Failure Recovery                   CLOSED / PASS    │
│ Q-09-C Interaction Runtime                    CLOSED / PASS    │
│ D-150 Drop → Relation → Resolution             CLOSED / PASS    │
│ 撤回链（D-153～D-158）服务+入口+守卫（Mock）    IMPLEMENTED      │
│ D-151 A① 撤回后旧反馈失效 + D-154 确认安全     IMPLEMENTED      │
│ ResolutionContextBuilder 生产接入              IMPLEMENTED      │
│ Production Resolution Trigger                 IMPLEMENTED      │
│ Tests                                          424 passed      │
│ 生产适配器 / 持久化 / 事务 / 并发               NOT IMPLEMENTED  │
└──────────────────────────────────────────────────────────────────┘
```

（2026-10-10 更新：Tests 424/424 为 D-151 A① 实施轮实测（24 文件），文档轮未重新运行；"撤回链 / D-151 A① IMPLEMENTED"指 MockDataService 内存环境实现与接线，不代表生产持久化删除、事务与并发控制已实现；D-151 整体未完成——剩余 = 撤回后自动重新 Resolution 与移动/解除关系路径。）
