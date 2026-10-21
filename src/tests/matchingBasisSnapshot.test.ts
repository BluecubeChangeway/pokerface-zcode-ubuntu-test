import { beforeEach, describe, expect, it } from "vitest";
import { toMatchingBasisSnapshot } from "../domain/workload/matchingBasisSnapshot";
import type { ResolutionResult } from "../domain/workload/resolutionTypes";
import { resolveWorkloadToUnit } from "../domain/workload/resolutionService";
import { recommendationStore } from "../stores/recommendationStore";
import { canvasStore } from "../stores/canvasStore";
import type { DataService } from "../services/DataService";
import { resolveWorkloadToUnitAndRecommend } from "../services/resolutionTrigger";
import { mockCards } from "../mock/mockCards";
import { mockRelations } from "../mock/mockRelations";
import { mockSlots } from "../mock/mockCards";
import {
  mockWorkloadResults,
  mockResultSets,
  mockCalculationSnapshots,
  mockWorkloadExecutions,
} from "../mock/mockWorkloadChain";
import { mockWorkloadDefinitions } from "../mock/mockWorkloadDefinitions";
import { toRecommendationDetail } from "../app/recommendationList";

const WORKLOAD = "workload-neurosurgery-outpatient";
const NEURO_UNIT = "unit-neurosurgery";
const WARD1 = "unit-neurosurgery-ward-1";

/** 可变 stub：getResultSets 返回引用，供 D-142 re-offer 场景在两次触发间修改数据 */
function createStubDataService(resultSets: typeof mockResultSets): DataService {
  return {
    getCards: async () => mockCards,
    getRelations: async () => mockRelations,
    getWorkloadResults: async () => mockWorkloadResults,
    getWorkloadSplits: async () => [],
    getResultSets: async () => resultSets,
    getCalculationSnapshots: async () => mockCalculationSnapshots,
    getWorkloadExecutions: async () => mockWorkloadExecutions,
    getWorkloadDefinition: async (id: string) => {
      const definition = mockWorkloadDefinitions.find((d) => d.id === id);
      if (!definition) throw new Error(`Unknown workload definition: ${id}`);
      return definition;
    },
  } as unknown as DataService;
}

/** 最小 ResolutionResult fixture（ancestor 场景：含 evidence / feasibility / existing） */
function makeResultFixture(): ResolutionResult {
  const context = {
    workloadCard: { id: WORKLOAD, type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
    targetUnit: { id: WARD1, type: "unit", name: "神经外科一病区" },
    existingResults: mockWorkloadResults,
    resultSets: mockResultSets,
    snapshots: mockCalculationSnapshots,
    unitHierarchy: new Map([
      ["unit-neurosurgery", ["unit-neurosurgery-ward-1", "unit-neurosurgery-ward-2", "unit-intervention-room"]],
      ["unit-neurosurgery-ward-1", ["unit-wang-xx", "unit-li-xx", "unit-nursing-team"]],
    ]),
    workloadHierarchy: new Map([
      ["workload-neurosurgery-outpatient", ["workload-wang-outpatient", "workload-li-outpatient"]],
    ]),
    workloadDefinitionMap: new Map(mockWorkloadDefinitions.map((d) => [d.id, d])),
    workloadExecutionMap: new Map(mockWorkloadExecutions.map((e) => [e.id, e])),
    existingCards: new Map(
      mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])
    ),
    mappingEvidences: [
      {
        sourceDataObjectId: "data-object-outpatient",
        targetChildUnitId: "unit-wang-xx",
        matchedDimensionValues: { departmentId: "unit-wang-xx" },
        confidence: "high",
        evidenceDescription: "来自父级 ResultSet rs-snapshot-outpatient-2025 的实际维度观测",
      },
    ],
  };
  return resolveWorkloadToUnit(context as any);
}

