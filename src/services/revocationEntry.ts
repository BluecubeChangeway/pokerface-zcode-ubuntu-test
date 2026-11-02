import type { DataService } from "./DataService";
import type { WorkloadRevocationImpact, ContinuedUseEvidence } from "../domain/workload/revocationService";
import { computeFullPathRevocationImpact, isBusinessRevoked } from "../domain/workload/revocationService";
import type { Recommendation } from "../domain/recommendation/types";
import type { ResolutionRecommendation } from "../domain/workload/resolutionTypes";
import { recommendationStore } from "../stores/recommendationStore";
import {
  executeSplitLayerRevocation,
  executeFullPathRevocation,
  loadRevocationSnapshot,
  submitRevocation,
} from "./revocationSubmissionService";
import { resolveWorkloadToUnitAndRecommend } from "./resolutionTrigger";

/**
 * 撤回入口接线层（D-153 层撤回 / D-158 全路径撤回）
 *
 * 职责严格限定为"用户操作 → 既有撤回编排"的最小转接、只读预览与确认范围守卫：
 * - 两个入口语义互斥、**不得合并**——层撤回走 D-153（使用保护、used/unused
 *   分流、软失效），全路径撤回走 D-158（记录级闭包、物理删除派生卡与结果、
 *   manualReview 清单）；
 * - 本层**不重新实现任何撤回算法**：执行一律复用既有编排/提交
 *   （revocationSubmissionService 的 compute + submitRevocation）；
 * - 全路径预览（previewFullPathRevocation）**严格只读**：加载快照（仅 get*
 *   调用）+ 纯函数影响计算，不写入、不删除、不失效任何业务数据；
 * - 确认范围守卫（revokeDerivedPathAsPreviewed）：确认后执行前**重新加载快照
 *   并重新计算影响集**，与用户确认的预览做全字段比较；不一致即中止——不调用
 *   submitRevocation，零撤回写入，抛出明确错误要求重新预览；
 * - 预览与执行共用同一套派生来源判定（computeFullPathRevocationImpact
 *   记录级闭包）；
 * - 返回的 impact 含 manualReview（来源不明对象清单），调用方不得静默丢弃。
 *
 * 持久化边界（如实记录）：当前生产运行时使用 MockDataService 的内存删除实现；
 * 生产 DataService 适配器尚未实现 deleteCards / deleteWorkloadResults——生产
 * 物理删除能力仍为后续阻塞项。
 */

/**
 * D-158 全路径撤回影响预览（严格只读）。
 *
 * 不调用 submitRevocation——不产生任何写入/删除/失效；两次预览间无状态变化。
 * 入口卡不存在或不是 WorkloadCard 时抛出（由 computeFullPathRevocationImpact
 * 的 requireWorkloadCard 抛出，与执行路径同源）。
 */
export async function previewFullPathRevocation(
  dataService: DataService,
  entryWorkloadCardId: string
): Promise<WorkloadRevocationImpact> {
  const snapshot = await loadRevocationSnapshot(dataService);
  return computeFullPathRevocationImpact({ snapshot, entryWorkloadCardId });
}

/** 影响集全部关键字段（确认范围守卫的比较范围；不做任何忽略） */
const IMPACT_SCOPE_KEYS = [
  "deletedCards",
  "deletedWorkloadResults",
  "revokedCalculationResults",
  "deactivatedRelations",
  "revokedWorkloadSplits",
  "revokedCards",
  "revokedWorkloadResults",
  "retained",
  "manualReview",
] as const;

/**
 * 全字段影响范围差异：逐字段做结构化比较（JSON 规范化后比对——影响集数据
 * 均为 JSON 安全对象）。任何新增、移除或内容变化都会命中差异；不做"仅数量
 * 比较"，不忽略任何字段。返回差异字段名列表（空 = 范围一致）。
 */
function revocationScopeDiff(
  a: WorkloadRevocationImpact,
  b: WorkloadRevocationImpact
): string[] {
  const diff: string[] = [];
  for (const key of IMPACT_SCOPE_KEYS) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      diff.push(key);
    }
  }
  return diff;
}

/**
 * D-151 A①（撤回后旧反馈失效）：撤回成功后，按**当前事实状态**实时判定并移除
 * 依赖已死/已撤回业务实体的当前 Resolution 反馈（仅 status=recommended）。
 *
 * 边界（对应 D-151 规则 1-2 + D-154，不扩大）：
 * - 仅 kind="resolution" 且 status="recommended" 的当前反馈参与判定——
 *   其他 kind 无生产来源与关联语义，不判不动；accepted/ignored/dismissed
 *   属已处理历史，不删除、不改写（历史审计另行裁定）；
 * - 双信号（实体存活性，非关系拓扑）：① relatedEntityIds[0] 的 WorkloadCard
 *   在当前 getCards 中不存在或 businessStatus=revoked；② payload.targetResultId
 *   的 WorkloadResult 不存在或 revoked。不使用 Relation.active / 端点相交判定
 *   （retained 子卡、manualReview 对象、其他仍有效关系对应的反馈不误伤）；
 * - 实时推导：判定数据来自撤回成功后的当前 DataService 状态，不重放过期
 *   impact 快照——空 impact 重试（撤回重跑 no-op）时仍能完成失效并收敛；
 * - 不触碰 D-142 稳定 ID / re-offer / Recommendation 状态机：失效 = 对已移除
 *   条目的 removeRecommendation（同 ID 再注册走既有 upsert/追加分支）。
 * - 仅在撤回提交成功后执行（本函数的调用点全部位于 submitRevocation 成功之后）；
 *   若失效本身抛错，撤回事实已提交——错误如实上抛，重试同一撤回入口即收敛。
 */
