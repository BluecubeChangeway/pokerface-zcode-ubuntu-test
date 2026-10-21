# Domain Scenarios

> 本文件用典型业务场景说明领域模型如何运作，不替代 `DECISIONS.md`。

## 1. 王某跨科室、跨时间

王某只有一个：

```text
UnitCard: 王某
```

例如：

```text
2025-01 ~ 2025-09
AdministrativeAffiliation = 内科
ActualWork = 内科
BusinessIdentity = 内科医生

2025-10 ~ 2025-11
AdministrativeAffiliation = 内科
ActualWork = 神经外科 + 急诊
BusinessIdentity = 医生

2025-12
AdministrativeAffiliation = 急诊
ActualWork = 神经外科
BusinessIdentity = 急诊医生
```

不能创建三个王某 UnitCard。

Measurement 更关注实际工作；Calculation / Comparison 可依据具体业务规则按行政归属聚合。

## 2. 门诊人次拆分

原始数据包含：

- 时间
- 门诊号
- 科室
- 医生
- 医生ID
- 患者
- 费用
- 就诊类型
- 是否免费

先形成：

```text
全院门诊人次
```

再拆：

```text
全院门诊
├── 内科
├── 外科
└── 儿科
```

再拆：

```text
内科
├── 张医生
├── 李医生
└── 王医生
```

这些属于 `Workload Split Relation`。

如果用户只拆出部分：

```text
全院门诊
├── 内科
└── 外科
```

剩余部分不能自动解释成 0，应保持未拆分状态，并允许：

- 自动补齐
- 部分补齐
- 保持未拆分并 Warning

## 3. 实际工作两个月覆盖全年

某医生：

```text
Actual Period = 2025-11 ~ 2025-12
两个月门诊 = 400
```

若目标 Coverage Period 是全年，不能直接认为全年工作量就是 400。

可以形成：

```text
Monthly Average = 400 / 2
Coverage Period = target annual period
```

具体覆盖规则由业务模型决定，不由代码自行发明。

## 4. 病种权重

病案数据包含：

- 出院日期
- 主要诊断
- 总费用
- 材料
- 中药
- 西药
- 中成药

主要诊断可以形成前四位病种编码，例如：

```text
M78.1xxx → M78.1
```

假设 Measurement Period 为 2025 年。

```text
M78.1
5 个病例
总费用 9,000
平均费用 1,800
医院平均费用 2,000
```

则：

```text
Disease Weight = 1,800 / 2,000 = 0.9
```

如果 2026 年出现新病种，而 Measurement Period 仍为 2025 年，不应自动改变已经确定的 Measurement 基准。

如果 Disease Weight Unit Score = 10，Calculation Workload 中总 Disease Weight = 326：

```text
Score Result = 326 × 10
```

## 5. 预算蛋糕

假设医生门诊绩效 Budget：

```text
5,000,000
```

先按某方法分配：

```text
门诊人次 → 1,000,000
```

剩余：

```text
4,000,000
```

其他工作量使用经验 Unit Score：

```text
手术
中草药
入院率
中医治疗
...
```

假设这些 Score 产生：

```text
Budget Occupied = 3,870,000
```

则：

```text
Remaining = 130,000
```

同一个经验 Unit Score 被其他 Calculation 复用时，可以复用 Score 参数，但不能因此复制 5,000,000 的 Budget。

## 6. Budget Overflow

Budget：

```text
1,000,000
```

实际使用：

```text
1,100,000
```

则：

```text
Overflow = 100,000
Utilization = 110%
```

不得强制显示为 100%。

## 7. Budget 层级不平衡

```text
A = 1,000,000

B = +100,000 over
C = -200,000 remaining
```

B 超支不意味着系统必须自动从 C 扣除。

父级状态根据 Budget Split / Compose 等关系和 selector 计算。

剩余资源可以：

- 继续向下使用
- 锁定
- 保持未使用

## 8. 共享 Workload

例如“会诊次数”同时与：

```text
内科
神经外科
急诊
```

发生关系。

不要为了表达共享而复制三份原始 Workload。

根据业务语义建立 Assign / Share 等 Relation。

## 9. Workload Aggregate

```text
全院门诊
├── 内科
├── 外科
└── 儿科
```

Aggregate 不必等于简单 `sum(children)`。

Workload 的定义可能包含：

- 条件
- 维度
- 计算方法
- Coverage

因此 Aggregate 是领域语义，不只是数学求和。

## 10. Measurement 正向 / 反向

正向：

```text
Budget ÷ Measurement Workload = Unit Score
```

反向：

