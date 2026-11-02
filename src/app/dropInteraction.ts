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
import { isBusinessRevoked } from "../domain/workload/revocationService";
import { createRelation } from "../domain/relation/relationService";
import { v4 as uuidv4 } from "uuid";
import type { RelationEndpointKind } from "../domain/relation/endpointRules";

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
 * dragStart：向 dataTransfer 写入 unitCardId。
 */
export function onUnitCardDragStart(
  dataTransfer: DataTransferLike,
  unitCardId: string
): void {
  dataTransfer.setData(UNIT_CARD_DRAG_TYPE, unitCardId);
}

/**
 * dragStart：从槽拖起 BudgetCard —— 携带来源 Unit 信息用于移动/解除路由。
 * payload: `budgetCardId|sourceUnitId`（竖线分隔）
 */
export function onBudgetCardDragStart(
  dataTransfer: DataTransferLike,
  budgetCardId: string,
  sourceUnitId: string
): void {
  dataTransfer.setData(BUDGET_CARD_DRAG_TYPE, `${budgetCardId}|${sourceUnitId}`);
}

/**
 * drop：读取 payload 并唯一转接 dropTrigger。
 * 无 payload（非 WorkloadCard 拖入）→ 静默取消（AGENTS §20 同语义）。
 * payload 格式: `workloadCardId|sourceUnitId`（竖线分隔，带来源单元信息）
 * 兼容旧格式：仅 workloadCardId（无源单元信息时作为 Deck→槽处理）
 */
export async function onWorkloadCardSlotDrop(
  dataService: DataService,
  dataTransfer: DataTransferLike,
  slot: CardSlot
): Promise<DropTriggerResult> {
  const payload = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  if (!payload) {
    return { outcome: "ignored" };
  }
  
  // 新格式: `workloadCardId|sourceUnitId` - 从槽拖起
  // 旧格式: 仅 workloadCardId - 从 Deck 拖起
  const parts = payload.split("|");
  if (parts.length === 2) {
    // 新格式：从槽拖起，支持移动/解除
    const [workloadCardId, sourceUnitId] = parts;
    if (!workloadCardId || !sourceUnitId) {
      return { outcome: "ignored" };
    }
    const targetUnitId = slot.ownerCardId;
    if (sourceUnitId === slot.ownerCardId) {
      return { outcome: "no_op_same_unit" };
    }
    const moveResult = await moveWorkloadCardAssignment(dataService, workloadCardId, sourceUnitId, slot.ownerCardId);
    return mapMoveResultToDropTrigger(moveResult);
  } else {
    // 旧格式：从 Deck 拖起，建立新关系
    const workloadCardId = payload;
    if (!workloadCardId) {
      return { outcome: "ignored" };
    }
    return handleWorkloadCardDropOnUnitSlot(dataService, workloadCardId, slot);
  }
}

/**
 * drop：UnitCard 拖到 Canvas 空白处 → 创建新 placement（无关系时回退 Deck 语义由 store 处理）
 */
export function onUnitCardCanvasDrop(
  dataTransfer: DataTransferLike,
  x: number,
  y: number
): UnitCardDropResult {
  const unitCardId = dataTransfer.getData(UNIT_CARD_DRAG_TYPE);
  if (!unitCardId) {
    return { outcome: "ignored" };
  }
  return handleUnitCardDropOnCanvas(unitCardId, x, y);
}

/**
 * drop：BudgetCard 拖到 UnitCard 的 Budget Slot 上
 */
export async function onBudgetCardSlotDrop(
  dataService: DataService,
  dataTransfer: DataTransferLike,
  slot: CardSlot
): Promise<DropTriggerResult> {
  const payload = dataTransfer.getData(BUDGET_CARD_DRAG_TYPE);
  if (!payload) {
    return { outcome: "ignored" };
  }
  
  // 新格式: `budgetCardId|sourceUnitId` - 从槽拖起
  // 旧格式: 仅 budgetCardId - 从 Deck 拖起
  const parts = payload.split("|");
  if (parts.length === 2 && parts[1]) {
    // 新格式：从槽拖起，支持移动/解除 (sourceUnitId 非空)
    const [budgetCardId, sourceUnitId] = parts;
    if (!budgetCardId || !sourceUnitId) {
      return { outcome: "ignored" };
    }
    const targetUnitId = slot.ownerCardId;
    if (sourceUnitId === slot.ownerCardId) {
      return { outcome: "no_op_same_unit" };
    }
    const moveResult = await moveBudgetCardAssignment(dataService, budgetCardId, sourceUnitId, slot.ownerCardId);
    return mapBudgetMoveResultToDropTrigger(moveResult);
  } else {
    // 旧格式：从 Deck 拖起，建立新关系
    // 兼容 payload 为 "budgetCardId|" (sourceUnitId 为空) 的情况
    const budgetCardId = parts[0];
    if (!budgetCardId) {
      return { outcome: "ignored" };
    }
    return handleBudgetCardDropOnUnitSlot(dataService, budgetCardId, slot);
  }
}

