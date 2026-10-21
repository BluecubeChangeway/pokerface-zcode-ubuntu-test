# Q-01～Q-09 Decision Ledger

> 绩效卡牌系统｜业务语义、领域模型与实现裁决总账
> 状态：Q-01～Q-09 全部阶段已关闭；Q-09 关闭后的交互框架与撤回裁定（D-150～D-155）中，D-150 已 CLOSED / PASS（2026-10-09），其余已裁定并按各自注记记录实施状态
> 用途：后续开发、审查、ZCode 接续时，以本文件作为已确认决策的持久化依据。

## 当前状态（2026-10-09 更新；取代本节 2026-10-03 时点的旧快照）

### 当前有效状态

- Q-01～Q-08：CLOSED
- Q-09-A：CLOSED / PASS
- Q-09-B Resolution Domain Engine：CLOSED / PASS
- Q-09-B Runtime Boundary：CLOSED / PASS
- Q-09-C Atomicity & Failure Recovery：CLOSED / PASS
- Q-09-C Interaction Runtime：CLOSED / PASS（2026-10-07 核心生产闭环全线贯通；完整产品化 UI 与 production adapter 归入后续阶段，不属 Q-09-C 未完成）
- Q-09 关闭后交互框架：D-150 Drop → Relation → Resolution 闭环 **CLOSED / PASS（2026-10-09）**（实施状态详见 D-150 注记；D-150 的完成不改变 Q-09-C 已于 2026-10-07 关闭的事实）；D-151 / D-152 已裁定、部分落地，各自未完成范围如下（**与已接线的撤回入口相互独立，不得混为一谈**）：**D-151**——已落地 = drop 建立关系后自动 Resolution（随 D-150）＋ **A① 撤回后旧反馈失效（2026-10-10 已接线）**：三个撤回入口（revokeDerivedPathAsPreviewed / revokeDerivedPath / revokeSplitLayer）在撤回提交成功后按**当前事实状态**实时失效旧反馈——仅处理 kind=resolution 且 status=recommended 的推荐，双信号判定（锚点 WorkloadCard 不存在或 businessStatus=revoked；适用的 payload.targetResultId 结果不存在或 revoked）；预览、取消、守卫拒绝不触达；失效失败后重跑撤回入口按当前事实重算即收敛（故障注入测试验证）；accepted/ignored/dismissed 历史与非 resolution kind 不触碰；D-142 稳定 ID / re-offer / 状态机语义不变；**D-154 确认安全检查同批补齐（2026-10-10）**：executeUseExistingResult 检查目标 WorkloadCard、executeFindExistingWorkload 检查目标父 WorkloadCard、executeSplitWorkload 检查主体卡与父 Result、confirm_use_current 经委托路径接受同一检查（revoked = 业务世界等同不存在，D-154 规则 2 既有语义的工程补齐，非新规则）。**D-151 未完成 = ①撤回后自动重新 Resolution 接线（目标配对范围待澄清）②"移动/解除关系"操作本身无运行时路径（操作语义待产品裁定）**；**D-152**——现有唯一决策入口（推荐列表+确认）已收敛到单一执行链；未完成 = Card-side Entry / Inspector 多入口产品形态（属 UI 产品化，未开始）。撤回入口形态**已由 D-158 规则 1 裁定，非待确认项**：撤回由用户直接发起、不默认生成 Recommendation、执行前确认撤回范围（D-158 正文）——撤回的"执行前确认"是撤回自身流程的范围确认（工程上由只读预览 + 确认范围守卫落实），不是对 Recommendation 的 UserDecision；D-152 收敛规则约束的是**对 Recommendation 的决策入口**，不适用于撤回（同 D-150 Drop 直接建立 Relation 的先例）。若未来产品要求撤回先生成 Recommendation 再走 UserDecision 链，属对 D-158 规则 1 的**决策变更**（与"不默认生成 Recommendation"直接冲突），须按 AGENTS §30 变更协议提出冲突、另行裁定，不得在实施中静默转换。具体撤回 UI 产品形态仍属 UI 产品化阶段（D-158 规则 1 末句："本轮不设计、不实现具体 UI"）。
- Q-09 关闭后撤回语义：D-153～D-156、D-158 已裁定；其中 D-153～D-155 服务已实现（revocationService / revocationSubmissionService），**D-156 + D-158（2026-10-09 方案 A：整条派生路径撤回彻底删除该路径产生的全部 WorkloadCard 与 WorkloadResult）第一阶段已于 2026-10-09 在内存运行时实现（记录级闭包 + manualReview + 六阶段提交 + 防复活前置；MockDataService 实现删除接口）**；**撤回运行时入口已于 2026-10-09 接线**：revocationEntry 层提供层撤回 / 全路径撤回两个语义互斥入口 + 只读预览 + 确认范围守卫（确认前重新计算影响集并全字段比较，不一致在提交前中止、零撤回写入）；**生产 DataService 适配器删除接口未实现 = 生产阻塞**
- Q-09 关闭后拆分复用语义：**D-157（2026-10-09：按需创建 / 跨渠道复用 / 选择范围与有效性分离 / 撤回保护，规则 A～E）已裁定、尚未实现**；其与 D-156 的共享复用冲突**已由 D-158（方案 A）裁决**：整条路径撤回的彻底删除优先于规则 E 的共享保护
- 当前无已确认的 P0/P1 blocker
- 当前验证基线：**424/424 tests PASS（24 文件）/ Typecheck PASS / Build PASS**（2026-10-10 实施轮实测；其后的文档轮未重新运行。历史演进 226 → … → 399 → 408 → 414 → 424 见各阶段归档记录）

### 明确 Deferred（既有裁定，不得擅自移出）

- sourceDataObjects 生产来源：H-1 裁定 A，归 Phase 2（Data Object 模型），不伪造
- 已有 Result 创建第二张 WorkloadCard：D-148 CASE/SEE 暂缓
- aggregate 执行能力：D-137～D-139 确定性 capability boundary
- 数据库级并发唯一性保证：WK §16.5 Deferred（V1 为应用层 check-then-write）
- "同一业务键撤回后重建"：语义未定义（2026-10-09 D-150 收口时如实记录，不得自行实现）

### 尚未启动的后续产品化工作（非 Q-09-C 未完成，非 Deferred 重开）

- 完整 Canvas / Deck / Slot 产品化（AGENTS §28 Phase 3；受 docs/UI_DESIGN_OPERATING_CONTRACT.md Phase Gate 约束）
- 完整 Matching Basis Inspector（D-136 已由最小展示满足；完整 UX 属 UI 设计阶段）
- DataService production adapter（后端基础设施；D-143/D-148 迁移约束前置）
- 生产 DataService 适配器删除能力（撤回入口与确认范围守卫已接线，2026-10-09；剩余 = 生产适配器实现 deleteCards/deleteWorkloadResults 及其删除语义。未开始）
- 拆分结果跨渠道匹配复用（D-157 实施，未开始；与 D-156 的共享冲突已由 D-158 方案 A 裁决，剩余前置 = "相同拆分原则"的结构化表达、"渠道"的正式模型表达、跨批次匹配复用服务、second-card（D-148 暂缓）能力裁决）
- D-151 剩余运行时接线（与已接线的撤回入口相互独立；A① 旧反馈失效已于 2026-10-10 完成并移出本清单）：①撤回后自动重新 Resolution（目标配对范围待澄清）；②"移动 / 解除关系"操作路径（操作语义待产品裁定）

> 历史注记：本节 2026-10-03 时点的旧快照（"226 tests""当前阶段 IN PROGRESS""尚未实现的：Production Resolution Trigger 的 UI/交互层调用、sourceDataObjects / mappingEvidences 生产来源、Canvas/Drag&Drop、UI Recommendation 展示"）已被上文取代；其中除 sourceDataObjects（Deferred）外，所列各项均已在 Q-09-C 及其后各轮实现。旧快照原文不再保留为当前状态。

## Q-01｜关系事实源

### D-001｜Relation 是唯一关系事实源
所有 Card 之间以及需要作为领域关系保存的对象之间的关系事实，以 Relation 为唯一正式事实源。

### D-002｜删除 WorkloadCard.references
WorkloadCard 不再保存 `references` 作为关系事实。

### D-003｜关系查询通过 Relation
需要查询“谁关联谁”“谁是来源/目标”“哪些对象被使用”等关系时，统一查询 Relation。

### D-004｜避免关系事实双写
不得同时在 Card、Slot、Relation 中分别保存同一业务关系，避免事实源分裂。

## Q-02｜Workload Split

### D-005｜正式引入 workload_split
Workload 的统计层级拆分使用 `workload_split`。

### D-006｜workload_split 方向
`source = parent Workload`，`target = child Workload`。

### D-007｜Workload decomposition 使用 workload_split
Workload 的父子统计分解不使用 Unit Structure Relation 代替。

### D-008｜Partial split remainder
部分拆分时，未拆部分仍属于原 Workload 的 unresolved remainder，不自动创建新的 Remainder Card。

## Q-03｜Card 状态

### D-009｜configurationState 与 validationState 分离
Card 的配置状态与校验状态分别表达，不混成单一状态。

### D-010｜UI interaction state 不进入领域模型
hover、selected、dragging、expanded、focused 等属于 UI/交互状态，不作为 Card domain state。

### D-011｜Recommendation 是独立推荐层
推荐信息属于 Recommendation layer，不直接写成 Domain Fact。

### D-012｜Collapsed 是交互状态
collapsed/expanded 等状态不作为业务事实保存。

## Q-04｜Slot 与结构/业务归属解耦

### D-013｜Slot 不保存 cardIds 作为关系事实
`CardSlot.cardIds` 不持久化为关系事实。

### D-014｜Slot 是业务语义入口
Slot 是业务语义、展示和交互入口，不是关系事实容器。

### D-015｜Unit Slot V1 只接受 Unit
V1 Unit Slot 的 accepted card type 为 Unit。

### D-016｜Workload Slot 通过 Relation 推导
Workload Slot 显示与 Unit 存在相关业务 Relation 的 WorkloadCards。

### D-017｜Budget Slot 通过 Relation 推导
Budget Slot 显示与 Unit 存在相关业务 Relation 的 BudgetCards。

### D-018｜SlotType 与 RelationType 非一一对应
SlotType 和 RelationType 是不同维度，不能假设一一映射。

### D-019｜Workload/Budget 不自动激活 Unit Slot
当前 V1 Workload/Budget Card 不自动成为 Unit Slot 内容。

### D-020｜结构层级与业务归属解耦
核心原则：**结构层级与业务归属解耦。**
因此 Unit Tree ≠ Workload Tree ≠ Budget Tree。Unit hierarchy 可以作为 Workload/Budget split 的基础之一，但不能自动等同于 Workload/Budget hierarchy。

