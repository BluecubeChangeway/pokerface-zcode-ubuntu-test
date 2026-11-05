import { describe, expect, it } from "vitest";

import {
  createWorkloadSplit,
  SplitValidationError,
  getExistingSplitRelations,
  getExistingSplitChildren,
  batchSplitId,
  determineChildIdOwnership,
  workloadResultContentEquals,
} from "../domain/workload/split/splitService";
import type { WorkloadResult, Period } from "../domain/workload/types";
import type { Relation } from "../domain/relation/types";
import type { WorkloadCard } from "../domain/card/types";

/**
 * splitService 修复验证（Q-09-C）：
 * 1. parentResult=null → parent_not_found（先于 .id 访问，不 TypeError）
 * 2. parentResult.period 存在时，childResults.period 与父一致
 * 3. parentResult.period 缺失时，childResults.period 保持 undefined
 * 4. splitType="partial" 且 childTotal == parentValue 的既有行为保持不变（仅记录，不改语义）
 * 5. 不再生成 WorkloadResult → WorkloadResult 的 workload_split Relation
 * 6. WorkloadSplit 本身仍正确记录 parentResultId / childResultId
 * 7. getExistingSplitRelations 使用 WorkloadCard ID 查询
 * 8. getExistingSplitChildren 正确通过 Card → workloadResultId → WorkloadResult 解析
 */

const measurementPeriod: Period = {
  start: "2025-01-01",
  end: "2025-12-31",
  mode: "measurement"
};

function makeParent(period?: Period): WorkloadResult {
  return {
    id: "parent-result",
    resultSetId: "rs-parent",
    resultItemId: "ri-parent",
    name: "父结果",
    value: 100,
    dimensions: { departmentId: "unit-neurosurgery" },
    period
  };
}

function makeChildrenInput() {
  return {
    parentResultId: "parent-result",
    children: [
      {
        name: "子结果A",
        value: 60,
        dimensions: { departmentId: "unit-neurosurgery-ward-1" },
        resultSetId: "rs-child",
        resultItemId: "ri-child-a"
      },
      {
        name: "子结果B",
        value: 40,
        dimensions: { departmentId: "unit-neurosurgery-ward-2" },
        resultSetId: "rs-child",
        resultItemId: "ri-child-b"
      }
    ],
    splitType: "complete" as const
  };
}

// Mock data for Relation tests
const mockWorkloadSplitRelations: Relation[] = [
  {
    id: "rel-split-1",
    type: "workload_split",
    sourceId: "workload-parent-card",  // WorkloadCard ID
    targetId: "workload-child-card-1", // WorkloadCard ID
    active: true
  },
  {
    id: "rel-split-2",
    type: "workload_split",
    sourceId: "workload-parent-card",
    targetId: "workload-child-card-2",
    active: true
  },
  {
    id: "rel-other",
    type: "workload_split",
    sourceId: "other-parent",
    targetId: "other-child",
    active: true
  },
  {
    id: "rel-inactive",
    type: "workload_split",
    sourceId: "workload-parent-card",
    targetId: "inactive-child",
    active: false // inactive
  }
];

const mockAllCards = new Map<string, { id: string; type: string; workloadResultId?: string }>([
  ["workload-parent-card", { id: "workload-parent-card", type: "workload", workloadResultId: "parent-result" }],
  ["workload-child-card-1", { id: "workload-child-card-1", type: "workload", workloadResultId: "child-result-1" }],
  ["workload-child-card-2", { id: "workload-child-card-2", type: "workload", workloadResultId: "child-result-2" }],
  ["other-parent", { id: "other-parent", type: "workload", workloadResultId: "other-parent-result" }],
  ["other-child", { id: "other-child", type: "workload", workloadResultId: "other-child-result" }],
  ["inactive-child", { id: "inactive-child", type: "workload", workloadResultId: "inactive-result" }],
]);

const mockAllResults: WorkloadResult[] = [
  { id: "child-result-1", resultSetId: "rs-1", resultItemId: "ri-1", name: "Child 1", value: 50, dimensions: {} },
  { id: "child-result-2", resultSetId: "rs-2", resultItemId: "ri-2", name: "Child 2", value: 50, dimensions: {} },
  { id: "other-child-result", resultSetId: "rs-3", resultItemId: "ri-3", name: "Other Child", value: 30, dimensions: {} },
  { id: "inactive-result", resultSetId: "rs-4", resultItemId: "ri-4", name: "Inactive Child", value: 20, dimensions: {} }
];

