# 绩效卡牌系统｜Codex 第二阶段实施包 V1.0

## 1. 文件定位

本文件与《绩效卡牌系统_Codex第一版开发规格_V1.0.md》配套使用。

产品规格回答：**做什么、业务规则是什么。**

本文件回答：**Codex
第一版按什么顺序施工、哪些必须实现、哪些禁止自行扩展、如何验收。**

第一期目标不是完整绩效软件，而是验证"卡牌 + 卡槽 + 牌盒 + 无限画布 +
关系"的交互范式。

------------------------------------------------------------------------

## 2. 第一版必须真实实现

-   项目入口：新项目 / 旧项目
-   数据准备与方案搭建两个工作区
-   无限画布
-   单元、工作量、预算三类卡
-   三类卡槽
-   底部牌盒、手牌、叠牌
-   点击牌盒卡牌展开
-   拖拽到画布
-   拖拽到合法卡槽建立关系
-   非法拖拽无效
-   多引用
-   推荐与用户确认
-   Focus
-   Inspector
-   Ghost
-   Trail
-   关系线
-   预算血槽
-   超支与结构性不均衡
-   Mock 数据
-   Mock 工作量定义器
-   Mock 服务层
-   核心 domain 测试

### 只预留、不实现

AI 清洗、真实 Power
Query、真实海量数据计算、真实数据库、3D、45°空间、皮肤商城、用户体系、多人协作、完整权限、完整审计、复杂动画。

------------------------------------------------------------------------

## 3. 推荐技术架构

若当前项目尚未确定技术栈，推荐：

-   React
-   TypeScript
-   Vite
-   Zustand
-   React Flow（第一期用于关系/节点能力）
-   Vitest
-   lucide-react

第一期不要因为未来 3D 而引入 Three.js。

不要把真实海量数据计算放进前端。

------------------------------------------------------------------------

## 4. 目录建议

``` text
src/
├── app/
├── components/
│   ├── card/
│   ├── canvas/
│   ├── deck/
│   ├── inspector/
│   └── common/
├── domain/
│   ├── card/
│   ├── relation/
│   ├── workload/
│   ├── budget/
│   ├── score/
│   ├── period/
│   └── recommendation/
├── stores/
├── services/
├── mock/
├── theme/
└── tests/
```

不要把业务逻辑全部塞进 UI 组件。

------------------------------------------------------------------------

## 5. 核心工程原则

### 5.1 Card 不是数据表

Card 是业务/UI对象。

错误：

``` ts
card.rows = entireHospitalData
```

正确：

``` ts
card.dataObjectId = "workload-outpatient"
```

### 5.2 Relation 是一等对象

禁止只用 `parentId / children[]` 表达全部关系。

一个工作量可以被多个单元引用；预算可以拆分、聚合、重组；积分可以复用；同一人员可以存在跨科室、跨周期服务。

### 5.3 Phase 是一等维度

至少：

``` text
measurement
calculation
comparison
```

### 5.4 Period 是一等维度

工作量、预算、积分、归属均应允许关联周期。

### 5.5 前端不承载原始海量数据

第一期：

``` text
MockDataService
```

未来：

``` text
原始数据 → 清洗 → 标准化 → 后台计算 → 中间聚合 → API → 前端
```

------------------------------------------------------------------------

## 6. Card

``` ts
type CardType = "unit" | "workload" | "budget";

type ConfigurationState = "unconfigured" | "partial" | "configured";
type ValidationState = "warning" | "error";

interface Card {
  id: string;
  type: CardType;
  name: string;
  code?: string;
  visualGroup?: string;
  visualCode?: string;
  badgeCode?: string;
  skinId?: string;
  period?: Period;
  configurationState: ConfigurationState;
  validationState?: ValidationState;
  slotIds: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}
```

ID 不得依赖中文名称。

------------------------------------------------------------------------

## 7. UnitCard

人员与组织不拆成两种卡。

``` ts
interface UnitCard extends Card {
  type: "unit";
  unitKind:
    | "person"
    | "department"
    | "team"
    | "business_unit"
    | "custom";

  attributes: {
    position?: string;
    administrativeParentId?: string;
    existencePeriod?: Period;
    tags?: string[];
  };
}
```

王XX只有一个 UnitCard。

跨科室服务通过关系和周期表达。

------------------------------------------------------------------------

## 8. WorkloadCard

