import type { Relation } from "../domain/relation/types";
import { budgetOccupancyMetadata } from "../domain/budget/budgetService";

export const mockRelations: Relation[] = [
  {
    id: "rel-neuro-ward-1",
    type: "structure",
    sourceId: "unit-neurosurgery",
    targetId: "unit-neurosurgery-ward-1",
    active: true
  },
  {
    id: "rel-neuro-ward-2",
    type: "structure",
    sourceId: "unit-neurosurgery",
    targetId: "unit-neurosurgery-ward-2",
    active: true
  },
  {
    id: "rel-neuro-intervention",
    type: "structure",
    sourceId: "unit-neurosurgery",
    targetId: "unit-intervention-room",
    active: true
  },
  {
    id: "rel-ward-1-wang",
    type: "structure",
    sourceId: "unit-neurosurgery-ward-1",
    targetId: "unit-wang-xx",
    active: true,
    period: { start: "2025-01-01", end: "2025-11-30", mode: "measurement" }
  },
  {
    id: "rel-ward-1-li",
    type: "structure",
    sourceId: "unit-neurosurgery-ward-1",
    targetId: "unit-li-xx",
    active: true
  },
  {
    id: "rel-ward-1-nursing",
    type: "structure",
    sourceId: "unit-neurosurgery-ward-1",
    targetId: "unit-nursing-team",
    active: true
  },
  {
    id: "rel-internal-wang-service",
    type: "structure",
    sourceId: "unit-internal-medicine",
    targetId: "unit-wang-xx",
    active: true,
    period: { start: "2025-06-01", end: "2025-07-31", mode: "actual" },
    metadata: { serviceContext: true }
  },
  {
    id: "rel-emergency-wang-service",
    type: "structure",
    sourceId: "unit-emergency",
    targetId: "unit-wang-xx",
    active: true,
    period: { start: "2025-10-01", end: "2025-12-31", mode: "actual" },
    metadata: { serviceContext: true }
  },
  {
    id: "rel-outpatient-neuro",
    type: "workload_split",
    sourceId: "workload-outpatient-visits",
    targetId: "workload-neurosurgery-outpatient",
    active: true,
    metadata: {
      aggregateContribution: 1260
    }
  },
  {
    id: "rel-outpatient-internal",
    type: "workload_split",
    sourceId: "workload-outpatient-visits",
    targetId: "workload-internal-outpatient",
    active: true,
    metadata: {
      aggregateContribution: 1400
    }
  },
  {
    id: "rel-neuro-outpatient-wang",
    type: "workload_split",
    sourceId: "workload-neurosurgery-outpatient",
    targetId: "workload-wang-outpatient",
    active: true
  },
  {
    id: "rel-neuro-outpatient-li",
    type: "workload_split",
    sourceId: "workload-neurosurgery-outpatient",
    targetId: "workload-li-outpatient",
    active: true
  },
  {
    id: "rel-neuro-outpatient-assignment",
    type: "workload_assign",
    sourceId: "unit-neurosurgery",
    targetId: "workload-neurosurgery-outpatient",
    active: true
  },
  {
    id: "rel-discharge-ward",
    type: "workload_assign",
    sourceId: "unit-neurosurgery-ward-1",
    targetId: "workload-discharge-visits",
    active: true
  },
  {
    id: "rel-discharge-nursing",
    type: "workload_share",
    sourceId: "unit-nursing-team",
    targetId: "workload-discharge-visits",
    active: true
  },
  {
    id: "rel-discharge-director",
    type: "workload_share",
    sourceId: "unit-director",
    targetId: "workload-discharge-visits",
    active: true
  },
  {
    id: "rel-budget-hospital-doctor",
    type: "budget_split",
    sourceId: "budget-hospital-performance",
    targetId: "budget-doctor",
    active: true
  },
  {
    id: "rel-budget-doctor-outpatient",
    type: "budget_split",
    sourceId: "budget-doctor",
    targetId: "budget-outpatient",
    active: true
  },
  {
    id: "rel-budget-doctor-inpatient",
    type: "budget_split",
    sourceId: "budget-doctor",
    targetId: "budget-inpatient",
    active: true
  },
  {
    id: "rel-budget-hospital-nursing",
    type: "budget_split",
    sourceId: "budget-hospital-performance",
    targetId: "budget-nursing",
    active: true
  },
  {
    id: "rel-budget-hospital-other",
    type: "budget_split",
    sourceId: "budget-hospital-performance",
    targetId: "budget-other",
    active: true
  },
  {
    id: "rel-budget-inpatient-ward1",
    type: "budget_assign",
    sourceId: "budget-inpatient",
    targetId: "unit-neurosurgery-ward-1",
    active: true,
    metadata: { allocatedAmount: 400000 }
  },
  {
    id: "rel-budget-inpatient-internal",
    type: "budget_assign",
    sourceId: "budget-inpatient",
    targetId: "unit-internal-medicine",
    active: true,
    metadata: { allocatedAmount: 350000 }
  },
  {
    id: "rel-budget-outpatient-workload",
    type: "budget_occupancy",
    sourceId: "budget-outpatient",
    targetId: "workload-neurosurgery-outpatient",
    active: true,
    metadata: budgetOccupancyMetadata({
      matchedAmount: 1200000,
      status: "confirmed",
      alignment: {
        strategy: "intersection",
        alignedPeriod: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
      }
    })
  },
  {
    id: "rel-budget-inpatient-discharge-candidate",
    type: "budget_occupancy",
    sourceId: "budget-inpatient",
    targetId: "workload-discharge-visits",
    active: true,
    metadata: budgetOccupancyMetadata({
      matchedAmount: 300000,
      status: "candidate",
      alignment: {
        strategy: "intersection",
        alignedPeriod: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
      }
    })
  },
  {
    id: "rel-budget-backcalc-surgery-workload",
    type: "budget_occupancy",
    sourceId: "budget-backcalc-surgery",
    targetId: "workload-surgery-count",
    active: true,
    metadata: budgetOccupancyMetadata({
      matchedAmount: 600,
      status: "confirmed",
      alignment: { strategy: "inherited" }
    })
  },
  {
    id: "rel-score-derive-outpatient-budget",
    type: "score_derive",
    sourceId: "budget-outpatient",
    targetId: "score-outpatient-derived",
    active: true
  },
  {
    id: "rel-score-derive-outpatient-workload",
    type: "score_derive",
    sourceId: "workload-neurosurgery-outpatient",
    targetId: "score-outpatient-derived",
    active: true
  },
  {
    id: "rel-score-reuse-disease",
    type: "score_reuse",
    sourceId: "score-disease-weight-reused",
    targetId: "score-outpatient-derived",
    active: true
  },
  {
    id: "rel-score-reuse-wang",
    type: "score_reuse",
    sourceId: "score-wang-outpatient",
    targetId: "score-outpatient-derived",
    active: true
  }
];
