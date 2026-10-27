import type { DataService } from "./DataService";
import { createRelation } from "../domain/relation/relationService";
import type { Relation } from "../domain/relation/types";
import type { RelationEndpointKind } from "../domain/relation/endpointRules";
import { isBusinessRevoked } from "../domain/workload/revocationService";
import { submitMoveAssignRelation, submitUnassignRelation } from "./ActionSubmissionService";
import { v4 as uuidv4 } from "uuid";

/**
 * 单元卡移动 / 解除运行时入口（A-009 第一半，用户 2026-10-26 裁定；
 * Q-04 封板 structure 语义接线，无新裁定）
 *
 * 语义边界（与工作量/预算版的关键差异）：
 * - structure 方向 = UnitCard → UnitCard（组织从属：source 是子，target 是父）；
 * - **无 Resolution / 无反馈联动**（同预算版边界——单元域当前无解析/推荐机制）；
 * - 解除 = 软删除留痕审计；移动 = 解除 + 新建；自环禁止；D-154 revoked 静默；
 * - P2-1 同业务键幂等不变。
 */

export type UnitMoveOutcome = "moved" | "no_op_same_unit" | "relation_failed" | "ignored";

export interface UnitMoveResult {
  outcome: UnitMoveOutcome;
  deactivatedRelation?: Relation;
  relation?: Relation;
  relationOutcome?: "persisted" | "reused";
  error?: string;
}

/** 把子单元的 structure 从属从 fromUnit 移到 toUnit（解除+新建，无解析/反馈联动） */
export async function moveUnitStructureAssignment(
  dataService: DataService,
  unitCardId: string,
  fromUnitId: string,
  toUnitId: string
): Promise<UnitMoveResult> {
  if (fromUnitId === toUnitId) {
    return { outcome: "no_op_same_unit" };
  }
  const [cards, relations] = await Promise.all([
    dataService.getCards(),
    dataService.getRelations(),
  ]);
  const sourceUnit = cards.find((c) => c.id === unitCardId && c.type === "unit");
  if (!sourceUnit || isBusinessRevoked(sourceUnit)) {
    return { outcome: "ignored" };
  }
  const fromUnit = cards.find((c) => c.id === fromUnitId && c.type === "unit");
  const toUnit = cards.find((c) => c.id === toUnitId && c.type === "unit");
  if (!fromUnit || isBusinessRevoked(fromUnit) || !toUnit || isBusinessRevoked(toUnit)) {
    return { outcome: "ignored" };
  }
  // 自环禁止
  if (unitCardId === toUnitId) {
    return { outcome: "ignored" };
  }

  const oldStructure = relations.find(
    (r) =>
      r.active && r.type === "structure" && r.sourceId === unitCardId && r.targetId === fromUnitId
  );
  const deactivatedRelation = oldStructure ? { ...oldStructure, active: false } : null;

  const existingNew = relations.find(
    (r) =>
      r.active && r.type === "structure" && r.sourceId === unitCardId && r.targetId === toUnitId
  );
  let newRelation: Relation;
  if (existingNew) {
    newRelation = existingNew;
  } else {
    const endpointKinds = new Map<string, RelationEndpointKind>();
    for (const card of cards) {
      endpointKinds.set(card.id, card.type);
    }
    try {
      newRelation = createRelation(
        {
          id: uuidv4(),
          type: "structure",
          sourceId: unitCardId,
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

/** 解除子单元与 fromUnit 的 structure 从属（软删留痕；幂等 no-op；无反馈联动） */
export async function unassignUnitStructure(
  dataService: DataService,
  unitCardId: string,
  fromUnitId: string
): Promise<{
  outcome: "unassigned" | "no_op" | "ignored";
  deactivatedRelation?: Relation;
}> {
  if (!unitCardId || !fromUnitId) {
    return { outcome: "ignored" };
  }
  const [cards, relations] = await Promise.all([
    dataService.getCards(),
    dataService.getRelations(),
  ]);
  const sourceUnit = cards.find((c) => c.id === unitCardId && c.type === "unit");
  if (!sourceUnit || isBusinessRevoked(sourceUnit)) {
    return { outcome: "ignored" };
  }
  const fromUnit = cards.find((c) => c.id === fromUnitId && c.type === "unit");
  if (!fromUnit || isBusinessRevoked(fromUnit)) {
    return { outcome: "ignored" };
  }
  const activeStructure = relations.find(
    (r) =>
      r.active && r.type === "structure" && r.sourceId === unitCardId && r.targetId === fromUnitId
  );
  if (!activeStructure) {
    return { outcome: "no_op" };
  }
  const deactivatedRelation: Relation = { ...activeStructure, active: false };
  await submitUnassignRelation(deactivatedRelation, dataService);
  return { outcome: "unassigned", deactivatedRelation };
}
