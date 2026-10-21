import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyCard, UnitCard, WorkloadCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import type { WorkloadResult } from "../domain/workload/types";
import type { Recommendation } from "../domain/recommendation/types";
import { createWorkloadSplit } from "../domain/workload/splitService";
import { MockDataService } from "../services/MockDataService";
import { revokeSplitLayer, revokeDerivedPath } from "../services/revocationEntry";
import { buildResolutionRecommendationId } from "../services/resolutionTrigger";
import { defaultResolutionContextBuilder } from "../domain/workload/resolutionContextBuilder";
import { recommendationStore } from "../stores/recommendationStore";

/**
 * D-151 剩余①（撤回后自动重新 Resolution）行为测试 —— 用户 2026-10-21 裁定方案 B：
 * - 层撤回：对 [父卡 + 本层保留子卡（retained）] 的全部 active workload_assign 配对
 *   自动重新 Resolution（失效 A① 先行、重推后行）；
 * - 全路径撤回：不自动重推任何配对（"整条错误路径全错了"意图分流）；
 * - 自动 = 自动分析+推荐，绝不自动执行业务动作（零 Domain Fact 创建）；
 * - D-142 稳定 ID / re-offer 语义保持；单配对失败不阻断其余配对、末尾合并抛出。
 *
 * 口径：断言行为与状态结果（store 内容、数据行、返回值），非函数调用计数（除显式故障注入外）。
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `autoResub${seq}`;
}

interface Universe {
  s: string;
  unitOwner: UnitCard;
  unitUser: UnitCard;
  parentCard: WorkloadCard;
  parentResult: WorkloadResult;
  childResults: WorkloadResult[];
  childCards: WorkloadCard[];
  relations: Relation[];
  splits: ReturnType<typeof createWorkloadSplit>["workloadSplits"];
}

/**
 * 层撤回宇宙：父卡 + 两子卡（c1 有 assign = 层撤回后 retained；c2 未使用 = 软失效）。
 * opts.parentAssign = 父卡与 unitOwner 之间有 active workload_assign（重推配对来源之一）。
 * opts.childAssign = c1 与 unitUser 之间的 assign（默认存在；置 false 得"全部子卡未使用"宇宙）。
 */
