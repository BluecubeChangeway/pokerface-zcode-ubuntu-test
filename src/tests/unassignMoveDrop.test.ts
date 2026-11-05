import { beforeEach, describe, expect, it } from "vitest";
import type { AnyCard, CardSlot, UnitCard, WorkloadCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import type { WorkloadResult } from "../domain/workload/types";
import type { Recommendation } from "../domain/recommendation/types";
import { MockDataService } from "../services/MockDataService";
import { recommendationStore } from "../stores/recommendationStore";
import { unassignWorkloadCard } from "../services/moveRelationEntry";
import { buildResolutionRecommendationId } from "../services/resolutionTrigger";
import {
  onWorkloadCardDragStart,
  onWorkloadCardDropOutsideSlots,
  onWorkloadCardSlotDragStart,
  onWorkloadCardSlotDrop,
  type DataTransferLike,
} from "../../app/dropInteraction";

/**
 * A-002b 拖出即解除 + 槽间移动路由（用户 2026-10-23 裁定）行为测试：
 * - 解除服务：释放关系（软删留痕）+ 配对级失效 + 不自动重推 + 幂等 no-op + 无效静默；
 * - 路由（dropInteraction）：槽→其他槽 = 移动（A-002）；槽→原槽 = no-op；
 *   Deck→槽 = D-150 建立关系（共享语义不变）；槽→画布/卡盒 = 纯解除；
 *   Deck→槽外 = 静默忽略。
 *
 * 口径：断言数据行与 store 状态结果，非函数调用计数。
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `unassign${seq}`;
}

/** 最小可测 DataTransfer（node 环境） */
class MapDataTransfer implements DataTransferLike {
  private readonly values = new Map<string, string>();
  setData(type: string, value: string): void {
    this.values.set(type, value);
  }
  getData(type: string): string {
    return this.values.get(type) ?? "";
  }
}

interface Universe {
  s: string;
  unitA: UnitCard;
  unitB: UnitCard;
  workResult: WorkloadResult;
  workCard: WorkloadCard;
  relations: Relation[];
}

function buildUniverse(s: string, opts?: { assignedToA?: boolean }): Universe {
  const unitA: UnitCard = {
    id: `u-a-${s}`, type: "unit", name: `内科-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const unitB: UnitCard = {
    id: `u-b-${s}`, type: "unit", name: `急诊-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const workResult: WorkloadResult = {
    id: `wr-${s}`, resultSetId: `rs-${s}`, resultItemId: `ri-${s}`,
    name: `门诊人次-${s}`, value: 100, dimensions: {},
  };
  const workCard: WorkloadCard = {
    id: `wl-${s}`, type: "workload", name: `门诊人次卡-${s}`,
    workloadResultId: workResult.id, configurationState: "configured",
  };
  const relations: Relation[] = [];
  if (opts?.assignedToA !== false) {
    relations.push({
      id: `rel-assign-a-${s}`, type: "workload_assign",
      sourceId: unitA.id, targetId: workCard.id, active: true,
    });
  }
  return { s, unitA, unitB, workResult, workCard, relations };
}

async function seed(ds: MockDataService, u: Universe): Promise<void> {
  const cards: AnyCard[] = [u.unitA, u.unitB, u.workCard];
  await ds.saveCards(cards);
  await ds.saveWorkloadResults([u.workResult]);
  await ds.saveRelations(u.relations);
}

function slotOf(unitId: string): CardSlot {
  return {
    id: `slot-${unitId}`,
    type: "workload",
    ownerCardId: unitId,
    enabled: true,
    locked: false,
    acceptedCardTypes: ["workload"],
    displayMode: "hand",
    expanded: false,
  };
}

function storeIds(): Set<string> {
  return new Set(recommendationStore.getState().recommendations.map((r) => r.id));
}

function makeRec(id: string, workloadCardId: string, unitId: string): Recommendation {
  return {
    id,
    kind: "resolution",
    payload: { type: "use_existing_result" },
    status: "recommended",
    createdAt: "2026-10-23T00:00:00.000Z",
    updatedAt: "2026-10-23T00:00:00.000Z",
    relatedEntityIds: [workloadCardId, unitId],
  };
}

describe("A-002b 解除服务（unassignWorkloadCard）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
  });

  it("解除：关系软删留痕、配对级失效、不自动重推、行不物理删除", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    const staleRecId = buildResolutionRecommendationId(u.workCard.id, u.unitA.id);
    recommendationStore.getState().setRecommendations([
      makeRec(staleRecId, u.workCard.id, u.unitA.id),
    ]);

    const result = await unassignWorkloadCard(ds, u.workCard.id, u.unitA.id);

    expect(result.outcome).toBe("unassigned");
    // 关系：软删留痕（行在、active=false），非物理删除
    const relations = await ds.getRelations();
    const row = relations.find((r) => r.id === `rel-assign-a-${s}`);
    expect(row).toBeDefined();
    expect(row!.active).toBe(false);
    // 配对级失效：旧当前反馈移除（D-151：关系已解除不提示）
    expect(result.invalidatedRecommendationIds).toEqual([staleRecId]);
    expect(storeIds().has(staleRecId)).toBe(false);
    // 不自动重推：解除后该卡无任何有效关系 → 无新推荐（区别于移动）
    expect(
      recommendationStore.getState().recommendations.filter((r) => r.kind === "resolution")
    ).toHaveLength(0);
  });

  it("幂等 no-op：无 active 关系时重复解除零变化", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { assignedToA: false });
    const ds = new MockDataService();
    await seed(ds, u);

    const result = await unassignWorkloadCard(ds, u.workCard.id, u.unitA.id);

    expect(result.outcome).toBe("no_op");
    expect(result.deactivatedRelation).toBeUndefined();
    // 本宇宙无该配对关系（共享存储中可能有前序测试残留——只断言本配对不存在）
    const relations = await ds.getRelations();
    expect(
      relations.some(
        (r) => r.type === "workload_assign" && r.sourceId === u.unitA.id && r.targetId === u.workCard.id
      )
    ).toBe(false);
  });

  it("无效参数静默 ignored：卡不存在 / revoked 卡", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const missing = await unassignWorkloadCard(ds, `wl-none-${s}`, u.unitA.id);
    expect(missing.outcome).toBe("ignored");
    const revokedCard = { ...u.workCard, businessStatus: "revoked" as const };
    await ds.saveCards([revokedCard]);
    const revoked = await unassignWorkloadCard(ds, u.workCard.id, u.unitA.id);
    expect(revoked.outcome).toBe("ignored");
    expect((await ds.getRelations()).find((r) => r.id === `rel-assign-a-${s}`)!.active).toBe(true);
  });
});

