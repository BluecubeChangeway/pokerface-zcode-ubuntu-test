import type { Recommendation } from "../domain/recommendation/types";
import type { ResolutionRecommendation } from "../domain/workload/resolutionTypes";

export const mockRecommendations: Recommendation[] = [
  {
    id: "rec-neuro-ward-1",
    kind: "resolution",
    payload: {
      type: "use_existing_result",
      reason: "神经外科下级病区",
      targetResultId: "result-neurosurgery-ward-1",
    } satisfies ResolutionRecommendation,
    reason: "神经外科下级病区",
    status: "recommended",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
    relatedEntityIds: ["unit-neurosurgery-ward-1", "unit-neurosurgery"],
  },
  {
    id: "rec-neuro-outpatient",
    kind: "resolution",
    payload: {
      type: "split_workload",
      reason: "神经外科相关门诊工作量",
    } satisfies ResolutionRecommendation,
    reason: "神经外科相关门诊工作量",
    status: "recommended",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
    relatedEntityIds: ["workload-neurosurgery-outpatient", "unit-neurosurgery"],
  },
  {
    id: "rec-emergency-budget",
    kind: "relation",
    payload: {
      targetUnitId: "unit-emergency",
      targetSlotId: "slot-unit-emergency-budget",
      reason: "急诊追加预算候选",
      action: "create_relation",
      relationType: "budget_assign",
    },
    reason: "急诊追加预算候选",
    status: "recommended",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
    relatedEntityIds: ["budget-emergency-additional", "unit-emergency"],
  },
];