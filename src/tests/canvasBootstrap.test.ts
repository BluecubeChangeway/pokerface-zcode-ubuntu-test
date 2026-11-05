import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  asUnitCard,
  asWorkloadCard,
  cardById,
  deckCardsOf,
  ensureCanvasBootstrapped,
  resetCanvasBootstrapForTests,
  slotsOfUnit,
} from "../app/canvasBootstrap";
import { canvasStore } from "../stores/canvasStore";
import { deckStore } from "../stores/deckStore";
import { recommendationStore } from "../stores/recommendationStore";
import { dataService } from "../services/MockDataService";
import { mockCards, mockSlots } from "../mock/mockCards";
import type { CardSlot } from "../domain/card/types";
import {
  onWorkloadCardDragStart,
  onWorkloadCardSlotDrop,
  type DataTransferLike,
} from "../../app/dropInteraction";

const WORKLOAD = "workload-neurosurgery-outpatient";
const NEURO_UNIT = "unit-neurosurgery";

class MemoryDataTransfer implements DataTransferLike {
  private store = new Map<string, string>();
  setData(type: string, value: string): void {
    this.store.set(type, value);
  }
  getData(type: string): string {
    return this.store.get(type) ?? "";
  }
}

function draggedCardId(cardId: string): MemoryDataTransfer {
  const dt = new MemoryDataTransfer();
  onWorkloadCardDragStart(dt, cardId);
  return dt;
}

function resetCanvas(): void {
  canvasStore.setState({ cards: [], focusCardId: undefined });
}

