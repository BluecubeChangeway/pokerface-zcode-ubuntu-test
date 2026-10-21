# Q-09-A 类型层阶段收口记录

> **Close 类型：** 类型层审查已 Close（逐文件人工 PASS）；Q-09-A 整体尚未 Close。

---

## ✅ 已 PASS 文件（逐文件人工审查并确认）

| 文件 | 审查状态 | 备注 |
|------|----------|------|
| `src/domain/card/types.ts` | PASS | 与 Q-01~Q-08 决策一致，无回归 |
| `src/domain/workload/types.ts` | PASS | 与 Q-01~Q-08 决策一致，无回归 |
| `src/domain/workload/resolutionTypes.ts` | PASS | 修正后与 Q-09-A 决策一致，无回归 |

---

## 📋 当前阶段已确认的 Q-09-A 决策/不变量

### Resolution 核心类型不变量
1. **`ResolutionMatchType`** = `"exact" | "ancestor" | "descendant" | "none"`
   - 四值互斥，覆盖 Workload 与 Unit 的匹配关系方向

2. **`ResolutionRecommendationType`** = 
   - `"use_existing_result"` — 直接复用现有结果
   - `"use_existing_result_with_confirmation"` — 发现已有匹配结果，需用户确认
   - `"split_workload"` — 父级工作量可拆分出目标单元工作量
   - `"find_existing_workload"` — 子级工作量可汇总或存在父级工作量
   - `"aggregate_descendants"` — 汇总子工作量形成目标单元工作量
   - `"no_match"` — 无法建立合理匹配

3. **`MatchBasis.unitRelation`** = `"self" | "ancestor" | "descendant" | "none"`
   - 语义：**Workload 统计范围与目标 Unit 的关系方向**
   - `self`：Workload 统计范围 = 目标 Unit
   - `ancestor`：Workload 统计范围 ⊃ 目标 Unit（父级→子级）
   - `descendant`：Workload 统计范围 ⊂ 目标 Unit（子级→父级）
   - `none`：无法建立层级关系

4. **`MatchBasis.splitFeasibility`** 与 **`aggregationFeasibility`**
   - 仅表达“可行性判断依据”，不执行拆分/汇总
   - `aggregationFeasibility.partialAllowed` 表达“允许部分汇总（用户可选择子集）”

### Resolution 作为“推荐层”而非“自动执行层”
- **Resolution ≠ Relation 创建**：推荐不自动创建 Relation，需用户确认后由外层创建
- **Resolution ≠ 自动拆分/汇总**：`split_workload` / `aggregate_descendants` 仅推荐，不执行
- **Unit hierarchy ≠ Workload hierarchy**：`ResolutionContext` 同时持有 `unitHierarchy` 与 `workloadHierarchy`，两者互不等同，不互相替代

### ResolutionContext 仅使用正式领域类型（无内联匿名类型）
- `workloadCard: WorkloadCard` —— 不含 `definitionId`（WorkloadCard 已移除，Q-07）
- `targetUnit: UnitCard`
- `existingResults: WorkloadResult[]`
- `snapshots: CalculationSnapshot[]`
- `workloadDefinitionMap: Map<string, WorkloadDefinition>`
- `workloadExecutionMap: Map<string, WorkloadExecution>`
- `unitHierarchy: Map<string, string[]>`
- `workloadHierarchy: Map<string, string[]>`

### 无重复类型定义
- `ResolutionMatchType`、`ResolutionRecommendationType`、`MatchBasis`、`ResolutionRecommendation`、`ResolutionResult`、`ResolutionContext` 各仅定义一次

---

## 📂 尚未审查的 Q-09-A 文件

| 文件 | 预期关注点 |
|------|------------|
| `src/domain/recommendation/types.ts` | Recommendation 与 ResolutionRecommendation 的关系/去重 |
| `src/domain/relation/types.ts` | Relation 与 Resolution 推荐的边界 |
| `src/domain/workload/splitService.ts` | WorkloadSplit 与 ResolutionRecommendation.splitPlan 的对应 |
| `src/domain/workload/resultService.ts` | WorkloadResult 与 Resolution 推荐的对应 |
| `src/mock/mockRecommendations.ts` | Mock 推荐数据是否表达真实业务规则 |
| `src/mock/mockWorkloadChain.ts` | Mock 工作量链是否覆盖 Q-09-A 场景 |

---

## 🔍 Q-01～Q-08 回归检查结果

| 检查项 | 结果 | 说明 |
|--------|------|------|
| Card 类型体系 | 无回归 | `Card`、`UnitCard`、`WorkloadCard`、`BudgetCard` 符合 Q-01~Q-08 |
| CardSlot 无 cardIds | 无回归 | `CardSlot` 仅表达业务语义与 UI 配置，不保存关系事实 |
| CardState 无 UI 交互态 | 无回归 | `Card` 仅含领域核心状态 |
| WorkloadCard 无 definitionId | 无回归 | 已移除，`workloadResultId` 为唯一引用 |
| WorkloadCard.value 为展示缓存 | 无回归 | 显式标注，权威值来自 WorkloadResult |
| BudgetCard.amount 为唯一基础事实 | 无回归 | 派生值由服务层计算 |
| Period 独立领域概念 | 无回归 | `Period` 独立类型，Measurement/Calculation/Actual/Coverage 区分保留 |
| 行政归属 ≠ 实际工作 | 无回归 | `UnitCard.attributes.administrativeParentId` 仅表达行政归属 |
| Relation 为一等领域对象 | 无回归 | Relation 独立类型，非 `parentId`/`children[]` 等内联字段 |
| Workload 分解非普通 parent-child | 无回归 | `WorkloadSplit` 表达拆分，`workloadHierarchy` 与 `unitHierarchy` 分离 |
| Budget 默认不可重复使用 | 无回归 | 无变更 |
| Score 与 Budget 概念分离 | 无回归 | 无变更 |
| Measurement/Calculation/Comparison 三阶段 | 无回归 | 无变更 |

**结论：无 Q-01～Q-08 回归。**

---

## 📊 当前工作区状态

```
On branch main
Changes not staged for commit:
  modified:   src/domain/workload/resolutionTypes.ts

# typecheck: PASS
# tests: 67/67 PASS
# build: PASS
```

---

## 🎯 建议的下一文件

**`src/domain/recommendation/types.ts`**

理由：Resolution 推荐层与 Recommendation 领域对象的关系需明确边界，避免语义重叠。

---

## ✅ Close 声明

> **Q-09-A 类型层审查已 Close；Q-09-A 整体尚未 Close。**

- 已完成：3 个核心类型文件的逐文件人工审查与修正
- 未完成：其余 Q-09-A 涉及文件的逐文件审查、Resolution 算法实现、集成测试
- 下一步：按建议顺序逐文件推进审查