``` ts
interface WorkloadCard extends Card {
  type: "workload";
  definitionId: string;
  value?: number;
  unit?: string;

  sourceSummary?: {
    dataObjectId?: string;
    period?: Period;
  };
}
```

同一工作量允许被多个单元引用；引用事实由 Relation（workload_assign / workload_share）表达，WorkloadCard 不保存引用数组（D-075）。工作量的真实数值来自 Workload Result（Execution 的计算输出），卡面 value 只是展示缓存（D-103/D-107）。

例如出院人次可以同时服务于病区、护理组、主任。

------------------------------------------------------------------------

## 9. BudgetCard

``` ts
interface BudgetCard extends Card {
  type: "budget";
  amount: number;
}
```

预算是测算阶段的预算事实；占用、闲置、未分配由 Relation 派生（D-083~D-088）。锁定剩余与超支表达 Pending。

------------------------------------------------------------------------

## 10. Relation

``` ts
type RelationType =
  | "structure"
  | "workload_split"
  | "workload_assign"
  | "workload_share"
  | "budget_split"
  | "budget_compose"
  | "budget_assign"
  | "budget_occupancy"
  | "score_derive"
  | "score_reuse"
  | "score_adjust";
```

``` ts
interface Relation {
  id: string;
  type: RelationType;
  sourceId: string;
  targetId: string;
  active: boolean;
  period?: Period;
  metadata?: Record<string, unknown>;
}
```

必须实现：

``` ts
createRelation()
deleteRelation()
getRelationsForCard()
getChildren()
getReferences()
canCreateRelation()
```

`getChildren()` 与 `getReferences()` 必须语义分离。

------------------------------------------------------------------------

## 11. CardSlot

Slot 不保存关系事实：当前哪些 Card 出现在 Slot 中，由 Domain Relation 及业务查询规则派生（D-078）。

`acceptedCardTypes` 是槽位定义属性，V1 由 SlotType 单一推导（D-100）；运行时接受判断以推导结果为唯一规则源。

``` ts
type SlotType = "unit" | "workload" | "budget";

interface CardSlot {
  id: string;
  ownerCardId: string;
  type: SlotType;
  enabled: boolean;
  locked: boolean;
  acceptedCardTypes: CardType[];
  displayMode: "hand" | "stack" | "count";
  expanded: boolean;
}
```

第一期：

``` text
UnitSlot → unit
WorkloadSlot → workload
BudgetSlot → budget
```

组件结构必须通用；未来可以开启目前锁定的槽。

------------------------------------------------------------------------

## 12. 拖拽语义

``` text
开始拖拽
 ↓
Hit Test
 ↓
空白？
 → 创建画布卡牌，不建立关系

Card 但不是 Slot？
 → 无效

Slot？
 ↓
enabled / locked / acceptedCardTypes
 ↓
合法？
 ├─ 是 → createRelation()
 └─ 否 → 无效
```

非法拖拽：

-   不弹窗
-   不对话框
-   不强制归位
-   不建立关系

------------------------------------------------------------------------

## 13. 牌盒

牌盒独立于 Canvas。

点击"神经外科"：

``` text
牌盒展开：
一病区 / 二病区 / 介入室
```

画布不变化。

拖到画布：

``` text
神经外科 Card
Focus = 神经外科
```

拖到空白不建立关系。

拖到合法 Slot 才建立关系。

牌盒可通过点击或悬停滚轮切换：

``` text
单元 / 工作量 / 预算
```

但画布展开某卡槽不应强制改变牌盒。

------------------------------------------------------------------------

## 14. WorkloadCard 点击

点击"门诊人次"：

``` text
门诊人次
├── 神经外科门诊人次
├── 内科门诊人次
├── 骨科门诊人次
└── 儿科门诊人次
```

只改变牌盒。

如果直接拖到空白画布，仅创建独立 WorkloadCard。

只有拖到合法 Unit 的 WorkloadSlot 才建立关系。

------------------------------------------------------------------------

## 15. 工作量分解

工作量分解关系统一使用 `workload_split` Relation（source = 父工作量，target = 子工作量，见 D-076）。

必须支持：

### 全量分解

``` text
门诊人次
→ 按科室全部拆分
→ 科室门诊人次
→ 再按医生拆分
```

### 局部分解

只建立神经外科门诊人次，其余资源仍保留在父级。

