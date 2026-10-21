import { describe, expect, it } from "vitest";

import {
  budgetOccupancyMetadata,
  deriveBackCalculatedBudget,
  getBudgetSummary,
  getIdleBudgets,
  getIdleWorkloads,
  suggestPeriodAlignment,
  validateBudget
} from "../domain/budget/budgetService";
import type { BudgetCard } from "../domain/card/types";
import type { WorkloadResult } from "../domain/workload/types";
import type { Period } from "../domain/period/types";
import type { OccupancyStatus } from "../domain/budget/types";
import type { Relation } from "../domain/relation/types";
import { mockCards } from "../mock/mockCards";
import { mockRelations } from "../mock/mockRelations";

const budgetCards = mockCards.filter((card): card is BudgetCard => card.type === "budget");

function makeBudget(id: string, amount: number): BudgetCard {
  return {
    id,
    type: "budget",
    name: "测试预算",
    configurationState: "configured",
    amount
  };
}

function assignRelation(
  id: string,
  budgetId: string,
  unitId: string,
  allocatedAmount: number
): Relation {
  return {
    id,
    type: "budget_assign",
    sourceId: budgetId,
    targetId: unitId,
    active: true,
    metadata: { allocatedAmount }
  };
}

function occupancyRelation(
  id: string,
  budgetId: string,
  workloadId: string,
  matchedAmount: number,
  status: OccupancyStatus,
  active = true
): Relation {
  return {
    id,
    type: "budget_occupancy",
    sourceId: budgetId,
    targetId: workloadId,
    active,
    metadata: budgetOccupancyMetadata({
      matchedAmount,
      status,
      alignment: { strategy: "manual" }
    })
  };
}

describe("budget domain service", () => {
  it("keeps only base facts on budget cards", () => {
    expect(budgetCards.length).toBeGreaterThan(0);
    for (const card of budgetCards) {
      expect(card).not.toHaveProperty("availableAmount");
      expect(card).not.toHaveProperty("usedAmount");
      expect(card).not.toHaveProperty("remainingAmount");
      expect(card).not.toHaveProperty("utilizationRate");
      expect(card).not.toHaveProperty("budgetState");
    }
  });

  it("has no legacy budget_usage relations", () => {
    const legacyTypes = mockRelations.filter(
      (relation) => (relation.type as string) === "budget_usage"
    );
    expect(legacyTypes).toHaveLength(0);
  });

  it("derives allocated, occupied, idle, and unallocated from relations", () => {
    const outpatient = budgetCards.find((card) => card.id === "budget-outpatient")!;
    expect(getBudgetSummary(outpatient, mockRelations)).toEqual({
      total: 1200000,
      allocated: 0,
      occupied: 1200000,
      allocatedButIdle: 0,
      unallocated: 1200000
    });

    const inpatient = budgetCards.find((card) => card.id === "budget-inpatient")!;
    expect(getBudgetSummary(inpatient, mockRelations)).toEqual({
      total: 1000000,
      allocated: 750000,
      occupied: 0,
      allocatedButIdle: 750000,
      unallocated: 250000
    });

    const backcalc = budgetCards.find((card) => card.id === "budget-backcalc-surgery")!;
    expect(getBudgetSummary(backcalc, mockRelations)).toEqual({
      total: 600,
      allocated: 0,
      occupied: 600,
      allocatedButIdle: 0,
      unallocated: 600
    });
  });

  it("identifies idle budgets and idle workloads as facts only", () => {
    const idleBudgetIds = getIdleBudgets(budgetCards, mockRelations).map((card) => card.id);
    expect(idleBudgetIds).toEqual(["budget-inpatient"]);

    const idleWorkloadIds = getIdleWorkloads(mockCards, mockRelations).map((card) => card.id);
    expect(idleWorkloadIds).toEqual(["workload-discharge-visits"]);
  });

  it("suggests period alignment candidates without deciding", () => {
    const candidate = suggestPeriodAlignment(
      { start: "2025-01-01", end: "2025-08-31" },
      { start: "2025-04-01", end: "2025-12-31" }
    );
    expect(candidate).toEqual({
      strategy: "intersection",
      period: { start: "2025-04-01", end: "2025-08-31" }
    });

    const noOverlap = suggestPeriodAlignment(
      { start: "2026-01-01", end: "2026-05-31" },
      { start: "2025-01-01", end: "2025-12-31" }
    );
    expect(noOverlap).toEqual({ strategy: "monthly_average" });
  });

  it("derives a back-calculated budget from workload and preset unit score", () => {
    const workloadResult: WorkloadResult = {
      id: "test-workload-result",
      resultSetId: "rs-test",
      resultItemId: "ri-test",
      name: "测试工作量",
      value: 10000,
      dimensions: {},
      period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
    };
    const result = deriveBackCalculatedBudget(
      workloadResult,
      5
    );
    expect(result).toEqual({
      amount: 50000,
      period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
    });
  });

  it("uses WorkloadResult.value even if WorkloadCard.value differs (display cache)", () => {
    const workloadResult: WorkloadResult = {
      id: "test-workload-result-2",
      resultSetId: "rs-test-2",
      resultItemId: "ri-test-2",
      name: "测试工作量 2",
      value: 2000, // 权威值
      dimensions: {},
      period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
    };
    // 模拟 WorkloadCard.value 不同（display cache 过期/不一致）
    const cardValue = 9999; // 与权威值不一致
    
    const result = deriveBackCalculatedBudget(workloadResult, 2);
    
    // 必须使用 WorkloadResult.value (2000 * 2 = 4000)，而非 card.value (9999 * 2 = 19998)
    expect(result.amount).toBe(4000);
    expect(result.amount).not.toBe(cardValue * 2);
    expect(result.period).toEqual({ start: "2025-01-01", end: "2025-12-31", mode: "measurement" });
  });
});

