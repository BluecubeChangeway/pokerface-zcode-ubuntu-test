import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildResolutionRecommendationId,
  resolveWorkloadToUnitAndRecommend,
} from "../services/resolutionTrigger";
import { recommendationStore } from "../stores/recommendationStore";
import { canvasStore } from "../stores/canvasStore";
import { deckStore } from "../stores/deckStore";
import type { DataService } from "../services/DataService";
import { mockCards } from "../mock/mockCards";
import { mockRelations } from "../mock/mockRelations";
import {
  mockWorkloadResults,
  mockResultSets,
  mockCalculationSnapshots,
  mockWorkloadExecutions,
} from "../mock/mockWorkloadChain";
import { mockWorkloadDefinitions } from "../mock/mockWorkloadDefinitions";
import type { ResolutionMatchType } from "../domain/workload/resolutionTypes";

const WORKLOAD = "workload-neurosurgery-outpatient";
const OTHER_WORKLOAD = "workload-internal-outpatient";
const UNIT = "unit-neurosurgery";
const OTHER_UNIT = "unit-internal-medicine";

const MATCH_TYPES: ResolutionMatchType[] = ["exact", "ancestor", "descendant", "none"];

/**
 * 构建测试用 DataService：
 * - 读侧由 mock 数据的独立副本支撑（不与 MockDataService 全局可变 store 共享）
 * - 写侧为 vi.fn() 间谍，用于断言 Trigger 不产生任何持久化写入
 */
function createTriggerDataService() {
  const relations = [...mockRelations];
  const workloadResults = [...mockWorkloadResults];
  const workloadSplits: unknown[] = [];
  const cards = [...mockCards];

  return {
    getCards: async () => cards,
    getRelations: async () => relations,
    getWorkloadResults: async () => workloadResults,
    getWorkloadSplits: async () => workloadSplits,
    getResultSets: async () => mockResultSets,
    getCalculationSnapshots: async () => mockCalculationSnapshots,
    getWorkloadExecutions: async () => mockWorkloadExecutions,
    getWorkloadDefinition: async (id: string) => {
      const definition = mockWorkloadDefinitions.find((d) => d.id === id);
      if (!definition) {
        throw new Error(`Unknown workload definition: ${id}`);
      }
      return definition;
    },
    saveRelations: vi.fn(),
    saveWorkloadResults: vi.fn(),
    saveWorkloadSplits: vi.fn(),
    saveCards: vi.fn(),
  };
}

function trigger(
  ds: ReturnType<typeof createTriggerDataService>,
  workloadCardId: string,
  targetUnitId: string
) {
  return resolveWorkloadToUnitAndRecommend(
    ds as unknown as DataService,
    workloadCardId,
    targetUnitId
  );
}

