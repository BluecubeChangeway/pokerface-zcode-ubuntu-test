# PROJECT_MASTER_CONTEXT.md

> 医院绩效卡牌系统（Hospital Performance Card System）
>
> 本文件用于保存项目长期上下文、产品创意、领域语义、正式裁定、实现状态与历史审查结论。
> **权威优先级建议：本文件 + `Q-01-Q-09_DECISION_LEDGER.md`（正式决策记录）+ Git 历史 > 聊天历史中的临时讨论。**
>
> 当前阶段：**Q-09-B Domain Engine / Runtime Boundary 已关闭；Q-09-C Atomicity & Failure Recovery 已关闭；Q-09-C Interaction Runtime 已于 2026-10-07 CLOSED / PASS（核心生产闭环全线贯通：Drop → Resolution → Recommendation → Matching Basis → Confirm/Cancel/Dismiss → Domain Fact 持久化 → accepted/ignored/dismissed；当前 UI 为 Runtime 验证用最小竖切片，完整产品化 UI 与 DataService production adapter 归入后续阶段）。**（生产边界：核心生产闭环指**生产代码路径**接通并经行为级测试验证，验证环境为 **MockDataService 内存环境**——真实生产 DataService 适配器、生产持久化、数据库事务与并发控制**仍未实现**，Mock 验证不等于生产后端已完成。）
> 2026-10-10 更新：Q-09 关闭后交互框架已裁定并部分落地——**D-150 Drop → Relation → Resolution 闭环 CLOSED / PASS**；**D-151 部分落地**：drop 后自动 Resolution 已随 D-150 实现，**A① 撤回后旧反馈失效 + D-154 确认安全检查已于 2026-10-10 实现接线（Mock 内存环境验收）**，剩余 = 撤回后自动重新 Resolution 与"移动/解除关系"运行时路径（后者语义待产品裁定）；D-152 已裁定（多入口产品形态属 UI 产品化）；撤回语义 D-153～D-156、D-158 已裁定——D-153～D-155 服务已实现，**D-156 + D-158（方案 A：整条派生路径撤回彻底删除该路径产生的全部 WorkloadCard 与 WorkloadResult，复用不保留、引用方计算失效待重算）第一阶段与撤回运行时入口（只读预览 + 确认范围守卫）已于 2026-10-09 在 Mock 内存环境实现并接线**；**D-157（拆分结果按需创建 / 跨渠道复用 / 选择与撤回边界，规则 A～E）已裁定、尚未实现，其与 D-156 的共享复用冲突已由 D-158（方案 A）裁决**。生产 DataService 适配器删除接口未实现 = 生产阻塞；最新实测基线 424/424（24 文件，2026-10-10 实施轮实测，文档轮未重跑）。
> 当前不应因为后续开发而重新打开已经封板的 Q-01～Q-09-B 及 Q-09-C Atomicity。

---

# 1. 项目定位

## 1.1 项目目标

本项目是一个面向医院绩效数据统计、分析、测算、核算与结果解释的可复用交互模块。

核心不是做传统的“表格系统”，而是将医院绩效分析过程组织成：

- 卡牌（Card）
- 卡组（Deck / Card Group）
- 卡槽 / 端口（Slot）
- 无限画布（Infinite Canvas）
- Relation（关系）
- Workload / Budget / Score 等业务对象

用户通过拖拽、关联、展开、配置、确认等方式逐步构建全院、科室、人员层面的绩效测算模型。

系统的视觉体验带有一定“半游戏化”特征，但业务语义必须保持严格、可追溯、可计算。

---

# 2. 产品核心创意

## 2.1 卡牌 + 卡槽 + 无限画布

无限画布是解决方案构建、探索与关系展示的主要空间。

但：

**卡牌关系不能依赖无限画布。**

同一套 Card / Slot / Relation 语义也必须能够在：

- 筛选结果
- Deck
- Inspector
- 普通列表
- 其他非画布场景

中工作。

无限画布只是 Workspace，不是业务关系的唯一载体。

---

## 2.2 不采用“卡牌套卡牌”的无限嵌套

曾明确否定：

> 卡牌内部再放一个完整无限画布，再继续套卡牌。

原因是会形成“无限画布套无限画布”的交互结构。

正确方向：

- 卡牌是独立业务载体
- Slot 是数据入口 / 业务关联入口
- Deck 是卡牌组织与快速操作区
- Canvas 是空间化展示与模型搭建区
- Relation 是正式业务关系事实

---

## 2.3 Slot 的意义

Slot 是：

- 业务语义入口
- 数据输入点
- 关系操作入口
- 可展示当前关系结构的地方

Slot **不是关系事实存储容器**。

因此：

`CardSlot.cardIds` 不作为持久化关系事实。

拖卡进入 Slot 的本质是：

> 创建 / 建立 Relation

而不是：

> 修改 Slot 内部 cardIds。

---

## 2.4 Slot 中的层级展开

例如：

工作量：

- 门诊人次
  - 普通门诊
  - 急诊
  - 会诊
  - 手术

人员：

- 王大夫
  - 门诊人次
  - 急诊接诊

Slot 点击可以展开相关后代，默认展示约 2 层。

但：

**Unit Tree ≠ Workload Tree ≠ Budget Tree**

三者是不同业务体系。

Unit 的组织层级不能自动等同于 Workload 或 Budget 层级。

---

# 3. V1 产品边界