### 部分分解 + 系统补齐

显示：

``` text
已分解：3260
未分解：742
```

用户决定全部补齐、部分补齐或忽略。

未分解资源即 Remainder（未拆分剩余量，见 D-081）：属于原 Workload，当前下级业务归属/拆分去向未定；不是独立 WorkloadCard，不得解释为父级自己的工作量；允许不拆分，直接关联 Budget / 计分规则参与计算。

未分解资源不得被偷偷丢弃。

------------------------------------------------------------------------

## 16. 聚合不等于简单 SUM

父工作量可能同时包含：

``` text
已分解子卡
+
未分解资源
```

因此至少要能表达：

``` ts
childTotal
remainderTotal
coveredTotal
```

不要默认：

``` text
parent = SUM(children)
```

------------------------------------------------------------------------

## 17. 周期覆盖

例如测算周期为全年，而王XX只出诊两个月：

``` text
actualValue = 200
monthlyAverage = 100
coveredValue = 1200
```

第一期可使用 Mock 验证。

------------------------------------------------------------------------

## 18. Workload Definition / Execution

按照 Q-08 拍板的分层结构落位：

### Definition（可复用定义，不绑定周期）

``` ts
interface WorkloadDefinition {
  id: string;
  name: string;
  sourceDataObjectId: string;
  conditions: Condition[];
  dimensions: Dimension[];
  calculation: CalculationDefinition;
  coverage?: CoverageRule;
  version: number;
}
```

### Execution（本次执行配置，绑定周期）

``` ts
interface WorkloadExecution {
  id: string;
  definitionId: string;
  period: Period;
  conditions: Condition[];
  dimensions: Dimension[];
  parameters?: Record<string, unknown>;
}
```

### Calculation Graph / Result / Snapshot

第一阶段落点：

``` text
Definition + Execution 确定后
→ 形成 Calculation Snapshot（执行前固化的不可变足迹）
→ 执行
→ 产出 Result Set（行级/分组/聚合结果）
→ 经筛选/分组/聚合形成 Workload Result
→ Workload Card 引用 Workload Result
```

COUNT / SUM / AVG / weighted 仍按现有 CalculationDefinition 支持；未来结构化 Calculation Graph 节点扩展时逐步迁移（INV-073~INV-075）。

### Graph 执行语义（Q-08-H）

- Graph 是无环有向图（DAG）；节点通过 id 引用；执行前先跑 validator（INV-077）。
- Node 类型：`execution_dataset`、`field_ref`、`constant`、`filter`、`aggregate`、`arithmetic`、`output_column`。
- Aggregate 只接受 Dataset 输入（execution_dataset 或 filter），不承担 currentRow；
  “对当前行所在分组的聚合”由 Filter 的条件表达，例如：Filter(input=ds, condition: candidateRow.diseaseGroup = currentRow.diseaseGroup)。
- Output Column：多列；role = final / intermediate；distribution = perRow / perDataset（perGroup 保留但未实现）。
- intermediate 结果不进入 WorkloadResult；只有 final 才行。
- NULL / 0：COUNT(空)=0；SUM/AVG/MIN/MAX(空) = null；除数为 0 → null + warning。
- Execution Dataset 为 0 行 → ResultSet 为空、status=missing，不伪造 0。
- Execution 只读 Snapshot 内嵌数据，不读取活的在 Definition / Graph 上。

------------------------------------------------------------------------

## 19. 病种权重

第一期不实现真实病案计算引擎。

Mock 必须表现正式计算链路（D-111）：

``` text
病种权重 = AVG(总费用 WHERE 病种组 = 当前行.病种组) ÷ AVG(总费用)
```

也表现：

``` text
病种总权重 × 单位积分
= 病种权重积分结果
```

------------------------------------------------------------------------

## 20. Score

必须区分：

``` text
单位积分
```

与：

``` text
积分结果
```

``` ts
interface ScoreDefinition {
  id: string;
  workloadId: string;

  mode:
    | "derived"
    | "manual"
    | "reused"
    | "adjusted";

  unitScore: number;
}
```

ScoreDefinition 是积分规则/标尺，不是 Card；不保存 sourceBudgetId / sourceScoreId 等关系事实字段（D-094）。

``` ts
interface ScoreResult {
  id: string;
  scoreDefinitionId: string;
  workloadId: string;
  period?: Period;
  workloadValue: number;
  totalScore: number;
}
```

