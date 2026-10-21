# PROJECT_WORKING_KNOWLEDGE.md

> 本文件用于记录“绩效卡牌系统”在实际工程推进过程中已经形成、验证或约定的工程知识。
>
> **本文件不是业务决策库。**
> 已经由产品/业务裁决确定的规则，应进入 `Q-01-Q-09_DECISION_LEDGER.md`。
> 当前阶段、进行中的任务和阻塞，应进入 `PROJECT_STATUS.md`。
>
> 本文件的目标是让任何工程代理在没有历史对话的情况下，也能够理解当前代码背后的工程意图、职责边界和实现约定，避免仅根据现有代码反推业务规则。

---

## 1. 知识文件体系

| 文件 | 作用 |
|---|---|
| `PROJECT_MASTER_CONTEXT.md` | 项目整体背景、产品目标、总体范围与长期方向 |
| `PROJECT_STATUS.md` | 当前阶段、已完成工作、正在进行的任务、阻塞与下一步 |
| `Q-01-Q-09_DECISION_LEDGER.md` | 已经经过产品/业务确认的正式决策，不得由工程实现自行推翻 |
| `PROJECT_WORKING_KNOWLEDGE.md` | 工程实践中形成的架构理解、职责边界、实现约定和经过验证的工程认知 |

### 优先级

当不同信息发生冲突时：

1. 人类最新明确裁决
2. `Q-01-Q-09_DECISION_LEDGER.md`
3. `PROJECT_MASTER_CONTEXT.md`
4. `PROJECT_WORKING_KNOWLEDGE.md`
5. 当前代码中的既有实现
6. 单次任务中的临时假设

**代码不是业务规则的最高权威。**

如果发现代码、测试或旧文档与正式 Decision Ledger 冲突，不得为了让代码“看起来一致”而自行修改业务语义；应报告冲突并等待裁决。

---

## 2. ZCode 每次任务的知识读取顺序

涉及本项目核心业务或架构的任务，开始实现前应：

1. 读取 `PROJECT_STATUS.md`
2. 如果涉及已经确认的业务概念、关系、Workload、Budget、Score、Resolution、Calculation 等，读取 `Q-01-Q-09_DECISION_LEDGER.md`
3. 根据任务需要读取 `PROJECT_MASTER_CONTEXT.md`
4. 读取本文件 `PROJECT_WORKING_KNOWLEDGE.md`
5. 再阅读与当前任务直接相关的源码、测试和历史实现

不要先看局部代码，再根据局部代码推导整个项目的业务语义。

---

## 3. 当前项目的核心工程原则

### 3.1 业务语义优先于代码便利性

工程实现不得为了简化代码而改变已经确认的业务语义。

不能因为某个对象容易存储，就把它错误地变成 Relation 的替代品；也不能因为某个字段方便，就把统计维度、元数据、UI 状态混在同一个字段中。

---

### 3.2 Relation 是关系事实的统一来源

已经确认的业务关系，不应在多个对象中重复保存。

当一个业务关系本身需要被查询、追踪或表达时，优先使用正式 Relation。

但“保存一个对象为了重现或追踪计算所必需的来源引用”与“保存一条业务关系事实”不是同一件事，判断标准遵循 Decision Ledger。

---

### 3.3 统计事实与业务载体分离

当前 Workload 领域应始终保持：

```text
Workload Result = 统计事实
Workload Card   = 业务使用载体
```

Workload Card 通过 `workloadResultId` 引用 Workload Result，而不是复制 Workload Result 的业务数值作为第二事实来源。

同一个 Workload Result 可以被多个 Workload Card 使用。

### 3.4 领域身份生成不得依赖概率性短哈希

当两个不同输入碰撞会导致同一领域实体身份被覆盖/误用时，该实体的 ID 生成必须使用确定性单射方案（安全编码直接嵌入，如 src/shared/idEncoding.ts），不得使用 32-bit 短哈希等概率性摘要作为唯一身份保证。
（参考先例：executionBatchId 批次域 ID 与 child WorkloadCard ID 的两次修复）

### 3.5 WorkloadResult 身份 = 一次确定的分析执行结果

WorkloadResult 的身份由"哪一次分析执行产生了它"决定，而非由数值或咨询用法决定（D-144）：
- 新的有效分析执行（数据/定义/执行条件/图变化后的重算）→ 新 Result identity，不原地修改既有 Result；
- 同一次执行的 retry → 复用同一 identity（幂等）；
- 咨询组重新使用已有结果 → 不产生新 Result，痕迹由 Card / Relation / UserDecision 承担；
- 不以 value 是否变化单独作为 identity 判据。

