# DECISIONS.md

# 1. 文档定位

本文件记录本项目已经确认的产品、领域与架构决策。

本文件不是产品需求全文，也不是具体代码实现方案。

规则：

- 已确认的决策不得被实现代码自行改变。
- 如果新需求与本文件冲突，应先提出新的产品决策，再修改实现。
- 技术实现可以变化，但不能无意改变本文件定义的业务语义。
- 本文件中的术语必须遵循 `DOMAIN_GLOSSARY.md`。
- 如果 `PRODUCT_SPEC.md`、`DOMAIN_GLOSSARY.md`、`DECISIONS.md` 存在冲突，不得自行猜测，应报告冲突。

---

# 2. Card 与核心对象

## D-001 UnitCard 是统一的实体卡

V1 不建立独立的 PersonnelCard。

人员、科室及其他组织/实体均通过 `UnitCard` 表达。

`UnitKind` 可以用于描述 Unit 的分类，但不能因此把不同 UnitKind 设计成不同的核心 Card 类型。

## D-002 人员身份通过属性和业务身份表达

同一个人在系统中原则上对应一个 `UnitCard`。

一个人可以在不同期间、不同科室承担不同工作。

人员跨科室、跨岗位、跨期间的情况通过行政归属、实际工作、Business Identity 等领域信息表达，而不是简单复制多个同名人员卡。

只有在数据本身无法可靠识别为同一实体时，才允许通过 Mapping 等数据准备机制解决实体拆分问题。

## D-003 Card 是具有业务语义的最小可用视觉对象

Card 不应被过度压缩成没有业务意义的图标。

Card 可以代表单个对象，也可以代表一个已经聚合的数据/业务对象。

Card 的聚合不意味着它失去继续拆分或建立关系的能力。

## D-004 三类 Card Group 独立存在

V1 的核心 Card Group 为：

- Unit
- Workload
- Budget

三个 Card Group 可以独立准备、独立出现。

如果某类 Data Object 尚未准备完成，对应 Card Group 可以不存在；已有 Card 不应因为其他 Card Group 尚未准备而被强制创建空数据对象。

## D-005 Card 可以具有三类 Slot

Card 架构统一预留：

- Unit Slot
- Workload Slot
- Budget Slot

V1 可以根据具体 Card 或业务场景启用、禁用或锁定某个 Slot。

Slot 的视觉交互组件应尽量统一，以便未来扩展。

## D-006 同类型 Card 默认进入同类型 Slot

基本规则：

- Unit → Unit Slot
- Workload → Workload Slot
- Budget → Budget Slot

但顶层 UnitCard 可以直接关联 WorkloadCard 或 BudgetCard，不要求所有对象都必须先拆成更低一级的 Unit。

---

# 3. Relation

## D-007 Relation 是一等领域对象

Card 不应通过自身保存第二套独立的关系系统。

Card 之间的业务关系统一由 `Relation` 表达和查询。

例如，不应让 `WorkloadCard.references` 与 Relation 同时成为关系事实来源。

## D-008 Children 与 References 是不同语义

`Children` 表示当前 Card 向下拥有、展开或组织的子对象。

`References` 表示其他对象引用当前 Card。

二者不能简单视为同一种关系，也不能仅根据视觉上下位置判断。

## D-009 V1 需要能够表达主要关系类型

领域模型至少需要能够表达：

- Structure
- Workload Split
- Workload Assign / Share
- Budget Split
- Budget Compose
- Budget Usage
- Score Reuse

如果某个关系尚未在当前 UI 实现，不代表领域模型可以将其语义丢失。

## D-010 Workload Split 是正式业务关系

工作量拆分不是单纯的 UI 层级结构。

当一个 Workload 被拆分为多个 Workload 对象时，应能够明确表达其来源、目标以及拆分关系。

不得长期使用通用 Structure 关系代替 Workload Split 的业务语义。

---

# 4. Workload

## D-011 Workload 可以聚合、拆分和组合

Workload 不等同于一个原始数据库字段。

一个 WorkloadCard 可以代表：

- 原始统计结果；
- 多个低层 Workload 的聚合；
- 一个更高层业务工作量；
- 可以进一步拆分的工作量资源。

因此“Card 是否为汇总值”不能仅由 Card 类型决定。

## D-012 Workload 可以逐级分解

例如：

门诊人次
→ 科室门诊人次
→ 医生门诊人次

也可以存在：

门诊人次
→ 某些用户主动选择建立的医生 WorkloadCard

不要求每一个理论上的中间层都必须存在。

## D-013 Workload 支持部分拆分

用户可以只建立部分低层 Workload。

此时系统不得默认假设用户已经完成全部拆分。

未被分配、未被拆分的剩余资源应能够继续保留，并在需要时以“未分配/未拆分”等状态提示。

## D-014 Workload 的统计定义独立于 Card 展示

Workload 的真实数值来源于 Data Source、Data Object、过滤条件、维度和计算规则。

Canvas 上的 Card 只是该 Workload 的领域表现形式。

不能因为用户在 Canvas 上移动、折叠或改变 Card 的视觉位置而改变原始 Workload 的统计定义。

---

# 5. Budget

## D-015 Budget 是有限资源

Budget 默认具有资源消耗语义。

Budget 的分配和使用必须能够追踪来源、去向及剩余量。

## D-016 Budget 默认禁止重复消费

同一 Budget 默认不能被多个独立模型重复消费。

这是为了避免隐性重复计算和预算双重占用。

未来可以增加明确的 Budget Reuse 权限或机制，但不属于 V1 默认行为。

## D-017 Budget 的派生状态不应成为多个事实来源

Budget 的基础事实与派生状态应分离。

例如：

- 原始 Budget Amount 是基础数据；
- Used Amount
- Remaining Amount
- Utilization Rate
- Overflow

等应尽可能通过领域服务或 selector 计算。

避免同时保存多个彼此可能矛盾的派生字段。

## D-018 Budget 支持层级分配

Budget 可以：

- 从父级分配给子级；
- 在多个对象之间拆分；
- 将多个来源组合成一个 Budget；
- 被 Workload/Score 模型消费。

父级 Budget 的状态应能够反映子级资源使用情况。

## D-019 Budget 可以出现剩余、溢出和结构性失衡

Budget 不应被简单限制在 0%～100%。

需要能够表达：

- Remaining
- Surplus
- Overflow
- Locked Remainder
- Imbalanced

其中：

- Overflow 表示实际消耗超过可用资源；
- Imbalanced 表示结构上存在分配不平衡，例如某一子项超支而其他子项仍有余额；
- Locked Remainder 表示剩余资源存在但暂时被保留、不继续分配。

## D-020 预算血条不是单纯 UI 装饰

Budget Blood Bar 是 Budget 资源状态的一种视觉表达。

其分母、资源范围和阶段上下文必须由领域数据决定，不能在 UI 中写死。

测算阶段与核算/比较阶段可以采用不同的 Budget Scope。

血条允许突破 100% 或出现负剩余，用于表达超支。

---

# 6. Score

## D-021 Unit Score 是单位工作量对应的积分参数

`Unit Score` 表示一个单位 Workload 对应的积分值。

