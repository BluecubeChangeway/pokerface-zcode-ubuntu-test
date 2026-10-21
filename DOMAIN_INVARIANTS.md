# Domain Invariants

> 本文件定义不得被实现随意破坏的领域不变量。

## Entity / Unit

### INV-001
一个自然人原则上只有一个 UnitCard。

### INV-002
人员跨时间、部门、业务身份的变化必须通过 Period 化事实表达。

正式区分：

- AdministrativeAffiliation
- ActualWork
- BusinessIdentity

## Relation

### INV-003
Relation 是关系事实的唯一正式来源。

禁止以以下字段维护第二套领域关系事实：

```text
references[]
children[]
parentId
relatedCards[]
```

### INV-004
Children / References 是查询语义，不是两个持久化数组。

### INV-005
Workload Split 必须有正式的 `workload_split` RelationType。

## Workload

### INV-006
Workload 不是一个 number。

至少需要能够表达：

- source
- definition
- period
- conditions
- dimensions
- calculation method
- value
- coverage
- relations

### INV-007
WorkloadCard 不是整个 Workload 领域对象。

### INV-008
Workload 必须支持 Split、Aggregate、Combine、Partial Split 等语义。

## Budget

### INV-009
Budget 是有限资源。

### INV-010
Score reuse 不得导致 Budget duplication。

### INV-011
以下原则上是派生状态：

```text
used
remaining
utilization
overflow
surplus
imbalance
blood bar
```

### INV-012
Locked Remainder 如果代表真实用户/业务状态，可以显式持久化，但不能作为普通 remaining 的重复字段。

### INV-013
Budget 可以 overflow：

```text
remaining < 0
utilization > 100%
```

不得静默截断。

### INV-014
兄弟 Budget 不自动互相抵消。资源转移必须有明确 Relation / Allocation 语义。

## Score

### INV-015
Unit Score 表示一个单位 Workload 对应的分值。

### INV-016
Score Result 是 Calculation Stage 的实际结果：

```text
Unit Score × Calculation Workload
```

### INV-017
MeasurementResult ≠ CalculationResult。

## Measurement / Calculation / Comparison

### INV-018
Measurement、Calculation、Comparison 是三个不同阶段。

### INV-019
Measurement 的核心结果包括 Unit Score 等测量参数。

### INV-020
Calculation 使用既有 MeasurementResult / Unit Score / Workload / Budget。

## Period

### INV-021
Actual Period ≠ Coverage Period。

### INV-022
Measurement Period 与 Calculation Period 可以不同。

### INV-023
Coverage 必须保留 Coverage Rule、Covered Value、Monthly Average 等语义空间，不能硬编码为一个默认乘法。

## Personnel Context

### INV-024
AdministrativeAffiliation ≠ ActualWork。

### INV-025
BusinessIdentity ≠ AdministrativeAffiliation。

### INV-026
正式人员周期关系不得依赖 `metadata.servicePeriods` 等临时字段。

## Data

### INV-027
Data Source ≠ Data Object。

### INV-028
Data Preparation ≠ Model Building。

### INV-029
前端 Canvas 不得直接承载海量医院原始数据。

## Version

### INV-030
MeasurementResult / CalculationResult 在适用时必须可追溯 Project、Model Version、Data Version、Period。

### INV-031
Data Version 与 Model Version 是不同概念。

## UI

### INV-032
Recommendation ≠ Relation。

### INV-033
Deck Selection ≠ Canvas Focus。

### INV-034
hover、dragging、ghost、focused、selected 等 UI 状态不得直接成为业务事实。

## Card

### INV-035
Card 是领域对象的视觉/交互表现，不应成为第二套事实存储。

### INV-036
Unit、Workload、Budget 三个 Card Group 独立存在。

### INV-037
V1 Slot 类型规则：

```text
Unit Slot → UnitCard
Workload Slot → WorkloadCard
Budget Slot → BudgetCard
```

不要额外维护 `acceptedCardTypes` 形成第二套规则。

（修订：D-100 —— acceptedCardTypes 作为槽位定义属性允许存在，但必须由 SlotType 单一推导，不得独立手写维护；见 INV-067。）

