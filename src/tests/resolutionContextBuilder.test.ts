import { describe, expect, it } from "vitest";
import { ResolutionContextBuilder } from "../domain/workload/resolutionContextBuilder";
import {
  MockResolutionContextBuilder,
  defaultMockResolutionContextBuilder,
} from "../mock/mockResolutionContextBuilder";
import type { DataService } from "../services/DataService";
import { mockCards } from "../mock/mockCards";
import { mockRelations } from "../mock/mockRelations";
import {
  mockWorkloadResults,
  mockResultSets,
  mockCalculationSnapshots,
  mockWorkloadExecutions,
  mockDischargeResultSet,
} from "../mock/mockWorkloadChain";
import { mockWorkloadDefinitions } from "../mock/mockWorkloadDefinitions";

/**
 * 构建测试用 DataService stub。
 * 生产路径 buildFromDataService 仅通过 DataService 接口取数，
 * 默认由 mock 数据支撑；getWorkloadDefinition 可替换以模拟异常场景。
 */
function createStubDataService(
  getWorkloadDefinition?: (id: string) => Promise<unknown>,
  relations: {
    type: string;
    active: boolean;
    sourceId: string;
    targetId: string;
  }[] = mockRelations,
  resultSets: import("../domain/workload/types").ResultSet[] = mockResultSets
): DataService {
  return {
    getCards: async () => mockCards,
    getRelations: async () => relations,
    getWorkloadResults: async () => mockWorkloadResults,
    getResultSets: async () => resultSets,
    getCalculationSnapshots: async () => mockCalculationSnapshots,
    getWorkloadExecutions: async () => mockWorkloadExecutions,
    getWorkloadDefinition:
      getWorkloadDefinition ??
      (async (id: string) =>
        mockWorkloadDefinitions.find((d) => d.id === id)),
  } as unknown as DataService;
}