V1 重点：

- 项目创建 / 打开
- 数据准备
- 数据对象
- Card / Card Group
- Slot
- Relation
- Workload
- Budget
- Measurement / Calculation 基础模型
- Calculation Graph
- Calculation Snapshot
- Result / Recommendation 基础结构
- 无限画布
- Inspector
- Deck
- 基础拖拽 / 关联 / 展开
- 数据处理后的中间结果对象

V1 明确不做：

- Three.js
- 完整 3D
- React Flow（计划后期 Phase 3）
- 真实数据库
- 大规模真实医院数据计算
- AI 自动清洗
- 完整权限系统
- 完整多人协作
- 完整审计系统
- 完整 Git 式业务版本系统
- Marketplace / 卡牌市场

---

# 4. 数据准备与解决方案层分离

## 4.1 项目入口

新项目：

`新建项目 → 数据准备`

数据准备包括：

- 模板下载
- 数据上传
- 初步清洗 / 校验
- Source Mapping
- Cleaning
- Data Object Preparation

旧项目：

`打开旧项目 → 恢复上次界面`

---

## 4.2 数据准备与模型构建不是同一层

数据准备可以采用较传统的：

- 表格
- 字段
- 筛选
- 清洗
- 数据对象

界面。

而解决方案 / 模型构建使用：

- Card
- Slot
- Relation
- Canvas

两层不要混为一体。

---

# 5. 核心领域模型

## 5.1 三大 Card Group

### Unit Card

统一表示业务实体，包括人员、科室、组织等。

没有独立 PersonnelCard。

一个人原则上只有一个 UnitCard。

人员在不同：

- 科室
- 时间
- 业务身份
- 实际工作场景

中的变化通过：

- AdministrativeAffiliation
- ActualWork
- BusinessIdentity
- Period

表达。

---

### Workload Card

工作量的业务使用载体。

Workload Card 不拥有 WorkloadResult 的统计事实。

Workload Card 引用：

`workloadResultId`

---

### Budget Card

预算资源池的业务载体。

Budget 是有限资源池。

预算可以：

- 分解
- 分配
- 占用
- 反算

但必须区分：

- budget_split
- budget_assign
- budget_occupancy

---

# 6. Relation 是关系事实的唯一来源

核心原则：

> **Relation 是独立业务对象之间关系事实的唯一来源。**

不要同时在 Card 中复制：

- parentId
- children
- references
- sourceCardId
- targetCardId
- 等同义关系事实

如果两个独立业务对象之间存在正式业务关系，应优先使用 Relation。

---

# 7. Q-01～Q-08 正式裁定

以下阶段均已封板。

## Q-01

正式确定：

- 删除 WorkloadCard.references
- Relation 成为正式关系事实唯一来源
- 所有关系通过 Relation 查询

---

## Q-02

正式确定：

`workload_split`

语义：

`source = parent workload`

`target = child workload`

用于 Workload 分解。

部分拆分允许存在 numeric remainder。

Workload 分解不能与 Unit Structure 混淆。

---

## Q-03

Card 状态分为：

- configurationState
- validationState

UI 交互状态不进入 Domain。

例如：

- hover
- selected
- dragging
- expanded
- focused

不能作为业务领域状态。

Recommendation 属于推荐层。

---

## Q-04

正式原则：

> **结构层级与业务归属解耦。**

### Slot

`CardSlot.cardIds` 不持久化。

Unit Slot：

- V1 只接受 Unit

Workload Slot：

- 通过 Relation 派生相关 Workload

Budget Slot：

- 通过 Relation 派生相关 Budget

拖拽进入 Slot：

> 创建 Relation

不是修改 Slot 数据。

---

## Q-05

预算语义正式拆分：

### Budget Split

预算计划分解。

总预算不因此减少。

### Budget Assign

真正把预算分配给 UnitCard。

### Budget Occupancy

预算与实际 Workload 对应 / 占用。

“已分配但没有工作量”属于：

`allocatedButIdle`

预算和 Workload 的：

- Definition
- Period
- Conditions

不一致时不能自动认定 Occupied。

Period Alignment 必须明确：

- intersection
- monthly_average
- manual
- inherited

系统不能静默替用户决定。

### Budget Summary

核心派生：

- allocated
- occupied
- allocatedButIdle
- unallocated

允许：

`occupied > total`

此时暴露：

`over_occupancy`

不能简单把剩余预算截断为 0。

---

## Q-06

### Measurement

用于确定 Unit Score。

### Calculation

使用已经确定的：

- Score
- Workload
- Budget

计算目标周期结果。

### Score

不是 Card。

### ScoreDefinition

表示规则 / 尺度。

### ScoreAdjustment

调整 Unit Score。

### MeasurementResult

独立的测算阶段结果对象。

“测算积分结果”属于 MeasurementResult。

### ScoreResult

严格属于 Calculation 阶段：

`Unit Score × Calculation Workload`

### Result Chain

```text
Measurement Model
→ Measurement
→ Measurement Result
→ Unit Score
→ Calculation Model
→ Calculation
→ Score Result
→ Calculation Result
→ Comparison
```

### AdjustmentTable

完整复现 Measurement Score Table 作为后续调整基准。

支持：

- 调整
- 计算
- 检查
- 再调整
- 再计算

Measurement Fork：