describe("Production Resolution Trigger（resolveWorkloadToUnitAndRecommend）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.getState().clearFocus();
  });

  it("A: 正常触发注册 resolution 推荐，不产生任何 Domain Fact", async () => {
    const ds = createTriggerDataService();
    const { recommendation, resolutionResult } = await trigger(ds, WORKLOAD, UNIT);

    // Recommendation 已注册
    const stored = recommendationStore
      .getState()
      .getRecommendationById(recommendation.id);
    expect(stored).toBeDefined();

    // 契约字段
    expect(stored!.kind).toBe("resolution");
    expect(stored!.status).toBe("recommended");
    expect(stored!.relatedEntityIds).toEqual([WORKLOAD, UNIT]);
    // D-149：payload = resolutionResult.recommendation 的扩展（+matchingBasisSnapshot）
    expect({ ...(stored!.payload as object), matchingBasisSnapshot: undefined }).toStrictEqual({
      ...resolutionResult.recommendation,
      matchingBasisSnapshot: undefined,
    });
    expect((stored!.payload as { matchingBasisSnapshot?: unknown }).matchingBasisSnapshot).toBeDefined();
    expect(stored!.reason).toBe(resolutionResult.recommendation.reason);

    // recommendationId 稳定（确定性 ID，非随机 UUID）
    expect(recommendation.id).toBe(buildResolutionRecommendationId(WORKLOAD, UNIT));
    expect(recommendation.id).toBe(`rec-resolution-${WORKLOAD}-${UNIT}`);

    // Fact 边界：无任何 DataService 写入
    expect(ds.saveRelations).not.toHaveBeenCalled();
    expect(ds.saveWorkloadResults).not.toHaveBeenCalled();
    expect(ds.saveWorkloadSplits).not.toHaveBeenCalled();
    expect(ds.saveCards).not.toHaveBeenCalled();

    // 未进入决策/执行链
    expect(recommendationStore.getState().userDecisions).toHaveLength(0);
    expect(recommendationStore.getState().executingAction).toBe(false);
  });

  it("B: 同卡 + 同 Unit 重复触发不产生重复 recommended 推荐", async () => {
    const ds = createTriggerDataService();
    const first = await trigger(ds, WORKLOAD, UNIT);
    const second = await trigger(ds, WORKLOAD, UNIT);

    // 同卡 + 同目标 → 同 ID
    expect(second.recommendation.id).toBe(first.recommendation.id);

    // store 中只有一个该对的 recommended 推荐，不产生重复条目
    const resolutionRecs = recommendationStore
      .getState()
      .getRecommendationsByKind("resolution");
    expect(resolutionRecs).toHaveLength(1);
    expect(resolutionRecs[0].id).toBe(first.recommendation.id);
    expect(resolutionRecs[0].status).toBe("recommended");
  });

  it("C: 同卡 + 不同目标产生两个并存且 ID 不同的推荐", async () => {
    const ds = createTriggerDataService();
    const toUnitA = await trigger(ds, WORKLOAD, UNIT);
    const toUnitB = await trigger(ds, WORKLOAD, OTHER_UNIT);

    expect(toUnitA.recommendation.id).not.toBe(toUnitB.recommendation.id);

    const resolutionRecs = recommendationStore
      .getState()
      .getRecommendationsByKind("resolution");
    expect(resolutionRecs).toHaveLength(2);
    expect(resolutionRecs.map((r) => r.id)).toEqual(
      expect.arrayContaining([
        toUnitA.recommendation.id,
        toUnitB.recommendation.id,
      ])
    );

    // 不发生错误覆盖：两个推荐均可按 ID 取回
    expect(
      recommendationStore.getState().getRecommendationById(toUnitA.recommendation.id)
    ).toBeDefined();
    expect(
      recommendationStore.getState().getRecommendationById(toUnitB.recommendation.id)
    ).toBeDefined();
  });

  it("D: 不同卡 + 同一 Unit 产生两个并存且 ID 不同的推荐", async () => {
    const ds = createTriggerDataService();
    const fromWorkloadA = await trigger(ds, WORKLOAD, UNIT);
    const fromWorkloadB = await trigger(ds, OTHER_WORKLOAD, UNIT);

    expect(fromWorkloadA.recommendation.id).not.toBe(fromWorkloadB.recommendation.id);

    const resolutionRecs = recommendationStore
      .getState()
      .getRecommendationsByKind("resolution");
    expect(resolutionRecs).toHaveLength(2);

    expect(
      recommendationStore.getState().getRecommendationById(fromWorkloadA.recommendation.id)
    ).toBeDefined();
    expect(
      recommendationStore.getState().getRecommendationById(fromWorkloadB.recommendation.id)
    ).toBeDefined();
  });

  it("E: 返回完整 ResolutionResult，matchType / matchBasis 保持 ResolutionService 原始输出", async () => {
    const ds = createTriggerDataService();
    const { recommendation, resolutionResult } = await trigger(ds, WORKLOAD, UNIT);

    expect(recommendation).toBeDefined();
    expect(resolutionResult.workloadCard.id).toBe(WORKLOAD);
    expect(resolutionResult.targetUnit.id).toBe(UNIT);

    // matchType 为四种互斥类型之一（ResolutionService 原始输出）
    expect(MATCH_TYPES).toContain(resolutionResult.matchType);

    // matchBasis 保持原始结构
    expect(resolutionResult.matchBasis.targetUnitId).toBe(UNIT);
    expect(["self", "ancestor", "descendant", "none"]).toContain(
      resolutionResult.matchBasis.unitRelation
    );
    expect(typeof resolutionResult.matchDetails).toBe("string");

    // D-149：payload = resolutionResult.recommendation 的扩展（+matchingBasisSnapshot），
    // 原有字段逐项保持 ResolutionService 原始输出
    const payload = recommendation.payload as Record<string, unknown>;
    const original = resolutionResult.recommendation as unknown as Record<string, unknown>;
    for (const key of Object.keys(original)) {
      expect(payload[key]).toBe(original[key]);
    }
    expect(payload["matchingBasisSnapshot"]).toBeDefined();
  });

  it("F: 触发前后业务事实（Relations / WorkloadResults / WorkloadSplits / Cards）数量不变", async () => {
    const ds = createTriggerDataService();
    const before = {
      relations: (await ds.getRelations()).length,
      workloadResults: (await ds.getWorkloadResults()).length,
      workloadSplits: (await ds.getWorkloadSplits()).length,
      cards: (await ds.getCards()).length,
    };

    await trigger(ds, WORKLOAD, UNIT);
    await trigger(ds, WORKLOAD, OTHER_UNIT);
    await trigger(ds, OTHER_WORKLOAD, UNIT);
    await trigger(ds, WORKLOAD, UNIT); // 重复触发同样不得改变事实

    const after = {
      relations: (await ds.getRelations()).length,
      workloadResults: (await ds.getWorkloadResults()).length,
      workloadSplits: (await ds.getWorkloadSplits()).length,
      cards: (await ds.getCards()).length,
    };

    expect(after).toEqual(before);

    // 且没有任何写调用
    expect(ds.saveRelations).not.toHaveBeenCalled();
    expect(ds.saveWorkloadResults).not.toHaveBeenCalled();
    expect(ds.saveWorkloadSplits).not.toHaveBeenCalled();
    expect(ds.saveCards).not.toHaveBeenCalled();
  });

  it("消费侧：canvasStore / deckStore 现有读取逻辑能看到 Trigger 注册的推荐", async () => {
    const ds = createTriggerDataService();
    const { recommendation } = await trigger(ds, WORKLOAD, UNIT);

    // canvasStore：按 kind="resolution" + relatedEntityIds + status="recommended" 过滤
    const byCanvas = canvasStore.getState().getRecommendationsForCard(WORKLOAD);
    expect(byCanvas).toHaveLength(1);
    expect(byCanvas[0].id).toBe(recommendation.id);

    // canvasStore 焦点路径
    canvasStore.getState().setFocus(WORKLOAD);
    expect(
      canvasStore.getState().getRecommendationsForFocusedCard()
    ).toHaveLength(1);

    // deckStore：按 relatedEntityIds 过滤
    const byDeck = deckStore.getState().getRecommendationsForCard(WORKLOAD);
    expect(byDeck).toHaveLength(1);
    expect(byDeck[0].id).toBe(recommendation.id);
  });
});