典型测算关系为：

Budget ÷ Measurement Period Workload = Unit Score

## D-022 Score Result 是实际计算产生的结果

`Unit Score × Calculation Period Workload` 可以产生实际的 Score Result。

因此：

- Unit Score 是参数；
- Score Result 是结果。

二者不得混用。

## D-023 Score 可以复用

Score 本身是可复用的参数。

同一个 Unit Score 可以在不同 Calculation 场景中参与计算。

Score 的复用不会像 Budget 重复消费那样产生预算双重扣减。

## D-024 Budget 与 Score 的复用语义不同

Budget 是有限资源，需要防止重复消费。

Score 是单位参数，可以在符合业务规则的情况下复用。

二者不能因为都被称为“可复用对象”而采用相同资源模型。

---

# 7. Measurement / Calculation / Comparison

## D-025 Measurement、Calculation、Comparison 是三个不同阶段

### Measurement

使用 Measurement Period 的数据和资源建立测算模型，并得到 Unit Score、预算占用关系等测算结果。

### Calculation

使用 Calculation Period 的实际 Workload 和已经得到的测算参数，计算新的 Score Result / Calculation Result。

### Comparison

将计算结果与既有实际结果、预算或其他基准进行比较。

三个阶段可以共享领域对象，但不能在语义上混为一个阶段。

## D-026 Measurement Model 是可执行业务模型

Measurement Model 用于定义如何从 Measurement Period 的数据、Workload、Budget 等信息得到 Unit Score 等测算结果。

修改 Measurement Model 会改变模型本身。

运行模型产生 Measurement Result。

## D-027 Calculation Model 使用已有测算结果

Calculation Model 原则上不重新测算 Unit Score，而是使用既有测算结果、Calculation Period Workload 等信息形成 Calculation Result。

## D-028 Measurement Result 与 Calculation Result 分离

Measurement Result 保存测算阶段产生的结果。

Calculation Result 保存核算阶段产生的实际计算结果。

不能用同一个“结果”对象模糊表示两个不同阶段。

## D-029 允许正向测算与反向测算

V1 领域模型应允许至少两种合法测算方向。

正向：

Budget ÷ Measurement Workload → Unit Score

Unit Score × Calculation Workload → Calculation Result

反向：

Unit Score × Measurement Workload → Budget Occupied

再根据剩余 Budget 继续进行分配或建立其他模型。

反向测算不是错误状态，而是另一种合法业务模式。

---

# 8. Period

## D-030 Measurement Period 与 Calculation Period 必须分离

Measurement Period 是建立测算参数所使用的数据期间。

Calculation Period 是实际核算所使用的期间。

两者可以不同。

## D-031 Actual Period 与 Coverage Period 不等同

Actual Period 表示实际发生、实际工作或实际数据存在的期间。

Coverage Period 表示经过覆盖规则后，数据/工作量能够代表或覆盖目标期间的范围。

例如某人员实际只工作 2 个月，可以根据 Monthly Average 等规则形成对更长目标期间的 Coverage。

## D-032 Coverage 必须能够表达覆盖规则

对于期间不完整的数据，需要允许使用：

- Actual Period
- Coverage Period
- Monthly Average
- Coverage Rule
- Covered Value

等概念表达如何从有限实际数据推导目标期间值。

具体规则由业务模型定义，不应在 UI 中写死。

## D-033 人员期间不一致不能简单删除数据

如果人员在目标期间只工作部分月份，不应简单因为期间不完整而删除其工作量。

系统应允许根据模型规则：

- 使用实际值；
- 使用月均值；
- 按覆盖期间折算；
- 或采用其他明确规则。

---

# 9. Administrative Affiliation / Actual Work

## D-034 行政归属与实际工作必须分开建模

一个人员可以：

- 行政上属于 A 科室；
- 实际工作于 B 科室；
- 在不同月份发生不同归属；
- 同一期间同时承担多个业务身份。

系统不得用单一 Department 字段永久代表所有这些事实。

## D-035 Measurement 更关注实际工作关系

在模型构建和工作量测算阶段，应能够根据实际发生的工作建立 Workload 关系。

## D-036 Calculation / Comparison 可以根据行政归属进行聚合

核算和比较时，某些指标的归属需要依据实际行政归属，而不是单纯依据工作发生地点。

例如一个医生在年度内发生跨科室工作的情况，计算某行政科室人员平均绩效时，应按照该阶段确定的行政归属规则处理。

具体归属规则必须由模型明确，不允许 UI 或 Card 层自行决定。

---

# 10. Data Source / Data Preparation

## D-037 Data Source 是独立领域概念

原始 Excel、数据库表或其他外部数据来源应作为 Data Source 管理。

Data Source 不等同于 Workload，也不等同于最终 Card。

## D-038 Data Preparation 与 Model Building 分离

数据准备和模型构建是两个不同的工作过程。

Data Preparation 负责：

- 数据导入；
- 清洗；
- Mapping；
- 条件筛选；
- 字段处理；
- 计算；
- Data Object 准备。

Model Building 负责使用这些 Data Object 构建 Unit、Workload、Budget、Score 等业务模型。

## D-039 数据准备保持工程化、可验证

V1 数据准备界面可以采用更接近表格、字段和处理步骤的交互。

原因是用户需要能够检查数据、确认处理结果，并对复杂医院数据保持可控性。

V1 不要求依赖 AI 自动完成全部数据清洗。

## D-040 Data Object 是 Card 的数据基础之一

Card 不应直接依赖大量原始数据记录。

数据层应先形成适合业务模型使用的 Data Object 或中间结果。

## D-041 Mapping 是正式的数据准备机制

医院数据中人员、科室、项目等名称可能不一致。

Mapping 用于建立不同数据来源之间的统一对应关系。

Mapping 可以自动完成部分匹配，但必须允许人工调整。

---

# 11. Data Object 的统计定义

## D-042 Workload Definition 应支持多条件、多维度和计算

Workload 的定义至少可以包含：

- Data Source；
- Measurement Period；
- Filters / Conditions；
- Dimensions；
- Selected Fields；
- Calculation Method；
- Derived Fields。

## D-043 条件与维度不是同一概念

Condition 用于限制数据范围。

Dimension 用于决定统计、分组或展开的业务维度。

例如：

- Settlement Status 可以是 Condition；
- Department 可以是 Dimension；
- Doctor ID 可以是 Dimension。

## D-044 支持简单和复杂计算

V1 数据处理模型应能够逐步支持：

- Count；
- Sum；
- Average；
- Group By；
- Derived Column；
- Formula；
- 多字段转换。

复杂计算可以通过领域服务逐步扩展，不要求第一版一次覆盖所有 Power Query 能力。

---

# 12. Recommendation

## D-045 Recommendation 不自动形成 Relation

系统可以推荐 Card 或 Relation。

但是 Recommendation 只是建议状态。

只有用户确认、拖放或其他明确操作后，才建立真正的 Relation。

## D-046 Recommendation 必须允许关闭

用户手动只选择部分推荐对象时，系统不能自行判断这是“完成”还是“遗漏”。

因此：