- 手动触发
- 旧分支保持独立
- 新分支产生自己的 MeasurementResult / AdjustmentTable
- 不继承旧 AdjustmentTable

AdjustmentTable Fork：

- 原表继续存在
- 新表独立
- 同一 AdjustmentTable 可以产生多个 CalculationResult

Calculation 本身不是 Fork。

### Score Relations

正式使用：

- score_reuse
- score_adjust
- score_derive

其中：

`score_reuse`

ScoreDefinition → ScoreDefinition

`score_adjust`

调整后的 ScoreDefinition → 原 ScoreDefinition

`score_derive`

可以：

- BudgetCard → ScoreDefinition
- WorkloadCard → ScoreDefinition

---

## Q-07

Slot 增加：

`acceptedCardTypes`

它是 Slot 定义属性，不是 Relation/UI 状态。

接受规则的唯一来源：

`SlotType → deriveAcceptedCardTypes(slotType)`

并由：

`canAcceptCard`

进行判断。

### ScoreResult ID

不同 CalculationResult 的 ScoreResult 不能碰撞。

正式规则：

```text
${calculationResultId}:${scoreDefinitionId}:${workloadId}
```

### D-102

正式区分：

允许作为保存引用的：

- baseline
- adjustmentTableId
- workloadId
- definitionId

但独立业务对象之间的正式关系：

- split
- assign
- occupy
- reuse
- derive
- adjust

必须通过 Relation。

---

# 8. Q-08：Workload 计算体系

## 8.1 Workload Definition

Workload Definition 不是目录。

它是一个可配置的统计规则。

核心内容：

- Source Data Object
- Statistic Field
- Aggregation / Calculation Method
- Time Field
- Filters / Conditions
- Dimensions

其思维方式应接近 Excel：

> 选择表 → 选择字段 → COUNT / SUM → 筛选 → 分组 / 拆分

不要要求用户直接理解 SQL。

---

## 8.2 Workload Execution

Definition 和 Execution 分开。

Definition：

> 统计规则是什么。

Execution：

> 本次测算 / 核算到底以什么周期、条件执行。

Measurement 和 Calculation 可以：

- 共用 Definition
- 共用 Data Source

但拥有不同 Execution。

例如：

Definition：

`出院人次`

Measurement：

`2025 全年 → 12,000`

Calculation：

`2026 年 7 月 → 1,050`

---

## 8.3 Workload Result

Workload Result 是统计事实。

不是简单显示缓存。

它由 Result Set / Result Items 等产生，并保留：

- value
- dimensions
- period
- resultSetId
- resultItemId

例如：

病种权重统计结果：

```text
病案数据
→ Disease Weight result column
→ 筛选：出院科室 = 外科
→ SUM
→ 外科病种总权重
→ Workload Result
→ Workload Card
```

---

## 8.4 Workload Card

Workload Card 是：

> Workload Result 的业务使用载体。

Card 引用：

`workloadResultId`

而不是复制统计事实。

同一个 Workload Result 可以被多个 Workload Card 引用。

---

## 8.5 Card 与 Result 的动态关系

正式确定：

> 当前 Workload Card 可以跟随最新有效 Workload Result。

但是：

> 已保存 CalculationResult 不能因为后续 WorkloadResult 更新而静默改变。

CalculationResult 必须通过 Snapshot / Result Snapshot 保持稳定。

---

# 9. Calculation Graph

最小 Graph 节点：

- FieldRef
- Constant / ParameterRef
- Aggregate
- Condition / Filter
- Arithmetic
- Output

---

## 9.1 Current Row

Current Row 是：

> Row Context

不是业务对象。

允许：

```text
currentRow.DiseaseGroup
```

作为相关筛选条件。

例如：

```text
Weight(row)
=
AVG(TotalCost, where DiseaseGroup = row.DiseaseGroup)
/
AVG(TotalCost)
```

这里右侧使用 current row 只是计算上下文。

---

## 9.2 Aggregate Scope

需要严格区分：

- perDataset
- perGroup
- row context

已确定：

`perDataset` 不能依赖 currentRow。

Graph 必须是 DAG。

Aggregate 输入必须符合允许的输入类型。

---

# 10. Calculation Snapshot

Snapshot 是：

> 一次完整计算状态的不可变记录。

不是单纯 Graph Version。

必须尽可能完整记录：

- Data Object
- Data Source
- Business Fields
- Definition State
- Execution Config
- Calculation Graph
- Output Column Definitions
- Result Dimension Definitions
- 必要 Data Version / Model Version 引用
- Note
- derivedFromSnapshotId

Snapshot：

- 不允许原地修改
- 从旧 Snapshot 修改必须产生新 Snapshot
- 旧 Snapshot 保留
- 支持比较与备注

---

# 11. 完整 Workload 链

正式链：

```text
Data Source
→ Data Object / Business Fields
→ Workload Definition
→ Workload Execution
→ Calculation Graph
→ Calculation Snapshot
→ execute
→ Result Set
→ Workload Result
→ Workload Card
```

---

# 12. Q-09-A：Workload Resolution

Q-09-A 已完成全部专项审查并 PASS。

## D-118

Workload Result：

> statistical fact

Workload Card：

> business-use carrier

---

## D-119

Workload Card：

```text
workloadResultId
```

不得复制 Workload Result 的业务事实。

---

## D-120

同一个 Workload Result 可以被多个 Workload Card 引用。

---

## D-121

当前 Workload Card 可以跟随最新有效 Workload Result。