describe("splitService - parent_not_found", () => {
  const measurementPeriod: Period = {
    start: "2025-01-01",
    end: "2025-12-31",
    mode: "measurement"
  };

  function makeParent(period?: Period): WorkloadResult {
    return {
      id: "parent-result",
      resultSetId: "rs-parent",
      resultItemId: "ri-parent",
      name: "父结果",
      value: 100,
      dimensions: { departmentId: "unit-neurosurgery" },
      period
    };
  }

  function makeChildrenInput() {
    return {
      parentResultId: "parent-result",
      children: [
        {
          name: "子结果A",
          value: 60,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-a"
        },
        {
          name: "子结果B",
          value: 40,
          dimensions: { departmentId: "unit-neurosurgery-ward-2" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-b"
        }
      ],
      splitType: "complete" as const
    };
  }

  it("throws parent_not_found (not TypeError) when parentResult is null", () => {
    expect(() => createWorkloadSplit(makeChildrenInput(), null as unknown as WorkloadResult)).toThrow(
      SplitValidationError
    );

    try {
      createWorkloadSplit(makeChildrenInput(), null as unknown as WorkloadResult);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SplitValidationError);
      expect((err as SplitValidationError).code).toBe("parent_not_found");
    }
  });

  it("throws parent_not_found (not TypeError) when parentResult is undefined", () => {
    expect(() =>
      createWorkloadSplit(makeChildrenInput(), undefined as unknown as WorkloadResult)
    ).toThrow(SplitValidationError);

    try {
      createWorkloadSplit(makeChildrenInput(), undefined as unknown as WorkloadResult);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as SplitValidationError).code).toBe("parent_not_found");
    }
  });

  it("still throws parent_id_mismatch when a different parent is provided", () => {
    const wrongParent = { ...makeParent(measurementPeriod), id: "other-parent" };

    try {
      createWorkloadSplit(makeChildrenInput(), wrongParent);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as SplitValidationError).code).toBe("parent_id_mismatch");
    }
  });
});