confirm_split 由此获得对应边界（D-145）：children[].id 仅可用于命名本次执行创建的 child Result——
同一次执行 retry 可复用；跨 execution 复用已属于其他执行的 Result ID 必须拒绝；
继续使用既有 Result 走 use_existing / workload_assign 引用路径，不得经 split 伪装创建。
confirm_split = 创建新统计事实；use_existing / assign = 使用既有统计事实。

补充（D-146）：部分持久化失败导致 execution ownership 无法确认时，显式 child ID 已存在且业务内容
与本次执行目标完全一致 → 允许按幂等恢复 retry；归属可证为其他批次（即使内容全同）或内容有
任何差异 → 必须拒绝。判定为纯函数（内容比较 / 批次归属），检查在 executor 前置 + 持久化边界兜底。current 归属（可证为本批次）同样必须内容全同才放行：同批次身份下提交不同内容
= 矛盾断言，必拒（D-144 规则 2 补强，2026-10-05）。 同一拆分决策内显式 children[].id 必须唯一，
重复即非法输入整体拒绝（D-147），不合并、不后者覆盖、不依赖数组顺序。 统计锚点 (resultSetId, resultItemId) 在同一拆分
中同样唯一——显式 id 只是新建 child 的命名，不能绕过锚点唯一性；children 顺序无业务语义，
不参与两处 identity；同一结果的重复使用/组合属后续业务，不在 Split 阶段制造（D-148）。 实施要点：生成型 child ID 为锚点型
（parent+enc(batch)+enc(rs::ri)），Split ID 为 parent+enc(batch)+enc(childResultId)
（批次段是 other 判定的唯一证据，不可去除）——children 顺序不参与任何 identity。

---

## 4. Workload 相关工程理解

### 4.1 Workload Definition

Workload Definition 是统计规则，不是 Workload Card 的目录项。

它描述如何从 Data Object 中得到工作量，例如：

- 数据来源
- 统计字段
- 聚合/计算方法
- 时间字段
- 条件
- 维度

可以把它理解为医院 Excel 中的：

> 选哪张表 → 选哪个字段 → COUNT/SUM/其他统计 → 筛选时间 → 筛选条件 → 按什么维度统计

### 4.2 Workload Execution

Workload Execution 表示某一次具体执行。

Definition 决定“怎么算”，Execution 决定“这一次在哪个业务范围内怎么算”。

不同阶段可以共享 Definition，但使用不同 Execution 配置，例如：

```text
Measurement：
2025 全年出院人次

Calculation：
2026 年 7 月出院人次
```

### 4.3 Workload Result

Workload Result 是一次有效统计产生的业务统计结果。

它不是简单的 UI 缓存，也不是 Workload Card 的复制值。

Result Set 可以包含多个 Result Item；Result Item 可以包含数值、统计维度和统计位置/范围。

统计结果中的分组层级不等于 Unit / Workload / Budget 的业务层级。

### 4.4 Workload Card

Workload Card 是 Workload Result 的业务使用载体。

典型关系：

```text
Data Source
    ↓
Data Object
    ↓
Workload Definition
    ↓
Workload Execution
    ↓
Calculation Graph
    ↓
Calculation Snapshot
    ↓
Result Set
    ↓
Workload Result
    ↓
Workload Card
```

Card 可以进入 Unit Slot、参与 Resolution、预算/积分模型等后续业务流程。

---

## 5. Workload Hierarchy 与 Unit Hierarchy 必须分开理解

项目中至少存在两套不同的层级：

```text
Unit Hierarchy
    神经内科
      ├─ 一病区
      ├─ 二病区
      └─ 三病区

Workload Hierarchy
    某项工作量
      ├─ 子工作量
      ├─ 子工作量
      └─ ...
```

**Unit 的上下级不能自动等于 Workload 的上下级。**

即使单位存在父子关系，也不能因此自动认定对应的 Workload 存在父子关系。

是否存在 Workload Split，需要根据实际数据、Definition、Execution、映射证据等业务条件判断，并遵循已确认的 Resolution 规则。

---

## 6. Resolution 的工程定位

Resolution 是推荐/判断层，不直接改变领域事实。

**时序前提（D-150）**：Resolution 发生在用户操作成功建立 Relation **之后**。成功 Drop 到有效 Slot 本身就是建立业务关系的用户操作（Drag → Drop 成功 = Relation 建立，D-124 / D-150）；Resolution 不是建立 Relation 的前置审批，Recommendation 也不是 Relation 建立的确认步骤。Resolution 分析的是关系已建立后的当前有效业务上下文。