describe("MockResolutionContextBuilder", () => {
  describe("build()（测试路径）", () => {
    it("should build ResolutionContext with workloadCard and targetUnit", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: false });
      const context = builder.build(
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery"
      );

      expect(context.workloadCard.id).toBe("workload-neurosurgery-outpatient");
      expect(context.targetUnit.id).toBe("unit-neurosurgery");
    });

    it("should throw if workloadCard not found", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: false });
      expect(() =>
        builder.build("non-existent-workload", "unit-neurosurgery")
      ).toThrow("找不到测试数据");
    });

    it("should throw if targetUnit not found", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: false });
      expect(() =>
        builder.build("workload-neurosurgery-outpatient", "non-existent-unit")
      ).toThrow("找不到测试数据");
    });

    it("should build unitHierarchy from structure relations", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: false });
      const context = builder.build(
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery"
      );

      // unit-neurosurgery has children: unit-neurosurgery-ward-1, unit-neurosurgery-ward-2, unit-intervention-room
      expect(context.unitHierarchy.get("unit-neurosurgery")).toContain(
        "unit-neurosurgery-ward-1"
      );
      expect(context.unitHierarchy.get("unit-neurosurgery")).toContain(
        "unit-neurosurgery-ward-2"
      );
      expect(context.unitHierarchy.get("unit-neurosurgery")).toContain(
        "unit-intervention-room"
      );
    });

    it("should build workloadHierarchy from workload_split relations", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: false });
      const context = builder.build(
        "workload-outpatient-visits",
        "unit-neurosurgery"
      );

      // workload-outpatient-visits has children via workload_split
      expect(context.workloadHierarchy.get("workload-outpatient-visits")).toContain(
        "workload-neurosurgery-outpatient"
      );
      expect(context.workloadHierarchy.get("workload-outpatient-visits")).toContain(
        "workload-internal-outpatient"
      );
    });
  });

  describe("autoPopulateFromMock", () => {
    it("should populate sourceDataObjects when autoPopulateFromMock is true", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: true });
      const context = builder.build(
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery-ward-1"
      );

      expect(context.sourceDataObjects).toBeDefined();
      expect(context.sourceDataObjects!.size).toBeGreaterThan(0);
    });

    it("should project mappingEvidences from parent ResultSet items（正式投影，非手工构造）", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: true });
      // 出院人次 → 神经外科：父级 rs-snapshot-discharge-2025 的实际观测
      // wardId=unit-neurosurgery-ward-1 ∈ target children → 生成 1 条 evidence
      const context = builder.build(
        "workload-discharge-visits",
        "unit-neurosurgery"
      );

      expect(context.mappingEvidences).toHaveLength(1);
      const evidence = context.mappingEvidences![0];
      expect(evidence.targetChildUnitId).toBe("unit-neurosurgery-ward-1");
      expect(evidence.matchedDimensionValues).toEqual({
        wardId: "unit-neurosurgery-ward-1",
      });
      expect(evidence.sourceDataObjectId).toBe("data-object-discharge");
      expect(evidence.rowCount).toBeUndefined(); // 无正式来源不伪造
      expect(evidence.confidence).toBeUndefined(); // 无正式判定规则不伪造
      expect(evidence.evidenceDescription).toContain("父级 ResultSet");
      expect(evidence.evidenceDescription).toContain("实际");
    });

    it("should not populate sourceDataObjects when autoPopulateFromMock is false", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: false });
      const context = builder.build(
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery"
      );

      expect(context.sourceDataObjects).toBeUndefined();
      // mappingEvidences 现为正式查询投影（不再由 autoPopulateFromMock 控制）：
      // 该对的父级统计观测为科室级，target 子单元为病区 → 无匹配观测 → 空投影
      expect(context.mappingEvidences).toEqual([]);
    });
  });

  describe("buildUnitHierarchy", () => {
    it("should correctly build hierarchy from structure relations", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: false });
      const context = builder.build(
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery"
      );

      // Check neurosurgery hierarchy
      const neuroChildren = context.unitHierarchy.get("unit-neurosurgery") || [];
      expect(neuroChildren).toContain("unit-neurosurgery-ward-1");
      expect(neuroChildren).toContain("unit-neurosurgery-ward-2");
      expect(neuroChildren).toContain("unit-intervention-room");

      // Check ward-1 has its own children
      const ward1Children = context.unitHierarchy.get("unit-neurosurgery-ward-1") || [];
      expect(ward1Children).toContain("unit-wang-xx");
      expect(ward1Children).toContain("unit-li-xx");
      expect(ward1Children).toContain("unit-nursing-team");
    });
  });

  describe("buildWorkloadHierarchy", () => {
    it("should build hierarchy from workload_split relations", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: false });
      const context = builder.build(
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery"
      );

      // workload-neurosurgery-outpatient has children via workload_split
      const children = context.workloadHierarchy.get(
        "workload-neurosurgery-outpatient"
      ) || [];
      expect(children).toContain("workload-wang-outpatient");
      expect(children).toContain("workload-li-outpatient");
    });

    it("should handle multiple levels of hierarchy", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: false });
      const context = builder.build(
        "workload-outpatient-visits",
        "unit-neurosurgery"
      );

      // workload-outpatient-visits should have 2 children (neurosurgery and internal)
      const children = context.workloadHierarchy.get("workload-outpatient-visits") || [];
      expect(children).toContain("workload-neurosurgery-outpatient");
      expect(children).toContain("workload-internal-outpatient");
    });
  });

  describe("populateSourceAndMapping", () => {
    it("should create sourceDataObjects for each workload execution", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: true });
      const context = builder.build(
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery-ward-1"
      );

      expect(context.sourceDataObjects).toBeDefined();
      expect(context.sourceDataObjects!.size).toBeGreaterThan(0);

      for (const [, sdo] of context.sourceDataObjects!) {
        expect(sdo).toHaveProperty("id");
        expect(sdo).toHaveProperty("name");
        expect(sdo).toHaveProperty("coveredDimensions");
        expect(sdo).toHaveProperty("updatedAt");
      }
    });

    it("should create mappingEvidences with correct structure", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: true });
      // 出院人次 → 神经外科：真实 mock 链中的部分覆盖场景
      const context = builder.build(
        "workload-discharge-visits",
        "unit-neurosurgery"
      );

      expect(context.mappingEvidences).toBeDefined();
      expect(context.mappingEvidences!.length).toBeGreaterThan(0);

      const evidence = context.mappingEvidences![0];
      expect(evidence).toHaveProperty("sourceDataObjectId");
      expect(evidence).toHaveProperty("targetChildUnitId");
      expect(evidence).toHaveProperty("matchedDimensionValues");
      expect(evidence).toHaveProperty("evidenceDescription");
      expect(evidence.rowCount).toBeUndefined();
      expect(evidence.confidence).toBeUndefined();
    });

    it("should build context even for workloads without dimension evidence", () => {
      const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: true });
      const context = builder.build(
        "workload-outpatient-visits",
        "unit-neurosurgery"
      );

      // workload-outpatient-visits has no dimensions, so splitFeasibility would be
      // insufficient evidence (not business-impossible) once passed to ResolutionService
      expect(context).toBeDefined();
    });
  });

  describe("default instance", () => {
    it("should export a default instance with autoPopulateFromMock=true", () => {
      // Test behavior instead of accessing private config
      const context = defaultMockResolutionContextBuilder.build(
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery-ward-1"
      );
      expect(context.sourceDataObjects).toBeDefined();
    });
  });
});

