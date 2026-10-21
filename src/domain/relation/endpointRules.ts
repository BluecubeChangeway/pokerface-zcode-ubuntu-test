import type { CardType } from "../card/types";
import type { RelationType } from "./types";

export type RelationEndpointKind = CardType | "score_definition";

export interface RelationEndpointRule {
  sourceType: RelationEndpointKind;
  targetType: RelationEndpointKind;
}

export const relationEndpointRules: Record<RelationType, RelationEndpointRule[]> = {
  structure: [{ sourceType: "unit", targetType: "unit" }],
  workload_split: [{ sourceType: "workload", targetType: "workload" }],
  workload_assign: [{ sourceType: "unit", targetType: "workload" }],
  workload_share: [{ sourceType: "unit", targetType: "workload" }],
  budget_split: [{ sourceType: "budget", targetType: "budget" }],
  budget_compose: [{ sourceType: "budget", targetType: "budget" }],
  budget_assign: [{ sourceType: "budget", targetType: "unit" }],
  budget_occupancy: [{ sourceType: "budget", targetType: "workload" }],
  score_derive: [
    { sourceType: "budget", targetType: "score_definition" },
    { sourceType: "workload", targetType: "score_definition" }
  ],
  score_reuse: [{ sourceType: "score_definition", targetType: "score_definition" }],
  score_adjust: [{ sourceType: "score_definition", targetType: "score_definition" }]
};
