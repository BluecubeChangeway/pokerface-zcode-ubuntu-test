import type { DataService } from "../services/DataService";
import type { CardSlot } from "../domain/card/types";
import {
  handleBudgetCardDropOnUnitSlot,
  handleWorkloadCardDropOnUnitSlot,
  type DropTriggerResult,
} from "../services/dropTrigger";
import {
  moveBudgetCardAssignment,
  unassignBudgetCard,
} from "../services/budgetRelationEntry";
import {
  moveWorkloadCardAssignment,
  unassignWorkloadCard,
  type MoveRelationResult,
} from "../services/moveRelationEntry";

/**
 * 原生 HTML5 Drag & Drop 的最小交互 handler（Q-09-C UI 竖切片；
 * 2026-10-23 扩展 A-002b 拖出即解除 / 槽间移动路由；
 * 2026-10-26 扩展 U-UI-13 预算卡同款交互）
 *
 * 职责仅限"DOM 拖放事件 ↔ 业务接线层"的参数转接与**按拖动来源路由**：
 * - dragStart（Deck 起）：只携带卡 ID，落槽走 D-150 建立关系（多槽共享合法）——
 *   Workload 卡 → Workload 槽 → workload_assign + Resolution；
 *   Budget 卡 → Budget 槽 → budget_assign（Q-05 封板语义，**无** Resolution——
 *   Resolution 是工作量域机制 D-128）；
 * - dragStart（槽内卡起）：额外携带来源标记 originUnitId——
 *     · 落到**其他单元的同类槽** → 解除+新建 = 移动（A-002 / A-002b 预算镜像）；
 *     · 落回**原槽** → no-op（放回原处，零变化）；
 *     · 落到**槽外**（画布空白/卡牌盒） → 纯解除（A-002b）；
 * - 交叉目标（Workload 卡落 Budget 槽 / Budget 卡落 Workload 槽）→ 静默 ignored
 *   （AGENTS §20：无效目标）。
 *
 * 本模块不含业务规则：判定与持久化全部在 dropTrigger / moveRelationEntry /
 * budgetRelationEntry 及其下层。
 */

/** 拖放 payload：workloadCardId（唯一身份载体，D-150 既有语义不变） */
export const WORKLOAD_CARD_DRAG_TYPE = "text/workload-card-id";
/** 拖放 payload：来源标记——仅"从槽内拖起"时携带（A-002b 路由依据） */
export const WORKLOAD_CARD_ORIGIN_UNIT_DRAG_TYPE = "text/workload-card-origin-unit-id";
/** 拖放 payload：budgetCardId（U-UI-13 预算镜像，与 workload 载体严格区分） */
export const BUDGET_CARD_DRAG_TYPE = "text/budget-card-id";
/** 拖放 payload：预算卡来源标记（U-UI-13 预算镜像） */
export const BUDGET_CARD_ORIGIN_UNIT_DRAG_TYPE = "text/budget-card-origin-unit-id";

/** 浏览器 DataTransfer 的最小可测形状（node 测试环境无 DOM） */
export interface DataTransferLike {
  setData(type: string, value: string): void;
  getData(type: string): string;
}

/**
 * dragStart（Deck 来源）：只携带 workloadCardId。
 * 不修改 Canvas focus / 任何 store——Deck → 槽 = D-150 建立关系（多槽共享合法）。
 */
export function onWorkloadCardDragStart(
  dataTransfer: DataTransferLike,
  workloadCardId: string
): void {
  dataTransfer.setData(WORKLOAD_CARD_DRAG_TYPE, workloadCardId);
}

/**
 * dragStart（槽内卡来源）：携带 workloadCardId + 来源标记（A-002b）。
 * 来源标记仅供"最终位置"路由判定，不创建/修改任何关系。
 */
export function onWorkloadCardSlotDragStart(
  dataTransfer: DataTransferLike,
  workloadCardId: string,
  originUnitId: string
): void {
  dataTransfer.setData(WORKLOAD_CARD_DRAG_TYPE, workloadCardId);
  dataTransfer.setData(WORKLOAD_CARD_ORIGIN_UNIT_DRAG_TYPE, originUnitId);
}

/**
 * dragStart（Deck 来源，预算卡）：只携带 budgetCardId（U-UI-13 预算镜像）。
 * Budget 卡 → Budget 槽 = budget_assign 建立关系（Q-05 / D-023）。
 */
export function onBudgetCardDragStart(
  dataTransfer: DataTransferLike,
  budgetCardId: string
): void {
  dataTransfer.setData(BUDGET_CARD_DRAG_TYPE, budgetCardId);
}

/** dragStart（预算槽内芯片来源）：携带 budgetCardId + 来源标记（U-UI-13 预算镜像） */
export function onBudgetCardSlotDragStart(
  dataTransfer: DataTransferLike,
  budgetCardId: string,
  originUnitId: string
): void {
  dataTransfer.setData(BUDGET_CARD_DRAG_TYPE, budgetCardId);
  dataTransfer.setData(BUDGET_CARD_ORIGIN_UNIT_DRAG_TYPE, originUnitId);
}

/** 槽内 drop 的统一结果（D-150 建立关系 / A-002 移动 / 原槽 no-op / 静默） */
export type SlotDropResult =
  | DropTriggerResult
  | { outcome: "no_op_same_unit" }
  | {
      /** A-002 移动：解除来源槽关系 + 建立目标槽关系 + 新配对自动重推 */
      outcome: "moved";
      move: MoveRelationResult;
    }
  | {
      /** U-UI-13 预算拖入（budget_assign 建立或幂等复用；无 Resolution） */
      outcome: "budget_resolved";
      relationOutcome: "persisted" | "reused";
      relationId: string;
    }
  | {
      /** A-002 / U-UI-13 预算移动：解除+新建（无解析/反馈联动） */
      outcome: "budget_moved";
      deactivatedRelationId?: string;
      relationId: string;
      relationOutcome: "persisted" | "reused";
    }
  | {
      /** 移动执行异常：如实透出（关系可能已部分成立，不静默吞掉） */
      outcome: "move_failed";
      error: string;
    };