计算：

``` text
totalScore = unitScore × workloadValue
```

ScoreResult 严格属于 Calculation 阶段；测算积分结果由 MeasurementResult 承载（D-092、D-093）。

------------------------------------------------------------------------

## 21. Adjustment Table

调整表不是调整日志，而是以测算积分表（MeasurementResult）为基线的独立人工调整工作对象（D-096）：

``` ts
interface AdjustmentTable {
  id: string;
  baselineMeasurementResultId: string;
  entries: AdjustmentEntry[];
}

interface AdjustmentEntry {
  scoreDefinitionId: string;
  originalUnitScore: number;   // 原始标尺（"0 位置"）
  currentUnitScore: number;    // 当前采用值
}
```

流程：

``` text
测算积分表
→ 调整表（原始 = 当前，幅度 0）
→ 人工反复调整（数值 / 百分比，锚定原始标尺）
→ 反复核算（同一调整表可产生多个 CalculationResult）
→ 确认 / 导出最终使用积分表（不关闭调整表）
```

- 完全未调整的项目是完整条目；
- 调整幅度 = current − original，相对原始标尺；
- Fork 必须由用户主动触发，复制当时完整状态，此后独立（D-097）；
- 已保存的 CalculationResult 不可变，嵌入当时调整快照（D-098）。

------------------------------------------------------------------------

## 22. 正向测算与倒算

正向：

``` text
预算 ÷ 测算周期工作量 = 单位积分
```

倒算：

``` text
给定单位积分 × 测算周期工作量 = 预算占用
剩余预算 = 总预算 - 已占用预算
```

两者都是合法测算逻辑。

经验积分可以直接产生预算占用：

``` text
经验单位积分 × 测算周期工作量
= 经验赋分结果对应的预算占用
```

------------------------------------------------------------------------

## 23. 预算不可重复使用

默认：

``` text
一笔预算只能被占用一次
```

积分可以复用，但：

``` text
积分复用 ≠ 预算复制
```

不要允许一个预算同时成为两个独立积分测算的资金来源，除非未来显式增加复用权限。

第一期不开放该权限。

V1 中该原则由预算占用对应（budget_occupancy）的确认过程承载；同一预算对应多个工作量属于同一测算内的合法分解（D-087），跨独立模型的重复消费自动校验 Pending。

------------------------------------------------------------------------

## 24. 预算分解、分配与派生

budget_split：Budget → Budget，可递归、可局部（D-084）。

budget_assign：Budget → UnitCard，金额在 Relation metadata（allocatedAmount，D-085）。

budget_occupancy：Budget ↔ Workload 确认对应形成占用（D-087）；金额由 metadata.matchedAmount 表达，状态由 OccupancyStatus（candidate/confirmed/rejected）承载，Relation.active 仅表示生命周期（D-089、D-090）。

派生（budgetService）：

``` text
allocated        = Σ active budget_assign.allocatedAmount
occupied         = Σ active 且 confirmed 的 budget_occupancy.matchedAmount
allocatedButIdle = max(0, allocated - occupied)
unallocated      = max(0, total - allocated)
```

occupied > allocated 合法（倒算路径）；occupied > total 为超额占用，由 validation 暴露，不截断。

示例：

``` text
出院预算 60 万
├─ 普外科 20 万（已确认对应 Workload → 占用 20 万）
├─ 骨科 15 万（暂无 Workload → 闲置 15 万）
└─ 未分配 25 万
```

------------------------------------------------------------------------

## 25. BloodBar

血槽至少区分三段：

``` text
已占用 / 已分配但闲置 / 未分配
```

``` ts
interface ResourceBar {
  current: number;
  benchmark: number;
  rate: number;

  state:
    | "normal"
    | "surplus"
    | "overflow"
    | "imbalanced";
}
```

``` text
rate < 1 → 未满
rate = 1 → 满槽
rate > 1 → 爆槽
```

不得静默截断。

100% 基准由业务阶段决定（benchmarkDefinition 预留）；原始 vs 调整后预算分母、结构性不均衡视觉 Pending（DECISIONS Q-05）。

------------------------------------------------------------------------

## 26. 核算结果 BloodBar

例如：

``` text
绩效上限 = 开单收入 × 18%
```

若核算结果达到上限的 120%：

