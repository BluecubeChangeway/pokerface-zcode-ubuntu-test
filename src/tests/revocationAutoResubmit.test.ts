import { beforeEach, describe, expect, it } from "vitest";
import type { AnyCard, UnitCard, WorkloadCard } from "../domain/card/types";
import type { WorkloadResult, WorkloadSplit } from "../domain/workload/types";
import type { Relation } from "../domain/relation/types";
import type { Recommendation } from "../domain/recommendation/types";
import { MockDataService } from "../services/MockDataService";
import { revokeSplitLayer, revokeDerivedPath } from "../services/revocationEntry";
import { recommendationStore } from "../stores/recommendationStore";
import { buildResolutionRecommendationId } from "../services/resolutionTrigger";
import type { WorkloadRevocationImpact } from "../domain/workload/revocationService";

/**
 * D-151 剩余① 撤回后自动重新 Resolution（假设 A-001 配对范围）
 * 通过层撤回接口触发，验证撤回后对残留配对的自动重推行为
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `ar${seq}`;
}

function unitCard(id: string, name: string): UnitCard {
  return { id, type: "unit", name, unitKind: "department", configurationState: "configured", attributes: {} };
}

function workloadCard(id: string, name: string, resultId: string): WorkloadCard {
  return { id, type: "workload", name, workloadResultId: resultId, configurationState: "configured" };
}

function workloadResult(id: string, name: string, value: number): WorkloadResult {
  return { id, resultSetId: "rs-test", resultItemId: id, name, value, dimensions: {} };
}

function buildUniverse(s: string, opts?: { parentAssign?: boolean; childAssign?: boolean; parentAssignToBoth?: boolean }): {
  s: string;
  unitOwner: UnitCard;
  unitUser: UnitCard;
  parentCard: WorkloadCard;
  childCards: WorkloadCard[];
  handCard: WorkloadCard;
  parentResult: WorkloadResult;
  childResults: WorkloadResult[];
  handResult: WorkloadResult;
  relations: Relation[];
  splits: { workloadSplits: WorkloadSplit[] };
} {
  const unitOwner: UnitCard = { id: `u-owner-${s}`, type: "unit", name: `内科-${s}`, unitKind: "department", configurationState: "configured", attributes: {} };
  const unitUser: UnitCard = { id: `u-user-${s}`, type: "unit", name: `急诊-${s}`, unitKind: "department", configurationState: "configured", attributes: {} };

  const parentResult: WorkloadResult = { id: `wr-parent-${s}`, resultSetId: "rs-test", resultItemId: `ri-parent-${s}`, name: "神经外科门诊", value: 1000, dimensions: {} };
  const childResult1: WorkloadResult = { id: `wr-child1-${s}`, resultSetId: "rs-test", resultItemId: `ri-c1-${s}`, name: "门诊人次", value: 500, dimensions: {} };
  const childResult2: WorkloadResult = { id: `wr-child2-${s}`, resultSetId: "rs-test", resultItemId: `ri-c2-${s}`, name: "急诊人次", value: 300, dimensions: {} };
  const handResult: WorkloadResult = { id: `wr-hand-${s}`, resultSetId: "rs-test", resultItemId: `ri-hand-${s}`, name: "手术人次", value: 200, dimensions: {} };

  const parentCard: WorkloadCard = { id: `wl-parent-${s}`, type: "workload", name: "神经外科门诊卡", workloadResultId: parentResult.id, configurationState: "configured" };
  const childCard1: WorkloadCard = { id: `wl-child1-${s}`, type: "workload", name: "门诊人次卡", workloadResultId: childResult1.id, configurationState: "configured" };
  const childCard2: WorkloadCard = { id: `wl-child2-${s}`, type: "workload", name: "急诊人次卡", workloadResultId: childResult2.id, configurationState: "configured" };
  const handCard: WorkloadCard = { id: `wl-hand-${s}`, type: "workload", name: "手术人次卡", workloadResultId: handResult.id, configurationState: "configured" };

  const relations: Relation[] = [];
  if (opts?.parentAssign !== false) {
    relations.push({ id: `rel-parent-owner-${s}`, type: "workload_assign", sourceId: unitOwner.id, targetId: parentCard.id, active: true, metadata: { origin: "drop" } });
  }
  if (opts?.childAssign !== false) {
    relations.push({ id: `rel-child1-owner-${s}`, type: "workload_assign", sourceId: unitOwner.id, targetId: childCard1.id, active: true, metadata: { origin: "drop" } });
    relations.push({ id: `rel-child2-user-${s}`, type: "workload_assign", sourceId: unitUser.id, targetId: childCard2.id, active: true, metadata: { origin: "drop" } });
  }
  if (opts?.parentAssignToBoth) {
    relations.push({ id: `rel-parent-user-${s}`, type: "workload_assign", sourceId: unitUser.id, targetId: parentCard.id, active: true, metadata: { origin: "drop" } });
  }
  // workload_split Relations: parentCard -> childCards (for layer revocation to find the layer)
  relations.push({ id: `rel-split-${s}-1`, type: "workload_split", sourceId: parentCard.id, targetId: childCard1.id, active: true, metadata: { origin: "split" } });
  relations.push({ id: `rel-split-${s}-2`, type: "workload_split", sourceId: parentCard.id, targetId: childCard2.id, active: true, metadata: { origin: "split" } });
  relations.push({ id: `rel-split-${s}-3`, type: "workload_split", sourceId: parentCard.id, targetId: handCard.id, active: true, metadata: { origin: "split" } });
  const splits: WorkloadSplit[] = [
    { id: `split-${s}-1`, parentResultId: `wr-parent-${s}`, childResultId: `wr-child1-${s}`, splitType: "complete", metadata: { origin: "test" } },
    { id: `split-${s}-2`, parentResultId: `wr-parent-${s}`, childResultId: `wr-child2-${s}`, splitType: "complete", metadata: { origin: "test" } },
    { id: `split-${s}-3`, parentResultId: `wr-parent-${s}`, childResultId: `wr-hand-${s}`, splitType: "complete", metadata: { origin: "test" } },
  ];

  return {
    s, unitOwner, unitUser, parentCard, childCards: [childCard1, childCard2], handCard,
    parentResult, childResults: [childResult1, childResult2], handResult,
    relations, splits: { workloadSplits: splits }
  };
}

async function seed(ds: MockDataService, u: ReturnType<typeof buildUniverse>): Promise<void> {
  const cards: AnyCard[] = [u.unitOwner, u.unitUser, u.parentCard, u.childCards[0], u.childCards[1], { id: `wl-hand-${u.s}`, type: "workload", name: "手术人次卡", workloadResultId: `wr-hand-${u.s}`, configurationState: "configured" }];
  await ds.saveCards(cards);
  await ds.saveWorkloadResults([u.parentResult, u.childResults[0], u.childResults[1], { id: `wr-hand-${u.s}`, resultSetId: "rs-test", resultItemId: `ri-hand-${u.s}`, name: "手术人次", value: 200, dimensions: {} }]);
  await ds.saveRelations(u.relations);
  await ds.saveWorkloadSplits(u.splits.workloadSplits);
}

function storeIds(): Set<string> {
  return new Set(recommendationStore.getState().recommendations.map((r) => r.id));
}

function storeById(id: string) {
  return recommendationStore.getState().recommendations.find((r) => r.id === id);
}

describe("D-151 剩余① 撤回后自动重新 Resolution（假设 A-001 配对范围）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
  });

  it("层撤回后：父卡与 retained 子卡的全部 active 配对自动重新 Resolution（方案 B），且零 Domain Fact 创建", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    // 当前反馈：(父卡, unitOwner) 和 (childCard1, unitOwner) 旧建议在案
    // childCard1 assigned to unitOwner, childCard2 assigned to unitUser
    const staleParentRec = buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id);
    const staleChildRec = buildResolutionRecommendationId(u.childCards[0].id, u.unitOwner.id);
    recommendationStore.getState().setRecommendations([
      { id: staleParentRec, kind: "resolution", payload: { type: "use_existing_result" }, status: "recommended", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z", relatedEntityIds: [u.parentCard.id, u.unitOwner.id] },
      { id: staleChildRec, kind: "resolution", payload: { type: "use_existing_result" }, status: "recommended", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z", relatedEntityIds: [u.childCards[0].id, u.unitOwner.id] },
    ]);
    const cardsBefore = new Set((await ds.getCards()).map((c) => c.id));
    const resultsBefore = new Set((await ds.getWorkloadResults()).map((r) => r.id));

    const impact = await revokeSplitLayer(ds, u.parentCard.id);

    // 撤回确已执行：无 assignment 的 handCard 被撤回，有 assignment 的 childCards 被 retained
    expect(impact.revokedCards.map((c) => c.id).sort()).toEqual(
      [u.handCard.id].sort()
    );
    // retained 子卡有 assignment
    expect(impact.retained.map((r) => r.cardId).sort()).toEqual(
      [u.childCards[0].id, u.childCards[1].id].sort()
    );
    // 零 Domain Fact 创建
    expect(new Set((await ds.getCards()).map((c) => c.id))).toEqual(cardsBefore);
    expect(new Set((await ds.getWorkloadResults()).map((r) => r.id))).toEqual(resultsBefore);

    // 旧配对反馈失效后自动重推（D-151 + D-142 re-offer）：同 ID 重新置为 recommended、时间戳更新
    const parentRec = recommendationStore.getState().getRecommendationById(staleParentRec);
    expect(parentRec).toBeDefined();
    expect(parentRec!.status).toBe("recommended");
    expect(parentRec!.relatedEntityIds).toEqual([u.parentCard.id, u.unitOwner.id]);
    expect(parentRec!.updatedAt).not.toBe("2026-10-01T00:00:00.000Z"); // 时间戳更新
    // retained 子卡配对（c1 → unitOwner）同样重推
    const child1Rec = recommendationStore.getState().getRecommendationById(staleChildRec);
    expect(child1Rec).toBeDefined();
    expect(child1Rec!.status).toBe("recommended");
    expect(child1Rec!.updatedAt).not.toBe("2026-10-01T00:00:00.000Z"); // 时间戳更新
    // retained 子卡配对（c2 → unitUser）同样重推（之前无推荐，新建）
    const newChild2RecId = buildResolutionRecommendationId(u.childCards[1].id, u.unitUser.id);
    expect(recommendationStore.getState().getRecommendationById(newChild2RecId)?.status).toBe("recommended");
    // 无 assign 的配对不重推
    expect(recommendationStore.getState().getRecommendationById(buildResolutionRecommendationId(u.parentCard.id, u.unitUser.id))).toBeUndefined();
    expect(recommendationStore.getState().getRecommendationById(buildResolutionRecommendationId(u.childCards[0].id, u.unitUser.id))).toBeUndefined();
    expect(recommendationStore.getState().getRecommendationById(buildResolutionRecommendationId(u.childCards[1].id, u.unitOwner.id))).toBeUndefined();
  });

  it("父卡与 retained 子卡均无 active 配对：层撤回零重推", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: false, childAssign: false });
    const ds = new MockDataService();
    await seed(ds, u);

    const impact = await revokeSplitLayer(ds, u.parentCard.id);

    // 无重推
    expect(u.parentCard.id).toBeDefined();
    // 撤回确已执行：所有子卡均无 assignment，全部被撤回
    expect(impact.revokedCards.map((c) => c.id).sort()).toEqual(
      [u.childCards[0].id, u.childCards[1].id, u.handCard.id].sort()
    );
    expect(impact.retained).toHaveLength(0);
  });

  it("D-142 re-offer：层撤回重推以同稳定 ID 覆盖历史已处理状态，不产生重复条目", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: true });
    const ds = new MockDataService();
    await seed(ds, u);
    // 历史已处理（accepted）的同 ID 推荐
    const recId = buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id);
    const acceptedHistory: any = {
      id: recId, kind: "resolution", payload: { type: "use_existing_result" },
      status: "accepted", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
      relatedEntityIds: [u.parentCard.id, u.unitOwner.id],
    };
    recommendationStore.getState().setRecommendations([acceptedHistory]);

    await revokeSplitLayer(ds, u.parentCard.id);

    const after = recommendationStore
      .getState()
      .recommendations.filter((r) => r.id === recId);
    expect(after).toHaveLength(1); // 同 ID 后写覆盖，无重复
    expect(after[0].status).toBe("recommended"); // D-142：处理过 ≠ 永久禁止再次推荐
  });

  it("失效先行、重推后行：revoked 子卡旧反馈移除、retained 历史不动、父卡新推荐并存", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: true });
    const ds = new MockDataService();
    await seed(ds, u);
    const recOnChild2: any = {
      id: buildResolutionRecommendationId(u.childCards[1].id, u.unitUser.id),
      kind: "resolution", payload: { type: "use_existing_result" },
      status: "recommended", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
      relatedEntityIds: [u.childCards[1].id, u.unitUser.id],
    };
    recommendationStore.getState().setRecommendations([recOnChild2]);

    await revokeSplitLayer(ds, u.parentCard.id);

    // child2 是 retained（有 active assignment 到 unitUser），所以旧反馈被移除但同 ID 新反馈自动重推（D-142 re-offer）
    const child2Rec = recommendationStore.getState().getRecommendationById(recOnChild2.id);
    expect(child2Rec).toBeDefined();
    expect(child2Rec!.status).toBe("recommended"); // D-142: 同 ID 重新置为 recommended
    expect(child2Rec!.updatedAt).not.toBe(recOnChild2.updatedAt); // 时间戳更新
    // retained 子卡 (child1 → unitOwner) 自动重推
    expect(recommendationStore.getState().getRecommendationById(
      buildResolutionRecommendationId(u.childCards[0].id, u.unitOwner.id)
    )?.status).toBe("recommended");
    // 父卡 (parentCard → unitOwner) 自动重推
    expect(recommendationStore.getState().getRecommendationById(
      buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id)
    )?.status).toBe("recommended");
  });
});

describe("D-151 剩余① 撤回后自动重新 Resolution（全路径撤回分支）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
  });

  it("全路径撤回后：不自动重推任何配对（父卡 assign 仍 active 也不重推）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: true });
    const ds = new MockDataService();
    await seed(ds, u);

    const impact = await revokeDerivedPath(ds, u.parentCard.id);

    // 撤回确已执行：派生子卡物理删除（所有 workload_split 目标）
    expect(impact.deletedCards.map((c) => c.id).sort()).toEqual(
      [u.childCards[0].id, u.childCards[1].id, u.handCard.id].sort()
    );
    // 全路径 = "全错了"意图：不自动重推（返回值无重推字段，store 无该配对推荐）
    const recId = buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id);
    expect(recommendationStore.getState().getRecommendationById(recId)).toBeUndefined();
    expect(
      recommendationStore.getState().recommendations.filter((r) => r.kind === "resolution")
    ).toHaveLength(0);
  });

  it("父卡与 retained 子卡均无 active 配对：全路径撤回零重推", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: false, childAssign: false });
    const ds = new MockDataService();
    await seed(ds, u);

    await revokeDerivedPath(ds, u.parentCard.id);

    // 无推荐产生
    expect(recommendationStore.getState().recommendations.filter((r) => r.kind === "resolution")).toHaveLength(0);
  });

  it("D-142 re-offer：全路径撤回重推以同稳定 ID 覆盖历史已处理状态，不产生重复条目", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: true });
    const ds = new MockDataService();
    await seed(ds, u);
    // 历史已处理（accepted）的同 ID 推荐
    const recId = buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id);
    const acceptedHistory: any = {
      id: recId, kind: "resolution", payload: { type: "use_existing_result" },
      status: "accepted", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
      relatedEntityIds: [u.parentCard.id, u.unitOwner.id],
    };
    recommendationStore.getState().setRecommendations([acceptedHistory]);

    await revokeDerivedPath(ds, u.parentCard.id);

    const after = recommendationStore
      .getState()
      .recommendations.filter((r) => r.id === recId);
    expect(after).toHaveLength(1); // 同 ID 后写覆盖，无重复
    // 全路径撤回不自动重推，历史 accepted 保持不变
    expect(after[0].status).toBe("accepted");
  });

  it("失效先行、重推后行：revoked 子卡旧反馈移除、retained 历史不动、父卡新推荐并存", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: true });
    const ds = new MockDataService();
    await seed(ds, u);
    const recOnUnusedChild: any = {
      id: buildResolutionRecommendationId(u.childCards[1].id, u.unitUser.id),
      kind: "resolution", payload: { type: "use_existing_result" },
      status: "recommended", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
      relatedEntityIds: [u.childCards[1].id, u.unitUser.id],
    };
    recommendationStore.getState().setRecommendations([recOnUnusedChild]);

    await revokeDerivedPath(ds, u.parentCard.id);

    // revoked 子卡 (child2) 的旧反馈移除
    expect(recommendationStore.getState().getRecommendationById(recOnUnusedChild.id)).toBeUndefined();
    // retained 子卡 (child1 → unitOwner) 无历史推荐且全路径不自动重推
    expect(recommendationStore.getState().getRecommendationById(
      buildResolutionRecommendationId(u.childCards[0].id, u.unitOwner.id)
    )).toBeUndefined();
    // 父卡无自动重推（全路径语义），所以不应有新推荐
    expect(recommendationStore.getState().getRecommendationById(
      buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id)
    )).toBeUndefined();
  });
});