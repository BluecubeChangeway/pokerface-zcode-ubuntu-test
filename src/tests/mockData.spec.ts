import { describe, expect, it } from "vitest";

import type { UnitCard, WorkloadCard } from "../domain/card/types";
import type { WorkloadAggregateSummary } from "../domain/workload/types";
import { mockCards } from "../mock/mockCards";
import { mockRelations } from "../mock/mockRelations";
import { mockScoreDefinitions, mockAdjustmentTable } from "../mock/mockScores";
import { getReferences } from "../domain/relation/relationService";

describe("phase 1 mock data", () => {
  it("keeps Wang XX as a single UnitCard across service contexts", () => {
    const wangCards = mockCards.filter(
      (card): card is UnitCard => card.type === "unit" && card.name === "王XX"
    );

    expect(wangCards).toHaveLength(1);
    expect(wangCards[0].id).toBe("unit-wang-xx");

    const wangServiceRelations = mockRelations.filter(
      (relation) => relation.targetId === "unit-wang-xx" && relation.type === "structure"
    );

    expect(wangServiceRelations.length).toBeGreaterThanOrEqual(3);
    expect(wangServiceRelations.some((relation) => relation.period?.mode === "actual")).toBe(true);
  });

  it("preserves unallocated workload resources instead of assuming parent equals children sum", () => {
    const outpatient = mockCards.find(
      (card): card is WorkloadCard => card.id === "workload-outpatient-visits" && card.type === "workload"
    );

    const aggregate = outpatient?.metadata?.aggregate as WorkloadAggregateSummary | undefined;

    expect(aggregate).toEqual({
      childTotal: 3260,
      remainderTotal: 742,
      coveredTotal: 4002
    });
    expect(aggregate?.childTotal).not.toBe(aggregate?.coveredTotal);
  });

  it("contains mock anomalies required by the implementation package", () => {
    const hospitalBudget = mockCards.find((card) => card.id === "budget-hospital-performance");

    const dischargeReferences = getReferences(mockRelations, "workload-discharge-visits").filter(
      (relation) => relation.type.startsWith("workload_")
    );
    expect(dischargeReferences.map((relation) => relation.sourceId)).toEqual([
      "unit-neurosurgery-ward-1",
      "unit-nursing-team",
      "unit-director"
    ]);
    expect(hospitalBudget).not.toHaveProperty("usedAmount");
    expect(hospitalBudget).not.toHaveProperty("remainingAmount");
    expect(hospitalBudget).not.toHaveProperty("budgetState");
    const backcalc = mockCards.find((card) => card.id === "budget-backcalc-surgery");
    expect(backcalc).toMatchObject({
      amount: 600,
      metadata: { origin: { kind: "back_calculated" } }
    });
    expect(mockScoreDefinitions.some((score) => score.mode === "manual")).toBe(true);
    expect(mockScoreDefinitions.some((score) => score.mode === "reused")).toBe(true);
    for (const definition of mockScoreDefinitions) {
      expect(definition).not.toHaveProperty("sourceBudgetId");
      expect(definition).not.toHaveProperty("sourceScoreId");
    }

    expect(mockAdjustmentTable.baselineMeasurementResultId).toBe("measurement-result-2025");
    const wangEntry = mockAdjustmentTable.entries.find(
      (entry) => entry.scoreDefinitionId === "score-wang-outpatient"
    );
    expect(wangEntry).toMatchObject({ originalUnitScore: 12, currentUnitScore: 10 });
  });

  it("keeps workload reference facts only in relations, not on cards", () => {
    const workloadCards = mockCards.filter((card) => card.type === "workload");

    expect(workloadCards.length).toBeGreaterThan(0);
    for (const card of workloadCards) {
      expect(card).not.toHaveProperty("references");
    }
  });

  it("separates configuration state from validation state on cards", () => {
    const outpatient = mockCards.find((card) => card.id === "workload-outpatient-visits");
    const hospitalBudget = mockCards.find((card) => card.id === "budget-hospital-performance");

    expect(outpatient?.configurationState).toBe("partial");
    expect(outpatient?.validationState).toBeUndefined();

    expect(hospitalBudget?.configurationState).toBe("configured");
    expect(hospitalBudget?.validationState).toBeUndefined();
  });
});