基本链路：

```text
用户成功 Drop 到有效 Slot（用户操作本身即关系建立决策，D-150）
      ↓
Relation 建立（正式事实，不经 Recommendation 确认链）
      ↓
Workload Card
      +
Target Unit
      ↓
Resolution Context
      ↓
Resolution Service
      ↓
Resolution Result
      ↓
Recommendation
      ↓
用户确认
      ↓
Action Executor
      ↓
正式领域事实
```

Resolution 的发现结果本身不是 Relation，也不是新的 Workload Result。

---

## 7. Recommendation 与正式事实分离

Recommendation 是建议层。

推荐可以表达：

- 使用已有结果
- 当前结果继续使用
- 拆分 Workload
- 聚合下级 Workload
- 查找已有 Workload
- 创建新的 Workload
- 创建 Relation

但 Recommendation 本身不会因为“推荐了某件事”就改变领域事实。

只有经过用户确认并成功执行相应 Action，才建立正式事实。（该句约束 Recommendation → Action 链；用户成功 Drop 直接建立的 Relation 不在此列——D-150。）

---

## 8. ActionExecutor 的职责边界

ActionExecutor 的职责是：

> 根据已经确认的 UserDecision，执行对应的领域事实变更，并返回创建/变更结果。

它不是整个应用的 Store 层，也不是 UI 层。

### ActionExecutor 可以负责

- 验证执行参数
- 验证已有领域对象
- 创建 WorkloadResult
- 创建 WorkloadSplit
- 创建 Relation
- 在执行上下文中暂存成功后的领域事实
- 保证失败路径不产生部分变更

### ActionExecutor 不应自行承担

- UI 状态
- 推荐展示
- Canvas 布局
- 自动决定用户没有确认的业务操作
- 用代码便利性替代业务裁决
- 在没有明确业务授权时自行发明新的领域语义
- 强行承担最终 Store 持久化职责

特别注意：

> “某个 Action 最终需要一个 Workload Card”与“ActionExecutor 必须自己创建这个 Card”是两个不同问题。

Card 创建属于上层业务流程还是 ActionExecutor，需要根据具体业务边界决定，不能从 D-119 自动推导出“ActionExecutor 必须创建 Card”。

---

## 9. 聚合（Aggregate）相关当前工程知识

聚合的业务规则已经由人类确认：

1. 聚合应遵循该 Workload 本身的统计定义，而不是简单规定所有 Workload 都使用 SUM。
2. 聚合结果必须保留可追溯的下级来源。
3. 如果聚合结果需要作为正式业务 Workload 继续使用，应存在对应的 Workload Card；但 Card 的具体创建职责属于工程实现问题，不应仅凭这个业务规则硬编码到 ActionExecutor。

因此，任何实现 Aggregate 的工程任务都必须区分：

```text
“怎么统计”
“统计结果来自谁”
“结果如何成为后续业务载体”
```

不能把这三个问题混成一个对象或一个字段。

---

## 10. 未经确认不得自行发明业务语义

以下情况必须先停下来报告，而不是自行决定：

- 新增业务字段的语义没有明确依据
- 把统计维度字段当作元数据容器
- 自行规定聚合算法
- 自行规定新的 RelationType
- 自行改变 Relation endpoint 语义
- 自行把 Unit hierarchy 等同于 Workload hierarchy
- 自行决定是否自动复用已有 Result
- 自行决定是否自动补全未选择的下级 Workload
- 自行决定 Card、Result、Relation 的职责边界
- 发现测试与 Decision Ledger 不一致时，选择“让测试通过”而改变业务语义

---

## 11. 测试的正确定位

测试不仅用于证明代码运行成功，也用于保护已经确认的业务语义。

但是：

> **一个测试存在，不代表它自动成为业务规则。**

如果测试断言了一个 Decision Ledger 中没有授权的语义，应先检查这个语义是否真的经过人类确认。

尤其不要出现：

```text
代码自行发明语义
    ↓
测试把该语义写死
    ↓
测试通过
    ↓
误认为业务规则已经确定
```

---

## 12. 发现新知识后的文档同步规则

每次完成重要工程任务后，应检查：

### 如果产生新的业务决策

更新：

`Q-01-Q-09_DECISION_LEDGER.md`

并明确新增 Decision 编号或对应章节。

### 如果产生新的工程架构理解

更新：

`PROJECT_WORKING_KNOWLEDGE.md`

### 如果改变当前阶段/任务状态

更新：

