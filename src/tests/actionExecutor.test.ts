import { describe, expect, it, vi } from "vitest";
import { resolveWorkloadToUnit } from "../domain/workload/resolutionService";
import { executeUseExistingResult, executeFindExistingWorkload, executeUserDecision, handleCancelOrDismiss } from "../services/actionExecutor";
import { submitActionResult } from "../services/ActionSubmissionService";
import { mockCards } from "../mock/mockCards";
import { mockRelations } from "../mock/mockRelations";
import { mockWorkloadResults } from "../mock/mockWorkloadChain";
import { mockWorkloadDefinitions } from "../mock/mockWorkloadDefinitions";
import { mockWorkloadExecutions } from "../mock/mockWorkloadChain";
import { mockCalculationSnapshots } from "../mock/mockWorkloadChain";
import { mockResultSets } from "../mock/mockWorkloadChain";
import type { ActionExecutorContext, ActionExecutorResult } from "../services/actionExecutor";
import type { Recommendation } from "../domain/recommendation/types";
import { recommendationStore } from "../stores/recommendationStore";
import { dataService } from "../services/MockDataService";
import type { DataService } from "../services/DataService";

describe("Integration with ResolutionService", () => {
  it("ResolutionResult should be usable by ActionExecutor", () => {
    // Build a ResolutionContext
    const unitHierarchy = new Map<string, string[]>();
    for (const relation of mockRelations) {
      if (relation.type === "structure" && relation.active) {
        const children = unitHierarchy.get(relation.sourceId) || [];
        children.push(relation.targetId);
        unitHierarchy.set(relation.sourceId, children);
      }
    }

    const workloadHierarchy = new Map<string, string[]>();
    for (const relation of mockRelations) {
      if (relation.type === "workload_split" && relation.active) {
        const children = workloadHierarchy.get(relation.sourceId) || [];
        children.push(relation.targetId);
        workloadHierarchy.set(relation.sourceId, children);
      }
    }

    // Use mock workload results for existingResults
    const existingResults = mockWorkloadResults;

    const result = resolveWorkloadToUnit({
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" } as any,
      targetUnit: { id: "unit-neurosurgery-ward-1", type: "unit", name: "神经外科一病区" } as any,
      existingResults,
      resultSets: mockResultSets,
      snapshots: mockCalculationSnapshots,
      unitHierarchy,
      workloadHierarchy,
      workloadDefinitionMap: new Map(mockWorkloadDefinitions.map(d => [d.id, d])),
      workloadExecutionMap: new Map(mockWorkloadExecutions.map(e => [e.id, e])),
      sourceDataObjects: new Map(),
      mappingEvidences: [],
    });

    // Without mapping evidence, ancestor match should return no_match recommendation
    // (split is not feasible without mapping evidence proving child units can be distinguished in source data)
    // Also, missing workload_assign Relation means we cannot determine split feasibility
    expect(result.matchType).toBe("ancestor");
    expect(result.matchBasis.splitFeasibility).toBeDefined();
    expect(result.matchBasis.splitFeasibility!.feasible).toBe("cannot_determine");
    expect(result.recommendation.type).toBe("no_match");
  });
});

