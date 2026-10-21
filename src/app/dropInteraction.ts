import type { DataService } from "../services/DataService";
import type { CardSlot } from "../domain/card/types";
import {
  handleWorkloadCardDropOnUnitSlot,
  type DropTriggerResult,
} from "../services/dropTrigger";

/**
 * 原生 HTML5 Drag & Drop 的最小交互 handler（Q-09-C UI 竖切片）
 *
 * 职责仅限"DOM 拖放事件 ↔ 业务接线层"的参数转接：
 * - dragStart：只携带 workloadCardId（不触碰 Canvas focus、不创建 Relation）
 * - drop：读取 payload 后唯一经过 handleWorkloadCardDropOnUnitSlot（dropTrigger），
 *   不直接调用 resolutionTrigger
 *
 * 本模块不包含业务规则：合法性判定与静默取消语义全部在 dropTrigger 及其下层。
 */

/** 拖放 payload 唯一载体：仅 workloadCardId */
export const WORKLOAD_CARD_DRAG_TYPE = "text/workload-card-id";

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
 * drop：读取 payload 并唯一转接 dropTrigger。
 * 无 payload（非 WorkloadCard 拖入）→ 静默取消（AGENTS §20 同语义）。
 */
export function onWorkloadCardSlotDrop(
  dataService: DataService,
  dataTransfer: DataTransferLike,
  slot: CardSlot
): Promise<DropTriggerResult> {
  const workloadCardId = dataTransfer.getData(WORKLOAD_CARD_DRAG_TYPE);
  if (!workloadCardId) {
    return Promise.resolve({ outcome: "ignored" });
  }
  return handleWorkloadCardDropOnUnitSlot(dataService, workloadCardId, slot);
}
