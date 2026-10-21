import { describe, it, expect, vi } from "vitest";
import type { AnyCard, BudgetCard, CardSlot, UnitCard, WorkloadCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import type { WorkloadResult, WorkloadSplit } from "../domain/workload/types";
import type { CalculationResult } from "../domain/score/types";
import type { Recommendation, UserDecision } from "../domain/recommendation/types";
import { createWorkloadSplit } from "../domain/workload/splitService";
import {
  isBusinessRevoked,
  isWorkloadSplitRecordRevoked,
} from "../domain/workload/revocationService";
import {
  executeSplitLayerRevocation,
  executeFullPathRevocation,
} from "../services/revocationSubmissionService";
import {
  executeUserDecision,
  type ActionExecutorContext,
} from "../services/actionExecutor";
import { submitActionResult } from "../services/ActionSubmissionService";
import { handleWorkloadCardDropOnUnitSlot } from "../services/dropTrigger";
import { recommendationStore } from "../stores/recommendationStore";
import { MockDataService } from "../services/MockDataService";
import { ResolutionContextBuilder } from "../domain/workload/resolutionContextBuilder";
import { deckCardsOf, cardById } from "../app/canvasBootstrap";
import { getBudgetSummary } from "../domain/budget/budgetService";
import { getSlotMemberRelations } from "../domain/relation/relationService";

/**
 * Split 撤回语义测试（D-153～D-155，2026-10-08 裁定）
 *
 * 测试口径（WK §19.6）：必须断言业务查询层面的"当前世界已经不存在"
 * （Resolution 候选排除 / Deck 与 Canvas 过滤 / Slot 成员消失 / 预算摘要回落 /
 * 活跃计算结果为空），不得只断言标志位。
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `rev${seq}`;
}

interface UniverseOptions {
  /** U2 → C1 的 workload_assign（C1 成为"已继续使用"子卡） */
  assignChildToUnitUser?: boolean;
  /** C1 再拆两级：C1 → G1/G2，G1 → GG1 */
  deeperSplit?: boolean;
  /** U2 → G1 的 workload_assign（全路径测试：后代被其他 Unit 使用） */
  assignGrandToUnitUser?: boolean;
  /** CalculationResult 引用 C1（层撤销场景中 C1 未使用 → 被撤回 → 计算失效） */
  calcOnFirstChild?: boolean;
  /** budget → C1 的 confirmed budget_occupancy */
  budgetOccupancyOnFirstChild?: boolean;
  /** budget → U1 的 budget_assign（allocatedAmount 1000） */
  budgetAssignToOwner?: boolean;
}

interface RevocationUniverse {
  s: string;
  unitOwner: UnitCard;
  unitUser: UnitCard;
  budget: BudgetCard;
  parentCard: WorkloadCard;
  parentResult: WorkloadResult;
  childResults: WorkloadResult[];
  childCards: WorkloadCard[];
  grandChildResults: WorkloadResult[];
  grandChildCards: WorkloadCard[];
  greatGrandResult?: WorkloadResult;
  greatGrandCard?: WorkloadCard;
  splits: WorkloadSplit[];
  relations: Relation[];
  calcResults: CalculationResult[];
}

function buildUniverse(s: string, opts: UniverseOptions = {}): RevocationUniverse {
  const unitOwner: UnitCard = {
    id: `u-owner-${s}`, type: "unit", name: `骨科-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const unitUser: UnitCard = {
    id: `u-user-${s}`, type: "unit", name: `妇产科-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const budget: BudgetCard = {
    id: `budget-${s}`, type: "budget", name: `预算池-${s}`,
    amount: 1000, configurationState: "configured",
  };
  const parentResult: WorkloadResult = {
    id: `wr-parent-${s}`, resultSetId: `rs-${s}`, resultItemId: `ri-parent-${s}`,
    name: `出院人次-${s}`, value: 100, dimensions: { departmentId: unitOwner.id },
  };
  const parentCard: WorkloadCard = {
    id: `wl-parent-${s}`, type: "workload", name: `出院人次卡-${s}`,
    workloadResultId: parentResult.id, configurationState: "configured",
  };

  const layerSplit = createWorkloadSplit({
    parentResultId: parentResult.id,
    children: [
      { name: `子-一病区-${s}`, value: 60, dimensions: { departmentId: `u-owner-${s}` }, resultSetId: `rs-${s}`, resultItemId: `ri-c1-${s}` },
      { name: `子-二病区-${s}`, value: 40, dimensions: { departmentId: `u-owner-${s}` }, resultSetId: `rs-${s}`, resultItemId: `ri-c2-${s}` },
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
  const splits: WorkloadSplit[] = [...layerSplit.workloadSplits];

  let grandChildResults: WorkloadResult[] = [];
  const grandChildCards: WorkloadCard[] = [];
  let greatGrandResult: WorkloadResult | undefined;
  let greatGrandCard: WorkloadCard | undefined;

  if (opts.deeperSplit) {
    const deepSplit = createWorkloadSplit({
      parentResultId: childResults[0].id,
      children: [
        { name: `孙-1-${s}`, value: 35, dimensions: { departmentId: `u-owner-${s}` }, resultSetId: `rs-${s}`, resultItemId: `ri-g1-${s}` },
        { name: `孙-2-${s}`, value: 25, dimensions: { departmentId: `u-owner-${s}` }, resultSetId: `rs-${s}`, resultItemId: `ri-g2-${s}` },
      ],
      splitType: "complete",
      executionBatchId: `batch-deep-${s}`,
    }, childResults[0]);
    grandChildResults = deepSplit.childResults;
    grandChildCards.push(
      ...deepSplit.childResults.map((r, i) => ({
        id: `wl-g${i + 1}-${s}`, type: "workload" as const, name: r.name,
        workloadResultId: r.id, configurationState: "configured" as const,
      }))
    );
    relations.push(
      { id: `rel-split-g1-${s}`, type: "workload_split", sourceId: childCards[0].id, targetId: grandChildCards[0].id, active: true, metadata: { parentWorkloadResultId: childResults[0].id, childWorkloadResultId: grandChildResults[0].id } },
      { id: `rel-split-g2-${s}`, type: "workload_split", sourceId: childCards[0].id, targetId: grandChildCards[1].id, active: true, metadata: { parentWorkloadResultId: childResults[0].id, childWorkloadResultId: grandChildResults[1].id } }
    );
    splits.push(...deepSplit.workloadSplits);

    const ggSplit = createWorkloadSplit({
      parentResultId: grandChildResults[0].id,
      children: [
        { name: `曾孙-${s}`, value: 35, dimensions: { departmentId: `u-owner-${s}` }, resultSetId: `rs-${s}`, resultItemId: `ri-gg-${s}` },
      ],
      splitType: "complete",
      executionBatchId: `batch-gg-${s}`,
    }, grandChildResults[0]);
    greatGrandResult = ggSplit.childResults[0];
    greatGrandCard = {
      id: `wl-gg-${s}`, type: "workload", name: greatGrandResult.name,
      workloadResultId: greatGrandResult.id, configurationState: "configured",
    };
    relations.push(
      { id: `rel-split-gg-${s}`, type: "workload_split", sourceId: grandChildCards[0].id, targetId: greatGrandCard.id, active: true, metadata: { parentWorkloadResultId: grandChildResults[0].id, childWorkloadResultId: greatGrandResult.id } }
    );
    splits.push(...ggSplit.workloadSplits);
  }

  if (opts.assignChildToUnitUser) {
    relations.push({ id: `rel-assign-c1-${s}`, type: "workload_assign", sourceId: unitUser.id, targetId: childCards[0].id, active: true });
  }
  if (opts.assignGrandToUnitUser) {
    relations.push({ id: `rel-assign-g1-${s}`, type: "workload_assign", sourceId: unitUser.id, targetId: grandChildCards[0].id, active: true });
  }
  if (opts.budgetOccupancyOnFirstChild) {
    relations.push({ id: `rel-occ-c1-${s}`, type: "budget_occupancy", sourceId: budget.id, targetId: childCards[0].id, active: true, metadata: { matchedAmount: 600, status: "confirmed" } });
  }
  if (opts.budgetAssignToOwner) {
    relations.push({ id: `rel-bassign-${s}`, type: "budget_assign", sourceId: budget.id, targetId: unitOwner.id, active: true, metadata: { allocatedAmount: 1000 } });
  }

  const calcResults: CalculationResult[] = [];
  if (opts.calcOnFirstChild) {
    calcResults.push({
      id: `calc-${s}`,
      adjustmentTableId: `adj-${s}`,
      period: { start: "2026-01-01", end: "2026-12-31" },
      scoreResults: [
        {
          id: `calc-${s}:sd-${s}:${childCards[0].id}`,
          scoreDefinitionId: `sd-${s}`,
          workloadId: childCards[0].id,
          period: { start: "2026-01-01", end: "2026-12-31" },
          workloadValue: 60,
          totalScore: 600,
        },
      ],
      adjustmentSnapshot: [],
    });
  }

  return {
    s, unitOwner, unitUser, budget, parentCard, parentResult,
    childResults, childCards, grandChildResults, grandChildCards,
    greatGrandResult, greatGrandCard, splits, relations, calcResults,
  };
}

async function seedUniverse(ds: MockDataService, u: RevocationUniverse): Promise<void> {
  const cards: AnyCard[] = [u.unitOwner, u.unitUser, u.budget, u.parentCard, ...u.childCards];
  if (u.grandChildCards.length > 0) cards.push(...u.grandChildCards);
  if (u.greatGrandCard) cards.push(u.greatGrandCard);
  await ds.saveCards(cards);
  const results: WorkloadResult[] = [u.parentResult, ...u.childResults, ...u.grandChildResults];
  if (u.greatGrandResult) results.push(u.greatGrandResult);
  await ds.saveWorkloadResults(results);
  await ds.saveRelations(u.relations);
  await ds.saveWorkloadSplits(u.splits);
  if (u.calcResults.length > 0) await ds.saveCalculationResults(u.calcResults);
}

// ───────────────── 真实执行路径辅助（D-155 防复活 / 幂等 / 重新配置） ─────────────────

async function seedRealPathFacts(
  ds: MockDataService,
  s: string
): Promise<{ parentCard: WorkloadCard; parentResult: WorkloadResult; unitOwner: UnitCard; unitUser: UnitCard }> {
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
    name: `出院人次-${s}`, value: 100, dimensions: {},
  };
  const parentCard: WorkloadCard = {
    id: `wl-parent-${s}`, type: "workload", name: `出院人次卡-${s}`,
    workloadResultId: parentResult.id, configurationState: "configured",
  };
  await ds.saveCards([unitOwner, unitUser, parentCard]);
  await ds.saveWorkloadResults([parentResult]);
  return { parentCard, parentResult, unitOwner, unitUser };
}

async function buildExecutorContext(
  ds: MockDataService,
  rec: Recommendation,
  parentCard: WorkloadCard
): Promise<ActionExecutorContext> {
  const [cards, relations, results, splits] = await Promise.all([
    ds.getCards(), ds.getRelations(), ds.getWorkloadResults(), ds.getWorkloadSplits(),
  ]);
  return {
    existingRelations: relations,
    existingCards: new Map(
      cards.map((c) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as WorkloadCard).workloadResultId }])
    ),
    workloadCard: { id: parentCard.id, type: parentCard.type, name: parentCard.name, workloadResultId: parentCard.workloadResultId },
    existingWorkloadResults: new Map(results.map((r) => [r.id, r])),
    existingWorkloadSplits: new Map(splits.map((sp) => [sp.id, sp])),
    recommendations: new Map([[rec.id, rec]]),
    endpointKinds: new Map(cards.map((c) => [c.id, c.type as string])),
  };
}