## Q-05｜Budget

### D-021｜Budget 是有限资源池
BudgetCard 表达预算资源池，金额是其核心事实。

### D-022｜Budget decomposition 不改变总额
预算拆分是规划结构，拆分前后总预算不变。

### D-023｜Budget allocation 是真正分配
`budget_assign` 表示预算真正分配给 UnitCard，使该 Unit 获得从该预算池使用的路径。

### D-024｜Budget occupancy 是实际对应
`budget_occupancy` 表示预算已经实际对应到 Workload。

### D-025｜Allocation 与 occupancy 分离
已分配但没有实际 Workload 对应的预算属于 allocated-but-idle，不等同于已使用。

### D-026｜定义/期间/条件不一致时不自动占用
Budget、Workload 的 Definition、Period、Conditions 不一致时，不能静默判断为 occupied。

### D-027｜Period alignment 不静默决定
期间匹配可使用 intersection、monthly_average、manual、inherited，但系统不能在业务意义不明确时静默替用户决定。

### D-028｜Budget 可递归拆分但不要求到叶子
Budget 可以递归 decomposition；模型粒度和数据粒度不必相同。

### D-029｜Budget 业务状态以服务计算
allocated、occupied、allocatedButIdle、unallocated 等派生状态由 service/selector 计算，不复制成 Card 基础事实。

### D-030｜Budget occupancy status 独立
`candidate | confirmed | rejected` 是 occupancy metadata 的业务状态，与 Relation.active 生命周期字段独立。

### D-031｜Budget 不默认 double-consume
预算默认不能因为多个业务使用路径而重复消耗；Score reuse 本身不复制预算。

## Q-06｜Score / Measurement / Calculation

### D-032｜MeasurementResult 是独立对象
MeasurementResult 是测量阶段结果，不属于 ScoreResult。

### D-033｜测算积分结果属于 MeasurementResult
“测算积分结果”属于 MeasurementResult。

### D-034｜ScoreResult 严格属于 Calculation
ScoreResult 只表达 Unit Score × Calculation Workload，属于 Calculation stage。

### D-035｜ScoreDefinition 是规则，不是 Card
ScoreDefinition 表达计分规则/尺度，不作为 Card。

### D-036｜ScoreAdjustment 调整 Unit Score
ScoreAdjustment 调整的是 Unit Score，不直接调整 ScoreResult。

### D-037｜Actual Score 不另建独立对象
实际使用的 Score 是调整后的 ScoreDefinition；V1 不建立完整 ScoreVersion 系统。

### D-038｜删除 sourceBudgetId/sourceScoreId
Score/Budget/其他对象之间的正式关系不通过 sourceBudgetId/sourceScoreId 双写。

### D-039｜Relation 是正式关系事实
涉及独立业务对象之间的 Score relation 时，使用 Relation。

### D-040｜Relation endpoint 不限 Card
Relation 可以连接非 Card domain object，但每种 RelationType 必须定义 endpoint rules。

### D-041｜score_reuse
`score_reuse`：source ScoreDefinition → reused ScoreDefinition。

### D-042｜score_adjust
`score_adjust`：adjusted ScoreDefinition → original ScoreDefinition。

### D-043｜score_derive
`score_derive`：BudgetCard → ScoreDefinition；WorkloadCard → ScoreDefinition。

### D-044｜Score_* 不全部视为 reference
不能因为 RelationType 以 score_ 开头，就把所有 score relation 都归类为普通 reference；分类必须按具体业务语义。

### D-045｜CalculationResult 不保存 scoreResultIds
不在 CalculationResult 中复制 `scoreResultIds[]` 作为第二关系事实源。

### D-046｜最小 traceability
`modelVersionId` / `dataVersionId` 等最小追溯引用可以存在，但 V1 不建立完整版本系统。

### D-047｜Measurement 与 Calculation 分阶段
Measurement 用于建立 Unit Score / ruler；Calculation 使用既有 Score 与目标期 Workload。

### D-048｜AdjustmentTable 是后续 Calculation 的工作基准
完整测算积分表作为后续调整与计算的基准；AdjustmentTable 是完整复现测量分数表的 working artifact。

### D-049｜Fork 语义
Measurement fork 与 AdjustmentTable fork 均为人工触发；旧分支保持独立，原对象仍可编辑。Calculation 本身不是 fork。

## Q-07｜Slot acceptedCardTypes / Result ID / Relation 归类

### D-050｜acceptedCardTypes 是 Slot 定义属性
`acceptedCardTypes` 是持久化 Slot definition attribute，不是 Relation fact，也不是 UI state。

### D-051｜acceptedCardTypes 唯一规则源
由 SlotType 通过 `deriveAcceptedCardTypes(slotType)` 推导。

### D-052｜canAcceptCard 使用派生规则
Slot 接收判断通过 `canAcceptCard` 等统一规则执行。

### D-053｜Calculation ScoreResult row ID
ScoreResult 行 ID 必须包含 CalculationResult batch identity，避免不同 CalculationResult 的行 ID 冲突。

### INV-068｜ScoreResult ID 不得跨 CalculationResult 冲突
不同 CalculationResult 中相同 ScoreDefinition + Workload 组合，也必须得到不同 ScoreResult row ID。

### D-054｜D-102：Reference 与 Relation 的判定
允许作为保存引用的 composition/source refs，例如 baselineMeasurementResultId、adjustmentTableId、workloadId、definitionId；但独立、等价业务对象之间的业务关系，例如 split、assign、occupy、reuse、derive、adjust，必须使用 Relation。如果无法明确属于哪一类，应记录待裁决项，不得自行随意分类。

## Q-08｜Workload Definition / Execution / Graph / Snapshot

### D-055｜Data Source 是事实源
上传医院实际业务数据形成 Data Source。

### D-056｜Data Object / Business Fields
Data Source 中的数据表及业务字段作为统计计算基础。

### D-057｜Workload Definition 是统计规则
Workload Definition 不是工作量目录，而是可配置统计规则，至少描述 source Data Object、statistic field、aggregation/calculation method、time field、filters/conditions、dimensions。

### D-058｜Workload Execution 是执行阶段配置
Definition 与 Execution 分离。Execution 根据 Measurement / Calculation 等工作阶段配置 period、conditions 和必要执行参数。

### D-059｜Workload Result 是实际结果
Workload Result 是 Definition + Execution 在数据上的实际统计结果。

### D-060｜Workload Card 是业务/视觉载体
Workload Card 引用 Workload Result，用于模型构建和业务操作。

### D-061｜同一 Definition 可产生多个 Result
同一 Workload Definition 在不同 Period / Conditions / Dimensions 下，可以产生多个 Workload Results。

### D-062｜Measurement 与 Calculation 可共享 Definition
Measurement 与 Calculation 可以使用同一 Definition 和数据源，但执行配置、期间和 Result 可以不同。

### D-063｜重新执行产生新的有效 Result
重新执行时，不覆盖历史结果；新的有效 Workload Result 可以成为当前 Workload Card 所跟随的最新有效结果。

### D-064｜保存的 CalculationResult 不受后续 Result 静默影响
CalculationResult 必须通过 Snapshot/result snapshot 保持稳定。

### D-065｜ResultSet 可以包含多个 ResultItem
ResultSet 可以包含 grouped / row-level 等多个 ResultItem。

### D-066｜ResultItem 不是业务 hierarchy
ResultItem 携带 value、dimensions/location；统计 grouping hierarchy 不等于 Unit/Workload/Budget hierarchy。

### D-067｜Current row 是 Row Context
Calculation 中的 current row 只是当前数据行 evaluation context，不是业务对象。

### D-068｜Aggregate 的数据范围
Aggregate 可以作用于 Definition + Execution 条件过滤后的 execution dataset。

### D-069｜Calculation Graph 是结构化算法
最小 Graph 节点包括 FieldRef、Constant/ParameterRef、Aggregate、Condition/Filter、Arithmetic、Output。

### D-070｜Graph 必须表达引用与 scope
Graph 必须明确 currentRow、perDataset、perGroup 等 scope/reference 语义。

### D-071｜Calculation Graph 是算法，不是完整版本
Graph 描述结构化计算算法；完整可复现状态由 Calculation Snapshot 保存。

### D-072｜Snapshot 是不可变完整计算足迹
Snapshot 记录理解/重现计算所需状态，包括 Data Object / Data Source、Business Fields、Definition state、Execution config、Calculation Graph、Output column definitions、Result dimension definitions、必要 data/model version refs、note、derivedFromSnapshotId。

### D-073｜Snapshot 不可原地修改
任何调整均产生新的 Snapshot；旧 Snapshot 保留历史轨迹。

### D-074｜正确计算链
```text
Data Source → Data Object / Business Fields → Workload Definition → Workload Execution → Calculation Graph → Calculation Snapshot → execute → Result Set → Workload Result → Workload Card
```

### D-075｜Calculation 是整体数据处理
Calculation 不是“针对某一个业务行”的动作；current row 只作为计算表达式 evaluation context。

### D-076｜Definition + Execution 决定 Graph
Definition 与 Execution 决定计算所需 Graph；执行前由 Snapshot 冻结实际状态。

### D-077｜Result column 是计算输出
Calculation 可以产生 result column；之后可基于结果列进行进一步过滤、分组、聚合形成 Workload Result。

### D-078｜Workload Result 可以继续统计
Workload Result 不只是单个显示数字，也可以是对 Result Set / result columns 进一步处理得到的业务统计结果。

### D-079｜Workload Result 的统计条件必须保留
结果必须保留其实际统计维度和条件，便于继续 split/aggregate。

### D-080｜Q-08-H 图执行规则
GraphExecutor：Definition.conditions 与 Execution.conditions 均进入 Execution Dataset；frozen Snapshot 是实际执行依据；perGroup 约束必须验证；perDataset 不得依赖 currentRow；中间计算结果不得直接伪装为 WorkloadResult。

## Q-09-A｜Workload Result / Card / Resolution

### D-118｜Workload Result 是统计事实
Workload Result 是统计事实；Workload Card 是其业务使用载体。

### D-119｜Workload Card 引用 WorkloadResult
Workload Card 通过 `workloadResultId` 引用 Workload Result，不复制其业务事实。

### D-120｜同一 Result 可被多个 Card 引用
同一 Workload Result 可以被多个 Workload Card 引用。

### D-121｜当前 Card 可跟随最新 Result；保存结果必须稳定
当前 Workload Card 可以跟随最新有效 Workload Result；但已经保存的 CalculationResult 不得因未来 Workload Result 更新而静默改变。

### D-122｜拖入 Unit Slot 后可补充 Workload Split
Workload Card 拖入 Unit Slot 后，如果 source data + Unit hierarchy 等条件支持，可以提供“按子 Unit 拆分”的建议。

