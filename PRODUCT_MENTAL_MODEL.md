# Product Mental Model

> 本文件描述产品的核心心智模型，防止实现者把系统误解成普通表格、BI、流程图或 React Flow Demo。

## 1. 产品是什么

本产品不是：

- Excel 网页版
- 普通 BI
- 普通数据看板
- 单纯绩效计算器
- 单纯流程图
- React Flow Card Demo

它是：

> 把医院复杂的数据、业务对象、工作量、预算、分值和绩效计算关系组织成可探索、可配置、可追溯业务模型的系统。

核心链路：

```text
数据
↓
业务对象
↓
业务关系
↓
工作量
↓
预算
↓
测算参数
↓
核算结果
↓
比较
```

## 2. 数据准备

数据准备阶段故意保持工程化：

- 看数据
- 查字段
- 清洗
- 映射
- 设置条件
- 设置维度
- 计算
- 形成 Data Object

可以具有表格、列、条件、公式、预览等传统数据工具特征。

这是为了让用户对数据来源和计算过程建立信任。

## 3. Canvas

Canvas 不是“把数据画出来”。

Canvas 是：

> 用户建立、观察、调整和探索业务关系的工作空间。

用户最终看到的是业务模型，而不是数据库表。

## 4. Card

Card 不是普通 UI Card。

它是：

> 一个业务对象在空间模型中的可操作视觉单元。

例如：

```text
儿科医生
神经外科护士
门诊人次
病种权重
预算
```

Card 应让用户快速理解：

- 我是什么
- 属于哪个业务领域
- 当前是什么状态
- 可以建立哪些关系

复杂细节不要全部塞入 Card。

## 5. Slot

Slot 不是普通 drop zone。

它是：

> 建立某类业务关系的语义入口。

例如：

```text
Unit Slot
Workload Slot
Budget Slot
```

把 WorkloadCard 拖到 Workload Slot 的意义是建立业务关系，而不是单纯移动 UI 元素。

Slot 不保存关系事实：哪些 Card 出现在 Slot 中，由 Relation 及查询规则派生。

## 6. Relation

Relation 不是一条漂亮的线。

它是：

> 真正的业务关系事实。

Canvas 上的线只是 Relation 的视觉表现。

Recommendation 即使以虚线出现，也不是真实 Relation。

## 7. Deck / Hand

Deck / Hand 不是传统菜单。

它是：

> 当前项目中可被用户拿来构建模型的业务对象牌库。

三个主要牌组：

```text
Unit
Workload
Budget
```

“牌”的隐喻服务于选择、组合、拆分、关联、重新排列等空间操作。

但游戏化只是 Interaction Metaphor，不是 Business Logic。

## 8. Budget 与 Score

这是产品中非常重要的区分。

### Budget

像有限资源池：

```text
100%
↓
消耗
↓
剩余
↓
可能超支
```

### Score

像单位参数：

```text
1 次 Workload
↓
对应多少分
```

因此：

```text
Budget = Cake
Score = Unit Conversion Parameter
```

Score 可以复用；Budget 默认不能因为 Score 复用而重复。

预算先分配、后占用：budget_assign 把预算赋予 Unit，占用（budget_occupancy）发生在预算与 Workload 确认对应之后；占用支持部分占用（matchedAmount），Relation.active 只表示生命周期，业务确认由占用状态（candidate/confirmed/rejected）承载；倒算型预算由 Workload 直接倒算形成占用。Budget 是测算阶段的预算事实，不是核算阶段的实际绩效。

积分链路是"测算积分表 → 调整表 → 反复调整/核算 → 保存核算结果 → 最终使用积分表"的人工循环：调整表是工作对象而非日志，原始标尺与当前采用值始终可区分；已保存的核算结果固定不变；确认不关闭调整表。

## 9. Blood Bar

Budget 的资源状态可以使用类似血条的视觉语言：

```text
██████████ 100%
████████████ 120%
```

120% 表示实际使用超过预算基准，不是 UI 错误。

Blood Bar 不是简单 progress bar，而是预算状态的快速视觉表达。

## 10. Recommendation

系统可以建议：

```text
A
B
C
```

但不能偷偷替用户建立业务关系：

```text
Recommendation
↓
User Decision
↓
Relation
```

只有用户确认/拖拽成功后才产生真实 Relation。

## 11. Focus

Focus 表示：

> 用户当前正在理解/操作哪个业务对象。

例如：

```text
Focus = 神经外科
```

Focus 是 UI Interaction State，不是业务关系。

## 12. Inspector

Inspector 的职责：

> 把复杂信息从 Card 的视觉层剥离出来。

例如：

- 数据来源
- 周期
- 条件
- 维度
- 计算方法
- Warning
- Error
- Model Version
- Data Version
- Result 来源

Card 负责快速理解；Inspector 负责深入理解。

## 13. 空间模型不是无限堆卡

系统需要：

- Collapse
- Expand
- Focus
- Two-level Expansion
- Deck / Hand
- Inspector

控制认知负荷。

不是所有对象都需要永久展开。

## 14. Children 与 References

Children：

> 当前对象向下的业务结构/关系。

References：

> 其他对象指向当前对象。

二者语义不同，但都应从 Relation 查询得到，而不是维护两套事实数组。

## 15. 不是数据库可视化

数据库心智模型：

```text
Table
Row
Column
Foreign Key
```

本产品心智模型：

```text
Unit
Workload
Budget
Relation
Measurement
Calculation
Result
Period
```

底层可以最终使用数据库，但用户不应该看到数据库结构。

## 16. 不是 Excel

Excel：

```text
Cell
Formula
Sheet
Table
```

本产品：

```text
Object
Relation
Model
Period
Result
```

数据准备可以像 Excel；业务模型不应该像 Excel。

## 17. 产品真正价值

系统不只回答：

> 这个数字是多少？

还要能够回答：

> 为什么是这个数字？

进一步：

> 如果改变业务关系、工作量、预算或测算规则，会发生什么？

因此结果需要：

```text
可解释
可追溯
可调整
可比较
```

## 18. 技术实现不是产品定义

React、TypeScript、Zustand、Vite、未来的 React Flow 都是实现技术。

不能因为 React Flow 使用 nodes/edges，就把产品理解成 Node Editor。

技术不能反过来定义领域。

## 19. V1 核心

V1 最重要的不是：

- 特效
- 3D
- 大数据
- AI
- Marketplace

而是：

```text
领域对象正确
关系正确
周期正确
测算/核算边界正确
预算/分值边界正确
数据与模型边界正确
结果可追溯
```

## 20. 新功能判断

面对新功能，先判断：

1. 是理解业务对象？
2. 是建立业务关系？
3. 是配置业务模型？
4. 是验证数据？
5. 是追溯结果？
6. 是比较方案？
7. 还是只是增加 UI 控件？

如果只是 UI，不要污染 Domain Model。

如果涉及业务事实，先判断是否已有：

- Domain Object
- Relation
- Period
- Result

不要因为实现方便而创建重复概念。

## 21. 最终产品隐喻

整个产品可以理解为：

> 一张可以不断整理、拆解、组合、测算和追溯的“医院绩效业务牌桌”。

牌：

```text
Unit
Workload
Budget
```

牌之间的业务关系：

```text
Relation
```

牌桌：

```text
Canvas
```

手牌：

```text
Deck / Hand
```

详细说明区：

```text
Inspector
```

测算：

```text
Measurement
```

核算：

```text
Calculation
```

结果：

```text
MeasurementResult
CalculationResult
```

比较：

```text
Comparison
```

真正支撑这一切的是：

```text
Domain Model
+
Relation
+
Period
+
Traceability
```
