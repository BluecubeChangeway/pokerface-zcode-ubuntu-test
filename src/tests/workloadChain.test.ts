import { describe, expect, it } from "vitest";

import { executeSnapshot, formExecutionDataset } from "../domain/workload/graphExecutor";
import { createSnapshot, deriveSnapshot } from "../domain/workload/snapshotService";
import { validateGraph } from "../domain/workload/graphService";
import { mockWorkloadDefinitions } from "../mock/mockWorkloadDefinitions";
import { mockWorkloadExecutions, mockDiseaseCaseRows, mockDiseaseWeightResultSet, mockDiseaseWeightSnapshot } from "../mock/mockWorkloadChain";
import { createWorkloadResult } from "../domain/workload/resultService";
import { mockCalculationGraphs, mockWorkloadResults } from "../mock/mockWorkloadChain";
import type { CalculationGraph, OutputColumnNode, CalculationNode } from "../domain/workload/types";

describe("definition / execution boundary", () => {
  it("keeps definition free of execution period", () => {
    for (const definition of mockWorkloadDefinitions) {
      expect(definition).not.toHaveProperty("period");
    }
  });

  it("allows multiple executions from the same definition with different periods", () => {
    const outpatient = mockWorkloadExecutions.filter(
      (execution) => execution.definitionId === "def-outpatient-visits"
    );

    expect(outpatient).toHaveLength(2);
    expect(outpatient[0].period.mode).toBe("measurement");
    expect(outpatient[1].period.mode).toBe("calculation");
  });

  it("keeps statistical grouping separate from Unit/Workload/Budget hierarchies", () => {
    const rs = mockDiseaseWeightResultSet;

    for (const item of rs.items) {
      for (const key of Object.keys(item.dimensions)) {
        expect(["diseaseGroup", "departmentId"]).toContain(key);
      }
    }
  });
});

describe("calculation graph semantics", () => {
  it("keeps aggregate nodes free of rowContextField (filter owns the currentRow logic)", () => {
    const graph = mockCalculationGraphs.find((entry) => entry.id === "graph-disease-weight")!;
    const aggregates = graph.nodes.filter((entry) => entry.kind === "aggregate");

    expect(aggregates).toHaveLength(2);
    for (const aggregate of aggregates) {
      expect(Object.keys(aggregate)).not.toContain("rowContextField");
    }
  });

  it("supports multiple output columns with final and intermediate roles", () => {
    const graph = mockCalculationGraphs.find((entry) => entry.id === "graph-disease-weight")!;
    const outputs = graph.nodes.filter((entry) => entry.kind === "output_column");

    expect(outputs).toHaveLength(3);
    expect(outputs.filter((o) => o.role === "final")).toHaveLength(1);
    expect(outputs.filter((o) => o.role === "intermediate")).toHaveLength(2);
  });

  it("rejects cyclic graph", () => {
    const cyclic: CalculationGraph = {
      id: "bad-graph",
      nodes: [
        { id: "a", kind: "constant", value: 1, createdAt: new Date().toISOString() } as const,
        { id: "b", kind: "arithmetic", operator: "+", left: "a", right: "c", createdAt: new Date().toISOString() } as const,
        { id: "c", kind: "arithmetic", operator: "+", left: "b", right: "a", createdAt: new Date().toISOString() } as const
      ] as const,
      rootNodeId: "c"
    };

    const errors = validateGraph(cyclic);
    expect(errors.some((item) => item.code === "cycle")).toBe(true);
  });

  it("rejects perDataset output depending on currentRow", () => {
    const graph = mockCalculationGraphs.find((entry) => entry.id === "graph-disease-weight")!;
    const polluted: CalculationGraph = {
      ...graph,
      nodes: [
        ...graph.nodes,
        {
          id: "wrong-output",
          kind: "output_column",
          name: "wrong",
          role: "final",
          distribution: "perDataset",
          source: "weight"
        } as const
      ]
    };

    const errors = validateGraph(polluted);
    expect(errors.some((item) => item.code === "invariant_violation")).toBe(true);
  });

  it("requires aggregate input to be execution_dataset or filter", () => {
    const bad: CalculationGraph = {
      id: "bad-agg",
      nodes: [
        { id: "ds", kind: "execution_dataset", createdAt: new Date().toISOString() } as const,
        { id: "f", kind: "field_ref", field: "x" } as const,
        { id: "agg", kind: "aggregate", aggregate: "avg", input: "f" } as const,
        {
          id: "o",
          kind: "output_column",
          name: "o",
          role: "final",
          distribution: "perDataset",
          source: "agg"
        } as const
      ] as const,
      rootNodeId: "o"
    };

    const errors = validateGraph(bad);
    expect(errors.some((item) => item.code === "aggregate_needs_dataset")).toBe(true);
  });
});