``` text
rate = 1.2
state = overflow
```

BloodBar 可以表达预算资源，也可以表达绩效结果相对于上限的占用。

------------------------------------------------------------------------

## 27. Recommendation

``` ts
interface Recommendation {
  id: string;
  cardId: string;
  targetCardId: string;
  targetSlotId?: string;
  reason?: string;

  status:
    | "recommended"
    | "accepted"
    | "ignored"
    | "dismissed";
}
```

推荐永远不是关系。

只有用户：

``` text
勾选
```

或：

``` text
拖到合法槽
```

才建立 Relation。

------------------------------------------------------------------------

## 28. 推荐的两种形式

### 局部推荐

用户点击某个卡槽：

``` text
牌盒切换到对应类型
推荐卡前置
轻微高光
```

不自动建立关系。

### 全局自动配置

只有用户主动点击：

``` text
自动配置
```

才进行整体推荐。

系统可以一次提出：

``` text
子单元
工作量
预算
```

用户确认后执行。

卡牌刚进入画布时不得自动配置。

------------------------------------------------------------------------

## 29. 推荐关闭

用户关闭推荐：

``` text
不再主动提示
```

重新开启：

``` text
仍显示尚未配置对象
```

关闭推荐不得删除已建立关系。

------------------------------------------------------------------------

## 30. Focus

只有以下操作改变 Canvas Focus：

-   拖入画布
-   点击画布卡牌
-   点击 Ghost
-   点击 Trail

牌盒点击不改变 Canvas Focus。

------------------------------------------------------------------------

## 31. Inspector

右侧 Inspector 可隐藏。

Card 只显示核心信息。

Inspector 显示：

``` text
基本信息
周期
来源
条件
维度
计算
关系
预算
状态
```

当 Focus 为王XX、拖入门诊工作量时：

``` text
科室：神经外科
医生姓名：王XX
医生ID：XXXX
```

与 Focus 最相关字段自动高亮。

这是上下文提示，不是自动匹配。

------------------------------------------------------------------------

## 32. Trail

Trail 只存在无限画布。

例如：

``` text
神经外科
↓
一病区
↓
王XX
```

牌盒打开新对象不影响画布对象，但如果用户从牌盒选择并开始新的探索对象，则按产品规则清空旧
Trail，从新对象开始。

点击 Trail、Ghost 或相关返回对象时，Trail 同步修正。

不得把 Trail 做成应用级顶部/左右导航。

------------------------------------------------------------------------

## 33. Ghost

Ghost：

-   半透明
-   可点击
-   不建立业务关系
-   点击后成为 Focus
-   Trail 同步变化

Ghost 表达探索辅助关系，而不是新建业务关系。

------------------------------------------------------------------------

## 34. Relation Layer

推荐 Canvas 层：

``` text
Background
RelationLayer
GhostLayer
CardLayer
SelectionLayer
TrailLayer
UIOverlay
```

关系线不是 Card 自己绘制。

关系线重点显示于：

``` text
卡槽展开
多层展开
Focus
查看关系
```

必须区分：

``` text
当前卡的下级
```

与：

``` text
引用当前卡的对象
```

第一期可用不同线型/方向预留，复杂动画后置。

------------------------------------------------------------------------

## 35. Workload 引用提示

悬停工作量卡：

``` text
被 3 个单元引用

神经外科
护理组
主任
```

第一期不要显示复杂引用图谱。

------------------------------------------------------------------------

## 36. Card 折叠

允许：

``` text
完整卡
轻度折叠
牌盒叠牌
```

不允许：

``` text
画布卡牌 → 完全图标化
```

缩放可以降低信息密度，但必须保留卡牌主体。

------------------------------------------------------------------------

## 37. Theme

预留：

``` ts
interface CardTheme {
  unit: ThemeToken;
  workload: ThemeToken;
  budget: ThemeToken;
}
```

默认视觉方向：

``` text
Unit：金色 / 铭文
Workload：蓝色 / 铁锤
Budget：绿色 / 水稻纹
```

身份角标未来可以联动皮肤：

``` text
doctor → snake_staff
nursing → nurse_cap
```

第一期只保留：

``` text
visualGroup
visualCode
badgeCode
skinId
```

------------------------------------------------------------------------

## 38. 数据准备

页面骨架：

