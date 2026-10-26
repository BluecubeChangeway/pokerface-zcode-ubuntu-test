import { canvasStore } from "../stores/canvasStore";
import type { CanvasCardPlacement } from "../domain/canvas/types";
import type { AnyCard, CardSlot, CardType, UnitCard, WorkloadCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import { isBusinessRevoked } from "../domain/workload/revocationService";

/**
 * 真实数据流竖切片的纯 selector + 一次性初始化（Q-09-C）
 *
 * 职责仅限 UI 数据转接：
 * - ensureCanvasBootstrapped：Canvas 初始 UnitCard placement（幂等，见下）
 * - deckCardsOf：Deck 按 activeType 从真实 Card 数据筛选
 * - slotsOfUnit：UnitCard → 其 slots（ownerCardId 关联，独立 slot 集合）
 *
 * 本模块不产生任何 Domain Fact / Relation；纯函数 + store UI state 写入。
 */

/** 初始上 Canvas 的 UnitCard：当前 mock 中确实拥有 slot 的 4 个（不扩充 mockSlots） */
const BOOTSTRAP_UNIT_IDS = [
  "unit-neurosurgery",
  "unit-neurosurgery-ward-1",
  "unit-nursing-team",
  "unit-director",
] as const;

/** 固定 UI 初始位置（纯展示坐标，无业务含义） */
const BOOTSTRAP_POSITIONS: Record<string, { x: number; y: number }> = {
  "unit-neurosurgery": { x: 24, y: 24 },
  "unit-neurosurgery-ward-1": { x: 324, y: 24 },
  "unit-nursing-team": { x: 24, y: 224 },
  "unit-director": { x: 324, y: 224 },
};

// 模块级一次性标记：配合 canvasStore 的 cardId 幂等 upsert，
// 双重保证 Strict Mode / 多次 render 下不会产生重复 placement。
let bootstrapped = false;

/**
 * Canvas 一次性初始化：为 4 个有 slot 的 UnitCard 写入 placement。
 *
 * 幂等保证（两层）：
 * 1. upsertCardPlacement 以 cardId 为唯一身份（同 cardId 后写覆盖，不追加第二条）；
 * 2. 模块级 bootstrapped 标记使初始化逻辑本身只执行一次。
 *
 * 先置标记风险修复（PROJECT_STATUS §16 原 Deferred 项"真实持久化适配器临近时处理"——
 * R4a-2 本地文件夹后端上线后该风险已可触发，2026-10-23 浏览器实测证实并修复）：
 * 空文件夹首启时第一次取数为空，若此时即消耗一次性标记，"灌入演示数据"后
 * 画布将不再初始化（须手动刷新才能看到单元卡）。修复 = 仅在**真正放置了
 * 至少一张卡**后才置标记——空数据不消耗机会；upsert 幂等保证重复调用安全。
 */
export function ensureCanvasBootstrapped(cards: AnyCard[]): void {
  if (bootstrapped) return;
  let placed = 0;
  for (const unitId of BOOTSTRAP_UNIT_IDS) {
    const unit = cards.find((c): c is UnitCard => c.id === unitId && c.type === "unit");
    if (!unit) continue;
    const position = BOOTSTRAP_POSITIONS[unit.id];
    canvasStore.getState().upsertCardPlacement({
      cardId: unit.id,
      x: position.x,
      y: position.y,
    });
    placed += 1;
  }
  if (placed > 0) {
    bootstrapped = true;
  }
}

/** 重置内部标记（仅供测试使用，生产代码不得调用） */
export function resetCanvasBootstrapForTests(): void {
  bootstrapped = false;
}

/**
 * 画布内卡片移动的拖放 payload 类型（U-UI-10 最小版重定位）：
 * 纯 UI 状态（placement 坐标），非业务事实（D-010），与工作量卡的业务拖放严格区分。
 */
export const CANVAS_MOVE_DRAG_TYPE = "text/canvas-move-card-id";

/**
 * 由 drop 坐标计算新的 placement（U-UI-10 最小版）：
 * - 以画布左上角为原点（drop 坐标减画布矩形偏移）；
 * - 画布有尺寸时夹取到边界内（卡片宽 180 / 高预留 80，不精确到像素——纯 UI 状态无业务含义）；
 * - 画布无尺寸信息（测试环境 happy-dom 的 getBoundingClientRect 全零）→ 不夹取，原样返回。
 */
export function computeDropPlacement(
  clientX: number,
  clientY: number,
  canvasRect: { left: number; top: number; width: number; height: number },
  cardWidth = 180
): { x: number; y: number } {
  const rawX = Math.max(0, clientX - canvasRect.left);
  const rawY = Math.max(0, clientY - canvasRect.top);
  if (canvasRect.width <= 0 || canvasRect.height <= 0) {
    return { x: rawX, y: rawY };
  }
  const clamp = (value: number, max: number) => Math.min(Math.max(0, value), Math.max(0, max));
  return {
    x: clamp(rawX, canvasRect.width - cardWidth),
    y: clamp(rawY, canvasRect.height - 80),
  };
}

/**
 * Deck：按 CardGroup（activeType）从真实 Card 数据筛选（不产生 Domain Fact）。
 * D-154：revoked 卡业务世界中等同不存在，不出现在 Deck。
 * A-008（用户 2026-10-26 裁定，"最早的需求说明里明确过"）：Deck = "当前上下文中可供
 * 用户发现和选择的卡牌集合"（历史 L6165）——已有 active 关联（被拖入卡槽成为关联卡）
 * 的卡不再出现在 Deck；解除关联（拖出）后自动还原。过滤从 Relations 投影，不新增
 * 领域概念（D-001 Relations 唯一事实源 + D-010 UI 状态从事实推导）。
 *
 * includeAssigned = false 为默认（过滤开启）；全院组织架构场景（大量卡处于关联中）
 * 可传 true 查看全部卡——过滤是 Deck 视图行为，不影响槽内显示/画布渲染。
 */
export function deckCardsOf(
  cards: AnyCard[],
  activeType: CardType,
  options?: { relations?: Relation[]; includeAssigned?: boolean }
): AnyCard[] {
  const filtered = cards.filter((c) => c.type === activeType && !isBusinessRevoked(c));
  if (options?.includeAssigned !== false || !options?.relations) {
    return filtered;
  }
  // A-008：有 active workload_assign / budget_assign 关联的卡 → 不显示在 Deck（还原 = 关系解除后过滤自动反转）
  const assignedCardIds = new Set<string>();
  for (const relation of options.relations) {
    if (
      relation.active &&
      (relation.type === "workload_assign" || relation.type === "budget_assign")
    ) {
      // workload_assign: Unit→Workload（targetId = 卡）；budget_assign: Budget→Unit（sourceId = 卡）
      assignedCardIds.add(relation.targetId);
      assignedCardIds.add(relation.sourceId);
    }
  }
  return filtered.filter((c) => !assignedCardIds.has(c.id));
}

/** Canvas：placement 对应的真实 Card（从当前 Card 数据解析）。D-154：revoked 卡在 Canvas 上等同不存在 */
export function cardById(cards: AnyCard[], cardId: string): AnyCard | undefined {
  const card = cards.find((c) => c.id === cardId);
  return card && !isBusinessRevoked(card) ? card : undefined;
}

/** UnitCard → 其 slots（slot 是独立集合，经 ownerCardId 关联取得） */
export function slotsOfUnit(slots: CardSlot[], unitCard: UnitCard): CardSlot[] {
  return slots.filter((s) => s.ownerCardId === unitCard.id);
}

/** 类型收窄 helper：placement/Deck 项 → UnitCard / WorkloadCard */
export function asUnitCard(card: AnyCard | undefined): UnitCard | undefined {
  return card && card.type === "unit" ? (card as UnitCard) : undefined;
}
export function asWorkloadCard(card: AnyCard | undefined): WorkloadCard | undefined {
  return card && card.type === "workload" ? (card as WorkloadCard) : undefined;
}

/** 仅供类型完整性引用（CanvasCardPlacement 形状由 domain 类型约束） */
export type { CanvasCardPlacement };