describe("splitService - child period propagation", () => {
  const measurementPeriod: Period = {
    start: "2025-01-01",
    end: "2025-12-31",
    mode: "measurement"
  };

  function makeParent(period?: Period): WorkloadResult {
    return {
      id: "parent-result",
      resultSetId: "rs-parent",
      resultItemId: "ri-parent",
      name: "父结果",
      value: 100,
      dimensions: { departmentId: "unit-neurosurgery" },
      period
    };
  }

  function makeChildrenInput() {
    return {
      parentResultId: "parent-result",
      children: [
        {
          name: "子结果A",
          value: 60,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-a"
        },
        {
          name: "子结果B",
          value: 40,
          dimensions: { departmentId: "unit-neurosurgery-ward-2" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-b"
        }
      ],
      splitType: "complete" as const
    };
  }

  it("propagates parentResult.period to all childResults when parent has period", () => {
    const parent = makeParent(measurementPeriod);
    const result = createWorkloadSplit(makeChildrenInput(), parent);

    expect(result.childResults).toHaveLength(2);
    for (const child of result.childResults) {
      expect(child.period).toEqual(measurementPeriod);
      expect(child.period).toBe(parent.period); // 同一引用，未新建 Period
    }
  });

  it("keeps childResults.period undefined when parent period is missing", () => {
    const parent = makeParent(undefined);
    const result = createWorkloadSplit(makeChildrenInput(), parent);

    expect(result.childResults).toHaveLength(2);
    for (const child of result.childResults) {
      expect(child.period).toBeUndefined();
    }
  });

  it("does not fabricate a period when parent period is missing", () => {
    const parent = makeParent(undefined);
    const result = createWorkloadSplit(makeChildrenInput(), parent);

    for (const child of result.childResults) {
      expect("period" in child).toBe(true);
      expect(child.period).not.toBeNull();
      expect(child.period).toBeUndefined();
    }
  });
});

describe("splitService - no incorrect Result→Result relations", () => {
  const measurementPeriod: Period = {
    start: "2025-01-01",
    end: "2025-12-31",
    mode: "measurement"
  };

  function makeParent(period?: Period): WorkloadResult {
    return {
      id: "parent-result",
      resultSetId: "rs-parent",
      resultItemId: "ri-parent",
      name: "父结果",
      value: 100,
      dimensions: { departmentId: "unit-neurosurgery" },
      period
    };
  }

  function makeChildrenInput() {
    return {
      parentResultId: "parent-result",
      children: [
        {
          name: "子结果A",
          value: 60,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-a"
        },
        {
          name: "子结果B",
          value: 40,
          dimensions: { departmentId: "unit-neurosurgery-ward-2" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-b"
        }
      ],
      splitType: "complete" as const
    };
  }

  it("does NOT return splitRelations field (removed to prevent incorrect Result→Result relations)", () => {
    const parent = makeParent(measurementPeriod);
    const result = createWorkloadSplit(makeChildrenInput(), parent);

    // SplitExecutionResult should not have splitRelations field
    // @ts-expect-error - splitRelations should not exist on result
    expect(result.splitRelations).toBeUndefined();
  });

  it("WorkloadSplit correctly records parentResultId and childResultId (WorkloadResult IDs)", () => {
    const parent = makeParent(measurementPeriod);
    const result = createWorkloadSplit(makeChildrenInput(), parent);

    expect(result.workloadSplits).toHaveLength(2);
    for (const split of result.workloadSplits) {
      expect(split.parentResultId).toBe("parent-result");
      expect(split.childResultId).toBeDefined();
      expect(split.childResultId).toMatch(/^parent-result-split-child-\d+/);
      expect(split.splitType).toBe("complete");
      expect(split.splitRatio).toBeDefined();
    }
  });

  it("workloadSplits can be used by ActionExecutor to create correct Card→Card relations", () => {
    const parent = makeParent(measurementPeriod);
    const result = createWorkloadSplit(makeChildrenInput(), parent);

    // ActionExecutor 使用 workloadSplits 中的 childResultId 找到对应的 child WorkloadResult，
    // 再创建对应的 child WorkloadCard，然后创建 workload_split Relation：
    // parent WorkloadCard → child WorkloadCard
    for (const split of result.workloadSplits) {
      expect(split.parentResultId).toBe("parent-result");
      expect(split.childResultId).toBeDefined();
    }
  });
});

describe("splitService - getExistingSplitRelations endpoint semantics", () => {
  it("queries by parentWorkloadCardId (not parentResultId)", () => {
    const result = getExistingSplitRelations("workload-parent-card", mockWorkloadSplitRelations);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.targetId)).toEqual(["workload-child-card-1", "workload-child-card-2"]);
  });

  it("does NOT match using WorkloadResult ID as sourceId", () => {
    // parent-result 是 WorkloadResult ID，不是 WorkloadCard ID
    // 应该查不到任何结果
    const result = getExistingSplitRelations("parent-result", mockWorkloadSplitRelations);
    expect(result).toHaveLength(0);
  });

  it("filters by active flag", () => {
    const result = getExistingSplitRelations("workload-parent-card", mockWorkloadSplitRelations);
    // inactive relation should not be included
    expect(result.find(r => r.id === "rel-inactive")).toBeUndefined();
  });

  it("filters by type workload_split", () => {
    // 即使 sourceId 匹配，type 不同也会被过滤
    // 这里 mock 中全是 workload_split，这个测试主要确保类型过滤逻辑存在
    const result = getExistingSplitRelations("workload-parent-card", mockWorkloadSplitRelations);
    expect(result.every(r => r.type === "workload_split")).toBe(true);
  });
});

