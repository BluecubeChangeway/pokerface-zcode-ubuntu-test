# DOMAIN_GLOSSARY.md

> 本文件定义 Poker Face 项目的统一领域术语。
>
> 目的不是描述完整业务规则，而是保证产品、设计、代码、测试和 Codex 使用相同的词汇表达相同的概念。
>
> 如果某个术语的具体业务规则已经在 `DECISIONS.md` 中确定，以 `DECISIONS.md` 为准。
>
> 如果术语定义与现有代码命名冲突，应优先识别为模型/命名问题，而不是为了迁就代码而改变领域含义。

---

# 1. 核心对象

## Card

卡片。

Card 是产品中用于表达一个具有明确业务语义对象的基本视觉/领域载体。

v1 核心 CardType：

- UnitCard
- WorkloadCard
- BudgetCard

Card 不等于单纯的 UI 组件。

UI 中看到的 Card 是领域对象的视觉表现。

---

## Unit

单位对象。

Unit 表示具有组织、人员、业务单位或其他实体意义的对象。

Unit 可以表示：

- 人员
- 科室
- 团队
- 业务单元
- 自定义单位

Unit 在 v1 中通过 `UnitCard` 表达。

---

## UnitCard

表示 Unit 的 Card。

UnitCard 不是“人员卡”的同义词。

人员只是 UnitCard 的一种 `UnitKind`。

同一个人员原则上可以只有一个 UnitCard，其跨科室、跨时间、跨业务身份等情况通过期间、属性和关系表达，而不是简单复制人员卡。

---

## Workload

工作量。

Workload 表示某项业务活动、业务结果或统计指标在指定口径和期间下形成的可用于分析/测算/核算的工作量对象。

Workload 不只是一个数字。

一个 Workload 可以具有：

- 来源数据对象
- 定义
- 测算期间
- 条件
- 维度
- 计算方法
- 数值结果
- 分解关系
- 聚合关系
- 覆盖期间规则

---

## WorkloadCard

表示 Workload 的 Card。

WorkloadCard 可以代表：

- 原始统计结果
- 聚合工作量
- 分解后的工作量
- 人员工作量
- 科室工作量
- 业务工作量

WorkloadCard 的数值不能单独代表完整业务定义。

---

## Budget

预算资源。

Budget 表示一个具有明确额度和使用边界的有限资源池。

Budget 可以被：

- 分配
- 拆分
- 使用
- 保留
- 锁定
- 超额使用

Budget 默认不能被无意重复使用。

具体预算占用规则以 `DECISIONS.md` 为准。

---

## BudgetCard

表示 Budget 的 Card。

BudgetCard 表达预算资源本身及其预算状态。

预算的：

- 使用额
- 剩余额
- 使用率
- 超支情况

原则上属于可由预算使用关系计算得到的结果，不应为了 UI 方便而重复保存多个互相独立的事实值。

---

# 2. Score 体系

## Score

积分。

Score 表示：

> 单位工作量对应的积分值。

典型来源：