describe("Recommendation 重新触发语义（D-142 方案 A：同 ID 重新推荐）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.getState().clearFocus();
  });

  it("第一次触发 → 单条 recommended", async () => {
    const ds = createTriggerDataService();
    const { recommendation } = await trigger(ds, WORKLOAD, UNIT);

    const recs = recommendationStore
      .getState()
      .getRecommendationsByKind("resolution");
    expect(recs).toHaveLength(1);
    expect(recs[0].id).toBe(recommendation.id);
    expect(recs[0].status).toBe("recommended");
  });

  it("accepted 后再次触发 → 仍只有一条同 ID 推荐，状态恢复 recommended", async () => {
    const ds = createTriggerDataService();
    const first = await trigger(ds, WORKLOAD, UNIT);
    const id = first.recommendation.id;

    // 置为 accepted（生产中由 executeDecision 在持久化成功后产生；
    // 此处直接置态以隔离被测语义：已处理后再触发）
    recommendationStore.getState().updateRecommendationStatus(id, "accepted");
    expect(
      recommendationStore.getState().getRecommendationById(id)!.status
    ).toBe("accepted");

    const again = await trigger(ds, WORKLOAD, UNIT);

    const recs = recommendationStore
      .getState()
      .getRecommendationsByKind("resolution");
    expect(recs).toHaveLength(1);
    expect(recs[0].id).toBe(id);
    expect(again.recommendation.id).toBe(id);
    expect(recs[0].status).toBe("recommended");

    // 重新触发仍然不产生任何 Domain Fact
    expect(ds.saveRelations).not.toHaveBeenCalled();
    expect(ds.saveWorkloadResults).not.toHaveBeenCalled();
    expect(ds.saveWorkloadSplits).not.toHaveBeenCalled();
    expect(ds.saveCards).not.toHaveBeenCalled();
  });

  it("ignored 后再次触发 → 仍只有一条同 ID 推荐，状态恢复 recommended", async () => {
    const ds = createTriggerDataService();
    const first = await trigger(ds, WORKLOAD, UNIT);
    const id = first.recommendation.id;

    recommendationStore.getState().updateRecommendationStatus(id, "ignored");

    await trigger(ds, WORKLOAD, UNIT);

    const recs = recommendationStore
      .getState()
      .getRecommendationsByKind("resolution");
    expect(recs).toHaveLength(1);
    expect(recs[0].id).toBe(id);
    expect(recs[0].status).toBe("recommended");
  });

  it("dismissed 后再次触发 → 仍只有一条同 ID 推荐，状态恢复 recommended", async () => {
    const ds = createTriggerDataService();
    const first = await trigger(ds, WORKLOAD, UNIT);
    const id = first.recommendation.id;

    recommendationStore.getState().updateRecommendationStatus(id, "dismissed");

    await trigger(ds, WORKLOAD, UNIT);

    const recs = recommendationStore
      .getState()
      .getRecommendationsByKind("resolution");
    expect(recs).toHaveLength(1);
    expect(recs[0].id).toBe(id);
    expect(recs[0].status).toBe("recommended");

    // Fact 边界依旧
    expect(ds.saveRelations).not.toHaveBeenCalled();
    expect(ds.saveWorkloadResults).not.toHaveBeenCalled();
    expect(ds.saveWorkloadSplits).not.toHaveBeenCalled();
    expect(ds.saveCards).not.toHaveBeenCalled();
  });
});