describe("A-002b/A-002 拖放路由（dropInteraction）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
  });

  it("槽→其他单元槽 = 移动：旧关系软删、新关系建立、新配对自动重推", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const dt = new MapDataTransfer();
    onWorkloadCardSlotDragStart(dt, u.workCard.id, u.unitA.id);
    const result = await onWorkloadCardSlotDrop(ds, dt, slotOf(u.unitB.id));

    expect(result.outcome).toBe("unit_moved");
    const relations = await ds.getRelations();
    expect(relations.find((r) => r.id === `rel-assign-a-${s}`)!.active).toBe(false);
    const newAssign = relations.find(
      (r) => r.active && r.type === "workload_assign" &&
        r.sourceId === u.unitB.id && r.targetId === u.workCard.id
    );
    expect(newAssign).toBeDefined();
    // 新配对自动重推（D-151 示例语义，A-002）
    expect(
      storeIds().has(buildResolutionRecommendationId(u.workCard.id, u.unitB.id))
    ).toBe(true);
  });

  it("槽→原槽 = no-op：零变化", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const dt = new MapDataTransfer();
    onWorkloadCardSlotDragStart(dt, u.workCard.id, u.unitA.id);
    const result = await onWorkloadCardSlotDrop(ds, dt, slotOf(u.unitA.id));

    expect(result.outcome).toBe("no_op_same_unit");
    expect((await ds.getRelations()).find((r) => r.id === `rel-assign-a-${s}`)!.active).toBe(true);
  });

  it("Deck→槽 = D-150 建立关系（共享语义不变；另一槽的既有 assign 不受影响）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const dt = new MapDataTransfer();
    onWorkloadCardDragStart(dt, u.workCard.id); // Deck 来源：无来源标记
    const result = await onWorkloadCardSlotDrop(ds, dt, slotOf(u.unitB.id));

    expect(result.outcome).toBe("resolved");
    const relations = await ds.getRelations();
    // 共享：A 槽的既有关系保持 active，B 槽新建（D-131 多槽共享合法）
    expect(relations.find((r) => r.id === `rel-assign-a-${s}`)!.active).toBe(true);
    expect(
      relations.some(
        (r) => r.active && r.type === "workload_assign" &&
          r.sourceId === u.unitB.id && r.targetId === u.workCard.id
      )
    ).toBe(true);
  });

  it("槽→画布/卡盒（槽外）= 纯解除（A-002b）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const dt = new MapDataTransfer();
    onWorkloadCardSlotDragStart(dt, u.workCard.id, u.unitA.id);
    const result = await onWorkloadCardDropOutsideSlots(ds, dt);

    expect(result.outcome).toBe("unassigned");
    expect((await ds.getRelations()).find((r) => r.id === `rel-assign-a-${s}`)!.active).toBe(false);
  });

  it("Deck→槽外 = 静默忽略（无来源标记，无关系可解除）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const dt = new MapDataTransfer();
    onWorkloadCardDragStart(dt, u.workCard.id);
    const result = await onWorkloadCardDropOutsideSlots(ds, dt);

    expect(result.outcome).toBe("ignored");
    expect((await ds.getRelations()).find((r) => r.id === `rel-assign-a-${s}`)!.active).toBe(true);
  });

  it("空 payload 槽外 drop = 静默（AGENTS §20）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const result = await onWorkloadCardDropOutsideSlots(ds, new MapDataTransfer());
    expect(result.outcome).toBe("ignored");
  });
});