### D-123｜Supplemental split 形成 child Result/Card
用户确认 split 后，创建 child Workload Result/Card，并通过 `workload_split` 建立正式关系。

### D-124｜拖入 Unit Slot 首先建立业务关联/use
拖入 Unit Slot 的核心业务意义是 Workload–Unit association/use，而不是改变 Workload statistical hierarchy。

### D-125｜Split feasibility 必须有实际证据
Split feasibility 必须由 source data、Definition、target Unit children、mapping evidence、必要业务条件共同证明。Unit hierarchy alone 不足以证明 split 可行。

### D-126｜Parent Workload 保留
Supplemental split 后 parent Workload Card 仍保留；child Workload 通过 workload_split 形成。

### D-127｜Split 状态是派生状态
unsplit / partial / full split status 是派生状态，不是独立 Relation fact。

### D-128｜Resolution 是 Workload 在 Unit context 下的业务解析
Unit Card 是 Workload Resolution 的业务上下文。Resolution 不是简单 card binding。

### D-129｜四种 Resolution Match
Resolution 必须严格支持四种互斥且穷尽结果：Exact Match、Ancestor Match、Descendant Match、No Match。

### D-130｜Resolution 是 Recommendation Layer
Resolution 只产生 recommendation/finding，不直接改变 Domain Fact。

### D-131｜Sharing 与 Splitting 不同
Sharing：多个 Unit/model 使用同一 Workload Result/Card，不复制统计事实。Splitting：产生新的 child Workload Result/Card，使用 workload_split。

### D-132｜Shared state 由 Relation 推导
不在 WorkloadCard 上保存 `shared` 作为事实字段。UI 可以根据 active use Relations 显示 shared badge/Inspector 信息。

### D-133｜向上 aggregation 优先寻找已有结果
向上聚合时，优先寻找已有匹配 Workload Result/Card；不存在时才提供 aggregation suggestion。

### D-134｜Partial aggregation 合法
只选择部分 descendants 进行 aggregation 是合法的。系统不得自动补全未选择 child。

### D-135｜Partial aggregation 必须保留真实统计条件
Partial aggregation 必须保留实际统计条件和范围，不能伪装成完整目标 Unit workload。

### D-136｜Resolution 必须展示 matching basis
用户必须能够看到 Resolution 的匹配依据，包括 Unit relation、split feasibility、aggregation feasibility、mapping evidence。

## Recommendation Architecture

Recommendation 是通用推荐容器，当前包括 Recommendation、RecommendationKind、RecommendationStatus。Resolution Recommendation 通过 `Recommendation.kind = "resolution"`、`Recommendation.payload = ResolutionRecommendation` 表达。

Recommendation status `recommended / accepted / ignored / dismissed` 表示推荐生命周期，不等于业务事实生命周期。

### 关键原则：accepted ≠ Fact
即使 `Recommendation.status = accepted`，也只代表用户接受该推荐，不代表 Relation、WorkloadSplit、WorkloadResult 或 WorkloadCard 已经建立。真正 Fact 的创建必须由外层 Action/执行层完成。

## Q-09-A 一致性审查 Issue Ledger

### Issue 1｜Dangling workload_split
曾存在指向已删除 `workload-orthopedics-outpatient` 的 dangling `workload_split` Relation。已删除并同步测试。**PASS**。

### Issue 2｜Assign relation dimensions
曾提出所有 assign relation 的 dimensions 是否必须与 source Unit 完全一致。当前没有足够证据证明这是实际架构缺陷。不修改。**PASS**。

### Issue 3｜WorkloadCard.value 与 WorkloadResult.value
WorkloadResult 是权威统计事实；WorkloadCard.value 仅可作为 display cache，不得用于业务计算。`deriveBackCalculatedBudget` 已改为接受 WorkloadResult，并使用 `WorkloadResult.value` 与 `WorkloadResult.period`。**PASS**。

### Issue 4｜Neurosurgery workload dimensions
Neurosurgery workload Result/Card 的 dimensions 与当前 mock chain 一致。**PASS**。

### Issue 5｜Wang XX actual period
Wang XX 的实际工作期间与 Workload Result/Card 关系一致。**PASS**。

### Issue 6｜getIdleWorkloads assign/share
`getIdleWorkloads()` 同时考虑 workload_assign 与 workload_share 作为 active use evidence，符合 D-124 / D-131 / D-132。**PASS**。

### Issue 7｜scoreService workload value
`scoreService.runCalculation()` production code 不读取 WorkloadCard.value；CalculationInput.workloadValue 是显式 calculation input。unit test 的硬编码 workloadValue 属于纯计算单测，不要求耦合 mock WorkloadResult。**PASS**。

### Issue 8｜Disease weight ResultSet output
Disease weight ResultSet 的 output column 与 Calculation Snapshot output column 一致。**PASS**。

### Issue 9｜deckStore / recommendationStore 双事实源
recommendationStore 中是 Recommendation domain data；deckStore 中仅存在 UI scaffold fields。当前未形成生产级双事实源，属于未使用 scaffold，不是 Q-09-A blocker。**PASS**。

### Issue 10｜Resolution runtime chain
当前不存在正式 Resolution runtime call chain。已有 Resolution types、Recommendation types、mock recommendations、DataService recommendation retrieval；缺失 Resolution algorithm、ResolutionContext builder、ResolutionService、runtime recommendation generation、UI trigger、Action execution。`MockDataService.getRecommendations(_context)` 当前只是 mock retrieval，不应误判为 Resolution algorithm。**PASS**。

（历史注记：此为 Q-09-A 审查时点记录。Resolution algorithm、ResolutionContextBuilder、ResolutionService、Recommendation generation、Action execution 已在 Q-09-B 中实现并通过测试。Production Interaction Runtime 仍归入 Q-09-C，尚未开始。）

## 当前 Resolution 实现边界

截至 Q-09-B Domain Engine / Runtime Boundary 关闭，Resolution 当前存在于：
```text
Type Layer + Domain Service Layer + Context Builder（DataService 生产入口 + mock 测试适配层）+ Action Executor + ActionSubmissionService + Persistence
```

已实现：
```text
ResolutionService（resolveWorkloadToUnit，纯函数）
ResolutionContextBuilder（生产入口 buildFromDataService 已实现，生产文件零 mock import；mock 构建路径迁至 src/mock/mockResolutionContextBuilder.ts，仅供测试）
Runtime Recommendation Generation（generateRecommendation）
Action Executor（executeUserDecision / executeSplitWorkload 等）
Persistence Orchestration（ActionSubmissionService，五阶段有序提交）
```

尚未实现（归入 Q-09-C Interaction Runtime）：
```text
sourceDataObjects / mappingEvidences 生产来源（buildFromDataService 当前不填充，ResolutionService 返回 cannot_determine）
Resolution 生产运行时触发入口（UI / Store 层调用）
Drag/Drop Runtime
UI Confirmation Flow
Canvas / Deck / Slot / Inspector 集成
```

（历史注记，2026-10-10 补：上述"尚未实现"清单为 Q-09-B 关闭时点快照——其中 mappingEvidences 生产投影已于 2026-10-04 实现，Resolution 生产触发入口、Drag/Drop Runtime、UI Confirmation Flow、Canvas/Deck/Slot 最小集成与 Matching Basis 最小区块展示（详情面板承载，无独立 Inspector 组件）均已随 Q-09-C Interaction Runtime 于 2026-10-07 关闭时完成；sourceDataObjects 保持 H-1 裁定 A 的 Phase 2 DEFERRED。当前状态以本文件"当前状态"节与 PROJECT_STATUS.md 为准。）

## 当前 Resolution 推荐类型

现有 ResolutionRecommendationType：
- `use_existing_result`
- `use_existing_result_with_confirmation`
- `split_workload`
- `find_existing_workload`
- `aggregate_descendants`
- `no_match`

特别注意：**发现已有等价 Result ≠ 自动复用**。即使系统发现等价 WorkloadResult/Card，也只是 prompt/recommendation condition；不得静默建立 workload_assign、修改 Card、创建 split 或其他 Fact。

## Q-09-B/C 任务分块与当前状态

### Q-09-B｜Resolution Domain Engine
状态：**CLOSED / PASS**

包含：
- resolutionTypes（ResolutionContext / ResolutionResult / ResolutionRecommendation / MatchBasis）
- ResolutionService（resolveWorkloadToUnit 纯函数）
- ResolutionContextBuilder 的领域构建职责
- 四种 MatchType（exact / ancestor / descendant / none）互斥穷尽
- MatchBasis 完整性（sourceDataObjectId / definitionId / executionId / mappingEvidence / splitFeasibility / aggregationFeasibility）
- Recommendation generation（含 existing result 不自动复用、split/aggregation feasibility 不自动补全）
- D-129～D-136
- Domain tests（resolutionService.test.ts 41 tests + resolutionContextBuilder.test.ts 15 tests）

### Q-09-B｜Runtime Boundary
状态：**CLOSED / PASS**

包含：
- ResolutionService 与 ActionExecutor 边界：Resolution 只分析、只产生 Recommendation、不产生 Fact
- RecommendationStore 与 ActionExecutor 边界：Store 管理推荐生命周期，调度 Action 和 Persistence
- ActionSubmissionService persistence boundary：全项目唯一 save* 调用方，五阶段有序提交
- D-139～D-141
- 当前生产代码调用链审查（recommendationStore → ActionExecutor → ActionSubmissionService → DataService）

### Q-09-C｜Atomicity & Failure Recovery
状态：**CLOSED / PASS**

包含：
- Persistence Order Invariant（WorkloadResult → WorkloadCard → Relation → WorkloadSplit → Recommendation accepted）
- Recoverable Commit（不宣称 Transaction Atomicity）
- deterministic ID + upsert + retry idempotency
- Failure Recovery Model（Case A/B/C）
- Recommendation lifecycle consistency（失败保持 recommended，成功才 accepted）
- D-120：不同 Recommendation 可创建不同 WorkloadCard，即使引用同一 WorkloadResult
- Test A～E（saveWorkloadResults / saveCards / saveRelations / saveWorkloadSplits 各阶段失败恢复 + retry 幂等 + D-120 验证）

### Q-09-C｜Interaction Runtime
状态：**CLOSED / PASS（2026-10-07）**

