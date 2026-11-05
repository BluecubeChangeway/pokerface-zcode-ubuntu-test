import type { DataService } from "./DataService";
import { createRelation } from "../domain/relation/relationService";
import type { Relation } from "../domain/relation/types";
import type { RelationEndpointKind } from "../domain/relation/endpointRules";
import { isBusinessRevoked } from "../domain/workload/revocation/revocationService";
import { resolveWorkloadToUnitAndRecommend } from "./resolutionTrigger";
import { submitMoveAssignRelation, submitUnassignRelation } from "./ActionSubmissionService";
import { recommendationStore } from "../stores/recommendationStore";
import { v4 as uuidv4 } from "uuid";

/**
 * 移动 / 解除关系运行时入口（R2；用户 2026-10-21 裁定，见
 * AGENT/DECISIONS-AND-ASSUMPTIONS.md A-002）：
 *
 * "当把一张卡从一个单元的'口袋'拖到另一个时，就相当于这张卡片解除了
 * 之前的关系又新建了关系。"——与 D-151 正文自带示例语义一致：
 *
 *   用户将 A 从 B 移到 C
 *     → A→B 发生有效关系变化
 *     → 旧当前反馈失效（不提示，D-151）
 *     → 自动 Resolution(A, C)（自动 ≠ 自动执行，D-151/D-140）
 *     → 用户决定是否执行新建议
 *
 * 语义边界：
 * - 解除 = 旧 workload_assign 软删除（active=false 同 ID upsert，行保留审计，
 *   与撤回的关系软删语义一致），不做物理删除；
 * - 新建 = P2-1 业务键幂等（目标端已有同键 active 关系 → 复用，不建第二条）；
 *   metadata.origin="move" 仅来源信息，不参与业务键（同 drop 语义）；
 * - 解除与新建经 ActionSubmissionService.submitMoveAssignRelation 一批持久化
 *   （D-141：唯一 save* 边界）；重试同一移动按当前事实收敛（软删 upsert + 业务键幂等）；
 * - 持久化成功后：①配对级失效——移除锚定为 (卡, fromUnit) 的 recommended
 *   resolution 反馈（D-151：关系已解除，当前反馈不保留、不提示）；accepted/
 *   ignored/dismissed 历史与非 resolution kind 不触碰（同 A① 边界）；
 *   ②对 (卡, toUnit) 自动重新 Resolution（复用 resolutionTrigger 生产入口，
 *   D-142 稳定 ID / re-offer，不新增推荐通道）；
 * - 移动不触碰任何统计事实（WorkloadResult / WorkloadSplit 不变）；
 * - 衍生卡与手工卡地位相同（用户裁定），本入口对二者不做区分；
 * - from 端无 active 关系时"解除"为 no-op、仍执行新建（视为纯指派）[假设 A-002 微决策]；
 * - 同单元移动（from === to）为 no-op，零变化；
 * - 无效参数（卡/Unit 不存在、revoked、类型不符）静默 ignored（对齐 AGENTS §20：
 *   不弹窗、不报错、不改已有关系）；Relation 创建失败（端点校验等）返回
 *   relation_failed，不产生任何写入；
 * - 自动重新 Resolution 阶段抛错时事实已提交——错误如实上抛（不回滚，
 *   无事务语义），重试同一移动入口即收敛。
 */

export type MoveRelationOutcome =
  | "moved"
  | "no_op_same_unit"
  | "relation_failed"
  | "ignored";

export interface MoveRelationResult {
  outcome: MoveRelationOutcome;
  /** 本次移动解除的旧关系（软删除后的状态，active=false）；无旧关系时为 undefined */
  deactivatedRelation?: Relation;
  /** 本次移动确立的目标端关系（新建行或被复用的既有 active 行） */
  relation?: Relation;
  /** 目标端关系是新建（persisted）还是幂等复用既有同键 active 行（reused） */
  relationOutcome?: "persisted" | "reused";
  /** 移动后自动重新 Resolution 的新配对（D-151 示例语义；始终为 (卡, toUnit)） */
  resubmittedResolution?: { workloadCardId: string; targetUnitId: string };
  /** 配对级失效移除的旧反馈 ID（D-151：关系已解除，当前反馈不保留） */
  invalidatedRecommendationIds: string[];
  /** relation_failed 时的错误信息 */
  error?: string;
}

