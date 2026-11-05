import type { DataService } from "./DataService";
import type { CardSlot, WorkloadCard, BudgetCard, UnitCard } from "../domain/card/types";
import { canAcceptCard, createRelation } from "../domain/relation/relationService";
import type { Relation } from "../domain/relation/types";
import type { RelationEndpointKind } from "../domain/relation/endpointRules";
import { isBusinessRevoked } from "../domain/workload/revocation/revocationService";
import { resolveWorkloadToUnitAndRecommend } from "./resolutionTrigger";
import type { ResolutionTriggerResult } from "./resolutionTrigger";
import { submitDropAssignRelation } from "./ActionSubmissionService";
import { analyzeBudgetAndRecommend } from "./budgetRecommendation";
import { v4 as uuidv4 } from "uuid";

/**
 * Drop → Relation → Resolution 业务接线层（Q-09-C 第一刀；D-150 闭环 2026-10-09）
 *
 * D-150：成功 Drop 到有效 Slot 本身就是"建立业务关系"的用户操作。
 * 完整时序（真实 await 保证，非仅书写顺序）：
 *   WorkloadCard + CardSlot + DataService
 *     → 校验是否为合法 Workload Slot（AGENTS §20：无效目标静默取消）
 *     → 检查既有 active workload_assign（P2-1 业务键：active + type + Unit source + Workload target）
 *     → 不存在则创建 workload_assign（方向 UnitCard → WorkloadCard；端点校验经 createRelation；
 *       metadata.origin="drop" 仅来源信息，不参与业务键）
 *     → 经 ActionSubmissionService.submitDropAssignRelation 持久化（D-141：唯一 save* 边界）
 *     → 持久化成功（persisted）或确认已有 active 关系（reused）之后
 *     → 才触发 resolveWorkloadToUnitAndRecommend（Resolution → Recommendation）
 *
 * 失败语义（不得伪报成功，D-150 规则 4）：
 * - Relation 创建或持久化失败 → { outcome: "relation_failed" }：
 *   不触发 Resolution、不注册 Recommendation；
 * - Resolution 阶段的异常向调用方抛出：此时关系事实已成立（已持久化），
 *   不回滚（系统无事务语义）、不静默吞掉。
 *
 * 本层不重新实现 Resolution / 匹配 / feasibility / recommendationId /
 * Recommendation lifecycle；Relation 创建复用 relationService.createRelation，
 * 持久化复用 ActionSubmissionService（含业务键幂等兜底）。
 */

/** Drop 建立关系的持久化结果：persisted = 本次新建并保存；reused = 已有同键 active 关系，幂等复用 */
export type DropRelationOutcome = "persisted" | "reused";

/** UnitCard 拖到 Canvas 空白处的结果 */
export type UnitCardDropResult =
  | { outcome: "placed"; unitCardId: string; x: number; y: number }
  | { outcome: "ignored" };

