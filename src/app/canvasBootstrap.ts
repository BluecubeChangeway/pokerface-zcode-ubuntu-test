import { canvasStore } from "../stores/canvasStore";
import type { CanvasCardPlacement } from "../domain/canvas/types";
import type { AnyCard, CardSlot, CardType, UnitCard, WorkloadCard, BudgetCard } from "../domain/card/types";
import { isBusinessRevoked } from "../domain/workload/revocationService";
import type { Relation } from "../domain/relation/types";

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

/** 初始上 Canvas 的 UnitCard：所有 10 个 UnitCard 都有完整的 3 个槽位 */
const BOOTSTRAP_UNIT_IDS = [
  "unit-neurosurgery",
  "unit-neurosurgery-ward-1",
  "unit-neurosurgery-ward-2",
  "unit-intervention-room",
  "unit-internal-medicine",
  "unit-emergency",
  "unit-wang-xx",
  "unit-li-xx",
  "unit-nursing-team",
  "unit-director",
] as const;

/** 固定 UI 初始位置（纯展示坐标，无业务含义） - 2行5列布局 */
const BOOTSTRAP_POSITIONS: Record<string, { x: number; y: number }> = {
  "unit-neurosurgery": { x: 24, y: 24 },
  "unit-neurosurgery-ward-1": { x: 224, y: 24 },
  "unit-neurosurgery-ward-2": { x: 424, y: 24 },
  "unit-intervention-room": { x: 624, y: 24 },
  "unit-internal-medicine": { x: 824, y: 24 },
  "unit-emergency": { x: 24, y: 224 },
  "unit-wang-xx": { x: 224, y: 224 },
  "unit-li-xx": { x: 424, y: 224 },
  "unit-nursing-team": { x: 624, y: 224 },
  "unit-director": { x: 824, y: 224 },
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
 */
export function ensureCanvasBootstrapped(cards: AnyCard[]): void {
  if (bootstrapped) return;
  bootstrapped = true;
  for (const unitId of BOOTSTRAP_UNIT_IDS) {
    const unit = cards.find((c): c is UnitCard => c.id === unitId && c.type === "unit");
    if (!unit) continue;
    const position = BOOTSTRAP_POSITIONS[unit.id];
    canvasStore.getState().upsertCardPlacement({
      cardId: unit.id,
      x: position.x,
      y: position.y,
    });
  }
}

/** 重置内部标记（仅供测试使用，生产代码不得调用） */
export function resetCanvasBootstrapForTests(): void {
  bootstrapped = false;
}

/** Deck：按 CardGroup（activeType）从真实 Card 数据筛选（不产生 Domain Fact）。D-154：revoked 卡业务世界中等同不存在，不出现在 Deck */
export interface DeckCardsOfOptions {
  relations?: Relation[];
  includeAssigned?: boolean;
}

export function deckCardsOf(cards: AnyCard[], activeType: CardType, options?: DeckCardsOfOptions): AnyCard[] {
  const { relations = [], includeAssigned = false } = options || {};
  
  return cards.filter((c) => {
    if (c.type !== activeType) return false;
    if (isBusinessRevoked(c)) return false;
    
    if (!includeAssigned) {
      // 检查是否有 active 关系将该卡关联到其他单元/卡
      const hasActiveRelation = relations.some((r) => {
        if (!r.active) return false;
        // workload_assign: Unit -> Workload (targetId = workload card)
        if (r.type === "workload_assign" && r.targetId === c.id) return true;
        // budget_assign: Budget -> Unit (sourceId = budget card)
        if (r.type === "budget_assign" && r.sourceId === c.id) return true;
        // structure: Unit -> Unit (parent -> child), 这里不处理
        return false;
      });
      if (hasActiveRelation) return false;
    }
    return true;
  });
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

/** 类型收窄 helper：placement/Deck 项 → UnitCard / WorkloadCard / BudgetCard */
export function asUnitCard(card: AnyCard | undefined): UnitCard | undefined {
  return card && card.type === "unit" ? (card as UnitCard) : undefined;
}
export function asWorkloadCard(card: AnyCard | undefined): WorkloadCard | undefined {
  return card && card.type === "workload" ? (card as WorkloadCard) : undefined;
}
export function asBudgetCard(card: AnyCard | undefined): BudgetCard | undefined {
  return card && card.type === "budget" ? (card as BudgetCard) : undefined;
}

/** 仅供类型完整性引用（CanvasCardPlacement 形状由 domain 类型约束） */
export type { CanvasCardPlacement };
