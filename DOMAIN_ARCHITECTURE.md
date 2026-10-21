# Domain Architecture

> 本文件描述本项目已经形成的领域架构与对象协作方式。已确认业务规则以 `DECISIONS.md` 为准；术语以 `DOMAIN_GLOSSARY.md` 为准。

## 1. 系统总体结构

本系统不是单纯的 Excel 替代品、BI 看板或绩效计算器。

核心业务链路：

```text
Project
  ├── Data Source → Data Object → Data Version
  ├── Card Groups → Unit / Workload / Budget
  ├── Measurement Model → Model Version → Measurement → Measurement Result → Unit Score
  ├── Calculation Model → Model Version → Calculation → Score Result → Calculation Result
  └── Comparison
```

Data Preparation、Model Building、Measurement、Calculation、Comparison 是不同阶段，不能简单合并成一个“计算”。

## 2. Data Preparation 与 Model Building

Data Preparation 是工程型数据工作：

```text
Data Source → 原始数据 → 过滤 → 清洗 → 映射 → 字段处理 → 条件/维度 → 计算 → Data Object → Data Version
```

Model Building 使用已经准备好的 Data Object 建立 Unit、Workload、Budget、Relation、Measurement Model、Calculation Model。

V1 不要求 AI 自动清洗，也不实现完整数据计算引擎。

### 计算链路（Q-08）

数据准备产出的 Data Object 进入计算链路（D-103~D-110）：

```text
Workload Definition（可复用，无周期）
→ Workload Execution（绑定周期/条件/维度/参数）
→ Calculation Graph（结构化算法，含 Row Context）
→ Calculation Snapshot（执行前固化的不可变足迹）
→ 执行
→ Result Set（行级/分组/聚合结果）
→ Workload Result（经筛选/分组/聚合进一步处理）
→ Workload Card
```

Snapshot 形成后不可变；调整必须产生新 Snapshot（D-108）；Snapshot 支持未来对比与备注（D-109）。

## 3. 三个 Card Group

三个独立 Card Group：

- Unit
- Workload
- Budget

Unit 表示人员、组织、业务单元等实体。

Workload 表示经过定义和计算得到的工作量业务对象，**不是一个 number**。

Budget 表示有限资源池。

核心区别：

```text
Budget = 有限资源
Score  = 单位工作量参数
```

## 4. Card 与 Domain Object

Card 是领域对象在空间模型中的视觉/操作表现：

```text
Domain Object → Card
```

不是：

```text
Card = 全部领域事实
```

例如 Unit → UnitCard、Workload → WorkloadCard、Budget → BudgetCard。

不要为了 UI 方便而在 Card 中复制第二套领域事实。

## 5. Relation 是一等领域对象

Relation 是业务关系事实：

```text
Relation
├── source
├── target
├── type
├── period
├── active
└── metadata
```

不要用 `parentId`、`children[]`、`references[]` 等字段保存第二套关系事实。

Children 与 References 是查询语义，不是两个持久化数组。

Relation 至少需要支持：

- Structure
- Workload Split
- Assign / Share
- Budget Split / Compose / Assign / Occupancy
- Score Reuse

## 6. Workload

Workload 至少能够表达：

- source Data Object
- definition
- measurement period
- conditions
- dimensions
- calculation method
- numeric value
- coverage
- relations

Workload 可以：

- Aggregate
- Split
- Combine
- Decompose
- Partial Split

例如：

```text
全院门诊
├── 内科
├── 外科
└── 儿科
```

再继续：

```text
内科
├── 张医生
├── 李医生
└── 王医生
```

这是业务语义，不只是视觉树。

## 7. Unit、人员与业务身份

一个自然人原则上只有一个 UnitCard。

跨部门、跨时间、跨业务身份通过正式领域对象表达：

```text
UnitCard
├── AdministrativeAffiliation
├── ActualWork
└── BusinessIdentity
```

三者不能混为一谈。

不能使用 `metadata.servicePeriods` 等临时字段承担正式业务事实。

## 8. Measurement / Calculation / Comparison

三个阶段必须分离。

### Measurement

核心目标是确定 Unit Score 等单位参数。

典型形式：

```text
Budget ÷ Measurement Workload = Unit Score
```

或：

```text
Unit Score × Measurement Workload = Budget Occupied
```

Measurement 产生 MeasurementResult（测算积分表）。

### Calculation

使用调整表中当前采用的积分标尺（Actual Score）与 Calculation Period 的实际 Workload。

同一调整表可以反复核算；已保存的 CalculationResult 不可变，嵌入当时的调整状态快照。