describe("partial budget occupancy (Q-05 increment)", () => {
  const budget = makeBudget("budget-partial-test", 1000000);

  it("Test 1: 100 total, 80 assigned, 60 occupied", () => {
    const relations = [
      assignRelation("a1", budget.id, "unit-x", 800000),
      occupancyRelation("o1", budget.id, "workload-x", 600000, "confirmed")
    ];

    expect(getBudgetSummary(budget, relations)).toEqual({
      total: 1000000,
      allocated: 800000,
      occupied: 600000,
      allocatedButIdle: 200000,
      unallocated: 200000
    });
  });

  it("Test 2: 100 total, 80 assigned, 80 occupied", () => {
    const relations = [
      assignRelation("a1", budget.id, "unit-x", 800000),
      occupancyRelation("o1", budget.id, "workload-x", 800000, "confirmed")
    ];

    expect(getBudgetSummary(budget, relations)).toEqual({
      total: 1000000,
      allocated: 800000,
      occupied: 800000,
      allocatedButIdle: 0,
      unallocated: 200000
    });
  });

  it("Test 3: occupancy without assignment is legal (back-calculated path)", () => {
    const relations = [occupancyRelation("o1", budget.id, "workload-x", 600000, "confirmed")];

    expect(getBudgetSummary(budget, relations)).toEqual({
      total: 1000000,
      allocated: 0,
      occupied: 600000,
      allocatedButIdle: 0,
      unallocated: 1000000
    });
  });

  it("Test 4: sums multiple confirmed occupancies on one budget", () => {
    const relations = [
      occupancyRelation("o1", budget.id, "workload-a", 600000, "confirmed"),
      occupancyRelation("o2", budget.id, "workload-b", 200000, "confirmed")
    ];

    expect(getBudgetSummary(budget, relations).occupied).toBe(800000);
  });

  it("Test 5: over-occupancy is not clamped and is exposed via validation", () => {
    const relations = [occupancyRelation("o1", budget.id, "workload-a", 1200000, "confirmed")];

    expect(getBudgetSummary(budget, relations).occupied).toBe(1200000);
    expect(validateBudget(budget, relations)).toEqual([
      { kind: "over_occupancy", budgetId: budget.id, occupied: 1200000, total: 1000000 }
    ]);
    expect(validateBudget(budget, [])).toEqual([]);
  });

  it("Test 6: candidate occupancy does not count into occupied", () => {
    const relations = [occupancyRelation("o1", budget.id, "workload-a", 600000, "candidate", true)];

    expect(getBudgetSummary(budget, relations).occupied).toBe(0);
  });

  it("Test 7: confirmed occupancy counts into occupied", () => {
    const relations = [occupancyRelation("o1", budget.id, "workload-a", 600000, "confirmed", true)];

    expect(getBudgetSummary(budget, relations).occupied).toBe(600000);
  });

  it("Test 8: deleted occupancy does not count even when status is confirmed", () => {
    const relations = [
      occupancyRelation("o1", budget.id, "workload-a", 600000, "confirmed", false)
    ];

    expect(getBudgetSummary(budget, relations).occupied).toBe(0);
  });
});