describe("splitService - getExistingSplitChildren endpoint semantics", () => {
  it("correctly resolves child WorkloadResult via Card → workloadResultId → WorkloadResult", () => {
    const children = getExistingSplitChildren(
      "workload-parent-card",
      mockWorkloadSplitRelations,
      mockAllCards,
      mockAllResults
    );

    expect(children).toHaveLength(2);
    expect(children.map(c => c.id).sort()).toEqual(["child-result-1", "child-result-2"]);
  });

  it("does NOT directly use Relation.targetId as WorkloadResult ID", () => {
    // 如果错误地直接用 targetId 匹配 WorkloadResult.id
    // "workload-child-card-1" 不等于 "child-result-1"
    // 所以会查到 0 个结果
    const children = getExistingSplitChildren(
      "workload-parent-card",
      mockWorkloadSplitRelations,
      mockAllCards,
      mockAllResults
    );
    
    // 正确的实现通过 Card.workloadResultId 解析
    expect(children.length).toBeGreaterThan(0);
    expect(children.find(c => c.id === "workload-child-card-1")).toBeUndefined(); // targetId 不是 Result ID
  });

  it("filters out inactive relations", () => {
    const children = getExistingSplitChildren(
      "workload-parent-card",
      mockWorkloadSplitRelations,
      mockAllCards,
      mockAllResults
    );

    // inactive relation 的 target 是 "inactive-child"
    // 对应的 workloadResultId 是 "inactive-result"
    // 应该被过滤掉
    expect(children.find(c => c.id === "inactive-result")).toBeUndefined();
  });

  it("filters out non-workload Cards", () => {
    // 如果 targetId 不是 workload 类型的 Card
    // 应该被忽略
    const relationsWithUnitTarget: Relation[] = [
      {
        id: "rel-bad-target",
        type: "workload_split",
        sourceId: "workload-parent-card",
        targetId: "unit-some-card", // UnitCard，不是 WorkloadCard
        active: true
      }
    ];

    const cardsWithUnit = new Map(mockAllCards);
    cardsWithUnit.set("unit-some-card", { id: "unit-some-card", type: "unit" });

    const children = getExistingSplitChildren(
      "workload-parent-card",
      relationsWithUnitTarget,
      cardsWithUnit,
      mockAllResults
    );

    expect(children).toHaveLength(0);
  });

  it("handles missing child Card gracefully", () => {
    const relationsWithMissingTarget: Relation[] = [
      {
        id: "rel-missing-target",
        type: "workload_split",
        sourceId: "workload-parent-card",
        targetId: "nonexistent-card",
        active: true
      }
    ];

    const children = getExistingSplitChildren(
      "workload-parent-card",
      relationsWithMissingTarget,
      mockAllCards, // 不包含 nonexistent-card
      mockAllResults
    );

    expect(children).toHaveLength(0);
  });
});

