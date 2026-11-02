import type { DataService } from "./DataService";
import type { AnyCard, UnitCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import type { Recommendation } from "../domain/recommendation/types";
import { recommendationStore } from "../stores/recommendationStore";
import { findUnitSplitMapping } from "../mock/mockUnitSplitMappings";
import { isBusinessRevoked } from "../domain/workload/revocationService";
import { createRelation } from "../domain/relation/relationService";
import type { RelationEndpointKind } from "../domain/relation/endpointRules";
import { submitDropAssignRelation } from "./ActionSubmissionService";
import { v4 as uuidv4 } from "uuid";

/**
 * W4：单元按"科室对应表"拆分（A-009 第二半 + A-011 模拟数据）
 *
 * 推荐确认流（不静默建事实——D-130/D-011 既有边界）：
 * 1. 单元卡拖入另一单元的 unit 槽 → structure 关系建立后查询映射表
 * 2. 存在映射 → 推荐面板显示"将拆分为：<名称>——确认创建并挂入？"
 * 3. 用户确认（confirm_unit_split）→ 创建新 UnitCard + structure 关系 + 挂入 unit 槽
 * 4. 用户不确认 → 推荐关闭，无任何事实创建
 */

/** structure 关系建立后查询映射表，如可拆分则注册推荐 */
export function checkAndRecommendUnitSplit(
  sourceUnitId: string,
  targetUnitId: string
): Recommendation | undefined {
  const mapping = findUnitSplitMapping(sourceUnitId, targetUnitId);
  if (!mapping) return undefined;

  const recommendationId = `rec-unit-split-${sourceUnitId}-${targetUnitId}`;
  const recommendation: Recommendation = {
    id: recommendationId,
    kind: "card",
    payload: {
      type: "unit_split",
      sourceUnitId,
      targetUnitId,
      newUnitName: mapping.newUnitName,
      newUnitKind: mapping.newUnitKind,
    },
    reason: `将拆分为：${mapping.newUnitName}——确认创建并挂入 ${targetUnitId} 的单元槽？`,
    status: "recommended",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    relatedEntityIds: [sourceUnitId, targetUnitId],
  };

  recommendationStore.getState().addRecommendation(recommendation);
  return recommendation;
}

/** 确认后的执行：创建新 UnitCard + structure 关系 + 挂入目标单元的 unit 槽 */
export async function executeUnitSplit(
  dataService: DataService,
  decision: {
    payload: {
      sourceUnitId: string;
      targetUnitId: string;
      newUnitName: string;
      newUnitKind: string;
    };
  }
): Promise<{ createdCardId: string; relationId: string } | { error: string }> {
  const { sourceUnitId, targetUnitId, newUnitName, newUnitKind } = decision.payload;

  const cards = await dataService.getCards();
  const relations = await dataService.getRelations();

  // 校验：源单元与目标单元都必须存在且非 revoked
  const sourceUnit = cards.find((c) => c.id === sourceUnitId && c.type === "unit");
  if (!sourceUnit || isBusinessRevoked(sourceUnit)) {
    return { error: `源单元 ${sourceUnitId} 不存在或已撤回` };
  }
  const targetUnit = cards.find((c) => c.id === targetUnitId && c.type === "unit");
  if (!targetUnit || isBusinessRevoked(targetUnit)) {
    return { error: `目标单元 ${targetUnitId} 不存在或已撤回` };
  }

  // 创建新 UnitCard（同名去重属产品化阶段优化，当前不拦截——不同 ID 同名卡会共存）
  const newCardId = `unit-${uuidv4()}`;
  const newCard: AnyCard = {
    id: newCardId,
    type: "unit",
    name: newUnitName,
    unitKind: newUnitKind as UnitCard["unitKind"],
    configurationState: "configured",
    attributes: {},
  };

  // 创建 structure 关系（方向：targetUnit=父 → newCard=子——deriveUnitHierarchy 约定）
  const endpointKinds = new Map<string, RelationEndpointKind>();
  for (const card of cards) {
    endpointKinds.set(card.id, card.type);
  }
  endpointKinds.set(newCardId, "unit");

  let relation: Relation;
  try {
    relation = createRelation(
      {
        id: uuidv4(),
        type: "structure",
        sourceId: targetUnitId,   // 父
        targetId: newCardId,       // 子
        metadata: { origin: "unit-split" },
      },
      { existingRelations: relations, endpointKinds }
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  // 持久化：先存新卡，再存关系（D-141：经 ActionSubmissionService 唯一持久化边界）
  try {
    await dataService.saveCards([newCard]);
    await submitDropAssignRelation(relation, dataService);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  return { createdCardId: newCardId, relationId: relation.id };
}