describe("disease weight execution (official business case)", () => {
  const resultSet = executeSnapshot(mockDiseaseWeightSnapshot, mockDiseaseCaseRows);

  it("disease weight = group avg / overall avg", () => {
    const weights = resultSet.items.filter(
      (item) => item.outputColumnName === "diseaseWeight"
    );

    expect(weights).toHaveLength(6);

    const m781 = weights.find((item) => item.dimensions.diseaseGroup === "M78.1")!;
    const a00 = weights.find((item) => item.dimensions.diseaseGroup === "A00.0")!;

    expect(m781.value).toBeCloseTo(2000 / 2150, 6);
    expect(a00.value).toBeCloseTo(2300 / 2150, 6);
  });

  it("includes both intermediate and final results with correct roles", () => {
    const intermediates = resultSet.items.filter((item) => item.roleInGraph === "intermediate");
    expect(intermediates.length).toBeGreaterThan(0);
  });

  it("intermediate results cannot become WorkloadResult", () => {
    const intermediateItem = resultSet.items.find((item) => item.roleInGraph === "intermediate")!;

    expect(() =>
      createWorkloadResult("x", "x", resultSet, intermediateItem.id)
    ).toThrow(/中间结果/);
  });

  it("final aggregate result can become WorkloadResult", () => {
    const finalAggregate = mockDiseaseWeightResultSet.items.find(
      (item) => item.granularity === "aggregate" && item.roleInGraph === "final"
    )!;

    const result = createWorkloadResult(
      "workload-result-test",
      "orthopedics disease weight total",
      mockDiseaseWeightResultSet,
      finalAggregate.id
    );

    expect(result.id).toBe("workload-result-test");
    expect(result.value).toBe(finalAggregate.value);
    expect(result.dimensions.departmentId).toBe("unit-orthopedics");
  });

  it("empty dataset yields missing ResultSet without faking zeros", () => {
    const result = executeSnapshot(mockDiseaseWeightSnapshot, []);
    expect(result.status).toBe("missing");
    expect(result.items).toHaveLength(0);
    expect(result.warnings?.[0]).toContain("缺失 ≠ 0");
  });

  it("division by zero yields null with warning", () => {
    const graph: CalculationGraph = {
      id: "div-zero-test",
      nodes: [
        { id: "zero", kind: "constant", value: 0, createdAt: new Date().toISOString() } as const,
        { id: "one", kind: "constant", value: 1, createdAt: new Date().toISOString() } as const,
        {
          id: "divide",
          kind: "arithmetic",
          operator: "/",
          left: "one",
          right: "zero"
        } as const,
        {
          id: "out",
          kind: "output_column",
          name: "result",
          role: "final",
          distribution: "perDataset",
          source: "divide"
        } as const
      ] as const,
      rootNodeId: "out"
    };

    const snapshot = createSnapshot(
      "snapshot-div-zero",
      mockWorkloadDefinitions.find((item) => item.id === "def-disease-weight")!,
      { ...mockWorkloadExecutions[2], conditions: [] },
      graph,
      {
        businessFields: ["totalCost"],
        outputColumns: ["result"],
        resultDimensions: []
      }
    );

    const result = executeSnapshot(snapshot, mockDiseaseCaseRows);
    const item = result.items.find((entry) => entry.outputColumnName === "result")!;
    expect(item.value).toBeNull();
    expect(result.warnings?.some((msg) => msg.includes("除数为 0") || msg.includes("division by zero"))).toBe(true);
  });

  it("count(empty) = 0; sum/avg/min/max(empty) = null with warning", () => {
    const graph: CalculationGraph = {
      id: "empty-agg-test",
      nodes: [
        { id: "ds", kind: "execution_dataset", createdAt: new Date().toISOString() } as const,
        {
          id: "empty-src",
          kind: "filter",
          input: "ds",
          condition: {
            left: { id: "l", kind: "field_ref", field: "diseaseGroup" } as const,
            operator: "=",
            right: { id: "r", kind: "constant", value: "non-existent", createdAt: new Date().toISOString() } as const
          }
        } as const,
        { id: "count-empty", kind: "aggregate", aggregate: "count", input: "empty-src" } as const,
        { id: "avg-empty", kind: "aggregate", aggregate: "avg", field: "totalCost", input: "empty-src" } as const,
        { id: "sum-empty", kind: "aggregate", aggregate: "sum", field: "totalCost", input: "empty-src" } as const,
        { id: "min-empty", kind: "aggregate", aggregate: "min", field: "totalCost", input: "empty-src" } as const,
        { id: "max-empty", kind: "aggregate", aggregate: "max", field: "totalCost", input: "empty-src" } as const,
        { id: "out-count", kind: "output_column", name: "count", role: "final", distribution: "perDataset", source: "count-empty" } as const,
        { id: "out-avg", kind: "output_column", name: "avg", role: "final", distribution: "perDataset", source: "avg-empty" } as const,
        { id: "out-sum", kind: "output_column", name: "sum", role: "final", distribution: "perDataset", source: "sum-empty" } as const,
        { id: "out-min", kind: "output_column", name: "min", role: "final", distribution: "perDataset", source: "min-empty" } as const,
        { id: "out-max", kind: "output_column", name: "max", role: "final", distribution: "perDataset", source: "max-empty" } as const
      ] as const,
      rootNodeId: "out-count"
    };

    const snapshot = createSnapshot(
      "snapshot-empty-sums",
      mockWorkloadDefinitions.find((item) => item.id === "def-disease-weight")!,
      mockWorkloadExecutions[2],
      graph,
      { businessFields: ["totalCost"], outputColumns: ["count", "avg", "sum", "min", "max"], resultDimensions: [] }
    );

    const result = executeSnapshot(snapshot, mockDiseaseCaseRows);

    const countItem = result.items.find((entry) => entry.outputColumnName === "count")!;
    const avgItem = result.items.find((entry) => entry.outputColumnName === "avg")!;
    const sumItem = result.items.find((entry) => entry.outputColumnName === "sum")!;
    const minItem = result.items.find((entry) => entry.outputColumnName === "min")!;
    const maxItem = result.items.find((entry) => entry.outputColumnName === "max")!;

    expect(countItem.value).toBe(0);
    expect(avgItem.value).toBeNull();
    expect(sumItem.value).toBeNull();
    expect(minItem.value).toBeNull();
    expect(maxItem.value).toBeNull();
    expect(result.warnings?.some((msg) => msg.includes("空数据集"))).toBe(true);
  });
});

