import type { AnyCard, BudgetCard, WorkloadCard } from "../card/types";
import type { Period } from "../period/types";
import type { Relation } from "../relation/types";
import type { WorkloadResult } from "../workload/types";
import type { BudgetOccupancyMetadata, BudgetSummary, OccupancyStatus } from "./types";

const occupancyStatuses = new Set<OccupancyStatus>(["candidate", "confirmed", "rejected"]);

function allocatedAmountOf(relation: Relation): number {
  const value = relation.metadata?.allocatedAmount;
  return typeof value === "number" ? value : 0;
}

export function budgetOccupancyMetadata(
  metadata: BudgetOccupancyMetadata
): Record<string, unknown> {
  return { ...metadata };
}

export function readBudgetOccupancyMetadata(
  relation: Relation
): BudgetOccupancyMetadata | undefined {
  const metadata = relation.metadata as Partial<BudgetOccupancyMetadata> | undefined;
  if (
    !metadata ||
    typeof metadata.matchedAmount !== "number" ||
    typeof metadata.status !== "string" ||
    !occupancyStatuses.has(metadata.status as OccupancyStatus)
  ) {
    return undefined;
  }

  return metadata as BudgetOccupancyMetadata;
}

function isConfirmedOccupancy(relation: Relation): boolean {
  return readBudgetOccupancyMetadata(relation)?.status === "confirmed";
}

export function getBudgetSummary(budget: BudgetCard, relations: Relation[]): BudgetSummary {
  const allocated = relations
    .filter(
      (relation) =>
        relation.active && relation.type === "budget_assign" && relation.sourceId === budget.id
    )
    .reduce((sum, relation) => sum + allocatedAmountOf(relation), 0);

  const occupied = relations
    .filter(
      (relation) =>
        relation.active &&
        relation.type === "budget_occupancy" &&
        relation.sourceId === budget.id &&
        isConfirmedOccupancy(relation)
    )
    .reduce((sum, relation) => {
      const metadata = readBudgetOccupancyMetadata(relation);
      return sum + (metadata ? metadata.matchedAmount : 0);
    }, 0);

  return {
    total: budget.amount,
    allocated,
    occupied,
    allocatedButIdle: Math.max(0, allocated - occupied),
    unallocated: Math.max(0, budget.amount - allocated)
  };
}

export function getIdleBudgets(budgets: BudgetCard[], relations: Relation[]): BudgetCard[] {
  return budgets.filter((budget) => getBudgetSummary(budget, relations).allocatedButIdle > 0);
}

export function getIdleWorkloads(cards: AnyCard[], relations: Relation[]): WorkloadCard[] {
  const inActiveUse = new Set(
    relations
      .filter(
        (relation) =>
          relation.active &&
          (relation.type === "workload_assign" || relation.type === "workload_share")
      )
      .map((relation) => relation.targetId)
  );
  const occupied = new Set(
    relations
      .filter(
        (relation) =>
          relation.active && relation.type === "budget_occupancy" && isConfirmedOccupancy(relation)
      )
      .map((relation) => relation.targetId)
  );

  return cards.filter(
    (card): card is WorkloadCard =>
      card.type === "workload" && inActiveUse.has(card.id) && !occupied.has(card.id)
  );
}

export interface BudgetValidationIssue {
  kind: "over_occupancy";
  budgetId: string;
  occupied: number;
  total: number;
}

export function validateBudget(
  budget: BudgetCard,
  relations: Relation[]
): BudgetValidationIssue[] {
  const summary = getBudgetSummary(budget, relations);

  if (summary.occupied > summary.total) {
    return [
      {
        kind: "over_occupancy",
        budgetId: budget.id,
        occupied: summary.occupied,
        total: summary.total
      }
    ];
  }

  return [];
}

export function intersectPeriods(a: Period, b: Period): Period | undefined {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  return start <= end ? { start, end } : undefined;
}

export type PeriodAlignmentCandidate =
  | { strategy: "intersection"; period: Period }
  | { strategy: "monthly_average" };

export function suggestPeriodAlignment(
  budgetPeriod: Period,
  workloadPeriod: Period
): PeriodAlignmentCandidate {
  const intersection = intersectPeriods(budgetPeriod, workloadPeriod);
  return intersection
    ? { strategy: "intersection", period: intersection }
    : { strategy: "monthly_average" };
}

export interface BackCalculatedBudget {
  amount: number;
  period: Period | undefined;
}

export function deriveBackCalculatedBudget(
  workloadResult: WorkloadResult,
  presetUnitScore: number
): BackCalculatedBudget {
  return {
    amount: (workloadResult.value ?? 0) * presetUnitScore,
    period: workloadResult.period
  };
}