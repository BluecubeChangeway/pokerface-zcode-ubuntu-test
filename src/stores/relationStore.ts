import { createStore } from "zustand/vanilla";

import type { Relation, RelationCreateInput } from "../domain/relation/types";
import {
  createRelation,
  deleteRelation,
  getChildren,
  getReferences,
  getRelationsForCard
} from "../domain/relation/relationService";
import type { RelationValidationContext } from "../domain/relation/types";
import type { RelationEndpointKind } from "../domain/relation/endpointRules";

export interface RelationState {
  relations: Relation[];
  /** Endpoint kinds map for validation */
  endpointKinds: Map<string, RelationEndpointKind>;
  addRelation: (input: RelationCreateInput, context?: Partial<RelationValidationContext>) => void;
  removeRelation: (relationId: string) => void;
  getRelationsForCard: (cardId: string) => Relation[];
  getChildren: (cardId: string) => Relation[];
  getReferences: (cardId: string) => Relation[];
}

export const relationStore = createStore<RelationState>((set, get) => ({
  relations: [],
  endpointKinds: new Map<string, RelationEndpointKind>(),
  addRelation: (input, context) =>
    set((state) => ({
      relations: [
        ...state.relations,
        createRelation(input, {
          existingRelations: state.relations,
          endpointKinds: new Map(state.endpointKinds),
          ...context
        })
      ]
    })),
  removeRelation: (relationId) =>
    set((state) => ({ relations: deleteRelation(state.relations, relationId) })),
  getRelationsForCard: (cardId) => getRelationsForCard(get().relations, cardId),
  getChildren: (cardId) => getChildren(get().relations, cardId),
  getReferences: (cardId) => getReferences(get().relations, cardId)
}));