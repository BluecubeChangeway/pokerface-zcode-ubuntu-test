# DECISIONS.md

> 项目产品与业务决策基线
>
> 本文件记录项目中已经确认的产品规则、业务规则和重要设计决策。
>
> **规则：**
> 1. 本文件中的“已确认”内容，Codex 应视为产品决策，不得自行改变。
> 2. “待决策”内容不得被 Codex 自行实现为正式业务规则。
> 3. 当后续讨论推翻或修改既有决策时，应修改对应决策，而不是在代码中形成新的隐含规则。
> 4. 产品讨论可以产生大量候选方案，但只有用户明确确认后，才进入本文件的“已确认决策”。
> 5. 本文件优先记录“为什么系统必须这样工作”，而不是具体代码实现方式。

---

# 1. 产品定位

## D-001 产品不是普通报表工具

本产品不是传统的 Excel、报表或 BI 展示工具。

核心目标是：

> 将医院绩效数据、人员、工作量、预算、积分以及计算关系，转化为用户可以通过“卡片 + 关系 + 画布”进行理解、配置、分析和计算的可视化数据模型。

系统最终形成的是一个可执行的业务模型，而不仅是一张统计结果表。

---

## D-002 卡片是核心业务对象

卡片（Card）是系统中的基本可视化业务对象。

卡片不是单纯的 UI 元素，而是业务模型在界面上的可视化表现。

卡片可以：

- 表示一个业务对象；
- 表示一个数据对象；
- 表示一个聚合结果；
- 表示一个预算对象；
- 表示一个工作量对象；
- 与其他卡片建立关系；
- 被进一步拆分；
- 被其他模型引用。

因此：

> 卡片不是简单的“显示框”，而是业务模型的可视化节点。

---

# 2. Card 类型

## D-003 V1 使用三种核心 Card

V1 核心 Card 类型为：

1. UnitCard
2. WorkloadCard
3. BudgetCard

三者属于同一个 Card 体系。

暂不把“人员卡”单独设计为一种 Card 类型。

---

## D-004 UnitCard 同时承担人员和组织对象

人员与组织在 V1 中统一使用 UnitCard。

UnitCard 可以表示：

- 人员；
- 科室；
- 护理单元；
- 医疗单元；
- 管理单元；
- 其他医院业务实体。

`UnitKind` 可以用于描述 UnitCard 的分类，但不能因此形成不同的核心 Card 类型。

---

## D-005 人员不因跨科室自动产生多个 Person Card

同一个人原则上只有一个 UnitCard。

例如：

王某在不同时间：

- 内科工作；
- 急诊工作；
- 同时承担两个科室业务；

原则上仍然是同一个 UnitCard。

人员不同时间、不同科室承担的业务，应通过关系、业务身份、行政归属、实际工作及时间周期等数据表达，而不是简单复制人员卡。

---

## D-006 UnitCard 的名称字段使用“名称”

UnitCard 的通用名称字段统一使用：

`名称`

不使用：

`姓名`

因为 UnitCard 不仅表示人员，也可以表示科室、组织和其他业务单元。

人员相关的唯一标识统一使用：

`ID`

不使用仅针对人员的“人员ID”作为核心通用字段名称。

---

# 3. Card Slot

## D-007 Card 使用统一 Slot 体系

Card 可以具有：

- Unit Slot
- Workload Slot
- Budget Slot

不同 Card 类型可以根据业务规则启用、禁用或锁定某些 Slot。

---

## D-008 Slot 使用统一组件

不同 Card 类型原则上使用同一套 CardSlot 交互组件。

Slot 的：

- 激活；
- 禁用；
- 锁定；
- 拖入；
- 点击；
- 展开；

应由统一机制处理。

不要因为不同 Card 类型而复制多套 Slot 逻辑。

---

## D-009 同类型 Card 默认进入同类型 Slot

默认关系规则：

- Unit → Unit Slot
- Workload → Workload Slot
- Budget → Budget Slot

但这不意味着 Unit 只能拥有 Unit。

一个 UnitCard 可以直接关联：

