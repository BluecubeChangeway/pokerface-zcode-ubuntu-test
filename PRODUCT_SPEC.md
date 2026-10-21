# 绩效卡牌系统｜Codex 第一版开发规格 V1.0

## 1. 开发目标

第一版只实现可运行的前端原型，重点验证：

-   项目入口
-   数据准备/方案搭建工作区边界
-   无限画布
-   单元、工作量、预算三类卡
-   卡槽
-   底部牌盒/手牌
-   拖拽建立关系
-   推荐与用户确认
-   Focus、Ghost、访问轨迹
-   关系线
-   右侧 Inspector
-   Mock 数据
-   后端接口预留

第一期不实现真实医院海量数据计算、AI 清洗、3D、皮肤商城、医保规则等。

## 2. 总体业务链

数据源 → 数据对象 → 工作量/预算资源 → 测算模型 → 单位积分 → 测算积分结果
→ 人工调节 → 实际执行积分 → 核算模型 → 核算结果 → 对比模型 → 对比结果。

核心原则：

-   工作量是事实资源。
-   预算是资金资源。
-   单位积分是预算与工作量之间的桥。
-   积分结果 = 单位积分 × 工作量。
-   测算积分经过人工调节后才可能成为实际执行积分。
-   测算阶段更关注实际工作发生；核算/对比阶段更关注行政归属和统计池。
-   卡组上下级关系不等于简单数学加总。

## 3. 核心对象

### Card

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

卡牌是业务对象的 UI 表现，不是数据库表。

### UnitCard

人员和组织不拆成两种卡。

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

例如王XX只有一张 Card。不同科室服务通过关系和周期表达。

### WorkloadCard

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

同一工作量允许被多个单元引用；引用事实由 Relation（workload_assign / workload_share）表达，WorkloadCard 不保存引用数组（D-075）。工作量的真实数值来自 Workload Result（Definition + Execution 的计算输出，D-103/D-107），卡面 value 只是展示缓存，不构成第二套数值事实。

### BudgetCard

``` ts
interface BudgetCard extends Card {
  type: "budget";
  amount: number;
}
```

预算是测算阶段的预算事实（D-083）。已占用、剩余、闲置、未分配一律由 Relation 派生（D-086），不在卡上持久化。

预算原则上不可重复使用。

## 4. Relation

不能用单一 parentId/children 表达全部关系。

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

关系必须独立管理。

`active` 表示关系的生命周期有效性（是否有效/是否被删除），不表示业务确认状态；业务确认状态由具体关系类型的 typed metadata 承载（D-090）。

必须提供：

``` ts
createRelation()
deleteRelation()
getRelationsForCard()
getChildren()
getReferences()
canCreateRelation()
```

其中 `getChildren()` 与 `getReferences()` 必须语义分离。

## 5. 卡槽

Slot 是具有业务语义的展示/交互入口，不保存关系事实；当前哪些 Card 出现在 Slot 中，由 Domain Relation 及业务查询规则派生（D-078）。

三类 Slot 属于不同的业务承载维度，可同时存在于同一个 UnitCard 中，不要求结构对齐；Unit Slot 只承载 UnitCard（D-079）。

`acceptedCardTypes` 是槽位定义属性：该 Slot 接受/展示哪一种 Card。V1 中由 SlotType 单一推导（Unit Slot → UnitCard、Workload Slot → WorkloadCard、Budget Slot → BudgetCard），不得独立手写为第二套规则（D-100）。SlotType 与 RelationType 不一一对应。

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

第一期核心原则：

-   单元卡进入单元槽。
-   工作量卡进入工作量槽。
-   预算卡进入预算槽。
-   卡槽可以关闭或锁定。
-   第一期开启的关系有限，但组件必须通用。
-   非法拖拽直接无效，不弹窗、不制造关系、不强制归位。

## 6. 工作量定义

工作量不能只保存一个数值；其处理链路分层（Q-08：D-103~D-110）：

### Workload Definition

可复用的数据处理定义：数据来源、业务字段、统计方式、固定条件、可用维度。**不绑定具体执行周期。**

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

### Workload Execution

一次实际执行配置：**绑定周期**、执行条件、维度选择及其他本次执行参数。

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

同一个 Definition 可产生多个 Execution。

### Calculation Graph / Snapshot / Result