- 可以关闭推荐；
- 可以保留推荐；
- 可以之后重新打开；
- 重新打开时，可以继续突出尚未处理的推荐对象。

## D-047 Auto-configure 必须具有确认机制

全局自动配置可以一次推荐多个相关 Card / Workload / Budget。

自动配置的预览状态应与已经确认的关系区分。

未经确认，不应改变正式模型。

---

# 13. Deck / Canvas / Focus

## D-048 Deck 与 Canvas 是两个不同的交互层

Deck/Hand 用于：

- 浏览；
- 选择；
- 推荐；
- 获取 Card；
- 快速查看。

Canvas 用于：

- 建立业务结构；
- 查看关系；
- Focus；
- 展开；
- 建模。

二者不能简单视为同一个 Card 列表。

## D-049 点击 Deck 中的 Card 不改变 Canvas Focus

点击 Deck 中的 Card 可以展开、排序或推荐其相关子卡。

但不应因此自动改变 Canvas 当前 Focus。

## D-050 从 Deck 拖到 Canvas 才产生 Canvas Card

从 Deck 拖到有效 Slot，可以创建或建立对应关系。

拖到空白 Canvas，可以创建一个没有关系的 Card。

拖到无效目标时，操作应静默失败，不弹出错误对话框，也不要求用户手动“退回 Deck”。

## D-051 Slot 点击与 Canvas 展开

点击 Slot 可以：

- 将相关 Card 设为 Focus；
- 展开相关对象；
- 切换相关 Deck Card Group。

默认展开深度为两层。

Unit 展开时，不应自动把 Workload/Budget 层全部展开。

未来可以通过 Canvas Layer Toggle 扩展展开层级。

## D-052 Hover 与 Click 的信息密度不同

Hover 可以提供延迟出现的简要信息。

Click 用于 Focus、展开或进入操作状态。

Card 本身保持低信息密度，详细配置、期间、警告、来源等优先放入 Inspector。

---

# 14. Inspector

## D-053 Inspector 承担详细领域信息

右侧 Inspector 用于展示：

- 配置状态；
- 数据来源；
- 期间；
- 警告；
- 详细字段；
- 模型配置；
- 当前 Focus 对应的信息。

不要为了展示全部信息而不断增加 Card 正面文字。

## D-054 Inspector 应具有上下文敏感性

当用户正在处理某个 Card 时，Inspector 可以突出与当前 Focus 最相关的数据字段。

例如：

Wang 的 WorkloadCard 被处理时，可以突出：

- Department；
- Doctor Name；
- Doctor ID；
- Actual Work Period；

等与当前业务关系直接相关的字段。

---

# 15. Configuration / Validation / Interaction State

## D-055 三类状态必须分离

Card 的状态至少区分：

### Interaction

- Focused
- Selected
- Hover
- Dragging
- Ghost
- Collapsed

### Configuration

- Unconfigured
- Partial
- Configured

### Validation

- Warning
- Error

不能把这些状态设计成一个互斥枚举。

一个 Card 可以同时：

- Focused；
- Partial；
- Warning。

## D-056 配置状态采用低信息密度表达

Card 正面不应长期显示：

“未配置”“部分配置”“已配置”等大段文字。

可以通过图标、徽记、进度或其他视觉编码表达。

详细状态放入 Hover / Inspector。

---

# 16. UI 与领域边界

## D-057 视觉 Skin 不等于业务类型

颜色、边框、图标、纹样、动画、发光、堆叠等属于 Presentation Layer。

不能让业务逻辑依赖：

- Card Color；
- Skin；
- Icon；
- Decorative Symbol。

## D-058 V1 为未来 Skin 系统预留架构边界

未来可以支持不同视觉主题，例如 Unit、Workload、Budget 使用不同视觉语言。

还可以进一步根据业务身份使用不同图标。

但这些属于 V2+ 展示能力，V1 不实现完整 Skin Marketplace。

---

# 17. Big Data Boundary

## D-059 Canvas 不直接承载海量原始数据

Frontend 不应为了展示 Card 而把医院全部原始记录加载到浏览器。

Backend / Data Layer 应先计算中间数据和聚合结果。

Canvas 只获取当前模型所需的摘要、Card 数据和关系。

## D-060 中间聚合数据需要作为未来 Data Contract 预留

未来可能需要提供：

- 某期间疾病数量；
- Total Disease Weight；
- 某 Unit 下人员数量；
- Workload 总量；
- Budget Remaining；
- 其他 UI 所需的 Derived View Data。

这些数据应作为明确的中间聚合/视图数据接口，而不是由前端临时扫描海量原始数据。

---

# 18. Budget 与 Score 的特殊业务语义

## D-061 Budget 是“有限蛋糕”，Score 是“单位参数”

Budget 的核心语义是有限资源分配。

Score 的核心语义是单位工作量参数。

因此：

Budget 被消费一次后会减少；

Score 被复用不会因为复用本身而减少。

## D-062 Budget 可以继续向下进入其他模型

父级 Budget 分配给 A 后，A 可以继续将自己的资源分配给 B/C。

如果某子模型产生剩余，该剩余可以：

- 继续进入其他 Budget Model；
- 被锁定；
- 保持未使用。

不能因为存在兄弟节点超支，就强制消费其他节点的剩余。

---

# 19. Card 与人员/业务身份

## D-063 不复制人员 Card 表达跨部门工作

例如 Wang：

- Jan–Nov Internal Medicine；
- Dec Emergency；

原则上仍为同一个 UnitCard。

如果：

- Oct–Nov 同时承担 Neurosurgery 与 Emergency 工作；
- Dec 行政归属转为 Emergency；

这些事实通过期间化的 Administrative Affiliation / Actual Work / Business Identity 表达。

## D-064 “名称”与“ID”是统一领域字段名称

V1 正式术语：

- 姓名 → 名称
- 人员ID → ID

原因是 UnitCard 不只表示人员。

---

# 20. 项目与版本

## D-065 Project 是独立的工作容器

一个 Project 可以包含：

- Data Source；
- Data Preparation；
- Data Object；
- Measurement Model；
- Calculation Model；
- Card Groups；
- Relations；
- Results；
- Versions。

Project 不等同于某一个 Model。

## D-066 Model Version 的核心目标是可追溯

Model Version 用于记录模型在某一时点的确定状态。

其核心价值是：

- 可追溯；
- 可比较；
- 可恢复。

## D-067 Data Version 用于追踪 Data Preparation 结果

Data Version 应能够明确某次 Data Preparation 所产生的数据状态。

模型引用数据时应能够知道其所基于的 Data Version。

---

# 21. V1 范围边界

## D-068 V1 不实现以下能力

除非后续产生新的明确决策，V1 暂不实现：

- AI 自动完成复杂数据清洗；
- 大规模真实医院数据直接在浏览器计算；
- Skin Marketplace；
- 完整多人协作；
- 完整权限审计系统；
- 三维 Canvas；
- Three.js；
- 完整实时多人同步；
- 其他尚未形成明确业务规则的高级能力。

## D-069 React Flow 属于后续 Canvas 实现

React Flow 可以作为 Phase 3 Infinite Canvas 的实现技术。

V1 Domain Model 不应依赖 React Flow 的数据结构。