- UnitCard；
- WorkloadCard；
- BudgetCard。

例如：

“神经外科” UnitCard 可以直接拥有：

- 医生；
- 护士；
- 手术室；

同时也可以直接拥有：

- 门诊人次；
- 家庭访视次数；
- 免费义诊次数；
- 病种权重；

以及：

- 科室预算。

---

## D-010 Slot 不要求所有层级必须完整拆分

系统不要求用户必须建立：

医院 → 科室 → 人员 → 工作量 → 更细工作量

这样的完整树状结构。

用户可以直接建立：

科室 → 工作量

也可以建立：

科室 → 医生 → 工作量。

模型应支持不同粒度并存。

---

# 4. Relation

## D-011 Relation 是一等业务对象

Card 之间的关系必须作为独立的 Relation 对象存在。

不能仅依赖：

```text
parentId
children[]
references[]

来表达完整关系。

## D-012 Children 与 References 必须区分

系统必须区分：

Children

表示：

当前 Card 向下拥有/组织的结构性子对象。

例如：

神经外科
→ 张医生
→ 李医生

这些属于 Children。

References

表示：

其他对象引用、使用或关联当前 Card。

例如：

某 WorkloadCard 使用某 UnitCard 作为统计维度。

这种关系属于 Reference，而不是 Child。

## D-013 Relation 的语义不能仅由 UI 位置决定

画布上两个 Card 的位置接近，并不代表它们存在业务关系。

只有建立 Relation 后，才形成业务模型关系。

## D-014 V1 暂时保留可扩展 Relation 类型

当前核心关系包括：

structure
workload assign
workload share
budget split
budget compose
budget usage
score reuse

后续 Workload 拆分应增加明确的：

workload_split

关系类型。

在正式实现前不得将不同业务语义永久混用为普通 structure。

# 5. Workload
## D-015 Workload 是独立业务对象

Workload 不等同于某个原始数据表。

Workload 是经过：

数据筛选；
条件判断；
维度选择；
聚合；
计算；

后形成的业务数据对象。

## D-016 Workload 可以聚合

多个低层级 Workload 可以形成一个更高层级的 Workload。

例如：

门诊总人次

可以由：

内科门诊人次；
外科门诊人次；
儿科门诊人次；

共同构成。

## D-017 Workload 可以拆分

一个 Workload 可以按照不同维度进行拆分。

例如：

门诊总人次

↓

科室门诊人次

↓

医生门诊人次。

## D-018 Workload 拆分不要求一次完成

用户可以：

一次完整拆分；
只建立部分低层级 Card；
后续继续拆分；
暂时保留未拆分资源。

系统不得强迫用户一次建立完整模型。

## D-019 部分拆分必须能够表达资源未分配状态

如果用户只拆出一部分 Workload，其余 Workload 未建立下级 Card，系统必须能够表达：

尚有资源未被分配/未被拆分。

不能让用户误以为模型已经完整。

# 6. Data Preparation
## D-020 数据准备与模型构建是两个不同阶段

数据准备不是无限画布。

数据准备阶段允许使用更加传统的：

表格；
列；
条件；
筛选；
计算；
映射；

等交互。

原因是用户需要明确知道：

原始数据经过什么处理，最终形成什么数据对象。

## D-021 Workload 数据定义类似 Power Query 思维

V1 的数据处理逻辑可以参考用户熟悉的 Power Query 工作方式：

选择数据源；
选择周期；
设置筛选条件；
选择维度；
选择数据列；
进行计算；
形成 Workload/Data Object。

但不要求技术实现直接复制 Power Query。

## D-022 Data Object 与 Card 分离

数据对象首先可以独立存在。

只有当用户将数据对象纳入模型时，才形成或绑定对应 Card。

因此：

数据对象 ≠ Card。

Card 是数据对象在业务模型中的可视化、可操作表达。

# 7. Period
## D-023 周期是业务模型的一等概念

绩效系统中的：

测量周期；
计算周期；
实际工作周期；
覆盖周期；

不能简单用一个日期范围字段代替。

## D-024 Measurement Period 与 Calculation Period 分离

测量周期与计算周期可以不同。

典型流程：

测量周期
↓
测量工作量
↓
产生单位积分
↓
计算周期
↓
单位积分 × 计算周期工作量
↓
计算结果

例如：

2025 年测量积分；

2026 年 3 月计算绩效。

两者允许不同。

## D-025 Actual Period 与 Coverage Period 分离

对于特殊人员或业务：

实际存在时间和用于计算/测算的覆盖时间可能不同。

例如：

某医生只实际工作 2 个月，但需要推算全年目标。

系统需要能够区分：

实际周期；
覆盖周期。

## D-026 支持月均与周期覆盖

当实际工作周期不足目标周期时，可以使用：

实际工作量
÷
实际月份
=
月均工作量

月均工作量
×
目标月份
=
覆盖周期工作量

具体是否采用月均、直接使用实际值或其他覆盖规则，应由业务模型决定。

# 8. 行政归属与实际工作
## D-027 实际工作与行政归属必须分离

同一个人员可能：

行政上属于 A 科室；
实际工作发生在 B 科室；
某一时期同时承担 A、B 两个科室工作。

系统不能简单用“当前科室”一个字段解决。

## D-028 测量阶段更关注实际工作

测量阶段建立工作量关系时，应主要依据：

实际发生的业务工作。

例如某医生实际在急诊产生工作量，该工作量应能够进入急诊相关工作量模型。

## D-029 计算/比较阶段可以依据行政归属进行聚合

绩效计算和人员平均比较等场景，可能需要依据：

实际行政归属。

例如：

某医生 2025 年：

1–9 月行政属于内科；
10–11 月仍属于内科但实际在急诊工作；
12 月行政转入急诊。

在进行年度科室人员平均绩效等计算时，应根据实际行政归属规则确定绩效归属。

# 9. Score
## D-030 Unit Score 是单位工作量对应的积分

“积分”在本系统中原则上表示：

单位工作量对应的积分值。

例如：

1 次门诊 = 3.2 分

其中：

3.2

是 Unit Score。

## D-031 Score Result 是计算后的积分结果

单位积分 × 工作量：

Unit Score × Workload

得到：

Score Result / 总积分结果。

例如：

3.2 分/次 × 100 次
=
320 分

## D-032 Score 可以复用

同一个 Unit Score 可以被多个计算对象复用。

例如：

某项工作在不同医生之间使用相同单位积分。

复用 Score 不等于重复占用 Budget。

# 10. Budget
## D-033 Budget 是有限资源

预算具有有限资源属性。

预算原则上应该遵循：

一份预算被分配后，不应默认被第二个模型再次占用。

## D-034 Budget 默认禁止重复占用

同一预算不能因为被多个 Card 引用而产生隐性重复计算。

例如：

100 万预算已经分配给模型 A，

模型 B 不能再次默认把这 100 万作为可用预算。

## D-035 Score 与 Budget 的复用规则不同

这是系统的重要业务原则：

Score 可以复用
Budget 默认不能重复占用

原因：

Score 是一种单位参数；

Budget 是一个有限资源池。

## D-036 Budget 可以被层级拆分

例如：

科室预算 100 万

↓

A 项目 40 万
B 项目 30 万
C 项目 20 万
剩余 10 万

预算拆分可以继续向下进行。

## D-037 Budget 可以出现超支

预算不是必须被限制在 0%～100%。

如果计算结果超过可用预算，系统必须能够表达：

超支 / 爆表。

例如：

可用预算 100 万；

实际占用 110 万；

则剩余预算为：

-10 万

而不是强制显示为 0。

## D-038 Budget Blood Bar 的百分比允许超过 100%

Budget Blood Bar 可以：

小于 0%；
0%；
100%；
大于 100%。

它不是普通进度条。

它表达的是：

当前资源相对于某个预算基准的占用情况。

## D-039 Budget Blood Bar 的分母必须有业务上下文

不同场景下的 100% 可能代表不同预算口径。

例如：

测量阶段可能包括：

原始绩效；
夜班费；
其他追加预算；
调整预算。

而计算/比较阶段可能只比较：

原始绩效；
夜班费。

因此 Blood Bar 的分母不能硬编码为固定意义。

## D-040 预算剩余可以继续流转

预算剩余可以：

留在当前 Card；
进入下一级预算模型；
锁定；
作为剩余预算保留。

不要求所有预算必须被分完。

## D-041 父级 Budget 应反映子级预算状态

如果：

A Budget

↓

B Budget
C Budget

其中：

B 超支 10 万；

C 剩余 20 万；

则父级应该能够表达：

子级结构整体仍然剩余 10 万。

父级状态不能简单地只看某一个子 Card。

## D-042 “结构性失衡”与“普通剩余”应区别表达

例如：

用户主动保留 10 万未分配；
子预算之间出现 10 万净剩余；

二者业务意义不同。

UI 后续应保留区别表达的能力。

# 11. Measurement
## D-043 Measurement Model 是可执行业务模型

测量方案不是静态配置表。

它是：

可以执行并产生测量结果的业务模型。

修改测量方案会改变模型。

运行模型后产生：

Measurement Result。

## D-044 测量存在正向和反向两种方向

系统允许至少两种合法测量方式。

正向
Budget
÷
Measurement Workload
=
Unit Score

然后：

Unit Score
×
Calculation Workload
=
Performance
反向
Unit Score
×
Measurement Workload
=
Budget Occupied

然后检查：

Total Budget
-
Occupied Budget
=
Remaining Budget

两种方式都是合法的业务测量方式。

# 12. Actual Score
## D-045 测量得到的 Score 不一定等于最终执行 Score

测量阶段得到的积分可以作为：

建议/基础积分。

之后可以进行人工调整。

最终用于计算的可以是：

Actual Score。

因此系统需要能够区分：

测量积分；
调整后的实际积分。

## D-046 实际积分调整不是 Workload 本身发生变化

例如：

测量得到：

手术 = 10 分

人工调整为：

手术 = 12 分

这里发生的是：

Score 调整。

而不是：

Workload 改变。

两者必须在数据模型上保持区分。

# 13. Disease Weight
## D-047 病种权重本质上也是 Workload/Score 模型中的数据

病种权重不是孤立的特殊功能。

例如：

出院病例

↓

提取 ICD 前四位

↓

计算病种平均费用

↓

计算医院总体平均费用

↓

得到病种权重

↓

病例获得对应权重

↓

累计病种权重

↓

预算 ÷ 总病种权重

↓

单位病种权重积分。

因此病种权重应能够纳入通用 Workload / Score / Measurement 体系。

## D-048 病种权重依赖测量周期

病种权重计算使用的：

病种平均费用；
医院总体平均费用；
药品/材料扣除规则；

均可能随测量周期变化。

因此：

病种权重必须绑定测量周期/版本。

# 14. Card Group / Deck
## D-049 Card Group 独立存在

V1 至少存在：

Unit Card Group
Workload Card Group
Budget Card Group

三个 Card Group 可以独立出现。

## D-050 Card Group 的出现取决于数据对象是否准备完成

项目开始时可能只有：

Unit Card Group。

当 Workload 数据准备完成后：

Workload Card Group 才出现。

Budget 同理。

因此不能假设项目开始时三个 Card Group 一定全部存在。

## D-051 Deck 是卡片选择区，不是 Canvas

Deck/Hand 用于：

浏览、选择、拖拽可用 Card。

Canvas 用于：

构建和探索业务模型。

二者职责不同。

## D-052 点击 Deck Card 不自动改变 Canvas Focus

点击 Deck 中的 Card：

可以：

展开该 Card 的子卡；
调整 Deck 显示；
显示推荐；

但不应自动改变 Canvas 当前 Focus。

## D-053 从 Deck 拖到 Canvas 才创建 Canvas Card

从 Deck 拖拽 Card：

拖到有效 Slot

建立对应业务关系。

拖到空白 Canvas

创建一个没有关系的新 Card。

拖到无效位置

静默取消操作。

不弹出错误对话框。

不需要用户手动“放回卡盒”。

# 15. Canvas
## D-054 Canvas 是模型构建和探索空间

Canvas 不是普通表格。

它主要用于：

查看 Card；
建立关系；
展开结构；
选择 Focus；
查看模型；
进行视觉分析。

## D-055 Canvas 不要求所有关系线都永久显示

Relation Line 是辅助理解工具。

当关系非常复杂时，不能让关系线淹没 Card。

系统应允许后续采用：

Focus；
局部关系；
层级展开；
过滤；
多层显示；

等方式控制视觉复杂度。

## D-056 Slot 展开默认只展开有限层级

默认展开深度原则上为：

两层。

避免一次展开整个模型导致 Canvas 失控。

## D-057 Unit 展开不自动展开 Workload/Budget

点击 Unit Slot 展开 Unit 结构时：

默认只展开 Unit 相关结构。

Workload / Budget 不自动全部展开。

后续可以通过 Canvas Layer 控制增加显示层级。

# 16. Recommendation
## D-058 Recommendation 是建议，不是 Relation

系统推荐某个 Card：

并不代表该 Card 已经与当前 Card 建立业务关系。

只有用户确认/拖拽后，才产生 Relation。

## D-059 Recommendation 可以根据上下文变化

例如：

当前 Focus：

王医生 UnitCard。

系统可以推荐：

王医生门诊工作量；
王医生住院工作量；
王医生预算；

等相关 Card。

## D-060 用户可以只选择部分推荐

如果系统推荐：

A、B、C、D

用户只选择 A：

系统不能自动推断：

用户一定忘了 B/C/D。

因为用户可能就是有意只建立 A。

## D-061 Recommendation 可以保留未选择项

用户部分选择后：

未选择的推荐项可以继续保持推荐状态。

用户也可以关闭 Recommendation。

之后重新打开 Recommendation 时：

仍可以高亮尚未建立关系的推荐项。

## D-062 Recommendation 不得强制创建模型

推荐系统只能：

建议。

不能：

未经用户确认自动建立正式业务关系。

# 17. Inspector
## D-063 Inspector 承担详细信息展示

Card 本身不应承载全部信息。

详细信息可以放在右侧 Inspector，例如：

Card 属性；
数据来源；
周期；
配置状态；
Warning；
Error；
计算定义；
Workload 来源字段；
Budget 状态；
Relation 信息。

## D-064 Inspector 应根据当前 Focus 提供上下文信息

例如：

当前 Focus 是：

王医生 UnitCard。

用户拖入王医生 WorkloadCard 时：

Inspector 应突出：

医生姓名；
医生 ID；
科室；
实际工作科室；
时间周期；

等与当前关系最相关的来源字段。

# 18. Card 状态
## D-065 Card 状态必须区分不同维度

以下状态概念不能长期混为一个互斥字段：

Interaction
focused
hovered
selected
dragging
ghost
collapsed
Configuration
unconfigured
partial
configured
Validation
warning
error

后续代码模型应分别表达这些状态。

## D-066 Configuration 状态应尽量视觉化

Card 不应大量显示：

“未配置”“部分配置”“已配置”等文字。

优先使用：

小型状态图标 / 状态视觉。

例如未来可以采用：

空瓶：未配置；
半瓶：部分配置；
满瓶：已配置；
发光/异常状态：Warning/Error。

具体视觉皮肤属于后续 Skin 系统。

# 19. Card Skin / Theme
## D-067 UI 分类视觉属于 Presentation Layer

Unit / Workload / Budget 的颜色、纹理、边框、装饰、图标等属于：

Presentation Layer。

业务模型不能依赖具体颜色。

## D-068 V1 预留 Skin 能力，但不实现 Marketplace

未来可以支持：

不同 Card Skin；
不同主题；
不同图标；
不同边框；
不同装饰；
人员照片；
医生/护士等业务身份图标。

例如未来可以：

Unit 使用金色主题；
Workload 使用蓝色主题；
Budget 使用绿色主题。

但 V1 不实现完整 Skin Marketplace。

# 20. 人员业务身份
## D-069 Business Identity 不等于 Person Card

一个人可以具有多个业务身份。

例如：

某人既是：

科室医生；
科主任；
急诊医生。

这些业务身份不能简单通过创建三个 Person Card 表达。

应通过：

Position；
Administrative Affiliation；
Actual Work；
Period；

等信息描述。

# 21. 用户自定义分组
## D-070 系统必须支持用户定义业务分组

用户可能需要定义：

所有护理人员

但这些人员可能分别来自：

门诊护士；
病区护士；
采血护士；
手术室护士；
供应室护士。

不能要求系统只能依据单一行政科室进行分组。

因此后续需要支持：

用户定义 Tag / Group / Filter Rule。

# 22. 数据规模
## D-071 前端不直接承载大量原始医院数据

大量原始病案、门诊、收费等数据不应全部加载到 Canvas 前端。

数据处理主要在：

Data / Backend Layer。

前端主要获取：

Card；
Summary；
Workload Result；
Aggregated Data；
Intermediate View Data。

## D-072 中间聚合数据需要成为未来的数据契约

未来后端应能够向 UI 提供例如：

某周期病种数量；
总病种权重；
某 Unit 下人员数量；
某 Workload 总量；
某 Budget 已使用金额；
某 Card 的配置完成度；

等中间结果。

这些数据属于未来 Data Contract。

V1 不要求实现完整的大数据计算引擎。

# 23. Measurement / Calculation / Comparison
## D-073 三个阶段必须概念分离

系统至少需要区分：

Measurement

建立单位积分/测量参数。

Calculation

使用积分与计算周期工作量产生实际计算结果。

Comparison

比较不同：

周期；
版本；
模型；
实际结果；

之间的差异。

## D-074 Calculation 可以使用 Measurement 产生的 Score

典型路径：

Measurement Period
        ↓
Measurement Model
        ↓
Unit Score
        ↓
Calculation Period
        ↓
Calculation Model
        ↓
Workload
        ↓
Score Result

## D-075 Comparison 不应修改 Measurement 本身

比较属于结果分析层。

比较不同方案、周期或结果时，不应直接修改原 Measurement Model。

# 24. Budget 与 Score 的核心原则
## D-076 “Budget 是蛋糕，Score 是单位价格”

业务模型中：

Budget 更接近：

一块有限的蛋糕。

Score 更接近：

单位工作量对应的价格/积分参数。

因此：

Budget 不能默认重复占用
Score 可以复用

这是 V1 的重要业务原则。

# 25. V1 不做

以下内容在 V1 明确不作为核心实现范围：

## D-077 不做真实大型数据库计算引擎

V1 不实现完整医院级海量数据实时计算平台。

## D-078 不做 AI 自动清洗

V1 数据清洗以：

用户操作；
明确规则；
表格化处理；

为主。

## D-079 不做完整 AI 自动建模

AI 可以作为未来能力。

V1 的业务模型建立必须保持：

用户可理解、可控制、可确认。

## D-080 不做多人实时协作

V1 不实现完整：

多用户同时编辑；
实时同步；
完整权限体系；
多人冲突解决。

## D-081 不做完整 Skin Marketplace

只预留架构能力。

## D-082 不做 Three.js 3D Canvas

V1 采用二维交互模型。

## D-083 React Flow 延后到 Canvas 阶段

React Flow 作为后续 Canvas 实现候选/技术方案。

Phase 1 不提前引入完整 Canvas 实现。

# 26. V1 当前技术方向
## D-084 当前前端技术方向

当前技术方向：

React
TypeScript
Vite
Zustand
Vitest
lucide-react

## D-085 Domain Model 优先于 UI

产品业务规则必须首先在 Domain Model 中表达。

UI 不得成为业务规则的唯一载体。

# 27. 尚未最终决定的问题

以下内容目前属于：

待决策 / 后续讨论。

Codex 不得自行将其当成最终业务规则。

## P-001 Workload Split 的完整 Relation 类型

需要最终确定：

workload_split

与：

structure

之间的完整职责。

## P-002 CoverageRule 的完整结构

当前仅形成基础概念：

actualValue
monthlyAverage
coveredValue
sourcePeriod
targetPeriod

完整规则尚待确定。

## P-003 BenchmarkDefinition

Benchmark 的具体业务用途、计算方式及 UI 表达尚未确定。

当前仅预留。

## P-004 行政归属的时间模型

需要进一步明确：

行政归属起止时间；
同时归属多个科室；
临时借调；
兼任；
主次归属；

等规则。

## P-005 Business Identity 的正式模型

业务身份需要进一步明确：

Person
↓
Business Identity
↓
Position / Department / Period

具体字段和 Relation 尚待确定。

## P-006 用户自定义 Tag / Group 的完整规则

需要进一步确定：

Tag 是静态还是动态；
Group 是否允许嵌套；
Group 是否保存 Filter Rule；
Group 是否参与计算；
Group 是否仅用于展示。

## P-007 Budget Reuse 的例外机制

V1 原则：

Budget 默认不可重复占用。

未来是否允许用户显式授权某些 Budget Reuse，尚待决定。

## P-008 Blood Bar 的完整视觉规则

业务原则已经确定：

可以超过 100%，也可以低于 0%。

但：

超支视觉；
结构失衡视觉；
锁定预算；
剩余预算；

的最终 UI 表现尚待确定。

## P-009 Card Collapse 规则

需要进一步确定：

Canvas 中最小 Card 尺寸；
Deck 中的折叠程度；
Zoom 不同级别下的 Card 表现；
是否允许多 Card Stack。

原则：

不允许 Card 最终退化为没有语义的图标。

## P-010 Children / References 的最终视觉语言

业务语义已经确定。

但最终视觉表现尚待确定：

不同线型；
不同箭头；
不同展开方向；
Focus 下的关系显示。

## P-011 Skin 系统

需要进一步确定：

Theme；
Skin；
Card Template；
Icon；
Decoration；

之间的正式技术关系。

## P-012 多人协作

后续需要进一步确定：

用户；
项目权限；
修改记录；
审计；
版本；
冲突处理。

# 28. 决策变更规则
## D-086 不允许通过代码偷偷改变业务决策

如果实现过程中发现：

当前代码结构无法满足某个业务规则。

不能直接修改业务规则。

应先提出：

问题
↓
影响
↓
候选方案
↓
用户确认
↓
更新 DECISIONS.md
↓
修改代码

## D-087 代码实现不是产品决策来源

如果：

代码

与：

DECISIONS.md

发生冲突，

原则上应认为：

代码需要修正。

不能因为现有代码已经实现，就反过来认为业务规则已经确定。

## D-088 PRODUCT_SPEC 与 DECISIONS 的职责不同

PRODUCT_SPEC.md：

描述产品应该做什么。

DECISIONS.md：

记录已经拍板的关键产品/业务决策。

如果后续两者出现矛盾，应先确认产品决策，再同步修改相关文档。

# 29. Codex 执行原则

Codex 在实施任何涉及产品行为的修改前，应优先检查：

AGENTS.md
PRODUCT_SPEC.md
DOMAIN_GLOSSARY.md
DECISIONS.md
CODEX_IMPLEMENTATION.md

其中：

AGENTS.md：工作规则；
PRODUCT_SPEC.md：产品要求；
DOMAIN_GLOSSARY.md：术语定义；
DECISIONS.md：已经拍板的业务规则；
CODEX_IMPLEMENTATION.md：当前阶段的施工计划。

# 30. 当前文档状态

版本：V1

本文件不是最终版本。

后续产品讨论中：

新确认的规则 → 增加 Decision；
已有规则被推翻 → 修改对应 Decision；
尚未确定的问题 → 放入 Pending；
已经不再适用的决策 → 标记 Deprecated，而不是直接删除历史意义。

最终目标不是让文档越来越长，而是让：

所有真正影响产品行为的重要决定，都有唯一、明确、可追溯的来源。