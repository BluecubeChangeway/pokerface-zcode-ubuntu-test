import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyCard, UnitCard, WorkloadCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import type { WorkloadResult } from "../domain/workload/types";
import type { Recommendation } from "../domain/recommendation/types";
import type { ResolutionRecommendation } from "../domain/workload/resolutionTypes";
import { createWorkloadSplit } from "../domain/workload/split/splitService";
import { MockDataService } from "../services/MockDataService";
import {
  previewFullPathRevocation,
  revokeDerivedPath,
  revokeDerivedPathAsPreviewed,
  revokeSplitLayer,
} from "../services/revocationEntry";
import { recommendationStore } from "../stores/recommendationStore";
import { buildActionContext, confirmActionFor, sourceWorkloadCardFrom } from "../app/recommendationActions";
import type { ActionExecutorContext } from "../services/actionExecutor";
import { executeUserDecision } from "../services/actionExecutor";

/**
 * D-151 A①（撤回后旧反馈失效）+ D-154 确认安全检查 行为测试（2026-10-10）
 *
 * 口径：全部断言行为与状态结果（store 内容、数据行、确认拒绝），非函数调用计数。
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `fbInv${seq}`;
}

interface Universe {
  s: string;
  unitOwner: UnitCard;
  unitUser: UnitCard;
  parentCard: WorkloadCard;
  parentResult: WorkloadResult;
  childResults: WorkloadResult[];
  childCards: WorkloadCard[];
  mResult: WorkloadResult;
  mCard: WorkloadCard;
  relations: Relation[];
  splits: ReturnType<typeof createWorkloadSplit>["workloadSplits"];
}

function buildUniverse(s: string, opts?: { assignChildToBothUnits?: boolean }): Universe {
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
    { id: `rel-assign-c1-${s}`, type: "workload_assign", sourceId: unitUser.id, targetId: childCards[0].id, active: true },
  ];
  if (opts?.assignChildToBothUnits) {
    relations.push({
      id: `rel-assign-c1-owner-${s}`, type: "workload_assign",
      sourceId: unitOwner.id, targetId: childCards[0].id, active: true,
    });
  }
  // manualReview 形态：拓扑边 + 卡 + 结果，无 WorkloadSplit 记录
  const mResult: WorkloadResult = {
    id: `wr-m-${s}`, resultSetId: `rs-${s}`, resultItemId: `ri-m-${s}`,
    name: `无记录子-${s}`, value: 1, dimensions: {},
  };
  const mCard: WorkloadCard = {
    id: `wl-m-${s}`, type: "workload", name: `无记录子卡-${s}`,
    workloadResultId: mResult.id, configurationState: "configured",
  };
  relations.push({
    id: `rel-split-m-${s}`, type: "workload_split", sourceId: parentCard.id, targetId: mCard.id, active: true,
  });
  return {
    s, unitOwner, unitUser, parentCard, parentResult,
    childResults, childCards, mResult, mCard, relations, splits: layerSplit.workloadSplits,
  };
}

async function seed(ds: MockDataService, u: Universe): Promise<void> {
  const cards: AnyCard[] = [u.unitOwner, u.unitUser, u.parentCard, ...u.childCards, u.mCard];
  await ds.saveCards(cards);
  await ds.saveWorkloadResults([u.parentResult, ...u.childResults, u.mResult]);
  await ds.saveRelations(u.relations);
  await ds.saveWorkloadSplits(u.splits);
}

function makeRec(
  id: string,
  workloadCardId: string,
  unitId: string,
  overrides?: { payload?: Partial<ResolutionRecommendation>; kind?: Recommendation["kind"]; status?: Recommendation["status"] }
): Recommendation {
  return {
    id,
    kind: overrides?.kind ?? "resolution",
    payload: overrides?.payload ?? { type: "use_existing_result" },
    status: overrides?.status ?? "recommended",
    createdAt: "2026-10-10T00:00:00.000Z",
    updatedAt: "2026-10-10T00:00:00.000Z",
    relatedEntityIds: [workloadCardId, unitId],
  };
}

function storeIds(): Set<string> {
  return new Set(recommendationStore.getState().recommendations.map((r) => r.id));
}

function spyWrites(ds: MockDataService) {
  return (
    [
      "saveRelations", "saveWorkloadResults", "saveWorkloadSplits",
      "saveCards", "saveCalculationResults", "deleteCards", "deleteWorkloadResults",
    ] as const
  ).map((method) => vi.spyOn(ds, method));
}

/** UI 确认链的最小等价：store 推荐经 buildActionContext + executeUserDecision（真实分发，非直调内部函数） */
async function confirmViaChain(
  ds: MockDataService,
  rec: Recommendation,
  decision: {
    action: "confirm_use_existing" | "confirm_use_existing_parent" | "confirm_split" | "confirm_use_current";
    targetWorkloadCardId?: string;
    useCurrent?: boolean;
    splitParameters?: Recommendation extends never ? never : { parentResultId: string; children: Array<{ name: string; value: number; dimensions: Record<string, string>; resultSetId: string; resultItemId: string }>; splitType?: "complete" | "partial" };
  }
) {
  const cards = await ds.getCards();
  const context: ActionExecutorContext = await buildActionContext(
    ds,
    recommendationStore.getState().recommendations,
    sourceWorkloadCardFrom(rec, cards)
  );
  return executeUserDecision(
    {
      recommendationId: rec.id,
      action: decision.action,
      ...(decision.targetWorkloadCardId ? { targetWorkloadCardId: decision.targetWorkloadCardId } : {}),
      ...(decision.useCurrent !== undefined ? { useCurrent: decision.useCurrent } : {}),
      ...(decision.splitParameters ? { splitParameters: decision.splitParameters } : {}),
      sourceUnitId: rec.relatedEntityIds?.[1],
      decidedAt: new Date().toISOString(),
    },
    context
  );
}