`PROJECT_STATUS.md`

### 如果只是局部实现细节

不必为了“看起来完整”制造大量文档。

文档应记录真正有长期价值的信息，而不是每一次代码修改的流水账。

---

## 13. ZCode 自检原则

完成任务后，ZCode 应主动回答：

1. 本次是否改变了已确认业务语义？
2. 是否引入了 Decision Ledger 没有授权的新业务概念？
3. 是否出现新的对象/字段/Relation，但没有明确职责？
4. 是否把不同层级的事实混在一起？
5. 是否存在代码通过但业务语义不确定的测试？
6. 是否发现应该写入 Working Knowledge 的工程知识？
7. 是否需要更新 PROJECT_STATUS？
8. 是否需要提出新的 Decision Ledger 项目供人类裁决？

如果第 2、3、4、5 项存在不确定性，不应自行“合理化”，而应报告。

---

## 14. 当前文件的维护原则

本文件应该随着项目推进逐渐成长，但不要变成代码流水账。

优先记录：

- 长期有效的职责边界
- 容易被新工程师误解的架构原则
- 已经通过代码和测试验证的工程约定
- 跨多个模块的重要实现规律
- 为什么某种看似合理的实现方式不能采用

不应记录：

- 单次调试过程
- 临时错误日志
- 普通 Git 提交历史
- 每个函数的逐行解释
- 可以直接从源码清楚看出的普通实现细节

---

## 16. Aggregate 执行能力与统计安全原则

以下原则已由业务与架构双重确认，属于长期有效的工程约束。

### 1. 执行能力诚实原则
“底层执行引擎存在”不等于“某业务动作存在端到端执行路径”。

系统必须区分：
- 底层引擎能力存在
- 某业务动作具备执行入口
- 某业务动作具备完整端到端执行路径

不得因为 graphExecutor 等底层能力存在，就向上层声称 Aggregate 当前可执行。

---

### 2. Result Layer Aggregate 安全原则
Result Layer Aggregate 不是默认能力，而是只有在系统能够证明统计分区安全时才能使用的执行捷径。

仅凭以下信息不得证明统计安全：
- Workload Tree
- workload_split
- sibling Workload Results
- ResultItem dimensions
- 相同 Definition

必须能够从统计来源/原始数据范围等可靠依据证明：
- 统计范围关系明确
- 不存在重复统计
- 不存在遗漏
- 分区关系满足原统计语义

当前系统缺乏足够的证明机制，因此当前禁止启用 Result Layer Aggregate。

不要把当前调查中的 C1-C7 固化为永久领域规则。
它们只是当前用于说明“为什么不能安全聚合”的工程检查维度。
未来可以根据实际执行架构重新定义证明机制。

---

### 3. Workload Tree ≠ Statistical Partition
Workload Tree / workload_split 描述 Workload 业务关系，不能自动推导为原始数据统计分区。

业务层级关系与统计数据分区必须保持语义独立。

---

### 4. Capability 边界原则
Capability 的职责是回答：

“针对当前业务动作，当前系统是否存在合法执行路径？”

Capability：
- 可以声明 executable
- 可以声明执行 route
- 可以提供原因

Capability 不应该暴露：
- GraphExecutor
- DataSource
- AggregateMethod
- 具体 Service 名称
- 具体算法实现

Resolution 只依赖 Capability 的高层声明，不直接依赖底层执行实现。

---

### 5. Recommendation 执行能力快照原则
Recommendation 中记录的 executionFeasibility 只是 Recommendation 生成时的判断快照，不是执行保证。

Recommendation 创建之后，系统状态、数据、Definition、Execution、Snapshot 或用户选择都可能发生变化。

因此：

ActionExecutor 在真正创建 Domain Fact 前，必须重新验证当前执行能力。

最终执行结果以执行时重新验证结果为准。

---

### 6. 能力不足不能改变业务语义
如果当前系统没有合法执行路径，不能为了让 ActionExecutor “能跑起来”而：
- 修改原 Workload Definition
- 新增 AggregateMethod
- 使用数学上不等价的近似聚合
- 偷换统计口径
- 把 Workload Tree 当成统计分区
- 伪造 ResultSet / ResultItem

应当如实报告“当前执行能力不足”，并保留原业务语义。

---

### 7. 不为未来能力提前创建空壳
当当前不存在真实执行路径时，不要为了架构完整而提前创建：
- AggregateExecutionService
- AggregateExecutionOrchestrator
- DataSource
- AggregateMethod
- 其他没有真实职责的抽象

只有当真实执行路径形成后，再根据实际职责建立必要的编排层或服务。