- Calculation Graph 是结构化计算模型：字段引用、条件、聚合、算术、嵌套组合，不以字符串公式为计算事实载体（D-104）。
- Definition + Execution 确定后形成 Calculation Snapshot：完整、不可变的计算足迹，包含数据来源、业务字段、Definition 状态、Execution 配置、Calculation Graph、输出列定义、结果维度定义、版本引用（D-108）；**Snapshot 在执行之前固化**。
- 执行后产生 Result Set（行级/分组/聚合结果），其中每个结果单元是 Result Item（具体值 + 业务维度定位）（D-106）。
- Result Set 经筛选/分组/聚合等进一步处理形成 Workload Result，Workload Card 引用 Workload Result（D-107）。
- Snapshot 派生必须产生新 Snapshot；历史 Snapshot 永远不受修改影响（D-109）。
- Snapshot 支持未来对比与操作者备注（D-110）。

条件：

``` ts
interface Condition {
  field: string;
  operator:
    | "=" | "!=" | ">" | ">=" | "<" | "<="
    | "in" | "not_in" | "contains" | "between";
  value: unknown;
}
```

维度：

``` ts
interface Dimension {
  field: string;
  alias?: string;
  order?: number;
}
```

计算：

``` ts
interface CalculationDefinition {
  type: "count" | "sum" | "avg" | "weighted" | "formula" | "custom";
  field?: string;
  expression?: string;
  parameters?: Record<string, unknown>;
}
```

第一期 Mock 至少支持 COUNT、SUM、AVG，其他类型预留。

典型工作量可包含多个条件、多个维度和复杂计算定义，例如门诊人次、出院人次、手术台次、病种权重。

## 7. 工作量分解/聚合

工作量分解关系统一使用 `workload_split` Relation（source = 父工作量，target = 子工作量，见 D-076），不再使用通用 `structure`。

必须支持：

### 整体分解

门诊人次 → 按科室全部拆分 → 各科室门诊人次 → 再按医生拆分。

### 局部分解

用户只建立神经外科门诊人次，其余资源保持在父级。

### 部分 + 系统补齐

系统提示仍有未分解资源，由用户决定全部补齐、部分补齐或忽略。

因此父卡不能简单等于所有子卡 SUM，必须允许"未分解资源"。

未分解资源即 Remainder（未拆分剩余量，见 D-081）：属于原 Workload，当前下级业务归属/拆分去向未定；不是独立 WorkloadCard，不得解释为父级自己的工作量；允许不拆分，直接关联 Budget / 计分规则参与计算。

Remainder 与"未纳入当前处理范围的数据"（归属可确定但用户未选择处理）是两种不同状态，不得混用。

结构层级与业务归属解耦：Unit Tree ≠ Workload Tree ≠ Budget Tree。Unit 结构不自动驱动 Workload 拆分；系统可结合数据来源、维度、对应表及业务条件判断可行拆分路径并形成拆分建议，经用户确认后形成 workload_split 关系（D-080）。

## 8. 周期

``` ts
interface Period {
  start: string;
  end: string;
  mode?: "actual" | "coverage" | "measurement" | "calculation" | "comparison";
  sourcePeriods?: Period[];
}
```

需要支持：

-   统一测算周期
-   人员特殊实际周期
-   月均
-   年度覆盖换算
-   核算周期
-   对比周期

王XX可以只有一张卡，但存在：

-   神经外科服务：2025.01--11
-   急诊服务：2025.10--12

## 9. 测算与核算

测算：

> 更关注工作量实际发生在哪里。

核算/对比：

> 更关注单元实际行政归属以及统计池。

同一人员、同一事实在不同阶段允许使用不同聚合路径，不能硬编码成一种树。

## 10. 预算

预算是测算阶段的预算事实；核算阶段的应发绩效不再是 Budget（D-083）。

预算分解 budget_split：Budget → Budget 的结构分解，可递归、可局部、不改变总额、粒度由模型需要决定（D-084）。

预算分配 budget_assign：Budget → UnitCard，可部分分配，金额记录在 Relation；已分配 ≠ 已占用（D-085）。

预算占用 budget_occupancy：Budget ↔ Workload 确认（status=confirmed）后形成占用；金额由 matchedAmount 表达，支持一对一、一对多、多对一与部分占用（来源事实不丢失）；倒算型预算可直接形成占用，周期继承 Workload（D-087、D-089）。

周期不一致不是错误：系统计算交集、提供月均候选，最终由咨询组确认（D-087）。