describe("ResolutionContextBuilder（生产路径）", () => {
  describe("buildFromDataService()", () => {
    it("should build ResolutionContext from DataService data", async () => {
      const builder = new ResolutionContextBuilder();
      const context = await builder.buildFromDataService(
        createStubDataService(),
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery"
      );

      expect(context.workloadCard.id).toBe("workload-neurosurgery-outpatient");
      expect(context.targetUnit.id).toBe("unit-neurosurgery");
    });

    it("should populate existingCards and workloadCards maps", async () => {
      const builder = new ResolutionContextBuilder();
      const context = await builder.buildFromDataService(
        createStubDataService(),
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery"
      );

      expect(context.existingCards).toBeDefined();
      expect(context.existingCards!.get("unit-neurosurgery")!.type).toBe("unit");

      expect(context.workloadCards).toBeDefined();
      const workloadCardEntry = context.workloadCards!.get(
        "workload-neurosurgery-outpatient"
      );
      expect(workloadCardEntry).toBeDefined();
      expect(workloadCardEntry!.workloadResultId).toBe(
        "workload-result-neurosurgery-outpatient"
      );
    });

    it("should derive unitHierarchy and workloadHierarchy from service relations", async () => {
      const builder = new ResolutionContextBuilder();
      const context = await builder.buildFromDataService(
        createStubDataService(),
        "workload-outpatient-visits",
        "unit-neurosurgery"
      );

      expect(context.unitHierarchy.get("unit-neurosurgery")).toContain(
        "unit-neurosurgery-ward-1"
      );
      expect(context.workloadHierarchy.get("workload-outpatient-visits")).toContain(
        "workload-neurosurgery-outpatient"
      );
    });

    it("should build definitionMap and executionMap from service data", async () => {
      const builder = new ResolutionContextBuilder();
      const context = await builder.buildFromDataService(
        createStubDataService(),
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery"
      );

      const definitionIds = new Set(
        mockWorkloadExecutions.map((e) => e.definitionId)
      );
      expect(context.workloadDefinitionMap.size).toBe(definitionIds.size);
      expect(context.workloadDefinitionMap.get("def-outpatient-visits")).toBeDefined();
      expect(context.workloadExecutionMap.size).toBe(mockWorkloadExecutions.length);
    });

    it("should leave sourceDataObjects undefined (Data Object 模型待 Phase 2)，mappingEvidences 为正式投影", async () => {
      const builder = new ResolutionContextBuilder();
      const context = await builder.buildFromDataService(
        createStubDataService(),
        "workload-neurosurgery-outpatient",
        "unit-neurosurgery"
      );

      // sourceDataObjects 仍无正式生产来源（不伪造）
      expect(context.sourceDataObjects).toBeUndefined();
      // mappingEvidences = 父级 ResultSet.items 正式查询投影：
      // 该对父级统计观测为科室级，target 子单元为病区 → 无匹配观测 → 空数组
      expect(context.mappingEvidences).toEqual([]);
    });

    it("should throw if workloadCard or targetUnit not found", async () => {
      const builder = new ResolutionContextBuilder();

      await expect(
        builder.buildFromDataService(
          createStubDataService(),
          "non-existent-workload",
          "unit-neurosurgery"
        )
      ).rejects.toThrow("找不到 Card");

      await expect(
        builder.buildFromDataService(
          createStubDataService(),
          "workload-neurosurgery-outpatient",
          "non-existent-unit"
        )
      ).rejects.toThrow("找不到 Card");
    });

    it("should throw explicit error with definitionId when Definition resolves missing", async () => {
      const builder = new ResolutionContextBuilder();
      const stub = createStubDataService(async (id) =>
        id === "def-outpatient-visits"
          ? undefined
          : mockWorkloadDefinitions.find((d) => d.id === id)
      );

      await expect(
        builder.buildFromDataService(
          stub,
          "workload-neurosurgery-outpatient",
          "unit-neurosurgery"
        )
      ).rejects.toThrow(
        "找不到 WorkloadDefinition: definitionId=def-outpatient-visits"
      );
    });

    it("should propagate error when DataService.getWorkloadDefinition throws", async () => {
      const builder = new ResolutionContextBuilder();
      const stub = createStubDataService(async (id) => {
        throw new Error(`Unknown workload definition: ${id}`);
      });

      await expect(
        builder.buildFromDataService(
          stub,
          "workload-neurosurgery-outpatient",
          "unit-neurosurgery"
        )
      ).rejects.toThrow("Unknown workload definition");
    });
  });
});

