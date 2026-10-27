import type { DataService } from "./DataService";
import type { CardSlot, WorkloadCard } from "../domain/card/types";
import { canAcceptCard, createRelation } from "../domain/relation/relationService";
import type { Relation } from "../domain/relation/types";
import type { RelationEndpointKind } from "../domain/relation/endpointRules";
import { isBusinessRevoked } from "../domain/workload/revocationService";
import { resolveWorkloadToUnitAndRecommend } from "./resolutionTrigger";
import type { ResolutionTriggerResult } from "./resolutionTrigger";
import { submitDropAssignRelation } from "./ActionSubmissionService";
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

/** drop 处理结果 */
export type DropTriggerResult =
  | {
      outcome: "resolved";
      relationOutcome: DropRelationOutcome;
      /** 本次 Drop 确立的 active workload_assign（新建行或被复用的既有行） */
      relation: Relation;
      trigger: ResolutionTriggerResult;
    }
  /** Relation 创建/持久化失败：未触发 Resolution、未注册 Recommendation */
  | { outcome: "relation_failed"; error: string }
  | { outcome: "ignored" };

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
 * Budget Drop → Relation 业务接线层（U-UI-13，2026-10-26）
 *
 * 用户语义方向（2026-10-26 原话要点）："budget 卡原则上应与 workload 卡在界面交互上
 * 十分接近，也可以被拖拽到某个单元卡下成为某个单元的预算卡片。"
 *
 * 语义依据（已封板，非新裁定）：
 * - budget_assign = 预算真正分配给 UnitCard（Q-05 / D-023：allocation 是真正分配）；
 * - 方向 BudgetCard → UnitCard（端点规则 endpointRules：source=budget, target=unit——
 *   注意与 workload_assign 相反）；
 * - P2-1 同业务键幂等：active + type + sourceId + targetId（submitDropAssignRelation
 *   通用按 relation 自身字段判重，无需特判）。
 *
 * 与 workload 路径的关键边界（如实记录）：
 * - **无 Resolution 触发**：Resolution / Recommendation 是工作量域机制（D-128：
 *   "Workload Resolution"），预算拖入不触发解析、不产生推荐——D-150 的 Resolution 部分
 *   是工作量卡专属；预算拖入到"确认槽位合法 → 建立关系"为止；
 * - 预算**不自动激活 Unit Slot**（D-019 既有边界）；
 * - AGENTS §20 同语义：无效目标（非 budget 槽 / 目标卡不存在 / revoked 卡）静默取消。
 */
export async function handleBudgetCardDropOnUnitSlot(
  dataService: DataService,
  budgetCardId: string,
  slot: CardSlot
): Promise<
  | { outcome: "resolved"; relationOutcome: DropRelationOutcome; relation: Relation }
  | { outcome: "relation_failed"; error: string }
  | { outcome: "ignored" }