describe("executeUseExistingResult - duplicate check consistency (P1 fix)", () => {
  function buildContext(): ActionExecutorContext {
    return {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map(),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: undefined,
    };
  }

  it("recommendation target = A, decision target = B: duplicate check must target B", () => {
    const context = buildContext();
    
    // Add a recommendation that points to workload-internal-outpatient (A)
    const recommendation = {
      id: "rec-test-a",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" }, // A
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    context.recommendations.set(recommendation.id, recommendation);

    // Decision specifies a different target workload-neurosurgery-outpatient (B)
    const decision = {
      recommendationId: "rec-test-a",
      action: "confirm_use_existing" as const,
      sourceUnitId: "unit-internal-medicine",
      targetWorkloadCardId: "workload-neurosurgery-outpatient", // B
      decidedAt: new Date().toISOString(),
    };

    const result = executeUserDecision(decision, context);

    expect(result.success).toBe(true);
    expect(result.createdRelations[0].targetId).toBe("workload-neurosurgery-outpatient"); // Created for B
    // Duplicate check should have been against B, not A
  });

  it("B already has workload_assign: execution must fail, not create duplicate Relation", () => {
    const context = buildContext();
    
    // Pre-create a workload_assign for B
    context.existingRelations.push({
      id: "existing-rel-1",
      type: "workload_assign",
      sourceId: "unit-internal-medicine",
      targetId: "workload-neurosurgery-outpatient", // B
      active: true,
      metadata: {},
    });

    const recommendation = {
      id: "rec-test-b",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" }, // A
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    context.recommendations.set(recommendation.id, recommendation);

    const decision = {
      recommendationId: "rec-test-b",
      action: "confirm_use_existing" as const,
      sourceUnitId: "unit-internal-medicine",
      targetWorkloadCardId: "workload-neurosurgery-outpatient", // B (already has relation)
      decidedAt: new Date().toISOString(),
    };

    const result = executeUserDecision(decision, context);

    // Q-09-C P2-1 裁定 B：同业务键已存在 active workload_assign -> 复用而非失败
    expect(result.success).toBe(true);
    expect(result.createdRelations).toHaveLength(1);
    expect(result.createdRelations[0].id).toBe("existing-rel-1"); // 复用已有 Relation，不创建第二条
  });

  it("B does not have workload_assign: execution succeeds, createdRelations[0].targetId === B", () => {
    const context = buildContext();
    
    const recommendation = {
      id: "rec-test-c",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" }, // A
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    context.recommendations.set(recommendation.id, recommendation);

    const decision = {
      recommendationId: "rec-test-c",
      action: "confirm_use_existing" as const,
      sourceUnitId: "unit-internal-medicine",
      targetWorkloadCardId: "workload-neurosurgery-outpatient", // B (no existing relation)
      decidedAt: new Date().toISOString(),
    };

    const result = executeUserDecision(decision, context);

    expect(result.success).toBe(true);
    expect(result.createdRelations[0].targetId).toBe("workload-neurosurgery-outpatient"); // Created for B
  });

  it("recommendation target = A, decision does not provide target: uses A", () => {
    const context = buildContext();
    
    const recommendation = {
      id: "rec-test-d",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" }, // A
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    context.recommendations.set(recommendation.id, recommendation);

    // Decision does NOT provide targetWorkloadCardId
    const decision = {
      recommendationId: "rec-test-d",
      action: "confirm_use_existing" as const,
      sourceUnitId: "unit-internal-medicine",
      decidedAt: new Date().toISOString(),
    };

    const result = executeUserDecision(decision, context);

    expect(result.success).toBe(true);
    expect(result.createdRelations[0].targetId).toBe("workload-internal-outpatient"); // Falls back to A
  });

  it("confirm_use_current + useCurrent=true: uses context.workloadCard.id and checks duplicate correctly", () => {
    const context = buildContext();
    // Set context.workloadCard to workload-neurosurgery-outpatient
    context.workloadCard = { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" };

    const recommendation = {
      id: "rec-test-e",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" }, // A
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    context.recommendations.set(recommendation.id, recommendation);

    const decision = {
      recommendationId: "rec-test-e",
      action: "confirm_use_current" as const,
      sourceUnitId: "unit-internal-medicine",
      useCurrent: true, // Should use context.workloadCard.id
      decidedAt: new Date().toISOString(),
    };

    const result = executeUserDecision(decision, context);

    expect(result.success).toBe(true);
    expect(result.createdRelations[0].targetId).toBe("workload-neurosurgery-outpatient"); // Uses current
  });

  it("confirm_use_current + useCurrent=true with existing duplicate on current target: fails", () => {
    const context = buildContext();
    context.workloadCard = { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" };

    // Pre-create duplicate on current target
    context.existingRelations.push({
      id: "existing-rel-2",
      type: "workload_assign",
      sourceId: "unit-internal-medicine",
      targetId: "workload-neurosurgery-outpatient", // Current target
      active: true,
      metadata: {},
    });

    const recommendation = {
      id: "rec-test-f",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" },
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    context.recommendations.set(recommendation.id, recommendation);

    const decision = {
      recommendationId: "rec-test-f",
      action: "confirm_use_current" as const,
      sourceUnitId: "unit-internal-medicine",
      useCurrent: true,
      decidedAt: new Date().toISOString(),
    };

    const result = executeUserDecision(decision, context);

    // Q-09-C P2-1 裁定 B：同业务键已存在 active workload_assign -> 复用而非失败
    expect(result.success).toBe(true);
    expect(result.createdRelations).toHaveLength(1);
    expect(result.createdRelations[0].id).toBe("existing-rel-2"); // 复用已有 Relation，不创建第二条
  });
});

describe("P1-2: cancelOrDismiss validation", () => {
  function buildBaseContext(): ActionExecutorContext {
    return {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map(),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: undefined,
    };
  }

  it("recommendation not exists -> cancel fails", async () => {
    const context = buildBaseContext();
    await expect(recommendationStore.getState().cancelOrDismiss("non-existent-rec", "cancel", undefined, context)).rejects.toThrow("Recommendation not found");
  });

  it("recommendation not exists -> dismiss fails", async () => {
    const context = buildBaseContext();
    await expect(recommendationStore.getState().cancelOrDismiss("non-existent-rec", "dismiss", undefined, context)).rejects.toThrow("Recommendation not found");
  });

  it("recommendation already accepted -> cancel fails (not recommended)", async () => {
    const context = buildBaseContext();
    const recommendation = {
      id: "rec-already-accepted",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" },
      status: "accepted" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    recommendationStore.getState().setRecommendations([recommendation]);

    await expect(recommendationStore.getState().cancelOrDismiss("rec-already-accepted", "cancel", undefined, context)).rejects.toThrow("only \"recommended\" can be cancelled");
  });

  it("recommendation already dismissed -> dismiss fails (not recommended)", async () => {
    const context = buildBaseContext();
    const recommendation = {
      id: "rec-already-dismissed",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" },
      status: "dismissed" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    recommendationStore.getState().setRecommendations([recommendation]);

    await expect(recommendationStore.getState().cancelOrDismiss("rec-already-dismissed", "dismiss", undefined, context)).rejects.toThrow("only \"recommended\" can be cancelled");
  });

  it("cancel without context fails (requires valid context)", async () => {
    // store 中存在推荐，context 为 undefined
    const context = buildBaseContext();
    const recommendation = {
      id: "rec-valid-for-cancel",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" },
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    recommendationStore.getState().setRecommendations([recommendation]);

    await expect(recommendationStore.getState().cancelOrDismiss("rec-valid-for-cancel", "cancel", undefined, undefined as any)).rejects.toThrow("cancel/dismiss requires valid ActionExecutorContext");
    
    // 验证 recommendation 状态仍为 recommended（未被修改为 ignored）
    const rec = recommendationStore.getState().getRecommendationById("rec-valid-for-cancel");
    expect(rec?.status).toBe("recommended");
  });
});

describe("P1-3: executeDecision requires dataService for confirm actions", () => {
  function buildStoreContext(): ActionExecutorContext {
    return {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map(),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: dataService,
    };
  }

  it("confirm_use_existing without dataService fails in executeDecision", async () => {
    recommendationStore.getState().setRecommendations([{
      id: "rec-no-ds",
      kind: "resolution",
      payload: { targetWorkloadCardId: "workload-internal-outpatient" },
      status: "recommended",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    const context: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([["rec-no-ds", { id: "rec-no-ds", kind: "resolution", payload: { targetWorkloadCardId: "workload-internal-outpatient" }, status: "recommended", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: null, // 故意不提供
    };

    const decision = {
      recommendationId: "rec-no-ds",
      action: "confirm_use_existing" as const,
      sourceUnitId: "unit-internal-medicine",
      decidedAt: new Date().toISOString(),
    };

    await expect(recommendationStore.getState().executeDecision(decision, context)).rejects.toThrow("requires dataService");
    
    // 验证 recommendation 状态未变
    const rec = recommendationStore.getState().getRecommendationById("rec-no-ds");
    expect(rec?.status).toBe("recommended");
  });

  it("confirm_split without dataService fails in executeDecision", async () => {
    recommendationStore.getState().setRecommendations([{
      id: "rec-split-no-ds",
      kind: "resolution",
      payload: { 
        splitPlan: {
          parentResultId: "workload-result-neurosurgery-outpatient",
          children: [{
            name: "子结果A",
            value: 60,
            dimensions: { departmentId: "unit-neurosurgery-ward-1" },
            resultSetId: "rs-child",
            resultItemId: "ri-child-a"
          }],
          splitType: "partial"
        }
      },
      status: "recommended",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    const context: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([["rec-split-no-ds", { id: "rec-split-no-ds", kind: "resolution", payload: { 
        splitPlan: {
          parentResultId: "workload-result-neurosurgery-outpatient",
          children: [{
            name: "子结果A",
            value: 60,
            dimensions: { departmentId: "unit-neurosurgery-ward-1" },
            resultSetId: "rs-child",
            resultItemId: "ri-child-a"
          }],
          splitType: "partial"
        }
      }, status: "recommended", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: null,
    };

    const decision = {
      recommendationId: "rec-split-no-ds",
      action: "confirm_split" as const,
      decidedAt: new Date().toISOString(),
    };

    await expect(recommendationStore.getState().executeDecision(decision, context)).rejects.toThrow("requires dataService");
  });

  it("confirm_use_existing with dataService succeeds and recommendation accepted", async () => {
    recommendationStore.getState().setRecommendations([{
      id: "rec-success",
      kind: "resolution",
      payload: { targetWorkloadCardId: "workload-internal-outpatient" },
      status: "recommended",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    const context: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([["rec-success", { id: "rec-success", kind: "resolution", payload: { targetWorkloadCardId: "workload-internal-outpatient" }, status: "recommended", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: dataService,
    };

    const decision = {
      recommendationId: "rec-success",
      action: "confirm_use_existing" as const,
      sourceUnitId: "unit-internal-medicine",
      decidedAt: new Date().toISOString(),
    };

    const result = await recommendationStore.getState().executeDecision(decision, context);
    expect(result.success).toBe(true);
    
    // 验证 recommendation 变为 accepted
    const rec = recommendationStore.getState().getRecommendationById("rec-success");
    expect(rec?.status).toBe("accepted");
  });
});

describe("P1-4: confirm_use_current behavior", () => {
  function buildBaseContext(): ActionExecutorContext {
    return {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map(),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: undefined,
    };
  }

  it("confirm_use_current + useCurrent=false -> explicit failure (no fallback)", () => {
    const context = buildBaseContext();
    context.workloadCard = { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" };

    const recommendation = {
      id: "rec-use-current-false",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" },
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    context.recommendations.set(recommendation.id, recommendation);

    const decision = {
      recommendationId: "rec-use-current-false",
      action: "confirm_use_current" as const,
      sourceUnitId: "unit-internal-medicine",
      useCurrent: false, // 应该失败
      decidedAt: new Date().toISOString(),
    };

    const result = executeUserDecision(decision, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain("confirm_use_current requires useCurrent=true");
  });

  it("confirm_use_current + missing workloadCard -> explicit failure", () => {
    const context = buildBaseContext();
    // 不设置 workloadCard

    const recommendation = {
      id: "rec-no-card",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" },
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    context.recommendations.set(recommendation.id, recommendation);

    const decision = {
      recommendationId: "rec-no-card",
      action: "confirm_use_current" as const,
      sourceUnitId: "unit-internal-medicine",
      useCurrent: true,
      decidedAt: new Date().toISOString(),
    };

    const result = executeUserDecision(decision, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain("confirm_use_current requires context.workloadCard");
  });

  it("confirm_use_current + useCurrent=true + valid workloadCard -> succeeds", () => {
    const context = buildBaseContext();
    context.workloadCard = { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" };

    const recommendation = {
      id: "rec-use-current-true",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" },
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    context.recommendations.set(recommendation.id, recommendation);

    const decision = {
      recommendationId: "rec-use-current-true",
      action: "confirm_use_current" as const,
      sourceUnitId: "unit-internal-medicine",
      useCurrent: true,
      decidedAt: new Date().toISOString(),
    };

    const result = executeUserDecision(decision, context);
    expect(result.success).toBe(true);
    expect(result.createdRelations[0].targetId).toBe("workload-neurosurgery-outpatient");
  });

  it("confirm_use_current + useCurrent=true + duplicate on current target -> fails", () => {
    const context = buildBaseContext();
    context.workloadCard = { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" };

    // Pre-create duplicate on current target
    context.existingRelations.push({
      id: "existing-rel-dup",
      type: "workload_assign",
      sourceId: "unit-internal-medicine",
      targetId: "workload-neurosurgery-outpatient",
      active: true,
      metadata: {},
    });

    const recommendation = {
      id: "rec-use-current-dup",
      kind: "resolution" as const,
      payload: { targetWorkloadCardId: "workload-internal-outpatient" },
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    context.recommendations.set(recommendation.id, recommendation);

    const decision = {
      recommendationId: "rec-use-current-dup",
      action: "confirm_use_current" as const,
      sourceUnitId: "unit-internal-medicine",
      useCurrent: true,
      decidedAt: new Date().toISOString(),
    };

    const result = executeUserDecision(decision, context);
    // Q-09-C P2-1 裁定 B：同业务键已存在 active workload_assign -> 复用而非失败
    expect(result.success).toBe(true);
    expect(result.createdRelations).toHaveLength(1);
    expect(result.createdRelations[0].id).toBe("existing-rel-dup"); // 复用已有 Relation，不创建第二条
  });
});

describe("P1 persistence failure scenarios", () => {
  it("persistence failure keeps recommendation as recommended (not accepted)", async () => {
    recommendationStore.getState().setRecommendations([{
      id: "rec-persist-fail",
      kind: "resolution",
      payload: { targetWorkloadCardId: "workload-internal-outpatient" },
      status: "recommended",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    // 创建一个会失败的 dataService（只在 saveRelations 失败，其他方法委托给真实 dataService）
    const failingDataService: DataService = {
      saveWorkloadResults: dataService.saveWorkloadResults.bind(dataService),
      saveCalculationResults: dataService.saveCalculationResults.bind(dataService),
      deleteCards: async () => {},
      deleteWorkloadResults: async () => {},
      saveCards: dataService.saveCards.bind(dataService),
      saveRelations: async () => { throw new Error("Simulated persistence failure"); },
      saveWorkloadSplits: dataService.saveWorkloadSplits.bind(dataService),
      getCards: dataService.getCards.bind(dataService),
      getRelations: dataService.getRelations.bind(dataService),
      getResultSets: dataService.getResultSets.bind(dataService),
      getRecommendations: dataService.getRecommendations.bind(dataService),
      getWorkloadDefinition: dataService.getWorkloadDefinition.bind(dataService),
      getBudget: dataService.getBudget.bind(dataService),
      getScoreDefinitions: dataService.getScoreDefinitions.bind(dataService),
      getMeasurementResult: dataService.getMeasurementResult.bind(dataService),
      getAdjustmentTable: dataService.getAdjustmentTable.bind(dataService),
      getCalculationResults: dataService.getCalculationResults.bind(dataService),
      getWorkloadExecutions: dataService.getWorkloadExecutions.bind(dataService),
      getCalculationSnapshots: dataService.getCalculationSnapshots.bind(dataService),
      getWorkloadResults: dataService.getWorkloadResults.bind(dataService),
      getWorkloadSplits: dataService.getWorkloadSplits.bind(dataService),
    };

    const context: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([["rec-persist-fail", { id: "rec-persist-fail", kind: "resolution", payload: { targetWorkloadCardId: "workload-internal-outpatient" }, status: "recommended", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: failingDataService,
    };

    const decision = {
      recommendationId: "rec-persist-fail",
      action: "confirm_use_existing" as const,
      sourceUnitId: "unit-internal-medicine",
      decidedAt: new Date().toISOString(),
    };

    await expect(recommendationStore.getState().executeDecision(decision, context)).rejects.toThrow("Simulated persistence failure");
    
    // 验证 recommendation 保持 recommended
    const rec = recommendationStore.getState().getRecommendationById("rec-persist-fail");
    expect(rec?.status).toBe("recommended");
  });
});

describe("P1: Recommendation context mismatch validation", () => {
  function buildBaseContext(): ActionExecutorContext {
    return {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map(),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: dataService,
    };
  }

  const baseRecommendation = {
    id: "rec-mismatch-test",
    kind: "resolution" as const,
    payload: { targetWorkloadCardId: "workload-internal-outpatient" },
    status: "recommended" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const baseDecision = {
    recommendationId: "rec-mismatch-test",
    action: "confirm_use_existing" as const,
    sourceUnitId: "unit-internal-medicine",
    decidedAt: new Date().toISOString(),
  };

  it("store recommendation 与 context recommendation 完全一致 -> 正常执行", async () => {
    const context = buildBaseContext();
    context.recommendations.set(baseRecommendation.id, baseRecommendation);
    recommendationStore.getState().setRecommendations([baseRecommendation]);
    context.dataService = dataService;

    const result = await recommendationStore.getState().executeDecision(baseDecision, context);
    expect(result.success).toBe(true);
    expect(result.createdRelations[0].targetId).toBe("workload-internal-outpatient");
  });

  it("context 缺少该 recommendation -> 失败，不产生事实，store 状态仍 recommended", async () => {
    const context = buildBaseContext();
    // 不在 context.recommendations 中设置 recommendation
    recommendationStore.getState().setRecommendations([baseRecommendation]);
    context.dataService = dataService;

    await expect(recommendationStore.getState().executeDecision(baseDecision, context)).rejects.toThrow(
      "Recommendation context mismatch: context.recommendations missing for id"
    );
    
    const rec = recommendationStore.getState().getRecommendationById(baseRecommendation.id);
    expect(rec?.status).toBe("recommended");
  });

  it("context 中存在同 ID、但 payload 不同 -> 失败", async () => {
    const context = buildBaseContext();
    // context 中的 recommendation payload 不同
    const contextRec = {
      ...baseRecommendation,
      payload: { targetWorkloadCardId: "workload-neurosurgery-outpatient" }, // 不同的 payload
    };
    context.recommendations.set(contextRec.id, contextRec);
    recommendationStore.getState().setRecommendations([baseRecommendation]);
    context.dataService = dataService;

    await expect(recommendationStore.getState().executeDecision(baseDecision, context)).rejects.toThrow(
      "Recommendation context mismatch: context.recommendations entry differs from store"
    );
    
    const rec = recommendationStore.getState().getRecommendationById(baseRecommendation.id);
    expect(rec?.status).toBe("recommended");
  });

  it("context 中存在同 ID、但 kind 不同 -> 失败", async () => {
    const ctx = buildBaseContext();
    // context 中的 recommendation kind 不同
    const contextRec = {
      ...baseRecommendation,
      kind: "relation" as const, // 不同的 kind
    };
    ctx.recommendations.set(contextRec.id, contextRec);
    recommendationStore.getState().setRecommendations([baseRecommendation]);
    ctx.dataService = dataService;

    await expect(recommendationStore.getState().executeDecision(baseDecision, ctx)).rejects.toThrow(
      "Recommendation context mismatch: context.recommendations entry differs from store"
    );
    
    const rec = recommendationStore.getState().getRecommendationById(baseRecommendation.id);
    expect(rec?.status).toBe("recommended");
  });

  it("context 中存在同 ID、但 status 不同 -> 失败", async () => {
    const ctx = buildBaseContext();
    // context 中的 recommendation status 不同
    const contextRec = {
      ...baseRecommendation,
      status: "accepted" as const, // 不同的 status
    };
    ctx.recommendations.set(contextRec.id, contextRec);
    recommendationStore.getState().setRecommendations([baseRecommendation]);
    ctx.dataService = dataService;

    await expect(recommendationStore.getState().executeDecision(baseDecision, ctx)).rejects.toThrow(
      "Recommendation context mismatch: context.recommendations entry differs from store"
    );
    
    const rec = recommendationStore.getState().getRecommendationById(baseRecommendation.id);
    expect(rec?.status).toBe("recommended");
  });

  it("mismatch 场景不得进入 submitActionResult", async () => {
    const ctx = buildBaseContext();
    const contextRec = {
      ...baseRecommendation,
      payload: { targetWorkloadCardId: "workload-neurosurgery-outpatient" },
    };
    ctx.recommendations.set(contextRec.id, contextRec);
    recommendationStore.getState().setRecommendations([baseRecommendation]);

    // 使用一个会记录调用的 failing dataService
    let submitCalled = false;
    const failingDataService: DataService = {
      saveWorkloadResults: dataService.saveWorkloadResults.bind(dataService),
      saveCalculationResults: dataService.saveCalculationResults.bind(dataService),
      deleteCards: async () => {},
      deleteWorkloadResults: async () => {},
      saveCards: dataService.saveCards.bind(dataService),
      saveRelations: async () => { submitCalled = true; throw new Error("Should not be called"); },
      saveWorkloadSplits: dataService.saveWorkloadSplits.bind(dataService),
      getCards: dataService.getCards.bind(dataService),
      getRelations: dataService.getRelations.bind(dataService),
      getResultSets: dataService.getResultSets.bind(dataService),
      getRecommendations: dataService.getRecommendations.bind(dataService),
      getWorkloadDefinition: dataService.getWorkloadDefinition.bind(dataService),
      getBudget: dataService.getBudget.bind(dataService),
      getScoreDefinitions: dataService.getScoreDefinitions.bind(dataService),
      getMeasurementResult: dataService.getMeasurementResult.bind(dataService),
      getAdjustmentTable: dataService.getAdjustmentTable.bind(dataService),
      getCalculationResults: dataService.getCalculationResults.bind(dataService),
      getWorkloadExecutions: dataService.getWorkloadExecutions.bind(dataService),
      getCalculationSnapshots: dataService.getCalculationSnapshots.bind(dataService),
      getWorkloadResults: dataService.getWorkloadResults.bind(dataService),
      getWorkloadSplits: dataService.getWorkloadSplits.bind(dataService),
    };
    
    const ctx2: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[contextRec.id, contextRec]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: failingDataService,
    };

    await expect(recommendationStore.getState().executeDecision(baseDecision, ctx2)).rejects.toThrow(
      "Recommendation context mismatch"
    );
    
    expect(submitCalled).toBe(false);
  });

it("mismatch 场景不得变成 accepted", async () => {
    const ctx = buildBaseContext();
    const contextRec = {
      ...baseRecommendation,
      payload: { targetWorkloadCardId: "workload-neurosurgery-outpatient" },
    };
    ctx.recommendations.set(contextRec.id, contextRec);
    recommendationStore.getState().setRecommendations([baseRecommendation]);
    ctx.dataService = dataService;

    await expect(recommendationStore.getState().executeDecision(baseDecision, ctx)).rejects.toThrow(
      "Recommendation context mismatch"
    );
    
    const rec = recommendationStore.getState().getRecommendationById(baseRecommendation.id);
    expect(rec?.status).toBe("recommended");
  });

  it("payload 属性顺序不同但业务结构相同 -> 校验通过", async () => {
    const ctx = buildBaseContext();
    // 顺序不同但内容相同，使用实际的 Recommendation payload 结构
    const contextRec = {
      ...baseRecommendation,
      payload: { targetWorkloadCardId: "workload-internal-outpatient", extraField: "test" }, // 顺序调整
    };
    ctx.recommendations.set(contextRec.id, contextRec);
    recommendationStore.getState().setRecommendations([{
      ...baseRecommendation,
      payload: { extraField: "test", targetWorkloadCardId: "workload-internal-outpatient" }, // 顺序不同但内容相同
    }]);

    const decision = { ...baseDecision, sourceUnitId: "unit-internal-medicine" };
    ctx.dataService = dataService;

    const result = await recommendationStore.getState().executeDecision(decision, ctx);
    expect(result.success).toBe(true);
  });

  // 新增：payload 实际内容不同 -> 仍然拒绝
  it("payload 实际内容不同 -> 仍然拒绝", async () => {
    const ctx = buildBaseContext();
    const contextRec = {
      ...baseRecommendation,
      payload: { a: 1, b: 3 }, // 内容不同
    };
    ctx.recommendations.set(contextRec.id, contextRec);
    recommendationStore.getState().setRecommendations([{
      ...baseRecommendation,
      payload: { a: 1, b: 2 },
    }]);

    const decision = { ...baseDecision, sourceUnitId: "unit-internal-medicine" };
    ctx.dataService = dataService;

    await expect(recommendationStore.getState().executeDecision(decision, ctx)).rejects.toThrow(
      "Recommendation context mismatch"
    );
    
    const rec = recommendationStore.getState().getRecommendationById(baseRecommendation.id);
    expect(rec?.status).toBe("recommended");
  });
});

describe("P1: ActionSubmissionService retry idempotency", () => {
  function buildSplitContext(): ActionExecutorContext {
    return {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map(),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: dataService,
    };
  }

  const baseSplitRecommendation = {
    id: "rec-split-test",
    kind: "resolution" as const,
    payload: {
      splitPlan: {
        parentResultId: "workload-result-neurosurgery-outpatient",
        children: [{
          name: "子结果A",
          value: 60,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-a"
        }],
        splitType: "partial"
      }
    },
    status: "recommended" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Q-09-C 裁定 A：confirm_split 必须由 UserDecision 携带正式 splitParameters
  // （recommendation.payload.splitPlan 仅为建议；children[].id 提供稳定 child Result ID）
  const baseSplitDecision = {
    recommendationId: "rec-split-test",
    action: "confirm_split" as const,
    splitParameters: {
      parentResultId: "workload-result-neurosurgery-outpatient",
      children: [{
        id: "wr-split-child-a",
        name: "子结果A",
        value: 60,
        dimensions: { departmentId: "unit-neurosurgery-ward-1" },
        resultSetId: "rs-child",
        resultItemId: "ri-child-a"
      }],
      splitType: "partial" as const,
    },
    decidedAt: new Date().toISOString(),
  };

it("Test A: saveWorkloadSplits 第一次失败，retry 不产生重复 Card/Relation/Result/Split", async () => {
    // 记录初始 store 数量（MockDataService 返回内部数组引用，必须做 snapshot copy）
    const initialCards = [...await dataService.getCards()];
    const initialRelations = [...await dataService.getRelations()];
    const initialWorkloadResults = [...await dataService.getWorkloadResults()];
    const initialWorkloadSplits = [...await dataService.getWorkloadSplits()];

    // 创建一个只在 saveWorkloadSplits 失败的 dataService
    const failingDataService: DataService = {
      saveWorkloadResults: dataService.saveWorkloadResults.bind(dataService),
      saveCalculationResults: dataService.saveCalculationResults.bind(dataService),
      deleteCards: async () => {},
      deleteWorkloadResults: async () => {},
      saveRelations: dataService.saveRelations.bind(dataService),
      saveWorkloadSplits: async () => { throw new Error("Simulated saveWorkloadSplits failure"); },
      getCards: dataService.getCards.bind(dataService),
      getRelations: dataService.getRelations.bind(dataService),
      getResultSets: dataService.getResultSets.bind(dataService),
      getRecommendations: dataService.getRecommendations.bind(dataService),
      getWorkloadDefinition: dataService.getWorkloadDefinition.bind(dataService),
      getBudget: dataService.getBudget.bind(dataService),
      getScoreDefinitions: dataService.getScoreDefinitions.bind(dataService),
      getMeasurementResult: dataService.getMeasurementResult.bind(dataService),
      getAdjustmentTable: dataService.getAdjustmentTable.bind(dataService),
      getCalculationResults: dataService.getCalculationResults.bind(dataService),
      getWorkloadExecutions: dataService.getWorkloadExecutions.bind(dataService),
      getCalculationSnapshots: dataService.getCalculationSnapshots.bind(dataService),
      getWorkloadResults: dataService.getWorkloadResults.bind(dataService),
      getWorkloadSplits: dataService.getWorkloadSplits.bind(dataService),
      saveCards: dataService.saveCards.bind(dataService),
    };

    // 设置 recommendation
    recommendationStore.getState().setRecommendations([baseSplitRecommendation]);

    // 第一次：saveWorkloadSplits 失败
    const context: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[baseSplitRecommendation.id, baseSplitRecommendation]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: failingDataService,
    };

    const decision = { ...baseSplitDecision };

    // 第一次执行：应该失败（saveWorkloadSplits 阶段失败）
    await expect(recommendationStore.getState().executeDecision(decision, context)).rejects.toThrow("Simulated saveWorkloadSplits failure");

    // 第一次执行后，检查 store 状态：WorkloadResult 和 Card 和 Relation 已保存（saveWorkloadSplits 失败前的阶段都成功了）
    const afterFirstAttemptCards = [...await dataService.getCards()];
    const afterFirstAttemptRelations = [...await dataService.getRelations()];
    const afterFirstAttemptWorkloadResults = [...await dataService.getWorkloadResults()];
    const afterFirstAttemptWorkloadSplits = [...await dataService.getWorkloadSplits()];

    // 第一次添加的 WorkloadResult 数量 = 1（split 产生了 1 个 child）
    expect(afterFirstAttemptWorkloadResults.length).toBe(initialWorkloadResults.length + 1);
    // 第一次添加的 Card 数量 = 1
    expect(afterFirstAttemptCards.length).toBe(initialCards.length + 1);
    // 第一次添加的 Relation 数量 = 1（workload_split）
    expect(afterFirstAttemptRelations.length).toBe(initialRelations.length + 1);
    // WorkloadSplit 尚未保存（saveWorkloadSplits 失败了）
    expect(afterFirstAttemptWorkloadSplits.length).toBe(initialWorkloadSplits.length);

    // 第二次：使用正常 dataService retry（同一 recommendationId）
    const context2: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[baseSplitRecommendation.id, baseSplitRecommendation]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: dataService,
    };

    const decision2 = { ...baseSplitDecision };
    recommendationStore.getState().setRecommendations([baseSplitRecommendation]);

    const result2 = await recommendationStore.getState().executeDecision(decision2, context2);
    expect(result2.success).toBe(true);

    // Retry 后检查 store 状态：所有实体数量不再增加
    const afterRetryCards = [...await dataService.getCards()];
    const afterRetryRelations = [...await dataService.getRelations()];
    const afterRetryWorkloadResults = [...await dataService.getWorkloadResults()];
    const afterRetryWorkloadSplits = [...await dataService.getWorkloadSplits()];

    // WorkloadResult 数量不变（幂等：没有重复增加）
    expect(afterRetryWorkloadResults.length).toBe(afterFirstAttemptWorkloadResults.length);
    // Card 数量不变（幂等：没有重复增加）
    expect(afterRetryCards.length).toBe(afterFirstAttemptCards.length);
    // Relation 数量不变（幂等：没有重复增加）
    expect(afterRetryRelations.length).toBe(afterFirstAttemptRelations.length);
    // WorkloadSplit 数量增加 1（第一次失败未保存，retry 成功保存了 1 个）
    expect(afterRetryWorkloadSplits.length).toBe(afterFirstAttemptWorkloadSplits.length + 1);

    // 验证 retry 后的 Recommendation 变为 accepted
    const rec = recommendationStore.getState().getRecommendationById("rec-split-test");
    expect(rec?.status).toBe("accepted");
  });

  it("Test B: 不同 Recommendation 复用同一显式 child ID → 明确拒绝（H-2 / D-145）", async () => {
    // 构造两个不同 Recommendation，引用同一个 parent WorkloadResult
    const recA = {
      ...baseSplitRecommendation,
      id: "rec-d120-a",
    };
    const recB = {
      ...baseSplitRecommendation,
      id: "rec-d120-b",
    };

    const decisionA: any = {
      recommendationId: "rec-d120-a",
      action: "confirm_split" as const,
      // 裁定 A：决策自带正式 splitParameters；两个决策提供相同 child ID（同一统计事实）
      splitParameters: {
        parentResultId: "workload-result-neurosurgery-outpatient",
        children: [{
          id: "wr-split-child-d120",
          name: "子结果A",
          value: 60,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-a"
        }],
        splitType: "partial" as const,
      },
      decidedAt: new Date().toISOString(),
    };
    const decisionB: any = {
      recommendationId: "rec-d120-b",
      action: "confirm_split" as const,
      splitParameters: {
        parentResultId: "workload-result-neurosurgery-outpatient",
        children: [{
          id: "wr-split-child-d120",
          name: "子结果A",
          value: 60,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-a"
        }],
        splitType: "partial" as const,
      },
      decidedAt: new Date().toISOString(),
    };

    // 为 Recommendation A 执行 split
    recommendationStore.getState().setRecommendations([recA]);
    const contextA: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([["rec-d120-a", recA]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: dataService,
    };

    const resultA = await recommendationStore.getState().executeDecision(decisionA, contextA);
    expect(resultA.success).toBe(true);

    // 记录 Recommendation A 执行后引用该 child Result 的 Card 数量
    const childResultA = resultA.createdWorkloadResults[0];
    const cardsAfterA = (await dataService.getCards()).filter(
      c => c.type === "workload" && (c as any).workloadResultId === childResultA.id
    );

    // H-2（D-145）：Recommendation B 是另一个 execution，复用同一显式 child ID → 必须明确拒绝。
    // 旧语义"两次 confirm_split 创建同一 Result"已被 D-145 禁止；
    // D-120"多卡一果"应由一次创建 + 引用路径表达（use_existing / workload_assign）。
    recommendationStore.getState().setRecommendations([recB]);
    // fresh context（从 DataService 重建，包含 A 已持久化的 Result 与 Split → 归属可证为其他批次）
    const [freshRelations, freshResults, freshSplits] = await Promise.all([
      dataService.getRelations(),
      dataService.getWorkloadResults(),
      dataService.getWorkloadSplits(),
    ]);
    const contextB: ActionExecutorContext = {
      existingRelations: [...freshRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map([...mockWorkloadResults, ...freshResults].map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(freshSplits.map((sp: any) => [sp.id, sp])),
      recommendations: new Map([["rec-d120-b", recB]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: dataService,
    };

    const resultB = await recommendationStore.getState().executeDecision(decisionB, contextB);
    expect(resultB.success).toBe(false);
    expect(resultB.error).toContain("已属于其他 execution");
    // Recommendation B 保持 recommended（未 accepted）
    expect(recommendationStore.getState().getRecommendationById("rec-d120-b")?.status).toBe("recommended");
    // 既有统计事实未被覆盖：该 child ID 仍只有一份，且值不变
    const resultsAfter = (await dataService.getWorkloadResults()).filter(r => r.id === "wr-split-child-d120");
    expect(resultsAfter.length).toBe(1);
    expect(resultsAfter[0].value).toBe(60);
  });

  it("Test C: 同一 Recommendation retry 多次仍只有一套 Split 结果", async () => {
    const recId = "rec-retry-multi";
    const rec = {
      ...baseSplitRecommendation,
      id: recId,
    };

    // 裁定 A：决策自带正式 splitParameters。
    // 使用本测试专属 child ID——不得与其他测试批次共享显式 ID（H-2 / D-145）
    const decision: any = {
      ...baseSplitDecision,
      recommendationId: recId,
      splitParameters: {
        ...baseSplitDecision.splitParameters,
        children: [{
          id: "wr-split-child-c",
          name: "子结果A",
          value: 60,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-a"
        }],
      },
    };

    const context: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[recId, rec]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
      dataService: dataService,
    };

    // 第一次执行
    recommendationStore.getState().setRecommendations([rec]);
    const result1 = await recommendationStore.getState().executeDecision(decision, context);
    expect(result1.success).toBe(true);

    const afterFirstCards = [...await dataService.getCards()];
    const afterFirstRelations = [...await dataService.getRelations()];
    const afterFirstWorkloadResults = [...await dataService.getWorkloadResults()];
    const afterFirstWorkloadSplits = [...await dataService.getWorkloadSplits()];

    // 重置 recommendation 为 recommended 以便 retry（模拟 persistence 部分失败后 retry 场景）
    // 实际业务中，如果 persistence 失败，recommendation 保持 recommended
    // 这里直接用一个新 context retry 来验证幂等性
    const contextRetry: ActionExecutorContext = {
      ...context,
    };
    recommendationStore.getState().setRecommendations([{ ...rec, status: "recommended" as const }]);
    const result2 = await recommendationStore.getState().executeDecision({ ...decision }, contextRetry);
    expect(result2.success).toBe(true);

    // Retry 后检查所有 store 数量不变
    const afterRetryCards = [...await dataService.getCards()];
    const afterRetryRelations = [...await dataService.getRelations()];
    const afterRetryWorkloadResults = [...await dataService.getWorkloadResults()];
    const afterRetryWorkloadSplits = [...await dataService.getWorkloadSplits()];

    // 断言：所有实体数量不变（真正的幂等验证）
    expect(afterRetryWorkloadResults.length).toBe(afterFirstWorkloadResults.length);
    expect(afterRetryCards.length).toBe(afterFirstCards.length);
    expect(afterRetryRelations.length).toBe(afterFirstRelations.length);
    expect(afterRetryWorkloadSplits.length).toBe(afterFirstWorkloadSplits.length);

    // 验证 child WorkloadResult ID 保持一致
    const childResult1 = result1.createdWorkloadResults[0];
    const childResult2 = result2.createdWorkloadResults[0];
    expect(childResult1.id).toBe(childResult2.id);

    // 验证 WorkloadSplit ID 保持一致
    const split1 = result1.createdWorkloadSplits[0];
    const split2 = result2.createdWorkloadSplits[0];
    expect(split1.id).toBe(split2.id);
  });

  it("Test D: saveWorkloadResults 失败，retry 恢复完整且不产生重复", async () => {
    const recId = "rec-atomic-d";
    // 使用不同 parent（workload-internal-outpatient）避免与其他测试的 deterministic child ID 冲突
    const rec = {
      ...baseSplitRecommendation,
      id: recId,
      payload: {
        splitPlan: {
          parentResultId: "workload-result-internal-outpatient",
          children: [{
            name: "内科子结果A",
            value: 40,
            dimensions: { departmentId: "unit-internal-medicine" },
            resultSetId: "rs-child-d",
            resultItemId: "ri-child-d-a"
          }],
          splitType: "partial"
        }
      },
    };
    const decision: any = {
      recommendationId: recId,
      action: "confirm_split" as const,
      // 裁定 A：决策自带正式 splitParameters（Test D 使用 internal parent）
      splitParameters: {
        parentResultId: "workload-result-internal-outpatient",
        children: [{
          id: "wr-split-child-d",
          name: "内科子结果A",
          value: 40,
          dimensions: { departmentId: "unit-internal-medicine" },
          resultSetId: "rs-child-d",
          resultItemId: "ri-child-d-a"
        }],
        splitType: "partial" as const,
      },
      decidedAt: new Date().toISOString(),
    };

    const initialCards = [...await dataService.getCards()];
    const initialRelations = [...await dataService.getRelations()];
    const initialWorkloadResults = [...await dataService.getWorkloadResults()];
    const initialWorkloadSplits = [...await dataService.getWorkloadSplits()];

    const failAtSaveResults: DataService = {
      saveWorkloadResults: async () => { throw new Error("Simulated saveWorkloadResults failure"); },
      saveCalculationResults: dataService.saveCalculationResults.bind(dataService),
      deleteCards: async () => {},
      deleteWorkloadResults: async () => {},
      saveCards: dataService.saveCards.bind(dataService),
      saveRelations: dataService.saveRelations.bind(dataService),
      saveWorkloadSplits: dataService.saveWorkloadSplits.bind(dataService),
      getCards: dataService.getCards.bind(dataService),
      getRelations: dataService.getRelations.bind(dataService),
      getResultSets: dataService.getResultSets.bind(dataService),
      getRecommendations: dataService.getRecommendations.bind(dataService),
      getWorkloadDefinition: dataService.getWorkloadDefinition.bind(dataService),
      getBudget: dataService.getBudget.bind(dataService),
      getScoreDefinitions: dataService.getScoreDefinitions.bind(dataService),
      getMeasurementResult: dataService.getMeasurementResult.bind(dataService),
      getAdjustmentTable: dataService.getAdjustmentTable.bind(dataService),
      getCalculationResults: dataService.getCalculationResults.bind(dataService),
      getWorkloadExecutions: dataService.getWorkloadExecutions.bind(dataService),
      getCalculationSnapshots: dataService.getCalculationSnapshots.bind(dataService),
      getWorkloadResults: dataService.getWorkloadResults.bind(dataService),
      getWorkloadSplits: dataService.getWorkloadSplits.bind(dataService),
    };

    recommendationStore.getState().setRecommendations([rec]);
    const context: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[recId, rec]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-internal-outpatient", type: "workload", name: "内科门诊人次", workloadResultId: "workload-result-internal-outpatient" },
      dataService: failAtSaveResults,
    };

    // 第一次执行：saveWorkloadResults 失败
    await expect(recommendationStore.getState().executeDecision(decision, context))
      .rejects.toThrow("Simulated saveWorkloadResults failure");

    // Recommendation 保持 recommended
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("recommended");

    // 第一步失败：所有 store 无变化
    const afterFailWorkloadResults = [...await dataService.getWorkloadResults()];
    const afterFailCards = [...await dataService.getCards()];
    const afterFailRelations = [...await dataService.getRelations()];
    const afterFailWorkloadSplits = [...await dataService.getWorkloadSplits()];
    expect(afterFailWorkloadResults.length).toBe(initialWorkloadResults.length);
    expect(afterFailCards.length).toBe(initialCards.length);
    expect(afterFailRelations.length).toBe(initialRelations.length);
    expect(afterFailWorkloadSplits.length).toBe(initialWorkloadSplits.length);

    // Retry：使用正常 dataService
    const retryContext: ActionExecutorContext = { ...context, dataService: dataService };
    recommendationStore.getState().setRecommendations([rec]);
    const result2 = await recommendationStore.getState().executeDecision({ ...decision }, retryContext);
    expect(result2.success).toBe(true);

    // Retry 后：各 store 恰好增加 1
    const afterRetryWorkloadResults = [...await dataService.getWorkloadResults()];
    const afterRetryCards = [...await dataService.getCards()];
    const afterRetryRelations = [...await dataService.getRelations()];
    const afterRetryWorkloadSplits = [...await dataService.getWorkloadSplits()];
    expect(afterRetryWorkloadResults.length).toBe(initialWorkloadResults.length + 1);
    expect(afterRetryCards.length).toBe(initialCards.length + 1);
    expect(afterRetryRelations.length).toBe(initialRelations.length + 1);
    expect(afterRetryWorkloadSplits.length).toBe(initialWorkloadSplits.length + 1);

    // Recommendation 变为 accepted
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("accepted");
  });

  it("Test E: saveCards 失败，retry 恢复完整且不产生重复", async () => {
    const recId = "rec-atomic-e";
    // 使用不同 parent（workload-outpatient-visits）避免与 Test D 的 deterministic child ID 冲突
    const rec = {
      ...baseSplitRecommendation,
      id: recId,
      payload: {
        splitPlan: {
          parentResultId: "workload-result-outpatient-total",
          children: [{
            name: "门诊总量子结果",
            value: 100,
            dimensions: { departmentId: "unit-internal-medicine" },
            resultSetId: "rs-child-e",
            resultItemId: "ri-child-e-a"
          }],
          splitType: "partial"
        }
      },
    };
    const decision: any = {
      recommendationId: recId,
      action: "confirm_split" as const,
      // 裁定 A：决策自带正式 splitParameters（Test E 使用 outpatient-total parent）
      splitParameters: {
        parentResultId: "workload-result-outpatient-total",
        children: [{
          id: "wr-split-child-e",
          name: "门诊总量子结果",
          value: 100,
          dimensions: { departmentId: "unit-internal-medicine" },
          resultSetId: "rs-child-e",
          resultItemId: "ri-child-e-a"
        }],
        splitType: "partial" as const,
      },
      decidedAt: new Date().toISOString(),
    };

    const initialCards = [...await dataService.getCards()];
    const initialRelations = [...await dataService.getRelations()];
    const initialWorkloadResults = [...await dataService.getWorkloadResults()];
    const initialWorkloadSplits = [...await dataService.getWorkloadSplits()];

    const failAtSaveCards: DataService = {
      saveWorkloadResults: dataService.saveWorkloadResults.bind(dataService),
      saveCalculationResults: dataService.saveCalculationResults.bind(dataService),
      deleteCards: async () => {},
      deleteWorkloadResults: async () => {},
      saveCards: async () => { throw new Error("Simulated saveCards failure"); },
      saveRelations: dataService.saveRelations.bind(dataService),
      saveWorkloadSplits: dataService.saveWorkloadSplits.bind(dataService),
      getCards: dataService.getCards.bind(dataService),
      getRelations: dataService.getRelations.bind(dataService),
      getResultSets: dataService.getResultSets.bind(dataService),
      getRecommendations: dataService.getRecommendations.bind(dataService),
      getWorkloadDefinition: dataService.getWorkloadDefinition.bind(dataService),
      getBudget: dataService.getBudget.bind(dataService),
      getScoreDefinitions: dataService.getScoreDefinitions.bind(dataService),
      getMeasurementResult: dataService.getMeasurementResult.bind(dataService),
      getAdjustmentTable: dataService.getAdjustmentTable.bind(dataService),
      getCalculationResults: dataService.getCalculationResults.bind(dataService),
      getWorkloadExecutions: dataService.getWorkloadExecutions.bind(dataService),
      getCalculationSnapshots: dataService.getCalculationSnapshots.bind(dataService),
      getWorkloadResults: dataService.getWorkloadResults.bind(dataService),
      getWorkloadSplits: dataService.getWorkloadSplits.bind(dataService),
    };

    recommendationStore.getState().setRecommendations([rec]);
    const context: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[recId, rec]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-outpatient-visits", type: "workload", name: "门诊人次", workloadResultId: "workload-result-outpatient-total" },
      dataService: failAtSaveCards,
    };

    // 第一次执行：saveCards 失败
    await expect(recommendationStore.getState().executeDecision(decision, context))
      .rejects.toThrow("Simulated saveCards failure");

    // Recommendation 保持 recommended
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("recommended");

    // saveWorkloadResults 已成功（+1），saveCards 失败（Card/Relation/Split 均未保存）
    const afterFailWorkloadResults = [...await dataService.getWorkloadResults()];
    const afterFailCards = [...await dataService.getCards()];
    const afterFailRelations = [...await dataService.getRelations()];
    const afterFailWorkloadSplits = [...await dataService.getWorkloadSplits()];
    expect(afterFailWorkloadResults.length).toBe(initialWorkloadResults.length + 1);
    expect(afterFailCards.length).toBe(initialCards.length);
    expect(afterFailRelations.length).toBe(initialRelations.length);
    expect(afterFailWorkloadSplits.length).toBe(initialWorkloadSplits.length);

    // Retry：使用正常 dataService
    const retryContext: ActionExecutorContext = { ...context, dataService: dataService };
    recommendationStore.getState().setRecommendations([rec]);
    const result2 = await recommendationStore.getState().executeDecision({ ...decision }, retryContext);
    expect(result2.success).toBe(true);

    // Retry 后：WorkloadResult 不重复（upsert），Card/Relation/Split 各 +1
    const afterRetryWorkloadResults = [...await dataService.getWorkloadResults()];
    const afterRetryCards = [...await dataService.getCards()];
    const afterRetryRelations = [...await dataService.getRelations()];
    const afterRetryWorkloadSplits = [...await dataService.getWorkloadSplits()];
    expect(afterRetryWorkloadResults.length).toBe(afterFailWorkloadResults.length);
    expect(afterRetryCards.length).toBe(initialCards.length + 1);
    expect(afterRetryRelations.length).toBe(initialRelations.length + 1);
    expect(afterRetryWorkloadSplits.length).toBe(initialWorkloadSplits.length + 1);

    // Recommendation 变为 accepted
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("accepted");
  });
});
describe("Q-09-C 裁定 A / 裁定②：splitParameters 契约与批次域 WorkloadSplit ID", () => {
  const advisorySplitPlan = {
    parentResultId: "workload-result-neurosurgery-outpatient",
    children: [{
      name: "推荐子结果A",
      value: 60,
      dimensions: { departmentId: "unit-neurosurgery-ward-1" },
      resultSetId: "rs-child",
      resultItemId: "ri-child-a"
    }],
    splitType: "partial" as const,
  };

  function buildSplitContext(recId: string): ActionExecutorContext {
    return {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[recId, {
        id: recId,
        kind: "resolution" as const,
        // payload.splitPlan 仅为推荐/展示层建议（裁定 A）
        payload: { splitPlan: advisorySplitPlan },
        status: "recommended" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: "workload-result-neurosurgery-outpatient" },
    };
  }

  it("裁定 A：confirm_split 缺少 splitParameters → 明确失败，不读取 Recommendation.splitPlan 执行", () => {
    const decision = {
      recommendationId: "rec-advisory-only",
      action: "confirm_split" as const,
      decidedAt: new Date().toISOString(),
      // 无 splitParameters —— payload.splitPlan 仅为建议，不得作为执行参数
    };
    const result = executeUserDecision(decision, buildSplitContext("rec-advisory-only"));

    expect(result.success).toBe(false);
    // 可诊断错误：指明缺失项 + payload 仅为建议
    expect(result.error).toContain("splitParameters");
    expect(result.error).toContain("advisory");
    // 零事实创建
    expect(result.createdWorkloadResults).toHaveLength(0);
    expect(result.createdWorkloadSplits).toHaveLength(0);
    expect(result.createdRelations).toHaveLength(0);
  });

  it("裁定 A：用户明确提供的 splitParameters 按用户参数执行（用户值优先于推荐值）", () => {
    const decision = {
      recommendationId: "rec-user-params",
      action: "confirm_split" as const,
      decidedAt: new Date().toISOString(),
      splitParameters: {
        parentResultId: "workload-result-neurosurgery-outpatient",
        children: [{
          id: "wr-user-child-a",
          name: "用户修改后的子结果",
          value: 50,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-a"
        }],
        splitType: "partial" as const,
      },
    };
    const result = executeUserDecision(decision, buildSplitContext("rec-user-params"));

    expect(result.success).toBe(true);
    expect(result.createdWorkloadResults).toHaveLength(1);
    expect(result.createdWorkloadResults[0].value).toBe(50);
    expect(result.createdWorkloadResults[0].name).toBe("用户修改后的子结果");
    expect(result.createdWorkloadResults[0].id).toBe("wr-user-child-a");
  });

  it("裁定②：同一 UserDecision 执行两次（retry）→ WorkloadSplit ID 与 child ID 完全相同", () => {
    const decision = {
      recommendationId: "rec-same-decision",
      action: "confirm_split" as const,
      decidedAt: "2026-10-04T12:00:00.000Z",
      splitParameters: {
        parentResultId: "workload-result-neurosurgery-outpatient",
        children: [
          {
            id: "wr-batch-child-x",
            name: "子结果X",
            value: 30,
            dimensions: { departmentId: "unit-neurosurgery-ward-1" },
            resultSetId: "rs-child",
            resultItemId: "ri-child-x"
          },
          {
            // 无显式 id → 批次域确定性生成（同决策 retry 稳定）
            name: "子结果Y",
            value: 30,
            dimensions: { departmentId: "unit-neurosurgery-ward-2" },
            resultSetId: "rs-child",
            resultItemId: "ri-child-y"
          },
        ],
        splitType: "partial" as const,
      },
    };
    const context = buildSplitContext("rec-same-decision");
    const result1 = executeUserDecision(decision, context);
    const result2 = executeUserDecision(decision, context);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    // 提供的 ID 与批次生成的 ID 均 retry 稳定
    expect(result2.createdWorkloadResults.map((r) => r.id))
      .toEqual(result1.createdWorkloadResults.map((r) => r.id));
    expect(result2.createdWorkloadSplits.map((s) => s.id))
      .toEqual(result1.createdWorkloadSplits.map((s) => s.id));
    // E-2 / D-148：批次生成的 child ID 直接嵌入单射安全编码的批次 + 统计锚点
    // （非哈希摘要、无 index 尾缀、顺序无关）
    expect(result1.createdWorkloadResults[1].id).toMatch(/-split-child-[A-Za-z0-9_-]+$/);
    expect(result1.createdWorkloadResults[1].id).not.toMatch(/-\d+$/); // 不含 index 尾缀
  });

  it("裁定②：同一 parent 上两个不同 UserDecision → WorkloadSplit ID 不同，第一条不被第二条覆盖", async () => {
    const decisionA = {
      recommendationId: "rec-batch-a",
      action: "confirm_split" as const,
      decidedAt: "2026-10-04T12:00:00.000Z",
      splitParameters: {
        parentResultId: "workload-result-neurosurgery-outpatient",
        children: [{
          id: "wr-batch-child-a1",
          name: "拆分A子结果",
          value: 60,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-a"
        }],
        splitType: "partial" as const,
      },
    };
    const decisionB = {
      recommendationId: "rec-batch-b",
      action: "confirm_split" as const,
      decidedAt: "2026-10-04T13:00:00.000Z",
      splitParameters: {
        parentResultId: "workload-result-neurosurgery-outpatient",
        children: [{
          id: "wr-batch-child-b1",
          name: "拆分B子结果",
          value: 60,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-b"
        }],
        splitType: "partial" as const,
      },
    };
    const resultA = executeUserDecision(decisionA, buildSplitContext("rec-batch-a"));
    const resultB = executeUserDecision(decisionB, buildSplitContext("rec-batch-b"));
    expect(resultA.success).toBe(true);
    expect(resultB.success).toBe(true);

    // 不同决策（不同 UserDecision 身份）→ 不同 WorkloadSplit ID
    const splitIdA = resultA.createdWorkloadSplits[0].id;
    const splitIdB = resultB.createdWorkloadSplits[0].id;
    expect(splitIdA).not.toBe(splitIdB);

    // 全链持久化：两条分解记录均保留，第一条不被第二条 upsert 覆盖
    const initialSplits = [...await dataService.getWorkloadSplits()];
    await submitActionResult(resultA, dataService, "rec-batch-a");
    await submitActionResult(resultB, dataService, "rec-batch-b");
    const afterSplits = [...await dataService.getWorkloadSplits()];
    expect(afterSplits.length).toBe(initialSplits.length + 2);
    const savedA = afterSplits.find((s) => s.id === splitIdA);
    const savedB = afterSplits.find((s) => s.id === splitIdB);
    expect(savedA).toBeDefined();
    expect(savedB).toBeDefined();
    expect(savedA!.childResultId).toBe("wr-batch-child-a1");
  });
});

describe("UserDecisionAction 契约（P2-5 修复：create_new_relation 预留动作）", () => {
  it("create_new_relation → Not implemented 明确失败、零事实、零 DataService 写入", () => {
    const saveRelations = vi.fn();
    const saveWorkloadResults = vi.fn();
    const saveWorkloadSplits = vi.fn();
    const saveCards = vi.fn();

    const decision = {
      recommendationId: "rec-reserved-relation",
      action: "create_new_relation" as const,
      decidedAt: new Date().toISOString(),
    };
    const context: ActionExecutorContext = {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([["rec-reserved-relation", {
        id: "rec-reserved-relation",
        kind: "resolution" as const,
        payload: {},
        status: "recommended" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      dataService: { saveRelations, saveWorkloadResults, saveWorkloadSplits, saveCards } as unknown as DataService,
    };

    const result = executeUserDecision(decision, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Not implemented: create_new_relation");
    // 不再落入 default 的误导性 "Unknown action"
    expect(result.error).not.toContain("Unknown action");
    expect(result.createdRelations).toEqual([]);
    expect(result.createdWorkloadResults).toEqual([]);
    expect(result.createdWorkloadSplits).toEqual([]);
    // 不产生任何 DataService 写入
    expect(saveRelations).not.toHaveBeenCalled();
    expect(saveWorkloadResults).not.toHaveBeenCalled();
    expect(saveWorkloadSplits).not.toHaveBeenCalled();
    expect(saveCards).not.toHaveBeenCalled();
  });
});

describe("workload_assign 业务键幂等复用（Q-09-C P2-1 裁定 B）", () => {
  // 业务键 = active + workload_assign + Unit(sourceId) + Workload(targetId)
  // RecommendationId / UserDecision 不参与业务键

  const WARD1 = "unit-neurosurgery-ward-1";
  const WARD2 = "unit-neurosurgery-ward-2";
  const OUTPATIENT = "workload-neurosurgery-outpatient";
  const INTERNAL = "workload-internal-outpatient";

  function assignRec(recId: string, targetWorkloadCardId: string) {
    return {
      id: recId,
      kind: "resolution" as const,
      payload: { targetWorkloadCardId },
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async function activeAssignCount(sourceId: string, targetId: string): Promise<{ count: number; ids: string[] }> {
    const relations = await dataService.getRelations();
    const matched = relations.filter(
      (r) => r.active && r.type === "workload_assign" && r.sourceId === sourceId && r.targetId === targetId
    );
    return { count: matched.length, ids: matched.map((r) => r.id) };
  }

  async function buildAssignContext(rec: Recommendation): Promise<ActionExecutorContext> {
    const relations = await dataService.getRelations();
    return {
      existingRelations: [...relations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[rec.id, rec]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      dataService: dataService,
    };
  }

  it("场景 1：首次保存成功 → 1 条 active Relation + Recommendation accepted", async () => {
    const rec = assignRec("rec-bk-first", OUTPATIENT);
    recommendationStore.getState().setRecommendations([rec]);
    const before = await activeAssignCount(WARD1, OUTPATIENT);

    const context = await buildAssignContext(rec);
    const result = await recommendationStore.getState().executeDecision(
      { recommendationId: rec.id, action: "confirm_use_existing" as const, sourceUnitId: WARD1, targetWorkloadCardId: OUTPATIENT, decidedAt: new Date().toISOString() },
      context
    );

    expect(result.success).toBe(true);
    const after = await activeAssignCount(WARD1, OUTPATIENT);
    expect(after.count).toBe(before.count + 1);
    expect(recommendationStore.getState().getRecommendationById(rec.id)?.status).toBe("accepted");
  });

  it("场景 2：首次 Relation 已写入但 Action 失败 → retry 复用收敛，仍只有 1 条 active Relation 且 accepted", async () => {
    const rec = assignRec("rec-bk-retry", OUTPATIENT);

    // 第一次：saveRelations 写入成功后抛错（模拟持久化部分成功 + 后续异常）
    // 注意：class 实例的 spread 不复制原型方法，须逐个显式 bind（与 Test A–E 同模式）
    const partialFailDataService: DataService = {
      saveWorkloadResults: dataService.saveWorkloadResults.bind(dataService),
      saveCalculationResults: dataService.saveCalculationResults.bind(dataService),
      deleteCards: async () => {},
      deleteWorkloadResults: async () => {},
      saveCards: dataService.saveCards.bind(dataService),
      saveWorkloadSplits: dataService.saveWorkloadSplits.bind(dataService),
      saveRelations: async (relations: any[]) => {
        await dataService.saveRelations(relations);
        throw new Error("post-write failure");
      },
      getCards: dataService.getCards.bind(dataService),
      getRelations: dataService.getRelations.bind(dataService),
      getResultSets: dataService.getResultSets.bind(dataService),
      getRecommendations: dataService.getRecommendations.bind(dataService),
      getWorkloadDefinition: dataService.getWorkloadDefinition.bind(dataService),
      getBudget: dataService.getBudget.bind(dataService),
      getScoreDefinitions: dataService.getScoreDefinitions.bind(dataService),
      getMeasurementResult: dataService.getMeasurementResult.bind(dataService),
      getAdjustmentTable: dataService.getAdjustmentTable.bind(dataService),
      getCalculationResults: dataService.getCalculationResults.bind(dataService),
      getWorkloadExecutions: dataService.getWorkloadExecutions.bind(dataService),
      getCalculationSnapshots: dataService.getCalculationSnapshots.bind(dataService),
      getWorkloadResults: dataService.getWorkloadResults.bind(dataService),
      getWorkloadSplits: dataService.getWorkloadSplits.bind(dataService),
    };

    recommendationStore.getState().setRecommendations([rec]);
    const firstContext = await buildAssignContext(rec);
    firstContext.dataService = partialFailDataService;
    const decision = {
      recommendationId: rec.id,
      action: "confirm_use_existing" as const,
      sourceUnitId: WARD1,
      targetWorkloadCardId: OUTPATIENT,
      decidedAt: new Date().toISOString(),
    };

    await expect(recommendationStore.getState().executeDecision(decision, firstContext))
      .rejects.toThrow("post-write failure");
    expect(recommendationStore.getState().getRecommendationById(rec.id)?.status).toBe("recommended");
    // Relation 已写入（部分成功）
    const afterFirst = await activeAssignCount(WARD1, OUTPATIENT);
    expect(afterFirst.count).toBe(1);

    // Retry：fresh context（existingRelations 含已写入的 Relation）+ 正常 dataService
    recommendationStore.getState().setRecommendations([{ ...rec, status: "recommended" as const }]);
    const retryContext = await buildAssignContext(rec);
    const result2 = await recommendationStore.getState().executeDecision(decision, retryContext);

    expect(result2.success).toBe(true);
    // 仍只有 1 条 active Relation（复用，不产生第二条）
    const afterRetry = await activeAssignCount(WARD1, OUTPATIENT);
    expect(afterRetry.count).toBe(1);
    expect(afterRetry.ids[0]).toBe(afterFirst.ids[0]);
    // Recommendation 收敛到 accepted
    expect(recommendationStore.getState().getRecommendationById(rec.id)?.status).toBe("accepted");
  });

  it("场景 3：同 Unit + 同 Workload + 不同 Recommendation → 复用同一条 active Relation（RecommendationId 不参与业务键）", async () => {
    const recA = assignRec("rec-bk-a", OUTPATIENT);
    const recB = assignRec("rec-bk-b", OUTPATIENT);

    // A 决策（正常执行）
    recommendationStore.getState().setRecommendations([recA]);
    const resultA = await recommendationStore.getState().executeDecision(
      { recommendationId: recA.id, action: "confirm_use_existing" as const, sourceUnitId: WARD1, targetWorkloadCardId: OUTPATIENT, decidedAt: new Date().toISOString() },
      await buildAssignContext(recA)
    );
    expect(resultA.success).toBe(true);
    const afterA = await activeAssignCount(WARD1, OUTPATIENT);
    expect(afterA.count).toBe(1);

    // B 决策：不同 Recommendation，同一 Unit + Workload 业务键 → 复用
    recommendationStore.getState().setRecommendations([recB]);
    const resultB = await recommendationStore.getState().executeDecision(
      { recommendationId: recB.id, action: "confirm_use_existing" as const, sourceUnitId: WARD1, targetWorkloadCardId: OUTPATIENT, decidedAt: new Date().toISOString() },
      await buildAssignContext(recB)
    );
    expect(resultB.success).toBe(true);
    const afterB = await activeAssignCount(WARD1, OUTPATIENT);
    // 仍只有 1 条（同一条被复用）
    expect(afterB.count).toBe(1);
    expect(afterB.ids[0]).toBe(afterA.ids[0]);
    expect(recommendationStore.getState().getRecommendationById(recB.id)?.status).toBe("accepted");
  });

  it("场景 4：同 Unit + 不同 Workload → 创建不同的 workload_assign", async () => {
    const rec = assignRec("rec-bk-4", INTERNAL);
    recommendationStore.getState().setRecommendations([rec]);
    const result = await recommendationStore.getState().executeDecision(
      { recommendationId: rec.id, action: "confirm_use_existing" as const, sourceUnitId: WARD1, targetWorkloadCardId: INTERNAL, decidedAt: new Date().toISOString() },
      await buildAssignContext(rec)
    );
    expect(result.success).toBe(true);
    const assign = await activeAssignCount(WARD1, INTERNAL);
    expect(assign.count).toBe(1);
  });

  it("场景 5：不同 Unit + 同 Workload → 创建不同的 workload_assign（符合 D-131 共享语义）", async () => {
    const rec = assignRec("rec-bk-5", OUTPATIENT);
    recommendationStore.getState().setRecommendations([rec]);
    const result = await recommendationStore.getState().executeDecision(
      { recommendationId: rec.id, action: "confirm_use_existing" as const, sourceUnitId: WARD2, targetWorkloadCardId: OUTPATIENT, decidedAt: new Date().toISOString() },
      await buildAssignContext(rec)
    );
    expect(result.success).toBe(true);
    const ward2 = await activeAssignCount(WARD2, OUTPATIENT);
    expect(ward2.count).toBe(1);
    // ward-1 的既有 assign 与本条是两条不同事实
    const ward1 = await activeAssignCount(WARD1, OUTPATIENT);
    expect(ward1.count).toBe(1);
    expect(ward2.ids[0]).not.toBe(ward1.ids[0]);
  });

  it("场景 6：inactive 旧 workload_assign 不被复用 → 允许创建新的 active Relation", async () => {
    // 预置一条 inactive 的同键旧 Relation
    await dataService.saveRelations([{
      id: "rel-inactive-legacy",
      type: "workload_assign",
      sourceId: "unit-emergency",
      targetId: OUTPATIENT,
      active: false,
      metadata: {},
    }]);

    const rec = assignRec("rec-bk-6", OUTPATIENT);
    recommendationStore.getState().setRecommendations([rec]);
    const result = await recommendationStore.getState().executeDecision(
      { recommendationId: rec.id, action: "confirm_use_existing" as const, sourceUnitId: "unit-emergency", targetWorkloadCardId: OUTPATIENT, decidedAt: new Date().toISOString() },
      await buildAssignContext(rec)
    );
    expect(result.success).toBe(true);
    const actives = await activeAssignCount("unit-emergency", OUTPATIENT);
    expect(actives.count).toBe(1);
    expect(actives.ids[0]).not.toBe("rel-inactive-legacy"); // 新建 active，不复活 inactive
  });
});

describe("child WorkloadCard ID 单射身份（P2 修复裁定 A / D-143）", () => {
  // Card 身份输入 = recommendationId + "::" + childWorkloadResultId，经 encodeIdComponent 单射编码
  // 相同输入 → 相同 Card ID；不同组合 → 必然不同 Card ID（不依赖概率性短哈希）

  const PARENT_CARD = "workload-neurosurgery-outpatient";
  const PARENT_RESULT = "workload-result-neurosurgery-outpatient";

  function splitRec(recId: string) {
    return {
      id: recId,
      kind: "resolution" as const,
      payload: {},
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function splitDecision(recId: string, decidedAt: string, childResultId?: string, childName = "拆分子结果") {
    return {
      recommendationId: recId,
      action: "confirm_split" as const,
      splitParameters: {
        parentResultId: PARENT_RESULT,
        children: [{
          ...(childResultId ? { id: childResultId } : {}),
          name: childName,
          value: 30,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-x",
        }],
        splitType: "partial" as const,
      },
      decidedAt,
    };
  }

  function buildSplitContext(rec: Recommendation): ActionExecutorContext {
    return {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[rec.id, rec]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: PARENT_CARD, type: "workload", name: "神经外科门诊人次", workloadResultId: PARENT_RESULT },
      dataService: dataService,
    };
  }

  async function cardsReferencing(resultId: string) {
    const cards = await dataService.getCards();
    return cards.filter((c: any) => c.type === "workload" && c.workloadResultId === resultId);
  }

  it("相同 recommendationId + childResultId 两次提交（retry）→ Card ID 完全相同", async () => {
    const rec = splitRec("rec-cardid-retry");
    const decision = splitDecision("rec-cardid-retry", "2026-10-04T20:00:00.000Z", "wr-cardid-r");

    recommendationStore.getState().setRecommendations([rec]);
    const r1 = await recommendationStore.getState().executeDecision(decision, buildSplitContext(rec));
    expect(r1.success).toBe(true);
    const after1 = await cardsReferencing("wr-cardid-r");
    expect(after1.length).toBe(1);

    recommendationStore.getState().setRecommendations([{ ...rec, status: "recommended" as const }]);
    const r2 = await recommendationStore.getState().executeDecision(decision, buildSplitContext(rec));
    expect(r2.success).toBe(true);
    const after2 = await cardsReferencing("wr-cardid-r");
    expect(after2.length).toBe(1);
    // retry upsert 同一张卡：ID 完全相同
    expect(after2[0].id).toBe(after1[0].id);
  });

  it("不同 execution + 相同 childResultId → 拒绝（H-2/D-145；stale context 由持久化边界兜底拒绝）", async () => {
    // 旧语义"两次 confirm_split 创建同一 Result"已被 D-145 禁止：
    // 决策 B 的 context 是 stale 的（executor 侧看不到既有 Result），
    // 持久化边界必须以正式数据兜底拒绝，不允许覆盖旧统计事实。
    // D-120"多卡一果"由一次创建 + use_existing/workload_assign 引用路径表达，不由两次 split 创建表达。
    const recA = splitRec("rec-cardid-a");
    const recB = splitRec("rec-cardid-b");
    const sharedChildId = "wr-cardid-shared";

    recommendationStore.getState().setRecommendations([recA]);
    const rA = await recommendationStore.getState().executeDecision(
      splitDecision("rec-cardid-a", "2026-10-04T20:01:00.000Z", sharedChildId),
      buildSplitContext(recA)
    );
    expect(rA.success).toBe(true);

    recommendationStore.getState().setRecommendations([recB]);
    await expect(
      recommendationStore.getState().executeDecision(
        splitDecision("rec-cardid-b", "2026-10-04T20:02:00.000Z", sharedChildId),
        buildSplitContext(recB) // stale：existingWorkloadResults 不含已保存的 shared Child
      )
    ).rejects.toThrow("已属于其他 execution");
    expect(recommendationStore.getState().getRecommendationById("rec-cardid-b")?.status).toBe("recommended");

    // 既有统计事实未被覆盖：仍只有一份 Result 与一张 Card
    const results = (await dataService.getWorkloadResults()).filter((r) => r.id === sharedChildId);
    expect(results.length).toBe(1);
    const cards = await cardsReferencing(sharedChildId);
    expect(cards.length).toBe(1);
  });

  it("相同 recommendationId + 不同 childResultId → Card ID 必然不同", async () => {
    const rec = splitRec("rec-cardid-multi");
    const decision = {
      recommendationId: "rec-cardid-multi",
      action: "confirm_split" as const,
      splitParameters: {
        parentResultId: PARENT_RESULT,
        children: [
          { id: "wr-cardid-m1", name: "子结果1", value: 30, dimensions: { departmentId: "unit-neurosurgery-ward-1" }, resultSetId: "rs-child", resultItemId: "ri-child-m1" },
          { id: "wr-cardid-m2", name: "子结果2", value: 30, dimensions: { departmentId: "unit-neurosurgery-ward-2" }, resultSetId: "rs-child", resultItemId: "ri-child-m2" },
        ],
        splitType: "partial" as const,
      },
      decidedAt: "2026-10-04T20:03:00.000Z",
    };
    recommendationStore.getState().setRecommendations([rec]);
    const result = await recommendationStore.getState().executeDecision(decision, buildSplitContext(rec));
    expect(result.success).toBe(true);

    const cards1 = await cardsReferencing("wr-cardid-m1");
    const cards2 = await cardsReferencing("wr-cardid-m2");
    expect(cards1.length).toBe(1);
    expect(cards2.length).toBe(1);
    expect(cards1[0].id).not.toBe(cards2[0].id);
  });

  it("Card ID 是单射编码而非哈希摘要：身份原文经转义直接嵌入、可从 ID 中恢复", async () => {
    const recId = "rec.cardid:enc";
    const childId = "wr.enc.1";
    const rec = splitRec(recId);
    recommendationStore.getState().setRecommendations([rec]);
    const result = await recommendationStore.getState().executeDecision(
      splitDecision(recId, "2026-10-04T20:04:00.000Z", childId, "编码证明子结果"),
      buildSplitContext(rec)
    );
    expect(result.success).toBe(true);
    const cards = await cardsReferencing(childId);
    expect(cards.length).toBe(1);
    const cardId = cards[0].id;
    // '.'→_002e、':'→_003a：身份原文以转义形式直接嵌入（非不可逆摘要）
    expect(cardId).toContain("rec_002ecardid_003aenc_003a_003awr_002eenc_002e1");
    expect(cardId).not.toMatch(/workload-card-[0-9a-f]{8}$/); // 不再是 8-hex 短哈希
  });

  it("D-142 新决策（新 decidedAt → 生成型 child Result ID 变化）→ 新 Card ID，旧 Card 不被覆盖", async () => {
    const recId = "rec-cardid-d142";
    const rec = splitRec(recId);
    const decision1 = splitDecision(recId, "2026-10-04T20:05:00.000Z"); // 无显式 id → 批次生成
    recommendationStore.getState().setRecommendations([rec]);
    const r1 = await recommendationStore.getState().executeDecision(decision1, buildSplitContext(rec));
    expect(r1.success).toBe(true);
    const childResult1 = r1.createdWorkloadResults[0];
    const cards1 = await cardsReferencing(childResult1.id);
    expect(cards1.length).toBe(1);
    const oldCardId = cards1[0].id;

    // D-142：同一 Recommendation 重新决策（新 decidedAt → 新批次 → 新生成型 child Result ID）
    recommendationStore.getState().setRecommendations([{ ...rec, status: "recommended" as const }]);
    const decision2 = splitDecision(recId, "2026-10-04T21:05:00.000Z");
    const r2 = await recommendationStore.getState().executeDecision(decision2, buildSplitContext(rec));
    expect(r2.success).toBe(true);
    const childResult2 = r2.createdWorkloadResults[0];
    expect(childResult2.id).not.toBe(childResult1.id);

    const cards2 = await cardsReferencing(childResult2.id);
    expect(cards2.length).toBe(1);
    expect(cards2[0].id).not.toBe(oldCardId); // 新 Card ID
    // 旧 Card 不被覆盖：仍在库中且引用不变
    const oldStillThere = (await dataService.getCards()).find((c: any) => c.id === oldCardId);
    expect(oldStillThere).toBeDefined();
    expect((oldStillThere as any).workloadResultId).toBe(childResult1.id);
  });
});

describe("H-2 / D-146：confirm_split 显式 child ID 跨 execution 身份检查与幂等恢复", () => {
  const PARENT_CARD = "workload-neurosurgery-outpatient";
  const PARENT_RESULT = "workload-result-neurosurgery-outpatient";

  function h2Rec(recId: string) {
    return {
      id: recId,
      kind: "resolution" as const,
      payload: {},
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function h2Decision(recId: string, decidedAt: string, childId: string, value: number) {
    return {
      recommendationId: recId,
      action: "confirm_split" as const,
      splitParameters: {
        parentResultId: PARENT_RESULT,
        children: [{
          id: childId,
          name: "H-2 子结果",
          value,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-h2",
          resultItemId: "ri-h2",
        }],
        splitType: "partial" as const,
      },
      decidedAt,
    };
  }

  /** 从 DataService 重建的 fresh context（含已持久化的 Results / Splits / Relations / Cards） */
  async function freshContext(recId: string): Promise<ActionExecutorContext> {
    const [relations, results, splits] = await Promise.all([
      dataService.getRelations(),
      dataService.getWorkloadResults(),
      dataService.getWorkloadSplits(),
    ]);
    return {
      existingRelations: [...relations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map([...mockWorkloadResults, ...results].map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(splits.map((sp: any) => [sp.id, sp])),
      recommendations: new Map([[recId, h2Rec(recId)]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: PARENT_CARD, type: "workload", name: "神经外科门诊人次", workloadResultId: PARENT_RESULT },
      dataService: dataService,
    };
  }

  /** saveWorkloadSplits 抛错的 dataService：制造"Result 已存、Split 未存"部分失败窗口 */
  function failAtSaveSplitsDataService(): DataService {
    return {
      saveWorkloadResults: dataService.saveWorkloadResults.bind(dataService),
      saveCalculationResults: dataService.saveCalculationResults.bind(dataService),
      deleteCards: async () => {},
      deleteWorkloadResults: async () => {},
      saveCards: dataService.saveCards.bind(dataService),
      saveRelations: dataService.saveRelations.bind(dataService),
      saveWorkloadSplits: async () => { throw new Error("Simulated saveWorkloadSplits failure"); },
      getCards: dataService.getCards.bind(dataService),
      getRelations: dataService.getRelations.bind(dataService),
      getResultSets: dataService.getResultSets.bind(dataService),
      getRecommendations: dataService.getRecommendations.bind(dataService),
      getWorkloadDefinition: dataService.getWorkloadDefinition.bind(dataService),
      getBudget: dataService.getBudget.bind(dataService),
      getScoreDefinitions: dataService.getScoreDefinitions.bind(dataService),
      getMeasurementResult: dataService.getMeasurementResult.bind(dataService),
      getAdjustmentTable: dataService.getAdjustmentTable.bind(dataService),
      getCalculationResults: dataService.getCalculationResults.bind(dataService),
      getWorkloadExecutions: dataService.getWorkloadExecutions.bind(dataService),
      getCalculationSnapshots: dataService.getCalculationSnapshots.bind(dataService),
      getWorkloadResults: dataService.getWorkloadResults.bind(dataService),
      getWorkloadSplits: dataService.getWorkloadSplits.bind(dataService),
    };
  }

  it("场景 1：Result 已存、Split 未存 + 同一 UserDecision retry → 幂等恢复并 accepted", async () => {
    const recId = "rec-h2-s1";
    const decision = h2Decision(recId, "2026-10-05T10:00:00.000Z", "wr-h2-s1", 60);

    // 第一次：saveWorkloadSplits 失败 → Result/Card/Relation 已存、Split 未存
    recommendationStore.getState().setRecommendations([h2Rec(recId)]);
    const firstContext = await freshContext(recId);
    firstContext.dataService = failAtSaveSplitsDataService();
    await expect(recommendationStore.getState().executeDecision(decision, firstContext))
      .rejects.toThrow("Simulated saveWorkloadSplits failure");
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("recommended");
    const resultsAfterFirst = (await dataService.getWorkloadResults()).filter((r) => r.id === "wr-h2-s1");
    expect(resultsAfterFirst.length).toBe(1);

    // retry：fresh context（Result 在、无引用 Split → ownership unknown）+ 内容全同 → 幂等恢复
    recommendationStore.getState().setRecommendations([{ ...h2Rec(recId), status: "recommended" as const }]);
    const retryResult = await recommendationStore.getState().executeDecision(decision, await freshContext(recId));
    expect(retryResult.success).toBe(true);
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("accepted");
    const resultsAfterRetry = (await dataService.getWorkloadResults()).filter((r) => r.id === "wr-h2-s1");
    expect(resultsAfterRetry.length).toBe(1);
    expect(resultsAfterRetry[0].value).toBe(60);
  });

  it("场景 2：窗口 + 新 execution + 内容不同 → 明确拒绝，既有事实不被覆盖", async () => {
    const recId = "rec-h2-s2";
    const decision1 = h2Decision(recId, "2026-10-05T10:01:00.000Z", "wr-h2-s2", 60);

    recommendationStore.getState().setRecommendations([h2Rec(recId)]);
    const firstContext = await freshContext(recId);
    firstContext.dataService = failAtSaveSplitsDataService();
    await expect(recommendationStore.getState().executeDecision(decision1, firstContext))
      .rejects.toThrow("Simulated saveWorkloadSplits failure");

    // 新 execution（新 decidedAt）+ 相同显式 ID + value 850≠60 → 拒绝
    const decision2 = h2Decision(recId, "2026-10-05T11:01:00.000Z", "wr-h2-s2", 850);
    const result2 = await recommendationStore.getState().executeDecision(decision2, await freshContext(recId));
    expect(result2.success).toBe(false);
    expect(result2.error).toContain("内容与当前 execution 不一致");
    expect(result2.createdWorkloadResults).toHaveLength(0);
    // 既有统计事实未被覆盖
    const results = (await dataService.getWorkloadResults()).filter((r) => r.id === "wr-h2-s2");
    expect(results.length).toBe(1);
    expect(results[0].value).toBe(60);
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("recommended");
  });

  it("场景 3：窗口 + 新 execution + 内容完全相同 → ownership unknown → 允许幂等恢复", async () => {
    const recId = "rec-h2-s3";
    const decision1 = h2Decision(recId, "2026-10-05T10:02:00.000Z", "wr-h2-s3", 60);

    recommendationStore.getState().setRecommendations([h2Rec(recId)]);
    const firstContext = await freshContext(recId);
    firstContext.dataService = failAtSaveSplitsDataService();
    await expect(recommendationStore.getState().executeDecision(decision1, firstContext))
      .rejects.toThrow("Simulated saveWorkloadSplits failure");

    // 新 execution（新 decidedAt）+ 相同显式 ID + 内容完全一致 → 幂等恢复
    const decision2 = h2Decision(recId, "2026-10-05T11:02:00.000Z", "wr-h2-s3", 60);
    const result2 = await recommendationStore.getState().executeDecision(decision2, await freshContext(recId));
    expect(result2.success).toBe(true);
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("accepted");
    const results = (await dataService.getWorkloadResults()).filter((r) => r.id === "wr-h2-s3");
    expect(results.length).toBe(1);
    expect(results[0].value).toBe(60);
    // WorkloadSplit 保存成功（本次 T2 批次 1 条）
    const splits = (await dataService.getWorkloadSplits()).filter((sp) => sp.childResultId === "wr-h2-s3");
    expect(splits.length).toBe(1);
  });

  it("场景 4/10：Result + 当前批次 Split 均已存 + 同一 UserDecision retry → 全部事实复用不重复（完整闭环）", async () => {
    const recId = "rec-h2-s4";
    const decision = h2Decision(recId, "2026-10-05T10:03:00.000Z", "wr-h2-s4", 60);

    recommendationStore.getState().setRecommendations([h2Rec(recId)]);
    const result1 = await recommendationStore.getState().executeDecision(decision, await freshContext(recId));
    expect(result1.success).toBe(true);

    const snapshot = {
      results: [...await dataService.getWorkloadResults()].length,
      cards: [...await dataService.getCards()].length,
      relations: [...await dataService.getRelations()].length,
      splits: [...await dataService.getWorkloadSplits()].length,
    };

    // 同一 UserDecision retry（fresh context 含既有 Result + 当前批次 Split → ownership current）
    recommendationStore.getState().setRecommendations([{ ...h2Rec(recId), status: "recommended" as const }]);
    const result2 = await recommendationStore.getState().executeDecision(decision, await freshContext(recId));
    expect(result2.success).toBe(true);

    const after = {
      results: [...await dataService.getWorkloadResults()].length,
      cards: [...await dataService.getCards()].length,
      relations: [...await dataService.getRelations()].length,
      splits: [...await dataService.getWorkloadSplits()].length,
    };
    expect(after).toEqual(snapshot); // Result / Card / Relation / Split 全部只保留一份业务事实
  });

  it("场景 5：其他批次 Split 已存在 + 新 execution 复用同一 child ID → 即使内容全同也拒绝", async () => {
    const recId = "rec-h2-s5";
    const decision1 = h2Decision(recId, "2026-10-05T10:04:00.000Z", "wr-h2-s5", 60);
    recommendationStore.getState().setRecommendations([h2Rec(recId)]);
    const result1 = await recommendationStore.getState().executeDecision(decision1, await freshContext(recId));
    expect(result1.success).toBe(true);

    // D-142 新决策：同 recId、新 decidedAt、相同显式 ID、内容全同 → 归属可证为其他批次 → 拒绝
    const decision2 = h2Decision(recId, "2026-10-05T11:04:00.000Z", "wr-h2-s5", 60);
    recommendationStore.getState().setRecommendations([{ ...h2Rec(recId), status: "recommended" as const }]);
    const result2 = await recommendationStore.getState().executeDecision(decision2, await freshContext(recId));
    expect(result2.success).toBe(false);
    expect(result2.error).toContain("已属于其他 execution");
    // 既有事实与分解记录均未被覆盖
    const results = (await dataService.getWorkloadResults()).filter((r) => r.id === "wr-h2-s5");
    expect(results.length).toBe(1);
    expect(results[0].value).toBe(60);
    const splits = (await dataService.getWorkloadSplits()).filter((sp) => sp.childResultId === "wr-h2-s5");
    expect(splits.length).toBe(1);
  });

  it("场景 6：无显式 child.id → 批次生成 ID，不受本规则影响（D-142 重决策各得其所）", async () => {
    const recId = "rec-h2-s6";
    const decision1 = {
      recommendationId: recId,
      action: "confirm_split" as const,
      splitParameters: {
        parentResultId: PARENT_RESULT,
        children: [{ name: "生成型子结果", value: 60, dimensions: { departmentId: "unit-neurosurgery-ward-1" }, resultSetId: "rs-h2", resultItemId: "ri-h2" }],
        splitType: "partial" as const,
      },
      decidedAt: "2026-10-05T10:05:00.000Z",
    };
    recommendationStore.getState().setRecommendations([h2Rec(recId)]);
    const result1 = await recommendationStore.getState().executeDecision(decision1, await freshContext(recId));
    expect(result1.success).toBe(true);

    recommendationStore.getState().setRecommendations([{ ...h2Rec(recId), status: "recommended" as const }]);
    const decision2 = { ...decision1, decidedAt: "2026-10-05T11:05:00.000Z" };
    const result2 = await recommendationStore.getState().executeDecision(decision2, await freshContext(recId));
    expect(result2.success).toBe(true);
    // 两个 execution 的生成型 child ID 不同（批次隔离），互不覆盖
    expect(result2.createdWorkloadResults[0].id).not.toBe(result1.createdWorkloadResults[0].id);
  });
});

describe("P1 修复：current ownership 也必须 exact-content 一致（D-144 规则 2 补强）", () => {
  const PARENT_CARD = "workload-neurosurgery-outpatient";
  const PARENT_RESULT = "workload-result-neurosurgery-outpatient";

  function p1Rec(recId: string) {
    return {
      id: recId,
      kind: "resolution" as const,
      payload: {},
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function p1Decision(recId: string, decidedAt: string, childId: string, value: number) {
    return {
      recommendationId: recId,
      action: "confirm_split" as const,
      splitParameters: {
        parentResultId: PARENT_RESULT,
        children: [{
          id: childId,
          name: "P1 子结果",
          value,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-p1",
          resultItemId: "ri-p1",
        }],
        splitType: "partial" as const,
      },
      decidedAt,
    };
  }

  async function p1FreshContext(recId: string): Promise<ActionExecutorContext> {
    const [relations, results, splits] = await Promise.all([
      dataService.getRelations(),
      dataService.getWorkloadResults(),
      dataService.getWorkloadSplits(),
    ]);
    return {
      existingRelations: [...relations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map([...mockWorkloadResults, ...results].map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(splits.map((sp: any) => [sp.id, sp])),
      recommendations: new Map([[recId, p1Rec(recId)]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: PARENT_CARD, type: "workload", name: "神经外科门诊人次", workloadResultId: PARENT_RESULT },
      dataService: dataService,
    };
  }

  it("executor 层：同一 execution（同 decidedAt）+ 同 child ID + 内容不同 → 拒绝，既有事实不被覆盖", async () => {
    const recId = "rec-p1-exec";
    const T1 = "2026-10-05T10:10:00.000Z";
    // 第一次：完整成功（Result + 当前批次 Split 均已存 → ownership 可证为 current）
    recommendationStore.getState().setRecommendations([p1Rec(recId)]);
    const result1 = await recommendationStore.getState().executeDecision(
      p1Decision(recId, T1, "wr-p1-exec", 60),
      await p1FreshContext(recId)
    );
    expect(result1.success).toBe(true);

    // 第二次：仍为同一 execution（同 recId + 同 decidedAt）、同 child ID，但 value 850≠60
    recommendationStore.getState().setRecommendations([{ ...p1Rec(recId), status: "recommended" as const }]);
    const result2 = await recommendationStore.getState().executeDecision(
      p1Decision(recId, T1, "wr-p1-exec", 850),
      await p1FreshContext(recId) // fresh：含既有 Result + 当前批次 Split → current
    );

    expect(result2.success).toBe(false);
    expect(result2.error).toContain("内容与当前 execution 不一致");
    expect(result2.createdWorkloadResults).toHaveLength(0);
    // 既有统计事实未被覆盖
    const results = (await dataService.getWorkloadResults()).filter((r) => r.id === "wr-p1-exec");
    expect(results.length).toBe(1);
    expect(results[0].value).toBe(60);
    // Recommendation 保持 recommended
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("recommended");
  });

  it("submission 层：stale/绕过 executor（同批次 candidate 内容不同）→ 阶段 0 拒绝，DB 不被覆盖", async () => {
    const recId = "rec-p1-sub";
    const T1 = "2026-10-05T10:11:00.000Z";
    // DB 预置：T1 批次已保存 child-neuro=60（完整成功）
    recommendationStore.getState().setRecommendations([p1Rec(recId)]);
    const result1 = await recommendationStore.getState().executeDecision(
      p1Decision(recId, T1, "wr-p1-sub", 60),
      await p1FreshContext(recId)
    );
    expect(result1.success).toBe(true);
    const initialResults = [...await dataService.getWorkloadResults()].length;
    const initialSplits = [...await dataService.getWorkloadSplits()].length;

    // 构造绕过 executor 的 candidate：同批次（executionBatchId=T1 批次）+ 同 child ID + value 850
    const forgedResult: ActionExecutorResult = {
      success: true,
      createdRelations: [],
      createdWorkloadResults: [{
        id: "wr-p1-sub",
        resultSetId: "rs-p1",
        resultItemId: "ri-p1",
        name: "P1 子结果",
        value: 850,
        dimensions: { departmentId: "unit-neurosurgery-ward-1" },
        period: (await dataService.getWorkloadResults()).find((r) => r.id === "wr-p1-sub")?.period,
      }],
      createdWorkloadSplits: [{
        id: `${PARENT_RESULT}-split-forged-0`,
        parentResultId: PARENT_RESULT,
        childResultId: "wr-p1-sub",
        splitType: "partial",
      } as any],
      pendingSplitRelations: [{ parentWorkloadCardId: PARENT_CARD, childWorkloadResultId: "wr-p1-sub" }],
      executionBatchId: `${recId}::${T1}`, // 同批次 → ownership=current
    };

    await expect(
      submitActionResult(forgedResult, dataService, recId)
    ).rejects.toThrow("内容与当前 execution 不一致");

    // DB 仍是 60，未保存 850，事实数量不变
    const results = (await dataService.getWorkloadResults()).filter((r) => r.id === "wr-p1-sub");
    expect(results.length).toBe(1);
    expect(results[0].value).toBe(60);
    expect([...await dataService.getWorkloadResults()].length).toBe(initialResults);
    expect([...await dataService.getWorkloadSplits()].length).toBe(initialSplits);
  });
});

describe("E-1 集成：重复显式 child ID → 整个 UserDecision 拒绝、零事实、推荐保持 recommended", () => {
  const PARENT_RESULT = "workload-result-neurosurgery-outpatient";

  it("store 全链：children 重复显式 ID → success=false，DB 不变，推荐不 accepted", async () => {
    const recId = "rec-e1-integ";
    const rec = {
      id: recId,
      kind: "resolution" as const,
      payload: {},
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const decision = {
      recommendationId: recId,
      action: "confirm_split" as const,
      splitParameters: {
        parentResultId: PARENT_RESULT,
        children: [
          { id: "child-e1-dup", name: "重复A", value: 800, dimensions: { departmentId: "unit-neurosurgery-ward-1" }, resultSetId: "rs-child", resultItemId: "ri-child-a" },
          { id: "child-e1-dup", name: "重复B", value: 900, dimensions: { departmentId: "unit-neurosurgery-ward-2" }, resultSetId: "rs-child", resultItemId: "ri-child-b" },
        ],
        splitType: "partial" as const,
      },
      decidedAt: "2026-10-05T15:02:00.000Z",
    };

    const before = {
      results: [...await dataService.getWorkloadResults()].length,
      cards: [...await dataService.getCards()].length,
      relations: [...await dataService.getRelations()].length,
      splits: [...await dataService.getWorkloadSplits()].length,
    };

    recommendationStore.getState().setRecommendations([rec]);
    const result = await recommendationStore.getState().executeDecision(decision, {
      existingRelations: [...await dataService.getRelations()],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[recId, rec]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: "workload-neurosurgery-outpatient", type: "workload", name: "神经外科门诊人次", workloadResultId: PARENT_RESULT },
      dataService: dataService,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("重复 child Result ID：child-e1-dup");
    expect(result.createdWorkloadResults).toHaveLength(0);
    expect(result.createdWorkloadSplits).toHaveLength(0);
    // DB 完全不变
    const after = {
      results: [...await dataService.getWorkloadResults()].length,
      cards: [...await dataService.getCards()].length,
      relations: [...await dataService.getRelations()].length,
      splits: [...await dataService.getWorkloadSplits()].length,
    };
    expect(after).toEqual(before);
    // Recommendation 保持 recommended
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("recommended");
  });
});

describe("E-2 / D-148 集成：children 顺序交换的同一次 execution retry", () => {
  const PARENT_CARD = "workload-neurosurgery-outpatient";
  const PARENT_RESULT = "workload-result-neurosurgery-outpatient";

  function e2sRec(recId: string) {
    return {
      id: recId,
      kind: "resolution" as const,
      payload: {},
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async function e2sFreshContext(recId: string): Promise<ActionExecutorContext> {
    const [relations, results, splits] = await Promise.all([
      dataService.getRelations(),
      dataService.getWorkloadResults(),
      dataService.getWorkloadSplits(),
    ]);
    return {
      existingRelations: [...relations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map([...mockWorkloadResults, ...results].map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(splits.map((sp: any) => [sp.id, sp])),
      recommendations: new Map([[recId, e2sRec(recId)]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      workloadCard: { id: PARENT_CARD, type: "workload", name: "神经外科门诊人次", workloadResultId: PARENT_RESULT },
      dataService: dataService,
    };
  }

  it("场景 1：无显式 ID，retry 换序 → Result/Split/Card/Relation 全部不变，retry 不因换序失败", async () => {
    const recId = "rec-e2s-gen";
    const T1 = "2026-10-05T18:01:00.000Z";
    const mkChildren = (swap: boolean) => {
      const a = { name: "子结果A", value: 60, dimensions: { departmentId: "unit-neurosurgery-ward-1" }, resultSetId: "rs-e2s", resultItemId: "ri-e2s-a" };
      const b = { name: "子结果B", value: 30, dimensions: { departmentId: "unit-neurosurgery-ward-2" }, resultSetId: "rs-e2s", resultItemId: "ri-e2s-b" };
      return swap ? [b, a] : [a, b];
    };
    const decisionFor = (swap: boolean) => ({
      recommendationId: recId,
      action: "confirm_split" as const,
      splitParameters: { parentResultId: PARENT_RESULT, children: mkChildren(swap), splitType: "partial" as const },
      decidedAt: T1,
    });

    recommendationStore.getState().setRecommendations([e2sRec(recId)]);
    const r1 = await recommendationStore.getState().executeDecision(decisionFor(false), await e2sFreshContext(recId));
    expect(r1.success).toBe(true);
    const snapshot = {
      results: [...await dataService.getWorkloadResults()].length,
      cards: [...await dataService.getCards()].length,
      relations: [...await dataService.getRelations()].length,
      splits: [...await dataService.getWorkloadSplits()].length,
    };
    const childIdsBefore = [...r1.createdWorkloadResults.map((r) => r.id)].sort();
    const splitIdsBefore = [...r1.createdWorkloadSplits.map((sp) => sp.id)].sort();
    const splitChildMapBefore = new Map(r1.createdWorkloadSplits.map((sp) => [sp.id, sp.childResultId]));

    // retry：仅交换 children 顺序（同 recId + 同 decidedAt + 同内容）
    recommendationStore.getState().setRecommendations([{ ...e2sRec(recId), status: "recommended" as const }]);
    const r2 = await recommendationStore.getState().executeDecision(decisionFor(true), await e2sFreshContext(recId));
    expect(r2.success).toBe(true);

    // 业务事实完全不变：计数不变 + Result ID 按锚点不变 + Split ID 不变 + 关联不变
    const after = {
      results: [...await dataService.getWorkloadResults()].length,
      cards: [...await dataService.getCards()].length,
      relations: [...await dataService.getRelations()].length,
      splits: [...await dataService.getWorkloadSplits()].length,
    };
    expect(after).toEqual(snapshot);
    expect([...r2.createdWorkloadResults.map((r) => r.id)].sort()).toEqual(childIdsBefore);
    expect([...r2.createdWorkloadSplits.map((sp) => sp.id)].sort()).toEqual(splitIdsBefore);
    for (const sp of r2.createdWorkloadSplits) {
      expect(splitChildMapBefore.get(sp.id)).toBe(sp.childResultId);
    }
  });

  it("场景 2：显式 ID，retry 换序 → Split 记录 childResultId 关联不对调，不产生第二份事实", async () => {
    const recId = "rec-e2s-exp";
    const T1 = "2026-10-05T18:02:00.000Z";
    const mkChildren = (swap: boolean) => {
      const a = { id: "child-e2s-a", name: "子结果A", value: 60, dimensions: { departmentId: "unit-neurosurgery-ward-1" }, resultSetId: "rs-e2s", resultItemId: "ri-e2s-a" };
      const b = { id: "child-e2s-b", name: "子结果B", value: 30, dimensions: { departmentId: "unit-neurosurgery-ward-2" }, resultSetId: "rs-e2s", resultItemId: "ri-e2s-b" };
      return swap ? [b, a] : [a, b];
    };
    const decisionFor = (swap: boolean) => ({
      recommendationId: recId,
      action: "confirm_split" as const,
      splitParameters: { parentResultId: PARENT_RESULT, children: mkChildren(swap), splitType: "partial" as const },
      decidedAt: T1,
    });

    recommendationStore.getState().setRecommendations([e2sRec(recId)]);
    const r1 = await recommendationStore.getState().executeDecision(decisionFor(false), await e2sFreshContext(recId));
    expect(r1.success).toBe(true);
    const snapshot = {
      results: [...await dataService.getWorkloadResults()].length,
      cards: [...await dataService.getCards()].length,
      relations: [...await dataService.getRelations()].length,
      splits: [...await dataService.getWorkloadSplits()].length,
    };
    const splitChildMapBefore = new Map(r1.createdWorkloadSplits.map((sp) => [sp.id, sp.childResultId]));

    recommendationStore.getState().setRecommendations([{ ...e2sRec(recId), status: "recommended" as const }]);
    const r2 = await recommendationStore.getState().executeDecision(decisionFor(true), await e2sFreshContext(recId));
    expect(r2.success).toBe(true);

    const after = {
      results: [...await dataService.getWorkloadResults()].length,
      cards: [...await dataService.getCards()].length,
      relations: [...await dataService.getRelations()].length,
      splits: [...await dataService.getWorkloadSplits()].length,
    };
    expect(after).toEqual(snapshot); // 不产生第二份事实
    // Split ID 稳定且 childResultId 关联不对调
    for (const sp of r2.createdWorkloadSplits) {
      expect(splitChildMapBefore.get(sp.id)).toBe(sp.childResultId);
    }
    expect(new Set([...splitChildMapBefore.keys()])).toEqual(new Set(r2.createdWorkloadSplits.map((sp) => sp.id)));
  });
});

describe("P2-6 门禁：cancel/dismiss 不得经 executeDecision（通道隔离）", () => {
  function p26Rec(recId: string) {
    return {
      id: recId,
      kind: "resolution" as const,
      payload: {},
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function p26Context(recId: string, withDataService: boolean): ActionExecutorContext {
    return {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map([[recId, p26Rec(recId)]]),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
      dataService: withDataService ? dataService : null,
    };
  }

  it("executeDecision(cancel) 且 dataService 存在 → 门禁拒绝，不 accepted", async () => {
    recommendationStore.getState().setRecommendations([p26Rec("rec-p26-cancel")]);
    await expect(
      recommendationStore.getState().executeDecision(
        { recommendationId: "rec-p26-cancel", action: "cancel" as const, decidedAt: new Date().toISOString(), rejectionReason: "暂不采用" },
        p26Context("rec-p26-cancel", true)
      )
    ).rejects.toThrow("必须经 cancelOrDismiss 处理");
    expect(recommendationStore.getState().getRecommendationById("rec-p26-cancel")?.status).toBe("recommended");
  });

  it("executeDecision(dismiss) 且 dataService 存在 → 门禁拒绝，不 accepted", async () => {
    recommendationStore.getState().setRecommendations([p26Rec("rec-p26-dismiss")]);
    await expect(
      recommendationStore.getState().executeDecision(
        { recommendationId: "rec-p26-dismiss", action: "dismiss" as const, decidedAt: new Date().toISOString(), rejectionReason: "不适用" },
        p26Context("rec-p26-dismiss", true)
      )
    ).rejects.toThrow("必须经 cancelOrDismiss 处理");
    expect(recommendationStore.getState().getRecommendationById("rec-p26-dismiss")?.status).toBe("recommended");
  });

  it("executeDecision(cancel) 且 dataService 缺失 → 同一门禁错误（与存在时出口一致）", async () => {
    recommendationStore.getState().setRecommendations([p26Rec("rec-p26-cancel-nods")]);
    await expect(
      recommendationStore.getState().executeDecision(
        { recommendationId: "rec-p26-cancel-nods", action: "cancel" as const, decidedAt: new Date().toISOString() },
        p26Context("rec-p26-cancel-nods", false)
      )
    ).rejects.toThrow("必须经 cancelOrDismiss 处理"); // 不是 "dataService is missing"
    expect(recommendationStore.getState().getRecommendationById("rec-p26-cancel-nods")?.status).toBe("recommended");
  });

  it("executeDecision(dismiss) 且 dataService 缺失 → 同一门禁错误（与存在时出口一致）", async () => {
    recommendationStore.getState().setRecommendations([p26Rec("rec-p26-dismiss-nods")]);
    await expect(
      recommendationStore.getState().executeDecision(
        { recommendationId: "rec-p26-dismiss-nods", action: "dismiss" as const, decidedAt: new Date().toISOString() },
        p26Context("rec-p26-dismiss-nods", false)
      )
    ).rejects.toThrow("必须经 cancelOrDismiss 处理");
    expect(recommendationStore.getState().getRecommendationById("rec-p26-dismiss-nods")?.status).toBe("recommended");
  });
});

describe("cancelOrDismiss happy-path 正向状态转换（补既有测试覆盖缺口）", () => {
  function minimalContext(): ActionExecutorContext {
    return {
      existingRelations: [...mockRelations],
      existingCards: new Map(mockCards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])),
      existingWorkloadResults: new Map(mockWorkloadResults.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(),
      recommendations: new Map(),
      endpointKinds: new Map(mockCards.map((c: any) => [c.id, c.type])),
    };
  }

  it("cancelOrDismiss(cancel) 成功：recommended → ignored，userDecisions 记录 cancel 决策", async () => {
    const recId = "rec-cod-cancel-happy";
    const recommendation = {
      id: recId,
      kind: "resolution" as const,
      payload: {},
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    recommendationStore.getState().setRecommendations([recommendation]);
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("recommended");

    const result = await recommendationStore.getState().cancelOrDismiss(
      recId,
      "cancel",
      "暂不采用",
      minimalContext()
    );

    expect(result.success).toBe(true);
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("ignored");
    const decisions = recommendationStore.getState().getUserDecisions(recId);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].action).toBe("cancel");
    expect(decisions[0].recommendationId).toBe(recId);
    expect(decisions[0].rejectionReason).toBe("暂不采用");
  });

  it("cancelOrDismiss(dismiss) 成功：recommended → dismissed，userDecisions 记录 dismiss 决策", async () => {
    const recId = "rec-cod-dismiss-happy";
    const recommendation = {
      id: recId,
      kind: "resolution" as const,
      payload: {},
      status: "recommended" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    recommendationStore.getState().setRecommendations([recommendation]);
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("recommended");

    const result = await recommendationStore.getState().cancelOrDismiss(
      recId,
      "dismiss",
      "不适用本科室",
      minimalContext()
    );

    expect(result.success).toBe(true);
    expect(recommendationStore.getState().getRecommendationById(recId)?.status).toBe("dismissed");
    const decisions = recommendationStore.getState().getUserDecisions(recId);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].action).toBe("dismiss");
    expect(decisions[0].recommendationId).toBe(recId);
    expect(decisions[0].rejectionReason).toBe("不适用本科室");
  });
});