已保存 CalculationResult 必须保持稳定。

---

## D-122

Workload Card 拖入 Unit Slot 后：

允许补充 Workload Split。

如果：

- source data
- target Unit hierarchy
- mappings

支持可行拆分路径，则系统可以提出：

> 按子 Unit 拆分

但必须：

**用户确认后才能建立正式关系。**

---

## D-123

补充 Split：

- 创建 child Workload Result / Card
- 使用 `workload_split`
- Unit hierarchy 本身不是 Workload hierarchy

---

## D-124

Workload Card 拖入 Unit Slot：

创建：

> Workload–Unit business association/use relation

不会改变 Workload 的统计层级。

---

## D-125

可行 Split Path 必须依据：

- Source Data
- Definition
- Target Unit Children
- 必要 Mapping

不能只依据 Unit hierarchy。

---

## D-126

补充 Split 后：

Parent Workload Card 保留。

Child Workload：

`workload_split`

支持：

- full
- partial

---

## D-127

Unsplit / Partial / Full Split Status：

属于派生状态。

不是独立 Relation fact。

---

## D-128

Unit Card 是 Workload Resolution 的业务上下文。

Workload → Unit 的解析不能只是：

> “两个 Card 绑定起来”。

必须考虑：

- hierarchy
- source
- Definition
- mapping

---

## D-129

Resolution 四种结果：

```text
Exact Match
Ancestor Match
Descendant Match
No Match
```

---

## D-130

Resolution 是 Recommendation Layer。

Resolution finding：

**不直接修改 Domain Fact。**

只有用户确认以后，才建立：

- Relation
- New Result
- New Card

---

## D-131

Sharing 与 Splitting 不同。

Sharing：

> 同一个 Workload Result / Card 被多个 Unit / Model 使用。

Splitting：

> 创建 child Workload，并建立 workload_split。

---

## D-132

Shared 状态由：

> active use relations

派生。

不要建立：

`shared: boolean`

作为事实。

UI 可以显示 Shared badge / Inspector 信息。

---

## D-133

向上聚合时：

先寻找已经存在的匹配 Workload Result / Card。

如果不存在，再提供 Aggregation Suggestion。

---

## D-134

Workload Aggregation：

允许只选择部分 children。

系统不能自动补齐未选 children。

---

## D-135

Partial Aggregation Result：

必须保留真实统计条件。

不能伪装成：

> 完整目标 Unit workload。

---

## D-136

Resolution 必须向用户展示：

> Matching Basis

---

# 13. Recommendation 架构

Recommendation 已经重构为通用容器。

核心思想：

Recommendation 不应该与某一种业务推荐永久绑定。

其基本结构包含：

- kind
- payload
- lifecycle / status

Resolution 推荐属于：

`kind = "resolution"`

其 payload 可以携带：

`ResolutionRecommendation`

---

# 14. Resolution 当前实现状态

截至 Q-09-A 审查：

### 已有

类型层：

- ResolutionContext
- ResolutionResult
- ResolutionRecommendation
- ResolutionMatchType
- ResolutionRecommendationType
- MatchBasis

Recommendation 类型层：

- Recommendation
- RecommendationKind
- RecommendationStatus

Mock：

- mockRecommendations
- 其中存在 resolution 类型的静态推荐

DataService：

```text
getRecommendations(context)
```

### 已实现（Q-09-B 关闭后更新）

目前已有：

- Resolution 算法（resolutionService.ts，resolveWorkloadToUnit 纯函数）
- ResolutionService（四种 MatchType 互斥穷尽、Recommendation generation、split / aggregation feasibility）
- ResolutionContext 构建（resolutionContextBuilder.ts，当前 mock 版；生产接入归入 Q-09-C Interaction Runtime）
- ResolutionResult 动态生成
- Resolution → Recommendation Domain Generation（Domain Engine 内部的建议生成流程）
- Action Executor（executeUserDecision / executeSplitWorkload 等）
- Persistence Orchestration（ActionSubmissionService 五阶段有序提交）
- Action Execution Chain：Recommendation → ActionExecutor → ActionSubmissionService → DataService（已通过 Q-09-C Atomicity 验证）

因此当前 Resolution 处于：

> **类型层 + Domain Service 层 + Context Builder 层（生产入口 buildFromDataService + mock 测试适配层）+ Action Executor 层 + Persistence 层**

注意：上述是 Domain Engine 和 Action Execution / Persistence Boundary 的实现与验证；ResolutionContextBuilder 生产入口（buildFromDataService，从 DataService 取数，生产文件零 mock import）已实现。**这不等于 Production Interaction Runtime 全链路已接入（生产触发链路仍不存在）。**

尚未进入（本清单为 Q-09-B 关闭时点（2026-10-05 前后）的历史快照；其中 UI 接入、Drag/Drop Runtime、确认流、Canvas/Deck/Inspector 最小集成均已于 Q-09-C Interaction Runtime 2026-10-07 关闭时完成，仅 sourceDataObjects 仍为 Phase 2 DEFERRED——当前状态以 §1/横幅/PROJECT_STATUS.md 为准）：

