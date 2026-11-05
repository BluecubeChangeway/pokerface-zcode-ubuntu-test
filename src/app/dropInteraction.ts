import type { DataService } from "../services/DataService";
import type { CardSlot } from "../domain/card/types";
import {
  handleWorkloadCardDropOnUnitSlot,
  handleBudgetCardDropOnUnitSlot,
  handleUnitCardDropOnCanvas,
  handleWorkloadCardDropOnWorkloadCard,
  type DropTriggerResult,
  type UnitCardDropResult,
} from "../services/dropTrigger";
import { moveWorkloadCardAssignment, unassignWorkloadCard } from "../services/moveRelationEntry";
import { moveUnitStructureAssignment, unassignUnitStructure } from "../services/unitRelationEntry";
import { moveBudgetCardAssignment, unassignBudgetCard } from "../services/budgetRelationEntry";
import { isBusinessRevoked } from "../domain/workload/revocation/revocationService";
import { createRelation } from "../domain/relation/relationService";
import { v4 as uuidv4 } from "uuid";
import type { RelationEndpointKind } from "../domain/relation/endpointRules";
import { recommendationStore } from "../stores/recommendationStore";

// Re-export for App.tsx
export type { UnitCardDropResult };

/**
 * 原生 HTML5 Drag & Drop 的最小交互 handler（Q-09-C UI 竖切片）
 *
 * 职责仅限"DOM 拖放事件 ↔ 业务接线层"的参数转接：
 * - dragStart：只携带 cardId（不触碰 Canvas focus、不创建 Relation）
 * - drop：读取 payload 后唯一经过 dropTrigger 层，不直接调用 resolutionTrigger
 *
 * 本模块不包含业务规则：合法性判定与静默取消语义全部在 dropTrigger 及其下层。
 */

/** 拖放 payload 类型 */
export const WORKLOAD_CARD_DRAG_TYPE = "text/workload-card-id";
export const UNIT_CARD_DRAG_TYPE = "text/unit-card-id";
export const BUDGET_CARD_DRAG_TYPE = "text/budget-card-id";

/** 浏览器 DataTransfer 的最小可测形状（node 测试环境无 DOM） */
export interface DataTransferLike {
  setData(type: string, value: string): void;
  getData(type: string): string;
}

/**
 * dragStart：向 dataTransfer 写入 workloadCardId。
 * 不修改 Canvas focus / GhostState / 任何 store——UI 状态留待后续轮次。
 */
export function onWorkloadCardDragStart(
  dataTransfer: DataTransferLike,
  workloadCardId: string
): void {
  dataTransfer.setData(WORKLOAD_CARD_DRAG_TYPE, workloadCardId);
}

/**
 * dragStart：向 dataTransfer 写入 unitCardId|sourceUnitId。
 * 不修改 Canvas focus / GhostState / 任何 store——UI 状态留待后续轮次。
 */
export function onUnitCardDragStart(
  dataTransfer: DataTransferLike,
  unitCardId: string,
  sourceUnitId: string
): void {
  dataTransfer.setData(UNIT_CARD_DRAG_TYPE, `${unitCardId}|${sourceUnitId}`);
}

/**
 * dragStart：向 dataTransfer 写入 budgetCardId|sourceUnitId。
 * 不修改 Canvas focus / GhostState / 任何 store——UI 状态留待后续轮次。
 */
export function onBudgetCardDragStart(
  dataTransfer: DataTransferLike,
  budgetCardId: string,
  sourceUnitId: string
): void {
  dataTransfer.setData(BUDGET_CARD_DRAG_TYPE, `${budgetCardId}|${sourceUnitId}`);
}

/**
 * drop：UnitCard 从槽拖出到 Canvas 空白/Deck 等槽外区域 → 纯解除 structure 关系。
 */
export async function onUnitCardDropOutsideSlots(
  dataService: DataService,
  dataTransfer: DataTransferLike
): Promise<DropTriggerResult> {
  const payload = dataTransfer.getData(UNIT_CARD_DRAG_TYPE);
  if (!payload) {
    return { outcome: "ignored", relationOutcome: "persisted" };
  }
  const [unitCardId, sourceUnitId] = payload.split("|");
  if (!unitCardId || !sourceUnitId) {
    return { outcome: "ignored", relationOutcome: "persisted" };
  }
  const unassignResult = await unassignUnitStructure(dataService, sourceUnitId, unitCardId);
  return mapUnassignUnitStructureResultToDropTrigger(unassignResult);
}

/**
 * 通用卡片槽 drop 处理：根据 card 类型路由到对应业务 handler。
 * 支持：UnitCard→Unit槽(structure)、WorkloadCard→Workload槽(assign)、BudgetCard→Budget槽(assign)。
 * payload 格式：`cardId|sourceUnitId`（UnitCard/WorkloadCard）或 `cardId`（BudgetCard）。
 */
