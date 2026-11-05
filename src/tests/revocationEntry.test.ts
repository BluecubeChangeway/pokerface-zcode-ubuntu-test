import { describe, expect, it, vi } from "vitest";
import type { AnyCard, UnitCard, WorkloadCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import type { WorkloadResult } from "../domain/workload/types";
import type { CalculationResult } from "../domain/score/types";
import { createWorkloadSplit } from "../domain/workload/split/splitService";
import { isBusinessRevoked } from "../domain/workload/revocation/revocationService";
import { MockDataService } from "../services/MockDataService";
import {
  previewFullPathRevocation,
  revokeDerivedPath,
  revokeDerivedPathAsPreviewed,
  revokeSplitLayer,
} from "../services/revocationEntry";

/**
 * 撤回入口接线测试（D-153 / D-158）
 * 覆盖：预览严格只读、预览与执行一致（同一套派生来源判定）、manualReview 透传、
 * 两个入口语义独立（行为证明）、层撤回 opts 透传。
 * 失败恢复与 D-155 防复活由 revocation.test.ts 既有验收覆盖（全量回归）。
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `revEnt${seq}`;
}

interface EntryUniverse {
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
  calcResults: CalculationResult[];
}

function buildEntryUniverse(s: string): EntryUniverse {
  const unitOwner: UnitCard = {
    id: `u-owner-${s}`, type: "unit", name: `骨科-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const unitUser: UnitCard = {
    id: `u-user-${s}`, type: "unit", name: `妇产科-${s}`,
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
  // manualReview 对象：拓扑边存在但无 WorkloadSplit 记录（mock 子树 / Case C 形态）
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
  const calcResults: CalculationResult[] = [{
    id: `calc-${s}`,
    adjustmentTableId: `adj-${s}`,
    period: { start: "2026-01-01", end: "2026-12-31" },
    scoreResults: [{
      id: `calc-${s}:sd-${s}:${childCards[0].id}`,
      scoreDefinitionId: `sd-${s}`,
      workloadId: childCards[0].id,
      period: { start: "2026-01-01", end: "2026-12-31" },
      workloadValue: 60,
      totalScore: 600,
    }],
    adjustmentSnapshot: [],
  }];
  return {
    s, unitOwner, unitUser, parentCard, parentResult,
    childResults, childCards, mResult, mCard, relations,
    splits: layerSplit.workloadSplits, calcResults,
  };
}

async function seedEntryUniverse(ds: MockDataService, u: EntryUniverse): Promise<void> {
  const cards: AnyCard[] = [u.unitOwner, u.unitUser, u.parentCard, ...u.childCards, u.mCard];
  await ds.saveCards(cards);
  await ds.saveWorkloadResults([u.parentResult, ...u.childResults, u.mResult]);
  await ds.saveRelations(u.relations);
  await ds.saveWorkloadSplits(u.splits);
  await ds.saveCalculationResults(u.calcResults);
}

/** 深拷贝五库快照（预览副作用比较用；数据均为 JSON 安全） */
async function deepSnapshot(ds: MockDataService) {
  return JSON.parse(JSON.stringify({
    cards: await ds.getCards(),
    relations: await ds.getRelations(),
    results: await ds.getWorkloadResults(),
    splits: await ds.getWorkloadSplits(),
    calcs: await ds.getCalculationResults(),
  }));
}

describe("撤回入口接线（D-153 层撤回 / D-158 全路径撤回，语义分离）", () => {
  it("全路径预览严格只读：五库零变化、全部 save*/delete* 零调用、两次预览结果一致", async () => {
    const s = nextSuffix();
    const u = buildEntryUniverse(s);
    const ds = new MockDataService();
    await seedEntryUniverse(ds, u);
    const before = await deepSnapshot(ds);
    const spies = (
      [
        "saveRelations", "saveWorkloadResults", "saveWorkloadSplits",
        "saveCards", "saveCalculationResults", "deleteCards", "deleteWorkloadResults",
      ] as const
    ).map((method) => vi.spyOn(ds, method));

    const preview1 = await previewFullPathRevocation(ds, u.parentCard.id);
    const preview2 = await previewFullPathRevocation(ds, u.parentCard.id);

    const after = await deepSnapshot(ds);
    expect(after).toStrictEqual(before);
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    expect(preview2).toStrictEqual(preview1);
    // 预览内容正确：删除集 = 记录可归属的 C1/C2；manualReview = 无记录的 MCard
    expect(preview1.deletedCards.map((c) => c.id).sort()).toEqual(
      [u.childCards[0].id, u.childCards[1].id].sort()
    );
    expect(preview1.deletedWorkloadResults.map((r) => r.id).sort()).toEqual(
      [u.childResults[0].id, u.childResults[1].id].sort()
    );
    expect(preview1.manualReview.cards.map((c) => c.id)).toEqual([u.mCard.id]);
  });

  it("预览与执行影响范围一致（同一套派生来源判定）；manualReview 透传且原状保留；核算软失效保留原数值", async () => {
    const s = nextSuffix();
    const u = buildEntryUniverse(s);
    const ds = new MockDataService();
    await seedEntryUniverse(ds, u);

    const preview = await previewFullPathRevocation(ds, u.parentCard.id);
    const executed = await revokeDerivedPath(ds, u.parentCard.id);

    // 预览与执行一致：无干预写入时，两次计算的影响集结构完全相同
    expect(executed).toStrictEqual(preview);
    // 执行后状态与影响集一致
    const cards = await ds.getCards();
    for (const card of executed.deletedCards) {
      expect(cards.find((c) => c.id === card.id)).toBeUndefined();
    }
    const results = await ds.getWorkloadResults();
    for (const result of executed.deletedWorkloadResults) {
      expect(results.find((r) => r.id === result.id)).toBeUndefined();
    }
    // manualReview 透传：无记录对象不删除、不失效、原状保留
    expect(executed.manualReview.cards.map((c) => c.id)).toEqual([u.mCard.id]);
    expect(cards.find((c) => c.id === u.mCard.id)).toBeDefined();
    expect(results.find((r) => r.id === u.mResult.id)).toBeDefined();
    expect(isBusinessRevoked(cards.find((c) => c.id === u.mCard.id))).toBe(false);
    // 核算软失效：行保留、原数值不改写
    const calc = (await ds.getCalculationResults()).find((c) => c.id === `calc-${s}`);
    expect(isBusinessRevoked(calc)).toBe(true);
    expect(calc!.scoreResults[0].totalScore).toBe(600);
  });

  it("两个入口语义独立（行为证明）：层撤回保留已使用子卡（D-153），全路径物理删除全部派生（D-158 使用不保护）", async () => {
    // 层撤回（D-153）
    const s1 = nextSuffix();
    const u1 = buildEntryUniverse(s1);
    const ds1 = new MockDataService();
    await seedEntryUniverse(ds1, u1);
    const layerImpact = await revokeSplitLayer(ds1, u1.parentCard.id);
    const cards1 = await ds1.getCards();
    const c1AfterLayer = cards1.find((c) => c.id === u1.childCards[0].id);
    const c2AfterLayer = cards1.find((c) => c.id === u1.childCards[1].id);
    expect(c1AfterLayer).toBeDefined();                     // 被使用 → 保留
    expect(isBusinessRevoked(c1AfterLayer)).toBe(false);
    expect(isBusinessRevoked(c2AfterLayer)).toBe(true);     // 未使用 → 软失效（行仍在）
    expect(c2AfterLayer).toBeDefined();
    expect(layerImpact.retained.map((e) => e.cardId)).toEqual([u1.childCards[0].id]);
    expect(layerImpact.deletedCards).toHaveLength(0);        // 层撤回不物理删除
    expect(layerImpact.manualReview.cards).toHaveLength(0);  // 层撤回不产生清单
    expect(cards1.find((c) => c.id === u1.mCard.id)).toBeDefined(); // 无记录对象不受影响

    // 全路径撤回（D-158）：同形状宇宙下行为完全不同——使用不保护、全部物理删除
    const s2 = nextSuffix();
    const u2 = buildEntryUniverse(s2);
    const ds2 = new MockDataService();
    await seedEntryUniverse(ds2, u2);
    const fullImpact = await revokeDerivedPath(ds2, u2.parentCard.id);
    const cards2 = await ds2.getCards();
    for (const card of u2.childCards) {
      expect(cards2.find((c) => c.id === card.id)).toBeUndefined();
    }
    expect(fullImpact.retained).toEqual([]);
    expect(cards2.find((c) => c.id === u2.mCard.id)).toBeDefined(); // manualReview 对象不删
  });

  it("层撤回入口透传 executionBatchId 限定：只撤对应批次，另一批次不受影响", async () => {
    const s = nextSuffix();
    const u = buildEntryUniverse(s);
    const secondBatch = createWorkloadSplit({
      parentResultId: u.parentResult.id,
      children: [
        { name: `二批-子1-${s}`, value: 20, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-d1-${s}` },
        { name: `二批-子2-${s}`, value: 20, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-d2-${s}` },
      ],
      splitType: "partial",
      executionBatchId: `batch2-${s}`,
    }, u.parentResult);
    const secondCards = secondBatch.childResults.map((r, i) => ({
      id: `wl-d${i + 1}-${s}`, type: "workload" as const, name: r.name,
      workloadResultId: r.id, configurationState: "configured" as const,
    }));
    const ds = new MockDataService();
    await seedEntryUniverse(ds, u);
    await ds.saveCards(secondCards);
    await ds.saveWorkloadResults(secondBatch.childResults);
    await ds.saveWorkloadSplits(secondBatch.workloadSplits);
    await ds.saveRelations(
      secondBatch.childResults.map((r, i) => ({
        id: `rel-split-d${i + 1}-${s}`, type: "workload_split" as const,
        sourceId: u.parentCard.id, targetId: secondCards[i].id, active: true,
        metadata: { parentWorkloadResultId: u.parentCard.id, childWorkloadResultId: r.id },
      }))
    );

    const impact = await revokeSplitLayer(ds, u.parentCard.id, { executionBatchId: `batch-${s}` });
    // 仅第一批：C1（被使用）保留，C2（未使用）软失效
    expect(impact.retained.map((e) => e.cardId)).toEqual([u.childCards[0].id]);
    expect(impact.revokedCards.map((c) => c.id)).toEqual([u.childCards[1].id]);
    // 第二批完全不受影响
    const cards = await ds.getCards();
    for (const card of secondCards) {
      const persisted = cards.find((c) => c.id === card.id);
      expect(persisted).toBeDefined();
      expect(isBusinessRevoked(persisted)).toBe(false);
    }
  });

  // ---- 确认范围守卫（预览后、确认前数据变化窗口的封闭）----

  /** 对 7 个写入方法挂 spy（守卫拒绝场景下必须全零） */
  function spyAllWrites(ds: MockDataService) {
    return (
      [
        "saveRelations", "saveWorkloadResults", "saveWorkloadSplits",
        "saveCards", "saveCalculationResults", "deleteCards", "deleteWorkloadResults",
      ] as const
    ).map((method) => vi.spyOn(ds, method));
  }

  it("守卫：预览后无变化 → 确认正常执行，影响与预览一致、删除生效", async () => {
    const s = nextSuffix();
    const u = buildEntryUniverse(s);
    const ds = new MockDataService();
    await seedEntryUniverse(ds, u);

    const preview = await previewFullPathRevocation(ds, u.parentCard.id);
    const executed = await revokeDerivedPathAsPreviewed(ds, u.parentCard.id, preview);

    expect(executed).toStrictEqual(preview);
    const cards = await ds.getCards();
    for (const card of u.childCards) {
      expect(cards.find((c) => c.id === card.id)).toBeUndefined();
    }
    // manualReview 对象原状保留
    expect(cards.find((c) => c.id === u.mCard.id)).toBeDefined();
  });

  it("守卫：预览后新增派生对象 → 确认拒绝执行、零撤回写入、数据原状、错误要求重新预览", async () => {
    const s = nextSuffix();
    const u = buildEntryUniverse(s);
    const ds = new MockDataService();
    await seedEntryUniverse(ds, u);
    const preview = await previewFullPathRevocation(ds, u.parentCard.id);

    // 预览后新增一批次派生子（记录 + 卡 + 关系）→ deletedCards 集变化
    const secondBatch = createWorkloadSplit({
      parentResultId: u.parentResult.id,
      children: [
        { name: `新增子-${s}`, value: 10, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-new-${s}` },
      ],
      splitType: "partial",
      executionBatchId: `batch-new-${s}`,
    }, u.parentResult);
    const newCard = {
      id: `wl-new-${s}`, type: "workload" as const, name: `新增子卡-${s}`,
      workloadResultId: secondBatch.childResults[0].id, configurationState: "configured" as const,
    };
    await ds.saveCards([newCard]);
    await ds.saveWorkloadResults(secondBatch.childResults);
    await ds.saveWorkloadSplits(secondBatch.workloadSplits);
    await ds.saveRelations([{
      id: `rel-split-new-${s}`, type: "workload_split" as const,
      sourceId: u.parentCard.id, targetId: newCard.id, active: true,
      metadata: { parentWorkloadResultId: u.parentResult.id, childWorkloadResultId: secondBatch.childResults[0].id },
    }]);

    const before = await deepSnapshot(ds);
    const spies = spyAllWrites(ds);
    await expect(
      revokeDerivedPathAsPreviewed(ds, u.parentCard.id, preview)
    ).rejects.toThrow(/确认范围校验失败.*deletedCards.*重新预览/s);
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    expect(await deepSnapshot(ds)).toStrictEqual(before);
  });

  it("守卫：预览后原影响对象被移除 → 确认拒绝执行、零撤回写入、数据原状", async () => {
    const s = nextSuffix();
    const u = buildEntryUniverse(s);
    const ds = new MockDataService();
    await seedEntryUniverse(ds, u);
    const preview = await previewFullPathRevocation(ds, u.parentCard.id);

    // 预览后移除一个待删卡（外部删除）→ 删除集变化
    await ds.deleteCards([u.childCards[1].id]);

    const before = await deepSnapshot(ds);
    const spies = spyAllWrites(ds);
    await expect(
      revokeDerivedPathAsPreviewed(ds, u.parentCard.id, preview)
    ).rejects.toThrow(/确认范围校验失败/);
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    expect(await deepSnapshot(ds)).toStrictEqual(before);
  });

  it("守卫：预览后原影响对象内容被修改 → 确认拒绝执行、零撤回写入", async () => {
    const s = nextSuffix();
    const u = buildEntryUniverse(s);
    const ds = new MockDataService();
    await seedEntryUniverse(ds, u);
    const preview = await previewFullPathRevocation(ds, u.parentCard.id);

    // 预览后修改待删卡内容（数量不变、身份不变、内容变化）→ 全字段比较命中
    await ds.saveCards([{ ...u.childCards[0], name: `改名后-${s}` }]);

    const before = await deepSnapshot(ds);
    const spies = spyAllWrites(ds);
    await expect(
      revokeDerivedPathAsPreviewed(ds, u.parentCard.id, preview)
    ).rejects.toThrow(/确认范围校验失败.*deletedCards/s);
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    expect(await deepSnapshot(ds)).toStrictEqual(before);
  });

  it("守卫：影响集数量相同但对象身份不同 → 确认拒绝执行、零撤回写入", async () => {
    const s = nextSuffix();
    const u = buildEntryUniverse(s);
    const ds = new MockDataService();
    await seedEntryUniverse(ds, u);
    const preview = await previewFullPathRevocation(ds, u.parentCard.id);

    // 移除 c2，同时新增记录可归属的新子 d1 → 数量仍为 2，但身份不同
    await ds.deleteCards([u.childCards[1].id]);
    const swapBatch = createWorkloadSplit({
      parentResultId: u.parentResult.id,
      children: [
        { name: `替换子-${s}`, value: 40, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-swap-${s}` },
      ],
      splitType: "partial",
      executionBatchId: `batch-swap-${s}`,
    }, u.parentResult);
    const swapCard = {
      id: `wl-swap-${s}`, type: "workload" as const, name: `替换子卡-${s}`,
      workloadResultId: swapBatch.childResults[0].id, configurationState: "configured" as const,
    };
    await ds.saveCards([swapCard]);
    await ds.saveWorkloadResults(swapBatch.childResults);
    await ds.saveWorkloadSplits(swapBatch.workloadSplits);
    await ds.saveRelations([{
      id: `rel-split-swap-${s}`, type: "workload_split" as const,
      sourceId: u.parentCard.id, targetId: swapCard.id, active: true,
      metadata: { parentWorkloadResultId: u.parentResult.id, childWorkloadResultId: swapBatch.childResults[0].id },
    }]);

    // 数量相同的自检：fresh compute 的删除卡数与预览一致
    const fresh = await previewFullPathRevocation(ds, u.parentCard.id);
    expect(fresh.deletedCards).toHaveLength(preview.deletedCards.length);

    const before = await deepSnapshot(ds);
    const spies = spyAllWrites(ds);
    await expect(
      revokeDerivedPathAsPreviewed(ds, u.parentCard.id, preview)
    ).rejects.toThrow(/确认范围校验失败.*deletedCards/s);
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    expect(await deepSnapshot(ds)).toStrictEqual(before);
  });
});