``` text
项目
├── 数据准备
│   ├── 模板下载
│   ├── 上传
│   ├── 初次清洗校验
│   ├── 对应表
│   └── 数据对象
└── 方案搭建
    └── 无限画布
```

数据组操作者需要看到简化数据表，以便选择字段。

数据准备与模型搭建必须是两个交互过程。

------------------------------------------------------------------------

## 39. 前后台协议

未来：

``` text
原始数据
→ 清洗
→ 标准化
→ 计算任务
→ 中间聚合
→ API
→ 前端
```

中间聚合可支持：

``` text
周期病种数量
科室病种总权重
人员数量
工作量汇总
预算占用
预算剩余
超支
积分结果
```

第一期只做接口与 Mock。

------------------------------------------------------------------------

## 40. 核算/对比的归属原则

测算：

> 更关注实际工作量发生在哪里。

核算/对比：

> 更关注行政归属和统计池。

例如王XX：

``` text
2025-10～11
神经外科行政归属
但有急诊工作
```

测算可以把实际急诊工作归入急诊业务。

核算"神经外科医生人均绩效"时，王XX的个人绩效池可以按照行政归属纳入神经外科，并包含其相关急诊工作带来的绩效。

该规则必须属于 domain/service，禁止写死在 UI。

------------------------------------------------------------------------

## 41. 用户标签

Unit 支持：

``` ts
tags: string[]
```

例如：

``` text
护理人员
门诊人员
临床人员
全院护理统计池
特殊团队
```

第一期实现编辑和展示即可。

------------------------------------------------------------------------

## 42. Mock 数据必须覆盖异常

不能只做正常案例。

必须至少包含：

-   王XX跨科室
-   王XX周期重叠
-   出院人次多引用
-   门诊人次层级分解
-   部分未分解
-   预算部分分配（存在未分配余额）
-   已分配但闲置（idle budget）
-   候选待确认占用（inactive budget_occupancy）
-   倒算预算（周期继承、直接占用）
-   经验积分
-   积分复用
-   积分人工调节
-   追加预算

------------------------------------------------------------------------

## 43. 推荐 Demo

项目：

``` text
临洮县中医院绩效方案 Demo
```

Unit：

``` text
神经外科
├── 一病区
│   ├── 王XX
│   ├── 李XX
│   └── 护理组
├── 二病区
└── 介入室

内科
├── 王XX
└── 李XX

急诊科
└── 王XX
```

王XX必须只有一个 UnitCard ID。

------------------------------------------------------------------------

## 44. Workload Demo

``` text
门诊人次
├── 神经外科门诊人次
│   ├── 王XX
│   └── 李XX
├── 内科门诊人次
└── 骨科门诊人次

出院人次
病种权重
手术台次
中草药金额
```

------------------------------------------------------------------------

## 45. Budget Demo

``` text
全院原绩效奖金
├── 医生预算
│   ├── 门诊预算
│   └── 住院预算
├── 护理预算
└── 其他预算

急诊追加预算
妇产科追加预算
儿科追加预算
重症医学科追加预算
```

------------------------------------------------------------------------

## 46. 第一版开发顺序

``` text
Phase 1  工程检查 + Domain + Mock + Store
Phase 2  项目入口 + 工作区
Phase 3  无限画布
Phase 4  Card + CardSlot
Phase 5  Deck / Hand
Phase 6  Drag & Drop
Phase 7  Relation
Phase 8  Recommendation
Phase 9  Focus / Selection
Phase 10 Inspector
Phase 11 Trail / Ghost
Phase 12 Relation Layer
Phase 13 Budget / BloodBar
Phase 14 Score
Phase 15 Workload Definition Mock
Phase 16 Demo
Phase 17 测试 / 修复 / 验收
```

------------------------------------------------------------------------

## 47. 每阶段必须遵守

每次给 Codex 的任务都必须包含：

``` text
目标
范围
禁止事项
验收条件
```

示例：

``` text
目标：
实现 CardSlot。

范围：
1. 三类 Slot
2. enabled
3. locked
4. acceptedCardTypes（由 SlotType 推导）
5. hand/stack/count

禁止：
1. 不实现真实数据
2. 不增加新卡类型
3. 不修改预算业务
4. 不实现3D

验收：
1. Workload 只能进入 WorkloadSlot
2. 非法拖拽无效
3. locked Slot 不接受拖拽
```

------------------------------------------------------------------------

## 48. 第一次启动 Codex

