import type { DataService } from "./DataService";
import { defaultResolutionContextBuilder } from "../domain/workload/resolutionContextBuilder";
import { resolveWorkloadToUnit } from "../domain/workload/resolutionService";
import type { ResolutionResult } from "../domain/workload/resolutionTypes";
import { toMatchingBasisSnapshot } from "../domain/workload/matchingBasisSnapshot";
import { recommendationStore } from "../stores/recommendationStore";
import type { Recommendation } from "../domain/recommendation/types";

/**
 * Production Resolution Trigger —— 唯一正式生产触发入口（Q-09-C Interaction Runtime）
 *
 * 职责（严格限定为编排，不包含任何业务规则）：
 *   WorkloadCard / Unit 用户操作
 *       ↓
 *   resolveWorkloadToUnitAndRecommend(...)
 *       ↓
 *   ResolutionContextBuilder.buildFromDataService(...)   ← D-139：生产唯一构建入口
 *       ↓
 *   ResolutionService.resolveWorkloadToUnit(...)          ← D-140：只分析，不产生 Fact
 *       ↓
 *   Recommendation(kind="resolution", status="recommended")
 *       ↓
 *   recommendationStore.addRecommendation(...)
 *       ↓
 *   等待用户确认（本函数到此为止）
 *
 * 边界（禁止事项）：
 * - 不创建 Relation / WorkloadResult / WorkloadCard / WorkloadSplit
 * - 不调用 ActionExecutor / ActionSubmissionService
 * - 不直接向 DataService 写入任何数据
 * - 不将 Recommendation 标记 accepted（accepted 只能由 executeDecision 在
 *   ActionExecutor 成功且持久化成功后产生）
 * - 即使 ResolutionResult 中发现 existingResult，也只产生 Recommendation；
 *   本函数不建立任何正式事实——workload_assign 由 Drop 成功路径
 *   （D-150：dropTrigger → ActionSubmissionService.submitDropAssignRelation）
 *   或用户确认路径（ActionExecutor）建立，均不在本函数内
 *
 * sourceDataObjects / mappingEvidences 当前无正式生产来源，
 * ResolutionService 因此可能在 split 场景返回 cannot_determine ——
 * 本函数原样尊重该语义，不自行推断 split feasibility。
 */

export interface ResolutionTriggerResult {
  /** 注册进 recommendationStore 的正式推荐容器 */
  recommendation: Recommendation;
  /** ResolutionService 完整分析结果，保留给即时调用方（UI 展示），不写入 store */
  resolutionResult: ResolutionResult;
}

/**
 * 稳定推荐 ID：同卡 + 同目标 → 同 ID；不同组合 → 不同 ID。
 * 不使用随机 UUID。
 */
export function buildResolutionRecommendationId(
  workloadCardId: string,
  targetUnitId: string
): string {
  return `rec-resolution-${workloadCardId}-${targetUnitId}`;
}

/**
 * Production Resolution Trigger 正式入口。
 *
 * 重复触发同一 (workloadCardId, targetUnitId)：
 * ID 稳定 + recommendationStore.addRecommendation 按 id 后写覆盖，
 * 不会产生重复的 recommended 推荐。
 * 推荐被处理（accepted / ignored / dismissed）后再次触发时，
 * 同 ID 推荐重新置为 recommended（D-142：允许再次推荐，处理过不等于永久禁止）。
 */
export async function resolveWorkloadToUnitAndRecommend(
  dataService: DataService,
  workloadCardId: string,
  targetUnitId: string
): Promise<ResolutionTriggerResult> {
  // 1. 构建生产 ResolutionContext（D-139：唯一生产构建入口）
  const context = await defaultResolutionContextBuilder.buildFromDataService(
    dataService,
    workloadCardId,
    targetUnitId
  );

  // 2. Resolution 分析（D-140：纯分析，不产生任何 Fact）
  const resolutionResult = resolveWorkloadToUnit(context);

  // 3. 转换为正式 Recommendation 容器。
  // D-149：从当次 ResolutionResult.matchBasis 提取快照（深拷贝子集）随推荐保存；
  // 来源只有这次 Resolution；同 ID re-offer 时随 upsert 更新（D-142）。
  const recommendation: Recommendation = {
    id: buildResolutionRecommendationId(workloadCardId, targetUnitId),
    kind: "resolution",
    payload: {
      ...resolutionResult.recommendation,
      matchingBasisSnapshot: toMatchingBasisSnapshot(resolutionResult),
    },
    reason: resolutionResult.recommendation.reason,
    status: "recommended",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    relatedEntityIds: [workloadCardId, targetUnitId],
  };

  // 4. 注册进 recommendationStore（status = recommended，等待用户确认）
  recommendationStore.getState().addRecommendation(recommendation);

  // W3（2026-10-27）：精确匹配的补充拆分建议——注册第二条推荐（稳定 ID 带 -split 后缀）
  if (resolutionResult.supplementalRecommendation) {
    const supplemental: Recommendation = {
      id: `${buildResolutionRecommendationId(workloadCardId, targetUnitId)}-split`,
      kind: "resolution",
      payload: {
        ...resolutionResult.supplementalRecommendation,
        matchingBasisSnapshot: toMatchingBasisSnapshot(resolutionResult),
      },
      reason: resolutionResult.supplementalRecommendation.reason,
      status: "recommended",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedEntityIds: [workloadCardId, targetUnitId],
    };
    recommendationStore.getState().addRecommendation(supplemental);
  }

  // 5. 返回容器 + 完整分析结果
  return { recommendation, resolutionResult };
}