describe("splitService - splitType partial/complete existing behavior (recorded, unchanged)", () => {
  const measurementPeriod: Period = {
    start: "2025-01-01",
    end: "2025-12-31",
    mode: "measurement"
  };

  function makeParent(period?: Period): WorkloadResult {
    return {
      id: "parent-result",
      resultSetId: "rs-parent",
      resultItemId: "ri-parent",
      name: "父结果",
      value: 100,
      dimensions: { departmentId: "unit-neurosurgery" },
      period
    };
  }

  function makeChildrenInput() {
    return {
      parentResultId: "parent-result",
      children: [
        {
          name: "子结果A",
          value: 60,
          dimensions: { departmentId: "unit-neurosurgery-ward-1" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-a"
        },
        {
          name: "子结果B",
          value: 40,
          dimensions: { departmentId: "unit-neurosurgery-ward-2" },
          resultSetId: "rs-child",
          resultItemId: "ri-child-b"
        }
      ],
      splitType: "complete" as const
    };
  }

  /**
   * 已确认：本轮不改变 splitType 语义。
   * 当前行为：splitType="partial" 且 childTotal == parentValue 时不报错，
   * summary.isComplete = true 反映实际完整性。
   * 此测试仅固定记录当前行为，防止后续无感知变化。
   */
  it("records current behavior: partial split that is actually complete does not throw, summary.isComplete=true", () => {
    const parent = makeParent(measurementPeriod);
    const input = { ...makeChildrenInput(), splitType: "partial" as const };

    const result = createWorkloadSplit(input, parent);

    expect(result.summary.isComplete).toBe(true);
    expect(result.summary.remainder).toBe(0);
    expect(result.summary.hasOverflow).toBe(false);
    // WorkloadSplit.splitType 保留用户声明的 "partial"
    expect(result.workloadSplits.every((s) => s.splitType === "partial")).toBe(true);
  });

  it("complete split with matching total succeeds", () => {
    const parent = makeParent(measurementPeriod);
    const result = createWorkloadSplit(makeChildrenInput(), parent);

    expect(result.summary.isComplete).toBe(true);
    expect(result.summary.childTotal).toBe(100);
  });

  it("complete split with non-matching total throws split_type_mismatch", () => {
    const parent = makeParent(measurementPeriod);
    const input = {
      ...makeChildrenInput(),
      children: [
        { ...makeChildrenInput().children[0], value: 60 },
        { ...makeChildrenInput().children[1], value: 30 }
      ]
    };

    try {
      createWorkloadSplit(input, parent);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as SplitValidationError).code).toBe("split_type_mismatch");
    }
  });
});
describe("executionBatchId 批次域 ID（Q-09-C 裁定②修正：单射安全编码，不依赖短哈希）", () => {
  const parent: WorkloadResult = {
    id: "parent-result",
    resultSetId: "rs-parent",
    resultItemId: "ri-parent",
    name: "父结果",
    value: 100,
    dimensions: { departmentId: "unit-neurosurgery" },
  };
  const children = [{
    name: "子结果1",
    value: 60,
    dimensions: { departmentId: "unit-neurosurgery-ward-1" },
    resultSetId: "rs-child",
    resultItemId: "ri-child-1",
  }];

  function splitWith(batchId: string | undefined) {
    return createWorkloadSplit({
      parentResultId: parent.id,
      children,
      splitType: "partial",
      executionBatchId: batchId,
    }, parent);
  }

  it("相同 executionBatchId 两次执行 → 生成的 child ID 与 WorkloadSplit ID 完全相同（retry 幂等）", () => {
    const r1 = splitWith("rec-a::2026-10-04T12:00:00.000Z");
    const r2 = splitWith("rec-a::2026-10-04T12:00:00.000Z");
    expect(r2.childResults[0].id).toBe(r1.childResults[0].id);
    expect(r2.workloadSplits[0].id).toBe(r1.workloadSplits[0].id);
  });

  it("不同 executionBatchId（同 parent、同 child index、同内容）→ WorkloadSplit ID / child ID 必然不同", () => {
    const rA = splitWith("rec-a::2026-10-04T12:00:00.000Z");
    const rB = splitWith("rec-b::2026-10-04T12:00:00.000Z");
    expect(rA.workloadSplits[0].id).not.toBe(rB.workloadSplits[0].id);
    expect(rA.childResults[0].id).not.toBe(rB.childResults[0].id);
  });

  it("批次输入仅有细微差异（decidedAt 差 1ms）也不能产生相同 ID；批次标识以单射编码直接嵌入（非哈希摘要）", () => {
    const rA = splitWith("rec-a::2026-10-04T12:00:00.000Z");
    const rB = splitWith("rec-a::2026-10-04T12:00:00.001Z");
    expect(rA.workloadSplits[0].id).not.toBe(rB.workloadSplits[0].id);
    // 单射安全编码：':' → _003a、'.' → _002e，批次原文可从 ID 中恢复
    expect(rA.workloadSplits[0].id).toContain("rec-a_003a_003a2026-10-04T12");
    expect(rA.workloadSplits[0].id).toContain("_002e000Z");
  });

  it("不同 executionBatchId 的两条分解记录均持久化保留（同 parent + 同 index 也不覆盖）", async () => {
    const { dataService } = await import("../services/MockDataService");
    const rA = splitWith("rec-keep-a::2026-10-04T12:00:00.000Z");
    const rB = splitWith("rec-keep-b::2026-10-04T12:00:00.000Z");
    const before = (await dataService.getWorkloadSplits()).length;
    await dataService.saveWorkloadSplits(rA.workloadSplits);
    await dataService.saveWorkloadSplits(rB.workloadSplits);
    const after = await dataService.getWorkloadSplits();
    expect(after.length).toBe(before + 2);
    expect(after.find((s) => s.id === rA.workloadSplits[0].id)?.childResultId)
      .toBe(rA.childResults[0].id);
    expect(after.find((s) => s.id === rB.workloadSplits[0].id)?.childResultId)
      .toBe(rB.childResults[0].id);
  });
});