/** 结构关系操作结果（含 move/unassign 等各类操作的统一返回） */
export type StructureRelationOutcome = 
  | { outcome: "structure_resolved"; relationOutcome: "persisted" | "reused"; relation: Relation }
  | { outcome: "structure_recommendation_created"; recommendation: import("../domain/recommendation/types").Recommendation; relationOutcome: "persisted" | "reused"; relation: Relation }
  | { outcome: "unit_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation }
  | { outcome: "budget_resolved"; relationOutcome: "persisted" | "reused"; relation: Relation }
  | { outcome: "budget_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation }
  | { outcome: "no_op_same_unit" }
  | { outcome: "unassigned"; deactivatedRelation?: Relation }
  | { outcome: "ignored"; error?: string }
  | { outcome: "relation_failed"; error: string };

/** drop 处理结果 */
export type DropTriggerResult =
  | {
      outcome: "resolved";
      relationOutcome: DropRelationOutcome;
      /** 本次 Drop 确立的 active workload_assign（新建行或被复用的既有行） */
      relation: Relation;
      trigger?: ResolutionTriggerResult;
    }
  /** Relation 创建/持久化失败：未触发 Resolution、未注册 Recommendation */
  | { outcome: "relation_failed"; error: string }
  | { outcome: "ignored" }
  /** 结构关系操作结果 */
  | StructureRelationOutcome
  // 以下为 move/unassign 等操作直接返回的结果类型
  | { outcome: "unit_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation }
  | { outcome: "budget_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation }
  | { outcome: "no_op_same_unit" }
  | { outcome: "unassigned"; deactivatedRelation?: Relation }
  | { outcome: "ignored" }
  | { outcome: "relation_failed"; error: string }
  // move/unassign 操作的完整结果类型（用于 dropInteraction 映射后返回）
  | { outcome: "unit_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation; error?: string }
  | { outcome: "budget_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation; error?: string }
  | { outcome: "moved"; relationOutcome?: "persisted" | "reused"; relation?: Relation; deactivatedRelation?: Relation; resubmittedResolution?: { workloadCardId: string; targetUnitId: string }; invalidatedRecommendationIds?: string[]; error?: string }
  | { outcome: "no_op_same_unit" }
  | { outcome: "unassigned"; deactivatedRelation?: Relation }
  | { outcome: "no_op" }
  | { outcome: "ignored" }
  | { outcome: "relation_failed"; error: string }
  // 完整的 moveRelation/unassignRelation 结果类型（包含 ignored outcome）
  | { outcome: "moved" | "ignored" | "no_op_same_unit" | "relation_failed"; relationOutcome?: "persisted" | "reused"; relation?: Relation; deactivatedRelation?: Relation; resubmittedResolution?: { workloadCardId: string; targetUnitId: string }; invalidatedRecommendationIds?: string[]; error?: string }
  | { outcome: "moved" | "ignored" | "no_op_same_unit" | "relation_failed"; relationOutcome?: "persisted" | "reused"; relation?: Relation; deactivatedRelation?: Relation; error?: string }
  | { outcome: "moved" | "ignored" | "no_op_same_unit" | "relation_failed"; relationOutcome?: "persisted" | "reused"; relation?: Relation; deactivatedRelation?: Relation; resubmittedResolution?: { workloadCardId: string; targetUnitId: string }; invalidatedRecommendationIds?: string[]; error?: string }
  | { outcome: "no_op_same_unit" }
  | { outcome: "unassigned"; deactivatedRelation?: Relation }
  | { outcome: "no_op" }
  | { outcome: "ignored" }
  | { outcome: "relation_failed"; error: string };

/**
 * 处理 WorkloadCard 落到 UnitCard 的 Workload Slot 上的拖放。
 *
 * 合法条件（全部满足才继续）：
 * - slot.type === "workload"
 * - canAcceptCard(slot, "workload") === true（enabled && !locked）
 * - slot.ownerCardId 存在
 * - slot.ownerCardId 对应的目标卡真实存在且 type === "unit"（目标卡校验边界：
 *   不存在或类型不符 = 无效 Drop，静默取消）
 * - 被拖入的 WorkloadCard 存在且未 revoked（D-154：revoked 卡业务世界中等同不存在）
 *
 * 无效目标：静默取消（AGENTS §20）——不抛异常、不写 Recommendation、不写 Relation，
 * 返回 { outcome: "ignored" }。
 */
export async function handleWorkloadCardDropOnUnitSlot(
  dataService: DataService,
  workloadCardId: string,
  slot: CardSlot
): Promise<DropTriggerResult> {
  // AGENTS §20：拖到无效目标 → 静默取消（不弹窗、不报错、不改已有关系）
  if (slot.type !== "workload") {
    return { outcome: "ignored" };
  }
  if (!canAcceptCard(slot, "workload")) {
    return { outcome: "ignored" };
  }
  if (!slot.ownerCardId) {
    return { outcome: "ignored" };
  }
  const unitCardId = slot.ownerCardId;

  // D-150：先建立并持久化关系，再触发 Resolution。取现有事实用于业务键检查与端点校验。
  const [cards, relations] = await Promise.all([
    dataService.getCards(),
    dataService.getRelations(),
  ]);

  // 目标卡校验边界：ownerCardId 必须对应真实存在且 type === "unit" 的目标卡。
  // 目标卡不存在或类型不符 = 无效 Drop（AGENTS §20）：静默取消——
  // 不创建、不保存 Relation，不触发 Resolution，不注册 Recommendation。
  if (!cards.some((c) => c.id === unitCardId && c.type === "unit")) {
    return { outcome: "ignored" };
  }

  // D-154：revoked WorkloadCard 业务世界中等同不存在——不给它建立关系（静默忽略，同无效目标语义）
  const workloadCard = cards.find(
    (c): c is WorkloadCard => c.id === workloadCardId && c.type === "workload"
  );
  if (!workloadCard || isBusinessRevoked(workloadCard)) {
    return { outcome: "ignored" };
  }

  // P2-1 同一业务键幂等复用：已有 active workload_assign → 复用，不建第二条。
  // inactive 旧行不算 active 关系，不阻止新建（与 executor / 持久化边界双层检查同键同规则）。
  const existingAssign = relations.find(
    (r) =>
      r.active &&
      r.type === "workload_assign" &&
      r.sourceId === unitCardId &&
      r.targetId === workloadCardId
  );
  if (existingAssign) {
    return resolveAfterRelation(dataService, workloadCardId, unitCardId, "reused", existingAssign);
  }

  // 创建 workload_assign（方向 UnitCard → WorkloadCard；端点校验由 createRelation 执行）
  const endpointKinds = new Map<string, RelationEndpointKind>();
  for (const card of cards) {
    endpointKinds.set(card.id, card.type);
  }
  let relation: Relation;
  try {
    relation = createRelation(
      {
        id: uuidv4(),
        type: "workload_assign",
        sourceId: unitCardId,
        targetId: workloadCardId,
        metadata: { origin: "drop" }, // 来源信息，不参与业务键
      },
      { existingRelations: relations, endpointKinds }
    );
  } catch (error) {
    return {
      outcome: "relation_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // 持久化（D-141：经 ActionSubmissionService 唯一持久化边界；内部再做同键 active 兜底）
  let submission: { outcome: "persisted" | "reused"; relation: Relation };
  try {
    submission = await submitDropAssignRelation(relation, dataService);
  } catch (error) {
    return {
      outcome: "relation_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // 持久化成功（或确认已有 active 关系）之后，才触发 Resolution（D-150 时序）
  return resolveAfterRelation(
    dataService,
    workloadCardId,
    unitCardId,
    submission.outcome,
    submission.relation
  );
}

async function resolveAfterRelation(
  dataService: DataService,
  workloadCardId: string,
  unitCardId: string,
  relationOutcome: DropRelationOutcome,
  relation: Relation
): Promise<DropTriggerResult> {
  // Resolution 阶段异常向调用方抛出：关系事实已成立，不回滚、不静默吞掉。
  const trigger = await resolveWorkloadToUnitAndRecommend(dataService, workloadCardId, unitCardId);
  return { outcome: "resolved", relationOutcome, relation, trigger };
}

/**
 * 处理 BudgetCard 落到 UnitCard 的 Budget Slot 上的拖放。
 *
 * 合法条件（全部满足才继续）：
 * - slot.type === "budget"
 * - canAcceptCard(slot, "budget") === true（enabled && !locked）
 * - slot.ownerCardId 存在
 * - slot.ownerCardId 对应的目标卡真实存在且 type === "unit"
 * - 被拖入的 BudgetCard 存在且未 revoked
 *
 * 无效目标：静默取消（AGENTS §20）——返回 { outcome: "ignored" }。
 */
export async function handleBudgetCardDropOnUnitSlot(
  dataService: DataService,
  budgetCardId: string,
  slot: CardSlot
): Promise<DropTriggerResult> {
  // AGENTS §20：拖到无效目标 → 静默取消
  if (slot.type !== "budget") {
    return { outcome: "ignored" };
  }
  if (!canAcceptCard(slot, "budget")) {
    return { outcome: "ignored" };
  }
  if (!slot.ownerCardId) {
    return { outcome: "ignored" };
  }
  const unitCardId = slot.ownerCardId;

  const [cards, relations] = await Promise.all([
    dataService.getCards(),
    dataService.getRelations(),
  ]);

  // 目标卡校验边界：ownerCardId 必须对应真实存在且 type === "unit" 的目标卡
  if (!cards.some((c) => c.id === unitCardId && c.type === "unit")) {
    return { outcome: "ignored" };
  }

  // D-154：revoked BudgetCard 业务世界中等同不存在
  const budgetCard = cards.find(
    (c): c is BudgetCard => c.id === budgetCardId && c.type === "budget"
  );
  if (!budgetCard || isBusinessRevoked(budgetCard)) {
    return { outcome: "ignored" };
  }

  // P2-1 同一业务键幂等复用：已有 active budget_assign → 复用
  // Budget is the source, Unit is the target (budget -> unit per endpointRules)
  const existingAssign = relations.find(
    (r) =>
      r.active &&
      r.type === "budget_assign" &&
      r.sourceId === budgetCardId &&
      r.targetId === unitCardId
  );
  if (existingAssign) {
    // 即使关系已存在，也要确保预算推荐存在（upsert 语义）
    console.log('[DEBUG handleBudgetCardDropOnUnitSlot] Existing assign found, calling analyzeBudgetAndRecommend');
    await analyzeBudgetAndRecommend(dataService, budgetCardId, unitCardId);
    return { outcome: "budget_resolved", relationOutcome: "reused", relation: existingAssign };
  }
  
  console.log('[DEBUG handleBudgetCardDropOnUnitSlot] No existing assign, creating new relation');

  // Create endpointKinds map for createRelation
  const endpointKinds = new Map<string, RelationEndpointKind>();
  for (const card of cards) {
    endpointKinds.set(card.id, card.type);
  }

  let relation: Relation;
  try {
    console.log('[DEBUG handleBudgetCardDropOnUnitSlot] About to call createRelation');
    // Budget is the source, Unit is the target (budget -> unit per endpointRules)
    relation = createRelation(
      {
        id: uuidv4(),
        type: "budget_assign",
        sourceId: budgetCardId,
        targetId: unitCardId,
        metadata: { origin: "drop" },
      },
      { existingRelations: relations, endpointKinds }
    );
    console.log('[DEBUG handleBudgetCardDropOnUnitSlot] createRelation succeeded, relation:', relation);
  } catch (error) {
    console.log('[DEBUG handleBudgetCardDropOnUnitSlot] createRelation failed:', error);
    return {
      outcome: "relation_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
  console.log('[DEBUG handleBudgetCardDropOnUnitSlot] relation created:', relation);

  // 持久化
  let submission: { outcome: "persisted" | "reused"; relation: Relation };
try {
    console.log('[DEBUG handleBudgetCardDropOnUnitSlot] About to call submitDropAssignRelation');
    submission = await submitDropAssignRelation(relation, dataService);
    console.log('[DEBUG handleBudgetCardDropOnUnitSlot] submitDropAssignRelation succeeded, submission:', submission);
  } catch (error) {
    console.log('[DEBUG handleBudgetCardDropOnUnitSlot] submitDropAssignRelation failed:', error);
    return {
      outcome: "relation_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Budget assign 持久化成功后，触发预算推荐分析（A-007：A-007 预算域解析/推荐）
  console.log('[DEBUG handleBudgetCardDropOnUnitSlot] Calling analyzeBudgetAndRecommend with budgetCardId:', budgetCardId, 'unitCardId:', unitCardId);
  await analyzeBudgetAndRecommend(dataService, budgetCardId, unitCardId);
  console.log('[DEBUG handleBudgetAndRecommend] analyzeBudgetAndRecommend completed');
  return { outcome: "budget_resolved", relationOutcome: submission.outcome, relation: submission.relation };
}

/**
 * 处理 UnitCard 拖到 Canvas 空白处的拖放。
 *
 * 创建新的 Canvas placement。无业务关系建立，纯 UI 操作。
 * 如果该 UnitCard 已在 Canvas 上，则忽略（幂等）。
 */
export function handleUnitCardDropOnCanvas(
  unitCardId: string,
  x: number,
  y: number
): UnitCardDropResult {
  // 这里只是返回放置信息，实际的 placement 创建由 Canvas store 处理
  // 业务侧不需要持久化，这是纯 UI 状态
  return { outcome: "placed", unitCardId, x, y };
}

/**
 * 处理 WorkloadCard 拖到另一个 WorkloadCard 上的拖放（创建 workload_split 关系）。
 *
 * 这用于"子卡"场景：父 Workload（如"门诊人次"）拆分为多个子 Workload（各病区/医生的门诊人次）。
 *
 * 合法条件（全部满足才继续）：
 * - 目标 WorkloadCard 存在且未 revoked
 * - 被拖入的 WorkloadCard（子卡）存在且未 revoked
 * - 两者不为同一张卡
 *
 * 无效目标：静默取消（AGENTS §20）——返回 { outcome: "ignored" }。
 */
export async function handleWorkloadCardDropOnWorkloadCard(
  dataService: DataService,
  childWorkloadCardId: string,
  parentWorkloadCardId: string
): Promise<DropTriggerResult> {
  // AGENTS §20：拖到无效目标 → 静默取消
  if (childWorkloadCardId === parentWorkloadCardId) {
    return { outcome: "ignored" };
  }

  const [cards, relations] = await Promise.all([
    dataService.getCards(),
    dataService.getRelations(),
  ]);

  // 目标卡（父卡）校验
  const parentCard = cards.find(
    (c): c is WorkloadCard => c.id === parentWorkloadCardId && c.type === "workload"
  );
  if (!parentCard || isBusinessRevoked(parentCard)) {
    return { outcome: "ignored" };
  }

  // 被拖入的卡（子卡）校验
  const childCard = cards.find(
    (c): c is WorkloadCard => c.id === childWorkloadCardId && c.type === "workload"
  );
  if (!childCard || isBusinessRevoked(childCard)) {
    return { outcome: "ignored" };
  }

  // P2-1 同一业务键幂等复用：已有 active workload_split → 复用
  const existingSplit = relations.find(
    (r) =>
      r.active &&
      r.type === "workload_split" &&
      r.sourceId === parentWorkloadCardId &&
      r.targetId === childWorkloadCardId
  );
  if (existingSplit) {
    return { outcome: "resolved", relationOutcome: "reused", relation: existingSplit };
  }

  // 创建 workload_split（方向 Parent Workload → Child Workload）
  const endpointKinds = new Map<string, RelationEndpointKind>();
  for (const card of cards) {
    endpointKinds.set(card.id, card.type);
  }
  let relation: Relation;
  try {
    relation = createRelation(
      {
        id: uuidv4(),
        type: "workload_split",
        sourceId: parentWorkloadCardId,
        targetId: childWorkloadCardId,
        metadata: { origin: "drop" },
      },
      { existingRelations: relations, endpointKinds }
    );
  } catch (error) {
    return {
      outcome: "relation_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // 持久化（复用 submitDropAssignRelation 因为它处理同键幂等兜底）
  let submission: { outcome: "persisted" | "reused"; relation: Relation };
  try {
    submission = await submitDropAssignRelation(relation, dataService);
  } catch (error) {
    return {
      outcome: "relation_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // workload_split 不触发 Resolution（拆分关系由 confirm_split 显式确认）
  return { outcome: "resolved", relationOutcome: submission.outcome, relation: submission.relation };
}