/**
 * 槽上 drop：按拖动 payload 类型与来源路由（详见模块头注释）。
 * Workload 载体 → 既有 A-002/A-002b 路由；Budget 载体 → U-UI-13 预算镜像路由。
 * 两者均无（非本模块卡型）→ 静默 ignored。
 */
export async function onCardSlotDrop(
  dataService: DataService,
  dataTransfer: DataTransferLike,
  slot: CardSlot
): Promise<SlotDropResult> {
  // ── Workload 载体（D-150 / A-002 / A-002b 既有路径，行为不变）──
  const workloadCardId = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  if (workloadCardId) {
    const originUnitId = dataTransfer.getData(WORKLOAD_CARD_ORIGIN_UNIT_DRAG_TYPE);
    if (!originUnitId || !slot.ownerCardId) {
      // Deck 来源（或槽无属主）：D-150 建立关系路径，行为不变
      return handleWorkloadCardDropOnUnitSlot(dataService, workloadCardId, slot);
    }
    if (originUnitId === slot.ownerCardId) {
      // 拖回原槽：放回原处，零变化（A-002b）
      return { outcome: "no_op_same_unit" };
    }
    // 槽 → 其他单元的槽：解除 + 新建 = 移动（A-002）
    try {
      const move = await moveWorkloadCardAssignment(
        dataService,
        workloadCardId,
        originUnitId,
        slot.ownerCardId
      );
      return { outcome: "moved", move };
    } catch (error) {
      return {
        outcome: "move_failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ── Budget 载体（U-UI-13 预算镜像：Q-05 budget_assign，无 Resolution）──
  const budgetCardId = dataTransfer.getData(BUDGET_CARD_DRAG_TYPE);
  if (budgetCardId) {
    const originUnitId = dataTransfer.getData(BUDGET_CARD_ORIGIN_UNIT_DRAG_TYPE);
    if (!originUnitId || !slot.ownerCardId) {
      // Deck 来源：budget 槽 → budget_assign 建立关系；非 budget 槽（含 workload 槽）→ 静默
      const drop = await handleBudgetCardDropOnUnitSlot(dataService, budgetCardId, slot);
      if (drop.outcome === "resolved") {
        return {
          outcome: "budget_resolved",
          relationOutcome: drop.relationOutcome,
          relationId: drop.relation.id,
        };
      }
      return drop;
    }
    if (originUnitId === slot.ownerCardId) {
      return { outcome: "no_op_same_unit" };
    }
    // 预算槽间移动（A-002 镜像；无解析/反馈联动）
    try {
      const move = await moveBudgetCardAssignment(
        dataService,
        budgetCardId,
        originUnitId,
        slot.ownerCardId
      );
      if (move.outcome === "moved") {
        return {
          outcome: "budget_moved",
          deactivatedRelationId: move.deactivatedRelation?.id,
          relationId: move.relation!.id,
          relationOutcome: move.relationOutcome!,
        };
      }
      return { outcome: "no_op_same_unit" };
    } catch (error) {
      return {
        outcome: "move_failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { outcome: "ignored" };
}

/**
 * 槽外 drop 的统一结果（A-002b 纯解除 / 无来源 = 静默）。
 * U-UI-13 预算镜像：预算芯片拖出 = 解除 budget_assign（无反馈联动字段）。
 */
export type OutsideDropResult = {
  outcome: "unassigned" | "no_op" | "ignored";
  invalidatedRecommendationIds: string[];
  error?: string;
};

/**
 * 槽外 drop（画布空白 / 卡牌盒区域）：槽内卡拖出 = 解除（A-002b，
 * 以鼠标松开位置为判定——置于槽外任何区域均为纯解除，不建新关系）。
 * Deck 来源的卡落在槽外无业务含义 → 静默忽略。
 * Budget 载体走预算镜像（unassignBudgetCard，无反馈联动）。
 */
export async function onCardDropOutsideSlots(
  dataService: DataService,
  dataTransfer: DataTransferLike
): Promise<OutsideDropResult> {
  const workloadCardId = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  if (workloadCardId) {
    const originUnitId = dataTransfer.getData(WORKLOAD_CARD_ORIGIN_UNIT_DRAG_TYPE);
    if (!originUnitId) {
      // Deck 来源拖到槽外：无关系可解除，静默（AGENTS §20 同语义）
      return { outcome: "ignored", invalidatedRecommendationIds: [] };
    }
    return unassignWorkloadCard(dataService, workloadCardId, originUnitId);
  }
  const budgetCardId = dataTransfer.getData(BUDGET_CARD_DRAG_TYPE);
  if (budgetCardId) {
    const originUnitId = dataTransfer.getData(BUDGET_CARD_ORIGIN_UNIT_DRAG_TYPE);
    if (!originUnitId) {
      return { outcome: "ignored", invalidatedRecommendationIds: [] };
    }
    const result = await unassignBudgetCard(dataService, budgetCardId, originUnitId);
    return { outcome: result.outcome, invalidatedRecommendationIds: [] };
  }
  return { outcome: "ignored", invalidatedRecommendationIds: [] };
}

/** 既有引用兼容别名（App 与既有测试使用统一路由入口的同义名） */
export const onWorkloadCardSlotDrop = onCardSlotDrop;
export const onWorkloadCardDropOutsideSlots = onCardDropOutsideSlots;