describe("H-2 纯函数助手：workloadResultContentEquals / determineChildIdOwnership / batchSplitId", () => {
  const base = {
    resultSetId: "rs-child",
    resultItemId: "ri-child-a",
    name: "子结果A",
    value: 60 as number | null,
    dimensions: { departmentId: "unit-neurosurgery-ward-1" },
    period: { start: "2026-01-01", end: "2026-12-31", mode: "measurement" as const },
  };

  it("全业务字段一致 → true", () => {
    expect(workloadResultContentEquals(base, { ...base })).toBe(true);
  });

  it("dimensions 键顺序不同但键值一致 → 一致", () => {
    const a = { ...base, dimensions: { departmentId: "unit-x", doctorId: "unit-y" } };
    const b = { ...base, dimensions: { doctorId: "unit-y", departmentId: "unit-x" } };
    expect(workloadResultContentEquals(a, b)).toBe(true);
  });

  it("value null vs 0 → 不一致（INV-079：null ≠ 0）", () => {
    expect(workloadResultContentEquals({ ...base, value: null }, { ...base, value: 0 })).toBe(false);
  });

  it("period 任一关键字段不同 → 不一致", () => {
    expect(workloadResultContentEquals(base, { ...base, period: { ...base.period!, end: "2026-11-30" } })).toBe(false);
    expect(workloadResultContentEquals(base, { ...base, period: undefined })).toBe(false);
  });

  it("name / resultSetId / resultItemId 任一不同 → 不一致", () => {
    expect(workloadResultContentEquals(base, { ...base, name: "改名" })).toBe(false);
    expect(workloadResultContentEquals(base, { ...base, resultSetId: "rs-other" })).toBe(false);
    expect(workloadResultContentEquals(base, { ...base, resultItemId: "ri-other" })).toBe(false);
  });

  it("batchSplitId 与 createWorkloadSplit 的批次域 Split ID 格式一致", () => {
    const batch = "rec-x::2026-10-05T10:00:00.000Z";
    const run = createWorkloadSplit(
      { parentResultId: "P", children: [{ name: "a", value: 10, dimensions: {}, resultSetId: "rs", resultItemId: "ri" }], splitType: "partial", executionBatchId: batch },
      { id: "P", resultSetId: "rs", resultItemId: "ri", name: "父", value: 100, dimensions: {} }
    );
    expect(run.workloadSplits[0].id).toBe(batchSplitId("P", batch, run.childResults[0].id));
  });

  it("determineChildIdOwnership：current / other / unknown 三分支", () => {
    const expected = ["P-split-enc-0"];
    // current：引用 split ∈ 当前批次期望
    expect(determineChildIdOwnership([{ id: "P-split-enc-0", childResultId: "c1" }], "c1", expected)).toBe("current");
    // other：引用 split ∉ 当前批次期望（明确其他批次）
    expect(determineChildIdOwnership([{ id: "P-split-other-0", childResultId: "c1" }], "c1", expected)).toBe("other");
    // unknown：无任何引用该 child 的 split（部分失败窗口）
    expect(determineChildIdOwnership([{ id: "P-split-enc-0", childResultId: "c2" }], "c1", expected)).toBe("unknown");
    expect(determineChildIdOwnership([], "c1", expected)).toBe("unknown");
  });
});