async function invalidateStaleResolutionFeedback(
  dataService: DataService
): Promise<string[]> {
  const [cards, results] = await Promise.all([
    dataService.getCards(),
    dataService.getWorkloadResults(),
  ]);
  const staleIds: string[] = [];
  for (const recommendation of recommendationStore.getState().recommendations) {
    if (recommendation.kind !== "resolution") continue;
    if (recommendation.status !== "recommended") continue;
    const anchorCardId = recommendation.relatedEntityIds?.[0];
    const payload = recommendation.payload as Partial<ResolutionRecommendation> | undefined;
    const targetResultId =
      payload && typeof payload.targetResultId === "string" ? payload.targetResultId : undefined;
    let stale = false;
    if (anchorCardId !== undefined) {
      const card = cards.find((c) => c.id === anchorCardId);
      if (!card || card.type !== "workload" || isBusinessRevoked(card)) {
        stale = true;
      }
    }
    if (!stale && targetResultId !== undefined) {
      const result = results.find((r) => r.id === targetResultId);
      if (!result || isBusinessRevoked(result)) {
        stale = true;
      }
    }
    if (stale) {
      staleIds.push(recommendation.id);
    }
  }
  if (staleIds.length > 0) {
    const store = recommendationStore.getState();
    for (const id of staleIds) {
      store.removeRecommendation(id);
    }
  }
  return staleIds;
}

/**
 * D-158 全路径撤回执行入口（带确认范围守卫）——UI 确认路径的正式入口。
 *
 * 执行前重新加载快照并重新计算影响集（同一套派生来源判定），与
 * previewedImpact 做全字段比较：
 * - 一致 → 复用既有 submitRevocation 六阶段提交（D-155 防复活、可恢复提交
 *   语义不变），返回执行影响集（含 manualReview）；
 * - 不一致 → **中止，零撤回写入**，抛出明确错误（列出差异字段、要求重新预览）。
 *
 * 该守卫封闭"预览后、确认前数据变化"的窗口：用户确认的范围即最终提交的范围。
 */
export async function revokeDerivedPathAsPreviewed(
  dataService: DataService,
  entryWorkloadCardId: string,
  previewedImpact: WorkloadRevocationImpact
): Promise<WorkloadRevocationImpact> {
  const snapshot = await loadRevocationSnapshot(dataService);
  const current = computeFullPathRevocationImpact({ snapshot, entryWorkloadCardId });
  const diff = revocationScopeDiff(previewedImpact, current);
  if (diff.length > 0) {
    throw new Error(
      `确认范围校验失败：影响范围与预览不一致（差异字段：${diff.join("、")}）。` +
        `已中止，未提交任何撤回写入；请重新预览后再确认。`
    );
  }
  await submitRevocation(current, dataService);
  // D-151 A①：撤回提交成功后，按当前事实状态失效旧反馈（预览/取消/守卫拒绝均不触达此处）
  await invalidateStaleResolutionFeedback(dataService);
  return current;
}

/**
 * D-158 全路径撤回直接执行入口（无确认范围守卫）：转接既有编排
 * executeFullPathRevocation。适用于无预览环节的程序化调用方；
 * UI 确认路径必须使用 revokeDerivedPathAsPreviewed。
 */
export async function revokeDerivedPath(
  dataService: DataService,
  entryWorkloadCardId: string
): Promise<WorkloadRevocationImpact> {
  const impact = await executeFullPathRevocation(dataService, entryWorkloadCardId);
  // D-151 A①：撤回提交成功后失效旧反馈（空 impact 重跑时亦按实时事实收敛）
  await invalidateStaleResolutionFeedback(dataService);
  return impact;
}

/**
 * D-153 层撤回执行入口：转接既有编排 executeSplitLayerRevocation。
 *
 * 语义完全不变：本层使用证据的子卡保留、未使用子卡软失效、本层拆分边软删。
 * 不得与本层的全路径入口合并或互为 fallback。
 *
 * D-151：撤回成功后，对残留有效配对（父卡 + retained 子卡的 active workload_assign）
 * 自动触发 Resolution 重新推荐（同 move/drop 语义）。
 */
export async function revokeSplitLayer(
  dataService: DataService,
  parentWorkloadCardId: string,
  opts?: { executionBatchId?: string }
): Promise<WorkloadRevocationImpact> {
  const impact = await executeSplitLayerRevocation(dataService, parentWorkloadCardId, opts);
  // D-151 A①：层撤回提交成功后，失效依赖被撤（revoked）子卡的旧反馈；
  // retained 子卡（锚点存活）不误伤
  await invalidateStaleResolutionFeedback(dataService);

  // D-151：自动重新 Resolution——对残留有效配对触发
  // 1. 父卡的 active workload_assign
  const parentRelations = await dataService.getRelations();
  const activeParentAssigns = parentRelations.filter(
    (r) => r.active && r.type === "workload_assign" && r.targetId === parentWorkloadCardId
  );
  for (const assign of activeParentAssigns) {
    await resolveWorkloadToUnitAndRecommend(dataService, parentWorkloadCardId, assign.sourceId);
  }

  // 2. retained 子卡的 active workload_assign
  for (const retained of impact.retained) {
    const childCardId = retained.cardId;
    const activeChildAssigns = parentRelations.filter(
      (r) => r.active && r.type === "workload_assign" && r.targetId === childCardId
    );
    for (const assign of activeChildAssigns) {
      await resolveWorkloadToUnitAndRecommend(dataService, childCardId, assign.sourceId);
    }
  }

  return impact;
}