范围/状态归档记录（非业务裁定；D-118~D-149 正文未动）：核心生产闭环（Drop → Resolution → Recommendation → Matching Basis → Confirm/Cancel/Dismiss → ActionExecutor → ActionSubmissionService → Domain Fact 持久化 → accepted/ignored/dismissed）经行为级测试全线验证；accepted 仅发生在事实持久化成功之后；D-142 re-offer、D-145 identity 省略路径、D-146 幂等恢复、D-147 显式 id 唯一、D-148 锚点 identity + D-142 split re-confirm、D-149 Matching Basis Snapshot 均已落地。当前 App/Canvas/Recommendation/Confirm UI 属 Runtime 验证用最小竖切片，不代表正式产品 UI 设计完成。以下归入后续阶段（不属 Q-09-C 未完成）：完整 Canvas/Deck/Slot 产品化（AGENTS §28 Phase 3）、完整 Matching Basis Inspector/UX、DataService production adapter。sourceDataObjects 保持 H-1 裁定 A 的 DEFERRED（Phase 2，不伪造）；已有 Result 创建第二张 WorkloadCard 保持 D-148 CASE/SEE 暂缓；aggregate 执行能力保持确定性 capability boundary（D-137~139）。关闭基线：363/363 PASS，typecheck PASS，build PASS。

已完成（2026-10-03）：
- ResolutionContextBuilder 生产接入：buildFromDataService(dataService, workloadCardId, targetUnitId) 从 DataService 取数构建 ResolutionContext
- 生产文件 src/domain/workload/resolutionContextBuilder.ts 零 mock import（D-139 落实）
- mock 构建路径迁移至 src/mock/mockResolutionContextBuilder.ts（测试专用适配层，复用生产导出的 hierarchy 纯函数）
- Definition 缺失时抛出含 definitionId 的显式错误（消除 undefined.id 崩溃风险）
- 新增 8 个 buildFromDataService 生产路径测试（全项目 207 → 215 tests）
- Production Resolution Trigger：src/services/resolutionTrigger.ts —— resolveWorkloadToUnitAndRecommend(dataService, workloadCardId, targetUnitId) 唯一正式生产触发入口：buildFromDataService → resolveWorkloadToUnit → Recommendation(kind="resolution", status="recommended", relatedEntityIds=[workloadCardId, targetUnitId]) → recommendationStore.addRecommendation（含 ResolutionRecommendation → recommendationStore 正式接入）
- 稳定推荐 ID `rec-resolution-${workloadCardId}-${targetUnitId}`；D-142 重新触发语义落实（同 ID 后写覆盖，处理后重触发恢复 recommended）
- recommendationStore.addRecommendation 由纯追加最小改为同 ID 后写覆盖；新增 11 个 trigger 测试（全项目 215 → 226 tests）

未来工作（2026-10-07 与代码实况同步后；不改变任何 D-xxx 决策语义）：

明确 DEFERRED（既有裁定）：
1. sourceDataObjects 的正式生产来源（Data Object 模型等待 Phase 2，H-1 裁定 A）
2. 已有 Result 创建第二张独立 WorkloadCard（D-148 CASE/SEE 原则下明确暂缓）

尚未开始——完整产品化（对应最小竖切片均已 CLOSED / PASS，勿重复列为未完成）：
3. 完整 Canvas / Deck / Slot 产品化（拖动重定位 / 缩放 / 平移 / 自动布局 / React Flow）
4. 完整 Matching Basis Inspector（当前为详情面板最小区块）
5. DataService production adapter

已完成并从清单移除（竖切片于 2026-10-07 CLOSED / PASS，此前误列为未来工作）：
- WorkloadCard → UnitSlot 的 Drag/Drop Runtime（dropTrigger + dropInteraction + 原生 HTML5 DnD）
- Recommendation UI（列表 / selection / detail / Confirm·Cancel·Dismiss / confirm_split 参数确认——D-145 省略路径 + D-142 re-confirm）
- Matching Basis 最小展示（D-149 Snapshot + selector + 区块渲染）
- Canvas / Deck / Slot 最小集成（canvasBootstrap + upsertCardPlacement + 动态 Slot 真实数据流）
- split → Result / WorkloadSplit / Relation / Card 真实持久化闭环（UI 全链测试实证）

更早完成并移除：
- mappingEvidences 生产投影（deriveMappingEvidences + evidence gate，D-146）
- ResolutionContext Relations 注入（workloadAssignments 投影；split feasibility "cannot_determine" 双根因已解决）

**以上未来工作当前不开始。**

## Q-09-B/C Architecture / Runtime Boundary Decisions

> 以下 D-139～D-141 属于 Architecture Decision / Implementation Boundary，不是新的医院业务语义裁定。它们是对 D-129～D-136 已确认业务语义在工程实现层的具体落实。不改变任何已有 D-xxx 的业务含义。

### D-139｜ResolutionContextBuilder 是生产 ResolutionContext 的唯一正式构建入口
ResolutionContextBuilder 是生产 ResolutionContext 的唯一正式构建入口。生产与测试边界：

- 生产代码必须通过 ResolutionContextBuilder.buildFromDataService() 构建 ResolutionContext；
- 生产环境从 DataService 获取数据，不直接 import mock 模块（原有约束不变）；
- MockResolutionContextBuilder（src/mock/mockResolutionContextBuilder.ts）仅为测试适配器，不属于 Production Runtime；
- 测试适配器可以构建测试专用 ResolutionContext，但不得被生产代码调用。

本条为对 D-139 原有表述的边界澄清：不改变原有架构约束，不新增业务 Decision。

落实状态（2026-10-03 实现；2026-10-05 状态同步）：生产入口 buildFromDataService(dataService, ...) 已实现，生产文件零 mock import；mock 构建路径已迁移至 src/mock/mockResolutionContextBuilder.ts（测试专用适配层）。生产触发入口（src/services/resolutionTrigger.ts）与 mappingEvidences 生产投影均已实现；唯 sourceDataObjects 仍无正式生产来源（Data Object 模型明确 DEFERRED 至 Phase 2，不伪造）。

### D-140｜Resolution 不执行 Fact 创建
ResolutionService 只负责分析并产生 Recommendation，不执行 Relation、WorkloadSplit、WorkloadResult、WorkloadCard 等 Fact 创建。此原则为 D-130（Resolution 是 Recommendation Layer）在 Runtime 层的具体落实。

### D-141｜ActionExecutor 与 Persistence 分离
ActionExecutor 与 Persistence 严格分离：ActionExecutor 负责产生内存中的 Domain Facts 并返回 ActionExecutorResult；持久化由 ActionSubmissionService 唯一负责。此原则与 Q-09-C Atomicity & Failure Recovery 的 Persistence Order Invariant 互补。

## Q-09-C Interaction Runtime Business Decisions

### D-142｜同对重复触发将同 ID 推荐重新置为 recommended
同一 WorkloadCard + TargetUnit 组合对应一个稳定的 Resolution Recommendation ID。推荐被处理（accepted / ignored / dismissed）后，再次执行相同 Resolution Trigger 时允许重新提出推荐：使用同一稳定 ID，状态重新置为 recommended，store 中不产生第二条同 ID 记录。

- accepted / ignored / dismissed 表示"已经处理过"，不表示永久禁止再次推荐；
- 不采用"处理过一次以后永不推荐"；不采用"每次触发创建新 Recommendation ID"；
- 不要求保留每次触发产生的历史记录；现有 Recommendation 生命周期状态机（recommended / accepted / ignored / dismissed）保持不变；
- 重新触发只作用于 Recommendation 层，不触碰任何 Domain Fact（Relation / WorkloadResult / WorkloadSplit / WorkloadCard）。

（2026-10-03 用户裁定方案 A；落实于 recommendationStore.addRecommendation 同 ID 后写覆盖 + resolutionTrigger 稳定 ID 注册，见 src/tests/resolutionTrigger.test.ts 重新触发语义测试组。）

### D-143｜生成型 child WorkloadCard ID 的单射身份规则
confirm_split 创建的 child WorkloadCard，其身份输入为 recommendationId + "::" + childWorkloadResultId。ID 生成必须满足确定性与单射性：相同 (recommendationId, childWorkloadResultId) → 必然相同 Card ID（同一 UserDecision retry upsert 同一 Card）；不同 Recommendation / 不同 child Result 组合 → 必然不同 Card ID。不得依赖存在理论碰撞可能的短哈希作为唯一身份保证。Card ID 采用与批次域 ID 一致的共享单射安全编码（src/shared/idEncoding.ts：workload-card-<encodeIdComponent(...)>）。

落地约束：本 ID 算法切换已于真实持久化适配器接入前完成（2026-10-04）；真实持久化落地后若仍存在旧 32-bit hash 形式的 Card ID，则需要迁移兼容方案，不得直接假定新旧 ID 可互换。

### D-144｜WorkloadResult 身份 = 一次确定的分析执行结果
WorkloadResult 的身份属于"一次确定的分析执行结果"：

1. 新的有效分析执行原则上产生新的 WorkloadResult identity；
2. 同一次分析执行的 retry 必须复用同一个 WorkloadResult identity（稳定 ID + upsert 幂等，既有机制）；
3. Data Source / Data Version、Definition、Execution 条件或期间、Calculation Graph / Snapshot 变化导致新的分析工作时，不得原地修改既有 WorkloadResult，新分析执行产生新的 WorkloadResult；
4. 咨询组重新使用已有统计结果不产生新的 WorkloadResult，咨询层变化由 WorkloadCard / Relation / UserDecision 表达（D-119/D-120 既有边界）；
5. 不以"value 是否变化"单独作为 WorkloadResult identity 判据。

实现现状（2026-10-05 核查）：既有执行链（executeSnapshot → ResultSet → createWorkloadResult）每次执行产生新身份，符合规则 1/3；ActionSubmissionService 稳定 ID + upsert 符合规则 2；use_existing 系列动作符合规则 4；无 value-based identity 逻辑符合规则 5。已知边界：confirm_split 显式 children[].id 跨 D-142 决策复用可在 saveWorkloadResults upsert 中改写既有 Result——该路径是否属于"修正同一执行结果"还是"新执行劫持旧身份"，取决于 H-2（explicit children[].id 语义）的最终裁定；当前无生产调用方（UI 未建成），不构成现存违反。

### D-145｜confirm_split 显式 children[].id 的执行内身份规则（H-2）
UserDecision.splitParameters.children[].id 表示"本次 Split Execution 所创建的 child WorkloadResult 身份"，不是"引用既有 WorkloadResult"的输入：

1. 同一 execution 的 retry：可以继续使用相同 children[].id，必须得到相同 WorkloadResult identity，必须幂等（与 D-144 规则 2 一致）；
2. 不同 execution（含 D-142 新 UserDecision）：不得复用已经属于其他 execution 的 child WorkloadResult ID；发现该 ID 已属于其他 execution 时必须明确拒绝，不得经 upsert 静默覆盖旧 WorkloadResult；
3. 业务目标是"继续使用已有 WorkloadResult"时必须走既有引用路径（use_existing 系列动作 + workload_assign），不得经 confirm_split.children[].id 伪装为新建——confirm_split（创建新统计事实）与 use_existing/assign（使用既有统计事实）自此为正式职责边界；
4. D-142 新 UserDecision：新 executionBatch，原则上必须产生新的 child Result identity——可不提供 children[].id 由系统按批次生成（裁定②），也可提供尚未被任何 execution 占用的新的显式 ID；
5. 不改变 D-120 / D-121 / D-142、confirm_split 必须使用 decision.splitParameters（裁定 A）、executionBatchId 规则、encodeBatchKey、child Card ID 规则（D-143）。