/**
 * dragStart：从槽拖起 BudgetCard —— 携带来源 Unit 信息用于移动/解除路由。
 * payload: `budgetCardId|sourceUnitId`（竖线分隔）
 */
export function onBudgetCardSlotDragStart(
  dataTransfer: DataTransferLike,
  budgetCardId: string,
  sourceUnitId: string
): void {
  dataTransfer.setData(BUDGET_CARD_DRAG_TYPE, `${budgetCardId}|${sourceUnitId}`);
}

/**
 * drop：WorkloadCard 从槽拖出到 Canvas 空白/Deck 等槽外区域 → 纯解除关系（无新建）。
 */
export async function onWorkloadCardDropOutsideSlots(
  dataService: DataService,
  dataTransfer: DataTransferLike
): Promise<DropTriggerResult> {
  const payload = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  if (!payload) {
    return { outcome: "ignored" };
  }
  const [workloadCardId, sourceUnitId] = payload.split("|");
  if (!workloadCardId || !sourceUnitId) {
    return { outcome: "ignored" };
  }
  const unassignResult = await unassignWorkloadCard(dataService, workloadCardId, sourceUnitId);
  return mapUnassignWorkloadResultToDropTrigger(unassignResult);
}

/**
 * drop：WorkloadCard 拖到另一个 WorkloadCard 上 → 创建 workload_split 关系（子卡关联）
 */
export async function onWorkloadCardDropOnWorkloadCard(
  dataService: DataService,
  dataTransfer: DataTransferLike,
  parentWorkloadCardId: string
): Promise<DropTriggerResult> {
  const childWorkloadCardId = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  if (!childWorkloadCardId) {
    return { outcome: "ignored" };
  }
  return handleWorkloadCardDropOnWorkloadCard(dataService, childWorkloadCardId, parentWorkloadCardId);
}

/**
 * dragStart：从槽拖起 WorkloadCard —— 携带来源 Unit 信息用于移动/解除路由。
 * payload: `workloadCardId|sourceUnitId`（竖线分隔）
 */
export function onWorkloadCardSlotDragStart(
  dataTransfer: DataTransferLike,
  workloadCardId: string,
  sourceUnitId: string
): void {
  dataTransfer.setData(WORKLOAD_CARD_DRAG_TYPE, `${workloadCardId}|${sourceUnitId}`);
}

/**
 * dragStart：从槽拖起 UnitCard —— 携带来源 Unit 信息用于移动/解除路由。
 * payload: `unitCardId|sourceUnitId`（竖线分隔）
 */
export function onUnitCardSlotDragStart(
  dataTransfer: DataTransferLike,
  unitCardId: string,
  sourceUnitId: string
): void {
  dataTransfer.setData(UNIT_CARD_DRAG_TYPE, `${unitCardId}|${sourceUnitId}`);
}

/**
 * drop：UnitCard 从槽拖入另一个单元的 Unit 槽 → 建立/移动 structure 关系。
 * payload 格式: `unitCardId|sourceUnitId`
 */