```text
Unit Score × Measurement Workload = Budget Occupied
```

两者都是 Measurement 场景，不要把第二种误认为 Calculation。

## 11. Measurement → Calculation

完整链路：

```text
Measurement Model
→ Measurement
→ Measurement Result
→ Unit Score
→ Calculation Model
→ Calculation
→ Calculation Workload
→ Score Result
→ Calculation Result
```

允许：

```text
Measurement Period = 2025全年
Calculation Period = 2026年3月
```

二者不要求相同。

## 12. UnitCard + WorkloadCard

例如：

```text
UnitCard: 妇产科护士
WorkloadCard: 顺产人次
```

表示业务关系。

真正关系必须是 Relation，Canvas 上的线只是 Relation 的视觉表现。

## 13. Recommendation

系统可以推荐：

```text
A / B / C
```

但：

```text
Recommendation
→ User Decision
→ Relation
```

只有用户确认/拖拽成功后才建立真实 Relation。

不能把推荐直接当成关系。

## 14. Deck 与 Canvas

Deck 是可用对象牌库。

Canvas 是业务模型工作空间。

点击 Deck 中卡片：

- 可以展开/重排 Deck
- 不自动改变 Canvas Focus

拖到有效 Slot：

- 建立对应关系

拖到空白 Canvas：

- 创建未连接 Card

拖到无效目标：

- 静默忽略
- 不弹窗
- 不强制返回牌库

## 15. 数据组逐步形成

项目可能先只有 Unit 数据：

```text
Unit Deck = 有数据
Workload Deck = 无
Budget Deck = 无
```

此时 UnitCard 仍然可以存在，Workload/Budget Slot 可以为空。

随着 Data Object 准备完成，Workload/Budget Group 动态出现。

## 16. 新需求判断

面对新需求，先问：

1. 是新业务事实还是已有事实的另一视图？
2. 是 Data Object 还是 Domain Object？
3. 是 Workload 还是 Score Result？
4. 是 Budget 还是派生状态？
5. 是 Relation 还是 Recommendation？
6. 是 ActualWork 还是 AdministrativeAffiliation？
7. 是 MeasurementResult 还是 CalculationResult？
8. 是 Actual Period 还是 Coverage Period？
9. 是否真的需要新对象？
10. 是否只是为了 UI 方便而复制第二套业务事实？

## 17. 行政保障任务：不拆分是合法最终状态

外科：

```text
普外科
骨科
妇产科
```

外科存在行政保障任务：

```text
每次任务 4 人次
每次绩效预算 = 1
每月执行 16 次
```

工作量 = 64 人次，单位工作量价值 = 1 ÷ 4 = 0.25，绩效 = 64 × 0.25 = 16。

该工作本身属于"外科主体"，参加人员是临时机动人员，可能来自不同下属科室，没有可靠数据记录其 Unit 归属，也没有必要建立固定工作组。

因此：

```text
外科
├── Unit Slot：普外科 / 骨科 / 妇产科
├── Workload Slot：行政保障任务
└── Budget Slot：行政保障绩效
```

这是完全合法的最终状态。

结构层级与业务归属解耦：不能因为 Unit Tree 存在，就强制把行政保障任务拆到普外科、骨科、妇产科。

## 18. 便民门诊：Remainder 与未纳入处理范围的数据

全院手术人次 = 1200：

```text
普外科 500
骨科 300
妇产科 200
Remainder 200
```

Remainder 200 属于原 Workload，下级业务归属/拆分去向未定，不是"外科自己的 200"。

Remainder 允许不拆分，可以直接关联 Budget / 计分规则参与计算；获得新数据或映射后也可以继续拆分，直至 Remainder = 0。

另一种情况：外科下还有便民门诊，用户本次只处理普外科、骨科、妇产科。

如果系统发现便民门诊数据已经可以确定归属，不应强制纳入本次处理，可以提示：

```text
当前选择的 Unit 未覆盖全部可映射数据，剩余数据可能涉及：便民门诊……，是否继续？
```

注意区分：

```text
Remainder
= 属于当前 Workload，下级业务归属/拆分去向未定

未纳入当前处理范围的数据
= 归属可能已经可以确定，只是用户当前没有选择处理
```

两者不得混为一谈。

## 19. 全院手术人次：拆分建议流程

分析组已经建立：

```text
全院手术人次 = 1200
```

咨询组使用这张 WorkloadCard 时，系统发现：

```text
手术记录
→ 手术科室
→ 科室对应表
→ Unit
```

可以完整确定：

```text
普外科 500
骨科 400
妇产科 300
```