describe("MatchingBasisSnapshot（D-149）：提取 / 隔离 / Trigger / re-offer / selector", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.getState().clearFocus();
  });

  it("1. Snapshot 提取：ResolutionResult → 字段逐项准确（matchType/matchDetails/unitRelation/dimensions/evidence/feasibility）", () => {
    const result = makeResultFixture();
    const snapshot = toMatchingBasisSnapshot(result);

    expect(snapshot.matchType).toBe(result.matchType);
    expect(snapshot.matchDetails).toBe(result.matchDetails);
    expect(snapshot.unitRelation).toBe(result.matchBasis.unitRelation);
    expect(snapshot.targetUnitId).toBe(result.matchBasis.targetUnitId);
    expect(snapshot.resultDimensions).toEqual(result.matchBasis.resultDimensions);
    expect(snapshot.definitionId).toBe(result.matchBasis.definitionId);
    expect(snapshot.mappingEvidence).toBe(result.matchBasis.mappingEvidence);
    expect(snapshot.mappingEvidences).toEqual(result.matchBasis.mappingEvidences);
    if (result.matchBasis.splitFeasibility) {
      expect(snapshot.splitFeasibility?.feasible).toBe(result.matchBasis.splitFeasibility.feasible);
      expect(snapshot.splitFeasibility?.reason).toBe(result.matchBasis.splitFeasibility.reason);
      expect(snapshot.splitFeasibility?.requiredMappings).toEqual(
        result.matchBasis.splitFeasibility.requiredMappings
      );
    }
    expect(snapshot.existingResult).toEqual(result.matchBasis.existingResult);
    // 未纳入 ResolutionResult 的展示信息（workloadCard/targetUnit 名称）——不是第二个仓库
    const snapshotRecord = snapshot as unknown as Record<string, unknown>;
    expect(snapshotRecord.workloadCard).toBeUndefined();
    expect(snapshotRecord.targetUnit).toBeUndefined();
    expect(snapshotRecord.recommendation).toBeUndefined();
  });

  it("2+6. 引用隔离：提取后修改原 matchBasis / 其嵌套数组，不影响已生成快照（深拷贝）", () => {
    const result = makeResultFixture();
    const snapshot = toMatchingBasisSnapshot(result);

    // 原对象就地修改
    result.matchType = "none";
    result.matchDetails = "被篡改";
    result.matchBasis.unitRelation = "none";
    if (result.matchBasis.mappingEvidences) {
      result.matchBasis.mappingEvidences[0].targetChildUnitId = "被篡改";
      result.matchBasis.mappingEvidences.push({
        sourceDataObjectId: "x",
        targetChildUnitId: "y",
        matchedDimensionValues: {},
        confidence: "low",
        evidenceDescription: "伪造",
      });
    }
    if (result.matchBasis.resultDimensions) {
      result.matchBasis.resultDimensions.departmentId = "被篡改";
    }
    if (result.matchBasis.splitFeasibility?.requiredMappings) {
      result.matchBasis.splitFeasibility.requiredMappings.push("被篡改");
    }

    expect(snapshot.matchType).not.toBe("none");
    expect(snapshot.matchDetails).not.toBe("被篡改");
    expect(snapshot.unitRelation).not.toBe("none");
    expect(snapshot.mappingEvidences?.[0].targetChildUnitId).not.toBe("被篡改");
    expect(snapshot.mappingEvidences?.length).toBe(result.matchBasis.mappingEvidences ? result.matchBasis.mappingEvidences.length - 1 : undefined);
    expect(snapshot.resultDimensions?.departmentId).not.toBe("被篡改");
    expect(snapshot.splitFeasibility?.requiredMappings).not.toContain("被篡改");
  });

  it("3. Trigger 生成：Recommendation payload 携带 Snapshot 且与当次 ResolutionResult.matchBasis 一致", async () => {
    const { recommendation, resolutionResult } = await resolveWorkloadToUnitAndRecommend(
      createStubDataService(mockResultSets),
      WORKLOAD,
      NEURO_UNIT
    );
    const payload = recommendation.payload as { matchingBasisSnapshot?: unknown };
    expect(payload.matchingBasisSnapshot).toBeDefined();
    expect(payload.matchingBasisSnapshot).toEqual(toMatchingBasisSnapshot(resolutionResult));
    // 深等价于当次 matchBasis 的解释性子集
    expect((payload.matchingBasisSnapshot as any).matchType).toBe(resolutionResult.matchType);
    expect((payload.matchingBasisSnapshot as any).unitRelation).toBe(resolutionResult.matchBasis.unitRelation);
  });

  it("4. D-142 re-offer：同 ID 触发两次（数据变化）→ store 单条，Snapshot 更新为新 Basis", async () => {
    // 第一次触发：标准 resultSets
    const resultSetsV1 = mockResultSets;
    const dsV1 = createStubDataService(resultSetsV1);
    const first = await resolveWorkloadToUnitAndRecommend(dsV1, WORKLOAD, NEURO_UNIT);
    const firstSnapshot = (first.recommendation.payload as any).matchingBasisSnapshot as Record<string, unknown>;
    const recId = first.recommendation.id;
    expect(recommendationStore.getState().getRecommendationById(recId)).toBeDefined();

    // 两次触发之间：数据变化——给父级 ResultSet 添加新的实际维度观测（ward-2 的 evidence）
    const resultSetsV2 = resultSetsV1.map((rs) =>
      rs.id === "rs-snapshot-outpatient-2025"
        ? {
            ...rs,
            items: [
              ...rs.items,
              {
                id: "ri-outpatient-ward-2-new",
                value: 500,
                dimensions: { departmentId: "unit-neurosurgery-ward-2" },
                granularity: "aggregate" as const,
                outputColumnName: "visits",
                roleInGraph: "final" as const,
              },
            ],
          }
        : rs
    );

    // 第二次触发（同 recId）：re-offer upsert，Snapshot 更新
    const second = await resolveWorkloadToUnitAndRecommend(
      createStubDataService(resultSetsV2),
      WORKLOAD,
      NEURO_UNIT
    );
    expect(second.recommendation.id).toBe(recId); // D-142 同 ID
    const recs = recommendationStore
      .getState()
      .getRecommendationsByKind("resolution")
      .filter((r) => r.id === recId);
    expect(recs).toHaveLength(1); // store 单条

    // store 中保存的是第二次的 Snapshot（re-offer 更新）
    const storedPayload = recs[0].payload as { matchingBasisSnapshot?: Record<string, unknown> };
    expect(storedPayload.matchingBasisSnapshot).toBeDefined();
    expect(storedPayload.matchingBasisSnapshot).toEqual(
      (second.recommendation.payload as any).matchingBasisSnapshot
    );
    // 且新快照包含新观测（ward-2 evidence 出现于 mappingEvidences）
    const evidences = (storedPayload.matchingBasisSnapshot as any).mappingEvidences as Array<{ targetChildUnitId: string }>;
    expect(evidences.some((e) => e.targetChildUnitId === "unit-neurosurgery-ward-2")).toBe(true);
  });

  it("5. UI selector：Recommendation → matchingBasis 原样透出（不重算、未携带时省略）", async () => {
    const { recommendation } = await resolveWorkloadToUnitAndRecommend(
      createStubDataService(mockResultSets),
      WORKLOAD,
      NEURO_UNIT
    );
    const detail = toRecommendationDetail(recommendation);
    expect(detail?.matchingBasis).toBeDefined();
    expect(detail?.matchingBasis?.matchType).toBe(
      (recommendation.payload as any).matchingBasisSnapshot.matchType
    );
    expect(detail?.matchingBasis).toBe(
      (recommendation.payload as any).matchingBasisSnapshot
    ); // 原样引用，不重算

    // 未携带快照的 Recommendation（旧数据）→ 省略而非伪造
    const legacy = { ...recommendation, id: "rec-legacy", payload: { type: "use_existing_result" } };
    const legacyDetail = toRecommendationDetail(legacy);
    expect(legacyDetail?.matchingBasis).toBeUndefined();
  });
});