describe("真实数据流竖切片：Canvas bootstrap / Deck 数据 / 动态 Slot / 链路回归", () => {
  beforeEach(() => {
    resetCanvas();
    resetCanvasBootstrapForTests();
    recommendationStore.getState().setRecommendations([]);
    deckStore.getState().setActiveType("unit");
  });

  it("A-1：空 canvasStore → 初始化恰好 10 个有 slot 的 UnitCard placement", () => {
    ensureCanvasBootstrapped(mockCards);
    const cards = canvasStore.getState().cards;
    expect(cards).toHaveLength(10);
    expect(cards.map((c) => c.cardId).sort()).toEqual(
      [
        "unit-director", 
        "unit-neurosurgery", 
        "unit-neurosurgery-ward-1", 
        "unit-nursing-team",
        "unit-neurosurgery-ward-2",
        "unit-intervention-room",
        "unit-internal-medicine",
        "unit-emergency",
        "unit-wang-xx",
        "unit-li-xx"
      ].sort()
    );
    // placement 有真实 UI 坐标
    for (const placement of cards) {
      expect(typeof placement.x).toBe("number");
      expect(typeof placement.y).toBe("number");
    }
  });

  it("A-2：再次初始化不产生重复 placement（模块标记 + cardId 幂等双保险）", () => {
    ensureCanvasBootstrapped(mockCards);
    ensureCanvasBootstrapped(mockCards); // 同一模块标记下二次调用
    expect(canvasStore.getState().cards).toHaveLength(10);

    // 越过模块标记直接重复 upsert 同一 placement：cardId 幂等（后写覆盖，不追加）
    const before = canvasStore.getState().cards;
    canvasStore.getState().upsertCardPlacement({ cardId: NEURO_UNIT, x: 999, y: 999 });
    const after = canvasStore.getState().cards;
    expect(after).toHaveLength(before.length);
    expect(after.filter((c) => c.cardId === NEURO_UNIT)).toHaveLength(1);
    // cardId 不重复（以 cardId 判重，不依赖引用/位置）
    const ids = after.map((c) => c.cardId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("A-3：React Strict Mode 双调用 ensureCanvasBootstrapped 仍只有 10 个 placement", () => {
    // 模拟 StrictMode 重复执行 init 副作用的场景：标记已挡住
    ensureCanvasBootstrapped(mockCards);
    resetCanvasBootstrapForTests(); // 模拟组件重挂载后标记被重建前的双调用窗口
    ensureCanvasBootstrapped(mockCards);
    ensureCanvasBootstrapped(mockCards);
    expect(canvasStore.getState().cards).toHaveLength(10);
  });

  it("B-1：Deck 按 activeType=workload 从真实 Card 数据取得全部 WorkloadCard（不产生 Fact）", () => {
    const workloadCards = deckCardsOf(mockCards, "workload");
    expect(workloadCards.length).toBe(9);
    for (const card of workloadCards) {
      expect(card.type).toBe("workload");
    }
    // deckStore 切换
    deckStore.getState().setActiveType("workload");
    expect(deckStore.getState().activeType).toBe("workload");
    deckStore.getState().setActiveType("unit");
    const unitCards = deckCardsOf(mockCards, "unit");
    expect(unitCards.length).toBe(10);
  });

  it("C-1：placement → 真实 Card 解析 + UnitCard → slots 按 ownerCardId 动态取得", () => {
    ensureCanvasBootstrapped(mockCards);
    for (const placement of canvasStore.getState().cards) {
      const card = cardById(mockCards, placement.cardId);
      const unit = asUnitCard(card);
      expect(unit).toBeDefined();
      const slots = slotsOfUnit(mockSlots, unit!);
      expect(slots.length).toBeGreaterThan(0);
      for (const slot of slots) {
        expect(slot.ownerCardId).toBe(unit!.id);
      }
    }
    // 类型收窄：workload 卡不是 unit
    const workload = asWorkloadCard(cardById(mockCards, WORKLOAD));
    expect(workload).toBeDefined();
    expect(asUnitCard(cardById(mockCards, WORKLOAD))).toBeUndefined();
  });

  it("D-1：真实数据流全链回归：Deck 卡 dragStart → Canvas UnitCard 的动态 workload slot drop → store 出现 resolution 推荐", async () => {
    ensureCanvasBootstrapped(mockCards);
    const unit = asUnitCard(cardById(mockCards, NEURO_UNIT))!;
    const workloadSlot = slotsOfUnit(mockSlots, unit).find(
      (s: CardSlot) => s.type === "workload"
    )!;
    expect(workloadSlot).toBeDefined();

    const ds = dataService; // 真实模块级 dataService（与 App 同源）
    const dt = draggedCardId(WORKLOAD);
    const result = await onWorkloadCardSlotDrop(ds, dt, workloadSlot);

    expect(result.outcome).toBe("resolved");
    const recs = recommendationStore.getState().getRecommendationsByKind("resolution");
    expect(recs).toHaveLength(1);
    expect(recs[0].status).toBe("recommended");
    expect(recs[0].relatedEntityIds).toEqual([WORKLOAD, NEURO_UNIT]);
  });

  it("D-2：拖到无 workload slot 的动态语义（unit slot）→ 静默取消（§20）", async () => {
    ensureCanvasBootstrapped(mockCards);
    const unit = asUnitCard(cardById(mockCards, NEURO_UNIT))!;
    const unitSlot = slotsOfUnit(mockSlots, unit).find((s: CardSlot) => s.type === "unit")!;

    const result = await onWorkloadCardSlotDrop(
      dataService,
      draggedCardId(WORKLOAD),
      unitSlot
    );
    expect(result.outcome).toBe("ignored");
    expect(recommendationStore.getState().getRecommendationsByKind("resolution")).toHaveLength(0);
  });

  it("D-3：重复 drop 同一 Deck 卡到同一动态 slot → D-142 同 ID、store 仅一条", async () => {
    ensureCanvasBootstrapped(mockCards);
    const unit = asUnitCard(cardById(mockCards, NEURO_UNIT))!;
    const workloadSlot = slotsOfUnit(mockSlots, unit).find(
      (s: CardSlot) => s.type === "workload"
    )!;

    const first = await onWorkloadCardSlotDrop(dataService, draggedCardId(WORKLOAD), workloadSlot);
    const second = await onWorkloadCardSlotDrop(dataService, draggedCardId(WORKLOAD), workloadSlot);

    expect(first.outcome).toBe("resolved");
    expect(second.outcome).toBe("resolved");
    if (first.outcome === "resolved" && second.outcome === "resolved") {
      expect(first.trigger).toBeDefined();
      expect(second.trigger).toBeDefined();
      if (first.trigger && second.trigger) {
      const firstId = first.trigger.recommendation.id;
      const secondId = second.trigger.recommendation.id;
      expect(secondId).toBe(firstId);
      expect(
        recommendationStore.getState().getRecommendationsByKind("resolution").filter(
          (r) => r.id === firstId
        )
      ).toHaveLength(1);
    }
    }
  });

  it("canvasStore.upsertCardPlacement 不触碰 focus / ghost / trail（纯 UI placement state）", () => {
    canvasStore.getState().setFocus("unit-x");
    canvasStore.getState().upsertCardPlacement({ cardId: "unit-y", x: 1, y: 2 });
    const state = canvasStore.getState();
    expect(state.focusCardId).toBe("unit-x"); // 不被 placement 写入改变
    expect(state.ghost).toBeUndefined();
    expect(state.trail).toHaveLength(0);
  });
});