- sourceDataObjects / mappingEvidences 生产来源（buildFromDataService 当前不填充，ResolutionService 返回 cannot_determine；2026-10-04 后注：mappingEvidences 生产投影已实现，sourceDataObjects 仍为 H-1 裁定 A 的 Phase 2 DEFERRED）
- Production Resolution Trigger 的 UI / 交互层调用接入（Trigger 服务 src/services/resolutionTrigger.ts 已实现；**2026-10-07 已完成接入**）
- WorkloadCard → UnitSlot → Resolution 的 Drag/Drop Runtime（**2026-10-07 已完成，原生 HTML5 DnD 竖切片**）
- UI 调用层（**2026-10-07 已完成确认流竖切片**）
- Canvas / Deck / Slot 最小集成（Runtime 验证竖切片，**2026-10-07 已完成**；Matching Basis 由推荐详情面板最小区块展示，当前不存在独立 Inspector 组件；完整 Inspector 产品化仍属后续阶段）

Production Interaction Runtime 的 UI 生产调用链（2026-10-07 关闭时点状态：**已接入并经行为级测试验证**；下方为 Q-09-B 时点的历史记录）：

```text
WorkloadCard → UnitSlot → [UI 调用] → resolutionTrigger → ResolutionService → RecommendationStore
（服务级生产触发入口已实现：src/services/resolutionTrigger.ts；缺少的是 UI/交互层对它的调用）
```

这不是 Q-09-A 当前阶段的缺陷，算法与服务层已在 Q-09-B 完成并通过测试。

---

# 15. MockDataService.getRecommendations

当前：

```ts
async getRecommendations(_context: unknown): Promise<Recommendation[]> {
  return mockRecommendations;
}
```

正式判断：

- DataService 是数据访问抽象
- MockDataService 是 Mock 数据访问实现
- 当前职责是返回静态 Recommendation Mock
- `_context` 当前不使用是有意行为
- 不能仅因为 `_context` 没使用就判定 P0

Resolution 算法未来应位于 Domain / Application Service，而不是 DataService。

---

# 16. Budget 重要语义

Budget 是资源池，不是简单数字。

例如：

```text
总预算 5,000,000
↓
分配 1,000,000
↓
剩余可分配 4,000,000
↓
实际占用 870,000
↓
分配但闲置 130,000
```

也可能：

```text
总预算 5,000,000
实际占用 5,500,000
剩余 -500,000
```

此时：

`overflow`

必须被真实表达。

---

# 17. Workload 重要业务案例

## 17.1 Wang XX

一个人：

> 一个 UnitCard

可能存在不同时间：

```text
内科
2025-01 ～ 2025-11

急诊
2025-12 ～ 2026-04

下乡
2026-05 起
```

或者存在不同：

- Administrative Affiliation
- Actual Work
- Business Identity

不能创建多个“王大夫”Card 来掩盖同一人的身份变化。

---

## 17.2 门诊工作量

可以：

```text
门诊总量
→ 科室
→ 医生
```

但这种 Workload Tree 不等于 Unit Tree。

---

## 17.3 病种权重

例如：

```text
2025 denominator = 2000

2026-03
M78.1
5 records
total = 9000

average = 1800

weight = 0.9
```

这些数字仅作为既有业务案例，不应被误认为系统通用固定规则。

---

# 18. Measurement / Calculation Period

Period 不能简单理解成一个日期字段。

需要区分：

- Measurement Period
- Calculation Period
- Comparison Period
- Actual Period
- Coverage Period

尤其：

> Actual ≠ Coverage

Coverage 应保留：

- Coverage Rule
- Covered Value
- Monthly Average

等语义空间。

---

# 19. Card State

Card 领域状态：

```text
configurationState
validationState
```

UI 状态不要进入 Domain：

- hover
- selected
- dragging
- expanded
- focused

---

# 20. Recommendation 与 Relation

Recommendation：

> 建议 / finding

Relation：

> 已确认的业务事实

因此：

```text
Recommendation
   ↓ 用户确认
Relation / New Result / New Card
```

不能把 Recommendation 当成 Relation。

---

# 21. Auto Configuration

允许 Auto-config：

- 配置 children
- 关联 Workload
- 关联 Budget

但必须：

```text
候选配置
→ Preview
→ User Confirmation
→ Formal Domain Fact
```

不能静默修改正式关系。

---

# 22. UI 结构

主要 UI：

### 左侧

Card Group：

- Unit
- Workload
- Budget

可以通过：

- 点击
- Hover + Scroll

切换。

### 中央

Infinite Canvas。

### 右侧

可隐藏 Inspector：

- Card 信息
- Relation
- Recommendation
- Validation
- Matching Basis
- 计算 / 统计信息

### 底部

Floating Deck / Card Box。

Deck 卡牌：

- 点击：展开 / 调整 Deck 中 child / recommendation
- 不改变 Canvas focus
- 拖拽：创建 Relation / Card
- 拖入无效位置：静默忽略

---

# 23. Relation Lines

Relation line：

> 辅助可视化

不是业务事实的第二来源。

真正事实来自 Relation。

---

# 24. 数据规模原则

前端不直接 materialize 大规模医院原始数据。

应该由：

- Data Layer
- Backend
- Intermediate Data Objects
- Cached filtered results
- Aggregated Results

承担数据处理。

例如先缓存：

```text
周期
+
接诊人
+
是否有效接诊
+
科室
```

然后再做：

- aggregation
- workload
- score

避免每次 UI 操作重新扫描全部原始数据。

---

# 25. Q-09-A 当前正式状态

Q-09-A 一共专项检查了 10 个 Issue。

最终：