export function onUnitCardSlotDrop(
  dataService: DataService,
  dataTransfer: DataTransferLike,
  targetSlot: CardSlot
): Promise<DropTriggerResult> {
  return onCardSlotDrop(dataService, dataTransfer, targetSlot);
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
    return { outcome: "ignored" };
  }
  const [unitCardId, sourceUnitId] = payload.split("|");
  if (!unitCardId || !sourceUnitId) {
    return { outcome: "ignored" };
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
      return { outcome: "ignored" };
    }
    
    const parts = unitPayload.split("|");
    const unitCardId = parts[0];
    const sourceUnitId = parts[1];
    
    if (!unitCardId) {
      return { outcome: "ignored" };
    }
    
    // 旧格式：仅 unitCardId（从 Deck 拖起，建立新结构关系）
    // 新格式：unitCardId|sourceUnitId（从槽拖起，移动结构关系）
    if (sourceUnitId) {
      // 新格式：从槽拖起，移动结构关系
      if (sourceUnitId === targetUnitId) {
        return { outcome: "no_op_same_unit" };
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
        return { outcome: "no_op_same_unit" as const };
      }
      if (result.outcome === "relation_failed") {
        return { outcome: "relation_failed" as const, error: result.error || "Relation creation failed" };
      }
      return { outcome: "ignored" as const };
    } else {
      // 旧格式：从 Deck 拖起，建立新结构关系（父=目标槽的单元，子=拖拽的单元）
      // 自环禁止：子单元不能是目标单元自身（P2-1 自环禁止）
      if (unitCardId === targetUnitId) {
        return { outcome: "ignored" };
      }
      // 检查卡片是否被撤销（D-154：revoked 卡静默忽略）
      const cards = await dataService.getCards();
      const unitCard = cards.find((c) => c.id === unitCardId && c.type === "unit");
      if (!unitCard || isBusinessRevoked(unitCard)) {
        return { outcome: "ignored" };
      }
      // 检查是否已存在该结构关系
      const relations = await dataService.getRelations();
      const existing = relations.find(
        r => r.active && r.type === "structure" && r.sourceId === targetUnitId && r.targetId === unitCardId
      );
      if (existing) {
        return { outcome: "structure_resolved", relationOutcome: "reused", relation: existing };
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
      const { checkAndRecommendUnitSplit } = await import("../services/unitSplitService");
      const recommendation = checkAndRecommendUnitSplit(unitCardId, targetUnitId);
      if (!recommendation) {
        return { outcome: "structure_resolved", relationOutcome: "persisted", relation };
      }
      // 返回推荐已创建，等待用户确认
      return { outcome: "structure_recommendation_created", recommendation, relationOutcome: "persisted", relation };
    }
}
// WorkloadCard → Workload 槽（workload_assign 关系，支持移动）
  if (workloadPayload) {
    // 只允许 WorkloadCard 落在 Workload 类型的槽上
    if (targetSlot.type !== "workload") {
      return { outcome: "ignored" };
    }
    
    const parts = workloadPayload.split("|");
    const workloadCardId = parts[0];
    const sourceUnitId = parts[1];
    
    if (!workloadCardId) {
      return { outcome: "ignored" };
    }
    
    if (sourceUnitId) {
      // 新格式：从槽拖起，支持移动/解除
      if (sourceUnitId === targetUnitId) {
        return { outcome: "no_op_same_unit" };
      }
      return moveWorkloadCardAssignment(dataService, workloadCardId, sourceUnitId, targetUnitId);
    } else {
      // 旧格式：从 Deck 拖起，建立新关系
      return handleWorkloadCardDropOnUnitSlot(dataService, workloadCardId, targetSlot);
    }
  }

  // BudgetCard → Budget 槽（budget_assign 关系）
  if (budgetPayload) {
    // 只允许 BudgetCard 落在 Budget 类型的槽上
    if (targetSlot.type !== "budget") {
      return { outcome: "ignored" };
    }
    
    // 支持新旧两种格式: `budgetCardId|sourceUnitId` (从槽拖起) 或 `budgetCardId|` / `budgetCardId` (从 Deck 拖起)
    const parts = budgetPayload.split("|");
    const budgetCardId = parts[0];
    console.log('[DEBUG onCardSlotDrop] budgetPayload:', budgetPayload, 'budgetCardId:', budgetCardId, 'targetSlot:', targetSlot.ownerCardId);
    if (!budgetCardId) {
      return { outcome: "ignored" };
    }
    return handleBudgetCardDropOnUnitSlot(dataService, budgetCardId, targetSlot);
  }

  return { outcome: "ignored" };
}

/**
 * drop：Card 从槽拖出到 Canvas 空白/Deck 等槽外区域 → 根据类型解除对应关系。
 */
export async function onCardDropOutsideSlots(
  dataService: DataService,
  dataTransfer: DataTransferLike
): Promise<DropTriggerResult> {
  const unitPayload = dataTransfer.getData(UNIT_CARD_DRAG_TYPE);
  const workloadPayload = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  // BudgetCard 没有源 Unit 信息，不支持槽外解除

  if (unitPayload) {
    const [unitCardId, sourceUnitId] = unitPayload.split("|");
    if (!unitCardId || !sourceUnitId) {
      return { outcome: "ignored" };
    }
    return unassignUnitStructure(dataService, unitCardId, sourceUnitId);
  }

  if (workloadPayload) {
    const [workloadCardId, sourceUnitId] = workloadPayload.split("|");
    if (!workloadCardId || !sourceUnitId) {
      return { outcome: "ignored" };
    }
    const unassignResult = await unassignWorkloadCard(dataService, workloadCardId, sourceUnitId);
    return mapUnassignWorkloadResultToDropTrigger(unassignResult);
  }

  return { outcome: "ignored" };
}

/**
 * 将 MoveRelationResult 映射为 DropTriggerResult
 */