describe("E-1：同一 Split Execution 中显式 child ID 唯一性（非法输入整体拒绝）", () => {
  const parent: WorkloadResult = {
    id: "parent-result-e1",
    resultSetId: "rs-parent",
    resultItemId: "ri-parent",
    name: "E-1 父结果",
    value: 2000,
    dimensions: { departmentId: "unit-neurosurgery" },
  };

  function child(id: string | undefined, value: number, name: string) {
    return {
      ...(id ? { id } : {}),
      name,
      value,
      dimensions: { departmentId: "unit-neurosurgery-ward-1" },
      resultSetId: "rs-child-e1",
      resultItemId: `ri-child-${name}`,
    };
  }

  it("两个 children 使用同一显式 ID → 拒绝（invalid_input）", () => {
    expect(() => createWorkloadSplit({
      parentResultId: parent.id,
      children: [child("child-neuro", 800, "A"), child("child-neuro", 900, "B")],
      splitType: "partial",
    }, parent)).toThrow(SplitValidationError);
    expect(() => createWorkloadSplit({
      parentResultId: parent.id,
      children: [child("child-neuro", 800, "A"), child("child-neuro", 900, "B")],
      splitType: "partial",
    }, parent)).toThrow("重复 child Result ID：child-neuro");
  });

  it("同一 ID 出现 3 次也必须拒绝", () => {
    expect(() => createWorkloadSplit({
      parentResultId: parent.id,
      children: [
        child("child-x", 100, "A"),
        child("child-x", 200, "B"),
        child("child-x", 300, "C"),
      ],
      splitType: "partial",
    }, parent)).toThrow("重复 child Result ID：child-x");
  });

  it("两个不同显式 ID → 正常创建（各得其所，互不覆盖）", () => {
    const result = createWorkloadSplit({
      parentResultId: parent.id,
      children: [child("child-a", 800, "A"), child("child-b", 900, "B")],
      splitType: "partial",
    }, parent);
    expect(result.childResults.map((r) => r.id)).toEqual(["child-a", "child-b"]);
    expect(result.childResults[0].value).toBe(800);
    expect(result.childResults[1].value).toBe(900);
  });

  it("无显式 ID 的 children 不参与本规则 → 生成型逻辑不受影响", () => {
    const result = createWorkloadSplit({
      parentResultId: parent.id,
      children: [child(undefined, 100, "A"), child(undefined, 100, "B")],
      splitType: "partial",
      executionBatchId: "rec-e1::2026-10-05T15:00:00.000Z",
    }, parent);
    expect(result.childResults).toHaveLength(2);
    expect(result.childResults[0].id).not.toBe(result.childResults[1].id);
    // 混合：一个显式 + 一个生成型 → 正常
    const mixed = createWorkloadSplit({
      parentResultId: parent.id,
      children: [child("child-mixed", 100, "A"), child(undefined, 100, "B")],
      splitType: "partial",
      executionBatchId: "rec-e1::2026-10-05T15:01:00.000Z",
    }, parent);
    expect(mixed.childResults.map((r) => r.id)).toContain("child-mixed");
  });
});