function makeSplitDecision(
  s: string,
  parentResultId: string,
  decidedAt: string,
  opts?: { explicitIds?: boolean; recId?: string }
): { decision: UserDecision; rec: Recommendation } {
  const recId = opts?.recId ?? `rec-resolution-${s}`;
  const rec: Recommendation = {
    id: recId, kind: "resolution",
    payload: { targetWorkloadCardId: `wl-parent-${s}` },
    status: "recommended",
    createdAt: "2026-10-08T00:00:00.000Z", updatedAt: "2026-10-08T00:00:00.000Z",
  };
  const decision: UserDecision = {
    recommendationId: recId,
    action: "confirm_split",
    splitParameters: {
      parentResultId,
      children: [
        { id: opts?.explicitIds ? `wr-exp-c1-${s}` : undefined, name: `子1-${s}`, value: 60, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-x1-${s}` },
        { id: opts?.explicitIds ? `wr-exp-c2-${s}` : undefined, name: `子2-${s}`, value: 40, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-x2-${s}` },
      ],
      splitType: "complete",
    },
    decidedAt,
    sourceUnitId: `u-owner-${s}`,
  };
  return { decision, rec };
}

async function activeSplitEdgeCount(ds: MockDataService, parentCardId: string): Promise<number> {
  const relations = await ds.getRelations();
  return relations.filter(
    (r) => r.active && r.type === "workload_split" && r.sourceId === parentCardId
  ).length;
}

// ─────────────────────────────────────────────────────────