把两个文件放入项目根目录：

``` text
PRODUCT_SPEC.md
CODEX_IMPLEMENTATION.md
```

第一次不要让 Codex 编码。

使用：

``` text
先不要写代码。

请完整阅读：
1. PRODUCT_SPEC.md
2. CODEX_IMPLEMENTATION.md

然后检查当前项目目录和现有技术栈。

输出：
1. 当前项目结构
2. 当前技术栈
3. 与规格的对应关系
4. 建议实施顺序
5. 技术风险
6. 第一阶段具体修改文件

不要修改任何文件。
不要自行增加产品需求。
不要实现3D、AI、真实海量数据、商城等功能。

等待确认。
```

------------------------------------------------------------------------

## 49. 第一条开发指令

确认后：

``` text
开始 Phase 1。

只完成：
1. domain 类型
2. Mock 数据
3. Store 基础结构
4. Service 接口
5. 测试基础设施

不要实现 Canvas UI。

完成后：
1. 运行测试
2. 运行构建
3. 输出修改文件
4. 输出测试结果
5. 输出未完成事项

不要进入 Phase 2。
```

------------------------------------------------------------------------

## 50. Codex 的长期工作纪律

优先级：

``` text
规格正确
>
当前阶段范围
>
业务正确
>
可测试
>
代码整洁
>
交互体验
>
视觉效果
>
游戏化装饰
>
自行发挥
```

禁止：

> "为了以后方便，我顺便实现了 XXX。"

------------------------------------------------------------------------

## 51. Codex 偏离时

``` text
停止。

你的实现超出了当前阶段范围。

重新阅读 PRODUCT_SPEC.md 和 CODEX_IMPLEMENTATION.md。

只保留当前阶段必须实现的内容。
不要增加产品需求。
重新运行测试和构建。
```

------------------------------------------------------------------------

## 52. 业务理解错误时

``` text
你违反了规格中的：
[具体规则]

请：
1. 定位相关代码
2. 说明当前实现为什么违反规则
3. 修改实现
4. 增加一个防止该错误再次发生的测试
5. 运行测试和构建
```

------------------------------------------------------------------------

## 53. 严重偏离时

``` text
暂停编码。

不要继续修改。

请对当前实现进行规格审计：

逐项检查：
1. Card
2. Slot
3. Relation
4. Period
5. Workload
6. Budget
7. Score
8. Recommendation
9. Focus
10. Trail
11. Ghost
12. Inspector

输出：
- 符合
- 部分符合
- 不符合

以及对应代码文件。

不要修改代码。
```

------------------------------------------------------------------------

## 54. 产品与 Codex 的长期协作方式

建议形成：

``` text
真实业务场景
↓
用户提出
↓
ChatGPT
↓
业务抽象 / 产品规则 / 交互规则
↓
PRODUCT_SPEC
↓
CODEX_IMPLEMENTATION
↓
Codex
↓
代码实现
↓
用户实际操作
↓
发现问题
↓
回到产品规则
↓
更新规格
↓
Codex 修正
```

职责分工：

> ChatGPT：确定"做什么、为什么这样做"。

> Codex：确定"怎样把已经确定的东西做出来"。

------------------------------------------------------------------------

## 55. 项目根目录推荐文件

``` text
PRODUCT_SPEC.md
CODEX_IMPLEMENTATION.md
DECISIONS.md
CHANGELOG_PRODUCT.md
```

### PRODUCT_SPEC.md

当前有效产品规则。

### CODEX_IMPLEMENTATION.md

当前第一版工程实现规则。

### DECISIONS.md

记录关键决定，例如：

``` text
DEC-001
王XX不拆人员卡。
跨科室通过关系和周期表达。
```

### CHANGELOG_PRODUCT.md

记录产品规则变化。

------------------------------------------------------------------------

## 56. 规格控制机制

以后每次形成重要新规则，不应只留在聊天记录中。

应更新：

``` text
PRODUCT_SPEC.md
```

或：

``` text
DECISIONS.md
```

否则未来 Codex 无法判断：

``` text
哪句话是最终决定
哪句话只是讨论假设
```

项目实际使用时只让 Codex 读取当前有效的：

``` text
PRODUCT_SPEC.md
```

不要同时让它读取大量历史规格。

------------------------------------------------------------------------

## 57. 下一阶段值得继续设计的内容