> {
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

  // 目标 Unit 卡必须真实存在且类型正确
  if (!cards.some((c) => c.id === unitCardId && c.type === "unit")) {
    return { outcome: "ignored" };
  }

  // D-154：revoked 预算卡业务世界中等同不存在——不给它建立关系
  const budgetCard = cards.find((c) => c.id === budgetCardId && c.type === "budget");
  if (!budgetCard || isBusinessRevoked(budgetCard)) {
    return { outcome: "ignored" };
  }

  // P2-1 同业务键幂等：已有 active budget_assign（方向 Budget→Unit）→ 复用
  const existingAssign = relations.find(
    (r) =>
      r.active &&
      r.type === "budget_assign" &&
      r.sourceId === budgetCardId &&
      r.targetId === unitCardId
  );
  if (existingAssign) {
    return { outcome: "resolved", relationOutcome: "reused", relation: existingAssign };
  }

  // 创建 budget_assign（方向 BudgetCard → UnitCard；端点校验经 createRelation）
  const endpointKinds = new Map<string, RelationEndpointKind>();
  for (const card of cards) {
    endpointKinds.set(card.id, card.type);
  }
  let relation: Relation;
  try {
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
  } catch (error) {
    return {
      outcome: "relation_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // 持久化（D-141：经 ActionSubmissionService 唯一持久化边界；内部同键 active 兜底）
  try {
    const submission = await submitDropAssignRelation(relation, dataService);
    return {
      outcome: "resolved",
      relationOutcome: submission.outcome,
      relation: submission.relation,
    };
  } catch (error) {
    return {
      outcome: "relation_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Unit Drop → Structure 业务接线层（A-009 第一半，用户 2026-10-26 裁定）
 *
 * 语义依据（Q-04 封板，无新裁定）：
 * - structure 关系 = 单元组织结构从属（D-015：V1 Unit Slot 只接受 UnitCard）；
 * - 方向 Unit→Unit（endpointRules：source=unit, target=unit）；
 * - P2-1 同业务键幂等（submitDropAssignRelation 通用按 type+source+target 判重）。
 *
 * 边界（如实记录）：
 * - **无 Resolution 触发**：与预算同理——Resolution 是工作量域机制（D-128）；
 *   单元拖入到"确认槽位合法 → 建立从属关系"为止；
 * - 单元**不做自环**（unit 不能挂到自己下面）——静默取消；
 * - AGENTS §20：无效目标（非 unit 槽 / 目标卡不存在 / revoked 卡 / 自环）静默取消。
 */
export async function handleUnitCardDropOnUnitSlot(
  dataService: DataService,
  unitCardId: string,
  slot: CardSlot
): Promise<
  | { outcome: "structure_resolved"; relationOutcome: DropRelationOutcome; relation: Relation }
  | { outcome: "relation_failed"; error: string }
  | { outcome: "ignored" }
> {
  if (slot.type !== "unit") {
    return { outcome: "ignored" };
  }
  if (!canAcceptCard(slot, "unit")) {
    return { outcome: "ignored" };
  }
  if (!slot.ownerCardId) {
    return { outcome: "ignored" };
  }
  const targetUnitCardId = slot.ownerCardId;

  const [cards, relations] = await Promise.all([
    dataService.getCards(),
    dataService.getRelations(),
  ]);

  // 目标单元卡必须真实存在且类型正确
  if (!cards.some((c) => c.id === targetUnitCardId && c.type === "unit")) {
    return { outcome: "ignored" };
  }

  // D-154：revoked 单元卡业务世界中等同不存在
  const sourceUnitCard = cards.find((c) => c.id === unitCardId && c.type === "unit");
  if (!sourceUnitCard || isBusinessRevoked(sourceUnitCard)) {
    return { outcome: "ignored" };
  }

  // 自环禁止：单元不能挂到自己下面
  if (unitCardId === targetUnitCardId) {
    return { outcome: "ignored" };
  }

  // P2-1 同业务键幂等：已有 active structure（方向 Unit→Unit）→ 复用
  const existingStructure = relations.find(
    (r) =>
      r.active &&
      r.type === "structure" &&
      r.sourceId === unitCardId &&
      r.targetId === targetUnitCardId
  );
  if (existingStructure) {
    return {
      outcome: "structure_resolved",
      relationOutcome: "reused",
      relation: existingStructure,
    };
  }

  // 创建 structure（方向 UnitCard → UnitCard；端点校验经 createRelation）
  const endpointKinds = new Map<string, RelationEndpointKind>();
  for (const card of cards) {
    endpointKinds.set(card.id, card.type);
  }
  let relation: Relation;
  try {
    relation = createRelation(
      {
        id: uuidv4(),
        type: "structure",
        sourceId: unitCardId,
        targetId: targetUnitCardId,
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

  try {
    const submission = await submitDropAssignRelation(relation, dataService);
    return {
      outcome: "structure_resolved",
      relationOutcome: submission.outcome,
      relation: submission.relation,
    };
  } catch (error) {
    return {
      outcome: "relation_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