describe("Split 撤回语义（D-153～D-155）", () => {
  // 场景 1～4：当前层撤销（C1 已使用保留 / C2 未使用撤回）
  const layerOpts: UniverseOptions = { assignChildToUnitUser: true };

  it("场景1：当前层撤销——影响集只含本层：拆分边全撤、未使用子卡撤回、已使用子卡保留、父卡/Unit 不撤", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, layerOpts);
    const ds = new MockDataService();
    await seedUniverse(ds, u);

    const impact = await executeSplitLayerRevocation(ds, u.parentCard.id);

    expect(impact.deactivatedRelations.map((r) => r.id).sort()).toEqual(
      [`rel-split-c1-${s}`, `rel-split-c2-${s}`].sort()
    );
    expect(impact.revokedCards.map((c) => c.id)).toEqual([u.childCards[1].id]);
    expect(impact.revokedWorkloadResults.map((r) => r.id)).toEqual([u.childResults[1].id]);
    expect(impact.retained.map((entry) => entry.cardId)).toEqual([u.childCards[0].id]);
    expect(impact.revokedCards.some((c) => c.id === u.parentCard.id)).toBe(false);
    expect(impact.deactivatedRelations.some((r) => r.id === `rel-assign-c1-${s}`)).toBe(false);
  });

  it("场景2：当前层撤销——未使用子卡在业务查询层面消失（Deck / Canvas / Resolution 候选）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, layerOpts);
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    await executeSplitLayerRevocation(ds, u.parentCard.id);

    const cards = await ds.getCards();
    const revokedChild = cards.find((c) => c.id === u.childCards[1].id);
    expect(isBusinessRevoked(revokedChild)).toBe(true);

    // Deck / Canvas：业务世界中等同不存在
    expect(deckCardsOf(cards, "workload").some((c) => c.id === u.childCards[1].id)).toBe(false);
    expect(cardById(cards, u.childCards[1].id)).toBeUndefined();

    // Resolution：revoked Result 不进入 ResolutionContext / existing 候选
    const context = await new ResolutionContextBuilder().buildFromDataService(
      ds, u.parentCard.id, u.unitOwner.id
    );
    expect(context.existingResults.some((r) => r.id === u.childResults[1].id)).toBe(false);
    expect(context.workloadCards?.has(u.childCards[1].id)).toBe(false);
  });

  it("场景3：当前层撤销——已使用子卡及其后续用途保留，Unit 不受影响", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, layerOpts);
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    await executeSplitLayerRevocation(ds, u.parentCard.id);

    const [cards, relations, results] = await Promise.all([
      ds.getCards(), ds.getRelations(), ds.getWorkloadResults(),
    ]);
    const usedChild = cards.find((c) => c.id === u.childCards[0].id);
    expect(isBusinessRevoked(usedChild)).toBe(false);
    const assign = relations.find((r) => r.id === `rel-assign-c1-${s}`);
    expect(assign?.active).toBe(true);
    const usedResult = results.find((r) => r.id === u.childResults[0].id);
    expect(usedResult && !isBusinessRevoked(usedResult)).toBe(true);

    // 已使用子卡仍是 Resolution 可见候选；使用它的 Unit 完好
    const context = await new ResolutionContextBuilder().buildFromDataService(
      ds, u.parentCard.id, u.unitOwner.id
    );
    expect(context.existingResults.some((r) => r.id === u.childResults[0].id)).toBe(true);
    expect(context.workloadCards?.has(u.childCards[0].id)).toBe(true);
    expect(cards.find((c) => c.id === u.unitUser.id)).toBeDefined();
    expect(isBusinessRevoked(cards.find((c) => c.id === u.unitUser.id))).toBe(false);
  });

  it("场景4：当前层 Split Relation 本身被撤回——即使子卡被保留，拆分边 inactive、分解记录标记 revoked", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, layerOpts);
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    await executeSplitLayerRevocation(ds, u.parentCard.id);

    const [relations, splits] = await Promise.all([ds.getRelations(), ds.getWorkloadSplits()]);
    const retainedEdge = relations.find((r) => r.id === `rel-split-c1-${s}`);
    const revokedEdge = relations.find((r) => r.id === `rel-split-c2-${s}`);
    expect(retainedEdge?.active).toBe(false); // 保留子卡 ≠ 保留 active 拆分边
    expect(revokedEdge?.active).toBe(false);

    const c1Split = splits.find((sp) => sp.childResultId === u.childResults[0].id);
    const c2Split = splits.find((sp) => sp.childResultId === u.childResults[1].id);
    expect(c1Split && isWorkloadSplitRecordRevoked(c1Split)).toBe(true);
    expect(c2Split && isWorkloadSplitRecordRevoked(c2Split)).toBe(true);
  });

  it("场景5：全部撤回——入口保留，全部派生卡/结果物理删除（记录级闭包，D-158），无 used/unused 分流", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { deeperSplit: true, assignGrandToUnitUser: true, assignChildToUnitUser: true });
    const ds = new MockDataService();
    await seedUniverse(ds, u);

    const impact = await executeFullPathRevocation(ds, u.parentCard.id);

    expect(impact.retained).toEqual([]);
    expect(impact.revokedCards).toEqual([]);            // D-158：全路径不再产出软失效卡
    expect(impact.revokedWorkloadResults).toEqual([]); // D-158：全路径不再产出软失效结果
    expect(impact.deletedCards.map((c) => c.id).sort()).toEqual(
      [u.childCards[0].id, u.childCards[1].id, u.grandChildCards[0].id, u.grandChildCards[1].id, u.greatGrandCard!.id].sort()
    );
    expect(impact.deletedCards.some((c) => c.id === u.parentCard.id)).toBe(false);

    const cards = await ds.getCards();
    const parent = cards.find((c) => c.id === u.parentCard.id);
    expect(isBusinessRevoked(parent)).toBe(false);

    const relations = await ds.getRelations();
    // 入口自身的 assign 保留；触及派生卡的关系（含已使用后代的使用关系）全部撤回
    expect(relations.find((r) => r.id === `rel-split-c1-${s}`)?.active).toBe(false);
    expect(relations.find((r) => r.id === `rel-split-c2-${s}`)?.active).toBe(false);
    expect(relations.find((r) => r.id === `rel-split-g1-${s}`)?.active).toBe(false);
    expect(relations.find((r) => r.id === `rel-split-g2-${s}`)?.active).toBe(false);
    expect(relations.find((r) => r.id === `rel-split-gg-${s}`)?.active).toBe(false);
    expect(relations.find((r) => r.id === `rel-assign-c1-${s}`)?.active).toBe(false);
    expect(relations.find((r) => r.id === `rel-assign-g1-${s}`)?.active).toBe(false);
  });

  it("场景6：全部撤回级联多层 Split——C1/G1/GG1 三层全部物理删除且在 Resolution/Deck 查询中消失", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { deeperSplit: true, assignGrandToUnitUser: true });
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    await executeFullPathRevocation(ds, u.parentCard.id);

    const cards = await ds.getCards();
    for (const card of [u.childCards[0], u.childCards[1], u.grandChildCards[0], u.grandChildCards[1], u.greatGrandCard!]) {
      // D-158：物理删除——数据源中行已不存在
      expect(cards.find((c) => c.id === card.id), `row gone: ${card.id}`).toBeUndefined();
      expect(deckCardsOf(cards, "workload").some((c) => c.id === card.id)).toBe(false);
    }
    const results = await ds.getWorkloadResults();
    for (const result of [...u.childResults, ...u.grandChildResults, u.greatGrandResult!]) {
      expect(results.find((r) => r.id === result.id), `result gone: ${result.id}`).toBeUndefined();
    }
    const context = await new ResolutionContextBuilder().buildFromDataService(
      ds, u.parentCard.id, u.unitOwner.id
    );
    expect(context.existingResults.some((r) => r.id === u.childResults[0].id)).toBe(false);
    expect(context.existingResults.some((r) => r.id === u.greatGrandResult!.id)).toBe(false);
    expect(context.workloadCards?.has(u.grandChildCards[0].id)).toBe(false);
  });

  it("场景7：全部撤回——后代已被其他 Unit 使用也不保护；该 Unit 的 Slot 成员随之消失", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { deeperSplit: true, assignGrandToUnitUser: true });
    const ds = new MockDataService();
    await seedUniverse(ds, u);

    const before = getSlotMemberRelations(
      { ownerCardId: u.unitUser.id, type: "workload" },
      await ds.getRelations()
    );
    expect(before.some((r) => r.targetId === u.grandChildCards[0].id)).toBe(true);

    await executeFullPathRevocation(ds, u.parentCard.id);

    const [cards, relations] = await Promise.all([ds.getCards(), ds.getRelations()]);
    // D-158：已被其他 Unit 使用也不保护——物理删除（行不存在）
    expect(cards.find((c) => c.id === u.grandChildCards[0].id)).toBeUndefined();
    expect(relations.find((r) => r.id === `rel-assign-g1-${s}`)?.active).toBe(false);
    // Unit 完好，但其 Workload Slot 中被撤回的卡消失（业务查询层面）
    const after = getSlotMemberRelations(
      { ownerCardId: u.unitUser.id, type: "workload" },
      relations
    );
    expect(after.some((r) => r.targetId === u.grandChildCards[0].id)).toBe(false);
    expect(cards.find((c) => c.id === u.unitUser.id)).toBeDefined();
    expect(isBusinessRevoked(cards.find((c) => c.id === u.unitUser.id))).toBe(false);
  });

  it("场景8：两分支撤回后 UnitCard / BudgetCard 均不被删除、不失效", async () => {
    const s1 = nextSuffix();
    const u1 = buildUniverse(s1, layerOpts);
    const ds1 = new MockDataService();
    await seedUniverse(ds1, u1);
    await executeSplitLayerRevocation(ds1, u1.parentCard.id);

    const s2 = nextSuffix();
    const u2 = buildUniverse(s2, { deeperSplit: true, assignGrandToUnitUser: true });
    const ds2 = new MockDataService();
    await seedUniverse(ds2, u2);
    await executeFullPathRevocation(ds2, u2.parentCard.id);

    for (const ds of [ds1, ds2]) {
      const cards = await ds.getCards();
      const units = cards.filter((c) => c.type === "unit");
      expect(units.length).toBeGreaterThan(0);
      for (const unit of units) {
        expect(isBusinessRevoked(unit)).toBe(false);
      }
      const budgets = cards.filter((c) => c.type === "budget");
      for (const b of budgets) {
        expect(isBusinessRevoked(b)).toBe(false);
      }
    }
  });

  it("场景9：原始 WorkloadResult 不删除、不修改数值（两分支）", async () => {
    const s1 = nextSuffix();
    const u1 = buildUniverse(s1, layerOpts);
    const ds1 = new MockDataService();
    await seedUniverse(ds1, u1);
    await executeSplitLayerRevocation(ds1, u1.parentCard.id);

    const s2 = nextSuffix();
    const u2 = buildUniverse(s2, { deeperSplit: true });
    const ds2 = new MockDataService();
    await seedUniverse(ds2, u2);
    await executeFullPathRevocation(ds2, u2.parentCard.id);

    for (const [ds, u] of [[ds1, u1], [ds2, u2]] as const) {
      const results = await ds.getWorkloadResults();
      const parent = results.find((r) => r.id === u.parentResult.id);
      expect(parent).toBeDefined();
      expect(parent!.value).toBe(100);
      expect(parent!.dimensions).toEqual({ departmentId: u.unitOwner.id });
      expect(isBusinessRevoked(parent)).toBe(false);
    }
  });

  it("场景10：派生 WorkloadResult 标记 revoked 后不再进入 ResolutionContext（不作为 existing Result）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, {});
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    await executeSplitLayerRevocation(ds, u.parentCard.id);

    const context = await new ResolutionContextBuilder().buildFromDataService(
      ds, u.parentCard.id, u.unitOwner.id
    );
    expect(context.existingResults.some((r) => r.id === u.childResults[0].id)).toBe(false);
    expect(context.existingResults.some((r) => r.id === u.childResults[1].id)).toBe(false);
    expect(context.existingResults.some((r) => r.id === u.parentResult.id)).toBe(true);
  });

  it("场景11：revoked Result/Card 不再被 existing-result / Recommendation 路径复用（全分支）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { deeperSplit: true });
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    await executeFullPathRevocation(ds, u.parentCard.id);

    const context = await new ResolutionContextBuilder().buildFromDataService(
      ds, u.parentCard.id, u.unitOwner.id
    );
    const revokedResultIds = new Set(
      [...u.childResults, ...u.grandChildResults, u.greatGrandResult!].map((r) => r.id)
    );
    for (const result of context.existingResults) {
      expect(revokedResultIds.has(result.id)).toBe(false);
    }
    const revokedCardIds = new Set(
      [...u.childCards, ...u.grandChildCards, u.greatGrandCard!].map((c) => c.id)
    );
    for (const cardId of context.workloadCards?.keys() ?? []) {
      expect(revokedCardIds.has(cardId)).toBe(false);
    }
    // Deck / Canvas 同理
    const cards = await ds.getCards();
    for (const cardId of revokedCardIds) {
      expect(deckCardsOf(cards, "workload").some((c) => c.id === cardId)).toBe(false);
      expect(cardById(cards, cardId)).toBeUndefined();
    }
  });

  it("场景12：错误路径产生的 CalculationResult 撤回后失效——数值不改写、不以 0 冒充", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { calcOnFirstChild: true });
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    await executeSplitLayerRevocation(ds, u.parentCard.id);

    const calcResults = await ds.getCalculationResults();
    const calc = calcResults.find((c) => c.id === `calc-${s}`);
    expect(calc).toBeDefined();
    expect(isBusinessRevoked(calc)).toBe(true);
    // 失效不是数值篡改：原计算值保留在失效对象中
    expect(calc!.scoreResults[0].totalScore).toBe(600);
    expect(calc!.scoreResults[0].workloadValue).toBe(60);
    // 有效结果查询（业务世界）不再包含它
    expect(calcResults.filter((c) => !isBusinessRevoked(c)).some((c) => c.id === `calc-${s}`)).toBe(false);
  });

  it("场景13：撤回后计算位置恢复 pending——该工作量不存在任何有效 CalculationResult", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { calcOnFirstChild: true });
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    await executeSplitLayerRevocation(ds, u.parentCard.id);

    const calcResults = await ds.getCalculationResults();
    const activeResultsForWorkload = calcResults
      .filter((c) => !isBusinessRevoked(c))
      .filter((c) => c.scoreResults.some((score) => score.workloadId === u.childCards[0].id));
    expect(activeResultsForWorkload.length).toBe(0); // 无有效结果 = 待计算/待配置
  });

  it("场景14a：撤回 executionBatch 后旧 retry 不得复活——显式 child ID 在 executor 层被拒绝", async () => {
    const s = nextSuffix();
    const ds = new MockDataService();
    const seeded = await seedRealPathFacts(ds, s);
    const { decision, rec } = makeSplitDecision(s, seeded.parentResult.id, "2026-10-08T10:00:00.000Z", { explicitIds: true });

    const first = executeUserDecision(decision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(first.success).toBe(true);
    await submitActionResult(first, ds, rec.id);

    // 给 c1 建立继续使用证据（层撤销后它将被保留，但其拆分记录被标记 revoked）
    const [cards] = await Promise.all([ds.getCards()]);
    const c1Card = cards.find(
      (c): c is WorkloadCard => c.type === "workload" && c.workloadResultId === `wr-exp-c1-${s}`
    );
    expect(c1Card).toBeDefined();
    await ds.saveRelations([
      { id: `rel-assign-c1-${s}`, type: "workload_assign", sourceId: seeded.unitUser.id, targetId: c1Card!.id, active: true },
    ]);

    const impact = await executeSplitLayerRevocation(ds, seeded.parentCard.id);
    expect(impact.retained.map((e) => e.cardId)).toEqual([c1Card!.id]);
    expect(impact.revokedWorkloadResults.map((r) => r.id)).toEqual([`wr-exp-c2-${s}`]);

    // 同批次 retry：c1 虽被保留（result 仍 active、内容一致），但其拆分记录已标记 revoked → 必须拒绝
    const retry = executeUserDecision(decision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(retry.success).toBe(false);
    expect(retry.error).toMatch(/D-155|撤回/);

    // 事实未复活
    expect(await activeSplitEdgeCount(ds, seeded.parentCard.id)).toBe(0);
    const results = await ds.getWorkloadResults();
    expect(isBusinessRevoked(results.find((r) => r.id === `wr-exp-c2-${s}`))).toBe(true);
    expect(isBusinessRevoked(results.find((r) => r.id === `wr-exp-c1-${s}`))).toBe(false);
  });

  it("场景14b：撤回 executionBatch 后旧 retry 不得复活——生成型 child ID 在持久化边界被拒绝", async () => {
    const s = nextSuffix();
    const ds = new MockDataService();
    const seeded = await seedRealPathFacts(ds, s);
    const { decision, rec } = makeSplitDecision(s, seeded.parentResult.id, "2026-10-08T10:00:00.000Z");

    const first = executeUserDecision(decision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(first.success).toBe(true);
    await submitActionResult(first, ds, rec.id);
    expect(await activeSplitEdgeCount(ds, seeded.parentCard.id)).toBe(2);

    await executeSplitLayerRevocation(ds, seeded.parentCard.id);
    expect(await activeSplitEdgeCount(ds, seeded.parentCard.id)).toBe(0);

    // 同批次 retry：executor 不含显式 id 检查 → 通过；必须由持久化边界拒绝
    const retry = executeUserDecision(decision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(retry.success).toBe(true);
    await expect(submitActionResult(retry, ds, rec.id)).rejects.toThrow(/D-155|撤回/);

    // 事实未复活：无新 active 拆分边、revoked 结果未被覆盖为 active
    expect(await activeSplitEdgeCount(ds, seeded.parentCard.id)).toBe(0);
    const results = await ds.getWorkloadResults();
    const generatedIds = first.createdWorkloadResults.map((r) => r.id);
    for (const id of generatedIds) {
      expect(isBusinessRevoked(results.find((r) => r.id === id))).toBe(true);
    }
  });

  it("场景15：正常未撤回 executionBatch 的同决策 retry 保持 D-146 幂等收敛", async () => {
    const s = nextSuffix();
    const ds = new MockDataService();
    const seeded = await seedRealPathFacts(ds, s);
    const { decision, rec } = makeSplitDecision(s, seeded.parentResult.id, "2026-10-08T10:00:00.000Z", { explicitIds: true });

    const first = executeUserDecision(decision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(first.success).toBe(true);
    await submitActionResult(first, ds, rec.id);

    const retry = executeUserDecision(decision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(retry.success).toBe(true);
    await expect(submitActionResult(retry, ds, rec.id)).resolves.toBeUndefined();

    // 收敛：无重复事实
    const results = await ds.getWorkloadResults();
    expect(results.filter((r) => r.id === `wr-exp-c1-${s}`).length).toBe(1);
    expect(results.filter((r) => r.id === `wr-exp-c2-${s}`).length).toBe(1);
    expect(await activeSplitEdgeCount(ds, seeded.parentCard.id)).toBe(2);
  });

  it("场景16：撤回后重新配置——新批次决策成功建立新的有效业务路径，旧 revoked 事实不复活", async () => {
    const s = nextSuffix();
    const ds = new MockDataService();
    const seeded = await seedRealPathFacts(ds, s);
    const firstAt = "2026-10-08T10:00:00.000Z";
    const { decision: firstDecision, rec } = makeSplitDecision(s, seeded.parentResult.id, firstAt);

    const first = executeUserDecision(firstDecision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(first.success).toBe(true);
    await submitActionResult(first, ds, rec.id);
    const firstResultIds = first.createdWorkloadResults.map((r) => r.id);

    await executeSplitLayerRevocation(ds, seeded.parentCard.id);

    // 新决策（不同 decidedAt → 新 executionBatch）重新配置
    const second = makeSplitDecision(s, seeded.parentResult.id, "2026-10-08T11:00:00.000Z");
    const secondRun = executeUserDecision(second.decision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(secondRun.success).toBe(true);
    await expect(submitActionResult(secondRun, ds, rec.id)).resolves.toBeUndefined();

    const secondResultIds = secondRun.createdWorkloadResults.map((r) => r.id);
    expect(secondResultIds.some((id) => firstResultIds.includes(id))).toBe(false); // 新批次新身份

    const results = await ds.getWorkloadResults();
    for (const id of firstResultIds) {
      expect(isBusinessRevoked(results.find((r) => r.id === id))).toBe(true); // 旧 revoked 不复活
    }
    for (const id of secondResultIds) {
      expect(isBusinessRevoked(results.find((r) => r.id === id))).toBe(false); // 新路径有效
    }
    expect(await activeSplitEdgeCount(ds, seeded.parentCard.id)).toBe(2); // 新层两条 active 拆分边
  });

  it("场景17：全部撤回后预算/工作量当前反馈重新出现（占用回落、Slot 成员消失）", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, {
      deeperSplit: true, assignGrandToUnitUser: true,
      budgetOccupancyOnFirstChild: true, budgetAssignToOwner: true,
    });
    const ds = new MockDataService();
    await seedUniverse(ds, u);

    const beforeSummary = getBudgetSummary(u.budget, await ds.getRelations());
    expect(beforeSummary.allocated).toBe(1000);
    expect(beforeSummary.occupied).toBe(600);

    await executeFullPathRevocation(ds, u.parentCard.id);

    const relations = await ds.getRelations();
    const afterSummary = getBudgetSummary(u.budget, relations);
    expect(afterSummary.occupied).toBe(0); // 被撤回路径的占用回落
    expect(afterSummary.allocatedButIdle).toBe(1000); // 未匹配预算容量重新出现
    expect(relations.find((r) => r.id === `rel-bassign-${s}`)?.active).toBe(true); // 无关预算配置保留

    // 工作量反馈：使用被撤回后代的 Unit，其 Workload Slot 成员消失
    const slotMembers = getSlotMemberRelations({ ownerCardId: u.unitUser.id, type: "workload" }, relations);
    expect(slotMembers.length).toBe(0);
  });

  it("补充：层撤销可按 executionBatch 限定——只撤对应批次，另一批次不受影响", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, {});
    const secondBatch = createWorkloadSplit({
      parentResultId: u.parentResult.id,
      children: [
        { name: `二批-子1-${s}`, value: 20, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-d1-${s}` },
        { name: `二批-子2-${s}`, value: 20, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-d2-${s}` },
      ],
      splitType: "partial",
      executionBatchId: `batch2-${s}`,
    }, u.parentResult);
    const secondBatchCards = secondBatch.childResults.map((r, i) => ({
      id: `wl-d${i + 1}-${s}`, type: "workload" as const, name: r.name,
      workloadResultId: r.id, configurationState: "configured" as const,
    }));

    const ds = new MockDataService();
    await seedUniverse(ds, u);
    await ds.saveCards(secondBatchCards);
    await ds.saveWorkloadResults(secondBatch.childResults);
    await ds.saveWorkloadSplits(secondBatch.workloadSplits);
    await ds.saveRelations(
      secondBatch.childResults.map((r, i) => ({
        id: `rel-split-d${i + 1}-${s}`, type: "workload_split" as const,
        sourceId: u.parentCard.id, targetId: secondBatchCards[i].id, active: true,
        metadata: { parentWorkloadResultId: u.parentResult.id, childWorkloadResultId: r.id },
      }))
    );

    const impact = await executeSplitLayerRevocation(ds, u.parentCard.id, {
      executionBatchId: `batch-${s}`,
    });

    expect(impact.revokedCards.map((c) => c.id).sort()).toEqual(
      [u.childCards[0].id, u.childCards[1].id].sort()
    );
    expect(impact.deactivatedRelations.map((r) => r.id).sort()).toEqual(
      [`rel-split-c1-${s}`, `rel-split-c2-${s}`].sort()
    );

    const relations = await ds.getRelations();
    expect(relations.find((r) => r.id === `rel-split-d1-${s}`)?.active).toBe(true);
    expect(relations.find((r) => r.id === `rel-split-d2-${s}`)?.active).toBe(true);
    const results = await ds.getWorkloadResults();
    for (const r of secondBatch.childResults) {
      expect(isBusinessRevoked(results.find((x) => x.id === r.id))).toBe(false);
    }
  });

  it("组合场景：真实撤回产物 → 再次合法 Drop 同一 UnitCard——旧 assign 不复活，新 active 关系建立且持久化先于 Recommendation", async () => {
    const s = nextSuffix();
    // C1 挂在 unitUser 上（active assign）；C2 未使用
    const u = buildUniverse(s, { assignChildToUnitUser: true });
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    const slot: CardSlot = {
      id: `slot-workload-u2-${s}`,
      ownerCardId: u.unitUser.id,
      type: "workload",
      enabled: true,
      locked: false,
      acceptedCardTypes: ["workload"],
      displayMode: "hand",
      expanded: false,
    };

    // 前置：撤回前 assign(U2 → C1) 为 active
    const before = await ds.getRelations();
    expect(before.find((r) => r.id === `rel-assign-c1-${s}`)?.active).toBe(true);

    // 阶段一：真实撤回服务（非手造 inactive）——全路径撤回使派生树失效，assign(U2 → C1) 随之 inactive
    const impact = await executeFullPathRevocation(ds, u.parentCard.id);
    expect(
      impact.deactivatedRelations.some((r) => r.id === `rel-assign-c1-${s}`)
    ).toBe(true);
    const afterRevoke = await ds.getRelations();
    const revokedAssign = afterRevoke.find((r) => r.id === `rel-assign-c1-${s}`);
    expect(revokedAssign?.active).toBe(false);
    // 被撤回派生卡已被物理删除（D-158：行不存在，非软失效）
    const cardsAfterRevoke = await ds.getCards();
    expect(cardsAfterRevoke.find((c) => c.id === u.childCards[0].id)).toBeUndefined();

    // D-154 边界：被撤回的派生卡不是合法 Drop——再拖它必须静默忽略，不建关系、不复活旧行
    const droppedRevokedCard = await handleWorkloadCardDropOnUnitSlot(
      ds, u.childCards[0].id, slot
    );
    expect(droppedRevokedCard.outcome).toBe("ignored");
    expect(
      (await ds.getRelations()).find((r) => r.id === `rel-assign-c1-${s}`)?.active
    ).toBe(false);

    // 阶段二：真实业务再配置——被保留的入口/原始 WorkloadCard（未撤回）再次合法 Drop 到同一 UnitCard
    const saveSpy = vi.spyOn(ds, "saveRelations");
    const addSpy = vi.spyOn(recommendationStore.getState(), "addRecommendation");
    const recCountBefore = recommendationStore.getState().recommendations.length;

    const dropResult = await handleWorkloadCardDropOnUnitSlot(
      ds, u.parentCard.id, slot
    );

    expect(dropResult.outcome).toBe("resolved");
    if (dropResult.outcome !== "resolved") throw new Error("unreachable");
    expect(dropResult.relationOutcome).toBe("persisted");
    // 新关系：active、方向 UnitCard → WorkloadCard、与旧行不同 ID
    expect(dropResult.relation.active).toBe(true);
    expect(dropResult.relation.sourceId).toBe(u.unitUser.id);
    expect(dropResult.relation.targetId).toBe(u.parentCard.id);
    expect(dropResult.relation.id).not.toBe(revokedAssign!.id);

    const finalRelations = await ds.getRelations();
    // 原 Relation 仍为 inactive，不被复活
    expect(finalRelations.find((r) => r.id === `rel-assign-c1-${s}`)?.active).toBe(false);
    // 新业务键 (unitUser, parentCard) 恰好一条 active workload_assign
    const activeRows = finalRelations.filter(
      (r) =>
        r.active &&
        r.type === "workload_assign" &&
        r.sourceId === u.unitUser.id &&
        r.targetId === u.parentCard.id
    );
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0].id).toBe(dropResult.relation.id);

    // Resolution/Recommendation 发生在新 Relation 持久化之后（真实调用顺序证据）
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.invocationCallOrder[0]).toBeLessThan(
      addSpy.mock.invocationCallOrder[0]
    );
    expect(recommendationStore.getState().recommendations.length).toBe(recCountBefore + 1);
    expect(dropResult.trigger.recommendation.relatedEntityIds).toEqual([
      u.parentCard.id,
      u.unitUser.id,
    ]);

    saveSpy.mockRestore();
    addSpy.mockRestore();
  });

  it("D-158 验收1+8：多层派生且中间层已失活——记录闭包仍发现全部派生后代并物理删除；WorkloadSplit 记录保留并标记", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { deeperSplit: true }); // C1→G1/G2→GG1，无 assign（G1 有更深拆分=有使用证据）
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    const splitsBefore = (await ds.getWorkloadSplits()).length;

    // 先对 C1 做层撤回（D-153 不变）：本层拆分边全部失活（含保留子卡 G1 的边）、G2 软失效、G1 保留
    await executeSplitLayerRevocation(ds, u.childCards[0].id);
    const afterLayerRelations = await ds.getRelations();
    expect(afterLayerRelations.find((r) => r.id === `rel-split-g1-${s}`)?.active).toBe(false);
    const afterLayerCards = await ds.getCards();
    expect(isBusinessRevoked(afterLayerCards.find((c) => c.id === u.grandChildCards[1].id))).toBe(true); // G2 软失效（D-153）
    expect(isBusinessRevoked(afterLayerCards.find((c) => c.id === u.grandChildCards[0].id))).toBe(false); // G1 被层撤回保留

    // 再对 P 做全路径撤回：记录闭包（不依赖 Relation.active）→ 全部派生后代物理删除（含已失活分支与层撤回保留者）
    const impact = await executeFullPathRevocation(ds, u.parentCard.id);
    const deletedCardIds = new Set(impact.deletedCards.map((c) => c.id));
    const allDescendants = [u.childCards[0], u.childCards[1], u.grandChildCards[0], u.grandChildCards[1], u.greatGrandCard!];
    for (const card of allDescendants) {
      expect(deletedCardIds.has(card.id), `deleted: ${card.id}`).toBe(true);
    }
    expect(impact.revokedCards).toEqual([]);
    expect(impact.revokedWorkloadResults).toEqual([]);
    const cards = await ds.getCards();
    for (const card of allDescendants) {
      expect(cards.find((c) => c.id === card.id), `row gone: ${card.id}`).toBeUndefined();
    }
    const results = await ds.getWorkloadResults();
    for (const result of [...u.childResults, ...u.grandChildResults, u.greatGrandResult!]) {
      expect(results.find((r) => r.id === result.id), `result gone: ${result.id}`).toBeUndefined();
    }
    // 入口与原始结果保留
    expect(cards.find((c) => c.id === u.parentCard.id)).toBeDefined();
    expect(results.find((r) => r.id === u.parentResult.id)).toBeDefined();

    // 记录保留（数量不减）+ 闭包内记录全部标记 revoked（D-155 终止证据）
    const splitsAfter = await ds.getWorkloadSplits();
    expect(splitsAfter.length).toBe(splitsBefore);
    const closureResultIds = new Set(
      [...u.childResults, ...u.grandChildResults, u.greatGrandResult!].map((r) => r.id)
    );
    for (const split of splitsAfter) {
      if (closureResultIds.has(split.childResultId)) {
        expect(isWorkloadSplitRecordRevoked(split)).toBe(true);
      }
    }
    // 重复执行同一撤回 → no-op 收敛
    const again = await executeFullPathRevocation(ds, u.parentCard.id);
    expect(again.deletedCards).toHaveLength(0);
    expect(again.deletedWorkloadResults).toHaveLength(0);
    expect(again.deactivatedRelations).toHaveLength(0);
  });

  it("D-158 验收2：同一父 Result 存在多个执行批次——所有可证明归属的批次后代全部纳入物理删除", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, {});
    const secondBatch = createWorkloadSplit({
      parentResultId: u.parentResult.id,
      children: [
        { name: `二批-子1-${s}`, value: 20, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-d1-${s}` },
        { name: `二批-子2-${s}`, value: 20, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-d2-${s}` },
      ],
      splitType: "partial",
      executionBatchId: `batch2-${s}`,
    }, u.parentResult);
    const secondBatchCards = secondBatch.childResults.map((r, i) => ({
      id: `wl-d${i + 1}-${s}`, type: "workload" as const, name: r.name,
      workloadResultId: r.id, configurationState: "configured" as const,
    }));
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    await ds.saveCards(secondBatchCards);
    await ds.saveWorkloadResults(secondBatch.childResults);
    await ds.saveWorkloadSplits(secondBatch.workloadSplits);
    await ds.saveRelations(
      secondBatch.childResults.map((r, i) => ({
        id: `rel-split-d${i + 1}-${s}`, type: "workload_split" as const,
        sourceId: u.parentCard.id, targetId: secondBatchCards[i].id, active: true,
        metadata: { parentWorkloadResultId: u.parentResult.id, childWorkloadResultId: r.id },
      }))
    );

    const impact = await executeFullPathRevocation(ds, u.parentCard.id);
    const deletedIds = new Set(impact.deletedCards.map((c) => c.id));
    for (const card of [u.childCards[0], u.childCards[1], secondBatchCards[0], secondBatchCards[1]]) {
      expect(deletedIds.has(card.id)).toBe(true);
    }
    const results = await ds.getWorkloadResults();
    for (const result of [...u.childResults, ...secondBatch.childResults]) {
      expect(results.find((r) => r.id === result.id)).toBeUndefined();
    }
    const relations = await ds.getRelations();
    for (const id of [`rel-split-c1-${s}`, `rel-split-c2-${s}`, `rel-split-d1-${s}`, `rel-split-d2-${s}`]) {
      expect(relations.find((r) => r.id === id)?.active).toBe(false);
    }
  });

  it("D-158 验收4：来源不明对象（拓扑可发现、无记录：mock 子树 / Case C）进入 manualReview 不删除；Case A 孤儿 Result 为声明盲区", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, {});
    // 形态一（mock 子树 / Case C 同构）：拓扑边 + 卡 + 结果，但无 WorkloadSplit 记录
    const mResult: WorkloadResult = { id: `wr-m-${s}`, resultSetId: `rs-${s}`, resultItemId: `ri-m-${s}`, name: `无记录子-${s}`, value: 1, dimensions: {} };
    const mCard: WorkloadCard = { id: `wl-m-${s}`, type: "workload", name: `无记录子卡-${s}`, workloadResultId: mResult.id, configurationState: "configured" };
    // 形态二（Case A 盲区）：仅存结果，无记录、无关系——对记录闭包与拓扑遍历均不可达
    const orphanResult: WorkloadResult = { id: `wr-orphan-${s}`, resultSetId: `rs-${s}`, resultItemId: `ri-orphan-${s}`, name: `孤儿结果-${s}`, value: 2, dimensions: {} };
    const ds = new MockDataService();
    await seedUniverse(ds, u);
    await ds.saveWorkloadResults([mResult, orphanResult]);
    await ds.saveCards([mCard]);
    await ds.saveRelations([
      { id: `rel-split-m-${s}`, type: "workload_split", sourceId: u.parentCard.id, targetId: mCard.id, active: true },
    ]);

    const impact = await executeFullPathRevocation(ds, u.parentCard.id);

    // 删除集只含记录可归属者（C1/C2），不含无记录对象
    const deletedIds = new Set(impact.deletedCards.map((c) => c.id));
    expect(deletedIds.has(u.childCards[0].id)).toBe(true);
    expect(deletedIds.has(u.childCards[1].id)).toBe(true);
    expect(deletedIds.has(mCard.id)).toBe(false);
    // manualReview：拓扑可发现的无记录卡与其结果；已归属者不入清单
    const reviewCardIds = new Set(impact.manualReview.cards.map((c) => c.id));
    expect(reviewCardIds.has(mCard.id)).toBe(true);
    expect(reviewCardIds.has(u.childCards[0].id)).toBe(false);
    const reviewResultIds = new Set(impact.manualReview.results.map((r) => r.id));
    expect(reviewResultIds.has(mResult.id)).toBe(true);
    // 原状保留：不删除、不失效
    const [cards, results] = await Promise.all([ds.getCards(), ds.getWorkloadResults()]);
    const mCardAfter = cards.find((c) => c.id === mCard.id);
    const mResultAfter = results.find((r) => r.id === mResult.id);
    expect(mCardAfter).toBeDefined();
    expect(isBusinessRevoked(mCardAfter)).toBe(false);
    expect(mResultAfter).toBeDefined();
    expect(isBusinessRevoked(mResultAfter)).toBe(false);
    // 无记录边不误伤（MCard 未删）：保持 active，等待人工处理
    expect((await ds.getRelations()).find((r) => r.id === `rel-split-m-${s}`)?.active).toBe(true);
    // Case A 孤儿 Result：不可发现——不入删除集、不入清单、原状保留（rule 9 声明盲区）
    expect(impact.deletedWorkloadResults.some((r) => r.id === orphanResult.id)).toBe(false);
    expect(reviewResultIds.has(orphanResult.id)).toBe(false);
    expect(results.find((r) => r.id === orphanResult.id)).toBeDefined();
    // 撤回重试：manualReview 清单幂等——同一来源不明对象再次列出，且仍原状保留、不删除
    const again = await executeFullPathRevocation(ds, u.parentCard.id);
    expect(again.deletedCards).toHaveLength(0);
    const reviewAgainIds = new Set(again.manualReview.cards.map((c) => c.id));
    expect(reviewAgainIds.has(mCard.id)).toBe(true);
    const cardsFinal = await ds.getCards();
    expect(cardsFinal.find((c) => c.id === mCard.id)).toBeDefined();
    expect(isBusinessRevoked(cardsFinal.find((c) => c.id === mCard.id))).toBe(false);
  });

  it("D-158 验收5：五个执行阶段逐一注入失败 → 重试收敛到与一次成功执行一致的终态（不复活、无重复）", async () => {
    const stages = [
      "saveWorkloadSplits",
      "saveRelations",
      "saveCalculationResults",
      "deleteCards",
      "deleteWorkloadResults",
    ] as const;
    for (const stage of stages) {
      const s = nextSuffix();
      const u = buildUniverse(s, { deeperSplit: true, assignGrandToUnitUser: true, calcOnFirstChild: true });
      const ds = new MockDataService();
      await seedUniverse(ds, u);
      const splitsBefore = (await ds.getWorkloadSplits()).length;

      const spy = vi
        .spyOn(ds, stage as "saveWorkloadSplits")
        .mockImplementationOnce(async () => {
          throw new Error(`Simulated ${stage} failure`);
        });
      await expect(executeFullPathRevocation(ds, u.parentCard.id)).rejects.toThrow(
        `Simulated ${stage} failure`
      );
      spy.mockRestore();

      // 重试 → 收敛
      await executeFullPathRevocation(ds, u.parentCard.id);

      // 终态 invariants（与一次成功执行一致）
      const cards = await ds.getCards();
      for (const card of [u.childCards[0], u.childCards[1], ...u.grandChildCards, u.greatGrandCard!]) {
        expect(cards.find((c) => c.id === card.id), `${stage}:${card.id}`).toBeUndefined();
      }
      expect(cards.find((c) => c.id === u.parentCard.id)).toBeDefined(); // 入口保留
      expect(cards.find((c) => c.id === u.unitUser.id)).toBeDefined();   // UnitCard 保留
      const results = await ds.getWorkloadResults();
      expect(results.find((r) => r.id === u.parentResult.id)).toBeDefined(); // 原始结果保留
      for (const result of [...u.childResults, ...u.grandChildResults, u.greatGrandResult!]) {
        expect(results.find((r) => r.id === result.id), `${stage}:${result.id}`).toBeUndefined();
      }
      const relations = await ds.getRelations();
      expect(relations.find((r) => r.id === `rel-assign-g1-${s}`)?.active).toBe(false);
      const splits = await ds.getWorkloadSplits();
      expect(splits.length).toBe(splitsBefore); // 记录数量不减
      const calc = (await ds.getCalculationResults()).find((c) => c.id === `calc-${s}`);
      expect(isBusinessRevoked(calc)).toBe(true); // 核算软失效
      // 重复执行同一撤回 → no-op 收敛（幂等）
      const again = await executeFullPathRevocation(ds, u.parentCard.id);
      expect(again.deletedCards).toHaveLength(0);
      expect(again.deletedWorkloadResults).toHaveLength(0);
      expect(again.revokedWorkloadSplits).toHaveLength(0);
      expect(again.deactivatedRelations).toHaveLength(0);
      expect(again.revokedCalculationResults).toHaveLength(0);
      // manualReview 幂等：本宇宙无可归属差集对象 → 重跑清单为空（与首次一致）
      expect(again.manualReview.cards).toHaveLength(0);
    }
  });

  it("D-158 验收6：已删除批次 retry 不复活——显式 ID 在 executor 层拒绝，生成型 ID 在持久化边界拒绝；旧事实零重建", async () => {
    // —— 显式 ID 路径 ——
    const s = nextSuffix();
    const ds = new MockDataService();
    const seeded = await seedRealPathFacts(ds, s);
    const { decision, rec } = makeSplitDecision(s, seeded.parentResult.id, "2026-10-09T10:00:00.000Z", { explicitIds: true });
    const first = executeUserDecision(decision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(first.success).toBe(true);
    await submitActionResult(first, ds, rec.id);
    const splitsBeforeRevoke = (await ds.getWorkloadSplits()).length;

    const impact = await executeFullPathRevocation(ds, seeded.parentCard.id);
    expect(impact.deletedCards).toHaveLength(2);
    expect(impact.deletedWorkloadResults).toHaveLength(2);
    // 记录保留：撤回前后数量不变（Mock 存储跨测试共享，须用相对计数）
    expect((await ds.getWorkloadSplits()).length).toBe(splitsBeforeRevoke);

    // 同批次 retry：终结检查先于存在性跳过（D-158 顺序修正）→ executor 层拒绝
    const retry = executeUserDecision(decision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(retry.success).toBe(false);
    expect(retry.error).toMatch(/D-155|撤回/);
    // 数据未复活
    const resultsAfter = await ds.getWorkloadResults();
    expect(resultsAfter.find((r) => r.id === `wr-exp-c1-${s}`)).toBeUndefined();
    expect(resultsAfter.find((r) => r.id === `wr-exp-c2-${s}`)).toBeUndefined();
    const activeSplitEdges = (await ds.getRelations()).filter(
      (r) => r.active && r.type === "workload_split" && r.sourceId === seeded.parentCard.id
    );
    expect(activeSplitEdges).toHaveLength(0);

    // —— 生成型 ID 路径 ——
    const s2 = nextSuffix();
    const ds2 = new MockDataService();
    const seeded2 = await seedRealPathFacts(ds2, s2);
    const gen = makeSplitDecision(s2, seeded2.parentResult.id, "2026-10-09T10:00:00.000Z");
    const firstGen = executeUserDecision(gen.decision, await buildExecutorContext(ds2, gen.rec, seeded2.parentCard));
    expect(firstGen.success).toBe(true);
    await submitActionResult(firstGen, ds2, gen.rec.id);
    await executeFullPathRevocation(ds2, seeded2.parentCard.id);

    // 同批次 retry：executor 无显式 id 检查 → 通过；持久化边界 stage-0 终结检查拒绝
    const retryGen = executeUserDecision(gen.decision, await buildExecutorContext(ds2, gen.rec, seeded2.parentCard));
    expect(retryGen.success).toBe(true);
    await expect(submitActionResult(retryGen, ds2, gen.rec.id)).rejects.toThrow(/D-155|撤回/);
    // 数据未复活
    const genResultIds = firstGen.createdWorkloadResults.map((r) => r.id);
    const resultsAfterGen = await ds2.getWorkloadResults();
    for (const id of genResultIds) {
      expect(resultsAfterGen.find((r) => r.id === id)).toBeUndefined();
    }
  });

  it("D-158 验收3+9：派生对象被其他业务引用仍删除；受影响 CalculationResult 软失效待重算（原数值保留、不为 0、活跃查询排除）；独立对象保留", async () => {
    const s = nextSuffix();
    const u = buildUniverse(s, { calcOnFirstChild: true, assignChildToUnitUser: true });
    const ds = new MockDataService();
    await seedUniverse(ds, u);

    const impact = await executeFullPathRevocation(ds, u.parentCard.id);

    // 引用不保护（D-158 规则 1）：被 assign + 核算引用的 C1 仍物理删除
    expect(impact.deletedCards.map((c) => c.id)).toContain(u.childCards[0].id);
    const cards = await ds.getCards();
    expect(cards.find((c) => c.id === u.childCards[0].id)).toBeUndefined();
    // 核算软失效（D-158 规则 4）：原数值保留（不以 0 冒充）、活跃查询排除、待重算
    const calcResults = await ds.getCalculationResults();
    const calc = calcResults.find((c) => c.id === `calc-${s}`);
    expect(calc).toBeDefined();
    expect(isBusinessRevoked(calc)).toBe(true);
    expect(calc!.scoreResults[0].totalScore).toBe(600);
    expect(calc!.scoreResults[0].workloadValue).toBe(60);
    expect(
      calcResults.filter((c) => !isBusinessRevoked(c)).some((c) => c.id === `calc-${s}`)
    ).toBe(false);
    // 独立对象保留（D-158 规则 5）：UnitCard、入口卡、原始结果、独立预算方案
    expect(cards.find((c) => c.id === u.unitUser.id)).toBeDefined();
    expect(cards.find((c) => c.id === u.parentCard.id)).toBeDefined();
    expect((await ds.getWorkloadResults()).find((r) => r.id === u.parentResult.id)).toBeDefined();
    expect(cards.find((c) => c.id === u.budget.id)).toBeDefined();
  });

  it("D-158 补充回归：删除阶段失败窗口内旧 UserDecision retry 被拒（真实调用链）——撤回重试后收敛、已删对象零重建、无新增 active 拆分边", async () => {
    // —— 窗口 A：deleteCards 阶段失败 + 显式 ID 决策（executor 层拒绝）——
    const s = nextSuffix();
    const ds = new MockDataService();
    const seeded = await seedRealPathFacts(ds, s);
    const { decision, rec } = makeSplitDecision(s, seeded.parentResult.id, "2026-10-09T12:00:00.000Z", { explicitIds: true });
    const first = executeUserDecision(decision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(first.success).toBe(true);
    await submitActionResult(first, ds, rec.id);

    const failSpy = vi.spyOn(ds, "deleteCards").mockImplementationOnce(async () => {
      throw new Error("Simulated deleteCards failure");
    });
    await expect(executeFullPathRevocation(ds, seeded.parentCard.id)).rejects.toThrow(
      "Simulated deleteCards failure"
    );
    failSpy.mockRestore();
    // 窗口状态：阶段①～③已落库（记录已标记、关系已软删、核算已失效），卡/结果未删

    // 窗口内对同一旧 UserDecision 再执行（真实调用链：executor → ActionSubmissionService）
    const midRetry = executeUserDecision(decision, await buildExecutorContext(ds, rec, seeded.parentCard));
    expect(midRetry.success).toBe(false);
    expect(midRetry.error).toMatch(/D-155|撤回/);

    // 撤回重试 → 收敛；已删对象零重建、无新增 active 拆分边
    await executeFullPathRevocation(ds, seeded.parentCard.id);
    const cards = await ds.getCards();
    const results = await ds.getWorkloadResults();
    for (const resultId of [`wr-exp-c1-${s}`, `wr-exp-c2-${s}`]) {
      expect(results.find((r) => r.id === resultId)).toBeUndefined();
      expect(
        cards.find((c) => c.type === "workload" && (c as WorkloadCard).workloadResultId === resultId)
      ).toBeUndefined();
    }
    const activeEdges = (await ds.getRelations()).filter(
      (r) => r.active && r.type === "workload_split" && r.sourceId === seeded.parentCard.id
    );
    expect(activeEdges).toHaveLength(0);

    // —— 窗口 B：deleteWorkloadResults 阶段失败 + 生成型 ID 决策（持久化边界拒绝）——
    const s2 = nextSuffix();
    const ds2 = new MockDataService();
    const seeded2 = await seedRealPathFacts(ds2, s2);
    const gen = makeSplitDecision(s2, seeded2.parentResult.id, "2026-10-09T12:00:00.000Z");
    const firstGen = executeUserDecision(gen.decision, await buildExecutorContext(ds2, gen.rec, seeded2.parentCard));
    expect(firstGen.success).toBe(true);
    await submitActionResult(firstGen, ds2, gen.rec.id);

    const failSpy2 = vi.spyOn(ds2, "deleteWorkloadResults").mockImplementationOnce(async () => {
      throw new Error("Simulated deleteWorkloadResults failure");
    });
    await expect(executeFullPathRevocation(ds2, seeded2.parentCard.id)).rejects.toThrow(
      "Simulated deleteWorkloadResults failure"
    );
    failSpy2.mockRestore();
    // 窗口状态：卡已删（阶段⑤成功）、结果未删（阶段⑥失败）

    // 旧 UserDecision 再执行：executor 通过（生成型无显式 id 检查）→ 持久化边界 stage-0 终结检查拒绝
    const midRetryGen = executeUserDecision(gen.decision, await buildExecutorContext(ds2, gen.rec, seeded2.parentCard));
    expect(midRetryGen.success).toBe(true);
    await expect(submitActionResult(midRetryGen, ds2, gen.rec.id)).rejects.toThrow(/D-155|撤回/);

    // 撤回重试 → 收敛；已删对象零重建、无新增 active 拆分边
    await executeFullPathRevocation(ds2, seeded2.parentCard.id);
    const results2 = await ds2.getWorkloadResults();
    const cards2 = await ds2.getCards();
    for (const resultId of firstGen.createdWorkloadResults.map((r) => r.id)) {
      expect(results2.find((r) => r.id === resultId)).toBeUndefined();
      expect(
        cards2.find((c) => c.type === "workload" && (c as WorkloadCard).workloadResultId === resultId)
      ).toBeUndefined();
    }
    const activeEdges2 = (await ds2.getRelations()).filter(
      (r) => r.active && r.type === "workload_split" && r.sourceId === seeded2.parentCard.id
    );
    expect(activeEdges2).toHaveLength(0);
  });
});