执行缺口（2026-10-05 审查，待实施轮处理）：
- splitService 现状为 `child.id || 批次生成`，无跨 execution 占用检查——实施层应增加身份冲突检测，候选位置为 ActionExecutor（context 已含 existingWorkloadResults/existingWorkloadSplits，且当前批次可由 decision 确定）前置拒绝 + ActionSubmissionService 持久化边界兜底；
- 归属判定信号：批次编码的 WorkloadSplit ID 可证明"本批次归属"，但持久化顺序（Result 先存、Split 后存）存在"结果已存、分解记录未存"的部分失败窗口，该窗口下无法用现有字段无歧义证明既有 Result 属于本执行——窗口内策略（严格拒绝 vs 内容全同则按幂等断言放行）需在实施轮前小范围裁定；
- 受影响存量测试（语义为"两次 confirm_split 建同一 Result"的跨 Recommendation 场景，与 D-145 冲突，待重构）：actionExecutor.test.ts Test B（D-120，wr-split-child-d120 跨两 Recommendation 复用）、Card-ID 测试组"不同 recommendationId + 相同 childResultId"（wr-cardid-shared）。D-120 本身不受影响——"多卡一果"应由一次创建 + 多次引用/多卡表达。

### D-146｜confirm_split 显式 child ID 的幂等恢复例外
confirm_split 的显式 child WorkloadResult ID 跨 execution 原则上禁止复用（D-145）。补充例外：当显式 child ID 已存在、且 execution ownership 因部分持久化失败（Result 已保存、WorkloadSplit/后续事实未保存）无法用现有字段确认时——若已有 WorkloadResult 与本次 split 即将创建的 child Result 业务内容完全一致（resultSetId / resultItemId / name / value（null≠0）/ dimensions（键集+键值）/ period 结构比较；id 为查找键不参与），允许将其视为同一次执行的幂等恢复 retry，继续完成后续持久化。绝对禁止：已明确属于其他 execution 的 ID 即使内容完全一致也必须拒绝；内容存在任何业务字段差异也必须拒绝（不得 upsert 覆盖、不得解释为修正、不新增 revision/correction 字段）。

判定程序（已实现 2026-10-05；同日 P1 补强：current 与 unknown 均须 exact-content 全同才放行）：不存在 → 创建；明确当前批次（引用该 child 的 WorkloadSplit ID ∈ 当前批次确定性期望 ID）且内容全同 → retry 幂等放行（内容有差异 → 拒绝，同批次身份下不得提交另一份不同内容，D-144 规则 2）；明确其他批次 → 拒绝（不论内容）；ownership unknown → exact-content 全同 → 幂等恢复，有差异 → 拒绝。检查双层：ActionExecutor（context.existingWorkloadResults/Splits + 当前批次）前置拒绝；ActionSubmissionService（保存前 getWorkloadResults/getWorkloadSplits 重查，先检查再保存，不得先 upsert 后判断）stale-context 兜底。splitService 保持纯函数（batchSplitId / determineChildIdOwnership / workloadResultContentEquals 均为无数据访问的导出纯函数）。

### D-147｜同一 Split Execution 中显式 child ID 必须唯一
同一个 confirm_split / Split Execution 中，显式提供的 children[].id 必须唯一：出现重复即为非法输入，整个 UserDecision 立即拒绝（零 Domain Fact 创建，Recommendation 保持 recommended）。不得合并重复 child、不得"后者覆盖前者"、不得依赖数组顺序决定最终值（D-144：一次确定执行对同一 identity 只有一个结果）。无显式 id 的 children 不参与本规则，继续使用批次生成逻辑。校验位于 splitService 输入校验（与空 children / null value 同族），已实现 2026-10-05。

### D-148｜Split 是分解：统计锚点唯一、顺序无业务语义
Split 阶段是对原有统计事实的分解。规则：

1. 统计锚点唯一性：同一 Split Execution 中，(resultSetId, resultItemId) 只能出现一次——无论 children[].id、name、value、dimensions 是否不同。同一统计结果在一次拆分中只能对应一个 child Result；显式 child.id 只是本次新建 child 的命名，不能绕过锚点唯一性。
2. children 排列顺序不具有业务意义：不参与 WorkloadResult identity，也不参与 WorkloadSplit identity。仅交换顺序的同一次执行 retry 必须得到完全相同的业务事实（不导致 retry 失败、不导致分解记录身份/关联变化）。
3. Split = decomposition，Reuse / Compose = later operation：同一统计结果的重复使用、组合、多用途或多 Card 承载，属于后续业务操作（D-120 的引用/复用结构），不得在 Split 阶段制造重复 child Result。

实施记录（2026-10-05 已完成，300 tests）：生成型 child Result ID = parent + enc(executionBatchId) + enc(resultSetId::resultItemId)（锚点型、无 index/value/name、换序不变、D-142 隔离）；统计锚点唯一性输入校验已落地（与 D-147 同点同族，显式 id 不能绕过）；ownership 期望 Split ID 改为逐 child 以其 Result ID 计算（batchSplitId 签名 index → childResultId），三分支语义不变。

实施偏差（如实记录）：WorkloadSplit ID 采用 parent + enc(executionBatchId) + enc(childResultId)，较设计轮建议形式（parent + enc(childResultId)）保留批次段。原因：显式 child id 本身不含批次，批次段是 determineChildIdOwnership 判定 "other"（跨 execution 复用——D-145 要求无论内容必拒）的唯一证据；若去除批次段，"other + 内容全同 → 必拒" 的已裁定行为不可实现（Test B / 场景 5 语义将失效）。该形式仍满足 D-148 全部硬性要求：不含 index、换序不变、同次 retry 同 ID、D-142 新 child → 新 Split identity。迁移约束：与 D-143 同款——真实持久化适配器接入前完成本 ID 方案切换；之后若存在旧 index 形式 ID，需迁移兼容方案，不得假定新旧可互换。

### D-149｜Matching Basis 以结构化快照随 Recommendation 保存
Recommendation 必须能够展示其产生时的 Matching Basis；Matching Basis 以推荐产生时的结构化快照随 Recommendation 保存（D-136 在 Runtime 层的落实）：

1. 快照只保存解释推荐所需的 Matching Basis 子集（matchType、matchDetails、matchBasis 中解释性字段），不复制完整 ResolutionResult；
2. 快照由 Resolution Trigger 在生成 Recommendation 时从当次 ResolutionResult.matchBasis 提取，来源只有当次 Resolution，不在 UI 层重算、不由其他层重构；
3. 同一 Recommendation ID 的 D-142 re-offer，快照随本次重新计算结果更新（upsert 语义）；
4. 分层原则：Resolution Engine 负责计算判断；Recommendation 负责承载建议及其当时依据；Recommendation 不得成为第二个 ResolutionResult 仓库；
5. 不改变现有 Recommendation 的 type / reason / targetResultId / splitPlan / aggregatePlan 语义，不产生新的 Domain Fact。

## 交互框架固化 Decisions（2026-10-08 人工确认；Q-09 关闭后、UI 产品化前）

> 以下 D-150～D-152 为对已确认交互语义的正式固化，目的是防止后续开发发生语义漂移。它们不推翻、不修改 D-118～D-149 任何正文：D-150 是对 D-124 / AGENTS §20 在时序与操作语义上的确认补全；D-151 与 D-142（同 ID 重新触发机制）互补但互不替代；D-152 与 D-139～D-141 同属交互架构边界裁定。Q-09-C 归档记录中的"Drop → Resolution → …"竖切片链路描述是当时实现状态的归档，不构成本节语义的上限或例外。

### D-150｜成功 Drop 即建立 Relation；Resolution 发生在其后，不是前置审批

对于一个有效的 Slot：用户将 Card 成功拖入并释放，本身就是"建立业务关系"的用户操作。

Drag → Drop 成功 = Relation 建立。

不得理解或实现为"Drag → Drop → 等待系统判断是否建立 Relation"。

完整确认链路：

```text
User Drop → Relation Established → 有效关系上下文变化 → Resolution → Recommendation → UserDecision → Business Action / Fact Mutation
```

1. Resolution 不是建立 Relation 的前置审批；Recommendation 也不是 Relation 建立的确认步骤。
2. Resolution / Recommendation / UserDecision 处理的是关系建立之后"接下来可以做什么"（split / aggregate / use_existing 等），不影响 Drop 已建立的 Relation 事实。
3. UI drag state ≠ business relation change：开始拖动未 Drop、拖到无效位置（AGENTS §20 静默取消）、取消拖动、暂时拖离后恢复原关系、单纯 UI 动画/视觉移动，均不构成关系变化；只有真正导致业务关系变化的成功操作才触发关系变化后的重新 Resolution（D-151）。本条与 D-010 互补：D-010 管交互状态字段不进 domain，本条管事件语义。
4. 本条不改变 D-124（拖入 Unit Slot 首先建立业务关联/use，不改统计层级）与 AGENTS §20 的既有含义，是其时序与操作语义的明确化。
5. RelationType 映射（2026-10-08 固化）：WorkloadCard 成功 Drop 到 UnitCard 的 Workload Slot 时，建立 workload_assign Relation——该 Relation 表示 WorkloadCard 与 Unit 的业务使用/关联关系，不是统计层级关系，也不是 Workload Split（D-124 / D-005 / D-007 既有边界不变）。既有 workload_assign 的业务键、方向、幂等逻辑均不因本条改变；业务键幂等规则继续适用，Drop 建立的 Relation 在后续确认动作中按业务键复用，不产生第二条。

实现状态：**CLOSED / PASS（2026-10-09）**——dropTrigger 在合法 Drop 时先经 ActionSubmissionService.submitDropAssignRelation（语义明确的关系提交入口，业务键幂等同 P2-1，D-141 唯一 save\* 边界不破）建立并持久化 workload_assign，持久化成功或确认已有 active 关系之后才触发 Resolution；持久化失败返回 relation_failed、不触发 Resolution、不注册 Recommendation（经既有 actionError 通道透出）；无效 Drop（含目标卡不存在/类型不符）与 revoked 卡（D-154）静默忽略。覆盖测试：src/tests/dropTrigger.test.ts（13 项，含 saveRelations 先于 addRecommendation 的顺序证据）+ revocation.test.ts 组合场景（真实撤回产物 → 再次合法 Drop：旧 assign 不复活、新 active 关系、持久化先于推荐注册）。关闭基线：392/392 PASS，typecheck PASS，build PASS。边界如实记录："同一业务键撤回后重建"语义未定义，未实现；数据库级并发唯一性保证仍属后续事项（WK §16.5 Deferred）。以下为 2026-10-08 的历史核查记录，保留为审计轨迹：当前 Q-09-C 竖切片的 dropTrigger / dropInteraction 只转接 Resolution 触发（Resolution → Recommendation），未在 Drop 时建立对应 workload_assign Relation——本条与 D-124 的"Drop 即建立关联"尚未在运行时落地，属后续 UI 产品化实施范围；本条先行固化语义（含第 5 条 RelationType 映射），产品化实施时不得以竖切片现状为默认基线。