export async function onCardSlotDrop(
  dataService: DataService,
  dataTransfer: DataTransferLike,
  targetSlot: CardSlot
): Promise<DropTriggerResult> {
  // 尝试读取不同类型的 payload
  const unitPayload = dataTransfer.getData(UNIT_CARD_DRAG_TYPE);
  const workloadPayload = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  const budgetPayload = dataTransfer.getData(BUDGET_CARD_DRAG_TYPE);

  const targetUnitId = targetSlot.ownerCardId;

  // UnitCard → Unit 槽（structure 关系）
  if (unitPayload) {
    // 只允许 UnitCard 落在 Unit 类型的槽上
    if (targetSlot.type !== "unit") {
      return { outcome: "ignored", relationOutcome: "persisted" };
    }
    
    const parts = unitPayload.split("|");
    const unitCardId = parts[0];
    const sourceUnitId = parts[1];
    
    if (!unitCardId) {
      return { outcome: "ignored", relationOutcome: "persisted" };
    }
    
    // 旧格式：仅 unitCardId（从 Deck 拖起，建立新结构关系）
    // 新格式：unitCardId|sourceUnitId（从槽拖起，移动结构关系）
    if (sourceUnitId) {
      // 新格式：从槽拖起，移动结构关系
      if (sourceUnitId === targetUnitId) {
        return { outcome: "no_op_same_unit", relationOutcome: "persisted" };
      }
      const result = await moveUnitStructureAssignment(dataService, unitCardId, sourceUnitId, targetUnitId);
      // 统一返回 outcome 格式
      if (result.outcome === "moved") {
        return {
          outcome: "unit_moved" as const,
          relationOutcome: result.relationOutcome ?? "persisted",
          relation: result.relation!,
          deactivatedRelation: result.deactivatedRelation,
          error: result.error,
        };
      }
      if (result.outcome === "no_op_same_unit") {
        return { outcome: "no_op_same_unit" as const, relationOutcome: "persisted" }
      }
      if (result.outcome === "relation_failed") {
        return { outcome: "relation_failed" as const, error: result.error || "Relation creation failed", relationOutcome: "persisted" }
      }
      return { outcome: "ignored", relationOutcome: "persisted" };
    } else {
      // 旧格式：从 Deck 拖起，建立新结构关系（父=目标槽的单元，子=拖拽的单元）
      // 自环禁止：子单元不能是目标单元自身（P2-1 自环禁止）
      if (unitCardId === targetUnitId) {
        return { outcome: "ignored", relationOutcome: "persisted" };
      }
      // 检查卡片是否被撤销（D-154：revoked 卡静默忽略）
      const cards = await dataService.getCards();
      const unitCard = cards.find((c) => c.id === unitCardId && c.type === "unit");
      if (!unitCard || isBusinessRevoked(unitCard)) {
        return { outcome: "ignored", relationOutcome: "persisted" };
      }
      // 检查是否已存在该结构关系
      const relations = await dataService.getRelations();
      const existing = relations.find(
        r => r.active && r.type === "structure" && r.sourceId === targetUnitId && r.targetId === unitCardId
      );
      if (existing) {
        return { outcome: "structure_resolved", relationOutcome: "reused", relation: existing }
      }
      // 直接创建 structure 关系（源=父单元，目标=子单元）
      const endpointKinds = new Map<string, RelationEndpointKind>();
      for (const card of cards) {
        endpointKinds.set(card.id, card.type);
      }
      const relation = createRelation({
        id: uuidv4(),
        type: "structure",
        sourceId: targetUnitId,   // 父单元
        targetId: unitCardId,     // 子单元
        metadata: { origin: "drop" },
      }, {
        existingRelations: relations,
        endpointKinds,
      });
      await dataService.saveRelations([relation]);
      // 结构关系建立后，查询映射表生成单元拆分推荐（W4：A-009 第二半）
      const { checkAndRecommendUnitSplit } = await import("../domain/workload/split/unitSplitService");
      const recommendation = checkAndRecommendUnitSplit(unitCardId, targetUnitId);
      if (!recommendation) {
        return { outcome: "structure_resolved", relationOutcome: "persisted", relation };
      }
      // 返回推荐已创建，等待用户确认
      recommendationStore.getState().addRecommendation(recommendation);
      return { outcome: "structure_recommendation_created", recommendation, relationOutcome: "persisted", relation };
    }
  }
  // WorkloadCard → Workload 槽（workload_assign 关系，支持移动）
  if (workloadPayload) {
    // 只允许 WorkloadCard 落在 Workload 类型的槽上
    if (targetSlot.type !== "workload") {
      return { outcome: "ignored", relationOutcome: "persisted" };
    }
    
    const parts = workloadPayload.split("|");
    const workloadCardId = parts[0];
    const sourceUnitId = parts[1];
    
    if (!workloadCardId) {
      return { outcome: "ignored", relationOutcome: "persisted" };
    }
    
    if (sourceUnitId) {
      // 新格式：从槽拖起，支持移动/解除
      if (sourceUnitId === targetUnitId) {
        return { outcome: "no_op_same_unit", relationOutcome: "persisted" }
      }
      return moveWorkloadCardAssignment(dataService, workloadCardId, sourceUnitId, targetUnitId);
    } else {
      // 旧格式：从 Deck 拖起，建立新关系
      return handleWorkloadCardDropOnUnitSlot(dataService, workloadCardId, targetSlot);
    }
  }
  // BudgetCard → Budget 槽（budget_assign 关系，支持移动）
  if (budgetPayload) {
    // 只允许 BudgetCard 落在 Budget 类型的槽上
    if (targetSlot.type !== "budget") {
      return { outcome: "ignored", relationOutcome: "persisted" };
    }
    
    const parts = budgetPayload.split("|");
    const budgetCardId = parts[0];
    const sourceUnitId = parts[1];
    
    if (!budgetCardId) {
      return { outcome: "ignored", relationOutcome: "persisted" };
    }
    
    if (sourceUnitId) {
      // 新格式：从槽拖起，支持移动/解除
      if (sourceUnitId === targetUnitId) {
        return { outcome: "no_op_same_unit", relationOutcome: "persisted" }
      }
      return moveBudgetCardAssignment(dataService, budgetCardId, sourceUnitId, targetUnitId);
    } else {
      // 旧格式：从 Deck 拖起，建立新关系
      return handleBudgetCardDropOnUnitSlot(dataService, budgetCardId, targetSlot);
    }
  }
  return { outcome: "ignored", relationOutcome: "persisted" };
}

