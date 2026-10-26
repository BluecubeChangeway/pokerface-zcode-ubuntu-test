import type { DataService } from "./DataService";
import { createRelation } from "../domain/relation/relationService";
import type { Relation } from "../domain/relation/types";
import type { RelationEndpointKind } from "../domain/relation/endpointRules";
import { isBusinessRevoked } from "../domain/workload/revocationService";
import { submitMoveAssignRelation, submitUnassignRelation } from "./ActionSubmissionService";
import { v4 as uuidv4 } from "uuid";

/**
 * 预算卡移动 / 解除运行时入口（U-UI-13，用户 2026-10-26 语义方向：
 * "budget 卡与 workload 卡在界面交互上十分接近"——A-002/A-002b 同款手势的预算镜像）
 *
 * 语义边界（与工作量版的关键差异，如实记录）：
 * - budget_assign 方向 = **BudgetCard → UnitCard**（endpointRules，与 workload 相反）：
 *   解除/移动操作的是 (预算卡, fromUnit) 这条 active 关系；
 * - **无配对反馈失效**：Recommendation/Resolution 是工作量域机制（D-128），预算域
 *   当前无推荐产生，因此无反馈可失效——预留边界，若未来引入预算推荐再扩展；
 * - **无自动重推**：同上——移动到新单元后不触发任何解析（预算没有 Resolution）；
 * - 解除 = 软删除留痕审计（active=false 同 ID upsert），移动 = 解除 + 新建，
 *   同 P2-1 业务键幂等；无效参数静默 ignored（AGENTS §20 / D-154）；
 * - 同单元移动（from === to）为 no-op。
 */

export type BudgetMoveRelationOutcome = "moved" | "no_op_same_unit" | "relation_failed" | "ignored";

export interface BudgetMoveRelationResult {
  outcome: BudgetMoveRelationOutcome;
  /** 被解除的旧关系（软删后状态）；无旧关系/纯新建时为 undefined */
  deactivatedRelation?: Relation;
  /** 目标端关系（新建行或被复用的既有 active 行） */
  relation?: Relation;
  relationOutcome?: "persisted" | "reused";
  error?: string;
}

/** 把 BudgetCard 的 budget_assign 从 fromUnit 移动到 toUnit（解除+新建，无解析/反馈联动） */
export async function moveBudgetCardAssignment(
  dataService: DataService,
  budgetCardId: string,
  fromUnitId: string,
  toUnitId: string
): Promise<BudgetMoveRelationResult> {
  if (fromUnitId === toUnitId) {
    return { outcome: "no_op_same_unit" };
  }
  const [cards, relations] = await Promise.all([
    dataService.getCards(),
    dataService.getRelations(),
  ]);
  // D-154：revoked 卡 / Unit 业务世界中等同不存在——静默 ignored
  const budgetCard = cards.find((c) => c.id === budgetCardId && c.type === "budget");
  if (!budgetCard || isBusinessRevoked(budgetCard)) {
    return { outcome: "ignored" };
  }
  const fromUnit = cards.find((c) => c.id === fromUnitId && c.type === "unit");
  const toUnit = cards.find((c) => c.id === toUnitId && c.type === "unit");
  if (!fromUnit || isBusinessRevoked(fromUnit) || !toUnit || isBusinessRevoked(toUnit)) {
    return { outcome: "ignored" };
  }

  // 解除对象：active budget_assign（方向 Budget→Unit）
  const oldAssign = relations.find(
    (r) =>
      r.active &&
      r.type === "budget_assign" &&
      r.sourceId === budgetCardId &&
      r.targetId === fromUnitId
  );
  const deactivatedRelation = oldAssign ? { ...oldAssign, active: false } : null;

  // 新建候选：目标端已有同键 active → 复用；否则创建（端点校验）
  const existingNewAssign = relations.find(
    (r) =>
      r.active &&
      r.type === "budget_assign" &&
      r.sourceId === budgetCardId &&
      r.targetId === toUnitId
  );
  let newRelation: Relation;
  if (existingNewAssign) {
    newRelation = existingNewAssign;
  } else {
    const endpointKinds = new Map<string, RelationEndpointKind>();
    for (const card of cards) {
      endpointKinds.set(card.id, card.type);
    }
    try {
      newRelation = createRelation(
        {
          id: uuidv4(),
          type: "budget_assign",
          sourceId: budgetCardId,
          targetId: toUnitId,
          metadata: { origin: "move" },
        },
        { existingRelations: relations, endpointKinds }
      );
    } catch (error) {
      return {
        outcome: "relation_failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const submission = await submitMoveAssignRelation(deactivatedRelation, newRelation, dataService);
  return {
    outcome: "moved",
    deactivatedRelation: deactivatedRelation ?? undefined,
    relation: submission.relation,
    relationOutcome: submission.outcome,
  };
}

/** 解除 BudgetCard 与 fromUnit 的 budget_assign（软删留痕；幂等 no-op；无反馈联动） */
export async function unassignBudgetCard(
  dataService: DataService,
  budgetCardId: string,
  fromUnitId: string
): Promise<{
  outcome: "unassigned" | "no_op" | "ignored";
  deactivatedRelation?: Relation;
}> {
  if (!budgetCardId || !fromUnitId) {
    return { outcome: "ignored" };
  }
  const [cards, relations] = await Promise.all([
    dataService.getCards(),
    dataService.getRelations(),
  ]);
  const budgetCard = cards.find((c) => c.id === budgetCardId && c.type === "budget");
  if (!budgetCard || isBusinessRevoked(budgetCard)) {
    return { outcome: "ignored" };
  }
  const fromUnit = cards.find((c) => c.id === fromUnitId && c.type === "unit");
  if (!fromUnit || isBusinessRevoked(fromUnit)) {
    return { outcome: "ignored" }
  }
  const activeAssign = relations.find(
    (r) =>
      r.active &&
      r.type === "budget_assign" &&
      r.sourceId === budgetCardId &&
      r.targetId === fromUnitId
  );
  if (!activeAssign) {
    return { outcome: "no_op" };
  }
  const deactivatedRelation: Relation = { ...activeAssign, active: false };
  await submitUnassignRelation(deactivatedRelation, dataService);
  return { outcome: "unassigned", deactivatedRelation };
}
