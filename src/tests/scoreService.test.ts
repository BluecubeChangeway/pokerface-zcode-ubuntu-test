import { describe, expect, it } from "vitest";

import {
  adjustmentDelta,
  adjustmentPercent,
  applyPercentAdjustment,
  createAdjustmentTable,
  createCalculationResult,
  finalizeAdjustmentTable,
  forkAdjustmentTable,
  forkMeasurementBranch,
  runCalculation,
  setCurrentUnitScore
} from "../domain/score/scoreService";
import type { MeasurementResult } from "../domain/score/types";
import { mockAdjustmentTable, mockMeasurementBranch, mockMeasurementResult } from "../mock/mockScores";
import { mockCards } from "../mock/mockCards";
import { mockRelations } from "../mock/mockRelations";

const calculationPeriod = { start: "2026-03-01", end: "2026-03-31", mode: "calculation" as const };

const calculationInputs = [
  {
    scoreDefinitionId: "score-wang-outpatient",
    workloadId: "workload-wang-outpatient",
    workloadValue: 180
  },
  {
    scoreDefinitionId: "score-outpatient-derived",
    workloadId: "workload-neurosurgery-outpatient",
    workloadValue: 220
  }
];

describe("adjustment table baseline", () => {
  it("creates a table where every measurement item keeps original and current score", () => {
    const table = createAdjustmentTable("adjustment-table-1", mockMeasurementResult);

    expect(table.baselineMeasurementResultId).toBe("measurement-result-2025");
    expect(table.entries).toHaveLength(mockMeasurementResult.entries.length);

    for (const entry of table.entries) {
      expect(entry.originalUnitScore).toBe(entry.currentUnitScore);
      expect(adjustmentDelta(entry)).toBe(0);
    }
  });

  it("keeps positive and negative adjustments visible against the original scale", () => {
    const raised = setCurrentUnitScore(
      mockAdjustmentTable,
      "score-outpatient-derived",
      14
    );
    const raisedEntry = raised.entries.find(
      (entry) => entry.scoreDefinitionId === "score-outpatient-derived"
    )!;
    expect(adjustmentDelta(raisedEntry)).toBe(2);

    const loweredEntry = mockAdjustmentTable.entries.find(
      (entry) => entry.scoreDefinitionId === "score-wang-outpatient"
    )!;
    expect(adjustmentDelta(loweredEntry)).toBe(-2);
    expect(adjustmentPercent(loweredEntry)).toBeCloseTo((-2 / 12) * 100, 10);
  });

  it("anchors percent adjustment to the original scale, not the current value", () => {
    const alreadyLowered = {
      scoreDefinitionId: "score-x",
      originalUnitScore: 10,
      currentUnitScore: 8
    };

    const adjusted = applyPercentAdjustment(alreadyLowered, 20);

    expect(adjusted.originalUnitScore).toBe(10);
    expect(adjusted.currentUnitScore).toBe(12);
    expect(adjustmentPercent(adjusted)).toBe(20);
  });
});

describe("adjustment table fork", () => {
  it("copies the complete current state on fork", () => {
    const fork = forkAdjustmentTable(mockAdjustmentTable, "adjustment-table-fork");

    expect(fork.id).toBe("adjustment-table-fork");
    expect(fork.baselineMeasurementResultId).toBe(mockAdjustmentTable.baselineMeasurementResultId);
    expect(fork.entries).toEqual(mockAdjustmentTable.entries);
  });

  it("keeps fork and original independent after fork", () => {
    const fork = forkAdjustmentTable(mockAdjustmentTable, "adjustment-table-fork");

    const editedFork = setCurrentUnitScore(fork, "score-wang-outpatient", 9);

    const originalEntry = mockAdjustmentTable.entries.find(
      (entry) => entry.scoreDefinitionId === "score-wang-outpatient"
    )!;
    expect(originalEntry.currentUnitScore).toBe(10);
    expect(
      editedFork.entries.find((entry) => entry.scoreDefinitionId === "score-wang-outpatient")!
        .currentUnitScore
    ).toBe(9);
  });

  it("does not create a new table on normal edits", () => {
    const edited = setCurrentUnitScore(mockAdjustmentTable, "score-outpatient-derived", 13);

    expect(edited.id).toBe(mockAdjustmentTable.id);
    expect(edited.entries).toHaveLength(mockAdjustmentTable.entries.length);
    expect(edited).not.toBe(mockAdjustmentTable);
  });
});