闲置：区分未分配预算、已分配但闲置预算、闲置工作量；系统只暴露事实（D-086）。

锁定剩余、超支状态与追加预算入池方式：Pending（见 DECISIONS Q-05 批次）。

预算既可以代表预算，也可以代表原奖金。

### 正向测算

``` text
单位积分 = 预算 ÷ 测算周期工作量
```

### 倒算

``` text
占用预算 = 给定单位积分 × 测算周期工作量
剩余预算 = 预算总额 - 已占用预算
```

两种都是合法测算逻辑。

### 经验积分

允许用户跳过部分项目的正向积分测算，直接给定经验积分。经验积分 ×
测算周期工作量形成预算占用，再从上级预算中扣除。

### 预算不可重复使用

预算默认只能被占用一次。积分可以复用，但积分复用不能自动复制预算。

## 11. 预算状态与血槽

预算派生状态由 Relation 计算（D-086），BudgetCard 不持久化。

``` ts
interface BudgetSummary {
  total: number;
  allocated: number;
  occupied: number;
  allocatedButIdle: number;
  unallocated: number;
}
```

血槽至少区分三段：

``` text
已占用（occupied，含部分占用，可超额）
已分配但闲置（allocatedButIdle，仅已分配未占用部分）
未分配（unallocated = 总额 − 已分配）
```

三段之和不再强制等于总额：占用可以不经过分配（倒算路径），超额占用不截断（D-089）。

血槽通用视觉模型（基准规则 Pending）：

``` ts
interface ResourceBar {
  current: number;
  benchmark: number;
  rate: number;
  state: "normal" | "surplus" | "overflow" | "imbalanced";
}
```

规则：

``` text
rate < 1 → 未满
rate = 1 → 满槽
rate > 1 → 爆槽
```

超支不得静默截断（D-019）；结构性不均衡（imbalanced）的派生判定 Pending 分母规则。

血槽的100%基准由业务阶段决定（BenchmarkDefinition 预留）；原始预算 vs 调整后预算的分母规则 Pending（DECISIONS Q-05）。

核算结果本身也可以使用血槽。例如绩效上限 = 开单收入 ×
18%，核算结果达到120%时显示爆槽。

## 12. 积分

必须区分：

-   单位积分：1单位工作量对应多少积分。
-   总积分/核算积分/积分结果：单位积分 × 工作量。
-   测算积分。
-   实际执行积分。

关系：

``` text
预算
  ↓
单位积分
  ↑
工作量
  ↓
积分结果
  ↓
新绩效
```

### 积分复用

一个单位积分可以复用给多个符合规则的对象。

### 测算与核算

测算积分表（MeasurementResult）承载测算阶段产出的整套积分标尺；调整表以其为基线形成；核算使用调整表中当前采用的标尺 × 核算期间实际工作量，产生的 ScoreResult 严格属于核算阶段（D-092、D-093）。

### 积分调节

调整表是以测算积分表为基线的独立人工调整工作对象，不是调整日志：每个积分项目保留原始标尺与当前采用值，未调整项目的幅度为 0 但仍是完整条目。调整可以按数值或按百分比进行，百分比始终锚定原始标尺。

``` ts
interface AdjustmentEntry {
  scoreDefinitionId: string;
  originalUnitScore: number;
  currentUnitScore: number;
}

interface AdjustmentTable {
  id: string;
  baselineMeasurementResultId: string;
  entries: AdjustmentEntry[];
}
```

调整表可以反复核算：每次核算产生的 CalculationResult 固定保存当时的调整状态快照与核算结果，后续修改调整表不影响已保存结果。

调整表持续存在：确认/导出最终使用积分表不关闭、不删除、不永久锁定调整表；Fork 必须由用户主动触发（D-096~D-099）。

## 13. 牌盒

底部牌盒是独立 UI 层，悬浮于无限画布。

牌盒左侧可以切换：

-   单元
-   工作量
-   预算

鼠标在牌盒区域可以通过滚轮切换牌盒。

牌盒中的卡牌使用叠牌/手牌式视觉。

### 点击卡牌

只展开牌盒，不影响画布。

例如点击神经外科：

> 牌盒显示神经外科一病区、介入室、二病区等推荐。

### 拖拽卡牌

拖到画布才成为画布对象和 Focus。

拖到空白：

> 创建对象，不建立关系。

拖到合法卡槽：

> 建立关系。

## 14. 无限画布

支持：