/**
 * drop：WorkloadCard 从槽拖出到 Canvas 空白/Deck 等槽外区域 → 纯解除 assign 关系。
 */
export async function onWorkloadCardDropOutsideSlots(
  dataService: DataService,
  dataTransfer: DataTransferLike
): Promise<DropTriggerResult> {
  const payload = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  if (!payload) {
    return { outcome: "ignored", relationOutcome: "persisted" };
  }
  const [workloadCardId, sourceUnitId] = payload.split("|");
  if (!workloadCardId || !sourceUnitId) {
    return { outcome: "ignored", relationOutcome: "persisted" };
  }
  const unassignResult = await unassignWorkloadCard(dataService, sourceUnitId, workloadCardId);
  return mapUnassignWorkloadResultToDropTrigger(unassignResult);
}

/**
 * drop：BudgetCard 从槽拖出到 Canvas 空白/Deck 等槽外区域 → 纯解除 assign 关系。
 */
export async function onBudgetCardDropOutsideSlots(
  dataService: DataService,
  dataTransfer: DataTransferLike
): Promise<DropTriggerResult> {
  const payload = dataTransfer.getData(BUDGET_CARD_DRAG_TYPE);
  if (!payload) {
    return { outcome: "ignored", relationOutcome: "persisted" };
  }
  const [budgetCardId, sourceUnitId] = payload.split("|");
  if (!budgetCardId || !sourceUnitId) {
    return { outcome: "ignored", relationOutcome: "persisted" };
  }
  const unassignResult = await unassignBudgetCard(dataService, budgetCardId, sourceUnitId);
  return mapUnassignBudgetResultToDropTrigger(unassignResult);
}

/**
 * 将 unassignUnitStructure 结果映射为 DropTriggerResult
 */
function mapUnassignUnitStructureResultToDropTrigger(result: {
  outcome: "unassigned" | "ignored" | "relation_failed" | "no_op";
  deactivatedRelation?: any;
}): DropTriggerResult {
  // 将 no_op 映射为 no_op_same_unit（语义一致：已在该单元，无需操作）
  if (result.outcome === "no_op") {
    return { outcome: "no_op_same_unit" }
  }
  if (result.outcome === "unassigned") {
    return { outcome: "unassigned", deactivatedRelation: result.deactivatedRelation }
  }
  if (result.outcome === "relation_failed") {
    return { outcome: "relation_failed" as const, error: "Relation creation failed" }
  }
  return { outcome: "ignored" }
}

/**
 * 将 unassignWorkloadCard 结果映射为 DropTriggerResult
 */