---

## 16.5 Future Architecture Constraint｜业务键幂等的并发边界（Deferred）

当前业务键幂等（workload_assign 的 Unit + Workload 复用、workload_split 的 parent + child 复用）
由**应用层查询 + 持久化边界复用**保证：保存前查询已存在事实并复用，不创建第二条。
这是 V1 单用户/单线程语义下的正确方案，不改变当前行为。

未来进入真实多用户/高并发环境后，查询-然后-写入（query-then-write）存在竞态窗口：
两个并发请求可能在查询阶段同时看不到对方，从而各自创建相同业务键的 Relation/事实。
届时应由数据库唯一约束（unique constraint on business key）、事务或等价的存储层机制
提供并发级保证，替代或加固当前的应用层复用。

状态：Deferred Principle —— 不进入 Decision Ledger，不在 V1 实现数据库约束或事务。

---

## 17. 给未来工程代理的核心提醒

## 18. 交互链路与反馈语义的工程边界（对应 D-150～D-152）

以下为 2026-10-08 人工确认的交互语义在工程层的固化表达；业务裁定正文见 Decision Ledger D-150～D-152，此处不重复裁定，只记录工程边界与易错实现方式。

### 18.1 层次不可合并

Relation Establishment（成功 Drop 即建关系）、Resolution、Recommendation、Split / Action Execution 是不同层次的动作，任何一层不得并入其他层：

- Drop 层：用户操作直接产生 Relation 事实（D-150）；
- Resolution / Recommendation 层：只分析与建议，不产生 Fact（D-130 / D-140）；
- UserDecision / Action 层：用户确认后才执行业务动作（accepted ≠ Fact，既有原则）。

### 18.2 Split 在已有关系上下文中执行

Workload A → Unit B 关系已通过 Drop 建立、Resolution 发现 Split 条件时：A → B 已经是真实存在的关系；用户确认后，Split 只是在该上下文中进一步产生新的 Workload Result / Workload Card / Split Relation 等**新事实**。

不得把该流程实现或解释为"先撤销 A → B，再创建 A1 → B1、A2 → B2……"（D-126 parent 保留、D-148 Split = decomposition 的既有裁定；当前 actionExecutor 只创建 Relation、从不删除，与此一致）。

### 18.3 什么不算有效关系变化

以下情况不构成业务关系变化，不触发关系变化后的重新 Resolution（D-150）：

- 开始拖动但没有 Drop；
- 拖到无效位置（静默取消，AGENTS §20）；
- 取消拖动；
- 暂时拖离原关系后又恢复原关系；
- 单纯 UI 动画 / 视觉移动。

只有真正导致业务关系变化的成功操作，才是事实层的"关系变化事件"，并触发自动重新 Resolution（D-151）。工程上：重新 Resolution 的接线只能挂在真实关系变更之后，不得挂在 drag start / dragover / 动画等 UI 状态事件上（与 D-010 互补：D-010 管状态字段不进 domain，本条管事件语义不误触发）。

### 18.4 "自动"的边界

关系变化后的自动重新 Resolution、自动产生新 Recommendation，"自动"只表示自动分析和推荐，绝不表示自动执行 Split / Aggregate / Assign 等业务动作。任何自动接线都不得绕过 UserDecision 直接调用 ActionExecutor / ActionSubmissionService。

### 18.5 当前反馈只服务当前有效业务上下文

当前 Feedback UI 是"当前有效业务上下文的待处理/可关注反馈"，不是历史审计界面（D-151）：关系解除或改变后，旧当前反馈自动失效，不提示、不维护历史反馈展示；不得为当前 Feedback UI 强行增加历史展示模型。底层是否保留历史数据是独立问题（审计 / 追溯），与当前反馈 UI 分开设计。

### 18.5.1 撤回后旧反馈失效（D-151 A①，2026-10-10 已接线）

撤回提交成功后的失效工程边界（三个撤回入口——守卫确认 / 直通 / 层撤回——均在 submitRevocation 成功后执行）：