-   平移
-   缩放
-   多卡牌
-   Focus
-   Selection
-   Ghost
-   关系线
-   访问轨迹

牌盒点击不能改变 Canvas。

拖入画布才改变 Canvas Focus。

多个独立卡牌可以同时存在，默认互不建立关系。

第一期不实现真实 3D，但结构预留：

``` text
rotation
depth
layer
camera
```

## 15. 推荐

推荐分两种。

### 局部推荐

用户点击卡槽：

> 牌盒切换到对应类型，并将推荐卡前置、轻微高光。

推荐不会自动建立关系。

用户：

-   拖拽
-   勾选

后才确认。

### 全局自动配置

用户主动点击"自动配置"：

> 系统可以一次推荐子单元、关联工作量、预算。

用户确认后才执行。

推荐关闭后不再主动提示；重新开启时仍显示尚未配置的推荐对象。

## 16. 访问轨迹

轨迹只属于无限画布。

``` ts
interface TrailNode {
  cardId: string;
  timestamp: number;
}
```

牌盒打开新对象时清空旧轨迹，从新对象重新开始。

点击轨迹中的节点、点击虚影、点击牌盒中的轨迹对象，都必须动态修正轨迹。

轨迹不能出现在整个应用的导航框中。

## 17. Ghost

Ghost 表示当前探索对象的上级/来源。

-   可关闭。
-   不代表新业务关系。
-   可以点击。
-   点击后成为 Focus。
-   轨迹同步变化。

## 18. 关系线

关系线不是永久显示。

在以下情况下重点显示：

-   卡槽展开
-   多层展开
-   Focus
-   查看关系

不同卡类型使用不同视觉编码，具体颜色由 Theme Token
管理，不在业务逻辑中硬编码。

必须区分：

``` text
下级关系：当前卡包含谁
引用关系：谁引用当前卡
```

## 19. 工作量引用提示

悬停工作量卡时，只显示：

``` text
被 N 个单元引用
A
B
C
```

第一期不显示复杂引用图谱。

## 20. Inspector

右侧 Inspector 可隐藏。

卡面保持简洁，详细信息进入 Inspector。

Unit：

-   名称
-   ID
-   职务
-   行政归属
-   存在周期
-   用户标签
-   结构关系

Workload：

-   名称
-   数据对象
-   周期
-   条件
-   维度
-   计算方法
-   当前值
-   引用对象

Budget：

-   名称
-   总额
-   已占用
-   剩余
-   超支
-   资金来源
-   阶段
-   占用关系

当前 Focus 为王XX时，拖拽工作量卡，Inspector 中与 Focus
最相关的"科室、医生姓名、医生ID"等字段自动高亮。

## 21. 卡牌状态

Card 的领域状态由两个独立维度表达，可同时存在（例如已配置 + warning）：

``` ts
type ConfigurationState = "unconfigured" | "partial" | "configured";
type ValidationState = "warning" | "error";
```

以下为交互/表现状态，属于 UI 层，由 UI Store 管理，不进入 Domain Card：

``` text
focused / hover / selected / dragging / ghost / collapsed / recommended
```

其中 recommended 由 recommendation 层派生，不持久化在 Card 上；collapsed 属于交互态（D-077）。

状态通过边框、光效、纹理、角标、血槽、虚影等表现，不要求每种状态使用一种颜色。

## 22. 折叠

允许：

-   完整卡
-   轻度折叠
-   牌盒叠牌

禁止：

> 画布卡牌完全折叠成一个图标。

缩放画布时可以轻度折叠，但不能失去卡牌主体。

## 23. 视觉主题

预留：

``` ts
interface CardTheme {
  unit: ThemeToken;
  workload: ThemeToken;
  budget: ThemeToken;
}
```

默认视觉概念：

-   单元：金色、铭文
-   工作量：蓝色、铁锤
-   预算：绿色、水稻纹

同时预留：

``` ts
visualGroup
visualCode
badgeCode
skinId
```

未来可以让医生、护理等身份与皮肤角标联动；第一期不实现商城。

## 24. 数据准备

第一期提供工程化页面骨架：

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

数据组操作者需要看到简化数据表，能够从字段、条件、维度和计算方式构建数据对象。

数据准备与模型搭建必须是两个交互过程。

## 25. 前后台边界

前台不直接承载医院海量原始数据。

预留：

``` text
原始数据
→ 清洗
→ 标准化
→ 计算任务
→ 中间聚合结果
→ 前端查询
```