第一版开始开发后，最值得继续深入的只有三项：

### A. 工作量定义器

把：

``` text
数据表
→ 字段
→ 条件
→ 维度
→ 计算
→ 输出
```

设计到足以真实指导开发。

### B. 预算模型

继续严谨化：

``` text
拆分
聚合
倒算
剩余锁定
追加
预算不可重复使用
积分复用
```

### C. 核算/对比统计池

重点处理：

``` text
实际发生归属
vs
行政归属
```

以及：

``` text
个人
科室
职务
全院
```

不同统计池的聚合。

3D、AI、商城、复杂动画暂时不要阻塞第一版。

------------------------------------------------------------------------

# 59. Q-08 封板记录

Q-08：CLOSED
Q-08-H：CLOSED / ACCEPTED

最终实现 commit：
3e29234 feat: implement Q-08-H calculation graph execution semantics

Q-08 计算链路已正式确定：

Data Source
→ Data Object / Business Fields
→ Workload Definition
→ Workload Execution
→ Calculation Graph
→ Calculation Snapshot
→ Result Set
→ Workload Result
→ Workload Card

关键裁决落地：
- Calculation Graph 是唯一算法事实源（D-115）
- Calculation Snapshot 是不可变计算足迹（INV-082）
- Execution Dataset = Definition 固定条件 AND Execution 条件（D-116）
- Workload Definition 不绑定周期，周期属于 Execution（D-103）
- Calculation Graph 是唯一算法事实载体，CalculationDefinition 进入废弃路线（D-115）
- Snapshot 是不可变计算足迹（D-108）
- ResultItem.value: number | null，无数据 ≠ 0（INV-079）
- perGroup 在 V1 明确未实现，validator 报 invariant_violation，executor 产生 warning，不产出结果（D-113, INV-075）
- perGroup 不引入 CurrentGroup / executionRow（INV-078）
- Graph 唯一算法事实源，DAG 校验，Aggregate 输入限定（D-112, INV-076, INV-077）
- NULL/0 语义明确：COUNT(空)=0，SUM/AVG/MIN/MAX(空)=null，除零=null+warning（D-114, INV-079）

最终验收：
- 测试：67/67 通过
- typecheck：通过
- build：通过
- 工作区：clean
- P0 = 0
- P1 = 0
- 剩余 P2 不阻塞 Q-08 封板

第一版成功的标准不是代码量，而是：

> 用户能够像操作一种数据卡牌游戏一样，从底部牌盒取出单元、工作量、预算卡，在无限画布中组织它们，并通过拖入卡槽建立业务关系；系统能够表达层级、共享引用、预算占用、积分生成、异常和探索路径，同时不让真实海量数据计算绑死在前端。

最终用户应该能够从视觉上快速理解：

``` text
这是什么对象
谁与谁有关
哪些已经配置
哪些尚未配置
预算用了多少
哪里超支
哪里不均衡
当前正在看什么
我是从哪里探索过来的
```

只要第一版证明这一交互范式成立，就达成目标。

---

# 60. Q-01～Q-07 历史阶段封板记录

Q-01：CLOSED
Q-02：CLOSED
Q-03：CLOSED
Q-04：CLOSED
Q-05：CLOSED
Q-06：CLOSED
Q-07：CLOSED

以上阶段均已完成实现与验收，不再重新打开。
后续工作应建立在 Q-01～Q-08 已封板状态之上。

对应实现 commit：
- Q-01/Q-02/Q-03 基线建立：5a23123 (chore: establish domain model alignment baseline)
- Q-04 Slot 解耦与 Remainder：5adc1c5 (feat: implement Q-04 slot decoupling and Remainder semantics)
- Q-05 预算域模型对齐：80f9304 (feat: align budget domain model) / 5aabca4 (feat: support partial budget occupancy) / dc53e1e (feat: support partial budget occupancy)
- Q-06 测算/调整/核算结果：e82be36 (feat: align measurement score adjustment and calculation result domain)
- Q-07 Slot 类型约束与核算结果标识：6b8640e (docs: add INV-068 result id rule, D-102 reference-vs-relation criterion, glossary surplus fix)
- Q-08 已单独封板记录（见第 59 节）。

以上各阶段均已完成实现与验收，不再重新打开。
后续工作应建立在 Q-01～Q-08 已封板状态之上。

------------------------------------------------------------------------