describe("execution dataset condition merging", () => {
  it("Definition fixed conditions AND Execution conditions = final dataset", () => {
    const definition = mockWorkloadDefinitions.find((item) => item.id === "def-disease-weight")!;
    const unrestricted = formExecutionDataset(mockDiseaseCaseRows, definition.conditions, []);

    expect(unrestricted).toHaveLength(6);

    const restrictedExecution = {
      ...mockWorkloadExecutions.find((item) => item.id === "exec-disease-weight-2025")!,
      conditions: [{ field: "diseaseGroup", operator: "=", value: "A00.0" } as const]
    };

    const restricted = formExecutionDataset(
      mockDiseaseCaseRows,
      definition.conditions,
      restrictedExecution.conditions
    );

    expect(restricted).toHaveLength(3);
    expect(restricted.every((row) => row.diseaseGroup === "A00.0")).toBe(true);
  });

  it("Snapshot freezes conditions; mutating original Definition does not affect snapshot execution", () => {
    const definition = mockWorkloadDefinitions.find((item) => item.id === "def-disease-weight")!;
    const execution = mockWorkloadExecutions.find((item) => item.id === "exec-disease-weight-2025")!;
    const graph = mockCalculationGraphs.find((item) => item.id === "graph-disease-weight")!;

    const snapshot = createSnapshot(
      "snapshot-frozen-conditions",
      definition,
      execution,
      graph,
      {
        businessFields: ["totalCost", "diseaseGroup"],
        outputColumns: ["diseaseWeight"],
        resultDimensions: ["diseaseGroup"]
      }
    );

    const before = executeSnapshot(snapshot, mockDiseaseCaseRows);

    definition.conditions.push({ field: "diseaseGroup", operator: "=", value: "A00.0" });

    const after = executeSnapshot(snapshot, mockDiseaseCaseRows);

    expect(snapshot.definition.conditions).toHaveLength(0);
    expect(after.items.length).toBe(before.items.length);

    definition.conditions.pop();
  });

  it("Graph computes on filtered Execution Dataset, not raw input", () => {
    const definition = mockWorkloadDefinitions.find((item) => item.id === "def-disease-weight")!;
    const execution = mockWorkloadExecutions.find((item) => item.id === "exec-disease-weight-2025")!;
    const graph = mockCalculationGraphs.find((item) => item.id === "graph-disease-weight")!;

    const snapshot = createSnapshot("snapshot-filtered-exec", definition, execution, graph, {
      businessFields: ["totalCost", "diseaseGroup"],
      outputColumns: ["diseaseWeight"],
      resultDimensions: ["diseaseGroup"]
    });

    const targetOnly = mockDiseaseCaseRows.filter((row) => row.diseaseGroup === "M78.1");

    const result = executeSnapshot(snapshot, targetOnly);
    const weightItems = result.items.filter((item) => item.outputColumnName === "diseaseWeight");

    expect(weightItems.every((item) => item.dimensions.diseaseGroup === "M78.1")).toBe(true);
    expect(
      weightItems.some((item) => item.dimensions.diseaseGroup === "A00.0")
    ).toBe(false);
  });
});