describe("生产链穿透：mappingEvidences 投影（Q-09-C evidence 生产链）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.getState().clearFocus();
  });

  it("Trigger 链路保持：ancestor + 无匹配观测 → cannot_determine + no_match，requiredMappings 如实列出", async () => {
    const ds = createTriggerDataService();
    const { recommendation, resolutionResult } = await trigger(
      ds,
      "workload-neurosurgery-outpatient",
      "unit-neurosurgery-ward-1"
    );

    // 原有链路不变：Context → ResolutionService → Recommendation → recommendationStore
    expect(resolutionResult.matchType).toBe("ancestor");
    const splitFeasibility = resolutionResult.matchBasis.splitFeasibility!;
    // 父级门诊统计观测为科室级，target 子单元为病区级 → 无匹配 evidence
    expect(splitFeasibility.feasible).toBe("cannot_determine");
    expect(splitFeasibility.requiredMappings).toEqual([
      "unit-wang-xx",
      "unit-li-xx",
      "unit-nursing-team",
    ]);
    expect((recommendation.payload as { type: string }).type).toBe("no_match");

    // Recommendation 仍已注册（recommended），不因 evidence 缺失而跳过注册
    const stored = recommendationStore
      .getState()
      .getRecommendationById(recommendation.id);
    expect(stored).toBeDefined();
    expect(stored!.status).toBe("recommended");
  });
});

describe("生产链穿透：MatchBasis.mappingEvidences 暴露（D-136）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.getState().clearFocus();
  });

  it("matchBasis 携带 builder 注入的实际 evidence（出院→神经外科：ward-1 病区观测）", async () => {
    const ds = createTriggerDataService();
    const { resolutionResult } = await trigger(
      ds,
      "workload-discharge-visits",
      "unit-neurosurgery"
    );

    // 全院出院无 Unit 维度 → matchType none，但 buildMatchBasis 仍须携带投影 evidence
    const evidences = resolutionResult.matchBasis.mappingEvidences;
    expect(evidences).toBeDefined();
    expect(evidences).toHaveLength(1);
    expect(evidences![0].targetChildUnitId).toBe("unit-neurosurgery-ward-1");
    expect(evidences![0].sourceDataObjectId).toBe("data-object-discharge");
    // mappingEvidence（单数）仍为 Unit 匹配解释文本，语义不混用
    expect(typeof resolutionResult.matchBasis.mappingEvidence).toBe("string");
  });
});