---

# 22. 决策变更规则

## D-070 新业务规则必须先进入决策层

当开发过程中出现以下情况：

- 当前产品规则无法覆盖；
- 两个规则冲突；
- Codex 认为存在多个合理实现；
- 新需求改变既有语义；

不得直接在代码中“自行决定”。

应先：

1. 报告问题；
2. 提出候选方案；
3. 由产品负责人确认；
4. 更新 `DECISIONS.md`；
5. 再修改代码和测试。

## D-071 技术实现可以改变，业务语义不能悄悄改变

接口、文件结构、状态管理方式、组件结构等技术方案可以迭代。

但如果修改会改变本文件中的业务语义，则必须先形成新的决策。

---

# 23. 当前执行原则

## D-072 Domain First

在核心 Domain Model 尚未稳定之前，不应通过大量 UI 实现反向定义业务规则。

## D-073 Product Owner 不负责翻译技术细节

产品负责人只需要确认：

- 业务规则；
- 交互行为；
- 数据语义；
- 结果是否符合预期。

具体代码结构、接口组织、测试结构由 Codex 根据已确认规则实施。

## D-074 Codex 不得自行创造业务规则

如果无法从：

- AGENTS.md
- PRODUCT_SPEC.md
- DOMAIN_GLOSSARY.md
- DECISIONS.md

得到明确答案，Codex 应报告 `Decision Needed`，而不是猜测。

---

# 24. Domain Model Audit 决策批次（2026-09）

本批次决策来源于 2026-09 Domain Model Audit 中经产品确认的 Q-01 ~ Q-03。

Q-04 ~ Q-14 仍为 Open Question，未在本批次处理。

## D-075 WorkloadCard 不保存引用数组

WorkloadCard 不包含 `references[]` 字段。

“某工作量被哪些对象引用”统一通过 Relation 查询（`getReferences()`）获得。

本决策解决 PRODUCT_SPEC / CODEX_IMPLEMENTATION 中 WorkloadCard 接口 `references` 字段与 D-007、INV-003 的冲突：以本决策为准，相关规格中的 `references` 字段已移除。

适用范围：V1 起生效；影响 Domain Model、Mock 与测试。

## D-076 workload_split 是正式 RelationType

`RelationType` 正式包含 `workload_split`。

方向语义：

```text
source = 父工作量
target = 子工作量
```

工作量分解关系统一使用 `workload_split`，不再使用通用 `structure` 表达工作量分解。

`structure` 保留用于 Unit 组织结构及其他尚未定义专用关系类型的阶段性结构关系。

部分分解的剩余资源继续通过 WorkloadAggregateSummary（childTotal / unallocatedTotal / coveredTotal）表达，不因本决策改变。

本决策落实 INV-005 与 D-010。

适用范围：V1 起生效；影响 Domain Model、Relation 查询语义、Mock 与测试。

## D-077 Card 状态多维度建模

Card 的领域状态由两个独立维度表达：

```text
configurationState: "unconfigured" | "partial" | "configured"
validationState?:   "warning" | "error"
```

两个维度可同时存在，例如 `configured + warning`。

以下状态属于交互/表现层，不进入 Domain Card，由 UI Store 管理：

```text
focused / hover / selected / dragging / ghost / collapsed / recommended
```

其中：

- `recommended` 由 recommendation 层派生，不持久化在 Card 上；
- `collapsed` 归交互态。

原 PRODUCT_SPEC 第 21 节的单一互斥 `CardState` 枚举不再使用，规格已按本决策更新。

本决策落实 D-055，并解决 PRODUCT_SPEC 第 21 节与 D-055 的冲突。

适用范围：V1 起生效；影响 Domain Model、Mock、测试及后续 UI Store 设计。

---

# 25. Slot 与工作量拆分决策批次（Q-04，2026-09）

本批次决策来源于 Q-04《Slot 关系事实、结构解耦与 Remainder》经产品确认的讨论。

servicePeriods 相关问题已从 Q-04 拆出，暂不处理，不在本批次范围。

## D-078 Slot 不是关系事实容器

CardSlot 不保存 Card 关系事实。

Slot 是具有明确业务语义的展示/交互入口，不是关系事实的容器。

当前哪些 Card 出现在 Slot 中，由 Domain Relation 及对应业务查询规则计算得到。

禁止以 slot.cardIds 等 Slot 成员数组作为关系事实来源。

本决策延伸 D-007 与 INV-003 至 Slot 维度。PRODUCT_SPEC / CODEX_IMPLEMENTATION 中的 cardIds 字段按本决策移除。

适用范围：V1 起生效；影响 Domain Model、Mock、测试及后续 UI。

## D-079 三类 Slot 的业务语义

Unit Slot、Workload Slot、Budget Slot 是三个不同的业务承载维度：

- 三者可同时存在于同一个 UnitCard 中；
- 彼此不要求结构对齐，三类 Slot 的 Card 数量可以完全不同；
- Unit Slot 当前只承载 UnitCard，不因 WorkloadCard/BudgetCard 与该 Unit 存在关系而将它们放入 Unit Slot。

本决策与 D-006、INV-037 一致。

适用范围：V1 起生效；影响 Slot 查询语义与后续 UI。

## D-080 结构层级与业务归属解耦

核心原则：

> 结构层级与业务归属解耦。

Unit Tree ≠ Workload Tree ≠ Budget Tree。

- Unit 的上下级结构只说明 Unit 之间的结构关系，不能推导出 Workload 或 Budget 必须沿同样层级向下分解；
- Unit Tree 可以作为 Workload/Budget 拆分的依据之一，但不是自动拆分的强制条件；
- 是否拆分，根据 Workload/Budget 自身的数据来源、业务口径、数据维度、映射关系及实际业务归属判断；
- 不拆分是合法的最终状态（例如行政保障任务属于"外科主体"，参加人员为临时机动人员、无可靠 Unit 归属记录，该任务保留在外科 Workload Slot 不向下拆分）；
- 自动拆分的准确表述：系统结合 Workload 的数据来源、数据维度、对应表及业务条件判断是否存在可行的拆分路径，并形成拆分建议，而不是"Unit Tree 自动驱动 Workload 拆分"；
- 拆分建议流程：数据条件 → 判断存在可拆分路径 → 生成拆分建议 → 展示拆分依据（数据来源、使用的数据维度、使用的映射关系）→ 用户确认 → 正式形成 Relation / Workload 拆分结果。拆分建议未经确认不得形成 Relation（复用 D-045~D-047 与 INV-032）；
- 咨询组/分析组的权限与复核机制不在本决策范围内，后续单独讨论。

适用范围：V1 起生效；影响 Workload/Budget 拆分语义、Recommendation 与后续 UI。

## D-081 Remainder（未拆分剩余量）

Remainder 指原 Workload 中已经确认存在、但当前下级业务归属/拆分去向未定的部分。