/**
 * 配对级反馈失效（D-151）：移除锚定为 (workloadCardId, fromUnitId) 的当前
 * resolution 反馈（仅 kind=resolution 且 status=recommended）。
 * 实体双信号失效（A①）不适用本场景——移动不产生死亡实体，失效对象是
 * "依赖已解除关系的配对反馈"。accepted/ignored/dismissed 历史与其他配对
 * （含同卡其他 Unit 的反馈）不触碰。
 */
function invalidateMoveSourceFeedback(
  workloadCardId: string,
  fromUnitId: string
): string[] {
  const staleIds: string[] = [];
  for (const recommendation of recommendationStore.getState().recommendations) {
    if (recommendation.kind !== "resolution") continue;
    if (recommendation.status !== "recommended") continue;
    if (
      recommendation.relatedEntityIds?.[0] === workloadCardId &&
      recommendation.relatedEntityIds?.[1] === fromUnitId
    ) {
      staleIds.push(recommendation.id);
    }
  }
  const store = recommendationStore.getState();
  for (const id of staleIds) {
    store.removeRecommendation(id);
  }
  return staleIds;
}

/**
 * 把 WorkloadCard 的 workload_assign 从 fromUnit 移动到 toUnit。
 * UI 接线（从单元"口袋"拖出到另一单元的交互形态）属 UI 产品化阶段，
 * 受 docs/UI_DESIGN_OPERATING_CONTRACT.md 8-Gate 约束，不在本层实现。
 */
