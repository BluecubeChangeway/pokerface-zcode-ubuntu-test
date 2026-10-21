import type { CardSlot, CardType, SlotType } from "../card/types";
import type {
  Relation,
  RelationCreateInput,
  RelationDirection,
  RelationType,
  RelationValidationContext
} from "./types";
import { relationEndpointRules, type RelationEndpointKind } from "./endpointRules";

const childRelationTypes = new Set<RelationType>([
  "structure",
  "workload_split",
  "budget_split",
  "budget_compose"
]);

// score 关系（score_derive/score_reuse/score_adjust）的查询分类未决（D-095），不得默认归入 references。
const referenceRelationTypes = new Set<RelationType>([
  "workload_assign",
  "workload_share",
  "budget_assign",
  "budget_occupancy"
]);

export function createRelation(
  input: RelationCreateInput,
  context: RelationValidationContext
): Relation {
  if (!canCreateRelation(input, context)) {
    throw new Error(`Cannot create relation ${input.type} from ${input.sourceId} to ${input.targetId}`);
  }

  return {
    ...input,
    active: true
  };
}

export function deleteRelation(relations: Relation[], relationId: string): Relation[] {
  return relations.map((relation) =>
    relation.id === relationId ? { ...relation, active: false } : relation
  );
}

export function getRelationsForCard(
  relations: Relation[],
  cardId: string,
  direction: RelationDirection = "both"
): Relation[] {
  return relations.filter((relation) => {
    if (!relation.active) {
      return false;
    }

    if (direction === "source") {
      return relation.sourceId === cardId;
    }

    if (direction === "target") {
      return relation.targetId === cardId;
    }

    return relation.sourceId === cardId || relation.targetId === cardId;
  });
}

export function getChildren(relations: Relation[], cardId: string): Relation[] {
  return relations.filter(
    (relation) =>
      relation.active &&
      relation.sourceId === cardId &&
      childRelationTypes.has(relation.type)
  );
}

export function getReferences(relations: Relation[], cardId: string): Relation[] {
  return relations.filter(
    (relation) =>
      relation.active &&
      relation.targetId === cardId &&
      referenceRelationTypes.has(relation.type)
  );
}

/**
 * 检查给定的 sourceKind 和 targetKind 是否满足 relationType 的任意 endpoint 规则
 */
function checkEndpointRule(
  relationType: RelationType,
  sourceKind: RelationEndpointKind,
  targetKind: RelationEndpointKind
): boolean {
  const rules = relationEndpointRules[relationType];
  if (!rules || rules.length === 0) {
    return false;
  }
  return rules.some(
    (rule) => rule.sourceType === sourceKind && rule.targetType === targetKind
  );
}

export function canCreateRelation(
  input: Pick<Relation, "type" | "sourceId" | "targetId">,
  context: RelationValidationContext
): boolean {
  // 1. 自关联检查
  if (input.sourceId === input.targetId) {
    return false;
  }

  // 2. 重复关系检查
  const duplicate = context.existingRelations.some(
    (relation) =>
      relation.active &&
      relation.type === input.type &&
      relation.sourceId === input.sourceId &&
      relation.targetId === input.targetId
  );

  if (duplicate) {
    return false;
  }

  // 3. Endpoint 类型校验 - 必须显式存在于 endpointKinds 中
  const sourceKind = context.endpointKinds.get(input.sourceId);
  const targetKind = context.endpointKinds.get(input.targetId);

  // DEBUG: Log endpointKinds for troubleshooting
  if (process.env.NODE_ENV === 'test') {
    console.log('[DEBUG] canCreateRelation:', input.type, input.sourceId, input.targetId);
    console.log('[DEBUG] endpointKinds size:', context.endpointKinds.size);
    console.log('[DEBUG] sourceKind:', sourceKind, 'targetKind:', targetKind);
    if (context.endpointKinds.size < 10) {
      for (const [k, v] of context.endpointKinds.entries()) {
        console.log('[DEBUG]   ', k, '->', v);
      }
    }
  }

  if (!sourceKind || !targetKind) {
    // 端点不存在，拒绝创建
    return false;
  }

  // 4. 根据 endpointRules.ts 校验类型匹配
  if (!checkEndpointRule(input.type, sourceKind, targetKind)) {
    return false;
  }

  return true;
}

export function deriveAcceptedCardTypes(slotType: SlotType): CardType[] {
  return [slotType];
}

export function canAcceptCard(slot: CardSlot, cardType: CardType): boolean {
  return (
    slot.enabled &&
    !slot.locked &&
    deriveAcceptedCardTypes(slot.type).includes(cardType)
  );
}

const unitSlotRelationTypes = new Set<RelationType>(["structure"]);

const workloadSlotRelationTypes = new Set<RelationType>(["workload_assign", "workload_share"]);

export function getSlotMemberRelations(
  slot: Pick<CardSlot, "ownerCardId" | "type">,
  relations: Relation[]
): Relation[] {
  if (slot.type === "budget") {
    return relations.filter(
      (relation) =>
        relation.active &&
        relation.type === "budget_assign" &&
        relation.targetId === slot.ownerCardId
    );
  }

  const acceptedTypes = slot.type === "unit" ? unitSlotRelationTypes : workloadSlotRelationTypes;

  return relations.filter(
    (relation) =>
      relation.active &&
      relation.sourceId === slot.ownerCardId &&
      acceptedTypes.has(relation.type)
  );
}