describe("repeated calculation on one adjustment table", () => {
  it("produces multiple calculation results from the same table", () => {
    const first = createCalculationResult(
      "calc-a1",
      mockAdjustmentTable,
      calculationPeriod,
      calculationInputs
    );
    const edited = setCurrentUnitScore(mockAdjustmentTable, "score-wang-outpatient", 9);
    const second = createCalculationResult(
      "calc-a2",
      edited,
      { start: "2026-04-01", end: "2026-04-30", mode: "calculation" },
      calculationInputs
    );

    expect(first.adjustmentTableId).toBe("adjustment-table-main");
    expect(second.adjustmentTableId).toBe("adjustment-table-main");
    expect(first.id).not.toBe(second.id);
  });

  it("keeps saved calculation results immutable against later edits", () => {
    const saved = createCalculationResult(
      "calc-a1",
      mockAdjustmentTable,
      calculationPeriod,
      calculationInputs
    );

    setCurrentUnitScore(mockAdjustmentTable, "score-wang-outpatient", 8);

    const snapshotEntry = saved.adjustmentSnapshot.find(
      (entry) => entry.scoreDefinitionId === "score-wang-outpatient"
    )!;
    expect(snapshotEntry.currentUnitScore).toBe(10);

    const wangResult = saved.scoreResults.find(
      (result) => result.scoreDefinitionId === "score-wang-outpatient"
    )!;
    expect(wangResult.totalScore).toBe(1800);
  });

  it("returns a transient draft without persisting anything", () => {
    const draft = runCalculation("draft-preview", mockAdjustmentTable, calculationPeriod, calculationInputs);

    expect(draft).not.toHaveProperty("id");
    expect(draft).not.toHaveProperty("adjustmentTableId");
    expect(draft.scoreResults).toHaveLength(2);
    expect(draft.scoreResults[0].totalScore).toBe(1800);

    const again = runCalculation("draft-preview", mockAdjustmentTable, calculationPeriod, calculationInputs);
    expect(again).toEqual(draft);
  });

  it("generates non-colliding score result ids across repeated calculations of the same table", () => {
    const first = createCalculationResult(
      "calc-a1",
      mockAdjustmentTable,
      calculationPeriod,
      calculationInputs
    );
    const second = createCalculationResult(
      "calc-a2",
      mockAdjustmentTable,
      calculationPeriod,
      calculationInputs
    );

    expect(first.id).not.toBe(second.id);
    for (let index = 0; index < first.scoreResults.length; index += 1) {
      expect(first.scoreResults[index]!.id).not.toBe(second.scoreResults[index]!.id);
      expect(first.scoreResults[index]!.id).toContain("calc-a1");
      expect(second.scoreResults[index]!.id).toContain("calc-a2");
    }

    expect(first.scoreResults.map((result) => result.totalScore)).toEqual(
      second.scoreResults.map((result) => result.totalScore)
    );
  });
});

describe("confirmation and final score table", () => {
  it("exports a final score table without closing the adjustment table", () => {
    const finalTable = finalizeAdjustmentTable(mockAdjustmentTable, "final-score-table-1");

    expect(finalTable.adjustmentTableId).toBe("adjustment-table-main");
    expect(finalTable.entries).toEqual(mockAdjustmentTable.entries);

    const stillEditable = setCurrentUnitScore(mockAdjustmentTable, "score-wang-outpatient", 11);
    expect(
      stillEditable.entries.find((entry) => entry.scoreDefinitionId === "score-wang-outpatient")!
        .currentUnitScore
    ).toBe(11);

    const frozenEntry = finalTable.entries.find(
      (entry) => entry.scoreDefinitionId === "score-wang-outpatient"
    )!;
    expect(frozenEntry.currentUnitScore).toBe(10);
  });
});

describe("measurement branch fork", () => {
  it("copies the working state but not measurement results or adjustment tables", () => {
    const fork = forkMeasurementBranch(mockMeasurementBranch, "measurement-branch-b");

    expect(fork.id).toBe("measurement-branch-b");
    expect(fork.measurementResultId).toBeUndefined();
    expect(fork).not.toHaveProperty("adjustmentTableId");
    expect(fork.cards).toHaveLength(mockCards.length);
    expect(fork.relations).toHaveLength(mockRelations.length);

    fork.relations[0]!.active = false;
    expect(mockRelations[0]!.active).toBe(true);
  });

  it("lets the new branch form its own measurement result and adjustment table", () => {
    const branchResult: MeasurementResult = {
      ...mockMeasurementResult,
      id: "measurement-result-branch-b"
    };

    const branchTable = createAdjustmentTable("adjustment-table-branch-b", branchResult);
    const edited = setCurrentUnitScore(branchTable, "score-wang-outpatient", 11);

    const mainEntry = mockAdjustmentTable.entries.find(
      (entry) => entry.scoreDefinitionId === "score-wang-outpatient"
    )!;
    expect(mainEntry.currentUnitScore).toBe(10);
    expect(
      edited.entries.find((entry) => entry.scoreDefinitionId === "score-wang-outpatient")!
        .currentUnitScore
    ).toBe(11);
  });
});