```text
Budget ÷ Measurement Workload
→ Unit Score

## Unit Score

单位积分。

Unit Score 是某一 Workload 单位对应的积分值。

例如：

1 次门诊 = 2.5 分

其中：

2.5

就是 Unit Score。

## Score Result

积分结果。

Score Result 表示将 Unit Score 应用于某一核算期间实际 Workload 后形成的积分结果。

典型关系：

Unit Score × Calculation Workload
→ Score Result

Score Result 与 Unit Score 不应混用。

## ScoreDefinition

积分规则 / 积分标尺。

表示"一个单位 Workload 对应多少积分"的规则本身（如 1 人次 = 0.50 分），不是 Card。

派生来源与复用关系由 score_derive / score_reuse Relation 表达（来源 → 派生结果；使用者 → 被复用者），ScoreDefinition 自身不保存关系事实字段（D-094）。

## Total Score

总积分。

Total Score 用于表示某一统计范围内多个 Score Result 的合计结果。

在具体业务场景中，如果存在更精确的术语，应优先使用具体术语而不是笼统使用 Total Score。

# 3. 测算与核算

## Measurement

测算。

Measurement 是通过历史数据、预算及工作量等信息，确定 Unit Score 等参数的过程。

典型逻辑：

Measurement Period
+
Budget
+
Measurement Workload
→
Unit Score

Measurement 的目标是建立可供后续计算使用的参数/模型。

## Calculation

核算。

Calculation 使用已经确定的 Score、Workload、Budget 或其他业务参数，在目标核算期间计算实际结果。

典型逻辑：

Unit Score
+
Calculation Period Workload
→
Score Result

Calculation 与 Measurement 是不同阶段。

## Comparison

比较。

Comparison 用于比较不同期间、不同模型、不同 Score 版本或实际执行结果之间的差异。

Comparison 不等于 Calculation。

# 4. 时间与期间

## Period

期间。

Period 是项目中的独立领域概念，用于表示某项数据、工作量、模型或结果的时间范围。

不要假设所有业务对象永远共享同一个 Period。

## Measurement Period

测算期间。

用于生成 Measurement 结果和 Unit Score 的数据期间。

例如：

2025-01-01 ～ 2025-12-31

## Calculation Period

核算期间。

用于应用已经测算出的 Score 并产生实际核算结果的期间。

例如：

2026-03-01 ～ 2026-03-31

Calculation Period 可以与 Measurement Period 不同。

## Actual Period

实际期间。

某人员、业务、数据或工作实际发生/存在的时间范围。

Actual Period 用于表达实际发生情况。

## Coverage Period

覆盖期间。

将实际存在/实际取得的数据，通过某种规则映射到目标期间的可用于测算或核算的覆盖值。

Coverage Period 可以与目标 Measurement Period 或 Calculation Period 不完全一致。

Coverage Period ≠ Actual Period 的另一种说法。

它应该更多地和：

Coverage Rule
Covered Value
Monthly Average

联系起来。

## Monthly Average

月均值。

将某项工作量按照实际覆盖月份归一化后的月度平均值。

典型用途：

人员只工作部分年度；
业务只存在部分月份；
将部分期间工作量转换为目标期间口径。

是否需要月均及外推，应由具体业务规则决定。

# 5. 测算与核算结果

## Measurement Result / 测算结果

### 定义

Measurement Result 是按照 Measurement Model 和 Measurement Period 执行测算后形成的结果。

测算结果主要用于保存测算阶段产生的 Unit Score、预算占用关系以及其他测算阶段产生的参数结果。

Measurement Result 是某一个测算模型在特定测算期间运行后形成的结果版本。

### 主要特征

- Measurement Result 来源于 Measurement。
- Measurement Result 必须对应 Measurement Model。
- Measurement Result 必须对应 Measurement Period。
- Measurement Result 可以产生 Unit Score 等后续可使用的结果。
- Measurement Result 可以被后续 Calculation 或 Comparison 使用。
- Measurement Result 不等同于 Calculation Result。

### 典型例子

某医院使用 2025 年全年数据进行测算：

- 医生门诊工作量：100,000 人次；
- 分配给门诊工作量的预算：200 万元；
- 测算得到门诊每人次积分：20 分。

这里：

- Measurement 是测算过程；
- 2025 年全年是 Measurement Period；
- 20 分/人次是 Measurement Result 中形成的 Unit Score。

### 当前 V1 原则

Measurement Result 作为测算模型运行后的结果保存。

V1 中 MeasurementResult 的 entries 即"测算积分表"，作为调整表的基线（D-092）。

后续如果调整测算模型、测算期间或测算规则，应形成新的测算结果，而不直接覆盖已有结果。

## Calculation Result / 核算结果

### 定义

Calculation Result 是按照 Calculation Model、Calculation Period 以及选定的 Score、Measurement Result 或 Actual Score 等结果执行核算后形成的结果。

核算结果主要用于得到特定期间、特定单位或人员最终的绩效结果。

### 主要特征

- Calculation Result 来源于 Calculation。
- Calculation Result 必须对应 Calculation Model。
- Calculation Result 必须对应 Calculation Period。
- Calculation Result 可以使用 Measurement Result 中产生的 Unit Score。
- Calculation Result 可以使用 Actual Score。
- Calculation Result 可以进一步用于 Comparison。
- Calculation Result 不等同于 Measurement Result。

### 典型例子

某医生的门诊单位积分为 20 分。

在测算期间形成：

- Unit Score = 20 分/人次。

在 2026 年 3 月核算期间：

- 门诊工作量 = 500 人次；
- 核算结果 = 500 × 20 = 10,000 分。

这里：

- 20 分/人次属于测算阶段形成的 Unit Score；
- 500 人次属于 Calculation Period 内的实际工作量；
- 10,000 分属于 Calculation Result。

### 当前 V1 原则

Calculation Result 是特定核算模型、核算期间和所使用结果共同产生的结果。

不同核算期间应形成独立的核算结果，不直接覆盖历史核算结果。

# 6. 关系

## Relation

关系。

Relation 是独立的领域对象，用于表达 Card 或其他领域对象之间的语义关系。

Relation 不是简单的：

parentId
children[]
references[]

Relation 可以具有：

source
target
relation type
metadata

Relation.active 表示关系的生命周期有效性（是否有效/是否被删除），不表示业务确认状态；业务确认状态由具体关系类型的 typed metadata 承载（如 budget_occupancy 的 OccupancyStatus，D-090）。

具体 RelationType 以领域模型和 DECISIONS.md 为准。

## Children

子项 / 下游对象。

Children 表示从当前对象向下形成的结构性子项或下游对象。

例如：

全院门诊
    ↓
内科门诊
    ↓
王医生门诊

这里的下游对象可以通过 Children 查询。

## References

引用对象。

References 表示其他对象对当前对象的引用关系。

References 与 Children 不是同义词。

判断一个对象是不是当前对象的 Child，不能仅因为它引用了当前对象。

## Structure Relation

结构关系。

用于表达对象之间的结构性上下级关系。

例如：

Unit
↓
Unit

或者在阶段性实现中表达某些尚未细分 RelationType 的结构关系。

如果某类业务具有明确的专用关系语义，应优先使用明确 RelationType，而不是长期依赖通用 Structure Relation。

## Workload Split

工作量分解。

表示一个 Workload 被按照某种业务口径拆分为多个更低层级 Workload 的关系。

例如：

全院门诊人次
↓
科室门诊人次
↓
医生门诊人次

Workload Split 与普通 Structure Relation 在语义上并不完全相同。

## Remainder

未拆分剩余量。

Remainder 指原 Workload 中已经确认存在、但当前下级业务归属/拆分去向未定的部分。

主要特征：

- Remainder 属于原 Workload，不是独立的 WorkloadCard；
- Remainder 不得被解释为父级 Unit 自己的工作量；
- 获得新数据或映射关系后，Remainder 可以继续拆分，直至为 0；
- Remainder 允许不拆分，可以直接关联 Budget / 计分规则参与计算；
- Remainder 与"未纳入当前处理范围的数据"（归属可确定但用户未选择处理）是两种不同状态，不得混用。

具体规则见 DECISIONS.md D-081。

## Partial Split

部分拆分。

表示一个 Workload 已经存在部分明确的拆分结果，同时仍存在 Remainder 的状态。

## Budget Split

预算拆分。

表示一笔 Budget 被拆分到多个下级预算对象或使用对象。

Budget Split 不代表 Score 的复制。

## Budget Compose

预算组合。

表示多个预算对象按照业务规则形成一个更高层级的预算结构。

## Budget Assign

预算分配。

将预算真正赋予某个 UnitCard，使其获得从相应预算结构中取得该预算的明确路径。

主要特征：

- 方向为 Budget → UnitCard，通过 `budget_assign` Relation 表达；
- 分配金额记录在 Relation metadata；
- 预算可以部分分配，不要求一次性分配干净；
- 已分配不等于已占用（见 Budget Occupancy）。

具体规则见 DECISIONS.md D-085。

## Budget Occupancy

预算占用。

已经明确对应到工作量的预算金额。

主要特征：

- 占用必须建立在 Budget 与 Workload 完成有效业务对应（`budget_occupancy` Relation，status = confirmed）的基础上；
- 允许一对一、一个预算对应多个工作量、多个预算对应一个工作量，也允许部分占用（如 Budget 100 万只对应 60 万）；
- 占用金额由 Relation metadata 的 `matchedAmount` 表达，是该 BudgetCard 在该占用关系中实际对应的预算金额；
- 多个预算对应一个工作量时可以合计占用，但来源事实不得丢失；
- 倒算型 Budget 可以直接形成 Occupancy；
- 占用不在 BudgetCard 上持久化，由 Relation 派生汇总；
- 超额占用（occupied 超过预算总额）不截断，由 validation 暴露。

具体规则见 DECISIONS.md D-086、D-087、D-089。

## Occupancy Status

占用状态。

budget_occupancy 的业务确认状态：

- candidate：候选，尚未确认；
- confirmed：有效且已确认；
- rejected：业务上已否决。

Occupancy Status 与 Relation.active 相互独立：active 只表示关系生命周期有效性，不表示业务确认状态（D-090）。

## Idle Budget

闲置预算。

已分配给 UnitCard 但尚未形成已确认 Workload 对应的预算金额。

闲置预算 ≠ 未分配预算：未分配是尚未赋予 UnitCard；闲置是已分配但未占用。

## Idle Workload

闲置工作量。

已被单元使用（workload_assign / workload_share）但尚无已确认预算对应的工作量。

系统只暴露闲置事实，不自动替用户判断是否应该配置预算。

## Back-calculated Budget

倒算预算。

由 Workload 与预设积分/测算规则倒算产生的预算（如 10000 台 × 5 分 = 5 万元）。

倒算预算的周期天然继承 Workload 周期，可以直接形成 Budget Occupancy。

## Period Alignment

周期对齐。

Budget 与 Workload 周期不一致时的对齐方式。

系统可以计算周期交集、判断无交集、提供月均候选；最终对齐方式（交集 / 月均 / 人工调整）由用户确认，系统不得自动决定。

strategy 取值固定为 intersection / monthly_average / manual / inherited；对齐后期间记录于 alignedPeriod（如有）。原始期间仍来自两端领域对象。

# 7. 预算状态

## Remaining Budget

剩余预算。

预算总额减去已经占用/使用的预算后形成的可用剩余资源。

## Surplus

预算剩余状态。

表示预算在当前业务语境下存在可继续使用的剩余。

Surplus 不应简单等同于任意情况下的：

存在未分配金额（unallocated > 0）或占用未满（occupied < total）

具体业务语义由 DECISIONS.md 定义。

## Overflow

预算超支。

表示预算实际占用超过可用预算。

预算表现层不应简单将超支强制截断为 0。

## Locked Remainder

锁定剩余。

表示剩余预算被明确锁定，不再继续参与当前分配。

## Imbalanced

结构性不平衡。

表示预算的下级拆分、分配或结构关系存在业务上的不平衡。

它与普通“预算尚未使用完”不是同一概念。

# 8. 分配与资源使用

## Allocation / 分配

### 定义

Allocation 是将某项可分配的资源，按照一定的规则或用户操作，分配给一个或多个目标对象的业务行为。

在本系统中，Allocation 主要用于描述预算、工作量资源或其他可分配资源从一个来源对象流向一个或多个目标对象的过程。

Allocation 强调的是“资源如何被分出去”，而不是资源本身。

### 主要特征

- Allocation 是一个业务行为或业务关系，不是 Card 类型。
Allocation 可以发生在一个来源对象向一个或多个目标对象之间。
- Allocation 应当能够记录分配来源、分配目标、分配数量以及分配依据。
- Allocation 的结果可能产生剩余、超额、未分配等状态。
- Allocation 不等同于 Budget。
- Budget 表示可分配的预算资源；Allocation 表示预算如何被分配。
- Allocation 不等同于 Score。
- Score 表示单位工作量对应的分值；Allocation 可以使用 Score 计算出的结果作为分配依据，但两者不是同一个概念。

### 典型例子

医院有 500 万元医生绩效预算。

将其中：

- 200 万元分配给门诊工作量；
- 150 万元分配给住院工作量；
- 100 万元分配给手术工作量；
- 剩余 50 万元暂不分配。

这里：

- 500 万元是 Budget；
- “200 万元分给门诊工作量”是一次 Allocation；
- “150 万元分给住院工作量”是一次 Allocation；
- 50 万元属于 Remaining Budget。

### 与预算拆分的关系

Budget Split 描述预算结构上的拆分关系。

Allocation 描述实际发生的资源分配行为。

两者可以同时存在，但语义不同。

例如：

一个“医生绩效预算”可以通过 Budget Split 拆分为：

- 门诊预算
- 住院预算
- 手术预算

随后又可以通过 Allocation 将门诊预算实际分配给：

- 内科门诊
- 外科门诊
- 儿科门诊

因此：

- Budget Split 更强调“预算结构如何拆开”；
- Allocation 更强调“资源实际分给了谁”。

### 当前 V1 原则

V1 中 Allocation 作为领域概念保留，用于明确描述资源分配行为。

具体的 Allocation 数据结构、分配算法、自动分配规则以及复杂的分配策略，不在 Glossary 中定义，待业务规则确定后再进入 DECISIONS.md 和 ARCHITECTURE.md。

# 9. 数据准备

## Data Source / 数据源

### 定义

Data Source 是系统中提供原始数据或可供数据准备过程使用的数据来源。

数据源可以是医院提供的原始业务数据、Excel 文件、数据库表或其他经系统支持的数据来源。

Data Source 强调的是“数据从哪里来”，而不是经过清洗、转换后形成的数据对象。

### 与 Data Object 的关系

Data Source 是数据对象形成的来源。

一个 Data Source 可以经过 Data Preparation、Mapping、Data Definition 等处理，形成一个或多个 Data Object。

Data Object 是系统后续测算、核算或模型使用的数据对象，而 Data Source 是其来源。

### 当前 V1 原则

V1 中 Data Source 主要用于记录数据来源及其与 Data Object 的来源关系。

具体的数据源连接方式、数据库类型、文件格式以及自动同步机制不在 Glossary 中定义。

## Data Object

数据对象。

Data Object 是经过数据准备流程形成、可供模型使用的结构化业务数据。

典型流程：

Raw Data
↓
Validation
↓
Cleaning
↓
Mapping
↓
Filtering
↓
Dimension / Calculation
↓
Data Object

Data Object 不等于原始数据表。

## Raw Data

原始数据。

从医院业务系统、Excel、数据库或其他来源获得、尚未经过项目业务处理的数据。

## Data Preparation

数据准备。

负责：

上传
验证
清洗
映射
字段处理
条件筛选
维度选择
计算
数据对象形成

Data Preparation 与 Model Building 是两个不同阶段。

## Mapping

映射。

将来源数据中的名称、ID、科室、人员或其他业务标识统一到项目内部标准对象的过程。

例如：

来源姓名
↓
人员标准 ID
↓
UnitCard

Mapping 是解决不同医院、不同数据源命名差异的重要机制。

## Data Definition

数据定义。

在 Q-08 之前用来描述某个 Workload 或 Data Object 的数据来源、条件、维度、计算方法、时间范围与输出口径。

现已被 Workload Definition 与 Workload Execution 的组合取代（见 Q-08 批次），”时间范围”属于 Execution 而非 Definition。

它回答：

“这个数字究竟是怎么得到的？”

## Workload Definition

工作量定义。

可复用的数据处理定义：数据来源、业务字段、统计方式、固定条件、可用维度。

Workload Definition 不绑定具体执行周期；同一 Definition 可产生多个 Execution。

## Workload Execution

工作量执行。

一次实际工作任务的执行配置：周期、执行条件、维度选择及其他本次执行参数。

同一个 Definition 可以基于不同期间、不同条件多次 Execution。

## Calculation Graph

计算图。

结构化、可组合的数据处理算法体系：字段引用、条件、聚合、算术、嵌套运算等节点组合，不以字符串公式作为计算事实载体。

节点类型（V1）：Execution Dataset、FieldRef、Constant、Filter、Aggregate、Arithmetic、Output Column。

Graph 是无环有向图（DAG）；节点通过 id 引用，禁止循环引用。

## Scope

计算现场中的取值范围。V1 只有两种 Dataset Scope：

- Execution Dataset：本次执行的全量数据集（Definition 固定条件 AND Execution 本次条件之后得到的行集合）
- Filtered Dataset：Filter 节点产生的子集

Row Context（currentRow / candidateRow）仅是执行器内部求值时的临时行上下文，不是 Domain Entity。

## Output Column

输出列。

Graph 的正式输出声明，包含 name、source、role（final / intermediate）、distribution（perRow / perDataset，perGroup 保留但本期不实现）。

Final 输出可以成为 WorkloadResult 的来源；Intermediate 输出只用于追溯/调试。

## 当前行 / Row Context

行上下文。

逐行求值时的临时引用（如 currentRow.diseaseGroup）。

它与 candidateRow（Filter 条件的当前迭代行）一起存在，但两者都不是 Domain Entity、不是 Card、不持久化、不成为 Relation endpoint。

**Aggregate 不承担 currentRow 职责**：跨行分组语义必须由 Filter 条件表达，Aggregate 只口算指定数据集。

## Result Set

结果集合。

一次 Workload Execution 的完整输出：结果列、行级结果、分组结果、聚合结果、中间/最终结果。

Result Set 直接来源于一次 Execution，与统计分析分组层级相关，但不等同于 Unit/Workload/Budget 组织/业务层级。

## Result Item

结果单元。

Result Set 中带具体值和业务维度定位的结果单元。

## Workload Result

工作量结果。

经筛选、分组、聚合、计算得到的业务结果，可以被 Workload Card 引用（如”外科病种总权重”），并可继续拆分。

## Calculation Snapshot

计算足迹快照。

Definition + Execution 确定后形成的完整、不可变的计算记录：数据来源、业务字段、Definition 状态、Execution 配置、Calculation Graph、输出列定义、结果维度定义、版本引用。

Snapshot 不允许原地修改；基于它的任何后续工作产生新 Snapshot；备注只作说明，不改变计算事实。

# 10. 组织与人员

## Administrative Affiliation

行政归属。

表示人员、单位或业务对象在组织管理体系中的行政归属。

行政归属与实际工作地点/实际工作科室不是同一个概念。

## Actual Work

实际工作。

表示人员或业务对象在某个期间内实际发生的工作。

实际工作可以跨越多个行政单位。

## Business Identity

业务身份。

表示某人员在特定期间、特定业务或特定组织环境下承担的业务角色。

Business Identity 不应简单等同于永久人员属性。

## Position

职务/岗位。

表示人员在组织中的职务或岗位信息。

例如：

主任
副主任
医师
护士

具体层级和编码规则由数据模型定义。

# 11. 项目与版本

## Project / 项目

### 定义

Project 是系统中承载一次完整医院绩效分析工作的最高层级业务容器。

一个 Project 可以包含数据准备、数据对象、Card、Measurement Model、Calculation Model、期间、测算结果、核算结果以及相关配置。

### 主要特征

- Project 是用户开展一项完整工作的上下文。
- 一个 Project 可以包含多个 Data Source 和 Data Object。
- 一个 Project 可以包含多个 Card Group。
- 一个 Project 可以包含多个 Measurement Model 和 Calculation Model。
- 一个 Project 可以产生多个 Measurement Result 和 Calculation Result。
- Project 本身不是 Card。
- Project 不等同于 Model。

### 当前 V1 原则

Project 用于组织和保存一项完整工作的业务上下文。

不同 Project 之间的数据、模型、卡片和结果默认相互独立。

## Model Version / 模型版本

### 定义

Model Version 是某一个 Measurement Model 或 Calculation Model 在特定时间点形成的一份可识别、可保存和可追溯的模型版本。

模型版本用于保证历史测算和核算可以追溯到当时实际使用的模型规则。

### 主要特征

- 一个 Model 可以存在多个 Model Version。
- 不同 Model Version 可以具有不同的规则、配置或结构。
- 已产生结果的 Model Version 不应被无记录地修改。
- Measurement Result 和 Calculation Result 应能够追溯到其使用的 Model Version。
- Model Version 不等同于 Measurement Result 或 Calculation Result。

### 当前 V1 原则

V1 保留 Model Version 概念，用于保证模型变更后的历史结果可追溯。

具体的版本编号规则、版本发布机制和版本锁定机制暂不在 Glossary 中定义。

## Data Version / 数据版本

### 定义

Data Version 是某一 Data Object 或 Data Preparation 结果在特定时间点形成的一份可识别、可保存和可追溯的数据版本。

数据版本用于保证测算和核算能够追溯到当时实际使用的数据状态。

### 主要特征

- 一个 Data Object 可以存在多个 Data Version。
- 不同 Data Version 可以包含不同的数据内容、清洗结果、Mapping 或 Data Definition。
- 已用于产生正式 Measurement Result 或 Calculation Result 的 Data Version 应保持可追溯。
- Data Version 不等同于 Data Source。
- Data Version 不等同于 Measurement Result。

### 当前 V1 原则

V1 保留 Data Version 概念，用于保证数据发生重新清洗、重新映射或其他变化后，历史结果仍然能够追溯到原始使用的数据状态。

具体的数据版本生成规则、版本编号规则和数据快照机制暂不在 Glossary 中定义。

# 12. 模型与版本

## Measurement Model

测算模型。

用于定义如何从 Measurement Period 的数据、Workload 和 Budget 等信息得到 Unit Score 等测算结果。

Measurement Model 是可执行的业务模型，而不是单纯的静态报表。

## Calculation Model

核算模型。

用于定义如何将已有 Score、Workload、Budget 或其他业务参数应用于 Calculation Period，并形成 Calculation Result。

## Calculation Result

Calculation Result 的正式定义见：

`# 5. 测算与核算结果`