```text
Issue 1  PASS
Issue 2  PASS
Issue 3  PASS
Issue 4  PASS
Issue 5  PASS
Issue 6  PASS
Issue 7  PASS
Issue 8  PASS
Issue 9  PASS
Issue 10 PASS
```

没有需要继续修复的：

- P0
- P1
- 实质性 P2

其中：

### Issue 3

曾发现：

`budgetService.deriveBackCalculatedBudget`

错误使用：

`WorkloadCard.value`

后来修复为：

`WorkloadResult.value`

并增加：

`WorkloadResult.period`

测试验证通过。

---

# 26. Q-09-A Issue 9 特别说明

存在：

`recommendationStore`

以及：

`deckStore` 中 recommendation 字段。

目前均未实际使用。

最终判断：

> 属于未使用的架构脚手架，不构成 Q-09-A 业务语义违规。

因此：

**现在不要为了“代码整洁”而主动删除 / 重构它们。**

---

# 27. Q-09-A Issue 10 特别说明

最终专项审查确认：

不存在：

```text
WorkloadCard
+
UnitCard
+
source / Definition / mapping
→ Resolution
→ ResolutionResult
→ Recommendation
```

的正式生产调用链。

原因不是当前实现错误，而是：

> 历史记录：Q-09-A 关闭时 Resolution 算法尚未进入实现阶段。

该记录保留为历史依据。Resolution 算法已在 Q-09-B 中实现并通过测试。

后续完整 Canvas/Deck/Slot 产品化 / 完整 Inspector / DataService production adapter 等生产接入归入 Q-09-C 关闭后的产品化阶段（ResolutionContextBuilder 生产接入 2026-10-03、Drag&Drop Runtime 与 UI 触发链 2026-10-07 均已完成；生产适配器、生产持久化、事务与并发控制仍未实现）。

---

# 28. 已验证的重要代码文件

目前已专项审查并 PASS 的重要文件包括：

```text
src/services/DataService.ts
src/services/MockDataService.ts
src/stores/deckStore.ts
src/stores/canvasStore.ts
src/stores/inspectorStore.ts
src/domain/score/scoreService.ts
src/domain/budget/budgetService.ts
src/domain/workload/types.ts
src/domain/budget/budgetService.test.ts
src/mock/mockRelations.ts
```

以及 Q-09-A 类型层：

```text
src/domain/card/types.ts
src/domain/workload/types.ts
src/domain/workload/resolutionTypes.ts
```

---

# 29. 已完成的主要 Git Commit

以下是当前项目历史中已经确认的重要节点：

```text
5a23123dac6230569171350f62bd59bcb619ad8f
baseline

5adc1c5
feat: implement Q-04 slot decoupling and Remainder semantics

80f9304
Q-05 implementation/history

5aabca4
feat: support partial budget occupancy

e82be36
feat: align measurement score adjustment and calculation result domain

6b23d47
feat: enforce slot accepted card types

6b8640e
docs: add INV-068 result id rule, D-102 reference-vs-relation criterion, glossary surplus fix

3e29234
feat: implement Q-08-H calculation graph execution semantics

3a08700
docs: close Q-08 domain and implementation

0b6d7a3
docs: close historical Q-01 to Q-07 stages

8749266
fix: align card/domain types with Q-01~Q-08 decisions

d00f579
feat: implement Q-09-H Workload Resolution types per confirmed decisions

5f1d385
fix: fix duplicate resultSetId in resolutionTypes.ts

09c59b1
docs: close Q-09-A type layer review (3 files PASS); fix resolutionTypes.ts

6ff0712
fix: refactor Recommendation to generic container per Q-09-A; remove cardId/targetCardId/targetSlotId, add kind/payload lifecycle

02866fb
fix: graphService/graphExecutor Q-08-H/Q-09-A; prohibit Filter as OutputColumn source, strict compare types, warn on non-numeric aggregate values

8d76dc5
fix: mockWorkloadDefinitions remove hardcoded parameters from def-disease-weight; keep only expression per Q-08/Q-09

0693362
fix: mockWorkloadChain add missing ResultSet items for total-level results

5130574
fix: mockWorkloadChain add missing CalculationSnapshots for all ResultSets; fix Wang XX dimensions...

d1259c1
fix: mockWorkloadChain remove fabricated 1200 calc result for Wang XX; fix Li XX departmentId to actual department...

388887b
fix: mockOutpatientResultSet remove fabricated 600 (ri-outpatient-ortho-dept); remove corresponding fabricated WorkloadResult and WorkloadCard for def-orthopedics-outpatient

1396f11
fix: remove dangling workload_split relation to deleted workload-orthopedics-outpatient; update test expectations

36a6810
fix: deriveBackCalculatedBudget now uses WorkloadResult.value per D-119; add period to WorkloadResult; tests for cache inconsistency
```

---

# 30. 当前 ZCode 工作环境

主要项目：

```text
C:\Users\bluec\Desktop\poker face
```

当前测试工作区：

```text
C:\Users\bluec\Desktop\poker face-zcode-test
```

工作方式：

- Windows Codex / ZCode
- Git 管理
- 先审查，再决定是否修改
- 修改后测试
- 用户提供最终源代码 / 验证结果
- 再进行 PASS 判断

---

# 31. ZCode 工作纪律

对于已经确定的领域决策：