### D-151｜当前反馈只服务当前有效业务上下文；关系变化即失效并自动重新 Resolution

当用户真正改变了业务关系 / 当前有效业务上下文时：

1. 原有、依赖旧关系的当前反馈失效；
2. 不需要向用户提示"旧建议已失效"；
3. 自动针对新的有效关系重新执行 Resolution；
4. Resolution 可以产生新的 Recommendation（如果有）；
5. 是否执行 Recommendation 对应的业务动作，仍必须由用户决定。

"自动"只表示自动重新分析和推荐，绝不表示自动执行 Split / Aggregate / Assign 等业务动作。自动 Resolution ≠ 自动执行；自动 Recommendation ≠ 自动执行；只有 UserDecision 才能进入对应业务 Action（D-011 / D-130 / D-140 / D-142 既有边界不变）。

当前 Feedback UI 的定位是"当前有效业务上下文的待处理/可关注反馈"，不是历史审计界面：

- 关系已解除或改变后，不在当前 UI 中维护"历史反馈"展示，也不显示"旧建议已过期"类提示；
- 底层系统是否保留历史数据属于另一个独立问题（审计 / 追溯另行设计），不得为了当前 Feedback UI 强行增加历史展示模型。

例：Workload A → Unit B 已建立，用户将 A 从 B 移到 C：A→B 发生有效关系变化 → 旧当前反馈失效（不提示）→ 自动 Resolution(A, C) → 产生新 Recommendation（如果有）→ 用户决定是否执行。

### D-152｜决策入口按决策复杂度划分；所有入口收敛同一 UserDecision / Recommendation 执行链

1. Card-side Feedback Entry 与 Inspector 的取舍依据是"决策复杂度"，而不是 Matching Basis / 信息量大小：简单决策即使依据内容很多，也可以在 Card-side Feedback Entry 直接完成；复杂多参数决策才需要 Inspector。
2. 不同 UI 入口（Card-side / Inspector / 未来其他入口）必须最终进入同一个 UserDecision / Recommendation 执行链，不能各自形成独立业务逻辑。
3. 本条属交互架构边界裁定（同 D-139～D-141 性质）：只约束执行路径收敛不变量，不定义 Entry / Inspector 的具体产品形态（产品形态属 UI 设计阶段，受 docs/UI_DESIGN_OPERATING_CONTRACT.md Phase Gate 约束）。

## Split 撤回语义 Decisions（2026-10-08 人工确认）

> 以下 D-153～D-156 为 Split 撤回（层撤销 / 整条错误路径撤回）的产品语义裁定。D-153～D-155 为 2026-10-08 最终裁定；D-156 为 2026-10-09 追加的 D-154 局部修订（整条派生路径撤回的衍生 WorkloadCard 改为物理删除），同日经用户确认方案 A 由 **D-158** 扩展为"该路径产生的 WorkloadCard 与 WorkloadResult 一并彻底删除"。它们不推翻 D-118～D-152 任何正文；D-155 是对 D-146 幂等恢复例外的补充边界，不改变 D-145/D-146 的身份语义与 child ID 生成规则。

### D-153｜Split 撤回有且只有两种意图：当前层撤销 / 整条错误路径撤回

1. Split 撤回只有两种用户意图，必须走不同执行分支：**撤销"当前这一层 Split"（Layer Revocation）** 与 **"全部撤回 / 整条错误路径撤回"（Full-Path Revocation）**。禁止合并为一个"按使用情况自动保护后代"的模糊逻辑；"当前层撤销"的 used/unused 分流规则不得复用于"全部撤回"。
2. **当前层撤销**：撤销对象 = 该层全部 Split Relations（inactive，包括被保留的已使用子卡的拆分边——保留子卡不等于保留 active 拆分边）+ 本层未继续使用的直接派生物（派生 WorkloadCard / 派生 WorkloadResult 业务失效）。已有继续使用证据的直接派生子卡及其后续用途保留，不级联清理更深层、已继续使用的业务路径。"继续使用证据" = active 的 workload_assign / workload_share / budget_occupancy 引用该子卡，或该子卡为 active workload_split Relation 的 source（存在更深层拆分）。
3. **全部撤回**：从指定错误节点开始，沿 workload_split 自然派生拓扑做传递闭包，撤回所有下游派生 WorkloadCard / WorkloadResult 业务有效性 / 全部相关 workload_split Relations / 该派生链上的后续 assign / share / occupancy 等业务 Relations，以及由错误路径产生的 CalculationResult 与后续计算影响；**无视后代是否已被其他 Unit 继续使用，不保护任何自然派生后代**（内部理解注记："罪恶之树上没有无辜的果子"——仅为理解辅助，非正式工程术语）。入口节点本身保留。
4. **撤回对象白名单**：错误路径上的 Relation、错误路径产生的派生 WorkloadCard、派生 WorkloadResult 的业务有效性、错误路径产生的 CalculationResult、后续业务计算影响。**UnitCard、原始 WorkloadResult、与错误路径无关的 Unit 与业务配置，绝不因 Workload 撤回而被删除；任何对象不做物理删除。**（2026-10-09 范围标注：末句"任何对象不做物理删除"在"整条派生路径撤回的衍生 WorkloadCard"范围内已被 D-156 局部修订为物理删除；其余范围本条不变。）

### D-154｜撤回 = 业务失效（businessStatus = "revoked"），存储可存在、业务世界中等同不存在

1. 派生 WorkloadResult / WorkloadCard / CalculationResult 的撤回 = 业务生命周期失效：`businessStatus = "revoked"`（字段缺省 undefined = active，向后兼容既有数据与测试）。不做物理删除，不改写统计数值，不得以 0 值冒充撤回。（2026-10-09 范围标注：本项中 **WorkloadCard 与派生 WorkloadResult** 在"整条派生路径撤回"范围内已被 D-156 及 D-158（方案 A）修订为物理删除；CalculationResult、层撤销的未使用子卡及其他一切范围维持本条。）
2. WorkloadResult 是统计事实（D-118/D-144）：撤回不改写其任何数值/维度/期间字段；revoked Result 在业务查询中等同不存在——不进入正常 ResolutionContext、不作为 existing Result、不参与 Recommendation、不出现在 Slot / Deck / Canvas、不参与后续业务计算。
3. WorkloadSplit 记录保留分解事实，以 `metadata.revocationStatus = "revoked"` 标记该层业务终结（承载 D-155 批次终结证据）。
4. CalculationResult 撤回 = 整体 `businessStatus = "revoked"`；"待计算 / 待配置"是**派生状态**（当前不存在有效 CalculationResult 即 pending），不新建 pending 存储对象，不得以 totalScore = 0 冒充待计算。
5. D-064 / D-121（保存后的 CalculationResult 不被静默改变）继续成立：撤回失效是用户显式撤回操作后的**显式失效**，不属于静默修改。
6. 撤回后的反馈是当前状态反馈（D-151）：业务查询（Slot 成员 / Resolution 候选 / 预算与工作量派生态 / Deck 与 Canvas）自动得到新的当前状态，不保留"撤销历史"作为当前 UI 内容。

### D-155｜已撤回的 executionBatch 不得经 D-146 幂等恢复复活

1. D-146 幂等恢复例外增加前置边界：executionBatch 已被撤回终结后，再次收到同批次旧 UserDecision retry（同 recommendationId + decidedAt → 同一 executionBatch）不得重新创建 / 恢复已撤回事实。
2. 终结状态持久化于可从现有事实查询到的状态，不依赖内存 UserDecision：child WorkloadResult 的 `businessStatus = "revoked"` 与 WorkloadSplit 记录的 `metadata.revocationStatus = "revoked"`。
3. 判定点（在 D-145 / D-146 归属与内容判定之前执行，命中即拒绝）：ActionExecutor（显式 child ID 路径）与 ActionSubmissionService 持久化边界（全部 child，含生成型 ID）。
4. 正常未撤回批次的 D-146 retry 幂等语义完全保持不变；不修改 child ID 生成规则，不改变 D-145 / D-146 身份语义。

### D-156｜整条派生路径撤回：衍生 WorkloadCard 物理删除（2026-10-09 人工确认；D-154 局部修订）

> 本条只修订一个范围：**整条派生路径撤回（Full-Path Revocation）中对"由该派生路径创建的衍生 WorkloadCard"的处理**——由 D-154 的业务失效（businessStatus = "revoked"）改为**物理删除**。D-154 其余范围（层撤销的未使用子卡、派生 WorkloadResult、CalculationResult、"存储可存在、业务世界中等同不存在"的查询语义、缺省 active 兼容）不变，仍为有效规则。本条不推翻 D-118～D-153、D-155 任何正文。

1. **撤回入口**：撤回由用户直接发起，不默认生成 Recommendation；用户必须明确撤回范围，并在执行前确认。本轮不设计、不实现具体 UI。
2. **撤回当前拆分层**：完全遵循 D-153 既有语义——其他业务仍在使用的直接子卡可以保留；不因撤回当前层而自动将操作升级为整条派生路径撤回；其余行为遵循 D-153，不自行扩展。层撤销**不适用**本条的物理删除。
3. **撤回整条派生路径**：对属于该派生路径、**由该路径创建**的衍生 WorkloadCard 执行**物理删除**：
   - 不因衍生 WorkloadCard 被其他核算方案引用而保留它；
   - 不能把此规则误解为删除 UnitCard；
   - 不删除原始 WorkloadCard、原始 WorkloadResult，也不删除不属于该派生路径的独立业务对象；
   - 清理指向被物理删除 WorkloadCard 的关联关系，避免留下悬空引用；
   - 派生 WorkloadResult 与 CalculationResult 的处理**不变**（D-154：业务失效，不物理删除）。（2026-10-09 二次裁定 D-158：其中**派生 WorkloadResult** 已改为物理删除；CalculationResult 维持失效不删除。）