本章节不重复定义 Calculation Result。

Calculation Result 可以作为 Comparison 的输入，并可包含：

- Score Result
- Total Score
- Budget Result
- 人员结果
- 科室结果
- 比较所需的统计结果

## Score Version

积分版本。

某一组可以被核算使用的 Score 参数集合。

实际执行中可以存在：

测算 Score
↓
人工调整
↓
实际执行 Score Version

具体版本管理规则以后由产品决策确定。

## Actual Score

实际积分。

经过业务人员确认、调整或其他正式执行规则处理后，实际用于核算的 Score。

Actual Score 可以与初始 Measurement 得到的 Score 不完全相同。

V1 中实际执行积分由调整表（Adjustment Table）条目的当前采用值承载，不建立平行积分对象（D-096）。

## 测算积分表

Measurement 阶段产生的一套积分标尺结果，由 MeasurementResult 承载：entries 记录各积分项目的测算单位积分与测算积分结果。它是调整表的基线（D-092）。

## Adjustment Table

调整表。

以测算积分表为基线完整形成的一套独立积分调整方案，是人工积分调整、反复核算验证、最终形成实际使用积分表的工作对象。

调整表不是调整日志：每个积分项目（包括完全未调整的项目）都是完整条目，保留原始标尺与当前采用值。

