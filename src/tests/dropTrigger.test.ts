import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleWorkloadCardDropOnUnitSlot,
} from "../services/dropTrigger";
import {
  resolveWorkloadToUnitAndRecommend,
} from "../services/resolutionTrigger";
import { executeUseExistingResult } from "../services/actionExecutor";
import type { ActionExecutorContext } from "../services/actionExecutor";
import { ResolutionContextBuilder } from "../domain/workload/resolutionContextBuilder";
import { recommendationStore } from "../stores/recommendationStore";
import { canvasStore } from "../stores/canvasStore";
import type { DataService } from "../services/DataService";
import type { AnyCard, CardSlot, WorkloadCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import type { Recommendation, UserDecision } from "../domain/recommendation/types";
import { mockCards, mockSlots } from "../mock/mockCards";
import { mockRelations } from "../mock/mockRelations";
import {
  mockWorkloadResults,
  mockResultSets,
  mockCalculationSnapshots,
  mockWorkloadExecutions,
} from "../mock/mockWorkloadChain";
import { mockWorkloadDefinitions } from "../mock/mockWorkloadDefinitions";

/** mock 种子已有 active workload_assign 的配对（复用分支验证） */
const SEEDED_WORKLOAD = "workload-neurosurgery-outpatient";
/** 无种子 workload_assign 的干净配对（创建/持久化分支验证） */
const CLEAN_WORKLOAD = "workload-internal-outpatient";
const NEURO_UNIT = "unit-neurosurgery";
const NURSING_UNIT = "unit-nursing-team";

type SpyDataService = DataService & {
  saveRelations: ReturnType<typeof vi.fn>;
  saveWorkloadResults: ReturnType<typeof vi.fn>;
  saveWorkloadSplits: ReturnType<typeof vi.fn>;
  saveCards: ReturnType<typeof vi.fn>;
  saveCalculationResults: ReturnType<typeof vi.fn>;
};

function workloadSlotOf(ownerCardId: string, overrides?: Partial<CardSlot>): CardSlot {
  const base = mockSlots.find((s) => s.type === "workload" && s.ownerCardId === ownerCardId);
  if (!base) throw new Error(`mock 中不存在 ${ownerCardId} 的 workload slot`);
  return { ...base, ...overrides };
}

/** 有状态间谍 dataService：读侧返回可控数据，saveRelations 落入内存数组（D-150 闭环验证） */
function createStatefulDataService(options?: {
  extraCards?: AnyCard[];
  extraRelations?: Relation[];
  failOnSaveRelations?: boolean;
}): { ds: SpyDataService; relations: Relation[] } {
  const relations = [...mockRelations, ...(options?.extraRelations ?? [])];
  const cards = [...mockCards, ...(options?.extraCards ?? [])];
  const ds = {
    getCards: async () => cards,
    getRelations: async () => relations,
    getWorkloadResults: async () => mockWorkloadResults,
    getWorkloadSplits: async () => [],
    getResultSets: async () => mockResultSets,
    getCalculationSnapshots: async () => mockCalculationSnapshots,
    getWorkloadExecutions: async () => mockWorkloadExecutions,
    getWorkloadDefinition: async (id: string) => {
      const definition = mockWorkloadDefinitions.find((d) => d.id === id);
      if (!definition) throw new Error(`Unknown workload definition: ${id}`);
      return definition;
    },
    saveRelations: vi.fn(async (saved: Relation[]) => {
      if (options?.failOnSaveRelations) {
        throw new Error("Simulated saveRelations failure");
      }
      for (const relation of saved) {
        const index = relations.findIndex((r) => r.id === relation.id);
        if (index >= 0) {
          relations[index] = relation;
        } else {
          relations.push(relation);
        }
      }
    }),
    saveWorkloadResults: vi.fn(),
    saveWorkloadSplits: vi.fn(),
    saveCards: vi.fn(),
    saveCalculationResults: vi.fn(),
  } as unknown as SpyDataService;
  return { ds, relations };
}

function activeAssignRows(relations: Relation[], unitId: string, workloadId: string): Relation[] {
  return relations.filter(
    (r) =>
      r.active &&
      r.type === "workload_assign" &&
      r.sourceId === unitId &&
      r.targetId === workloadId
  );
}

describe("Drop → Relation → Resolution 业务接线层（D-150 闭环）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.getState().clearFocus();
  });

  it("A：合法 Drop 干净配对 → 建立并持久化 active workload_assign（方向 Unit→Workload），再注册 Resolution 推荐", async () => {
    const { ds, relations } = createStatefulDataService();
    const slot = workloadSlotOf(NEURO_UNIT);
    const result = await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, slot);

    expect(result.outcome).toBe("resolved");
    if (result.outcome !== "resolved") throw new Error("unreachable");
    expect(result.relationOutcome).toBe("persisted");
    // 方向与业务事实（D-150 规则 2）：source=UnitCard、target=WorkloadCard、active
    expect(result.relation.type).toBe("workload_assign");
    expect(result.relation.sourceId).toBe(NEURO_UNIT);
    expect(result.relation.targetId).toBe(CLEAN_WORKLOAD);
    expect(result.relation.active).toBe(true);
    expect(result.relation.metadata?.origin).toBe("drop"); // 来源信息，不参与业务键
    // 已持久化：数据源可见
    expect(activeAssignRows(relations, NEURO_UNIT, CLEAN_WORKLOAD)).toHaveLength(1);
    expect(activeAssignRows(relations, NEURO_UNIT, CLEAN_WORKLOAD)[0].id).toBe(result.relation.id);
    // Resolution 推荐已注册（关系之后，D-150 时序）
    expect(result.trigger.recommendation.kind).toBe("resolution");
    expect(result.trigger.recommendation.status).toBe("recommended");
    expect(result.trigger.recommendation.relatedEntityIds).toEqual([CLEAN_WORKLOAD, NEURO_UNIT]);
    const stored = recommendationStore.getState().getRecommendationById(result.trigger.recommendation.id);
    expect(stored).toBeDefined();
    expect(stored!.status).toBe("recommended");
    // 除 workload_assign 外零其他写入
    expect(ds.saveWorkloadResults).not.toHaveBeenCalled();
    expect(ds.saveWorkloadSplits).not.toHaveBeenCalled();
    expect(ds.saveCards).not.toHaveBeenCalled();
    expect(ds.saveCalculationResults).not.toHaveBeenCalled();
  });

  it("顺序证据：关系持久化（saveRelations）真实先于 Recommendation 注册（addRecommendation）", async () => {
    const { ds } = createStatefulDataService();
    const addSpy = vi.spyOn(recommendationStore.getState(), "addRecommendation");
    const result = await handleWorkloadCardDropOnUnitSlot(
      ds, CLEAN_WORKLOAD, workloadSlotOf(NEURO_UNIT)
    );
    expect(result.outcome).toBe("resolved");
    expect(ds.saveRelations).toHaveBeenCalledTimes(1);
    expect(addSpy).toHaveBeenCalledTimes(1);
    const saveOrder = (ds.saveRelations as unknown as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    const addOrder = addSpy.mock.invocationCallOrder[0];
    expect(saveOrder).toBeLessThan(addOrder);
    addSpy.mockRestore();
  });

  it("E：重复 Drop 同一配对 → 幂等复用既有 active 关系（reused），不产生第二条；推荐同 ID 单条（D-142）", async () => {
    const { ds, relations } = createStatefulDataService();
    const slot = workloadSlotOf(NEURO_UNIT);

    const first = await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, slot);
    const second = await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, slot);

    expect(first.outcome).toBe("resolved");
    expect(second.outcome).toBe("resolved");
    if (first.outcome !== "resolved" || second.outcome !== "resolved") throw new Error("unreachable");
    expect(first.relationOutcome).toBe("persisted");
    expect(second.relationOutcome).toBe("reused");
    expect(second.relation.id).toBe(first.relation.id);
    // 该配对 active 行恰 1 条；saveRelations 仅首次
    expect(activeAssignRows(relations, NEURO_UNIT, CLEAN_WORKLOAD)).toHaveLength(1);
    expect(ds.saveRelations).toHaveBeenCalledTimes(1);
    // D-142：同稳定 ID，store 中仅一条
    expect(second.trigger.recommendation.id).toBe(first.trigger.recommendation.id);
    const recs = recommendationStore
      .getState()
      .getRecommendationsByKind("resolution")
      .filter((r) => r.id === first.trigger.recommendation.id);
    expect(recs).toHaveLength(1);
    expect(recs[0].status).toBe("recommended");
  });

  it("同一 WorkloadCard → 不同 UnitCard → 业务键独立：两条 active 关系互不干扰", async () => {
    const { ds, relations } = createStatefulDataService();
    const r1 = await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, workloadSlotOf(NEURO_UNIT));
    const r2 = await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, workloadSlotOf(NURSING_UNIT));
    expect(r1.outcome).toBe("resolved");
    expect(r2.outcome).toBe("resolved");
    const rows = relations.filter(
      (r) => r.active && r.type === "workload_assign" && r.targetId === CLEAN_WORKLOAD
    );
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.sourceId))).toEqual(new Set([NEURO_UNIT, NURSING_UNIT]));
  });

  it("持久化失败 → relation_failed：不触发 Resolution、不注册 Recommendation、如实返回错误（不伪报成功）", async () => {
    const { ds } = createStatefulDataService({ failOnSaveRelations: true });
    const before = recommendationStore.getState().recommendations.length;
    const addSpy = vi.spyOn(recommendationStore.getState(), "addRecommendation");

    const result = await handleWorkloadCardDropOnUnitSlot(
      ds, CLEAN_WORKLOAD, workloadSlotOf(NEURO_UNIT)
    );

    expect(result.outcome).toBe("relation_failed");
    if (result.outcome !== "relation_failed") throw new Error("unreachable");
    expect(result.error).toContain("Simulated saveRelations failure");
    expect(addSpy).not.toHaveBeenCalled();
    expect(recommendationStore.getState().recommendations.length).toBe(before);
    addSpy.mockRestore();
  });

  it("B：slot.type 非 workload（unit slot）→ 静默 no-op，零写入、零推荐", async () => {
    const unitSlot = mockSlots.find((s) => s.type === "unit")!;
    const { ds } = createStatefulDataService();
    const before = recommendationStore.getState().recommendations.length;
    const result = await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, unitSlot);
    expect(result.outcome).toBe("ignored");
    expect(ds.saveRelations).not.toHaveBeenCalled();
    expect(recommendationStore.getState().recommendations.length).toBe(before);
  });

  it("C：canAcceptCard 为 false（disabled / locked）→ 静默 no-op，零写入、零推荐", async () => {
    const before = recommendationStore.getState().recommendations.length;
    for (const overrides of [
      { enabled: false },
      { locked: true },
    ]) {
      const { ds } = createStatefulDataService();
      const slot = workloadSlotOf(NEURO_UNIT, overrides);
      const result = await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, slot);
      expect(result.outcome).toBe("ignored");
      expect(ds.saveRelations).not.toHaveBeenCalled();
    }
    expect(recommendationStore.getState().recommendations.length).toBe(before);
  });

  it("D：ownerCardId 缺失 → 静默 no-op，零写入、零推荐", async () => {
    const { ds } = createStatefulDataService();
    const before = recommendationStore.getState().recommendations.length;
    const slot = workloadSlotOf(NEURO_UNIT, { ownerCardId: "" });
    const result = await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, slot);
    expect(result.outcome).toBe("ignored");
    expect(ds.saveRelations).not.toHaveBeenCalled();
    expect(recommendationStore.getState().recommendations.length).toBe(before);
  });

  it("D2：ownerCardId 指向不存在的目标卡 → 无效 Drop：静默忽略，零写入、零推荐", async () => {
    const { ds } = createStatefulDataService();
    const before = recommendationStore.getState().recommendations.length;
    const slot = workloadSlotOf(NEURO_UNIT, { ownerCardId: "unit-does-not-exist-drop-test" });
    const result = await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, slot);
    expect(result.outcome).toBe("ignored");
    expect(ds.saveRelations).not.toHaveBeenCalled();
    expect(recommendationStore.getState().recommendations.length).toBe(before);
  });

  it("D3：ownerCardId 指向类型不符的目标卡（非 UnitCard）→ 无效 Drop：静默忽略，零写入、零推荐", async () => {
    const { ds } = createStatefulDataService();
    const before = recommendationStore.getState().recommendations.length;
    // 目标指向一张真实存在的 WorkloadCard（存在但 type !== "unit"）
    const slot = workloadSlotOf(NEURO_UNIT, { ownerCardId: SEEDED_WORKLOAD });
    const result = await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, slot);
    expect(result.outcome).toBe("ignored");
    expect(ds.saveRelations).not.toHaveBeenCalled();
    expect(recommendationStore.getState().recommendations.length).toBe(before);
  });

  it("inactive 旧关系不能阻止重建 active（P2-1 同键规则：inactive ≠ active，不当作复用）", async () => {
    const inactiveOld: Relation = {
      id: "rel-inactive-old-drop-test",
      type: "workload_assign",
      sourceId: NEURO_UNIT,
      targetId: CLEAN_WORKLOAD,
      active: false,
    };
    const { ds, relations } = createStatefulDataService({ extraRelations: [inactiveOld] });
    const result = await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, workloadSlotOf(NEURO_UNIT));

    expect(result.outcome).toBe("resolved");
    if (result.outcome !== "resolved") throw new Error("unreachable");
    expect(result.relationOutcome).toBe("persisted");
    expect(result.relation.id).not.toBe(inactiveOld.id);
    // 旧行保持 inactive；新行 active；该配对 active 行恰 1 条
    expect(relations.find((r) => r.id === inactiveOld.id)?.active).toBe(false);
    expect(activeAssignRows(relations, NEURO_UNIT, CLEAN_WORKLOAD)).toHaveLength(1);
  });

  it("revoked WorkloadCard → 静默忽略（D-154：业务世界中等同不存在），零写入、零推荐", async () => {
    const revokedCard: WorkloadCard = {
      id: "workload-revoked-drop-test",
      type: "workload",
      name: "已撤回工作卡",
      configurationState: "configured",
      businessStatus: "revoked",
    };
    const { ds } = createStatefulDataService({ extraCards: [revokedCard] });
    const before = recommendationStore.getState().recommendations.length;
    const result = await handleWorkloadCardDropOnUnitSlot(
      ds, revokedCard.id, workloadSlotOf(NEURO_UNIT)
    );
    expect(result.outcome).toBe("ignored");
    expect(ds.saveRelations).not.toHaveBeenCalled();
    expect(recommendationStore.getState().recommendations.length).toBe(before);
  });

  it("后续 ResolutionContext 能读到 Drop 建立的新关系（builder 反向索引包含新关系）", async () => {
    const { ds } = createStatefulDataService();
    await handleWorkloadCardDropOnUnitSlot(ds, CLEAN_WORKLOAD, workloadSlotOf(NEURO_UNIT));

    const context = await new ResolutionContextBuilder().buildFromDataService(
      ds, CLEAN_WORKLOAD, NEURO_UNIT
    );
    expect(context.workloadAssignments?.get(CLEAN_WORKLOAD)).toContain(NEURO_UNIT);
  });

  it("confirm_use_existing 在 Drop 已建关系上 → executor 复用同一行，不重复建（P2-1 收敛）", async () => {
    const { ds, relations } = createStatefulDataService();
    const dropResult = await handleWorkloadCardDropOnUnitSlot(
      ds, CLEAN_WORKLOAD, workloadSlotOf(NEURO_UNIT)
    );
    expect(dropResult.outcome).toBe("resolved");
    if (dropResult.outcome !== "resolved") throw new Error("unreachable");

    const cards = await ds.getCards();
    const subject = cards.find((c) => c.id === CLEAN_WORKLOAD) as WorkloadCard;
    const rec: Recommendation = {
      id: "rec-drop-converge-test",
      kind: "resolution",
      payload: { targetWorkloadCardId: CLEAN_WORKLOAD },
      status: "recommended",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const decision: UserDecision = {
      recommendationId: rec.id,
      action: "confirm_use_existing",
      targetWorkloadCardId: CLEAN_WORKLOAD,
      sourceUnitId: NEURO_UNIT,
      decidedAt: new Date().toISOString(),
    };
    const context: ActionExecutorContext = {
      existingRelations: relations,
      existingCards: new Map(
        cards.map((c) => [
          c.id,
          { id: c.id, type: c.type, name: c.name, workloadResultId: (c as WorkloadCard).workloadResultId },
        ])
      ),
      workloadCard: {
        id: subject.id,
        type: subject.type,
        name: subject.name,
        workloadResultId: subject.workloadResultId,
      },
      existingWorkloadResults: new Map(mockWorkloadResults.map((r) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[rec.id, rec]]),
      endpointKinds: new Map(cards.map((c) => [c.id, c.type as string])),
    };

    const execResult = executeUseExistingResult(rec.id, decision, context);
    expect(execResult.success).toBe(true);
    expect(execResult.createdRelations).toHaveLength(1);
    // 复用 Drop 建立的同一行（不建第二条）
    expect(execResult.createdRelations[0].id).toBe(dropResult.relation.id);
    expect(ds.saveRelations).toHaveBeenCalledTimes(1); // 仅 Drop 时一次；executor 不写库
    expect(activeAssignRows(relations, NEURO_UNIT, CLEAN_WORKLOAD)).toHaveLength(1);
  });

  it("种子配对（已有 active assign）→ Drop 幂等复用既有关系（reused），零新写入，与直接 Trigger 产出一致", async () => {
    const { ds, relations } = createStatefulDataService();
    const slot = workloadSlotOf(NEURO_UNIT);
    const [viaDrop, direct] = await Promise.all([
      handleWorkloadCardDropOnUnitSlot(ds, SEEDED_WORKLOAD, slot),
      resolveWorkloadToUnitAndRecommend(ds, SEEDED_WORKLOAD, slot.ownerCardId),
    ]);

    expect(viaDrop.outcome).toBe("resolved");
    if (viaDrop.outcome !== "resolved") throw new Error("unreachable");
    expect(viaDrop.relationOutcome).toBe("reused");
    const seeded = activeAssignRows(relations, NEURO_UNIT, SEEDED_WORKLOAD);
    expect(seeded).toHaveLength(1);
    expect(viaDrop.relation.id).toBe(seeded[0].id);
    expect(ds.saveRelations).not.toHaveBeenCalled(); // 复用分支零写入
    // 同一触发契约：稳定 ID、payload、resolutionResult 均来自既有 Trigger
    expect(viaDrop.trigger.recommendation.id).toBe(direct.recommendation.id);
    expect(viaDrop.trigger.recommendation.payload).toStrictEqual(direct.recommendation.payload);
    expect(viaDrop.trigger.resolutionResult).toStrictEqual(direct.resolutionResult);
  });
});