4. **依赖影响**：已使用被删除 WorkloadCard 的其他核算结果应失效并等待重新计算；不因衍生卡被删除而物理删除其他独立核算方案或独立业务对象；不能把旧核算结果继续当作有效结果，也不能将缺失输入解释为数值 0；依赖失效及重算状态必须与现有领域状态语义一致（D-154 规则 4：待计算 = 派生态，即当前不存在有效 CalculationResult）。
5. **与旧撤回语义的关系**：本条只明确改变整条派生路径撤回时对衍生 WorkloadCard 的处理；不得由此推导"所有 revoked 对象都改为物理删除"；不得删除原始 WorkloadResult；原有 revoked 语义仍适用于未被本条明确覆盖的一切对象。D-153 规则 4 末句与 D-154 规则 1 中"不做物理删除"的表述，在"整条派生路径撤回的衍生 WorkloadCard"范围内由本条覆盖，其余范围维持原文。

实现状态（2026-10-09 D-158 第一阶段实施后更新）：**本条的物理删除已在内存运行时实现**——DataService 已声明 `deleteCards(ids)` / `deleteWorkloadResults(ids)`（不存在 ID = no-op，重试安全），MockDataService 已按 ID 过滤实现；revocationService 以记录级闭包（collectDerivedResultsByRecords，按 WorkloadSplit.parentResultId/childResultId 重建，不依赖 Relation.active）作为全路径删除范围的唯一来源，含已失活分支与同父多批次；来源不明（拓扑可发现、无记录）对象进入 manualReview 清单（不删除，Case A 孤儿 Result 为声明盲区）；revocationSubmissionService 按六阶段有序提交（标记记录 → 关系软删 → 核算失效 → 层撤软处理 → 删卡 → 删结果）；防复活终结检查已在 executor 与持久化边界前置到存在性跳过之前。关闭基线 398/398。**生产阻塞（如实记录）**：生产 DataService 适配器尚未实现两个删除接口——MockDataService 是内存实现，不代表生产适配器完成；D-158 待裁技术细节中"多卡引用缺失呈现""被删对象审计记录"仍未裁定。以下为 2026-10-09 记录轮的历史核查记录，保留为审计轨迹：当时 revocationService / revocationSubmissionService 对全部对象均为软处理，无任何物理删除能力（DataService 接口无删除方法）；已识别的实现差距（删除范围归属识别口径、DataService 删除能力扩展、删除阶段与重试幂等、引用清理口径、审计轨迹）已由第一阶段实施解决或另行登记。

## 拆分结果按需创建与跨渠道复用 Decisions（2026-10-09 人工确认）

### D-157｜拆分结果的按需创建、跨渠道复用与选择/撤回边界（规则 A～E）

> 五项规则共同界定：拆分理论结果集合与实际创建衍生对象的边界、多渠道取用同一拆分结果的行为、以及选择范围与撤回的有效性边界。本条不推翻既有裁定；与 D-118/D-119/D-120（Result/Card 分离、一果多卡）、D-131（Sharing≠Splitting）、D-133/D-134（聚合优先复用/部分选择合法）、D-142～D-148（身份体系）、D-150～D-156（交互与撤回）的关系在各规则内标注。本条已裁定、尚未实现。

**规则 A｜按需创建衍生卡**
- 拆分原则理论上可以产生多个结果，不代表系统应预先创建全部结果或全部 WorkloadCard。
- 只有用户当前实际选择、需要使用的拆分结果，才创建相应的衍生对象；未选择的潜在结果不自动创建衍生卡。
- 示例：理论结果 A、B、C、D、E、F、G；渠道甲只选择 A、B、C，则仅创建对应衍生卡，不创建 D、E、F、G。
- 与现状对照：confirm_split 仅创建 UserDecision.splitParameters.children 显式列出的子项（2026-10-04 裁定 A 已落实），系统不存在"全量生成后隐藏未选结果"的模式。

**规则 B｜跨渠道复用**
- 后续渠道使用同一源业务对象、相同拆分原则及相同完整计算条件时，应识别已经存在的匹配拆分结果。
- 如果本次选择的结果与既有结果相同，应复用匹配结果及符合既有模型规则的卡片，不因重复执行或使用渠道不同而无意义地重复创建。
- 示例：渠道甲已创建 Aw1、Bw1、Cw1；渠道乙后来选择 D、E、F，则按需创建 Dw1、Ew1、Fw1，同时保留 Aw1、Bw1、Cw1；不创建 Gw1。
- "同结果"必须依据完整业务身份与统计内容判断，不能只比较名称或数值。
- 应优先沿用既有 WorkloadResult、Execution、ResultSet 和 D-143～D-148 的身份规则；不得发明与现有规则冲突的新 ID 算法。
- WorkloadResult 与 WorkloadCard 是不同的业务对象（D-118/D-119/D-120）：复用 Result 不必然意味着所有业务用途必须复用同一张 Card；需根据现有模型判断。

**规则 C｜选择范围与有效性相互独立**
- 某个渠道未选择已有衍生卡，不构成该卡被撤回、失效或删除的理由。
- 后续拆分或渠道选择不能自动使其他渠道已有效使用的卡片失效。
- 卡片有效性由明确的业务状态（businessStatus）、有效关系（active Relation）与撤回规则（D-153～D-156）决定，而不是由单个渠道当前选择了哪些结果决定。

**规则 D｜拆分结构与渠道取用分离**
- 拆分原则及完整计算条件决定结果是否匹配。
- 渠道的选择范围决定本次需要哪些结果。
- 使用渠道本身不构成重复创建拆分结果的理由。
- 不同渠道可以取用同一拆分结果集合的不同子集。

**规则 E｜撤回必须保护其他有效业务**
- 撤回某个渠道的取用关系，不应误伤其他渠道仍在使用的卡片或结果。（2026-10-09 冲突裁决 D-158：对"撤回整条派生路径"，D-156/D-158 的彻底删除规则**优先于**本句的共享使用保护——复用不构成保留理由，被删对象的其他使用方按 D-158 规则 3 处理缺失依赖与计算失效；本规则其余范围——层撤回的既有使用证据保护（D-153）与独立对象不受自动删除——继续适用。）
- 撤回拆分关系时，必须区分关系、结果、卡片及其下游依赖，不得将它们视为同一种对象。
- "撤回当前拆分层"和"撤回整条派生路径"仍是不同的显式用户操作，必须遵守已批准的 D-153、D-154、D-156 规则及后续澄清。
- 不得擅自取消、扩大或缩小既有撤回语义。

**Open Question（本条记录的冲突与待决点，不自行裁决，等待产品决策）**
1. **D-156 × 共享复用冲突**：D-156 规定整条派生路径撤回对"由该路径创建"的衍生 WorkloadCard 物理删除，且"不因被其他核算方案引用而保留"。若渠道乙复用了渠道甲路径创建的卡 / Result（规则 B 场景），渠道甲整路径撤回将删除共享卡、软删乙的取用关系、并使共享派生 Result 失效（businessStatus=revoked）——与规则 E"不应误伤其他渠道仍在使用的卡片或结果"直接冲突。候选方向（仅列举，不裁决）：① 共享对象上暂缓物理删除、降级软失效（需修订 D-156"不因引用保留"的适用范围界定）；② 物理删除仅限"由该路径创建且无任何其他渠道有效取用关系"的卡；③ 复用强制"同 Result 异卡"（second-card，D-148 CASE/SEE 暂缓能力），删除只删创建方的卡——但共享派生 Result 的 revoked 仍会波及乙，需另行裁决 Result 级保护。（**已裁决 2026-10-09，见 D-158（方案 A）**：整条派生路径撤回彻底删除该路径产生的 WorkloadCard 与 WorkloadResult，复用不构成保留理由，被删对象的引用方按 D-158 规则 3 处理缺失依赖与计算失效；上述候选 ①②③ 均未被采纳为降级方案，原文保留仅为审计轨迹。本 Open Question 关闭。）
2. **"渠道"的正式模型表达**：当前模型无"渠道"对象；渠道取用范围由 workload_assign 使用关系与用户决策时的选择隐含承担。渠道语义是否等价于 Unit / 取用关系，需产品确认。
3. **"相同拆分原则/完整计算条件"的结构化判定依据**：当前无拆分原则或拆分计算条件的持久结构化记录（见实现现状），两次拆分是否"相同原则"不可靠判定——需先裁定其表达方式。

实现现状（2026-10-09 只读核查，如实记录；本条尚未实现）：按需创建（规则 A/D 的创建侧）现状已由 confirm_split 参数化满足；跨渠道匹配复用（规则 B）无既有机制——confirm_split 按 D-145 语义 = 创建新统计事实，同一统计锚点跨批次会产生第二份内容相同、身份不同的 WorkloadResult（D-148 锚点型 ID 含批次段，splitService.ts:322-325）；现有唯一"复用"通道是 Resolution 的 use_existing 动作族（resolutionService.ts:178-227 findExistingResult 按 unit 维度与 dimensionsEqual 匹配——维度级匹配，非完整业务身份比对；复用既有卡、不建新卡）。差距详见 PROJECT_STATUS"下一项工作"与记录轮分析报告。

## 撤回彻底删除范围与 D-156/D-157 冲突裁决 Decisions（2026-10-09 人工确认，方案 A）

### D-158｜整条派生路径撤回的彻底删除范围与 D-156/D-157 冲突裁决（方案 A）

> 用户于 2026-10-09 明确确认方案 A："撤回整条派生路径时，彻底删除这条路径产生的所有卡和结果，即使其他业务正在使用。"本条是**已裁决的业务决定**，不是待讨论选项；不得改为软撤销、保留共享对象或自动降级处理。本条不推翻 D-153（当前层撤回语义完全不变）。

1. **彻底删除范围**：执行"撤回整条派生路径"时，彻底删除该派生路径产生的**所有 WorkloadCard 和 WorkloadResult**。
2. **共享不保留**：不得因为派生卡或派生结果正在被其他有效业务使用，就将其保留。
3. **依赖失效**：其他业务如果引用了被删除的派生卡或结果：相关计算结果必须失效；标记为等待重新计算；缺失输入不得按 0 处理（"待计算"为派生态，与 D-154 规则 4 一致）。
4. **独立对象不删**：不得仅因这次撤回而删除独立的 UnitCard、原始 WorkloadCard、原始 WorkloadResult 或独立业务方案。
5. **派生对象与引用者必须区分**："由被撤回路径产生的派生对象"按本决定彻底删除；"独立存在、只是引用了这些派生对象的其他业务对象"不因此自动删除，但其依赖的计算结果需要按规则 3 失效。
6. **适用范围**：本决定只适用于"撤回整条派生路径"；不得擅自改变 D-153 的"撤回当前层"规则；不得把本决定扩展成"所有撤销对象都必须物理删除"。

**D-156 与 D-157 的冲突裁决**：