调整表持续存在，不因完成或确认而关闭（D-096）。

## 原始标尺 / Original Scale

调整表条目中的原始测算积分（originalUnitScore）。

它是该条目调整滑块的"0 位置"——不是积分值为 0，而是相对于原始测算标尺未做人工调整的位置。

## 调整幅度 / Adjustment Delta

当前采用值相对原始标尺的差值（current − original）。

完全未调整时幅度为 0；百分比调整始终锚定原始标尺。

## Final Score Table

最终使用积分表。

对调整表当前状态的一次正式输出/定格（确认）。

确认不关闭、不删除、不永久锁定调整表；之后仍可继续调整、核算与 Fork（D-099）。

## Fork

人工分叉。

调整表 Fork / Measurement Fork 均必须由用户主动触发，复制当时完整状态，此后双方独立编辑；普通编辑不自动产生分支。

Measurement Fork 不继承旧分支的调整表；新分支产生自己的测算积分表与调整表（D-097）。

# 13. 推荐与交互

## Recommendation

推荐。

系统根据当前上下文建议用户使用的 Card、Relation 或配置。

Recommendation 是一种提示/建议状态。

## Recommended

已被系统推荐的对象状态。

Recommended 不等于已经建立关系。

只有用户明确执行相应操作并满足业务规则后，Recommendation 才可能转化为实际 Relation。