- 不得把 Remainder 解释为"父级 Unit 自己的工作量"；
- Remainder 不是一个新的独立业务 WorkloadCard，而是原 Workload 的未解析部分；
- 获得新数据或映射关系后，Remainder 可继续拆分，最终 Remainder = 0；
- Partial Split（部分拆分）= 已经存在部分明确拆分结果，同时仍存在 Remainder；
- Remainder 允许不拆分：可以直接关联 Budget / 计分规则参与计算，这是合法业务状态；
- Remainder 与"未纳入当前处理范围的数据"是两种不同状态，不得混用：
  - Remainder = 属于当前 Workload，但目前下级业务归属/拆分去向未定；
  - 未纳入当前处理范围的数据 = 数据可能已经可以确定归属，只是用户当前没有选择处理（如便民门诊）。系统可提示"当前选择的 Unit 未覆盖全部可映射数据"，但不得强制纳入。

适用范围：V1 起生效；影响 Workload 聚合表达、Mock 与测试。

## D-082 数据期间边界（仅保留边界，不设计算法）

如果 Workload 数据中的科室集合与当前 Unit Tree 不完全一致，不应立即认定为数据错误。

可能原因包括：

- Unit 在测算周期内发生新增、撤并；
- 科室名称/编码发生变化；
- Unit 的有效周期与 Workload Measurement Period 不完全一致。

此类情况需结合 Period、Unit 有效期及数据映射处理；具体时间算法不在 Q-04 范围内，后续另行决策。

---

# 26. Budget 领域模型对齐决策批次（Q-05，2026-09）

本批次决策来源于 Q-05 Budget 领域模型对齐的业务讨论，经产品确认。

## D-083 Budget 是测算阶段的预算事实

Budget 表示为建立绩效测算模型而形成的预算结构、预算分配以及与工作量对应的预算。

核算阶段（实际积分 × 实际工作量 → 应发绩效）属于绩效核算结果，不再是 Budget。

不得把测算阶段的 Budget 与核算阶段实际绩效混为同一领域对象。

## D-084 budget_split 仅表达 Budget → Budget

budget_split 表示将一个预算拆分为若干业务类目、科室或其他预算节点的规划过程。

- Budget Split 不改变整体预算总额；
- Budget 可以递归分解，不要求拆解到底，允许局部分解；
- 分解粒度由当前咨询模型需要决定；数据存在更细粒度不代表当前模型必须使用更细粒度；
- 必要时可以重新聚合。

budget_split 只表达 Budget → Budget 的结构分解，不得用于表达 Budget → UnitCard 的分配。

## D-085 budget_assign：预算分配

新增 RelationType `budget_assign`（Budget → UnitCard）。

预算分配是将预算真正赋予某个 UnitCard，使其获得从相应预算结构中取得该预算的明确路径。

- 分配金额记录在 Relation metadata（allocatedAmount）；
- 预算可以部分分配，不要求一次性分配干净；
- 已分配不等于已占用（见 D-086）。

## D-086 Budget Occupancy 与派生分离

### 占用语义

预算占用是已经明确对应到工作量的预算金额。

Budget Occupancy 必须建立在 Budget 与 Workload 完成有效业务对应（budget_occupancy Relation）的基础上；倒算型 Budget 可以直接形成 Occupancy。

已分配 Budget ≠ 已占用 Budget。

### BudgetCard 不持久化派生值

BudgetCard 不持久化维护：

```text
usedAmount / remainingAmount / utilizationRate / budgetState / availableAmount
ResourceBar 数值 / BudgetBalanceSummary 数值
```

BudgetCard 保存的基础事实包括：amount、名称、来源信息、period、configurationState、validationState 等已确认基础事实。

### 派生口径（BudgetSummary）

由 selector 从 Relation 派生：

```text
total            = amount
allocated        = Σ budget_assign.allocatedAmount
occupied         = Σ active 且 confirmed 的 budget_occupancy.matchedAmount（口径已经 D-089 修订）
allocatedButIdle = max(0, allocated - occupied)
unallocated      = max(0, total - allocated)（口径已经 D-089 修订）
```

血槽至少区分：已占用 / 已分配但闲置 / 未分配。

### 闲置识别

- 闲置预算 = allocatedButIdle > 0；
- 未分配 ≠ 闲置；
- 闲置工作量 = 已被单元使用（workload_assign/share）但尚无已确认预算对应的工作量；系统只暴露事实，不得自动替用户配置预算。

## D-087 budget_occupancy：预算与工作量的对应

新增 RelationType `budget_occupancy`（source = BudgetCard，target = WorkloadCard）。

- 允许一对一、一个预算对应多个工作量、多个预算对应一个工作量；
- 多个预算对应一个工作量时可以合计占用，但必须保留各 Budget 的独立来源事实；
- 确认状态原约定由 Relation.active 表达（false = 待确认候选，true = 已确认）；该口径已经产品裁决修订：确认状态由 OccupancyStatus 承载，Relation.active 仅表示生命周期有效性（见 D-090）；暂不匹配可以不建关系或保留 candidate；
- 周期对齐信息记录在 metadata.alignment（strategy: intersection / monthly_average / manual / inherited，对齐后 period）；
- 系统可以计算周期交集、判断无交集、提供月均候选，但不得自动替咨询组决定对齐方式；
- 倒算型 Budget 周期天然继承 Workload 周期。

## D-088 budget_usage 废止

原 budget_usage（Budget → Score 的人工金额记录）语义不符合最终模型，予以废止并从 RelationType 中移除，由 budget_occupancy 替代。

预算占用的来源包括：

- 分解后分配：Budget Split → Budget Assign → Workload 对应 → Occupancy；
- 工作量倒算：Workload → 积分/测算规则 → 倒算 Budget → Occupancy；
- 额外提供且已明确对应 Workload 的预算。

额外提供但暂无 Workload 对应的预算不进入 Occupancy。

## 本批次 Pending（不自行决定）

- 原始预算 vs 调整后预算的最终分母规则（如 300 万 vs 305 万）；
- locked_remainder 是否作为独立业务事实；
- BenchmarkDefinition 的最终语义与各阶段 Budget Scope 组成；
- overflow / surplus / imbalanced 的派生判定（依赖分母规则；D-019 的表达要求届时以 selector 恢复）；
- 追加预算是否经 budget_compose 并入预算池；
- Σ分配是否不得超过预算总额的硬校验；
- Allocation 完整算法；
- 倒算 Budget 来源字段的正式化（当前以 metadata.origin 承载）；
- 跨独立模型的预算重复消费自动校验（D-016 原则保持）；
- 更复杂的部分倒算预算规则。

---

# 27. Budget 部分占用与关系状态裁决批次（Q-05 增量，2026-09）

本批次来源于 Q-05 实施后语义复核（commit 80f9304）发现的两项语义边界，经产品裁决修正。

## D-089 Budget Occupancy 支持部分占用

Budget Split、Budget Assign、Budget Occupancy 三者语义独立。

部分占用是一等表达：Budget 100 万 → Workload A → 实际占用 60 万是合法且必须直接表达的状态，不要求先通过 Budget Split 把 100 万拆成 60 万 + 40 万两个 BudgetCard。

budget_occupancy metadata 必须承载唯一金额字段 `matchedAmount`（该 BudgetCard 在该占用关系中实际对应/占用的预算金额），不得增设重复金额字段。

