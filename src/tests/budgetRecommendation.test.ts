import { beforeEach, describe, expect, it } from "vitest";
import type { AnyCard, BudgetCard, CardSlot, UnitCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import { MockDataService } from "../services/MockDataService";
import { recommendationStore } from "../stores/recommendationStore";
import { analyzeBudgetAndRecommend, invalidateBudgetFeedback } from "../services/budgetRecommendation";
import { unassignBudgetCard } from "../services/budgetRelationEntry";
import {
  onBudgetCardDragStart,
  onCardSlotDrop,
  type DataTransferLike,
} from "../app/dropInteraction";

/**
 * A-007 预算域解析/推荐 + 反馈联动（用户 2026-10-26 裁定 + 设计批复）行为测试：
 * - 拖入 budget 槽 → 自动注册预算状态推荐（三类型之一，kind=budget_status，稳定 ID）；
 * - 解除 → 旧配对预算推荐失效（D-151 预算镜像）；移动 → 旧失效 + 新配对注册；
 * - accepted/ignored 历史不触碰；信息型推荐无执行链（不产生任何预算动作）。
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `brec${seq}`;
}

class MapDataTransfer implements DataTransferLike {
  private readonly values = new Map<string, string>();
  setData(type: string, value: string): void {
    this.values.set(type, value);
  }
  getData(type: string): string {
    return this.values.get(type) ?? "";
  }
}

function budgetCard(id: string, amount: number): BudgetCard {
  return {
    id, type: "budget", name: `预算-${id.slice(0, 8)}`,
    amount, configurationState: "configured",
  };
}

function unit(id: string): UnitCard {
  return {
    id, type: "unit", name: `单元-${id.slice(0, 8)}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
}

function budgetSlot(ownerId: string): CardSlot {
  return {
    id: `slot-${ownerId}`, type: "budget", ownerCardId: ownerId,
    enabled: true, locked: false, acceptedCardTypes: ["budget"],
    displayMode: "count", expanded: false,
  };
}

describe("A-007 预算推荐 + 反馈联动", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
  });

  it("拖入 budget 槽 → 自动注册预算状态推荐（allocation-status 类型，稳定 ID）", async () => {
    const s = nextSuffix();
    const bg = budgetCard(`bg-${s}`, 1_000_000);
    const targetUnit = unit(`u-t-${s}`);
    const ds = new MockDataService();
    await ds.saveCards([bg, targetUnit]);

    const dt = new MapDataTransfer();
    onBudgetCardDragStart(dt, bg.id, "");
    await onCardSlotDrop(ds, dt, budgetSlot(targetUnit.id));

    const rec = recommendationStore
      .getState()
      .recommendations.find((r) => r.id === `rec-budget-${bg.id}-${targetUnit.id}`);
    expect(rec).toBeDefined();
    expect(rec!.kind).toBe("budget_status");
    expect(rec!.status).toBe("recommended");
    expect(rec!.reason).toContain("总额");
    expect(rec!.reason).toContain("1,000,000");
  });

  it("重复拖入（幂等 reused）→ 推荐同 ID upsert 不重复注册", async () => {
    const s = nextSuffix();
    const bg = budgetCard(`bg-${s}`, 500_000);
    const targetUnit = unit(`u-t-${s}`);
    const ds = new MockDataService();
    await ds.saveCards([bg, targetUnit]);

    const dt1 = new MapDataTransfer();
    onBudgetCardDragStart(dt1, bg.id, "");
    await onCardSlotDrop(ds, dt1, budgetSlot(targetUnit.id));
    const dt2 = new MapDataTransfer();
    onBudgetCardDragStart(dt2, bg.id, "");
    await onCardSlotDrop(ds, dt2, budgetSlot(targetUnit.id));

    const recs = recommendationStore
      .getState()
      .recommendations.filter((r) => r.id === `rec-budget-${bg.id}-${targetUnit.id}`);
    expect(recs.length).toBe(1); // 同 ID upsert（D-142 精神）
  });

  it("解除 → 旧配对预算推荐失效；accepted 历史不动", async () => {
    const s = nextSuffix();
    const bg = budgetCard(`bg-${s}`, 800_000);
    const targetUnit = unit(`u-t-${s}`);
    const ds = new MockDataService();
    await ds.saveCards([bg, targetUnit]);
    // 建立关系 + 产生推荐
    const dt = new MapDataTransfer();
    onBudgetCardDragStart(dt, bg.id, "");
    await onCardSlotDrop(ds, dt, budgetSlot(targetUnit.id));
    // 一条 accepted 历史推荐（不被触碰）
    const acceptedHistory = {
      id: `rec-b-acc-${s}`, kind: "budget_status" as const,
      payload: {}, reason: "历史", status: "accepted" as const,
      createdAt: "2026-10-27T00:00:00.000Z", updatedAt: "2026-10-27T00:00:00.000Z",
      relatedEntityIds: [bg.id, targetUnit.id],
    };
    recommendationStore.getState().addRecommendation(acceptedHistory);

    // 解除
    await unassignBudgetCard(ds, bg.id, targetUnit.id);

    const remaining = recommendationStore.getState().recommendations;
    expect(remaining.some((r) => r.id === `rec-budget-${bg.id}-${targetUnit.id}` && r.status === "recommended")).toBe(false);
    expect(remaining.some((r) => r.id === `rec-b-acc-${s}` && r.status === "accepted")).toBe(true);
  });

  it("over-allocation 类型：occupied > total → 推荐含超限提示", async () => {
    const s = nextSuffix();
    const bg = budgetCard(`bg-${s}`, 100_000);
    const targetUnit = unit(`u-t-${s}`);
    const ds = new MockDataService();
    await ds.saveCards([bg, targetUnit]);
    // 预置一条超占用关系（occupied 150,000 > total 100,000）
    await ds.saveRelations([{
      id: `rel-occ-${s}`, type: "budget_occupancy",
      sourceId: bg.id, targetId: `wl-x-${s}`, active: true,
      metadata: { status: "confirmed", matchedAmount: 150_000 },
    }]);

    const dt = new MapDataTransfer();
    onBudgetCardDragStart(dt, bg.id, "");
    await onCardSlotDrop(ds, dt, budgetSlot(targetUnit.id));

    const rec = recommendationStore
      .getState()
      .recommendations.find((r) => r.id === `rec-budget-${bg.id}-${targetUnit.id}`);
    expect(rec).toBeDefined();
    expect(rec!.reason).toContain("超限");
  });

  it("invalidateBudgetFeedback：非 budget_status kind 不触碰", async () => {
    const s = nextSuffix();
    const bg = budgetCard(`bg-${s}`, 100);
    const targetUnit = unit(`u-t-${s}`);
    recommendationStore.getState().setRecommendations([
      {
        id: `rec-other-${s}`, kind: "resolution" as const,
        payload: { type: "use_existing_result" }, reason: "工作量推荐",
        status: "recommended" as const,
        createdAt: "t", updatedAt: "t",
        relatedEntityIds: [bg.id, targetUnit.id],
      },
    ]);
    invalidateBudgetFeedback(bg.id, targetUnit.id);
    expect(
      recommendationStore.getState().recommendations.some((r) => r.id === `rec-other-${s}`)
    ).toBe(true);
  });
});