export async function moveWorkloadCardAssignment(
  dataService: DataService,
  workloadCardId: string,
  fromUnitId: string,
  toUnitId: string
): Promise<MoveRelationResult> {
  const empty: MoveRelationResult = { outcome: "ignored", invalidatedRecommendationIds: [] };

  if (fromUnitId === toUnitId) {
    return { outcome: "no_op_same_unit", invalidatedRecommendationIds: [] };
  }

  const [cards, relations] = await Promise.all([
    dataService.getCards(),
    dataService.getRelations(),
  ]);

  // D-154：revoked 卡 / Unit 业务世界中等同不存在——静默 ignored
  const workloadCard = cards.find(
    (c) => c.id === workloadCardId && c.type === "workload"
  );
  if (!workloadCard || isBusinessRevoked(workloadCard)) {
    return empty;
  }
  const fromUnit = cards.find((c) => c.id === fromUnitId && c.type === "unit");
  const toUnit = cards.find((c) => c.id === toUnitId && c.type === "unit");
  if (!fromUnit || isBusinessRevoked(fromUnit) || !toUnit || isBusinessRevoked(toUnit)) {
    return empty;
  }

  // 解除对象：fromUnit → 卡 的 active workload_assign（不存在时解除为 no-op）
  const oldAssign = relations.find(
    (r) =>
      r.active &&
      r.type === "workload_assign" &&
      r.sourceId === fromUnitId &&
      r.targetId === workloadCardId
  );
  const deactivatedRelation = oldAssign ? { ...oldAssign, active: false } : null;

  // 新建候选：目标端已有同键 active 关系 → 复用（P2-1 业务键幂等）；
  // 否则经 relationService.createRelation 创建（端点校验），origin="move" 不参与业务键
  const existingNewAssign = relations.find(
    (r) =>
      r.active &&
      r.type === "workload_assign" &&
      r.sourceId === toUnitId &&
      r.targetId === workloadCardId
  );
  let newRelation: Relation;
  if (existingNewAssign) {
    newRelation = existingNewAssign;
  } else {
    const endpointKinds = new Map<string, RelationEndpointKind>();
    for (const card of cards) {
      endpointKinds.set(card.id, card.type);
    }
    try {
      newRelation = createRelation(
        {
          id: uuidv4(),
          type: "workload_assign",
          sourceId: toUnitId,
          targetId: workloadCardId,
          metadata: { origin: "move" },
        },
        { existingRelations: relations, endpointKinds }
      );
    } catch (error) {
      return {
        outcome: "relation_failed",
        invalidatedRecommendationIds: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // 持久化（D-141：经 ActionSubmissionService 唯一持久化边界；一批保存 + 幂等兜底）
  const submission = await submitMoveAssignRelation(
    deactivatedRelation,
    newRelation,
    dataService
  );

  // 持久化成功后（D-151 时序）：① 旧配对反馈失效（不提示）② 新配对自动重新 Resolution
  const invalidatedRecommendationIds = invalidateMoveSourceFeedback(
    workloadCardId,
    fromUnitId
  );
  // 自动重新 Resolution 阶段异常如实上抛：关系事实已成立，不回滚、不静默吞掉
  // （同 dropTrigger 的 Resolution 阶段语义）；重试同一移动入口按当前事实收敛
  await resolveWorkloadToUnitAndRecommend(dataService, workloadCardId, toUnitId);

  return {
    outcome: "moved",
    deactivatedRelation: deactivatedRelation ?? undefined,
    relation: submission.relation,
    relationOutcome: submission.outcome,
    resubmittedResolution: { workloadCardId, targetUnitId: toUnitId },
    invalidatedRecommendationIds,
  };
}

/**
 * 解除关系运行时入口（A-002b，用户 2026-10-23 裁定：拖出槽外 = 解除，
 * 置于画布/卡牌盒 = 纯解除不建新关系）。
 *
 * 语义边界（与移动入口同族、互不合并）：
 * - 解除 = 旧 workload_assign 软删除（active=false 留痕审计，非物理删）；
 * - 解除后该配对无有效关系 → D-151 无可分析的有效业务上下文 → **不自动重推**
 *   （区别于移动：移动的新配对有有效关系，才触发自动重新 Resolution）；
 * - 配对级失效：移除锚定为 (卡, fromUnit) 的 recommended resolution 反馈
 *   （D-151：关系已解除，当前反馈不保留、不提示）；accepted/ignored/dismissed
 *   历史与非 resolution kind 不触碰（同 A①/移动边界）；
 * - 无该关系时为幂等 no-op（重复拖出/重试安全）；无效参数（卡/Unit 不存在、
 *   revoked）静默 ignored（对齐 AGENTS §20）。
 */
export async function unassignWorkloadCard(
  dataService: DataService,
  workloadCardId: string,
  fromUnitId: string
): Promise<{
  outcome: "unassigned" | "no_op" | "ignored";
  /** 被解除的关系（软删除后状态，active=false）；no-op/ignored 时为 undefined */
  deactivatedRelation?: Relation;
  /** 配对级失效移除的旧反馈 ID */
  invalidatedRecommendationIds: string[];
  error?: string;
}> {
  if (!workloadCardId || !fromUnitId) {
    return { outcome: "ignored", invalidatedRecommendationIds: [] };
  }
  const [cards, relations] = await Promise.all([
    dataService.getCards(),
    dataService.getRelations(),
  ]);
  // D-154：revoked 卡 / Unit 业务世界中等同不存在——静默 ignored
  const workloadCard = cards.find(
    (c) => c.id === workloadCardId && c.type === "workload"
  );
  if (!workloadCard || isBusinessRevoked(workloadCard)) {
    return { outcome: "ignored", invalidatedRecommendationIds: [] };
  }
  const fromUnit = cards.find((c) => c.id === fromUnitId && c.type === "unit");
  if (!fromUnit || isBusinessRevoked(fromUnit)) {
    return { outcome: "ignored", invalidatedRecommendationIds: [] };
  }

  // 无 active 关系 → 幂等 no-op（重复解除/重试安全）
  const activeAssign = relations.find(
    (r) =>
      r.active &&
      r.type === "workload_assign" &&
      r.sourceId === fromUnitId &&
      r.targetId === workloadCardId
  );
  if (!activeAssign) {
    return { outcome: "no_op", invalidatedRecommendationIds: [] };
  }

  const deactivatedRelation: Relation = { ...activeAssign, active: false };
  // 持久化（D-141：经 ActionSubmissionService 唯一持久化边界）
  await submitUnassignRelation(deactivatedRelation, dataService);

  // 持久化成功后：配对级失效（D-151：关系已解除不提示、不保留当前反馈）；
  // 无有效关系 → 不自动重推（见函数头注释）
  const invalidatedRecommendationIds = invalidateMoveSourceFeedback(
    workloadCardId,
    fromUnitId
  );

  return {
    outcome: "unassigned",
    deactivatedRelation,
    invalidatedRecommendationIds,
  };
}