## Slot / Structure Decoupling

### INV-045
Slot 是具有业务语义的展示/交互入口，不保存关系事实。

禁止以 slot.cardIds 等成员数组作为 Slot 内容的关系事实来源。

Slot 当前内容必须由 Relation 与查询规则派生。

### INV-046
Unit Tree ≠ Workload Tree ≠ Budget Tree。

Unit 组织结构不自动驱动 Workload / Budget 沿相同层级拆分。

是否拆分由数据来源、业务口径、数据维度、映射关系及业务归属决定。

### INV-047
Remainder（未拆分剩余量）属于原 Workload，不是独立的 WorkloadCard，不得解释为父级 Unit 自身的工作量。

Remainder 可在获得新数据或映射后继续拆分直至为 0，也允许不拆分、直接关联 Budget / 计分规则参与计算。

### INV-048
Remainder（下级业务归属/拆分去向未定）与"未纳入当前处理范围的数据"（归属可确定但用户未选择处理）是两种不同状态。

不得混用，后者不得被自动纳入拆分。

## Budget Alignment

### INV-049
Budget 是测算阶段的预算事实；核算阶段的实际绩效（应发绩效）不是 Budget。

### INV-050
budget_split 仅表达 Budget → Budget 的结构分解。

Budget → UnitCard 的分配必须使用 budget_assign，不得混用。

### INV-051
已分配 Budget ≠ 已占用 Budget。

Budget Occupancy 必须建立在已确认的 Budget ↔ Workload 对应上；倒算 Budget 可直接形成 Occupancy。

### INV-052
BudgetCard 不得持久化 used / remaining / utilization / state / bar 等派生值。

BudgetSummary（total / allocated / occupied / allocatedButIdle / unallocated）由 Relation 派生。

### INV-053
未分配预算 ≠ 闲置预算。

闲置工作量只暴露事实，系统不得自动替用户配置预算。

### INV-054
周期不一致不是错误。

交集 / 月均是候选对齐方式，最终对齐必须人工确认，系统不得自动决定。

### INV-055
多个预算对应一个工作量时，可以合计占用，但各 Budget 的独立来源事实不得丢失。

### INV-056
Budget Split、Budget Assign、Budget Occupancy 三者语义独立。

部分占用是一等表达，不要求通过 Budget Split 间接表达。

占用金额由 budget_occupancy metadata 的 matchedAmount 唯一承载。

### INV-057
Relation.active 只表示生命周期有效性，不表示业务确认状态。

budget_occupancy 的确认状态由 OccupancyStatus（candidate / confirmed / rejected）承载。

### INV-058
occupied = Σ active 且 confirmed 的 budget_occupancy.matchedAmount。

occupied 可以大于 allocated（倒算等合法路径），也可以大于 total（超额占用）；均不得截断或静默丢弃，超额必须由 validation 暴露。

## Adjustment / Calculation

### INV-059
调整表以测算积分表（MeasurementResult）为基线完整形成。

完全未调整的项目（原始 = 当前，幅度 = 0）是完整条目，不是缺失数据。

### INV-060
调整幅度相对原始标尺计算。

百分比调整锚定原始标尺，不得改写原始标尺。

### INV-061
Fork 必须由用户主动触发。

普通编辑不得自动产生分支。

### INV-062
Measurement Fork 复制测算工作状态，但不继承旧分支的调整表。

调整值不得跨分支自动传递；新分支产生自己的测算积分表与调整表。

### INV-063
已保存的 CalculationResult 不可变：嵌入当时的调整状态快照与核算结果，后续修改调整表不得改变它。

### INV-064
确认 / 导出最终使用积分表不关闭、不删除、不永久锁定调整表。

### INV-065
临时查看核算结果不得强制产生持久化结果。

### INV-066
score 关系端点必须由 RelationType 限定：

score_derive：来源（BudgetCard / WorkloadCard）→ 派生 ScoreDefinition；

score_reuse：使用者 → 被复用者；

score_adjust：调整后规则 → 被调整规则。

查询分类未决，不得默认归入 references。