系统可以主动提出拆分建议，并至少展示拆分依据：

```text
当前工作量可以依据手术记录中的"手术科室"，
通过科室对应表拆分至现有 Unit。
```

包含：

- 拆分依据的数据来源
- 使用的数据维度
- 使用的映射关系

咨询组确认后，才正式形成下级 Workload 与 workload_split Relation（Recommendation 规则同样适用：未经确认不产生 Relation）。

本场景中 WorkloadCard 由分析组事先建立，咨询组只是使用/配置；分析组/咨询组的权限与复核机制不在本场景范围。

## 20. 预算分解与分配

全院预算 300 万：

```text
门诊 80 万
住院 150 万
医技 70 万
```

住院预算进一步分解：

```text
出院人次 60 万
病种权重 40 万
手术 50 万
```

Budget Split 不改变总额、可递归、可局部、粒度由当前模型需要决定。

出院人次预算 60 万分配：

```text
普外科 UnitCard ← 20 万（budget_assign）
骨科   UnitCard ← 15 万（budget_assign）
未分配 25 万
```

已分配 ≠ 已占用。

## 21. 占用形成与闲置

普外科已分配 20 万，但暂无对应的出院人次 Workload：

```text
预算占用 = 0
闲置预算 = 20 万
```

普外科出院人次 5000 出现，且咨询组确认预算与工作量正确对应后：

```text
预算占用 = 20 万
```

反方向：普外科手术 Workload 800 台暂无对应手术预算，属于闲置工作量；系统提示咨询组，但不替其判断是否应该配置预算。

未分配 ≠ 闲置：未分配是尚未赋予 UnitCard；闲置是已分配但未占用。

## 22. 周期对齐

存在交集：

```text
Budget：2025/01—08
Workload：2025/04—12
交集 = 2025/04—08
```

系统给出交集候选，咨询组确认按 2025/04—08 对齐。

不存在交集：

```text
Workload：2025/01—12
Budget：2026/01—05
```

系统提供月均转换候选，由咨询组选择。

周期不一致本身不是错误；系统发现候选，咨询组决定。

## 23. 倒算预算

骨科手术 Workload 10000 台（2025/01—12），预设积分 5 分/台：

```text
倒算 Budget = 5 万元
周期 = 2025/01—12（继承 Workload）
```

不需要先存在独立预算池再分配；倒算 Budget 可直接形成 Budget Occupancy。

倒算预算仍是测算阶段的预算事实，不是核算阶段的实际绩效。

## 24. 额外预算

普外科特殊业务额外提供 5 万元：

- 最终明确对应某项 Workload → 进入 Budget Occupancy；
- 暂无对应 Workload → 不进入 Occupancy。

对比"预算占用相对于原始预算"时是否计入这 5 万（分母 300 万 vs 305 万）：Pending。

## 25. 部分占用

Budget 100 万，确认对应 Workload A 60 万：

```text
occupied = 60 万
```

无需先把 100 万拆成 60 万 + 40 万两个预算节点；Budget Split 与 Budget Occupancy 语义独立。

若同一预算另确认 Workload B 20 万：

```text
occupied = 80 万
```

剩余 20 万仍未占用，不因部分占用而消失。

若确认占用合计 120 万（超额）：

```text
occupied = 120 万（不截断）
validation 暴露超额异常
```

## 26. 占用状态与生命周期

```text
candidate  = 候选，尚未确认
confirmed  = 有效且已确认
rejected   = 业务上已否决
```

- active=true + candidate：候选占用存在，等待咨询组确认；
- active=true + confirmed：计入 occupied；
- active=false：关系失效/删除，无论 status 如何均不计入；
- rejected 不需要 active=false 来表达。

Relation.active 只回答"这条关系还在不在"，OccupancyStatus 回答"业务上算不算"。

## 27. 调整表与原始标尺

测算积分表给出原始标尺：

```text
门诊人次：0.50
手术人次：10.00
```

调整表条目：

```text
原始积分 10.00 → 当前 10.00 → 幅度 0      （未调整，仍是完整条目）
原始积分 10.00 → 当前 12.00 → 幅度 +2.00
原始积分 10.00 → 当前 8.00  → 幅度 -2.00
```

"0 位置"指相对原始标尺未调整的位置，不是积分值为 0。

百分比调整锚定原始标尺：

```text
10.00 → +20% → 12.00
```

即使之前已调整到 8.00，再按 +20% 调整仍从 10.00 起算到 12.00。

## 28. 反复调整、反复核算

调整表 A：

```text
调整 → 核算 → 保存 A-1
继续调整 A
核算 → 保存 A-2
继续调整 A
核算 → 保存 A-3
```