## Focus

焦点。

表示当前 Canvas 或交互上下文中用户正在关注的 Card/对象。

Focus 是 UI/交互语义，不等于业务关系。

## Selection

选择。

表示用户当前选中的对象。

Selection 与 Focus 可以同时存在，也可以不同。

## Deck / Hand

卡牌区 / 手牌区。

Canvas 外部用于浏览、选择和拖拽 Card 的交互区域。

Deck 中的 Card 可以处于紧凑、堆叠或计数展示状态。

## Slot

卡槽。

Slot 是 Card 上具有明确业务语义的展示/交互入口，用于承载某一业务维度的关联内容。

V1 三类 Slot：

- Unit Slot
- Workload Slot
- Budget Slot

Slot 不是关系事实的容器。

当前哪些 Card 出现在 Slot 中，由 Relation 及业务查询规则派生得到，不由 Slot 自身保存（DECISIONS.md D-078）。

三类 Slot 属于不同业务承载维度，可以同时存在于同一个 UnitCard，不要求结构对齐；Unit Slot 只承载 UnitCard（D-079）。

acceptedCardTypes 是 Slot 的定义属性，表达该位置接受/展示的 Card 类型；V1 中由 SlotType 单一推导（Unit Slot → UnitCard、Workload Slot → WorkloadCard、Budget Slot → BudgetCard），不得独立维护为第二套规则（D-100）。

