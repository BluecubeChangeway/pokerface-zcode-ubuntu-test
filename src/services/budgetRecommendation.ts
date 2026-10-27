import type { DataService } from "./DataService";
import type { BudgetCard } from "../domain/card/types";
import { getBudgetSummary } from "../domain/budget/budgetService";
import { recommendationStore } from "../stores/recommendationStore";
import type { Recommendation } from "../domain/recommendation/types";
import { isBusinessRevoked } from "../domain/workload/revocationService";

/**
 * A-007 预算域解析/推荐（用户 2026-10-26 裁定 + 设计报告批复，2026-10-27 实施）
 *
 * 三种推荐类型（全部为 Q-05 封板派生状态的展示接入——不发明新语义）：
 * 1. allocation-status：预算分配状态（已分配/未分配/已耗尽）——getBudgetSummary 投影；
 * 2. over-allocation：同一单元的多笔预算合计超限提示（occupied > total → 超支不截断，
 *    D-024/overflow 既有语义的推荐展示）；
 * 3. allocated-but-idle：已分配未占用提示（D-025 既有语义展示）。
 *
 * 关键边界：
 * - **信息展示型推荐，无 confirm 执行链**：推荐只呈现状态，确认后不执行任何预算动作
 *   （与工作量推荐不同——工作量有 confirm_split 等操作；预算推荐是"看"不是"做"）；
 * - 推荐注册进 recommendationStore（与工作量推荐同面板，kind = "budget_status"——
 *   推荐面板天然按 kind 显示，无需分组改动）；
 * - 稳定 ID：rec-budget-<budgetCardId>-<unitCardId>（同 D-142 精神：重复触发不重复注册）；
 * - 反馈联动（用户裁定的对齐项）：预算关系解除/移动时，旧配对的预算推荐按
 *   D-151 同款失效——由 dropTrigger 调用方在解除/移动后触发重新分析。
 */

/** 生成预算状态的当前推荐（budget_assign 建立后由 dropTrigger 调用） */
export async function analyzeBudgetAndRecommend(
  dataService: DataService,
  budgetCardId: string,
  unitCardId: string
): Promise<Recommendation | undefined> {
  const [cards, relations] = await Promise.all([
    dataService.getCards(),
    dataService.getRelations(),
  ]);
  const budget = cards.find((c): c is BudgetCard => c.id === budgetCardId && c.type === "budget");
  if (!budget || isBusinessRevoked(budget)) {
    return undefined;
  }
  const unit = cards.find((c) => c.id === unitCardId && c.type === "unit");
  if (!unit || isBusinessRevoked(unit)) {
    return undefined;
  }

  const summary = getBudgetSummary(budget, relations);
  const recommendationId = `rec-budget-${budgetCardId}-${unitCardId}`;

  // 三种状态的判定（Q-05 封板派生规则，不发明新语义）：
  let reason: string;
  if (summary.occupied > summary.total) {
    // over-allocation：超支不截断（D-024 overflow 语义）
    reason = `预算超限：已占用 ${summary.occupied.toLocaleString()} 超过总额 ${summary.total.toLocaleString()}（超支 ${(summary.occupied - summary.total).toLocaleString()}，不截断）`;
  } else if (summary.allocatedButIdle > 0) {
    // allocated-but-idle：已分配未占用（D-025 语义）
    reason = `预算已分配未占用：${summary.allocatedButIdle.toLocaleString()}（已分配 ${summary.allocated.toLocaleString()}，已占用 ${summary.occupied.toLocaleString()}）`;
  } else if (summary.unallocated > 0) {
    // allocation-status：未分配
    reason = `预算当前状态：总额 ${summary.total.toLocaleString()}，已分配 ${summary.allocated.toLocaleString()}，未分配 ${summary.unallocated.toLocaleString()}`;
  } else {
    // 全部分配且全部占用
    reason = `预算已全部分配并占用：总额 ${summary.total.toLocaleString()}（已分配 ${summary.allocated.toLocaleString()}，已占用 ${summary.occupied.toLocaleString()}）`;
  }

  const recommendation: Recommendation = {
    id: recommendationId,
    kind: "budget_status",
    payload: {
      budgetCardId,
      unitCardId,
      summary,
    },
    reason,
    status: "recommended",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    relatedEntityIds: [budgetCardId, unitCardId],
  };

  recommendationStore.getState().addRecommendation(recommendation);
  return recommendation;
}

/**
 * 预算推荐失效（D-151 预算镜像）：预算关系解除/移动后，旧配对的预算推荐移除。
 * 与工作量配对失效同款：仅 kind = "budget_status" 且 status = "recommended"，
 * 锚定为 (budgetCardId, fromUnitId)；accepted/ignored/dismissed 历史不动。
 */
export function invalidateBudgetFeedback(
  budgetCardId: string,
  fromUnitId: string
): string[] {
  const staleIds: string[] = [];
  for (const recommendation of recommendationStore.getState().recommendations) {
    if (recommendation.kind !== "budget_status") continue;
    if (recommendation.status !== "recommended") continue;
    if (
      recommendation.relatedEntityIds?.[0] === budgetCardId &&
      recommendation.relatedEntityIds?.[1] === fromUnitId
    ) {
      staleIds.push(recommendation.id);
    }
  }
  const store = recommendationStore.getState();
  for (const id of staleIds) {
    store.removeRecommendation(id);
  }
  return staleIds;
}
