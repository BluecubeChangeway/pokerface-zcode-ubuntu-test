import type { Period, Phase } from "../period/types";

export type ResourceBarState = "normal" | "surplus" | "overflow" | "imbalanced";

export interface ResourceBar {
  current: number;
  benchmark: number;
  rate: number;
  state: ResourceBarState;
}

export interface BenchmarkDefinition {
  id: string;
  phase: Phase;
  name: string;
  includedResourceIds: string[];
}

export interface BudgetSummary {
  total: number;
  allocated: number;
  occupied: number;
  allocatedButIdle: number;
  unallocated: number;
}

export type OccupancyStatus = "candidate" | "confirmed" | "rejected";

export type AlignmentStrategy = "intersection" | "monthly_average" | "manual" | "inherited";

export interface PeriodAlignment {
  strategy: AlignmentStrategy;
  alignedPeriod?: Period;
}

export interface BudgetOccupancyMetadata {
  matchedAmount: number;
  status: OccupancyStatus;
  alignment?: PeriodAlignment;
}