- **判定输入 = 当前事实状态**（撤回成功后实时读取 getCards / getWorkloadResults），不重放过期 impact 快照——空 impact 重试时仍能按实时事实完成失效并收敛（removeRecommendation 故障注入测试验证）；
- **仅处理 kind=resolution 且 status=recommended** 的当前反馈：accepted / ignored / dismissed 属已处理历史，不删除、不改写；非 resolution kind 无生产来源与关联语义，不判不动；
- **双信号（实体存活性，非关系拓扑）**：① relatedEntityIds[0] 锚点 WorkloadCard 不存在或 businessStatus=revoked；② 适用的 payload.targetResultId 的 WorkloadResult 不存在或 revoked。不使用 Relation.active / 端点相交判定（retained 子卡、manualReview 对象、其他仍有效关系对应的反馈不误伤）；
- **不触碰 D-142**：失效 = removeRecommendation（同 ID 再注册走既有追加/upsert 分支），稳定 ID / re-offer / 状态机语义不变；
- 预览、取消、确认范围守卫拒绝路径**不触达**失效（失效只发生在撤回提交成功之后）。

### 18.5.2 revoked 确认安全检查（D-154 工程补齐，2026-10-10）

revoked 对象在业务世界中等同不存在（D-154 规则 2），确认阶段的安全检查（executor 层，存在性校验之后）：

| 执行函数 | 检查对象 |
|---|---|
| executeUseExistingResult | 目标 WorkloadCard |
| executeFindExistingWorkload | 目标父 WorkloadCard |
| executeSplitWorkload | 主体卡（context.workloadCard）+ 父 Result |
| confirm_use_current | 经委托路径（注入 context.workloadCard.id → executeUseExistingResult）接受同一检查 |

UI 确认链经 buildActionContext / sourceWorkloadCardFrom 透传 businessStatus。**暂缓范围**（审计裁定，不变）：aggregate / create_new_workload / create_new_relation 为不产事实的 stub；splitPlan.parentResultId 信号当前不可达（卡/结果成对撤回）；UnitCard 无撤回状态（V1 范围限定）。

### 18.6 决策入口收敛

Card-side Feedback Entry 与 Inspector 的取舍依据是"决策复杂度"而不是 Matching Basis / 信息量大小（D-152）：简单决策即使依据内容很多，也可在 Card-side Feedback Entry 直接完成；复杂多参数决策才需要 Inspector。不同 UI 入口必须最终进入同一个 UserDecision / Recommendation 执行链，不得各自形成独立业务逻辑；新增任何决策入口时，先检查它是否复用既有执行链。

### 18.7 实现现状：D-150 已 CLOSED / PASS（2026-10-09）

**当前有效状态**：dropTrigger 在合法 Drop 时先建立并持久化 workload_assign（经 ActionSubmissionService.submitDropAssignRelation，P2-1 同业务键幂等；方向 UnitCard → WorkloadCard；metadata.origin="drop" 不参与业务键），持久化成功或确认已有 active 关系之后才触发 Resolution → Recommendation；持久化失败返回 relation_failed、不触发 Resolution、不注册 Recommendation（App 经既有 actionError 通道透出）；无效 Drop（含目标卡不存在/类型不符）与 revoked 卡（D-154）静默忽略。真实撤回产物 → 再次合法 Drop 的组合场景已验证（revocation.test.ts：旧 assign 不复活、新 active 关系建立、持久化先于推荐注册）。关闭基线 392/392。

**历史核查记录（2026-10-08，审计轨迹；所述缺口已于次日修复，不描述当前状态）**：当时竖切片（dropTrigger / dropInteraction）只转接 Resolution 触发、未在 Drop 时建立 Relation——竖切片行为不得作为语义基线（见 D-150 注记），产品化实施时不得以"现有代码如此"为由延续该缺口。

## 19. Split 撤回的工程边界（对应 D-153～D-155）

以下为 Split 撤回语义（2026-10-08 裁定）的工程固化表达；业务裁定正文见 Decision Ledger D-153～D-155，此处不重复裁定，只记录工程边界与易错实现方式。

### 19.1 两分支不可合并

`computeSplitLayerRevocationImpact`（层撤销）与 `computeFullPathRevocationImpact`（路径撤回）是两个独立纯函数入口。层分支的"继续使用证据 → used/unused 分流"逻辑**只属于层分支**；路径分支对自然派生闭包无条件撤回，任何代码路径不得把 used/unused 判定带入路径分支。

### 19.2 撤回的对象处理规则（当前有效；对应 D-153 / D-154 / D-156 / D-158）

**整条派生路径撤回（尚未实现）**——当前有效规则只有一条：

- **物理删除该路径产生的全部 WorkloadCard 与 WorkloadResult**（D-158 方案 A，2026-10-09 裁定）。不因被其他业务 / 渠道 / 核算复用而保留；被删对象的引用方按 D-158 规则 3 处理缺失依赖与计算失效。
- **CalculationResult 仍为失效（`businessStatus = "revoked"`），不物理删除**；相关计算位置为"等待重新计算"；**缺失输入不得按 0 处理**（D-154 规则 4：待计算 = 派生态，即不存在有效结果）。