function mapUnassignWorkloadResultToDropTrigger(result: {
  outcome: "unassigned" | "no_op" | "ignored";
  deactivatedRelation?: any;
  invalidatedRecommendationIds?: string[];
  error?: string;
}): DropTriggerResult {
  // 将 no_op 映射为 no_op_same_unit
  if (result.outcome === "no_op") {
    return { outcome: "no_op_same_unit" }
  }
  if (result.outcome === "unassigned") {
    return { outcome: "unassigned", deactivatedRelation: result.deactivatedRelation }
  }
  return { outcome: "ignored" }
}

/**
 * 将 unassignBudgetCard 结果映射为 DropTriggerResult
 */
function mapUnassignBudgetResultToDropTrigger(result: {
  outcome: "unassigned" | "no_op" | "ignored";
  deactivatedRelation?: any;
}): DropTriggerResult {
  // 将 no_op 映射为 no_op_same_unit
  if (result.outcome === "no_op") {
    return { outcome: "no_op_same_unit" }
  }
  if (result.outcome === "unassigned") {
    return { outcome: "unassigned", deactivatedRelation: result.deactivatedRelation }
  }
  return { outcome: "ignored" }
}

/**
 * WorkloadCard 槽拖拽处理（兼容旧测试 API）
 */
export async function onWorkloadCardSlotDrop(
  dataService: DataService,
  dataTransfer: DataTransferLike,
  targetSlot: CardSlot
): Promise<DropTriggerResult> {
  return onCardSlotDrop(dataService, dataTransfer, targetSlot);
}

/**
 * WorkloadCard 槽拖拽开始（兼容旧测试 API）
 */
export function onWorkloadCardSlotDragStart(
  dataTransfer: DataTransferLike,
  workloadCardId: string,
  unitId: string
): void {
  dataTransfer.setData(WORKLOAD_CARD_DRAG_TYPE, `${workloadCardId}|${unitId}`);
}

/**
 * UnitCard 槽拖拽开始（兼容旧测试 API）
 */
export function onUnitCardSlotDragStart(
  dataTransfer: DataTransferLike,
  unitCardId: string,
  unitId: string
): void {
  dataTransfer.setData(UNIT_CARD_DRAG_TYPE, `${unitCardId}|${unitId}`);
}

/**
 * UnitCard 槽拖拽处理（兼容旧测试 API）
 */
export async function onUnitCardSlotDrop(
  dataService: DataService,
  dataTransfer: DataTransferLike,
  targetSlot: CardSlot
): Promise<DropTriggerResult> {
  return onCardSlotDrop(dataService, dataTransfer, targetSlot);
}

/**
 * 卡片拖拽到槽外（兼容旧测试 API）
 */
export async function onCardDropOutsideSlots(
  dataService: DataService,
  dataTransfer: DataTransferLike
): Promise<DropTriggerResult> {
  const unitPayload = dataTransfer.getData(UNIT_CARD_DRAG_TYPE);
  if (unitPayload) {
    return onUnitCardDropOutsideSlots(dataService, dataTransfer);
  }
  const workloadPayload = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  if (workloadPayload) {
    return onWorkloadCardDropOutsideSlots(dataService, dataTransfer);
  }
  const budgetPayload = dataTransfer.getData(BUDGET_CARD_DRAG_TYPE);
  if (budgetPayload) {
    return onBudgetCardDropOutsideSlots(dataService, dataTransfer);
  }
  return { outcome: "ignored", relationOutcome: "persisted" };
}

/**
 * UnitCard 槽拖拽开始（兼容旧测试 API - 别名）
 */
export function onUnitCardDragStartAlias(
  dataTransfer: DataTransferLike,
  unitCardId: string,
  sourceUnitId: string
): void {
  dataTransfer.setData(UNIT_CARD_DRAG_TYPE, `${unitCardId}|${sourceUnitId}`);
}

/**
 * 卡片拖拽到槽外（别名）
 */
export async function onCardDropOutsideSlotsAlias(
  dataService: DataService,
  dataTransfer: DataTransferLike
): Promise<DropTriggerResult> {
  const unitPayload = dataTransfer.getData(UNIT_CARD_DRAG_TYPE);
  if (unitPayload) {
    return onUnitCardDropOutsideSlots(dataService, dataTransfer);
  }
  const workloadPayload = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  if (workloadPayload) {
    return onWorkloadCardDropOutsideSlots(dataService, dataTransfer);
  }
  const budgetPayload = dataTransfer.getData(BUDGET_CARD_DRAG_TYPE);
  if (budgetPayload) {
    return onBudgetCardDropOutsideSlots(dataService, dataTransfer);
  }
  return { outcome: "ignored", relationOutcome: "persisted" };
}