describe("workloadAssignments 注入（active workload_assign 查询投影）", () => {
  it("buildFromDataService 应从 active workload_assign 派生反向索引（WorkloadCard → Unit[]）", async () => {
    const builder = new ResolutionContextBuilder();
    const context = await builder.buildFromDataService(
      createStubDataService(),
      "workload-neurosurgery-outpatient",
      "unit-neurosurgery"
    );

    expect(context.workloadAssignments).toBeDefined();
    expect(
      context.workloadAssignments!.get("workload-neurosurgery-outpatient")
    ).toEqual(["unit-neurosurgery"]);
    expect(
      context.workloadAssignments!.get("workload-discharge-visits")
    ).toEqual(["unit-neurosurgery-ward-1"]);
  });

  it("inactive workload_assign 应被排除", async () => {
    const relations = [
      ...mockRelations,
      {
        id: "rel-inactive-assign",
        type: "workload_assign",
        sourceId: "unit-emergency",
        targetId: "workload-neurosurgery-outpatient",
        active: false,
      },
    ];
    const builder = new ResolutionContextBuilder();
    const context = await builder.buildFromDataService(
      createStubDataService(undefined, relations),
      "workload-neurosurgery-outpatient",
      "unit-neurosurgery"
    );

    expect(
      context.workloadAssignments!.get("workload-neurosurgery-outpatient")
    ).toEqual(["unit-neurosurgery"]); // 不含 inactive 的 unit-emergency
  });

  it("无 workload_assign 时应得到空 Map（生产路径仍提供投影）", async () => {
    const relations = mockRelations.filter((r) => r.type !== "workload_assign");
    const builder = new ResolutionContextBuilder();
    const context = await builder.buildFromDataService(
      createStubDataService(undefined, relations),
      "workload-neurosurgery-outpatient",
      "unit-neurosurgery"
    );

    expect(context.workloadAssignments).toBeDefined();
    expect(context.workloadAssignments!.size).toBe(0);
  });

  it("多个 Unit assign 到同一 WorkloadCard 时保留全部 Unit", async () => {
    const relations = [
      ...mockRelations,
      {
        id: "rel-extra-assign",
        type: "workload_assign",
        sourceId: "unit-emergency",
        targetId: "workload-neurosurgery-outpatient",
        active: true,
      },
    ];
    const builder = new ResolutionContextBuilder();
    const context = await builder.buildFromDataService(
      createStubDataService(undefined, relations),
      "workload-neurosurgery-outpatient",
      "unit-neurosurgery"
    );

    expect(
      context.workloadAssignments!.get("workload-neurosurgery-outpatient")
    ).toEqual(["unit-neurosurgery", "unit-emergency"]);
  });

  it("mock 适配层与生产路径派生一致（结构对齐）", () => {
    const builder = new MockResolutionContextBuilder({ autoPopulateFromMock: false });
    const context = builder.build(
      "workload-neurosurgery-outpatient",
      "unit-neurosurgery"
    );

    expect(context.workloadAssignments).toBeDefined();
    expect(
      context.workloadAssignments!.get("workload-neurosurgery-outpatient")
    ).toEqual(["unit-neurosurgery"]);
  });
});