describe("perGroup / missing aggregates", () => {
  it("SUM/MIN/MAX on empty dataset return null with warning; COUNT = 0", () => {
    const graph: CalculationGraph = {
      id: "empty-sums",
      nodes: [
        { id: "ds", kind: "execution_dataset", createdAt: new Date().toISOString() } as const,
        {
          id: "empty-src",
          kind: "filter",
          input: "ds",
          condition: {
            left: { id: "l", kind: "field_ref", field: "diseaseGroup" } as const,
            operator: "=",
            right: { id: "r", kind: "constant", value: "non-existent", createdAt: new Date().toISOString() } as const
          }
        } as const,
        { id: "sum-empty", kind: "aggregate", aggregate: "sum", field: "totalCost", input: "empty-src" } as const,
        { id: "min-empty", kind: "aggregate", aggregate: "min", field: "totalCost", input: "empty-src" } as const,
        { id: "max-empty", kind: "aggregate", aggregate: "max", field: "totalCost", input: "empty-src" } as const,
        { id: "out-sum", kind: "output_column", name: "sum", role: "final", distribution: "perDataset", source: "sum-empty" } as const,
        { id: "out-min", kind: "output_column", name: "min", role: "final", distribution: "perDataset", source: "min-empty" } as const,
        { id: "out-max", kind: "output_column", name: "max", role: "final", distribution: "perDataset", source: "max-empty" } as const
      ] as const,
      rootNodeId: "out-sum"
    };

    const snapshot = createSnapshot(
      "snapshot-empty-sums",
      mockWorkloadDefinitions.find((item) => item.id === "def-disease-weight")!,
      mockWorkloadExecutions[2],
      graph,
      { businessFields: ["totalCost"], outputColumns: ["sum", "min", "max"], resultDimensions: [] }
    );

    const result = executeSnapshot(snapshot, mockDiseaseCaseRows);

    for (const name of ["sum", "min", "max"]) {
      const item = result.items.find((entry) => entry.outputColumnName === name)!;
      expect(item.value).toBeNull();
    }

    expect(
      result.warnings?.some((message) => message.includes("空数据集"))
    ).toBe(true);
  });

  it("perGroup output does not silently drop: explicit warning, no phantom items", () => {
    const graph: CalculationGraph = {
      id: "with-pergroup",
      nodes: [
        { id: "ds", kind: "execution_dataset", createdAt: new Date().toISOString() } as const,
        { id: "grp", kind: "aggregate", aggregate: "sum", field: "totalCost", input: "ds" } as const,
        { id: "pg-out", kind: "output_column", name: "deptTotal", role: "final", distribution: "perGroup", source: "grp" } as const
      ] as const,
      rootNodeId: "pg-out"
    };

    const validationErrors = validateGraph(graph);
    expect(validationErrors.filter((e) => e.code === "invariant_violation")).toHaveLength(1);

    const snapshot = createSnapshot(
      "snapshot-pergroup",
      mockWorkloadDefinitions.find((item) => item.id === "def-disease-weight")!,
      mockWorkloadExecutions[2],
      graph,
      { businessFields: ["totalCost"], outputColumns: ["deptTotal"], resultDimensions: [] }
    );

    const result = executeSnapshot(snapshot, mockDiseaseCaseRows);
    expect(result.items.every((item) => item.outputColumnName !== "deptTotal")).toBe(true);
    expect(
      result.warnings?.some((message) => message.includes("perGroup"))
    ).toBe(true);
  });
});