### Comparison

使用已保存的核算结果进行比较，不是 Calculation 的别名。

### 调整表

调整表是以测算积分表为基线的独立人工调整工作对象，持续存在，不因确认而关闭（D-096~D-099）。

## 9. MeasurementResult 与 CalculationResult

`MeasurementResult` 回答：

> 某 Measurement Model + Measurement Period 下测出了什么？

应能追溯：

- Measurement Model / Model Version
- Measurement Period
- Data Version（适用时）
- Unit Score（测算积分表 entries）
- 相关 Workload / Budget

`CalculationResult` 回答：

> 某 Calculation Model + Calculation Period 下算出了什么？

应能追溯：

- Calculation Model / Model Version
- Calculation Period
- 所用调整表当时的调整状态快照
- Calculation Workload
- Score Result（核算结果行）
- Data Version（适用时）

二者必须是独立领域对象。

## 10. Score 与 Budget

```text
Score  = 单位参数
Budget = 有限资源
```

Score 可以复用。

Budget 默认不能因为 Score 复用而重复消费。

## 11. Budget

Budget 是测算阶段的预算事实（D-083），可以向下分解：

```text
A
├── B
└── C
```

BudgetCard 只保留基础事实：amount、名称、来源、period、configuration/validation 状态。

以下由 selector（budgetService）从 Relation 派生：

- allocated（Σ active budget_assign.allocatedAmount）
- occupied（Σ active 且 status=confirmed 的 budget_occupancy.matchedAmount；支持部分占用，超额不截断并由 validation 暴露）
- allocatedButIdle（仅已分配未占用部分）
- unallocated（total − allocated）
- BudgetSummary（total / allocated / occupied / allocatedButIdle / unallocated）

budget_occupancy 的确认状态由 OccupancyStatus（candidate/confirmed/rejected）承载，Relation.active 仅表示生命周期（D-090）。

血槽至少区分已占用 / 已分配但闲置 / 未分配三段；分母基准（原始 vs 调整后）Pending。

倒算型 Budget 周期继承 Workload，可直接形成 Occupancy。

Blood Bar 允许超过 100%，例如 120%，不得静默截断；overflow / imbalanced 的派生判定 Pending 分母规则。

## 12. Period

必须区分：

- Measurement Period
- Calculation Period
- Comparison Period
- Actual Period
- Coverage Period

特别：

```text
Actual Period ≠ Coverage Period
```

Coverage 需要为以下概念保留结构：

- Coverage Rule
- Covered Value
- Monthly Average

## 13. 行政归属与实际工作

Measurement 通常更关注 ActualWork。

Calculation / Comparison 可以依据业务规则更多使用 AdministrativeAffiliation。

不能硬编码为一个永久 department 字段。

## 14. 前端与数据边界

Canvas 不直接承载海量医院原始数据：

```text
Raw Data
→ Backend / Data Layer
→ Intermediate / Aggregated Data
→ Domain Objects
→ Canvas
```

前端获得当前对象、关系、汇总统计、必要配置和来源信息。

## 15. Project 与 Traceability

Project 是最高级业务容器，可以包含：

- Data Source
- Data Object
- Data Version
- Card Groups
- Measurement Model
- Calculation Model
- Model Version
- Measurement Result
- Calculation Result
- Comparison

目标是回答：

> 这个结果使用了什么数据、什么模型、什么期间？

V1 只建立正确领域引用，不实现完整版本管理 UI。

## 16. UI 与 Domain 边界

UI 可以存在：

- Deck / Hand
- Canvas
- Focus
- Inspector
- Recommendation
- Configuration State
- Validation State

但 UI 状态不能反过来成为业务事实。

Recommendation 不是 Relation；用户确认前不得产生真实 Relation。

Deck selection 不是 Canvas Focus。

Slot 是具有业务语义的展示/交互入口，不保存关系事实；Slot 内容由 Relation 及查询规则派生（D-078）。acceptedCardTypes 是槽位定义属性，由 SlotType 单一推导（D-100）。Unit Tree ≠ Workload Tree ≠ Budget Tree，结构层级与业务归属解耦（D-080）。

## 17. V1 原则

V1 优先保证领域边界正确，暂不实现：

- React Flow Canvas
- Three.js
- Real Database
- Massive Data Engine
- AI Cleaning
- Full Measurement Engine
- Full Calculation Engine
- Full Version Management
- Multiplayer
- Permission System
- Marketplace
- Full 3D

技术实现可以演进，但不能破坏领域语义。