describe("mappingEvidences production 投影（父级 ResultSet.items 查询投影）", () => {
  const DISCHARGE = "workload-discharge-visits";
  const NEURO = "unit-neurosurgery";

  it("父 ResultSet 覆盖全部 3 个 target children → 生成 3 个 evidence（rowCount/confidence 不伪造）", async () => {
    // 构造：扩展出院 ResultSet 使其覆盖 unit-neurosurgery 的全部 3 个子病区
    const fullDischargeResultSet = {
      ...mockDischargeResultSet,
      items: [
        { id: "ri-discharge-neurosurgery", value: 250, dimensions: { wardId: "unit-neurosurgery-ward-1" }, granularity: "aggregate" as const, outputColumnName: "discharges", roleInGraph: "final" as const },
        { id: "ri-test-ward-2", value: 100, dimensions: { wardId: "unit-neurosurgery-ward-2" }, granularity: "aggregate" as const, outputColumnName: "discharges", roleInGraph: "final" as const },
        { id: "ri-test-intervention", value: 60, dimensions: { wardId: "unit-intervention-room" }, granularity: "aggregate" as const, outputColumnName: "discharges", roleInGraph: "final" as const },
      ],
    };
    const resultSets = [
      fullDischargeResultSet,
      ...mockResultSets.filter((rs) => rs.id !== fullDischargeResultSet.id),
    ];
    const builder = new ResolutionContextBuilder();
    const context = await builder.buildFromDataService(
      createStubDataService(undefined, undefined, resultSets),
      DISCHARGE,
      NEURO
    );

    expect(context.mappingEvidences).toHaveLength(3);
    const childIds = context.mappingEvidences!.map((e) => e.targetChildUnitId);
    expect(childIds).toEqual(
      expect.arrayContaining([
        "unit-neurosurgery-ward-1",
        "unit-neurosurgery-ward-2",
        "unit-intervention-room",
      ])
    );
    for (const evidence of context.mappingEvidences!) {
      expect(evidence.sourceDataObjectId).toBe("data-object-discharge");
      expect(evidence.rowCount).toBeUndefined(); // 无正式来源，不伪造
      expect(evidence.confidence).toBeUndefined(); // 无正式判定规则，不伪造
      expect(evidence.evidenceDescription).toContain("父级 ResultSet");
      expect(evidence.evidenceDescription).toContain("实际");
    }
  });

  it("真实 mock 链只有部分 target children 有观测 → 只为存在的 child 生成，非目标 Unit 被排除", async () => {
    const builder = new ResolutionContextBuilder();
    const context = await builder.buildFromDataService(
      createStubDataService(),
      DISCHARGE,
      NEURO
    );

    // 真实 rs-snapshot-discharge-2025 仅含 ward-1 的病区级观测
    expect(context.mappingEvidences).toHaveLength(1);
    expect(context.mappingEvidences![0].targetChildUnitId).toBe(
      "unit-neurosurgery-ward-1"
    );
    // 骨科/急诊病区观测存在于 ResultSet，但非 target 子 Unit → 不生成 evidence
    const ids = context.mappingEvidences!.map((e) => e.targetChildUnitId);
    expect(ids).not.toContain("unit-orthopedics-ward");
    expect(ids).not.toContain("unit-emergency-ward");
  });

  it("父级统计无匹配观测（仅 Unit hierarchy 存在）→ 空投影，不因 hierarchy 生成 evidence", async () => {
    const builder = new ResolutionContextBuilder();
    const context = await builder.buildFromDataService(
      createStubDataService(),
      "workload-neurosurgery-outpatient",
      "unit-neurosurgery-ward-1"
    );

    // 门诊统计观测为科室级，target 子单元为病区级 → 无匹配实际观测
    expect(context.mappingEvidences).toEqual([]);
  });

  it("Snapshot 不可解析时退化使用 ResultSet.sourceDataObjectId", async () => {
    const fallbackResultSet = {
      ...mockDischargeResultSet,
      snapshotId: "snapshot-missing",
      sourceDataObjectId: "data-object-fallback",
    };
    const resultSets = [
      fallbackResultSet,
      ...mockResultSets.filter((rs) => rs.id !== fallbackResultSet.id),
    ];
    const builder = new ResolutionContextBuilder();
    const context = await builder.buildFromDataService(
      createStubDataService(undefined, undefined, resultSets),
      DISCHARGE,
      NEURO
    );

    expect(context.mappingEvidences).toHaveLength(1);
    expect(context.mappingEvidences![0].sourceDataObjectId).toBe(
      "data-object-fallback"
    );
  });

  it("Definition 与 ResultSet 均无 sourceDataObjectId 引用 → 不生成（不伪造必填 ID）", async () => {
    const { sourceDataObjectId: _omitted, ...bareResultSet } = {
      ...mockDischargeResultSet,
      snapshotId: "snapshot-missing",
    };
    const resultSets = [
      bareResultSet,
      ...mockResultSets.filter((rs) => rs.id !== bareResultSet.id),
    ];
    const builder = new ResolutionContextBuilder();
    const context = await builder.buildFromDataService(
      createStubDataService(undefined, undefined, resultSets),
      DISCHARGE,
      NEURO
    );

    expect(context.mappingEvidences).toEqual([]);
  });
});