function mapMoveResultToDropTrigger(result: import("../services/moveRelationEntry").MoveRelationResult): import("../services/dropTrigger").DropTriggerResult {
  if (result.outcome === "moved") {
    return {
      outcome: "unit_moved",
      relationOutcome: result.relationOutcome || "persisted",
      relation: result.relation!,
      deactivatedRelation: result.deactivatedRelation,
    } as import("../services/dropTrigger").DropTriggerResult;
  }
  if (result.outcome === "no_op_same_unit") {
    return { outcome: "no_op_same_unit" } as import("../services/dropTrigger").DropTriggerResult;
  }
  if (result.outcome === "relation_failed") {
    return { outcome: "relation_failed", error: result.error || "Relation creation failed" } as import("../services/dropTrigger").DropTriggerResult;
  }
  return { outcome: "ignored" } as import("../services/dropTrigger").DropTriggerResult;
}

/**
 * 将 BudgetMoveRelationResult 映射为 DropTriggerResult
 */
function mapBudgetMoveResultToDropTrigger(result: import("../services/budgetRelationEntry").BudgetMoveRelationResult): import("../services/dropTrigger").DropTriggerResult {
  if (result.outcome === "moved") {
    return {
      outcome: "budget_moved",
      relationOutcome: result.relationOutcome || "persisted",
      relation: result.relation!,
      deactivatedRelation: result.deactivatedRelation,
    } as import("../services/dropTrigger").DropTriggerResult;
  }
  if (result.outcome === "no_op_same_unit") {
    return { outcome: "no_op_same_unit" } as import("../services/dropTrigger").DropTriggerResult;
  }
  if (result.outcome === "relation_failed") {
    return { outcome: "relation_failed", error: result.error || "Relation creation failed" } as import("../services/dropTrigger").DropTriggerResult;
  }
  return { outcome: "ignored" } as import("../services/dropTrigger").DropTriggerResult;
}

/**
 * 将 UnitMoveResult 映射为 DropTriggerResult
 */
function mapUnitMoveResultToDropTrigger(result: import("../services/unitRelationEntry").UnitMoveResult): import("../services/dropTrigger").DropTriggerResult {
  if (result.outcome === "moved") {
    return {
      outcome: "unit_moved",
      relationOutcome: result.relationOutcome || "persisted",
      relation: result.relation!,
      deactivatedRelation: result.deactivatedRelation,
    } as import("../services/dropTrigger").DropTriggerResult;
  }
  if (result.outcome === "no_op_same_unit") {
    return { outcome: "no_op_same_unit" } as import("../services/dropTrigger").DropTriggerResult;
  }
  if (result.outcome === "relation_failed") {
    return { outcome: "relation_failed", error: result.error || "Relation creation failed" } as import("../services/dropTrigger").DropTriggerResult;
  }
  return { outcome: "ignored" } as import("../services/dropTrigger").DropTriggerResult;
}

/**
 * 将 unassignWorkloadCard 结果映射为 DropTriggerResult
 */
function mapUnassignWorkloadResultToDropTrigger(result: Awaited<ReturnType<typeof import("../services/moveRelationEntry").unassignWorkloadCard>>): import("../services/dropTrigger").DropTriggerResult {
  if (result.outcome === "unassigned") {
    return { outcome: "unassigned", deactivatedRelation: result.deactivatedRelation } as import("../services/dropTrigger").DropTriggerResult;
  }
  if (result.outcome === "no_op") {
    return { outcome: "ignored" } as import("../services/dropTrigger").DropTriggerResult;
  }
  return { outcome: "ignored" } as import("../services/dropTrigger").DropTriggerResult;
}

/**
 * 将 unassignUnitStructure 结果映射为 DropTriggerResult
 */
function mapUnassignUnitStructureResultToDropTrigger(result: Awaited<ReturnType<typeof import("../services/unitRelationEntry").unassignUnitStructure>>): import("../services/dropTrigger").DropTriggerResult {
  if (result.outcome === "unassigned") {
    return { outcome: "unassigned", deactivatedRelation: result.deactivatedRelation } as import("../services/dropTrigger").DropTriggerResult;
  }
  if (result.outcome === "no_op") {
    return { outcome: "ignored" } as import("../services/dropTrigger").DropTriggerResult;
  }
  return { outcome: "ignored" } as import("../services/dropTrigger").DropTriggerResult;
}

/**
 * 将 unassignBudgetCard 结果映射为 DropTriggerResult
 */
function mapUnassignBudgetResultToDropTrigger(result: Awaited<ReturnType<typeof import("../services/budgetRelationEntry").unassignBudgetCard>>): import("../services/dropTrigger").DropTriggerResult {
  if (result.outcome === "unassigned") {
    return { outcome: "unassigned", deactivatedRelation: result.deactivatedRelation } as import("../services/dropTrigger").DropTriggerResult;
  }
  if (result.outcome === "no_op") {
    return { outcome: "ignored" } as import("../services/dropTrigger").DropTriggerResult;
  }
  return { outcome: "ignored" } as import("../services/dropTrigger").DropTriggerResult;
}