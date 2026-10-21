# AGENTS.md

## 1. 项目身份

本项目是一个面向医院绩效分析、绩效测算、工作量核算和预算分配的桌面/网页应用。

产品的核心交互不是传统的表格管理系统，而是：

> 数据准备 → 数据对象 → 卡片 → 卡片关系 → 测算模型 → 核算/比较

其中，卡片与无限画布构成主要的模型构建和探索界面。

本项目具有明确的领域模型。不要把它当作普通的 CRUD、表格管理或流程管理项目进行开发。

---

## 2. 文档优先级

开发前必须阅读以下文件：

1. `AGENTS.md`
2. `PRODUCT_SPEC.md`
3. `DECISIONS.md`（如果存在）
4. `CODEX_IMPLEMENTATION.md`

文档职责：

### `AGENTS.md`

规定 Codex 的工作方式、架构原则、开发纪律和不可违反的工程规则。

### `PRODUCT_SPEC.md`

描述产品目标、产品行为、业务场景和总体设计。

### `DECISIONS.md`

记录已经确认的产品和架构决策。

如果 `DECISIONS.md` 与个人推测、常见软件设计模式或 Codex 自己的偏好冲突，以 `DECISIONS.md` 为准。

### `CODEX_IMPLEMENTATION.md`

描述当前开发阶段、实施范围和工程任务。

---

## 3. 核心原则：不得自行发明业务规则

本项目不是一个可以由开发者自行决定业务含义的普通项目。

如果代码实现过程中遇到以下情况：

- 产品规则没有定义；
- 两份文档存在冲突；
- 现有代码与产品规则冲突；
- 某种实现方式会改变已有业务语义；
- 无法确定一个字段、关系或状态究竟代表什么；

不得自行猜测并固化为业务规则。

应当：

1. 检查 `DECISIONS.md`；
2. 检查 `PRODUCT_SPEC.md`；
3. 检查现有 domain model；
4. 如果仍然无法确定，将其列为 `Open Question` 或 `Known Gap`；
5. 在实施报告中明确指出。

允许进行纯技术层面的合理选择，但不得借技术实现之名改变产品语义。

---

## 4. 领域模型优先于 UI

所有重要业务概念必须首先在 domain model 中表达，然后由 service/store/UI 使用。

不要为了方便 UI 开发而把业务规则直接写进：

- React component
- CSS
- Zustand UI state
- drag/drop handler
- mock data
- 页面路由

尤其不要通过 UI 行为隐式定义业务关系。

例如：

错误方向：