function buildUniverse(
  s: string,
  opts?: { parentAssign?: boolean; childAssign?: boolean }
): Universe {
  const unitOwner: UnitCard = {
    id: `u-owner-${s}`, type: "unit", name: `科室A-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const unitUser: UnitCard = {
    id: `u-user-${s}`, type: "unit", name: `科室B-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const parentResult: WorkloadResult = {
    id: `wr-parent-${s}`, resultSetId: `rs-${s}`, resultItemId: `ri-parent-${s}`,
    name: `父结果-${s}`, value: 100, dimensions: {},
  };
  const parentCard: WorkloadCard = {
    id: `wl-parent-${s}`, type: "workload", name: `父卡-${s}`,
    workloadResultId: parentResult.id, configurationState: "configured",
  };
  const layerSplit = createWorkloadSplit({
    parentResultId: parentResult.id,
    children: [
      { name: `子1-${s}`, value: 60, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-c1-${s}` },
      { name: `子2-${s}`, value: 40, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-c2-${s}` },
    ],
    splitType: "complete",
    executionBatchId: `batch-${s}`,
  }, parentResult);
  const childResults = layerSplit.childResults;
  const childCards: WorkloadCard[] = childResults.map((r, i) => ({
    id: `wl-c${i + 1}-${s}`, type: "workload", name: r.name,
    workloadResultId: r.id, configurationState: "configured",
  }));
  const relations: Relation[] = [
    { id: `rel-split-c1-${s}`, type: "workload_split", sourceId: parentCard.id, targetId: childCards[0].id, active: true, metadata: { parentWorkloadResultId: parentResult.id, childWorkloadResultId: childResults[0].id } },
    { id: `rel-split-c2-${s}`, type: "workload_split", sourceId: parentCard.id, targetId: childCards[1].id, active: true, metadata: { parentWorkloadResultId: parentResult.id, childWorkloadResultId: childResults[1].id } },
  ];
  if (opts?.childAssign !== false) {
    // c1 assign → unitUser：层撤回后 c1 因继续使用证据 retained（方案 B 重推配对来源之一）
    relations.push({
      id: `rel-assign-c1-${s}`, type: "workload_assign",
      sourceId: unitUser.id, targetId: childCards[0].id, active: true,
    });
  }
  if (opts?.parentAssign) {
    relations.push({
      id: `rel-assign-parent-${s}`, type: "workload_assign",
      sourceId: unitOwner.id, targetId: parentCard.id, active: true,
    });
  }
  return {
    s, unitOwner, unitUser, parentCard, parentResult,
    childResults, childCards, relations, splits: layerSplit.workloadSplits,
  };
}

async function seed(ds: MockDataService, u: Universe): Promise<void> {
  const cards: AnyCard[] = [u.unitOwner, u.unitUser, u.parentCard, ...u.childCards];
  await ds.saveCards(cards);
  await ds.saveWorkloadResults([u.parentResult, ...u.childResults]);
  await ds.saveRelations(u.relations);
  await ds.saveWorkloadSplits(u.splits);
}

function storeIds(): Set<string> {
  return new Set(recommendationStore.getState().recommendations.map((r) => r.id));
}

function storeById(id: string): Recommendation | undefined {
  return recommendationStore.getState().recommendations.find((r) => r.id === id);
}

describe("D-151 剩余① 撤回后自动重新 Resolution（假设 A-001 配对范围）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
  });

  it("层撤回后：父卡与 retained 子卡的全部 active 配对自动重新 Resolution（方案 B），且零 Domain Fact 创建", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: true });
    const ds = new MockDataService();
    await seed(ds, u);
    const cardsBefore = new Set((await ds.getCards()).map((c) => c.id));
    const resultsBefore = new Set((await ds.getWorkloadResults()).map((r) => r.id));

    const impact = await revokeSplitLayer(ds, u.parentCard.id);

    // 方案 B 重推配对 = 父卡 + retained 子卡（c1 有 assign → retained）的全部 active 配对
    expect(
      impact.resubmittedResolutions
        .map((p) => `${p.workloadCardId}->${p.targetUnitId}`)
        .sort()
    ).toEqual(
      [
        `${u.parentCard.id}->${u.unitOwner.id}`,
        `${u.childCards[0].id}->${u.unitUser.id}`,
      ].sort()
    );
    // 稳定 ID 注册为 recommended（D-142 同 ID 语义）——父卡配对
    const parentRecId = buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id);
    const parentRec = storeById(parentRecId);
    expect(parentRec).toBeDefined();
    expect(parentRec!.status).toBe("recommended");
    expect(parentRec!.relatedEntityIds).toEqual([u.parentCard.id, u.unitOwner.id]);
    // retained 子卡配对（c1 → unitUser）同样重推
    const c1RecId = buildResolutionRecommendationId(u.childCards[0].id, u.unitUser.id);
    expect(storeById(c1RecId)?.status).toBe("recommended");
    // 无 assign 的配对不重推（父卡与 unitUser、c2 与任何 Unit 均无 assign）
    expect(storeIds().has(buildResolutionRecommendationId(u.parentCard.id, u.unitUser.id))).toBe(false);
    expect(storeIds().has(buildResolutionRecommendationId(u.childCards[1].id, u.unitOwner.id))).toBe(false);
    // 自动 ≠ 自动执行：卡与结果的行集合不变（层撤回软失效为同 ID upsert，无任何新建）
    expect(new Set((await ds.getCards()).map((c) => c.id))).toEqual(cardsBefore);
    expect(new Set((await ds.getWorkloadResults()).map((r) => r.id))).toEqual(resultsBefore);
  });

  it("全路径撤回后：不自动重推任何配对（父卡 assign 仍 active 也不重推）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: true });
    const ds = new MockDataService();
    await seed(ds, u);

    const impact = await revokeDerivedPath(ds, u.parentCard.id);

    // 撤回确已执行：派生子卡物理删除
    expect(impact.deletedCards.map((c) => c.id).sort()).toEqual(
      u.childCards.map((c) => c.id).sort()
    );
    // 全路径 = "全错了"意图：不自动重推（返回值无重推字段，store 无该配对推荐）
    const recId = buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id);
    expect(storeIds().has(recId)).toBe(false);
    expect(
      recommendationStore.getState().recommendations.filter((r) => r.kind === "resolution")
    ).toHaveLength(0);
  });

  it("父卡与 retained 子卡均无 active 配对：层撤回零重推", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: false, childAssign: false }); // 全部子卡未使用 → retained 为空；父卡无 assign
    const ds = new MockDataService();
    await seed(ds, u);

    const impact = await revokeSplitLayer(ds, u.parentCard.id);

    expect(impact.resubmittedResolutions).toEqual([]);
    expect(
      recommendationStore.getState().recommendations.filter((r) => r.kind === "resolution")
    ).toHaveLength(0);
  });

  it("D-142 re-offer：层撤回重推以同稳定 ID 覆盖历史已处理状态，不产生重复条目", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: true });
    const ds = new MockDataService();
    await seed(ds, u);
    // 历史已处理（accepted）的同 ID 推荐
    const recId = buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id);
    const acceptedHistory: Recommendation = {
      id: recId,
      kind: "resolution",
      payload: { type: "use_existing_result" },
      status: "accepted",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
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
    const recOnUnusedChild: Recommendation = {
      id: `rec-stale-c2-${s}`, kind: "resolution",
      payload: { type: "use_existing_result" }, status: "recommended",
      createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
      relatedEntityIds: [u.childCards[1].id, u.unitOwner.id],
    };
    const acceptedOnRetained: Recommendation = {
      id: `rec-acc-c1-${s}`, kind: "resolution",
      payload: { type: "use_existing_result" }, status: "accepted",
      createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
      relatedEntityIds: [u.childCards[0].id, u.unitUser.id],
    };
    recommendationStore.getState().setRecommendations([recOnUnusedChild, acceptedOnRetained]);

    await revokeSplitLayer(ds, u.parentCard.id);

    const ids = storeIds();
    expect(ids.has(recOnUnusedChild.id)).toBe(false); // A①：锚定 revoked 子卡的旧反馈失效
    expect(ids.has(acceptedOnRetained.id)).toBe(true); // retained/历史不误动
    expect(storeById(acceptedOnRetained.id)!.status).toBe("accepted");
    const reOfferId = buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id);
    expect(storeById(reOfferId)?.status).toBe("recommended"); // 重推并存
  });

  it("多配对：父卡多个 active assign 全部重推；无对应卡的目标（悬空 assign）跳过", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: true });
    // 追加第二个有效配对（unitUser → parent）与一个悬空配对（目标 Unit 卡不存在）
    u.relations.push({
      id: `rel-assign-parent2-${s}`, type: "workload_assign",
      sourceId: u.unitUser.id, targetId: u.parentCard.id, active: true,
    });
    u.relations.push({
      id: `rel-assign-ghost-${s}`, type: "workload_assign",
      sourceId: `u-ghost-${s}`, targetId: u.parentCard.id, active: true,
    });
    const ds = new MockDataService();
    await seed(ds, u);

    const impact = await revokeSplitLayer(ds, u.parentCard.id);

    const pairKeys = impact.resubmittedResolutions
      .map((p) => `${p.workloadCardId}->${p.targetUnitId}`)
      .sort();
    expect(pairKeys).toEqual(
      [
        `${u.childCards[0].id}->${u.unitUser.id}`, // retained 子卡 c1 的配对（方案 B）
        `${u.parentCard.id}->${u.unitOwner.id}`,
        `${u.parentCard.id}->${u.unitUser.id}`,
      ].sort()
    );
    expect(storeIds().has(buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id))).toBe(true);
    expect(storeIds().has(buildResolutionRecommendationId(u.parentCard.id, u.unitUser.id))).toBe(true);
  });

  it("单配对失败不阻断其余配对：全部尝试后合并抛出，撤回事实保持已提交、成功配对推荐留存", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { parentAssign: true });
    u.relations.push({
      id: `rel-assign-parent2-${s}`, type: "workload_assign",
      sourceId: u.unitUser.id, targetId: u.parentCard.id, active: true,
    });
    const ds = new MockDataService();
    await seed(ds, u);
    // 故障注入：仅 unitUser 配对的 Resolution 构建失败（其余配对走真实路径）
    const original = defaultResolutionContextBuilder.buildFromDataService.bind(
      defaultResolutionContextBuilder
    );
    const spy = vi.spyOn(defaultResolutionContextBuilder, "buildFromDataService");
    spy.mockImplementation(async (dataService, workloadCardId, targetUnitId) => {
      if (targetUnitId === u.unitUser.id) {
        throw new Error("模拟 Resolution 失败");
      }
      return original(dataService, workloadCardId, targetUnitId);
    });

    await expect(revokeSplitLayer(ds, u.parentCard.id)).rejects.toThrow(/自动重新 Resolution 存在失败配对.*u-user-/s);
    spy.mockRestore();

    // 撤回事实保持已提交：c2 软失效（业务世界不存在）
    const cards = await ds.getCards();
    const c2 = cards.find((c) => c.id === u.childCards[1].id);
    expect(c2?.businessStatus).toBe("revoked");
    // 成功配对（unitOwner）的推荐留存；失败配对（unitUser）无推荐
    expect(storeIds().has(buildResolutionRecommendationId(u.parentCard.id, u.unitOwner.id))).toBe(true);
    expect(storeIds().has(buildResolutionRecommendationId(u.parentCard.id, u.unitUser.id))).toBe(false);
  });
});