describe("D-151 A① 撤回后旧反馈失效 + D-154 确认安全检查", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
  });

  it("A+K：全路径撤回后，依赖已删除卡/已删除 Result 的当前推荐失效；锚点存活、accepted 历史与 relation-kind 不误动", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    const recOnChild = makeRec(`rec-a-child-${s}`, u.childCards[0].id, u.unitUser.id);
    const recOnParent = makeRec(`rec-a-parent-${s}`, u.parentCard.id, u.unitOwner.id);
    const recTargetDeletedResult = makeRec(`rec-a-res-${s}`, u.parentCard.id, u.unitOwner.id, {
      payload: { type: "use_existing_result", targetResultId: u.childResults[0].id },
    });
    const recAccepted = makeRec(`rec-a-acc-${s}`, u.childCards[0].id, u.unitUser.id, { status: "accepted" });
    const recRelationKind = makeRec(`rec-a-rel-${s}`, u.childCards[0].id, u.unitUser.id, { kind: "relation" });
    // C：manualReview 对象在全路径撤回下原状保留（不删除、不失效）→ 其推荐不失效
    const recOnManualReview = makeRec(`rec-a-m-${s}`, u.mCard.id, u.unitOwner.id);
    recommendationStore.getState().setRecommendations([
      recOnChild, recOnParent, recTargetDeletedResult, recAccepted, recRelationKind, recOnManualReview,
    ]);

    await revokeDerivedPath(ds, u.parentCard.id);

    const ids = storeIds();
    expect(ids.has(recOnChild.id)).toBe(false);              // A：锚点卡已删除
    expect(ids.has(recTargetDeletedResult.id)).toBe(false);  // A：目标 Result 已删除
    expect(ids.has(recOnParent.id)).toBe(true);              // 锚点存活 → 保留
    expect(ids.has(recOnManualReview.id)).toBe(true);        // C：manualReview 对象不误伤（全路径下 M 原状保留）
    expect(ids.has(recAccepted.id)).toBe(true);              // K：accepted 历史不删除
    expect(recAccepted.status).toBe("accepted");             // K：不改写状态
    expect(ids.has(recRelationKind.id)).toBe(true);         // J：非 resolution kind 不判不动
    // 数据行状态结果（非仅 store）：删除生效
    const cards = await ds.getCards();
    expect(cards.find((c) => c.id === u.childCards[0].id)).toBeUndefined();
  });

  it("B+C：层撤回后，依赖 revoked 子卡的当前推荐失效；retained 子卡与 manualReview 对象不误伤", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s); // C1 已使用（assign→u-user），C2 未使用
    const ds = new MockDataService();
    await seed(ds, u);
    const recOnUnused = makeRec(`rec-b-c2-${s}`, u.childCards[1].id, u.unitOwner.id);
    const recOnRetained = makeRec(`rec-b-c1-${s}`, u.childCards[0].id, u.unitUser.id);
    const recOnManualReview = makeRec(`rec-b-m-${s}`, u.mCard.id, u.unitOwner.id);
    recommendationStore.getState().setRecommendations([recOnUnused, recOnRetained, recOnManualReview]);

    await revokeSplitLayer(ds, u.parentCard.id);

    const ids = storeIds();
    expect(ids.has(recOnUnused.id)).toBe(false);       // B：C2 revoked → 失效
    expect(ids.has(recOnRetained.id)).toBe(true);     // C：C1 retained（锚点存活）
    // 层撤回（D-153）按关系拓扑把无记录子卡 M 当作未使用直接子卡软失效（既有行为，
    // manualReview 保护只存在于全路径 D-158 分支）——M 锚点已 revoked，其反馈失效为正确语义
    expect(ids.has(recOnManualReview.id)).toBe(false);
    const cards = await ds.getCards();
    expect(cards.find((c) => c.id === u.childCards[0].id)).toBeDefined();
    expect(cards.find((c) => c.id === u.mCard.id)).toBeDefined(); // 行保留（软失效）
  });

  it("D：同一卡存在多条有效关系（多 Unit）时，其推荐不因撤回其他路径而误删", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { assignChildToBothUnits: true }); // C1 assign 到两个 Unit
    const ds = new MockDataService();
    await seed(ds, u);
    const recU1 = makeRec(`rec-d-u1-${s}`, u.childCards[0].id, u.unitUser.id);
    const recU2 = makeRec(`rec-d-u2-${s}`, u.childCards[0].id, u.unitOwner.id);
    recommendationStore.getState().setRecommendations([recU1, recU2]);

    // 层撤回 P：C1 retained（被使用）→ 两条关系均有效 → 两条推荐保留
    await revokeSplitLayer(ds, u.parentCard.id);

    const ids = storeIds();
    expect(ids.has(recU1.id)).toBe(true);
    expect(ids.has(recU2.id)).toBe(true);
    const relations = await ds.getRelations();
    expect(relations.find((r) => r.id === `rel-assign-c1-${s}`)?.active).toBe(true);
    expect(relations.find((r) => r.id === `rel-assign-c1-owner-${s}`)?.active).toBe(true);
  });

  it("E：守卫拒绝过期预览时——零撤回写入、零反馈变更", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    const recOnChild = makeRec(`rec-e-${s}`, u.childCards[0].id, u.unitUser.id);
    recommendationStore.getState().setRecommendations([recOnChild]);

    const preview = await previewFullPathRevocation(ds, u.parentCard.id);
    // 预览后新增派生对象 → 预览过期
    const extraBatch = createWorkloadSplit({
      parentResultId: u.parentResult.id,
      children: [{ name: `新增-${s}`, value: 10, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-new-${s}` }],
      splitType: "partial", executionBatchId: `batch-new-${s}`,
    }, u.parentResult);
    await ds.saveWorkloadResults(extraBatch.childResults);
    await ds.saveWorkloadSplits(extraBatch.workloadSplits);

    const spies = spyWrites(ds);
    await expect(
      revokeDerivedPathAsPreviewed(ds, u.parentCard.id, preview)
    ).rejects.toThrow(/确认范围校验失败/);
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    // 反馈零变更：旧推荐原样保留（失效只发生在撤回成功之后）
    expect(storeIds().has(recOnChild.id)).toBe(true);
    expect(recommendationStore.getState().recommendations[0].status).toBe("recommended");
    // 数据原状
    const cards = await ds.getCards();
    expect(cards.find((c) => c.id === u.childCards[0].id)).toBeDefined();
  });

  it("F：失效阶段失败后重试收敛——撤回事实已提交，重跑按实时事实完成失效", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    const recOnChild = makeRec(`rec-f-${s}`, u.childCards[0].id, u.unitUser.id);
    recommendationStore.getState().setRecommendations([recOnChild]);

    // 注入失效失败：removeRecommendation 第一次抛错
    const removeSpy = vi
      .spyOn(recommendationStore.getState(), "removeRecommendation")
      .mockImplementationOnce(() => {
        throw new Error("Simulated invalidation failure");
      });
    await expect(revokeDerivedPath(ds, u.parentCard.id)).rejects.toThrow(
      "Simulated invalidation failure"
    );
    removeSpy.mockRestore();

    // 撤回事实已提交（卡已删）；旧反馈仍在（失效失败）
    const cards = await ds.getCards();
    expect(cards.find((c) => c.id === u.childCards[0].id)).toBeUndefined();
    expect(storeIds().has(recOnChild.id)).toBe(true);

    // 重跑同一撤回入口：空 impact no-op 提交 + 按实时事实完成失效 → 收敛
    const impact = await revokeDerivedPath(ds, u.parentCard.id);
    expect(impact.deletedCards).toHaveLength(0); // 空 impact（实时推导，非历史重放）
    expect(storeIds().has(recOnChild.id)).toBe(false);
  });

  it("G：revoked 主体/目标卡的旧推荐不能通过确认链被接受（executor 确认安全检查）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    // C2 层撤回后 revoked；手工放一条推荐（模拟失效失败窗口），确认必须被拒
    await executeSplitLayerRevocationDirect(ds, u);
    const recOnRevoked = makeRec(`rec-g-${s}`, u.childCards[1].id, u.unitOwner.id, {
      payload: { type: "use_existing_result", targetWorkloadCardId: u.childCards[1].id },
    });
    recommendationStore.getState().setRecommendations([recOnRevoked]);

    const spies = spyWrites(ds);
    const result = await confirmViaChain(ds, recOnRevoked, {
      action: "confirm_use_existing",
      targetWorkloadCardId: u.childCards[1].id,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/revoked|D-154/);
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    expect(storeIds().has(recOnRevoked.id)).toBe(true); // 推荐保持 recommended，不伪装 accepted
  });

  it("H：拆分父 Result 已 revoked / use_existing_parent 目标卡 revoked 时按既有 Action 语义拒绝", async () => {
    // H-1：split 主体卡 revoked
    const s = nextSuffix();
    const u1 = buildUniverse(s);
    const ds1 = new MockDataService();
    await seed(ds1, u1);
    await executeSplitLayerRevocationDirect(ds1, u1); // C2 revoked（卡与 Result 均 revoked）
    const revokedChild = { ...u1.childCards[1], businessStatus: "revoked" as const };
    const revokedResult = { ...u1.childResults[1], businessStatus: "revoked" as const };
    const recSplit = makeRec(`rec-h-split-${s}`, u1.childCards[1].id, u1.unitOwner.id, {
      payload: { type: "split_workload" },
    });
    recommendationStore.getState().setRecommendations([recSplit]);
    const splitDecision = await confirmSplitOn(ds1, recSplit, revokedChild, revokedResult);
    expect(splitDecision.success).toBe(false);
    expect(splitDecision.error).toMatch(/revoked|D-154/); // 主体卡或父 Result revoked 拦截

    // H-2：find_existing_workload 目标父卡 revoked —— 经 confirm_use_existing_parent
    // 真实分发命中 executeFindExistingWorkload 的"2.5 确认安全检查"（按 decision.action 分发，非 payload.type）
    const s2 = nextSuffix();
    const u2 = buildUniverse(s2);
    const ds2 = new MockDataService();
    await seed(ds2, u2);
    await executeSplitLayerRevocationDirect(ds2, u2); // C2 revoked（卡与 Result 均 revoked）
    const recParent = makeRec(`rec-h-parent-${s2}`, u2.childCards[1].id, u2.unitOwner.id, {
      payload: { type: "find_existing_workload", targetWorkloadCardId: u2.childCards[1].id },
    });
    recommendationStore.getState().setRecommendations([recParent]);
    // 映射核对：confirmActionFor 对 find_existing_workload 返回 confirm_use_existing_parent
    expect(confirmActionFor(recParent)).toBe("confirm_use_existing_parent");
    const spies2 = spyWrites(ds2);
    const result2 = await confirmViaChain(ds2, recParent, {
      action: "confirm_use_existing_parent",
      targetWorkloadCardId: u2.childCards[1].id,
    });
    expect(result2.success).toBe(false);
    // 函数命中证据：executeFindExistingWorkload 的拒绝文案为 "Target parent WorkloadCard"（区别于
    // executeUseExistingResult 的 "Target WorkloadCard"）——证明真实分发进入了正确函数
    expect(result2.error).toMatch(/Target parent WorkloadCard .*revoked|Target parent WorkloadCard .*D-154/s);
    for (const spy of spies2) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    expect(storeIds().has(recParent.id)).toBe(true); // 推荐保持 recommended，零业务写入
  });

  it("G 补充：confirm_use_current 主体卡 revoked —— 经真实分发链委托 executeUseExistingResult 后被安全检查拒绝，零写入", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    await executeSplitLayerRevocationDirect(ds, u); // C2 revoked（卡与 Result 均 revoked）
    // 推荐锚点即 revoked 主体卡：sourceWorkloadCardFrom 透传 businessStatus=revoked 进 context.workloadCard
    const recOnRevoked = makeRec(`rec-g2-${s}`, u.childCards[1].id, u.unitOwner.id, {
      payload: { type: "use_existing_result_with_confirmation", options: ["复用现有结果", "仍使用当前 WorkloadResult", "取消"] },
    });
    recommendationStore.getState().setRecommendations([recOnRevoked]);

    const spies = spyWrites(ds);
    // 真实分发链：executeUserDecision 按 action 进入 confirm_use_current 分支
    //（useCurrent=true + context.workloadCard 注入 targetWorkloadCardId → 委托 executeUseExistingResult）
    const result = await confirmViaChain(ds, recOnRevoked, {
      action: "confirm_use_current",
      useCurrent: true,
    });
    expect(result.success).toBe(false);
    // 函数命中证据：confirm_use_current 分支注入 context.workloadCard.id 后委托 executeUseExistingResult，
    // 其拒绝文案为 "Target WorkloadCard"且 id = 主体卡（区别于 executeFindExistingWorkload 文案）
    expect(result.error).toMatch(new RegExp(`Target WorkloadCard ${u.childCards[1].id} .*revoked|Target WorkloadCard ${u.childCards[1].id} .*D-154`, "s"));
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    // 推荐及相关事实零意外变更：保持 recommended；数据行原状（软失效行仍在）
    expect(storeIds().has(recOnRevoked.id)).toBe(true);
    expect(recommendationStore.getState().recommendations[0].status).toBe("recommended");
    const cards = await ds.getCards();
    const revokedCard = cards.find((c) => c.id === u.childCards[1].id);
    expect(revokedCard).toBeDefined();
    expect((revokedCard as WorkloadCard).businessStatus).toBe("revoked");
    const relations = await ds.getRelations();
    expect(relations.find((r) => r.id === `rel-split-c2-${s}`)?.active).toBe(false); // 撤回结果未被改动
  });

  it("I：失效后同 ID re-offer 行为不变（D-142 upsert/追加语义保持）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    const rec = makeRec(`rec-i-${s}`, u.childCards[0].id, u.unitUser.id);
    recommendationStore.getState().setRecommendations([rec]);

    await revokeDerivedPath(ds, u.parentCard.id); // rec 失效（锚点删除）
    expect(storeIds().has(rec.id)).toBe(false);

    // 同 ID re-offer（锚点改为存活的父卡）：D-142 追加分支
    const reOffer = makeRec(`rec-i-${s}`, u.parentCard.id, u.unitOwner.id, {
      payload: { type: "use_existing_result" },
    });
    recommendationStore.getState().addRecommendation(reOffer);
    recommendationStore.getState().addRecommendation(reOffer); // 二次注册 → upsert 覆盖，不重复
    const recs = recommendationStore.getState().recommendations.filter((r) => r.id === rec.id);
    expect(recs).toHaveLength(1);
    expect(recs[0].status).toBe("recommended");

    // 重跑撤回（no-op）：锚点存活 → 不再移除
    await revokeDerivedPath(ds, u.parentCard.id);
    expect(storeIds().has(rec.id)).toBe(true);
  });

  it("J 补充：accepted/ignored/dismissed 均不被失效触碰（仅 recommended 参与）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    const acc = makeRec(`rec-j-acc-${s}`, u.childCards[0].id, u.unitUser.id, { status: "accepted" });
    const ign = makeRec(`rec-j-ign-${s}`, u.childCards[1].id, u.unitUser.id, { status: "ignored" });
    const dis = makeRec(`rec-j-dis-${s}`, u.childCards[1].id, u.unitUser.id, { status: "dismissed" });
    recommendationStore.getState().setRecommendations([acc, ign, dis]);

    await revokeDerivedPath(ds, u.parentCard.id);

    const ids = storeIds();
    expect(ids.has(acc.id)).toBe(true);
    expect(ids.has(ign.id)).toBe(true);
    expect(ids.has(dis.id)).toBe(true);
    const statuses = recommendationStore.getState().recommendations.map((r) => r.status).sort();
    expect(statuses).toEqual(["accepted", "dismissed", "ignored"]);
  });
});

/** 直连层撤回编排（不经入口，避免触发入口的失效——用于手工构造"失效失败窗口"状态） */
async function executeSplitLayerRevocationDirect(ds: MockDataService, u: Universe): Promise<void> {
  const { executeSplitLayerRevocation } = await import("../services/revocationSubmissionService");
  await executeSplitLayerRevocation(ds, u.parentCard.id);
}

/** 拆分确认链（含 revoked 主体卡透传） */
async function confirmSplitOn(
  ds: MockDataService,
  rec: Recommendation,
  subjectCard: WorkloadCard,
  parentResult: WorkloadResult
) {
  const context: ActionExecutorContext = await buildActionContext(
    ds,
    recommendationStore.getState().recommendations,
    { id: subjectCard.id, type: subjectCard.type, name: subjectCard.name, workloadResultId: parentResult.id, businessStatus: subjectCard.businessStatus }
  );
  return executeUserDecision(
    {
      recommendationId: rec.id,
      action: "confirm_split",
      splitParameters: {
        parentResultId: parentResult.id,
        children: [
          { name: "子", value: Number(parentResult.value ?? 0), dimensions: {}, resultSetId: `rs-x`, resultItemId: `ri-x` },
        ],
        splitType: "partial",
      },
      sourceUnitId: rec.relatedEntityIds?.[1],
      decidedAt: new Date().toISOString(),
    },
    context
  );
}