SlotType 与 RelationType 不一一对应：Slot 展示内容来自多种 RelationType 的查询结果，接受规则只看 Card 类型。

## Canvas

画布。

模型构建、关系探索和 Card 空间布局的主要交互区域。

Canvas 是产品的视觉模型构建层，不是原始数据处理层。

# 14. 配置状态

## Unconfigured

未配置。

表示 Card 或模型尚未完成必要配置。

## Partial

部分配置。

表示已经完成部分配置，但仍存在未完成的必要配置或关系。

## Configured

已配置。

表示当前 Card/模型已经满足其定义的必要配置条件。

## Warning

警告。

表示当前对象存在值得用户注意、但不一定阻止继续工作的异常或风险。

## Error

错误。

表示当前对象存在阻止某项操作或导致结果不可信的问题。

# 15. UI 与领域的边界

以下属于表现层概念，不应直接成为业务语义：

Card color
Card skin
icon
decorative symbol
animation
glow
stacking
visual grouping
visual code

例如：

蓝色

可以是某个 Skin 下 WorkloadCard 的视觉表现，但：

蓝色 ≠ Workload

领域类型必须由 CardType 等领域模型表达。

# 16. 术语使用原则
## 原则 1：同一个概念只使用一个正式名称

不要在不同代码、页面和文档中分别使用：