1. 不要自行重新解释成另一套业务语义。
2. 不要因为“代码更漂亮”而修改已经裁定的领域结构。
3. 不要重新打开已经封板的 Q-01～Q-08。
4. 发现疑似问题时，先说明问题及依据。
5. 未经用户确认，不要擅自修改文件。
6. 用户要求“只审查”时：
   - 禁止修改
   - 禁止 commit
7. 测试应验证业务语义，而不是为了通过测试反向改变业务语义。
8. Mock 数据不能伪造不存在的业务事实。
9. 如果某功能尚未进入实现阶段，不要把“尚未实现”自动判定为当前阶段的代码缺陷。
10. 如果一个问题只是未使用脚手架，不要未经确认主动清理。

---

# 32. 审查工作纪律

推荐采用：

```text
Source First
→ Review
→ Decision
→ ZCode Prompt
→ ZCode Modify
→ Test
→ User Provides Final Source
→ PASS
→ Next File
```

如果文件没有问题：

> 直接 PASS。

不要为了“完整解释”而制造额外修改建议。

---

# 33. 已明确否定的思路

以下原则已经经过讨论，不应轻易重新提出：

- Card 内嵌无限 Canvas
- 用 Slot.cardIds 作为关系事实
- 用 Card.parentId 复制关系
- Unit Tree 自动等同 Workload Tree
- Workload Tree 自动等同 Budget Tree
- Recommendation 自动变成 Relation
- Resolution 自动修改 Domain Fact
- WorkloadCard.value 作为 WorkloadResult 权威统计值
- ScoreResult 复制成 CalculationResult.scoreResultIds
- Budget Usage 取代 Budget Assign / Occupancy
- 把 shared 做成永久 boolean
- 用 UI 状态充当 Domain 状态
- 把 Definition 当成固定 Workload Catalog
- 把 Current Row 当成业务实体
- 把 Calculation Snapshot 当成普通 Graph Version
- 通过复制 Card 来制造新的统计事实
- 为了“整洁”随意删除未使用的 Store / scaffolding

---

# 34. 当前阶段应保持的核心认知

整个系统不是：

> “一堆漂亮的绩效卡片”。

真正的核心是：

> **把医院复杂、异构、具有时间和条件约束的绩效数据统计事实，转化为可以被人理解、组合、确认、计算和追溯的业务对象与关系。**

因此：

```text
Data
→ Statistical Rule
→ Execution
→ Calculation
→ Result
→ Business Carrier
→ Relation
→ Recommendation
→ User Confirmation
→ Formal Business Fact
```

是整个产品的底层逻辑。

---