```text
拖到某张卡下面
→ React component 直接修改 parentId

正确方向：

用户产生交互
→ application/service 层解释操作
→ 创建或修改 Relation
→ domain/store 更新
→ UI 根据 domain state 渲染

## 5. 卡片模型

v1 的核心卡片类型只有：

UnitCard
WorkloadCard
BudgetCard

三者都属于 Card。

不要在没有产品决策的情况下继续增加新的核心 CardType。

UnitCard

UnitCard 用于表示：

人员
科室
团队
业务单元
其他自定义单位

人员不是独立的 CardType。

同一个人员原则上应当是一个 UnitCard，而不是因为其工作科室、时间或业务不同就复制出多张人员卡。

人员跨部门、跨时间、跨业务的情况，应通过属性、期间、关系及业务身份等模型表达。

## 6. Card 与业务状态必须区分

Card 的：

交互状态
配置状态
校验/异常状态

属于不同维度。

不要把所有状态压缩为一个互斥的枚举，如果这样会导致状态无法组合。

例如一个 Card 理论上可以同时：

dragging
partial
warning

因此不得为了实现方便重新把这些概念混成单一状态。

## 7. Relation 是一等领域对象

卡片之间的关系必须由独立的 Relation 表达。

不要依赖：

parentId
children[]
references[]

作为关系的唯一来源。

Relation 应能够表达：

来源对象
目标对象
关系类型
必要的关系元数据

关系查询至少应区分：

getChildren(cardId)
getReferences(cardId)

其中：

Children

表示当前卡片向下的结构性子项/后续对象。

References

表示其他对象引用当前对象。

两者语义不能混用。

## 8. 卡片槽位

v1 卡片具有：

Unit slot
Workload slot
Budget slot

槽位本身是通用的 CardSlot 概念。

槽位可以：

enabled / disabled
locked / unlocked
expanded / collapsed

槽位是否可用属于卡片/产品配置，而不是必须为所有 Card 固定开放。

原则上：

Unit slot     → UnitCard
Workload slot → WorkloadCard
Budget slot   → BudgetCard

除非 DECISIONS.md 明确允许其他关系。

## 9. Workload 模型

Workload 不是简单的一个数字。

Workload 可以具有：

来源数据对象
测量期间
定义
条件
维度
计算方法
结果值
分解关系
聚合关系
覆盖/期间规则

Workload 可以：

聚合
↓
分解
↓
再次聚合

例如：

全院门诊人次
    ↓
内科门诊人次
    ↓
王医生门诊人次

不要把 Workload 简化为：

{
  value: number
}

就认为已经表达完整业务。

## 10. Workload 分解不是普通 parent-child

工作量的：

聚合
分解
覆盖
分配
引用

是不同语义。

不要看到两个 WorkloadCard 就默认使用普通 structure relation。

如果现有代码暂时使用通用 relation，是可以作为阶段性实现存在的，但必须保留进一步细化 RelationType 的空间。

## 11. Budget 模型

Budget 表示有限的预算资源。

预算具有：

总额
使用
剩余
超支
锁定剩余
结构性不平衡

预算是资源，不应被无意间复制。

核心原则：

Budget 默认不可重复使用。

例如同一笔预算被两个模型分别完整使用，会造成隐性重复计算。

如果未来允许预算复用，必须成为明确的业务规则，而不是默认行为。

## 12. Score 模型

Score 与 Budget 不是同一个概念。

基本业务逻辑：

Budget ÷ Measurement Workload
        ↓
Unit Score

然后：

Unit Score × Calculation Workload
        ↓
Score Result

Unit Score 可以被复用。

Budget 默认不能因此被再次使用。

不要将：

score
score result
budget
budget usage

混为一个概念。

## 13. Measurement / Calculation / Comparison

项目中至少存在三个不同阶段：

Measurement

通过历史期间的数据和预算，测算单位工作量对应的 Score。

Calculation

使用已有 Score 和新的工作量计算绩效结果。

Comparison

对不同期间、不同模型、不同 Score 版本或实际执行结果进行比较。

不要因为三个阶段最终都产生数字，就把它们合并成一个计算函数。

## 14. Period

Period 是独立的领域概念。

必须区分：

Measurement Period
Calculation Period
Actual Period
Coverage Period

不要默认所有期间永远相同。

例如：

Measurement Period
2025-01 ～ 2025-12

Calculation Period
2026-03

属于正常业务情况。

人员或业务只覆盖目标期间的一部分时，还可能涉及：

actual period
coverage period
monthly average
scaling

不得在 UI 层自行推导这些规则。

## 15. 行政归属与实际工作必须区分

这是本项目非常重要的业务规则。

人员可能：

在一个行政科室任职；
实际在多个科室工作；
在不同月份发生科室变化；
同时存在多个业务身份。

因此：

Measurement / model-building

更关注：

实际发生了什么工作。

Calculation / comparison

某些统计口径更关注：

实际行政归属是什么。

不能简单写成：

person.department

然后让所有统计逻辑都使用它。

行政归属、实际工作、业务身份、期间必须保持可区分。

## 16. 数据准备与模型构建是两个不同层次
数据准备

主要解决：

上传
↓
验证
↓
清洗
↓
映射
↓
字段选择
↓
条件
↓
维度
↓
计算
↓
数据对象

这个阶段可以具有较强的表格/数据工程风格。

模型构建

主要解决：

Data Object
↓
Card
↓
Relation
↓
Measurement Model
↓
Calculation / Comparison

不要为了让数据准备页面“看起来像卡牌游戏”而牺牲数据处理的清晰度。

同样，不要把无限画布的交互强行塞进数据清洗逻辑。

## 17. 大数据边界

v1 不要求前端直接承载医院完整原始数据。

原则：

Raw Data
↓
Backend / Data Processing
↓
Staged / Intermediate Data
↓
Relevant Aggregates / Data Objects
↓
Frontend Cards

前端 Card 不应该为了展示一个数字而加载完整病案数据。

未来需要支持中间聚合数据，例如：

某期间疾病数量
总疾病权重
某单位人数
某人员工作月份
某维度聚合值

这些应逐渐形成明确的数据契约。

## 18. UI 不是业务逻辑

以下内容属于表现层：

卡片颜色
卡片皮肤
图案
图标
动画
发光
堆叠效果
卡牌展开效果
视觉主题
游戏化表现

不要让这些表现层决定业务语义。

例如：

蓝色 ≠ Workload 的业务本质

蓝色只是当前 Skin 的表现方式。

Card Type 才是领域语义。

## 19. 推荐系统

推荐不是关系。

系统可以：

推荐某张 Card
↓
高亮
↓
用户拖入
↓
用户确认
↓
才形成 Relation

因此：

Recommended ≠ Related

不要因为某 Card 被推荐，就自动创建 Relation。

用户只选择部分推荐项时，不得假设用户遗漏了其他项目。

系统可以继续提示尚未选择的推荐项，但不能偷偷补齐关系。

## 20. Drag & Drop

拖拽行为必须区分：

拖到有效 Slot

创建对应关系/插入操作。

拖到空白 Canvas

创建独立 Card。

拖到无效目标

静默取消。

不得因为拖拽无效而：

弹窗
报错
强制退回 Deck
改变已有关系

## 21. Canvas 与 Deck

Deck/Hand 和 Canvas 是不同交互层。

Deck

用于：

Card 浏览
Card Group 切换
推荐
选择
拖拽来源

Deck 可以使用：

stack
compact card
count

等形式。

Canvas

用于：

模型构建
关系探索
卡片布局
聚焦
展开
关系可视化

点击 Deck 中的 Card：

不应自动改变 Canvas focus。

只有明确的 Canvas 操作才改变 Canvas focus。

## 22. Card Group

v1 核心 Card Group：

Unit
Workload
Budget

不同 Card Group 可以独立准备。

例如项目刚创建时可能只有：

Unit Deck

当 Workload 数据对象准备完成后，Workload Card Group 才出现。

不要假设三个 Card Group 在项目创建时永远同时存在。

## 23. Mock 数据

Mock 数据不是随意填数字。

Mock 应用于表达和验证真实领域规则。

如果修改 domain model：

必须检查：

mock cards
mock relations
mock workloads
mock budgets
mock scores
tests

不得为了让测试通过而删除能表达复杂业务的 Mock 场景。

## 24. 测试纪律

任何 Domain Model 的重要修改都必须检查相关测试。

至少运行：

npm test
npm run typecheck
npm run build

如果项目中存在 lint，则同时运行 lint。

不能只看到页面能运行就认为修改完成。

## 25. 修改代码前的检查顺序

对于涉及领域模型的任务：

1. 阅读文档
2. 检查相关 domain types
3. 检查 relation/service
4. 检查 mock
5. 检查 tests
6. 判断影响范围
7. 制定修改方案
8. 实施
9. 测试
10. typecheck
11. build

不要只修改用户指出的单个文件，然后忽略引用该类型的其他文件。

## 26. 不要过度工程化

本项目需要良好的领域建模，但 v1 不应提前实现：

完整数据库系统
多用户协作
完整权限体系
AI 自动清洗
3D Canvas
Marketplace
完整审计系统
大规模实时计算平台

如果未来功能需要预留扩展点，可以保留接口/类型，但不要为了“未来可能需要”实现完整系统。

## 27. 当前技术方向

当前技术栈：

React
TypeScript
Vite
Zustand
Vitest
lucide-react

React Flow 预留用于后续 Infinite Canvas 阶段。

v1 不使用 Three.js。

除非产品/工程决策发生变化，不要自行替换核心技术栈。

## 28. Phase Boundary

必须尊重当前开发阶段。

如果当前任务属于 Phase 1：

不要因为某个未来功能看起来容易，就顺手实现 Phase 2/3。

特别是：

Phase 1
Domain foundation / services / stores / tests

Phase 2
Project entry / data preparation / solution-building shell

Phase 3
Infinite canvas / advanced card interaction / relationship visualization

实际阶段以 CODEX_IMPLEMENTATION.md 为准。

## 29. 发现问题时优先报告，而不是隐藏

如果发现：

当前实现与产品规则冲突；
Domain Model 存在结构性问题；
Mock 数据表达错误业务；
测试覆盖不足；
当前阶段留下了临时实现；
某个接口未来可能无法支持已经确认的业务规则；

不要通过临时 workaround 隐藏问题。

应当明确报告：

Issue
Impact
Current temporary solution
Recommended follow-up

如果问题涉及产品规则，标记为：

Open Question

而不是擅自修改业务定义。

## 30. 决策变更协议

任何已经记录在 DECISIONS.md 中的业务或架构决策，不得在普通开发任务中静默修改。

如果新的需求确实要求改变既有决策：

提出冲突
↓
说明影响
↓
修改 DECISIONS.md
↓
再修改代码

不要：

先改代码
↓
以后再解释为什么这么设计

## 31. 每次开发任务的最终报告

完成任务后，用简洁格式报告：

Changed

修改/新增的主要文件。

Implemented

本次实际完成的功能。

Domain Impact

是否修改了 Domain Model、Relation、Period、Budget、Score 等核心模型。

Tests
npm test
npm run typecheck
npm run build

分别给出结果。

Known Gaps

仍存在的已知问题。

Decisions Needed

如果存在产品规则尚未确定，明确列出。

不要用大量无关的开发过程描述替代以上信息。

## 32. 最重要的原则

本项目的目标不是：

尽快写出一个能运行的页面。

而是：

在已经确定的医院绩效业务模型上，逐步构建一个稳定、可解释、可扩展的数据分析与绩效测算系统。

因此：

业务语义优先于代码便利。

Domain Model 优先于 UI。

明确决策优先于 AI 猜测。

可验证的数据关系优先于临时字段。

阶段性实现可以简化，但不得悄悄改变最终业务语义。