中间结果未来可以支持：

-   周期病种数量
-   科室病种总权重
-   单元人员数量
-   工作量汇总
-   预算占用
-   剩余
-   超支

第一期只做接口和 Mock。

## 26. 服务层

建议：

``` text
projectStore
canvasStore
deckStore
relationStore
recommendationStore
inspectorStore
```

Card 组件只负责视觉和交互，不负责业务计算。

建议服务：

``` ts
interface DataService {
  getCards(): Promise<Card[]>;
  getRelations(): Promise<Relation[]>;
  getRecommendations(context: unknown): Promise<Card[]>;
  getWorkloadDefinition(id: string): Promise<WorkloadDefinition>;
  getBudget(id: string): Promise<BudgetCard>;
}
```

第一期使用 MockDataService，未来替换 ApiDataService。

## 27. Mock Demo

项目：

> 临洮县中医院绩效方案 Demo

Unit：

``` text
神经外科
├── 神经外科一病区
│   ├── 王XX
│   ├── 李XX
│   └── 护理组
├── 神经外科二病区
└── 介入室

内科
├── 王XX
└── 李XX

急诊科
└── 王XX
```

王XX必须是同一个 Unit Card ID，通过不同周期服务关系表达不同科室。

Workload：

``` text
门诊人次
├── 神经外科门诊人次
│   ├── 王XX门诊人次
│   └── 李XX门诊人次
├── 内科门诊人次
└── 骨科门诊人次
出院人次
病种权重
手术台次
中草药金额
```

Budget：

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

## 28. 必须通过的交互验收

### A

点击牌盒中的神经外科：

> 牌盒展开，画布不变。

### B

拖神经外科到画布：

> 新增 Card，Focus = 神经外科。

### C

拖内科到画布：

> 两张卡存在，无 Relation。

### D

拖神经外科门诊人次到神经外科 WorkloadSlot：

> 建立 workload_assign。

### E

非法拖拽：

> 无关系、不弹窗、不归位。

### F

出院人次同时配置给病区、护理组、主任：

> 三个 Relation 同时存在。

### G

悬停出院人次：

> 显示被哪些单元引用。

### H

点击神经外科 WorkloadSlot：

> 牌盒显示推荐工作量，不自动建立关系。

### I

神经外科 → 一病区 → 王XX：

> Canvas 显示轨迹。

### J

牌盒打开新对象：

> 旧轨迹清空。

### K

预算分解/分配后派生：

> 出院预算 60 万 = 已占用 20 万 + 已分配但闲置 15 万 + 未分配 25 万（BudgetSummary，D-086）。

### L

预算与工作量周期不一致：

> 系统计算交集（如 2025/04—08）或提供月均候选，由用户确认后才形成 budget_occupancy。

原 K/L 中的超支（overflow）与结构性不均衡（imbalanced）验收表达，待分母规则定案后恢复（DECISIONS Q-05 Pending）。

## 29. 开发顺序

``` text
01 项目入口
02 工作区壳
03 无限画布
04 Card
05 CardSlot
06 UnitCard
07 WorkloadCard
08 BudgetCard
09 Deck / Hand
10 Drag & Drop
11 Relation Service
12 Recommendation
13 Focus / Selection
14 Inspector
15 Trail
16 Ghost
17 Relationship Layer
18 BloodBar
19 Mock Data
20 Demo Flow
21 验收
```

## 30. 明确禁止第一期自行扩展

-   AI 个性化清洗
-   AI 自动建模
-   真实 Power Query 引擎
-   真实海量数据计算
-   医保扣罚
-   医保规则
-   完整绩效公式引擎
-   3D Canvas
-   45°空间
-   3D旋转
-   皮肤商城
-   用户付费
-   多用户协作
-   完整权限
-   完整审计
-   复杂动画系统

只能预留接口，不得自行扩大范围。

## 31. 工程最高优先级

``` text
业务关系正确
>
拖拽语义正确
>
卡槽语义正确
>
阶段逻辑正确
>
数据/UI解耦
>
画布体验
>
推荐
>
视觉效果
>
游戏化装饰
```

第一版的完成标准不是"功能最多"，而是用户能够用卡牌、卡槽、牌盒和无限画布搭出一个简化的医院绩效模型，并且从视觉上理解：

> 对象是什么、关系是什么、哪些已经配置、哪些尚未配置、预算用了多少、哪里发生异常。