积分
单位积分
单价
分值
Score

来表达同一个领域对象。

优先使用：

Score / Unit Score

并根据上下文区分。

## 原则 2：不要用 UI 名称替代领域名称

例如：

Card
Slot
Deck
Canvas

是交互/表现层术语。

不能因为 UI 上叫“槽位”，就在 Domain 中把所有业务关系都叫 Slot Relation。

## 原则 3：不要因为代码实现方便改变领域术语

如果现有代码命名无法准确表达领域含义：

优先修改代码命名。

不要反过来修改领域定义去迁就旧代码。

## 原则 4：新术语需要明确来源

如果开发过程中出现新的核心领域概念：

检查是否已有同义术语；
不要随意创建同义词；
如果确实需要新增术语，应同步更新本文件；
如果涉及业务规则变化，还必须检查 DECISIONS.md。

# 17. 与其他项目文档的关系

AGENTS.md
    ↓
规定 Codex 如何工作

PRODUCT_SPEC.md
    ↓
规定产品要解决什么问题、应该如何工作

DOMAIN_GLOSSARY.md
    ↓
规定领域术语是什么意思

DECISIONS.md
    ↓
规定已经确认的具体业务/架构决策

CODEX_IMPLEMENTATION.md
    ↓
规定当前阶段如何实施

ARCHITECTURE.md
    ↓
规定稳定的软件技术架构

这些文件职责不同，不应互相替代。

# 18. 当前状态

本文件是 V1 Domain Glossary。

允许随着产品讨论和领域模型演进进行增补。

但：

新增术语 ≠ 新增业务规则。

如果新增术语改变了已有业务含义，必须同时检查并更新 DECISIONS.md。