- 对"撤回整条派生路径"而言，**D-156 的彻底删除规则优先于 D-157 的共享使用保护原则（规则 E）**。
- 不能因为跨业务、跨渠道或跨计算用途复用了某个派生 WorkloadCard / WorkloadResult，就阻止删除。
- D-157 关于按需创建、匹配复用、同一结果不重复创建等规则仍然成立；但它们不能成为阻止整条派生路径彻底删除的理由。
- 被删除对象的其他使用方必须处理缺失依赖和计算失效，不得继续把被删除对象当成有效业务事实。
- **对 D-156 的范围扩展**：D-156 原规则 3 中"派生 WorkloadResult 与 CalculationResult 的处理不变（D-154：业务失效，不物理删除）"，其**派生 WorkloadResult** 部分由本条改为物理删除；**CalculationResult 仍按 D-154/D-156 失效（businessStatus = "revoked"），不物理删除**——它是规则 3"计算结果失效并等待重新计算"的载体。原始 WorkloadCard、原始 WorkloadResult 与独立对象不删（同 D-156 规则 3/4）。

**待裁定的技术细节（本条不自行决定业务规则，仅登记实现前必须澄清的技术问题）**：
1. 删除范围的可靠识别——"由这条派生路径产生"的全部对象，**包括已失活的拆分分支**（当前实现按 active 拓扑闭包，触及不到已失活子分支；拓扑 vs 创建溯源的口径未定）。
2. 一个 WorkloadResult 被多张 WorkloadCard 引用时（D-120 允许、second-card 暂无生产路径），删除路径产生的结果后，**其他卡如何呈现缺失引用**（未裁定）。
3. 关系 / 拆分记录 / 计算结果引用 / 画布位置等**残留引用的清理方式**（"清理关联关系"已由 D-156 规则 3 规定为必须，但软删除 vs 物理删除关系行未定；WorkloadSplit 记录当前为保留 + 标记，是否随之删除未定）。
4. **删除流程中途失败的重试与防复活**——注意：D-155 防复活证据链当前部分依赖"已 revoked 的派生 Result 存在于库"；派生 Result 改为物理删除后，**终结证据必须改由保留对象（如已标记 revoked 的 WorkloadSplit 记录）承担**，executor / 持久化边界的检查接线需在实现轮相应调整（属技术调整，不改变 D-155 语义）。
5. **审计证据的保留方式**——彻底删除后无行可查，需最小持久记录或明确豁免（呼应既有"不建完整 Audit 系统"裁定）。
6. **其他计算方案失效范围**的确定方法——按既有机制（revocationService 以 scoreResults[].workloadId ∈ 删除卡集合收集并整体失效）可覆盖"经卡引用"的场景；"经被删结果间接引用"（如未来 second-card）的失效范围未定，与问题 2 关联。

实施状态同步（2026-10-09 第一阶段实施后）：上述待裁技术细节中，**问题 1（含失活分支的删除范围识别）已按"记录级闭包"实现**（collectDerivedResultsByRecords，不依赖 active、不解析前缀）；**问题 4（D-155 证据链）已实现**（终结检查前置到存在性跳过之前，由保留的 WorkloadSplit 标记承担）；**问题 6 的"经卡引用"失效已按既有机制实现**；**问题 3 部分实现**（关系=软删除保留审计；画布 placement 清理归 UI 产品化）。**仍未裁定/未实现**：问题 2（一果多卡的缺失引用呈现，依赖 second-card——D-148 CASE/SEE 暂缓）、问题 5（被删对象审计记录方式）、人工处理清单的持久化形态。**生产阻塞**：生产 DataService 适配器尚未实现 deleteCards / deleteWorkloadResults。

撤回运行时入口实施状态（2026-10-09 接线 + 安全验收后更新）：revocationEntry 接线层已提供两个语义互斥入口——`revokeSplitLayer`（D-153 层撤回，直接执行）与全路径链路 `previewFullPathRevocation`（**严格只读预览**：loadRevocationSnapshot + computeFullPathRevocationImpact，零写入）→ 用户确认 → `revokeDerivedPathAsPreviewed`（**确认范围守卫**：执行前重新加载快照、重新计算影响集，与用户确认的预览做**全字段结构化比较**——九个关键字段逐一比对，不做仅数量比较、不忽略新增/移除/变化；**不一致即在 submitRevocation 之前中止，本次撤回零写入**，抛出含差异字段与"请重新预览"的明确错误）。预览 UI 必须展示**具体对象身份**（待删卡/结果名称+ID、失效核算 ID、软删关系 ID、manualReview 清单并标注"不自动删除"），不得只显示数量。守卫不改变 D-155 防复活与六阶段可恢复提交语义。

## 核心不可破坏原则

1. Relation 是正式关系事实的唯一来源。
2. Slot 不是关系事实容器。
3. Unit hierarchy ≠ Workload hierarchy ≠ Budget hierarchy。
4. WorkloadResult 是统计事实，WorkloadCard 是业务载体。
5. Card.value 不得作为 WorkloadResult 权威事实使用。
6. Sharing ≠ Splitting。
7. Resolution ≠ Relation。
8. Recommendation ≠ Fact。
9. Recommendation.accepted ≠ Fact 已建立。
10. 已有等价 Result ≠ 自动复用。
11. Partial split/aggregation 不得静默补全。
12. Split feasibility 必须基于真实数据与 mapping evidence。
13. Partial aggregation 必须保留真实统计条件。
14. CalculationResult 必须通过 Snapshot 保持稳定。
15. 新 WorkloadResult 不得静默改变已保存 CalculationResult。
16. Current row 是计算上下文，不是业务对象。
17. Snapshot 不可原地修改。
18. 已关闭 Q-01～Q-08 不因后续实现需要重新打开。
19. 不为了“代码整洁”而改变已经确认的业务语义。
20. 遇到真正无法确定的业务语义，先记录并人工裁决。

## 重要实现提交记录

- Q-01～Q-07 historical closure：`0b6d7a3`
- Q-08-H implementation：`3e29234`
- Q-08 closure：`3a08700`
- Q-01～Q-08 type alignment：`8749266`
- Q-09-H Workload Resolution types：`d00f579`
- resolutionTypes duplicate resultSetId fix：`5f1d385`
- Q-09-A type layer close：`09c59b1`
- Recommendation generic container refactor：`6ff0712`
- Q-08-H/Q-09-A graph fixes：`02866fb`
- mock Definition cleanup：`8d76dc5`
- mock Workload chain ResultSet references：`0693362`
- CalculationSnapshot / dimensions fixes：`5130574`
- Wang/Li workload mock correction：`d1259c1`
- fabricated 600 cleanup：`388887b`
- dangling workload_split cleanup：`1396f11`
- back-calculated budget authority fix：`36a6810`

## 当前验证基线

- Tests：226/226 PASS
- Typecheck：PASS
- Build：PASS
- Q-09-A 一致性 Issue 1～10：全部 PASS
- Q-09-B Resolution Domain Engine：CLOSED / PASS（56 domain tests）
- Q-09-C Atomicity & Failure Recovery：CLOSED / PASS（Test A～E + retry idempotency + D-120 验证）
- Q-09-C Interaction Runtime：CLOSED / PASS（2026-10-07 核心生产闭环全线贯通；后续产品化 UI 与 production adapter 归入后续阶段）

## 使用规则

以后任何 ZCode 任务涉及 Workload、WorkloadResult、WorkloadCard、Unit hierarchy、Slot、Relation、Budget、Score、Measurement、Calculation、Snapshot、Resolution、Recommendation、Split、Aggregation、Sharing 时，应先对照本 Decision Ledger。

如果新实现与本 Ledger 冲突：
1. 不直接改历史决策；
2. 标出冲突的 D-xxx；
3. 说明当前代码需要哪种业务裁决；
4. 人工裁决后新增 Decision，而不是静默覆盖旧 Decision。

---

# Q-09-C Atomicity & Failure Recovery

## 1. Confirmed Decisions

- 系统不采用 database transaction / rollback 保证原子性
- 采用 deterministic ID + upsert + retry 实现可恢复提交
- Action 执行失败后 Recommendation 保持 `recommended` 状态，可重新执行
- 只有所有 persistence step 成功后，Recommendation 才进入 `accepted`

当前保证的是：

```
Recoverable Commit（可恢复提交）
```

不是：

```
Transaction Atomicity（数据库事务原子提交）
```

## 2. Persistence Order Invariant

固定持久化顺序：

```
1. WorkloadResult
2. WorkloadCard
3. workload_split Relation
4. WorkloadSplit
5. Recommendation accepted
```

Recommendation 状态更新必须是最后一步。

任何 persistence step 失败时：

- Recommendation 不得进入 `accepted`
- 保持 `recommended`
- 允许 retry

## 3. Retry Guarantee

### WorkloadResult

- child Result ID 必须 deterministic
- 相同 Recommendation + 相同 split parameters 必须生成相同 Result ID
- `saveWorkloadResults` 使用 upsert

### WorkloadCard

- Card ID 基于 `recommendationId + childResultId` deterministic 生成
- retry 不产生重复 Card

### WorkloadSplit

- WorkloadSplit ID deterministic
- retry 不产生重复 Split

### Relation

Relation.id 不作为 retry 幂等依据。

Relation 幂等依赖业务唯一约束：

```
(type + sourceId + targetId)
```

原因：Relation UUID 可以在失败重试时重新生成，但不能产生重复业务关系。

## 4. Failure Recovery Model

### Case A

`saveWorkloadResults` 成功，`saveCards` 失败

结果：

- 可能存在孤立 WorkloadResult
- WorkloadResult 仍然合法，因为它代表统计事实
- retry 后通过 deterministic ID + upsert 恢复

### Case B

`saveCards` 成功，`saveRelations` 失败

结果：

- Card 可能暂时没有 Relation
- retry 不产生重复 Card

### Case C

`saveRelations` 成功，`saveWorkloadSplits` 失败

结果：

- Relation 已存在
- retry 保存 Split
- 最终恢复一致

## 5. Non Goals

以下不属于 Q-09-C 保证范围：

- database transaction
- distributed transaction
- rollback
- two-phase commit
- network level failure recovery
- database connection recovery

## 6. Testing Evidence

测试入口：

```
recommendationStore.executeDecision()
```

完整链路：

```
ActionExecutor
→ ActionSubmissionService
→ DataService
```

| 测试 | 验证内容 |
|------|---------|
| Test A | saveWorkloadSplits failure recovery |
| Test B | D-120: different Card, same WorkloadResult |
| Test C | same Recommendation retry idempotency |
| Test D | saveWorkloadResults failure recovery |
| Test E | saveCards failure recovery |

## 7. Final Status

```
Q-09-C Atomicity & Failure Recovery: CLOSED
Status: PASS
```

---

**本文件用于持久化 Q-01～Q-09-A 的最终决策基线。**
