import { beforeEach, describe, expect, it } from "vitest";
import type { AnyCard, UnitCard, WorkloadCard } from "../domain/card/types";
import type { WorkloadResult } from "../domain/workload/types";
import type { Recommendation } from "../domain/recommendation/types";
import { MockDataService } from "../services/MockDataService";
import { revokeSplitLayer, revokeDerivedPath } from "../services/revocationEntry";
import { recommendationStore } from "../stores/recommendationStore";
import { buildActionContext, sourceWorkloadCardFrom } from "../app/recommendationActions";
import { executeUserDecision } from "../services/actionExecutor";
import { submitActionResult } from "../services/ActionSubmissionService";
import type { SplitProvenanceRecord } from "../domain/workload/splitProvenance";

/**
 * R3 拆分溯源与跨批次复用（D-157 规则 B 实施；用户裁定 A-003 + 2026-10-22 批复
 * Q1 渠道=取用科室（经 dimensions）/ Q2 复用忽略新名 / Q3 确认面板可见）行为测试。
 *
 * 三场景验算（设计报告 §四）+ retry 身份纪律：
 * 1 两科室同拆一张卡 → 复用不重复（含 Q2 名称忽略）；
 * 2 层撤回后重拆 → retained 存活子卡被复用、失效子卡新建（"旧的被新的替代"）；
 * 3 只拆一部分 → 按需复用，缺的不建；
 * 4 同批次重试 → 幂等收敛（溯源 upsert + 身份一致）；
 * 5 复用产物死亡后同批次重试 → 明确拒绝（D-144：不得静默换身份）；新决策重建。
 *
 * 口径：全链真实执行（store.executeDecision → executor → submitActionResult →
 * MockDataService），断言数据行与溯源记录，非函数调用计数。
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `reuse${seq}`;
}

interface Universe {
  s: string;
  unitA: UnitCard;
  unitB: UnitCard;
  parentResult: WorkloadResult;
  parentCard: WorkloadCard;
}

function buildUniverse(s: string): Universe {
  const unitA: UnitCard = {
    id: `u-a-${s}`, type: "unit", name: `内科-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const unitB: UnitCard = {
    id: `u-b-${s}`, type: "unit", name: `急诊-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const parentResult: WorkloadResult = {
    id: `wr-parent-${s}`, resultSetId: `rs-${s}`, resultItemId: `ri-parent-${s}`,
    name: `出院人次-${s}`, value: 100, dimensions: {},
  };
  const parentCard: WorkloadCard = {
    id: `wl-parent-${s}`, type: "workload", name: `出院人次卡-${s}`,
    workloadResultId: parentResult.id, configurationState: "configured",
  };
  return { s, unitA, unitB, parentResult, parentCard };
}

async function seed(ds: MockDataService, u: Universe): Promise<void> {
  const cards: AnyCard[] = [u.unitA, u.unitB, u.parentCard];
  await ds.saveCards(cards);
  await ds.saveWorkloadResults([u.parentResult]);
}

function childSpecs(u: Universe, overrides?: { nameW?: string; nameL?: string; onlyW?: boolean }) {
  const w = {
    name: overrides?.nameW ?? `王医生-${u.s}`,
    value: 60,
    dimensions: { departmentId: u.unitA.id },
    resultSetId: u.parentResult.resultSetId,
    resultItemId: `ri-w-${u.s}`,
  };
  const l = {
    name: overrides?.nameL ?? `李医生-${u.s}`,
    value: 40,
    dimensions: { departmentId: u.unitB.id },
    resultSetId: u.parentResult.resultSetId,
    resultItemId: `ri-l-${u.s}`,
  };
  return {
    children: overrides?.onlyW ? [w] : [w, l],
    splitType: (overrides?.onlyW ? "partial" : "complete") as "complete" | "partial",
  };
}

function splitParametersOf(u: Universe, overrides?: { nameW?: string; nameL?: string; onlyW?: boolean }) {
  const { children, splitType } = childSpecs(u, overrides);
  return {
    parentResultId: u.parentResult.id,
    children,
    splitType,
  };
}

function makeRec(id: string, u: Universe): Recommendation {
  return {
    id,
    kind: "resolution",
    payload: { type: "split_workload" },
    status: "recommended",
    createdAt: "2026-10-22T00:00:00.000Z",
    updatedAt: "2026-10-22T00:00:00.000Z",
    relatedEntityIds: [u.parentCard.id, u.unitA.id],
  };
}

/** 全链确认（同 UI：store → executor → submitActionResult → DataService） */
async function confirmSplit(
  ds: MockDataService,
  rec: Recommendation,
  splitParameters: ReturnType<typeof splitParametersOf>,
  decidedAt: string
) {
  const cards = await ds.getCards();
  const context = await buildActionContext(
    ds,
    recommendationStore.getState().recommendations,
    sourceWorkloadCardFrom(rec, cards)
  );
  return recommendationStore.getState().executeDecision(
    {
      recommendationId: rec.id,
      action: "confirm_split",
      splitParameters,
      sourceUnitId: rec.relatedEntityIds?.[1],
      decidedAt,
    },
    context
  );
}