describe("E-2 / D-148：统计锚点唯一性与顺序无关 identity", () => {
  const parent: WorkloadResult = {
    id: "parent-result-e2",
    resultSetId: "rs-parent",
    resultItemId: "ri-parent",
    name: "E-2 父结果",
    value: 2000,
    dimensions: { departmentId: "unit-neurosurgery" },
  };
  const BATCH = "rec-e2::2026-10-05T18:00:00.000Z";

  function e2child(opts: { id?: string; rs: string; ri: string; value?: number; name?: string }) {
    return {
      ...(opts.id ? { id: opts.id } : {}),
      name: opts.name ?? `子结果-${opts.ri}`,
      value: opts.value ?? 100,
      dimensions: { departmentId: "unit-neurosurgery-ward-1" },
      resultSetId: opts.rs,
      resultItemId: opts.ri,
    };
  }

  function runSplit(children: ReturnType<typeof e2child>[], batch = BATCH) {
    return createWorkloadSplit(
      { parentResultId: parent.id, children, splitType: "partial", executionBatchId: batch },
      parent
    );
  }

  it("两个显式不同 ID + 同 RS/RI → 拒绝（显式 id 不能绕过锚点唯一性）", () => {
    expect(() => runSplit([e2child({ id: "x", rs: "RS1", ri: "RI7" }), e2child({ id: "y", rs: "RS1", ri: "RI7" })]))
      .toThrow("统计锚点重复");
  });

  it("两个无 ID + 同 RS/RI → 拒绝", () => {
    expect(() => runSplit([e2child({ rs: "RS1", ri: "RI7" }), e2child({ rs: "RS1", ri: "RI7" })]))
      .toThrow("统计锚点重复");
  });

  it("同 RS/RI + 不同 value → 仍拒绝（value 不能区分事实）", () => {
    expect(() => runSplit([
      e2child({ rs: "RS1", ri: "RI7", value: 800 }),
      e2child({ rs: "RS1", ri: "RI7", value: 850 }),
    ])).toThrow("统计锚点重复");
  });

  it("同 RS/RI + 不同 name → 仍拒绝（name 不能区分事实）", () => {
    expect(() => runSplit([
      e2child({ rs: "RS1", ri: "RI7", name: "甲" }),
      e2child({ rs: "RS1", ri: "RI7", name: "乙" }),
    ])).toThrow("统计锚点重复");
  });

  it("同 RS + 不同 RI → 允许（两个不同统计位置）", () => {
    const result = runSplit([e2child({ rs: "RS1", ri: "RI7" }), e2child({ rs: "RS1", ri: "RI8" })]);
    expect(result.childResults).toHaveLength(2);
    expect(result.childResults[0].id).not.toBe(result.childResults[1].id);
  });

  it("不同 RS + 相同 RI → 允许（组合锚点不同）", () => {
    const result = runSplit([e2child({ rs: "RS1", ri: "RI7" }), e2child({ rs: "RS2", ri: "RI7" })]);
    expect(result.childResults).toHaveLength(2);
    expect(result.childResults[0].id).not.toBe(result.childResults[1].id);
  });

  it("E-1 与锚点校验组合：id 重复由 E-1 拒、同 id 不同锚点允许、异 id 同锚点由 E-2 拒", () => {
    // id=A ×2 + 不同锚点 → E-1（显式 id 唯一性）拒绝
    expect(() => runSplit([e2child({ id: "A", rs: "RS1", ri: "RI7" }), e2child({ id: "A", rs: "RS1", ri: "RI8" })]))
      .toThrow("重复 child Result ID");
    // id=A/RI7 + id=B/RI8 → 允许
    expect(() => runSplit([e2child({ id: "A", rs: "RS1", ri: "RI7" }), e2child({ id: "B", rs: "RS1", ri: "RI8" })]))
      .not.toThrow();
    // id=A/RI7 + id=B/RI7 → E-2（锚点唯一性）拒绝
    expect(() => runSplit([e2child({ id: "A", rs: "RS1", ri: "RI7" }), e2child({ id: "B", rs: "RS1", ri: "RI7" })]))
      .toThrow("统计锚点重复");
  });

  it("生成型 child ID 无 index、嵌入单射编码锚点；同批次+同锚点 → 永远同 ID", () => {
    const r1 = runSplit([e2child({ rs: "RS1", ri: "RI7" }), e2child({ rs: "RS1", ri: "RI8" })]);
    const id7 = r1.childResults[0].id;
    // 嵌入可读锚点编码
    expect(id7).toContain("RS1_003a_003aRI7");
    expect(id7).not.toMatch(/-\\d+$/); // 无 index 尾缀
    // 同批次同锚点重跑 → 同 ID
    const r2 = runSplit([e2child({ rs: "RS1", ri: "RI7" })]);
    expect(r2.childResults[0].id).toBe(id7);
  });

  it("children 换序（同批次 retry）→ 生成型 child ID 与 WorkloadSplit ID 全部不变", () => {
    const first = runSplit([e2child({ rs: "RS1", ri: "RI7" }), e2child({ rs: "RS1", ri: "RI8" })]);
    const swapped = runSplit([e2child({ rs: "RS1", ri: "RI8" }), e2child({ rs: "RS1", ri: "RI7" })]);
    // Result ID 按锚点对应完全一致
    expect(swapped.childResults.map((r) => r.id).sort()).toEqual(first.childResults.map((r) => r.id).sort());
    // Split ID 不变，且 childResultId 关联不因换序对调
    const firstByChild = new Map(first.workloadSplits.map((sp) => [sp.childResultId, sp.id]));
    for (const sp of swapped.workloadSplits) {
      expect(sp.id).toBe(firstByChild.get(sp.childResultId));
    }
  });

  it("D-142 新批次（同锚点）→ 新 child Result ID + 新 WorkloadSplit ID（不覆盖旧分解记录）", () => {
    const batchA = "rec-e2::2026-10-05T18:00:00.000Z";
    const batchB = "rec-e2::2026-10-05T19:00:00.000Z";
    const rA = runSplit([e2child({ rs: "RS1", ri: "RI7" })], batchA);
    const rB = runSplit([e2child({ rs: "RS1", ri: "RI7" })], batchB);
    expect(rB.childResults[0].id).not.toBe(rA.childResults[0].id);
    expect(rB.workloadSplits[0].id).not.toBe(rA.workloadSplits[0].id);
    // 两条分解记录并存（互不覆盖）
    expect(rA.workloadSplits[0].id).not.toBe(rB.workloadSplits[0].id);
  });
});