支持：Budget → 一个 Workload；Budget → 多个 Workload；多个 Budget → 一个 Workload；部分占用；剩余部分仍未占用。

BudgetSummary 口径（修订 D-086 中的 occupied / unallocated 公式）：

```text
allocated        = Σ active budget_assign.allocatedAmount
occupied         = Σ active 且 status=confirmed 的 budget_occupancy.matchedAmount
allocatedButIdle = max(0, allocated - occupied)
unallocated      = max(0, total - allocated)
```

- occupied > allocated 合法（如倒算预算未经 assign 直接占用），不得为维持恒等式截断 occupied；
- allocatedButIdle 仅代表已 Assign 给 UnitCard 但尚未形成 Occupancy 的那部分已分配预算，不得混入未分配预算、倒算预算、额外预算；
- 超额占用（occupied > total）不得截断、不得静默丢失，由 validation 层暴露异常。

## D-090 Relation.active 与业务确认状态解耦

Relation.active 只表示 Relation 生命周期有效性（是否有效/是否被删除），不表示业务确认状态。

budget_occupancy 拥有独立业务状态 OccupancyStatus：

```text
candidate  = 候选，尚未确认
confirmed  = 有效且已确认
rejected   = 业务上已否决
```

- active=true + candidate：当前存在的候选占用，尚未确认；
- active=true + confirmed：当前有效且已确认的占用；
- active=false：关系已失效/删除，无论 status 如何；
- rejected 是业务状态，与 active 独立，不要求 active=false 才能表达。

状态通过 budget_occupancy 的 typed metadata 承载，不再使用 metadata.alignment.status 等非正式字符串。

本条修订 D-087 中"Relation.active 表达确认状态"的约定。

## D-091 Period Alignment 类型化

周期对齐信息正式类型化：strategy 取值固定为 intersection / monthly_average / manual / inherited；对齐后期间记录于 alignedPeriod（如有）。

- 系统仍只提供候选，不自动替用户决定（D-087 不变）；
- confirmed 的占用必须能够知道采用的 strategy；
- 原始 Budget / Workload Period 仍来自两端领域对象；本轮不强制增加 Period snapshot。

---

# 28. 测算分支、调整表与核算结果决策批次（Q-06，2026-09）

本批次来源于 Q-06 第三轮产品裁决与调整表业务确认。

## D-092 MeasurementResult 独立承载测算积分表

MeasurementResult 是独立领域对象，承载 Measurement 阶段结果（测算积分表）：

- 对应 Measurement Period；
- entries 记录各积分项目的测算单位积分与测算积分结果；
- "测算积分结果"统一归入 MeasurementResult，不再使用 ScoreResult 表达；
- modelVersionId / dataVersionId 仅作最小追溯标识，不构成版本管理体系。

## D-093 ScoreResult 严格属于 Calculation 阶段

ScoreResult = Unit Score × Calculation Workload，只表达核算阶段结果；period 使用 calculation。

## D-094 ScoreDefinition 是积分规则/标尺

ScoreDefinition 表示积分规则/标尺，不是 Card。

删除 sourceBudgetId / sourceScoreId；派生与复用事实统一由 Relation 表达。

## D-095 score 关系方向与端点限定

- score_derive：BudgetCard → ScoreDefinition、WorkloadCard → ScoreDefinition（来源 → 派生结果）；
- score_reuse：使用者 ScoreDefinition → 被复用 ScoreDefinition；
- score_adjust：调整后 ScoreDefinition → 被调整 ScoreDefinition；
- Relation 允许非 Card 领域对象作为端点，但必须由 RelationType 明确限定 sourceType / targetType；
- score 关系在 children / references 中的查询分类暂未决，不得默认归入 references。

## D-096 调整表是人工调整的工作对象

调整表不是调整日志，而是以测算积分表为基线完整形成的独立积分调整方案：

- 每个积分项目保留原始标尺（originalUnitScore）与当前采用值（currentUnitScore），调整幅度相对原始标尺计算；
- 原始标尺是条目调整的"0 位置"（未调整位置），不是积分值为 0；
- 完全未调整的项目（原始 = 当前，幅度 = 0）是调整表中的完整条目，不是缺失数据；
- 百分比调整始终锚定原始标尺，不得改写原始标尺；
- 调整表持续存在，不因完成或确认而消失。

原 ScoreAdjustment（单条调整日志，且指向 ScoreResult）废止，由 AdjustmentTable / AdjustmentEntry 取代；调整的是 Unit Score 参数，不是 ScoreResult.totalScore。

## D-097 Fork 语义

- 调整表 Fork 与 Measurement Fork 均必须由用户主动触发，普通编辑不得自动产生分支；
- Fork 复制当时完整状态，此后双方独立编辑；
- Measurement Fork 复制测算工作状态（Cards / Relations / 测算配置），不继承旧分支的调整表；
- 旧分支调整表中的调整值不得自动传递到新 Measurement Branch；
- 新 Measurement Branch 产生自己的 MeasurementResult（测算积分表）与新的调整表。

## D-098 反复核算与固定的核算结果

- 同一调整表可以反复核算，产生多个 CalculationResult；
- 已保存的 CalculationResult 固定不变：嵌入当时的调整表状态快照与当次核算结果，后续修改调整表不得改变它；
- 临时查看核算结果不得强制产生持久化结果；
- CalculationResult 不持久化 scoreResultIds 等关系事实数组，核算结果行与调整快照作为内容内嵌。

## D-099 确认与最终使用积分表

确认是对当前调整状态的正式定格，提供形成/导出最终使用积分表（FinalScoreTable）的通道：

- 确认不关闭、不删除、不永久锁定调整表；
- 确认后仍可继续调整、继续核算、继续 Fork；
- 锁定能力属于可选的未来项目管理扩展，且不得破坏 Fork 探索语义。

## 本批次 Pending

- 绩效结果可视化（地图 / 星图 / 散点 / 倒挂分析 / 叠影等）后置；
- 调整表锁定能力；
- score 关系查询分类（children / references / 规则派生链）；
- MeasurementBranch 跨分支 ID 语义与 lineage 记录；
- Comparison 体系；
- ScoreVersion 完整体系。

---

# 29. Slot 类型约束与核算结果标识批次（Q-07，2026-09）

## D-100 acceptedCardTypes 是槽位定义属性

acceptedCardTypes 表达"该 Slot 可以接受/展示哪一种 Card"，是 Slot 的纯业务定义属性，不是关系事实，也不是 UI 状态。

- V1 规则：Unit Slot 只接受 UnitCard；Workload Slot 只接受 WorkloadCard；Budget Slot 只接受 BudgetCard；
- 唯一规则源是 SlotType：acceptedCardTypes 必须由 SlotType 推导生成，不得脱离 SlotType 独立手写维护；
- SlotType 与 RelationType 不是一一对应：Slot 的内容来自多种 RelationType 的查询结果，但 Slot 的接受类型只由本属性（经推导）决定；
- Slot 不保存 cardIds / children / parentId / references 等关系事实（D-078 不变）。

本条修订 INV-037 中"不要维护 acceptedCardTypes"的表述：字段允许存在，但必须经 SlotType 推导，禁止形成可漂移的第二套规则。

