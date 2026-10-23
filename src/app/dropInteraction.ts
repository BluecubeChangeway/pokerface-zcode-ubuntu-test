import type { DataService } from "../services/DataService";
import type { CardSlot } from "../domain/card/types";
import {
  handleWorkloadCardDropOnUnitSlot,
  type DropTriggerResult,
} from "../services/dropTrigger";
import {
  moveWorkloadCardAssignment,
  unassignWorkloadCard,
  type MoveRelationResult,
} from "../services/moveRelationEntry";

/**
 * 原生 HTML5 Drag & Drop 的最小交互 handler（Q-09-C UI 竖切片；
 * 2026-10-23 扩展 A-002b 拖出即解除 / 槽间移动路由）
 *
 * 职责仅限"DOM 拖放事件 ↔ 业务接线层"的参数转接与**按拖动来源路由**：
 * - dragStart（Deck 起）：只携带 workloadCardId，落槽走 D-150 建立关系（多槽共享合法）；
 * - dragStart（槽内卡起）：额外携带来源标记 originUnitId——
 *     · 落到**其他单元的槽** → 解除+新建 = 移动（A-002，moveRelationEntry）；
 *     · 落回**原槽** → no-op（放回原处，零变化）；
 *     · 落到**槽外**（画布空白/卡牌盒） → 纯解除（A-002b，unassignWorkloadCard）；
 * - drop（无 workloadCardId payload）→ 静默取消（AGENTS §20）。
 *
 * 本模块不含业务规则：判定与持久化全部在 moveRelationEntry / dropTrigger 及其下层。
 */

/** 拖放 payload：workloadCardId（唯一身份载体，D-150 既有语义不变） */
export const WORKLOAD_CARD_DRAG_TYPE = "text/workload-card-id";
/** 拖放 payload：来源标记——仅"从槽内拖起"时携带（A-002b 路由依据） */
export const WORKLOAD_CARD_ORIGIN_UNIT_DRAG_TYPE = "text/workload-card-origin-unit-id";

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
      /** 移动执行异常：如实透出（关系可能已部分成立，不静默吞掉） */
      outcome: "move_failed";
      error: string;
    };

/**
 * 槽上 drop：按拖动来源路由（详见模块头注释）。
 * Deck 来源（无来源标记）→ D-150 handleWorkloadCardDropOnUnitSlot（既有行为不变）。
 */
export async function onWorkloadCardSlotDrop(
  dataService: DataService,
  dataTransfer: DataTransferLike,
  slot: CardSlot
): Promise<SlotDropResult> {
  const workloadCardId = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  if (!workloadCardId) {
    return { outcome: "ignored" };
  }
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

/** 槽外 drop 的统一结果（A-002b 纯解除 / 无来源 = 静默） */
export type OutsideDropResult = {
  outcome: "unassigned" | "no_op" | "ignored";
  invalidatedRecommendationIds: string[];
  error?: string;
};

/**
 * 槽外 drop（画布空白 / 卡牌盒区域）：槽内卡拖出 = 解除（A-002b，
 * 以鼠标松开位置为判定——置于槽外任何区域均为纯解除，不建新关系）。
 * Deck 来源的卡落在槽外无业务含义 → 静默忽略。
 */
export async function onWorkloadCardDropOutsideSlots(
  dataService: DataService,
  dataTransfer: DataTransferLike
): Promise<OutsideDropResult> {
  const workloadCardId = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  if (!workloadCardId) {
    return { outcome: "ignored", invalidatedRecommendationIds: [] };
  }
  const originUnitId = dataTransfer.getData(WORKLOAD_CARD_ORIGIN_UNIT_DRAG_TYPE);
  if (!originUnitId) {
    // Deck 来源拖到槽外：无关系可解除，静默（AGENTS §20 同语义）
    return { outcome: "ignored", invalidatedRecommendationIds: [] };
  }
  return unassignWorkloadCard(dataService, workloadCardId, originUnitId);
}