### INV-067
acceptedCardTypes 是 Slot 的定义属性，必须由 SlotType 推导（deriveAcceptedCardTypes）。

Slot 的运行时接受规则以 SlotType 推导为唯一规则源；Slot 不得保存 cardIds 等关系事实（D-100）。

### INV-068
不同 CalculationResult 中的 ScoreResult 行，不得因为相同的 ScoreDefinition + Workload 组合而发生 ID 碰撞。

行 id 必须包含所属 CalculationResult 的核算批次 id（D-101）。

## Data Computation / Snapshot

### INV-069
Workload Definition 不绑定执行周期；执行周期属于 Workload Execution。

同一 Definition 可产生多个 Execution。

### INV-070
Calculation Graph 是结构化计算模型。

字符串公式只可作为展示表达，不得作为计算事实载体；底层不得只依赖 Excel 字符串或 SQL。

### INV-071
"当前行"（Row Context）不是业务对象，也不是结果对象。

它只承担生成结果列时的行上下文语义。

### INV-072
一次 Execution 产生 Result Set：行级、分组、聚合、中间/最终结果都可能存在。

Result Item 必须携带具体值与业务维度定位。

统计分组层级不得建模为 Domain Relation。

### INV-073
Calculation Snapshot 是完整且不可变的计算足迹。

必须独立记录数据来源、业务字段、Definition 状态、Execution 配置、Calculation Graph、输出列定义、结果维度定义与版本引用。

Snapshot 一旦形成，不允许原地修改。

### INV-074
Snapshot 派生必须产生新的工作状态和新的 Snapshot。

历史 Snapshot 永远不受影响。

### INV-075
Snapshot 支持差异比较与操作者备注。

备注不得改变 Snapshot 的计算事实。

### INV-076
执行数据集是本次 Execution 经过「Definition 固定条件 AND Execution 本次条件」后得到的数据集；Graph 永不作用于单个 Card 或任意局部集合。

### INV-077
CalculationGraph 必须是 DAG：节点以 id 引用其他节点，禁止循环引用。

### INV-078
Row Context（如 currentRow / candidateRow）只在执行器内部有效，不是 Domain Entity，不是 Card，也不是 Relation 的 endpoint。

Aggregate 的「对当前行所属分组」不挂在 Aggregate 自己身上，而由 Filter 的条件表达。

### INV-079
Aggregate 的空集合语义：COUNT → 0；SUM、AVG、MIN、MAX → null。缺失 ≠ 0。

### INV-080
空 Execution Dataset 产生 `status = "missing"` 的空 ResultSet，不得生成 `value = 0`。

### INV-081
Final / Intermediate 的 role 是严格的输出角色：intermediate 不参与 WorkloadResult / Card 选择；final 才可用作业务输出。

### INV-082
执行时只读 Snapshot（含内嵌 Graph）：外部后续修改 Definition / Graph 不得影响已固化 Snapshot 的再现。

## Calculation Safety

### INV-038
“没有 Workload”与“数据不存在”不是同一语义。只有业务规则明确时才能把缺失工作量解释为 0。

### INV-039
可由基础事实重新计算的状态，不应成为不可解释的独立事实。

## Change Safety

### INV-040
代码不能改变已确认业务决策。

### INV-041
代码术语必须遵循 Glossary。

### INV-042
不得自行创造未确认的默认：

- Budget allocation
- Coverage rule
- Administrative affiliation
- Score reuse restriction
- Workload split rule
- Calculation affiliation rule

## Architecture Safety

### INV-043
V1 不需要完整 Measurement Engine、Calculation Engine、Data Engine、数据库、AI Cleaning、多人协作等。

### INV-044
技术重构可以改变代码组织，但不能改变 Budget、Score、Period、Relation、Measurement/Calculation 等领域语义。

## 最终判断

两个实现都能工作时，优先：

```text
事实唯一
关系唯一
派生可计算
周期明确
结果可追溯
领域语义独立于 UI
```

而不是：

```text
字段越多越方便
Card 越自包含越好
UI 越方便越好
先存起来以后再说
```