async function scopedResults(ds: MockDataService, u: Universe): Promise<WorkloadResult[]> {
  const all = await ds.getWorkloadResults();
  return all.filter((r) => r.resultSetId === u.parentResult.resultSetId && r.id !== u.parentResult.id);
}

async function scopedCards(ds: MockDataService, u: Universe): Promise<AnyCard[]> {
  // 圈定范围 = 引用"本宇宙子结果 ID"的卡（Mock 单例为文件级共享存储，
  // 必须按子结果 ID 精确圈定，不得按排除法计数）
  const childResultIds = new Set((await scopedResults(ds, u)).map((r) => r.id));
  const all = await ds.getCards();
  return all.filter(
    (c) =>
      c.type === "workload" &&
      childResultIds.has((c as WorkloadCard).workloadResultId ?? "")
  );
}

async function provenances(ds: MockDataService): Promise<SplitProvenanceRecord[]> {
  return ds.getSplitProvenances();
}

describe("R3 拆分溯源与跨批次复用（D-157 规则 B 实施，三场景 + retry 纪律）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
  });

  it("场景1 两科室同拆一张卡：第二次同条件拆分复用既有结果与卡片（Q2：新名忽略）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const rec1 = makeRec(`rec-split-1-${s}`, u);
    recommendationStore.getState().setRecommendations([rec1]);
    const r1 = await confirmSplit(ds, rec1, splitParametersOf(u), "2026-10-22T10:00:00.000Z");
    expect(r1.success).toBe(true);
    const resultsAfter1 = await scopedResults(ds, u);
    const cardsAfter1 = await scopedCards(ds, u);
    expect(resultsAfter1).toHaveLength(2);
    expect(cardsAfter1).toHaveLength(2);
    const provenance1 = await provenances(ds);
    expect(provenance1).toHaveLength(1);

    // 第二次：另一科室（新推荐、新决策），同条件、不同名字（Q2 复用忽略新名）
    const rec2 = makeRec(`rec-split-2-${s}`, u);
    recommendationStore.getState().setRecommendations([rec1, rec2]);
    const r2 = await confirmSplit(
      ds, rec2,
      splitParametersOf(u, { nameW: `老王-${s}`, nameL: `老李-${s}` }),
      "2026-10-22T11:00:00.000Z"
    );
    expect(r2.success).toBe(true);

    // 复用：不产生新结果、新卡（D-157 规则 B：同一结果不重复创建）
    expect(await scopedResults(ds, u)).toHaveLength(2);
    expect(await scopedCards(ds, u)).toHaveLength(2);
    // 卡片沿用旧名（新名不生效）
    const cards = await scopedCards(ds, u);
    expect(cards.map((c) => c.name).sort()).toEqual([`李医生-${s}`, `王医生-${s}`].sort());
    // 溯源：两个批次各一条；批次2登记的被复用结果 ID = 批次1 的产物
    const allProvenance = await provenances(ds);
    expect(allProvenance).toHaveLength(2);
    const batch2 = allProvenance.find((p) => p.id.includes(`rec-split-2-${s}`))!;
    expect(batch2?.conditions.map((c) => c.childResultId).sort())
      .toEqual(resultsAfter1.map((r) => r.id).sort());
  });

  it("场景2 层撤回后重拆：存活 retained 子卡被复用、失效子卡新建（旧的被新的替代）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const rec1 = makeRec(`rec-split-1-${s}`, u);
    recommendationStore.getState().setRecommendations([rec1]);
    await confirmSplit(ds, rec1, splitParametersOf(u), "2026-10-22T10:00:00.000Z");
    const resultsAfter1 = await scopedResults(ds, u);
    const wResult = resultsAfter1.find((r) => r.resultItemId === `ri-w-${s}`)!;
    // 王医生子卡被急诊继续使用（continued-use 证据）→ 层撤回后 retained
    const cards1 = await scopedCards(ds, u);
    const wCard = cards1.find((c) => (c as WorkloadCard).workloadResultId === wResult.id)!;
    await ds.saveRelations([{
      id: `rel-use-w-${s}`, type: "workload_assign",
      sourceId: u.unitB.id, targetId: wCard.id, active: true,
    }]);

    await revokeSplitLayer(ds, u.parentCard.id);

    // 层撤回后：王医生存活（retained）、李医生软失效（D-154：业务不存在）
    const resultsAfterRevoke = await scopedResults(ds, u);
    const wAfter = resultsAfterRevoke.find((r) => r.resultItemId === `ri-w-${s}`)!;
    expect(wAfter.businessStatus ?? "active").toBe("active");
    const lAfter = resultsAfterRevoke.find((r) => r.resultItemId === `ri-l-${s}`)!;
    expect(lAfter.businessStatus).toBe("revoked");

    // 重拆（同条件、完整拆分）
    const rec2 = makeRec(`rec-split-2-${s}`, u);
    recommendationStore.getState().setRecommendations([rec2]);
    const r2 = await confirmSplit(ds, rec2, splitParametersOf(u), "2026-10-22T12:00:00.000Z");
    expect(r2.success).toBe(true);

    const resultsFinal = await scopedResults(ds, u);
    // 王医生：唯一存活结果，ID 不变（复用；不产生第二份）
    const aliveW = resultsFinal.filter(
      (r) => r.resultItemId === `ri-w-${s}` && r.businessStatus !== "revoked"
    );
    expect(aliveW).toHaveLength(1);
    expect(aliveW[0].id).toBe(wResult.id);
    // 李医生：旧结果已失效不可复用 → 新建（新 ID）
    const aliveL = resultsFinal.filter(
      (r) => r.resultItemId === `ri-l-${s}` && r.businessStatus !== "revoked"
    );
    expect(aliveL).toHaveLength(1);
    expect(aliveL[0].id).not.toBe(lAfter.id);
    // 溯源批次2：王=旧 ID（复用），李=新 ID（注意带本场景后缀精确匹配，避免跨场景共享存储污染）
    const allProvenance = await provenances(ds);
    const batch2 = allProvenance.find((p) => p.id.includes(`rec-split-2-${s}`))!;
    const conditionW = batch2.conditions.find((c) => c.resultItemId === `ri-w-${s}`)!;
    const conditionL = batch2.conditions.find((c) => c.resultItemId === `ri-l-${s}`)!;
    expect(conditionW.childResultId).toBe(wResult.id);
    expect(conditionL.childResultId).toBe(aliveL[0].id);
  });

  it("场景3 只拆一部分：按需复用，未选子项不建（D-157 规则 A/C）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const rec1 = makeRec(`rec-split-1-${s}`, u);
    recommendationStore.getState().setRecommendations([rec1]);
    await confirmSplit(ds, rec1, splitParametersOf(u), "2026-10-22T10:00:00.000Z");

    const rec2 = makeRec(`rec-split-2-${s}`, u);
    recommendationStore.getState().setRecommendations([rec1, rec2]);
    const r2 = await confirmSplit(
      ds, rec2, splitParametersOf(u, { onlyW: true }), "2026-10-22T11:00:00.000Z"
    );
    expect(r2.success).toBe(true);

    // 王医生条件复用：结果与卡零新增（仍是 2 结果 2 卡）
    expect(await scopedResults(ds, u)).toHaveLength(2);
    expect(await scopedCards(ds, u)).toHaveLength(2);
    const batch2 = (await provenances(ds)).find((p) => p.id.includes(`rec-split-2-${s}`))!;
    expect(batch2.conditions).toHaveLength(1);
    expect(batch2.conditions[0].resultItemId).toBe(`ri-w-${s}`);
  });

  it("场景4 同批次重试：幂等收敛（溯源 upsert + 身份一致，不换身份）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const rec1 = makeRec(`rec-split-1-${s}`, u);
    recommendationStore.getState().setRecommendations([rec1]);
    await confirmSplit(ds, rec1, splitParametersOf(u), "2026-10-22T10:00:00.000Z");
    const rec2 = makeRec(`rec-split-2-${s}`, u);
    recommendationStore.getState().setRecommendations([rec1, rec2]);
    await confirmSplit(
      ds, rec2, splitParametersOf(u, { nameW: `老王-${s}`, nameL: `老李-${s}` }), "2026-10-22T11:00:00.000Z"
    );
    const rowsAfterFirst = {
      results: (await scopedResults(ds, u)).length,
      cards: (await scopedCards(ds, u)).length,
      provenance: (await provenances(ds)).length,
    };

    // 同批次 retry：直驱 executor + submit（持久化边界重试路径，同 D-155 测试口径）
    const decision = {
      recommendationId: rec2.id,
      action: "confirm_split" as const,
      splitParameters: splitParametersOf(u, { nameW: `老王-${s}`, nameL: `老李-${s}` }),
      sourceUnitId: u.unitA.id,
      decidedAt: "2026-10-22T11:00:00.000Z",
    };
    const cards = await ds.getCards();
    const context = await buildActionContext(
      ds, recommendationStore.getState().recommendations, sourceWorkloadCardFrom(rec2, cards)
    );
    const retryResult = executeUserDecision(decision, context);
    expect(retryResult.success).toBe(true);
    expect((retryResult.reusedChildResultIds ?? []).sort())
      .toEqual((await scopedResults(ds, u)).filter((r) => r.businessStatus !== "revoked").map((r) => r.id).sort());
    await submitActionResult(retryResult, ds, rec2.id);

    expect((await scopedResults(ds, u)).length).toBe(rowsAfterFirst.results);
    expect((await scopedCards(ds, u)).length).toBe(rowsAfterFirst.cards);
    expect((await provenances(ds)).length).toBe(rowsAfterFirst.provenance); // 同批次 upsert，不新增记录
  });

  it("场景5 复用产物死亡后：同批次重试明确拒绝（D-144 不得静默换身份）；新决策重建", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const rec1 = makeRec(`rec-split-1-${s}`, u);
    recommendationStore.getState().setRecommendations([rec1]);
    await confirmSplit(ds, rec1, splitParametersOf(u), "2026-10-22T10:00:00.000Z");
    const rec2 = makeRec(`rec-split-2-${s}`, u);
    recommendationStore.getState().setRecommendations([rec1, rec2]);
    // 批次2 复用全部子项
    await confirmSplit(ds, rec2, splitParametersOf(u), "2026-10-22T11:00:00.000Z");

    // 全路径撤回：派生产物彻底删除（D-158；溯源记录保留）
    await revokeDerivedPath(ds, u.parentCard.id);
    const aliveAfterRevoke = (await scopedResults(ds, u)).filter((r) => r.businessStatus !== "revoked");
    expect(aliveAfterRevoke).toHaveLength(0);

    // 同批次 retry：产物已死 → 明确拒绝（不得静默换身份新建）
    const decision = {
      recommendationId: rec2.id,
      action: "confirm_split" as const,
      splitParameters: splitParametersOf(u),
      sourceUnitId: u.unitA.id,
      decidedAt: "2026-10-22T11:00:00.000Z",
    };
    const cards = await ds.getCards();
    const context = await buildActionContext(
      ds, recommendationStore.getState().recommendations, sourceWorkloadCardFrom(rec2, cards)
    );
    const retryResult = executeUserDecision(decision, context);
    expect(retryResult.success).toBe(false);
    expect(retryResult.error).toMatch(/已不存在或已被撤回.*重新确认拆分/s);

    // 新决策（新批次）：按当前事实重建
    const rec3 = makeRec(`rec-split-3-${s}`, u);
    recommendationStore.getState().setRecommendations([rec3]);
    const r3 = await confirmSplit(ds, rec3, splitParametersOf(u), "2026-10-22T12:00:00.000Z");
    expect(r3.success).toBe(true);
    const aliveFinal = (await scopedResults(ds, u)).filter((r) => r.businessStatus !== "revoked");
    expect(aliveFinal).toHaveLength(2);
  });
});