# 35. 当前项目状态

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
```

当前：

```text
无已确认的 P0/P1 阻塞问题
```

Resolution：

```text
Types                                     READY
Mock                                      READY
Algorithm                                  IMPLEMENTED
Service                                   IMPLEMENTED
Action Execution / Persistence Boundary   IMPLEMENTED（Q-09-B Runtime Boundary CLOSED）
Production Interaction Runtime             CLOSED / PASS（Q-09-C Interaction Runtime 2026-10-07；Drop → Relation（D-150）→ Resolution → Recommendation → Confirm → Fact 持久化闭环，行为级测试验证；验证环境为 MockDataService 内存；完整产品化 UI 与生产适配器归入后续阶段）
```

Q-09-C Interaction Runtime 关闭时点（2026-10-07）实施清单（历史记录，其后 D-150 于 2026-10-09 补齐 Drop 先建关系）：

```text
ResolutionContextBuilder DataService 接入    IMPLEMENTED（2026-10-03）
Production Resolution Trigger               IMPLEMENTED（2026-10-03）
WorkloadCard → UnitSlot → Resolution       IMPLEMENTED（2026-10-07，UI 竖切片）
Drag/Drop Runtime                            IMPLEMENTED（2026-10-07，原生 HTML5 DnD 竖切片）
Recommendation UI                            IMPLEMENTED（2026-10-07，列表/选择/详情/操作按钮/confirm_split 参数确认）
Canvas / Deck / Slot 最小集成（竖切片）        IMPLEMENTED（2026-10-07；Matching Basis 由推荐详情面板最小区块展示，无独立 Inspector 组件；完整 Inspector 产品化未开始）
```

明确区分：

- **已实现**："Resolution Domain Engine 已实现，并已完成 Action Executor / Persistence Boundary 验证；Production Interaction Runtime 服务级触发链与 UI 竖切片（DnD → 推荐 → Matching Basis → 确认 → 持久化闭环）均已接入；完整产品化 UI 未完成。"
- **已实现**："Recommendation → ActionExecutor → ActionSubmissionService → DataService 的 Action Execution Chain 已实现并通过 Q-09-C Atomicity 验证。"
- **已实现**："ResolutionContextBuilder 生产入口 buildFromDataService 已实现（从 DataService 取数，生产文件零 mock import，D-139 落实）。"
- **已实现**："Production Resolution Trigger 已实现（src/services/resolutionTrigger.ts：buildFromDataService → resolveWorkloadToUnit → recommendationStore.addRecommendation，稳定 ID + D-142 重新触发语义，11 个 trigger 测试）。"
- **已实现**："WorkloadCard → UnitSlot → resolutionTrigger 的 UI 触发链路已接入（2026-10-07：dropInteraction → dropTrigger → resolutionTrigger，原生 DnD 全链 PASS）。"
- **已实现（2026-10-09 CLOSED / PASS）**："D-150 Drop → Relation 闭环：dropTrigger 在合法 Drop 时先建立并持久化 workload_assign（ActionSubmissionService.submitDropAssignRelation，P2-1 同业务键幂等）再触发 Resolution → Recommendation；持久化失败不触发推荐（relation_failed 经 actionError 透出）；无效 Drop / revoked 卡静默忽略；真实撤回产物 → 再次合法 Drop 组合已验证；关闭基线 392/392。"

这些已完成的 Resolution 实现未反向破坏 Q-01～Q-09-A 已确认的领域语义。

---

# 36. 后续上下文恢复原则

当未来重新开始项目时，优先读取：

```text
PROJECT_STATUS.md
PROJECT_MASTER_CONTEXT.md
docs/decisions/
```

然后再查看：

```text
git history
current source
tests
```

不要首先依赖旧聊天记录推断项目状态。

如果未来发现代码与本文件冲突：

1. 先识别是代码落后于裁定，还是本文件落后于最新裁定。
2. 不要自动选择一方。
3. 查找对应 Decision / Git Commit。
4. 必要时让用户裁定。

---

# 37. 文件维护规则

本文件不是一次性文档。

未来发生重大正式裁定时：

- 更新本文件
- 同时建立 / 更新对应 Decision Ledger
- 更新 PROJECT_STATUS.md
- 记录 Git Commit

临时讨论、候选方案、未确认想法：

> 不应直接写入“正式裁定”区域。

---

# 38. 最重要的长期原则

### 原则 1

**Relation 是正式关系事实。**

### 原则 2

**Workload Result 是统计事实，Workload Card 是业务载体。**

### 原则 3

**Unit / Workload / Budget 三棵树相互独立。**

### 原则 4

**结构层级与业务归属解耦。**

### 原则 5

**Recommendation 是建议，不是事实。**

### 原则 6

**Resolution 是推荐层机制，不直接改变 Domain Fact。**

### 原则 7

**Measurement 与 Calculation 必须区分。**

### 原则 8

**Calculation Snapshot 是不可变完整计算足迹。**

### 原则 9

**缺失 ≠ 0。**

### 原则 10

**系统不能静默替用户做具有业务意义的推断。**

### 原则 11

**统计层级不等于组织层级。**

### 原则 12

**已经确认的领域裁定优先于后续代码实现便利性。**

---

# 39. 当前未完成但已知的后续方向

以下为 Q-09-C Interaction Runtime 的方向记录（Q-09-C 已于 2026-10-07 CLOSED / PASS——服务级链路与 UI 竖切片全线贯通验证；完整产品化 UI 与 production adapter 归入后续阶段。此处保留为历史记录）：

1. ResolutionService — **已实现** / Q-09-B CLOSED
2. ResolutionContext 构建 — **生产入口已实现**（buildFromDataService 从 DataService 取数，生产文件零 mock import；mock 版保留为测试适配层 src/mock/mockResolutionContextBuilder.ts）
3. Workload → Unit Resolution — **Domain Engine + Production Resolution Trigger + UI Interaction 竖切片已实现**（src/services/resolutionTrigger.ts + dropTrigger/dropInteraction/App DnD，2026-10-07 CLOSED/PASS）
4. ResolutionResult → Recommendation — **Domain Engine 已实现**；Production UI / Interaction 接入 **已实现**（推荐列表 / 选择 / 详情 / Confirm·Cancel·Dismiss 竖切片，2026-10-07）；完整正式 UI 属后续产品化阶段
5. WorkloadCard 拖入 Unit Slot 时触发 Resolution — **已实现**（2026-10-07 CLOSED/PASS：dropTrigger → resolutionTrigger → recommendationStore 全链测试；D-150 后：Drop 先持久化 workload_assign 再触发 Resolution，2026-10-09 CLOSED/PASS）
6. Matching Basis UI — **最小展示已实现**（D-149 Snapshot + 详情面板区块，2026-10-07）；完整 Inspector 属正式 UI 产品化阶段（未启动）
7. Recommendation 确认后建立 Relation / New Result / New Card — **已实现**（ActionExecutor + ActionSubmissionService，通过 Q-09-C Atomicity 验证）
8. Recommendation Store / Deck 的正式接入 — Store 生产接入 **已实现**（resolutionTrigger → recommendationStore.addRecommendation，2026-10-03）；Deck / UI 竖切片接入 **已实现**（真实数据流，2026-10-07）；正式产品 UI 接入未启动
9. 更完整的 Workload Resolution / Aggregation / Split 交互 — 基础交互闭环 **已实现**（Drop 建立关系 D-150 / Confirm / confirm_split 参数确认）；更完整交互与 aggregate 执行（D-137～139 capability boundary）**NOT STARTED**

进入 Interaction Runtime 工作时必须继续遵守 Q-09-A：

```text
Finding
→ Recommendation
→ User Confirmation
→ Domain Fact
```

---

# 40. 结论

截至当前快照：

> **医院绩效卡牌系统已经完成从产品创意、核心领域模型，到 Q-01～Q-08 正式裁定，再到 Q-09-A Workload Resolution 领域模型审查的基础建设。**

Q-01～Q-08：

> **不重新打开。**

Q-09-A：

> **全部 10 个 Issue PASS。**

当前没有要求 ZCode 继续修改的任务。

下一阶段应当在用户明确安排后再开始。