**当前层撤回（遵循 D-153，不变）**：

- 使用保护与软失效完全按 D-153 执行：有继续使用证据的直接子卡及其用途保留；未使用直接子卡为软失效（`businessStatus = "revoked"`；字段缺省 = active，向后兼容）；本层拆分边全部软删。物理删除**不适用**于层撤回。

**一切撤回都不删除**（D-153 规则 4 / D-158 规则 4）：原始 WorkloadCard、原始 WorkloadResult、UnitCard、独立业务方案。

**软处理细节（维持）**：

- Relation：软删除（`active = false`，同 relationService.deleteRelation 语义），经既有 `saveRelations` upsert 落库；
- WorkloadSplit 记录：`metadata.revocationStatus = "revoked"`（同时是 D-155 批次终结证据的保留载体）；
- 软失效对象（层撤回未使用子卡、CalculationResult）只对**既有 ID** 做 upsert（不新建任何 ID）；数值字段永不改写。

**实现现状注记（2026-10-09 第一阶段实施后）**：物理删除已在**内存运行时**实现——DataService `deleteCards/deleteWorkloadResults`（不存在 ID = no-op）、记录级闭包 `collectDerivedResultsByRecords`（全路径删除范围唯一来源，不依赖 Relation.active）、manualReview 差集清单（mock 子树 / Case C 入列不删；Case A 孤儿 Result 为声明盲区）、防复活终结检查前置（保留的 WorkloadSplit 标记承担 D-155 终结证据）。**生产阻塞**：生产 DataService 适配器尚未实现两个删除接口，MockDataService 不代表生产适配器完成。

> 历史追溯（不作为有效规则）：D-156（2026-10-09 上午）最初将整条路径撤回的例外表述为"仅物理删除衍生 WorkloadCard，派生 WorkloadResult 与 CalculationResult 维持软失效"；同日经用户确认方案 A，由 D-158 扩展为"该路径产生的全部 WorkloadCard 与 WorkloadResult 一并彻底删除"。旧表述已被 D-158 覆盖，审计轨迹见 Ledger D-156 范围标注与 D-158。

### 19.3 影响集先计算、后有序提交

撤回编排（revocationSubmissionService）先从数据快照完整计算影响集（纯函数），再按固定六阶段顺序提交：①标记 WorkloadSplit 记录（D-155 终结证据**先行**）→ ②Relation 软删除 → ③CalculationResult 软失效 → ④层撤销软处理（全路径为空集跳过）→ ⑤物理删除派生卡 → ⑥物理删除派生结果。不使用事务；软处理为幂等 upsert、删除对不存在 ID 为 no-op——中途失败后重新提交同一撤回即收敛（与 Q-09-C Recoverable Commit 同哲学），任何中断点上的同批次旧 UserDecision retry 都被前置的终结检查拒绝（阶段①先行落库保证证据先于删除存在）。

### 19.4 revoked 的查询过滤点

"业务世界中等同不存在"由查询层落实——对**软失效**对象不清理数据行（例外：整条派生路径撤回按 D-156/D-158 物理删除派生卡与派生结果的行）：

- ResolutionContextBuilder.buildFromDataService：过滤 revoked Card / Result（不作为 existing 候选、不参与 Recommendation）；
- deckCardsOf / cardById（Deck / Canvas 数据转接）：排除 revoked Card；
- Slot 成员、预算派生态、children/references 查询：既有 active 过滤自动正确（derive-on-read）。

### 19.5 防复活接线（D-155；D-158 顺序修正）

撤回终结检查按以下顺序执行（2026-10-09 D-158 修正）：**期望 Split ID 的 WorkloadSplit 记录已标记 revoked 的检查，先于"Result 不存在则跳过"**——Result 被物理删除后终结证据由保留的 WorkloadSplit 标记承担；其后才是 revoked 结果检查与 D-146 归属/内容判定。双层接线：ActionExecutor 管**显式 child ID** 路径，ActionSubmissionService 持久化边界管**全部** child（含生成型 ID）。正常未撤回批次不受影响（标记检查仅在"记录存在且已标记"时触发）。

### 19.6 测试口径

撤回测试必须断言**业务查询层面**的"当前世界已经不存在"（builder 候选排除、Deck 过滤、Slot 成员消失、预算摘要回落、活跃计算结果为空），不得只断言标志位/数据行状态。

### 19.7 撤回入口与确认范围守卫（2026-10-09 接线 + 安全验收）