describe("snapshot immutability", () => {
  it("snapshot captures a full frozen footprint; later changes to original Graph do not affect it", () => {
    const definition = mockWorkloadDefinitions.find((item) => item.id === "def-disease-weight")!;
    const execution = mockWorkloadExecutions.find((item) => item.id === "exec-disease-weight-2025")!;
    const graph = mockCalculationGraphs.find((item) => item.id === "graph-disease-weight")!;

    const clonedGraph = JSON.parse(JSON.stringify(graph)) as typeof graph;
    const originalCostFieldCount = graph.nodes.filter((n) => n.id === "cost-field").length;

    const snapshot = createSnapshot("snapshot-toggle", definition, execution, clonedGraph, {
      businessFields: ["totalCost", "diseaseGroup"],
      outputColumns: ["diseaseWeight"],
      resultDimensions: ["diseaseGroup"]
    });

    clonedGraph.nodes = clonedGraph.nodes.filter((n) => n.id !== "cost-field");

    expect(graph.nodes.filter((n) => n.id === "cost-field")).toHaveLength(originalCostFieldCount);
    expect(snapshot.graph.nodes.find((n) => n.id === "cost-field")).toBeDefined();
  });

  it("deriveSnapshot creates a new snapshot without mutating the source", () => {
    const source = mockDiseaseWeightSnapshot;
    const derived = deriveSnapshot(source, { id: "snapshot-b", note: "adjustment note" });

    expect(derived.id).toBe("snapshot-b");
    expect(derived.note).toBe("adjustment note");
    expect(derived.derivedFromSnapshotId).toBe(source.id);
    expect(source.note).toBe("2025 全院病种权重基线");
    expect(source.id).toBe("snapshot-disease-weight-2025");
  });
});

describe("mock data consistency", () => {
  it("mockWorkloadResults reference mock ResultSet items", () => {
    const result = mockWorkloadResults[0];
    expect(result.resultSetId).toBe(mockDiseaseWeightResultSet.id);
    expect(mockDiseaseWeightResultSet.items.find((i) => i.id === result.resultItemId)).toBeDefined();
  });
});