A-1 / A-2 / A-3 同时存在，各自嵌入当时的调整状态快照，不随后续修改变化。

临时查看：调整 → 核算 → 看结果，不保存则不产生持久化历史。

## 29. 调整表 Fork

调整表 A 人工 Fork 出 B：完整复制当时所有积分调整；此后 A、B 独立编辑。普通调整不产生新分支。

## 30. Measurement Fork 不带调整表

测算分支 Fork 复制 Cards / Relations / 测算配置，但不继承旧分支的调整表：

```text
分支甲：测算积分表 甲 → 调整表 甲（含人工调整）
Fork → 分支乙：重新测算 → 测算积分表 乙 → 调整表 乙（从乙的基线重新形成）
```

分支甲的调整值不得自动传递到分支乙。

## 31. 确认与最终使用积分表

确认是对当前调整状态的定格，导出最终使用积分表：

```text
调整表 A → 确认 → 最终使用积分表 F
```

确认后 A 仍然存在：可以继续调整、继续核算、继续 Fork。多方案比较使用各自保存的核算结果（含当时调整状态），互不影响。

## 32. 病种权重的正式计算链路（Q-08）

病案数据经过结构化计算图：

```text
病种权重 = AVG(总费用 WHERE 病种组 = 当前行.病种组) ÷ AVG(总费用)
```

其中"当前行.病种组"是当前记录的字段值（Row Context），不是业务对象。

产生"病种权重"结果列后：

```text
病案
→ 病种权重结果列
→ 筛选 出院科别 = 外科
→ SUM(病种权重)
→ 外科病种总权重
→ Workload Result
→ Workload Card
```

结果保留病种、医生、科室等维度，可以继续拆分。

## 33. Calculation Snapshot 与派生

Definition + Execution 确定后，形成不可变的 Calculation Snapshot：

```text
Snapshot A（全院 2025 病种权重）
```

后续工作只能从 A 派生新快照：

```text
A → 调整（"根据外科反馈，排除无效病案后重新测算"）→ Snapshot B
A → 分叉 → Snapshot C（另一套条件）
```

A 永远不受 B/C 的影响；备注可表达调整原因，但不改变 A 的计算事实。

## 34. Result Set 与结果粒度

一次 Workload Execution 产生的不是一个数字，而是 Result Set：

```text
行级结果（每份病案的权重）
分组结果（按病种组聚合）
聚合结果（外科病种总权重）
```

统计分组层级与 Unit/Workload/Budget 层级相互独立，不得混为一谈。

## 35. 病种权重的 Graph 引擎执行

Execution Dataset（全部病案行）→ Calculation Graph：

```text
Execution Dataset
    ├─ Aggregate(avg ← 全量总费用) → overallAverage
    └─ Filter(病种组 = 当前行.病种组)
        └─ Aggregate(avg ← 总费用) → diseaseGroupAverage
            ↘ 两值相除 → Weight
```

每个输出列可以成为 ResultSet 的结果单元（diseaseGroupAverage / overallAverage 为 intermediate，不是 Card 业务来源）。

Weight 是 final、perRow 输出，可以进入 WorkloadResult。

## 36. 空数据与 Null

筛选条件没有匹配行时：

```text
COUNT(empty) = 0（计数是合法事实）
SUM / AVG / MIN / MAX(empty) = null（缺失 ≠ 0）
```

除数为 0 → null + warning，不伪造 0。

Execution Dataset 为 0 行 → ResultSet.items = []、status = missing，绝不输出 value = 0。

## 37. Snapshot 冻结 / 派生 / 不可变

```text
Snapshot A（2025 病种权重基线）
   ├─ derive → Snapshot B（调整 note / conditions，A 不变）
   └─ derive → Snapshot C（修订 graph）
```

A 作为历史冻结文件永远不变；修改源头 Definition / Execution / Graph 也不影响 A 之前的执行结果。

## 38. 同一 Definition 多次执行

正确链路：

```text
同一 Definition
  → Execution A（2025 测算）
    → Snapshot A → ResultSet A
  → Execution B（2026-03 核算）
    → Snapshot B → ResultSet B
```

Execution B 不继承 A 的 Snapshot 状态；它是同一个 Definition 的另一次执行参数化。

## 39. 多输出列与根输出

同一 Graph 可声明多个输出列；`rootNodeId` 只是“主 final 输出”的快捷指向，不代表唯一输出。

任意 perDataset 输出依赖于 currentRow 必须被拒绝；intermediate 输出不能绑定成 WorkloadResult。