拖拽规则：

- 类型符合 → 进入现有 Relation 创建流程；
- 类型不符 → 静默忽略，不创建 Relation、不修改 Slot；
- 空白 Canvas → 创建未连接 Card，不经过 Slot 类型判断；
- Card → Card 的关系合法性仍按既有领域规则处理。

## D-101 ScoreResult 行 id 包含核算批次

ScoreResult 行 id 必须包含其所属 CalculationResult 的 id：

```text
${calculationResultId}:${scoreDefinitionId}:${workloadId}
```

保证同一调整表多次核算产生的结果行 id 不碰撞；临时查看草稿使用调用方提供的临时标识。本条修复 Q-06 审计 B-1。

---

# 30. 文档治理批次（Q-07 收尾，2026-09）

## D-102 组成/来源引用与关系事实的判别规则

对象上引用另一对象 id 的字段，只有在它表达“关系事实”时才必须走 Relation。判别规则如下：

**允许作为对象字段保存的（组成/来源引用）：**

- 该字段表达本对象的构成、基线或产生来源，回答的是“我是什么/我从哪个对象的工作状态而来”，例如 `AdjustmentTable.baselineMeasurementResultId`、`CalculationResult.adjustmentTableId`、`FinalScoreTable.adjustmentTableId`、`ScoreDefinition.workloadId`、`WorkloadCard.definitionId`；
- 被引用对象与本对象不是平等业务伙伴，而是本对象存在的根因；
- 该引用不与任何 Relation 同时表达同一业务事实。

**必须走 Relation 的（关系事实）：**

- 表达两个独立业务对象之间的对等关系（结构下挂、拆分、分配、占用、复用、派生、调整等）；
- 需要支持查询、撤销、携带 period/状态/金额等关系属性；
- 进入 INV-003 列举的 children / references / parentId / cardIds 模式的历史教训。

判别不清时，不得自行归位，应记录为待解决的问题（遵循 D-070 的决策变更流程）。

此决策用于终止“把每个 id 字段都误判成关系事实”或“把关系事实混在对象里”的两类反复争议。

---

# 31. 计算链路决策批次（Q-08，2026-09）

本批次来源于 Q-08 已确认的业务结论，是数据处理/计算链路的正式设计落档。

## D-103 Workload Definition 与 Execution 分离

Workload Definition 是可复用的数据处理定义：描述数据来源、业务字段、统计方式、固定条件、可用维度等。

Workload Definition **不绑定具体执行周期**。

Workload Execution 是一次实际工作任务的执行配置，承载周期、执行条件、维度选择以及其他本次执行参数。

同一个 Definition 可以产生多个 Execution。

本条修订 PRODUCT_SPEC §6 与 CODEX_IMPLEMENTATION §18 中 Definition 绑定 period 的旧表述。

## D-104 Calculation Graph 是结构化计算模型

Calculation Graph 是结构化、可组合的数据处理算法。

底层不能只依赖 Excel 字符串公式或 SQL；应保留结构化 Calculation Graph。

字符串公式仅可作为人类可读的展示，不作为计算事实载体。

建模应支持未来通过视觉公式编辑器构建（拖字段 → 套算法 → 拉条件 → 嵌套运算 → 输出结果列）。

## D-105 当前行（Row Context）

"当前行"不是业务对象，也不是结果对象。

它只是生成结果列时的 Row Context，例如：

```text
AVG(总费用 WHERE 病种组 = 当前行.病种组)
```

其中"病种组"是聚合数据的统计字段，"当前行.病种组"是当前记录的字段值。

## D-106 Result Set 与结果粒度

一次 Workload Execution 不是只产生一个数字，而是产生 Result Set：

- 结果列；
- 行级结果；
- 分组结果；
- 聚合结果；
- 中间/最终结果。

Result Item = Result Set 中带具体值和业务维度定位的结果单元。

统计分组层级不等于 Unit / Workload / Budget 业务层级；不得把统计分组层级建模为 Domain Relation。

## D-107 Workload Result 与 Workload Card

Workload Card 可以引用经过筛选、分组、聚合、计算得到的 Workload Result。

业务链路例：病案 → 病种权重结果列 → 筛选出院科别 = 外科 → SUM（病种权重） → 外科病种总权重 → Workload Card。

结果仍保留病种、医生、科室等业务维度，因此可以继续拆分（与 D-010~D-013 兼容）。

## D-108 Calculation Snapshot（不可变计算足迹）

Definition + Execution 确定后，形成本次实际计算使用的 Calculation Snapshot。

Snapshot 必须是完整、不可变的计算足迹，独立记录至少：

- Data Object / 数据来源；
- Business Fields / 业务字段；
- Definition 状态；
- Execution 配置；
- Calculation Graph；
- 输出列定义；
- 结果维度定义；
- 必要的数据/模型版本引用。

Snapshot 一旦形成，不允许原地修改。

## D-109 Snapshot 派生

操作者可以基于已有 Snapshot 继续工作，但必须产生新的工作状态和新的 Snapshot：

```text
Snapshot A → 调整 → Snapshot B
Snapshot A → 分叉 → Snapshot B / Snapshot C
```

历史 Snapshot 永远不受影响。

Calculation Snapshot 是计算足迹；它与 Measurement Branch（D-097）不是一个概念：Snapshot 描述一次计算的来源与配置，Branch 描述测算工作的探索分支。两者不得混淆。

## D-110 Snapshot 对比与备注

Snapshot 应支持未来的差异比较，至少能够发现：周期变化、条件变化、维度变化、字段变化、Calculation Graph 变化、输出定义变化、其他计算配置变化。

Snapshot 应支持操作者备注/调整说明（例如"根据外科反馈，排除无效病案后重新测算"）。

备注不影响 Snapshot 的计算事实。

## D-111 病种权重正式计算链路

病种权重的正式计算逻辑：

```text
病种权重（结果列） = AVG(总费用 WHERE 病种组 = 当前行.病种组) ÷ AVG(总费用)
```

之后可以进一步：筛选出院科别 → SUM（病种权重） → 某科室病种总权重 → Workload Result → Workload Card。

与 DOMAIN_SCENARIOS 第 4 条兼容；本条将病种权重的计算路径正式化。

---

# 32. Calculation Graph 执行语义批次（Q-08-H，2026-09）

## D-112 Aggregate Scope

Aggregate 节点的输入只能是 Dataset Scope，V1 只承认两种：

- Execution Dataset（`execution_dataset` 节点）——本次执行的整个数据集；
- Filtered Dataset（`filter` 节点的输出）——经条件过滤的子集。

Aggregate 节点本身**不承担** currentRow 语义；“对当前行所在分组的聚合”必须由 Filter 条件承担（如 `病种组 = 当前行.病种组`），见 INV-078 / D-113 现行行语义。

## D-113 Output Column

Graph 可声明多个输出列 Output Column：