入口接线（src/services/revocationEntry.ts）的工程边界：

- **两个入口语义互斥**：`revokeSplitLayer`（D-153，直接执行）与全路径链路（预览 → 确认 → 执行）不得合并、互不 fallback；
- **预览严格只读**：`previewFullPathRevocation` = loadRevocationSnapshot（仅 get\*）+ computeFullPathRevocationImpact（同一记录级闭包），零写入、零删除、零失效；两次预览幂等；
- **确认范围守卫**：`revokeDerivedPathAsPreviewed` 在确认后执行前**重新加载快照、重新计算影响集**，与用户确认的预览做**全字段结构化比较**（九个影响集字段 JSON 规范化逐一比对——不做仅数量比较，数量相同身份不同、内容修改、新增、移除全部命中）；**不一致即在 submitRevocation 之前中止，本次撤回零写入**，抛出含差异字段与"请重新预览"的错误；一致则复用既有六阶段提交（D-155/可恢复提交语义不变）；
- **预览必须展示对象身份**：待删卡/结果（名称+ID）、失效核算（ID）、软删关系（ID）、manualReview 清单（名称+ID，标注"不自动删除"）——只显示数量属违规实现；
- **调用链**：App 撤回面板 → revocationEntry →（守卫通过后）revocationSubmissionService.submitRevocation；失败经共享 actionError 通道呈现；
- `revokeDerivedPath` 为无守卫程序化直通入口，UI 确认路径禁用。

## 20. 拆分结果按需创建与跨渠道复用的工程边界（对应 D-157）

以下为 D-157（2026-10-09 裁定）的工程固化表达；业务裁定正文见 Decision Ledger D-157，此处不重复裁定，只记录工程边界、现状能力与缺口。

### 20.1 按需创建是唯一创建模式

拆分只创建用户当前选择的结果对应的衍生对象——confirm_split 的 splitParameters.children 即选择范围（2026-10-04 裁定 A 已落实）。系统不存在"全量生成后隐藏未选结果"的模式，未来也不得引入。

### 20.2 "同结果"判定 = 完整业务身份

跨渠道复用的"匹配"必须基于完整业务身份与统计内容：统计锚点 (resultSetId, resultItemId)（D-148）+ parentResultId 域 + workloadResultContentEquals 全字段内容比对（splitService.ts:177-193）；不得按名称或数值去重。Resolution 现有 findExistingResult（resolutionService.ts:178-227）是维度级匹配（unit 维度 + dimensionsEqual），只能作为推荐层线索，不满足本条的完整身份判定。

### 20.3 复用的对象边界

Result 与 Card 是不同业务对象（D-118/D-119/D-120）：复用 Result 不必然复用同一张卡。"为既有 Result 建第二张卡"目前无生产路径（D-148 CASE/SEE 暂缓）——实施前需先裁。现有唯一复用通道 = use_existing 动作族（复用既有卡）。

### 20.4 选择范围不改变有效性

渠道是否选择某卡，不影响该卡 businessStatus / 其关系 active / 撤回资格（D-157 规则 C）；有效性只由明确业务状态、有效关系与撤回规则（D-153～D-156）决定。

### 20.5 撤回与共享复用的冲突已裁决（D-158 方案 A）

D-156 × D-157 规则 E 的冲突已由 **D-158（2026-10-09，方案 A）** 裁决：整条派生路径撤回**彻底删除该路径产生的全部 WorkloadCard 与 WorkloadResult**，跨业务 / 跨渠道 / 跨计算复用不构成保留理由；被删对象的引用方必须处理缺失依赖与计算失效（计算结果 revoked + 待重算，缺失输入不得按 0）。D-157 的按需创建 / 匹配复用 / 同一结果不重复创建规则仍然成立，但不能成为阻止整条路径彻底删除的理由。层撤回维持 D-153 使用证据保护；独立对象不自动删除。工程上仍不得把"关系撤回""卡片删除""结果作废"混为一谈。

### 20.6 现状能力与缺口（2026-10-09 只读核查）

已具备：按需创建（confirm_split 参数化）；锚点身份体系（D-143～D-148）；内容全等判定函数 workloadResultContentEquals；use_existing 复用通道；业务键幂等（P2-1）。
缺失：拆分原则 / 完整计算条件的持久结构化记录（"相同拆分原则"当前不可判定——最大缺口）；跨批次锚点 / 内容匹配复用服务（confirm_split 现状会为同锚点新批次建第二份 Result）；second-card 能力；"渠道取用范围"的显式模型表达；D-156 × 共享冲突裁决。
