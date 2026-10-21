import type { Period } from "../period/types";
import type { RelationEndpointKind } from "./endpointRules";

export type RelationType =
  | "structure"
  | "workload_split"
  | "workload_assign"
  | "workload_share"
  | "budget_split"
  | "budget_compose"
  | "budget_assign"
  | "budget_occupancy"
  | "score_derive"
  | "score_reuse"
  | "score_adjust";

export interface Relation {
  id: string;
  type: RelationType;
  sourceId: string;
  targetId: string;
  active: boolean;
  period?: Period;
  metadata?: Record<string, unknown>;
}

export type RelationDirection = "source" | "target" | "both";

export interface RelationCreateInput {
  id: string;
  type: RelationType;
  sourceId: string;
  targetId: string;
  period?: Period;
  metadata?: Record<string, unknown>;
}

export interface RelationValidationContext {
  existingRelations: Relation[];
  /** Endpoint kind lookup: entityId -> endpoint kind */
  endpointKinds: Map<string, RelationEndpointKind>;
}
