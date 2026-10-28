import type { Recommendation, UserDecisionAction } from "../domain/recommendation/types";
import type { ResolutionRecommendation } from "../domain/workload/resolutionTypes";
import type { DataService } from "../services/DataService";
import type { ActionExecutorContext } from "../services/actionExecutor";

/**
 * Recommendation → UserDecisionAction 的最小映射 + UI 操作 context 构造器
 *（Q-09-C Confirm/Cancel/Dismiss UI 第一刀）
 *
 * 职责仅限"UI 层 → 既有 Runtime 契约"的参数转接：
 * - mapping 是 payload.type → confirm action 的既有一一对应（见下方逐项注释），
 *   不是新业务规则；
 * - context 构造为 ActionExecutorContext 的最小填充（数据全部来自 DataService），
 *   与 resolutionTrigger.buildFromDataService 同源，不发明第二套事实来源；
 * - 本模块不执行 Action、不产生 Domain Fact。
 */

/**
 * payload.type → confirm action 的映射依据（既定 contract，一一对应）：
 * - use_existing_result / use_existing_result_with_confirmation → confirm_use_existing
 *   （executor 的 executeUseExistingResult 同时承接两者，见 actionExecutor.ts:203 注释）
 * - find_existing_workload → confirm_use_existing_parent（executeFindExistingWorkload）
 * - split_workload → confirm_split
 * - aggregate_descendants → 当前返回 undefined：confirm_aggregate 是确定性
 *   capability boundary（executor 恒 success=false、不产生 Fact、不会 accepted），
 *   UI 不显示点击后必然失败的 Confirm 按钮。这是对既有事实的 UI 层正确反映，
 *   不是新业务规则；capability 落地后随 executor 现状解除。
 * - no_match → 无可执行 confirm action（无对应 UserDecisionAction；UI 不显示假按钮）
 */
export function confirmActionFor(
  recommendation: Recommendation
): UserDecisionAction | undefined {
  // W4：单元拆分推荐（kind="card"，payload.type="unit_split"）→ 确认按钮
  if (recommendation.kind === "card") {
    const cardPayload = recommendation.payload as { type?: string } | undefined;
    if (cardPayload?.type === "unit_split") return "confirm_unit_split";
    return undefined;
  }
  if (recommendation.kind !== "resolution") return undefined;
  const payload = recommendation.payload as Partial<ResolutionRecommendation> | undefined;
  switch (payload?.type) {
    case "use_existing_result":
    case "use_existing_result_with_confirmation":
      return "confirm_use_existing";
    case "find_existing_workload":
      return "confirm_use_existing_parent";
    case "split_workload":
      return "confirm_split";
    default:
      return undefined;
  }
}

/**
 * UI 操作所需的 ActionExecutorContext（最小填充）：
 * 全部数据来自 DataService（与 Canvas/Deck 同源），store 内 Recommendation 映射为
 * executor 所需的 recommendations Map（executeUserDecision 按 id lookup）。
 * 未填充 capability 相关可选字段——confirm_use_existing / confirm_split 不需要它们；
 * confirm_aggregate 为确定性能力不足（恒 success=false），不依赖 context 细节。
 */
export async function buildActionContext(
  dataService: DataService,
  storeRecommendations: Recommendation[],
  workloadCard?: { id: string; type: string; name: string; workloadResultId?: string; businessStatus?: "active" | "revoked" }
): Promise<ActionExecutorContext> {
  const [relations, cards, results, splits, provenances] = await Promise.all([
    dataService.getRelations(),
    dataService.getCards(),
    dataService.getWorkloadResults(),
    dataService.getWorkloadSplits(),
    dataService.getSplitProvenances(),
  ]);
  const recommendations = new Map(
    storeRecommendations.map((recommendation) => [recommendation.id, recommendation])
  );
  return {
    existingRelations: [...relations],
    existingCards: new Map(
      cards.map((c: any) => [
        c.id,
        {
          id: c.id,
          type: c.type,
          name: c.name,
          workloadResultId: (c as any).workloadResultId,
          // D-154 确认安全检查（2026-10-10）：业务状态透传给 executor——
          // revoked 卡在业务世界中等同不存在，由 executor 在目标/主体校验处拒绝确认
          businessStatus: (c as any).businessStatus,
        },
      ])
    ),
    workloadCard,
    existingWorkloadResults: new Map(
      results.map((r: any) => [r.id, r])
    ),
    existingWorkloadSplits: new Map(
      splits.map((sp: any) => [sp.id, sp])
    ),
    // R3 拆分溯源（查询投影）：confirm_split 复用匹配 + retry 身份校验的数据来源
    existingSplitProvenances: [...provenances],
    recommendations,
    endpointKinds: new Map(cards.map((c: any) => [c.id, c.type])),
    dataService,
  };
}

/** 解析 UI 操作涉及的源 WorkloadCard（从推荐 relatedEntityIds 首位取得；仅参数转接）。
 *  businessStatus 原样透传（executor 对 revoked 主体卡执行确认安全检查，D-154）。 */
export function sourceWorkloadCardFrom(
  recommendation: Recommendation,
  cards: Array<{ id: string; type: string; name: string; workloadResultId?: string; businessStatus?: "active" | "revoked" }>
): { id: string; type: string; name: string; workloadResultId?: string; businessStatus?: "active" | "revoked" } | undefined {
  const workloadCardId = recommendation.relatedEntityIds?.[0];
  if (!workloadCardId) return undefined;
  return cards.find((c) => c.id === workloadCardId && c.type === "workload");
}

/** 解析源 UnitCard（从推荐 relatedEntityIds 次位取得；用于 confirm_use_existing 的 sourceUnitId） */
export function sourceUnitIdFrom(recommendation: Recommendation): string | undefined {
  return recommendation.relatedEntityIds?.[1];
}