- `name：输出列名；
- `source：来源节点 id；
- `role：final | intermediate`；
- `distribution：`perRow | perDataset`（`perGroup` 保留记号、本期不实现）。

Final 输出才允许成为 WorkloadResult / Card 的业务来源；intermediate 仅用于追溯与调试。

Distribution `perDataset` 的输出不得依赖 currentRow（INV-078）；如果依赖，校验必须报错。

## D-114 NULL / 0 / 空数据集

- 字段缺失 → null；
- Filter 无匹配行 → 空 Dataset（不是 null）；
- COUNT(空) = 0；SUM / AVG / MIN / MAX( 空 ) → **null**；
- 除数为 0 或 null → 结果 null，且产生 warning；
- Execution Dataset 为 0 行 → `ResultSet` 为空数组、`status: "missing"`，不得铸造 `value: 0` 的伪造结果行。

缺失 ≠ 0。

## D-115 Graph 是唯一算法事实载体

`WorkloadDefinition.calculation`（CalculationDefinition）进入「过渡遗留」状态：只记录语义化提示，不作为执行算法事实来源。

真正的算法是 CalculationGraph。新增执行不再读取旧 CalculationDefinition。

## D-116 Definition 条件与 Execution 条件叠加

Definition 的固定条件与 Execution 的本次条件按 AND 关系叠加。

Execution 可以收窄/补充，但不能悄悄改变 Definition 的固定统计口径。

## D-117 Empty Execution Dataset

若执行数据集为空，不做任何分支展开：

- `ResultSet.items = []`；
- `status = "missing"`；
- 不产生任何 value = 0 的伪结果。

---
1549
1550	# 34. Q-01～Q-07 历史阶段封板记录
1550
1551	Q-01：CLOSED
1551	Q-02：CLOSED
1551	Q-03：CLOSED
1551	Q-04：CLOSED
1551	Q-05：CLOSED
1551	Q-06：CLOSED
1551	Q-07：CLOSED
1551
1551	以上阶段均已完成实现与验收，不再重新打开。
1551	后续工作应建立在 Q-01～Q-08 已封板状态之上。
1551
1551	相关实现 commit：
1551	- Q-01/Q-02/Q-03 基线建立：5a23123 (chore: establish domain model alignment baseline)
1551	- Q-04 Slot 解耦与 Remainder：5adc1c5 (feat: implement Q-04 slot decoupling and Remainder semantics)
1551	- Q-05 预算域模型对齐：80f9304 (feat: align budget domain model) / 5aabca4 (feat: support partial budget occupancy) / dc53e1e (feat: support partial budget occupancy)
1551	- Q-06 测算/调整/核算结果：e82be36 (feat: align measurement score adjustment and calculation result domain)
1551	- Q-07 Slot 类型约束与核算结果标识：6b8640e (docs: add INV-068 result id rule, D-102 reference-vs-relation criterion, glossary surplus fix)
1551
1551	Q-08 已单独封板记录（见第 33 节）。
1551
1551	以上各阶段均已完成实现与验收，不再重新打开。
1551	后续工作应建立在 Q-01～Q-08 已封板状态之上。
1551
1551	---
1552
1552	# 33. 当前状态

Q-08：CLOSED
Q-08-H：CLOSED / ACCEPTED

最终实现 commit：
3e29234 feat: implement Q-08-H calculation graph execution semantics

Q-08 数据计算链路已正式确定：

```text
Data Source
→ Data Object / Business Fields
→ Workload Definition
→ Workload Execution
→ Calculation Graph
→ Calculation Snapshot
→ Result Set
→ Workload Result
→ Workload Card
```

- Definition、Execution、Graph、Snapshot 的职责边界已经确定。
- Calculation Graph 是唯一算法事实源。
- Snapshot 是不可变的计算足迹。
- Workload Result 可以引用 Result Item。
- ResultItem.value 支持 null，并保持"无数据 ≠ 0"的语义。
- perGroup 在 V1 中明确未实现，不得伪装成已实现。

最终验收：
- 测试：67/67 通过
- typecheck：通过
- build：通过
- 工作区：clean
- P0 = 0
- P1 = 0
- 剩余 P2 不阻塞 Q-08 封板

本文件为 V1 决策基线。

后续新增决策应继续使用 `D-xxx` 编号，并明确：

- 决策内容；
- 适用范围；
- 是否属于 V1；
- 是否会影响现有 Domain Model。

如果新决策废止旧决策，应明确标记旧决策，而不是静默删除历史决策。

---

# 35. Q-09-A Workload Card 与 Workload Result 关联决策批次（2026-09）

## D-127 Workload Card 引用 Workload Result

Workload Card 通过 `workloadResultId` 引用 Workload Result，不复制 Result 的统计事实字段。

一个 Workload Result 可以被多个 Workload Card 引用（多对一关系）。

Card 面上的 `value` 仅为展示缓存，不构成第二套统计事实。

## D-128 Workload Result 可被多 Card 复用

同一个 Workload Result 可以被多个 Workload Card 引用（多对一关系）。

例如：同一个"出院人次"结果可同时用于"出院人次积分"和"床旁结算积分"两个不同的积分计算模型，分别关联不同预算。

复用 Result 不等于复制 Result，不产生新的统计事实。

## D-129 Workload Resolution 语义

当 Workload Card 拖入 Unit Slot 时，系统执行 Resolution 判断：

- **Exact Match**：工作量统计范围与目标 Unit 完全一致
- **Ancestor Match**：工作量统计范围高于目标 Unit（父级→子级），可拆分
- **Descendant Match**：工作量统计范围低于目标 Unit（子级→父级），可汇总
- **No Match**：无法建立合理匹配

Resolution 结果作为推荐呈现，不自动建立 Relation，需用户确认。

## D-129 Resolution 推荐不自动建立 Relation

系统仅给出推荐（如"发现已有骨科出院人次，是否使用？"），用户确认后才建立正式 Relation。

Resolution 本身不是领域事实，不写入 Relation。

## D-130 Workload Split 语义

Workload Split 表达父 Workload Result 拆分为多个子 Workload Result。

- Parent Workload Result 不删除
- Child Workload Result 是新的统计事实
- 支持完整拆分和部分拆分
- 拆分关系由 workload_split Relation 表达

## D-130 Workload Definition 名称唯一

同一项目内，不允许不同 Workload Definition 使用相同名称。

若统计口径不同，必须使用不同名称（如"自然出院人次" vs "医保出院人次"）。

## D-131 Workload Result 等价判断

判断两个 Result 是否相同，基于：
- Data Source / Data Object
- Workload Definition
- Execution Period
- Execution Conditions
- Result Dimensions / Statistical Scope
- Calculation Graph

数值绝不能作为身份判断依据。

## D-131 Workload Result 与 Unit 关系解耦

Workload Result 的统计维度（如 departmentId）与 Unit 身份解耦。

例如：王大夫的出院人次 Result 的 dimensions 含 departmentId=骨科，不代表它属于骨科 Unit。

拖入骨科 Unit 时，属于 Descendant Match（统计范围低于目标 Unit），需 Resolution 处理。

## D-131 共享状态由使用关系派生

是否"共享"由实际 Relation 推导，不在 Result/Card 上存 `shared: boolean`。

UI 显示"已被 N 个对象使用"，Inspector 显示使用位置列表，均为派生状态。

---

# 35. Q-01～Q-07 历史阶段封板记录
