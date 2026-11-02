import type { Relation } from "../domain/relation/types";
import type { WorkloadResult, WorkloadSplit } from "../domain/workload/types";
import type { WorkloadCard } from "../domain/card/types";
import type { Recommendation, UserDecision } from "../domain/recommendation/types";
import type { SplitProvenanceRecord } from "../domain/workload/splitProvenance";
import { createRelation } from "../domain/relation/relationService";
import { createWorkloadSplit, type SplitExecutionInput, type SplitExecutionResult } from "../domain/workload/splitService";
import {
  batchSplitId,
  determineChildIdOwnership,
  workloadResultContentEquals,
} from "../domain/workload/splitService";
import { matchReusableChildren } from "../domain/workload/splitProvenance";
import { executeUnitSplit } from "./unitSplitService";
import {
  isBusinessRevoked,
  isWorkloadSplitRecordRevoked,
} from "../domain/workload/revocationService";
import { DefaultCapabilityProvider } from "./capabilityProvider";
import { v4 as uuidv4 } from "uuid";
import type { DataService } from "./DataService";
import { encodeIdComponent } from "../shared/idEncoding";

/**
 * ActionExecutorContext - 执行上下文
 * 包含查找/验证所需的现有 Domain Fact 与 Recommendation 容器
 */
export interface ActionExecutorContext {
  /** 现有关系列表，用于验证和查重 */
  existingRelations: Relation[];
  /**
   * 现有 Card 列表，用于查找和验证。
   * 最小接口：id、type、name、workloadResultId。
   * 足以区分 WorkloadCard（type === "workload"）并通过 workloadResultId 解析其引用的 WorkloadResult。
   */
  existingCards: Map<string, { id: string; type: string; name: string; workloadResultId?: string; businessStatus?: "active" | "revoked" }>;
  /** 当前正在解析的 WorkloadCard（用于确定 source UnitCard 等上下文信息） */
  workloadCard?: { id: string; type: string; name: string; workloadResultId?: string; businessStatus?: "active" | "revoked" };
  /** 现有 WorkloadResult 列表（统计事实，仅通过 WorkloadCard.workloadResultId 被业务引用） */
  existingWorkloadResults: Map<string, WorkloadResult>;
  /** 现有 WorkloadSplit 列表 */
  existingWorkloadSplits: Map<string, WorkloadSplit>;
  /** 现有 Recommendation 列表，用于 executeUserDecision lookup */
  recommendations: Map<string, Recommendation>;
  /** DataService 实例，用于持久化等操作（可选） */
  dataService?: DataService | null;
  /** Endpoint kind lookup: entityId -> endpoint kind (用于 Relation 验证) */
  endpointKinds?: Map<string, string>;
  // Capability 检查所需的额外 context（仅 executeAggregateDescendants 使用）
  resultSets?: Map<string, { id: string; snapshotId: string }>;
  snapshots?: { id: string; definition: { id: string; calculation?: { type?: string } } }[];
  workloadDefinitionMap?: Map<string, { id: string; calculation?: { type?: string } }>;
  workloadExecutionMap?: Map<string, { id: string }>;
}

/**
 * 待建立的 Split Relation 信息
 * 用于上层在创建 child WorkloadCard 后建立 workload_split Relation
 */
export interface PendingSplitRelation {
  /** 父 WorkloadCard ID */
  parentWorkloadCardId: string;
  /** 子 WorkloadResult ID（由 splitService 生成） */
  childWorkloadResultId: string;
}

export interface ActionExecutorResult {
  /** 是否成功 */
  success: boolean;
  /** 创建的 Relation 列表 */
  createdRelations: Relation[];
  /** 创建/更新的 WorkloadResult 列表 */
  createdWorkloadResults: WorkloadResult[];
  /** 创建的 WorkloadSplit 列表 */
  createdWorkloadSplits: WorkloadSplit[];
  /** 待建立的 Split Relation（需要 child WorkloadCard 创建后由上层建立） */
  pendingSplitRelations?: PendingSplitRelation[];
  /** 本次 Split 执行批次标识（H-2 / D-145 / D-146：供持久化边界做跨 execution 身份兜底检查） */
  executionBatchId?: string;
  /** 重试时复用的子结果 ID 列表（同一批次重试） */
  reusedChildResultIds?: string[];
  /** R3 溯源复用的子结果 ID 列表（跨批次复用，D-157 规则 B：同条件跨推荐复用） */
  r3ReusedChildResultIds?: string[];
  /** unit_split 确认创建的 UnitCard 列表 */
  createdCards?: { id: string; type: string; name: string; configurationState: string }[];
  /** unit_split 确认创建的 structure Relation ID 列表 */
  relationIds?: string[];
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 执行 use_existing_result 推荐
 * 
 * 语义：创建 workload_assign Relation（UnitCard -> WorkloadCard）
 * - sourceUnitId 是用户选择的 UnitCard ID
 * - targetWorkloadCardId：优先使用 decision.targetWorkloadCardId（confirm_use_current useCurrent=true），其次使用 recommendation.payload.targetWorkloadCardId
 * - 不创建 WorkloadResult，不创建 WorkloadSplit
 * - 只创建 workload_assign Relation
 */
export function executeUseExistingResult(
  recommendationId: string,
  decision: UserDecision,
  context: ActionExecutorContext
): ActionExecutorResult {
  const recommendation = context.recommendations.get(recommendationId);
  if (!recommendation) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Recommendation not found: ${recommendationId}`
    };
  }

  // 1. 获取推荐载荷中的 targetWorkloadCardId
  const targetWorkloadCardIdFromPayload = (recommendation.payload as any)?.targetWorkloadCardId;
  if (!targetWorkloadCardIdFromPayload && !decision.targetWorkloadCardId) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: "Missing targetWorkloadCardId in recommendation payload and decision"
    };
  }

  // 2. 确定最终目标 WorkloadCard ID（优先 decision，其次 payload）
  const finalTargetWorkloadCardId = decision.targetWorkloadCardId || targetWorkloadCardIdFromPayload!;

  // 3. 验证最终目标 WorkloadCard 存在
  const targetWorkloadCard = context.existingCards.get(finalTargetWorkloadCardId);
  if (!targetWorkloadCard || targetWorkloadCard.type !== "workload") {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Target WorkloadCard ${finalTargetWorkloadCardId} not found or not a WorkloadCard`
    };
  }
  // 3.5 确认安全检查（D-154，2026-10-10）：revoked 卡在业务世界中等同不存在，
  //     不得仅因记录仍在存储中就允许确认——目标卡已撤回时拒绝，不算放宽其他校验。
  if (isBusinessRevoked(targetWorkloadCard)) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Target WorkloadCard ${finalTargetWorkloadCardId} 已被撤回（businessStatus=revoked，D-154：业务世界中等同不存在），不得确认`
    };
  }

  // 4. 获取 source UnitCard（来自 decision.sourceUnitId）
  const sourceUnitId = decision.sourceUnitId;
  if (!sourceUnitId) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: "Missing sourceUnitId in decision"
    };
  }

  // 5. 验证 source UnitCard 存在
  const sourceUnitCard = context.existingCards.get(sourceUnitId);
  if (!sourceUnitCard || sourceUnitCard.type !== "unit") {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Source UnitCard ${sourceUnitId} not found or not a UnitCard`
    };
  }

  // 6. Q-09-C P2-1 裁定 B（2026-10-04）：workload_assign 业务键幂等复用。
  // 业务键 = active + type + Unit(sourceId) + Workload(targetId)；
  // RecommendationId / UserDecision 不参与业务键（Recommendation 只是产生该事实的操作来源）。
  // 已存在同键 active Relation 时不再返回 "already exists" 失败，而是复用已有 Relation：
  // 首次持久化部分成功后的 retry 可正常收敛，Recommendation 可达 accepted。
  // 检查必须针对最终目标。
  const existingAssign = context.existingRelations.find(
    (r) =>
      r.active &&
      r.type === "workload_assign" &&
      r.sourceId === sourceUnitId &&
      r.targetId === finalTargetWorkloadCardId
  );
  if (existingAssign) {
    // 复用：不创建第二条；createdRelations 携带已有 Relation，
    // 上层持久化时按同 ID upsert（同一行），Recommendation 可正常 accepted
    return {
      success: true,
      createdRelations: [existingAssign],
      createdWorkloadResults: [],
      createdWorkloadSplits: []
    };
  }

  // 7. 创建 workload_assign Relation
  const relation = createRelation({
    id: uuidv4(),
    type: "workload_assign",
    sourceId: sourceUnitId,
    targetId: finalTargetWorkloadCardId,
    metadata: {
      recommendationId,
      userDecision: "use_existing_result"
    }
  }, {
    existingRelations: context.existingRelations,
    endpointKinds: context.endpointKinds || new Map()
  });

  return {
    success: true,
    createdRelations: [relation],
    createdWorkloadResults: [],
    createdWorkloadSplits: []
  };
}

/**
 * 执行 use_existing_result_with_confirmation 推荐
 * 
 * 语义：与 use_existing_result 相同，创建 workload_assign Relation
 * 区别仅在于推荐类型：用户确认复用已有结果
 */
export function executeUseExistingResultWithConfirmation(
  recommendationId: string,
  decision: UserDecision,
  context: ActionExecutorContext
): ActionExecutorResult {
  // 复用 use_existing_result 的逻辑
  return executeUseExistingResult(recommendationId, decision, context);
}

/**
 * 执行 find_existing_workload 推荐
 * 
 * 语义：使用已有的 parent WorkloadCard（通过 workload_assign 关联）
 * - sourceUnitId 是用户选择的 UnitCard ID
 * - targetWorkloadCardId 来自 recommendation.payload.targetWorkloadCardId（父级 WorkloadCard）
 * - 创建 workload_assign Relation（UnitCard -> 父级 WorkloadCard）
 */
export function executeFindExistingWorkload(
  recommendationId: string,
  decision: UserDecision,
  context: ActionExecutorContext
): ActionExecutorResult {
  const recommendation = context.recommendations.get(recommendationId);
  if (!recommendation) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Recommendation not found: ${recommendationId}`
    };
  }

  // 1. 获取 target parent WorkloadCard（来自 recommendation.payload）
  const targetWorkloadCardId = (recommendation.payload as any)?.targetWorkloadCardId;
  if (!targetWorkloadCardId) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: "Missing targetWorkloadCardId in recommendation payload"
    };
  }

  // 2. 验证 target parent WorkloadCard 存在
  const targetWorkloadCard = context.existingCards.get(targetWorkloadCardId);
  if (!targetWorkloadCard || targetWorkloadCard.type !== "workload") {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Target parent WorkloadCard ${targetWorkloadCardId} not found or not a WorkloadCard`
    };
  }
  // 2.5 确认安全检查（D-154，2026-10-10）：目标父卡已撤回 → 拒绝确认
  if (isBusinessRevoked(targetWorkloadCard)) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Target parent WorkloadCard ${targetWorkloadCardId} 已被撤回（businessStatus=revoked，D-154：业务世界中等同不存在），不得确认`
    };
  }

  // 3. 获取 source UnitCard（来自 decision.sourceUnitId）
  const sourceUnitId = decision.sourceUnitId;
  if (!sourceUnitId) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: "Missing sourceUnitId in decision"
    };
  }

  // 4. 验证 source UnitCard 存在
  const sourceUnitCard = context.existingCards.get(sourceUnitId);
  if (!sourceUnitCard || sourceUnitCard.type !== "unit") {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Source UnitCard ${sourceUnitId} not found or not a UnitCard`
    };
  }

  // 5. Q-09-C P2-1 裁定 B：workload_assign 业务键幂等复用（与 executeUseExistingResult 同一业务键）。
  // 已存在同键 active Relation 时复用而非失败，retry 可收敛。
  const existingAssign = context.existingRelations.find(
    (r) =>
      r.active &&
      r.type === "workload_assign" &&
      r.sourceId === sourceUnitId &&
      r.targetId === targetWorkloadCardId
  );
  if (existingAssign) {
    // 复用：不创建第二条；上层按同 ID upsert，Recommendation 可正常 accepted
    return {
      success: true,
      createdRelations: [existingAssign],
      createdWorkloadResults: [],
      createdWorkloadSplits: []
    };
  }

  // 6. 创建 workload_assign Relation
  const relation = createRelation({
    id: uuidv4(),
    type: "workload_assign",
    sourceId: sourceUnitId,
    targetId: targetWorkloadCardId,
    metadata: {
      recommendationId,
      userDecision: "find_existing_workload"
    }
  }, {
    existingRelations: context.existingRelations,
    endpointKinds: context.endpointKinds || new Map()
  });

  return {
    success: true,
    createdRelations: [relation],
    createdWorkloadResults: [],
    createdWorkloadSplits: []
  };
}

/**
 * 执行 confirm_aggregate_children 推荐（stub，待后续任务实现）
 */
export function executeConfirmAggregateChildren(
  recommendationId: string,
  decision: UserDecision,
  context: ActionExecutorContext
): ActionExecutorResult {
  return {
    success: false,
    createdRelations: [],
    createdWorkloadResults: [],
    createdWorkloadSplits: [],
    error: "Not implemented: executeConfirmAggregateChildren"
  };
}

/**
 * 执行 create_new_workload 推荐（stub，待后续任务实现）
 */
export function executeCreateNewWorkload(
  recommendationId: string,
  context: ActionExecutorContext
): ActionExecutorResult {
  return {
    success: false,
    createdRelations: [],
    createdWorkloadResults: [],
    createdWorkloadSplits: [],
    error: "Not implemented: executeCreateNewWorkload"
  };
}

/**
 * 执行 split_workload 推荐
 * 
 * 实现语义（严格遵守 Q-09-A/Q-09-C 决策）：
 * 1. 从 decision.splitParameters 获取正式执行参数
 *    （Q-09-C 裁定 A 2026-10-04：recommendation.payload.splitPlan 仅为推荐/展示层建议，
 *     缺失 splitParameters 时明确失败，不得回退到 recommendation payload）
 * 2. 确定 parent WorkloadCard：必须来自 context.workloadCard（当前 Resolution/Action Context）
 *    sourceUnitId 在 confirm_split 中是 UnitCard ID，不参与 parent WorkloadCard 判断
 * 3. 验证 context.workloadCard.workloadResultId 与 splitParameters.parentResultId 匹配
 * 4. 验证 Parent WorkloadResult 存在
 * 5. 调用 createWorkloadSplit 创建 child WorkloadResult（统计事实）和 WorkloadSplit
 * 6. 返回待建立的 workload_split Relation 信息，由上层在创建 child WorkloadCard 后完成
 * 
 * 注意：不再要求 child WorkloadResult/Card 预先存在。
 * child WorkloadResult 由 splitService 生成，child WorkloadCard 由上层 orchestration 创建。
 */
export async function executeSplitWorkload(
  recommendationId: string,
  decision: UserDecision,
  context: ActionExecutorContext
): Promise<ActionExecutorResult> {
  const recommendation = context.recommendations.get(recommendationId);
  if (!recommendation) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Recommendation not found: ${recommendationId}`
    };
  }

  // 1. 获取 parent WorkloadCard：必须来自 context.workloadCard
  // sourceUnitId 在 confirm_split 中是 UnitCard ID，不参与 parent WorkloadCard 判断
  const parentWorkloadCard = context.workloadCard;
  if (!parentWorkloadCard) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: "Missing context.workloadCard (parent WorkloadCard for split)"
    };
  }
  if (parentWorkloadCard.type !== "workload") {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `context.workloadCard is not a WorkloadCard (type: ${parentWorkloadCard.type})`
    };
  }
  // 确认安全检查（D-154，2026-10-10）：拆分主体卡已撤回 → 拒绝确认
  //（revoked 卡在业务世界中等同不存在，不得在其上创建任何派生事实）
  if (isBusinessRevoked(parentWorkloadCard)) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `context.workloadCard（${parentWorkloadCard.id}）已被撤回（businessStatus=revoked，D-154：业务世界中等同不存在），不得确认拆分`
    };
  }
  const parentWorkloadCardId = parentWorkloadCard.id;

  // 2. 验证 parent WorkloadCard 有 workloadResultId
  const parentResultId = parentWorkloadCard.workloadResultId;
  if (!parentResultId) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Parent WorkloadCard ${parentWorkloadCardId} has no workloadResultId`
    };
  }

  // 3. 验证 parent WorkloadCard.workloadResultId 与 splitParameters.parentResultId 匹配
  // Q-09-C 裁定 A（2026-10-04）：Recommendation.payload.splitPlan 仅是推荐/展示层建议，
  // 不是正式执行参数。confirm_split 必须由 UserDecision 自身携带完整、明确的 splitParameters；
  // 缺失时明确失败，不得回退到 recommendation payload。
  const splitParameters = decision.splitParameters;
  if (!splitParameters) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: "Missing splitParameters: confirm_split requires UserDecision.splitParameters (recommendation payload splitPlan is advisory only and must NOT be used as execution parameters)"
    };
  }
  if (splitParameters.parentResultId !== parentResultId) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Parent Result ID mismatch: context.workloadCard.workloadResultId=${parentResultId}, splitParameters.parentResultId=${splitParameters.parentResultId}`
    };
  }

  // 4. 验证 Parent WorkloadResult 存在
  const parentResult = context.existingWorkloadResults.get(parentResultId);
  if (!parentResult) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Parent WorkloadResult ${parentResultId} not found`
    };
  }
  // 确认安全检查（D-154，2026-10-10）：拆分父 Result 已撤回 → 拒绝确认
  //（revoked 统计事实在业务世界中等同不存在，不得作为拆分父对象）
  if (isBusinessRevoked(parentResult)) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Parent WorkloadResult ${parentResultId} 已被撤回（businessStatus=revoked，D-154：业务世界中等同不存在），不得确认拆分`
    };
  }

  // 5. R3：溯源复用匹配（D-157 规则 B）——在调用 splitService 前，先查找可复用的既有子结果
  // 从 context 的 SplitProvenance 记录中匹配与拟拆分条件一致的既有产物
  const reusableChildIds: (string | undefined)[] = [];
  if (context.dataService) {
    try {
      const provenances = await context.dataService.getSplitProvenances();
      const existingResultsMap = new Map(
        [...context.existingWorkloadResults.entries()].map(([id, r]) => [id, r])
      );
      const matches = matchReusableChildren({
        provenanceRecords: provenances,
        // 排除本批次自己的溯源记录（retry 一致性由专用路径保证，不走匹配）
        excludeRecordId: `${decision.recommendationId}::${decision.decidedAt}`,
        origin: {
          parentWorkloadResultId: parentResultId,
          resultSetId: parentResult.resultSetId,
        },
        existingResults: existingResultsMap,
        children: splitParameters.children.map((child) => ({
          resultSetId: child.resultSetId,
          resultItemId: child.resultItemId,
          value: child.value,
          dimensions: child.dimensions,
          period: child.period ?? parentResult.period,
        })),
      });
      // 应用匹配结果：命中的复用既有 ID，未命中的留空（由 splitService 生成新 ID）
      for (let i = 0; i < matches.length; i++) {
        if (matches[i] !== undefined) {
          reusableChildIds[i] = matches[i];
        }
      }
    } catch {
      // 预览失败不阻塞执行，执行时以实时事实为准（D-157 规则 B）
    }
  }

  // 构建 SplitExecutionInput，注入复用的 child ID
  const childrenForSplit = splitParameters.children.map((child: { id?: string; name: string; value: number | null; dimensions: Record<string, string>; resultSetId: string; resultItemId: string }, index: number) => ({
    id: reusableChildIds[index] ?? child.id, // 优先使用溯源匹配的既有 ID，其次用显式传入的 ID
    name: child.name,
    value: child.value,
    dimensions: child.dimensions,
    resultSetId: child.resultSetId,
    resultItemId: child.resultItemId
  }));
  
  const splitInput: SplitExecutionInput = {
    parentResultId: parentResultId,
    children: childrenForSplit,
    splitType: splitParameters.splitType || "partial",
    reason: splitParameters.reason,
    // Q-09-C 裁定②：以 UserDecision 身份（recommendationId + decidedAt）作为执行批次标识——
    // 同一决策 retry → 相同批次 → 相同 WorkloadSplit / child ID（幂等）；
    // 不同决策（含 D-142 后同一 recommendation 的再次决策）→ 不同批次 → 互不覆盖
    executionBatchId: `${decision.recommendationId}::${decision.decidedAt}`,
  };

  let splitResult: SplitExecutionResult;
  try {
    splitResult = createWorkloadSplit(splitInput, parentResult);
  } catch (e) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: e instanceof Error ? e.message : String(e)
    };
  }

  // 6. H-2（D-145/D-146）：显式 child Result ID 的跨 execution 身份检查。
  // 显式 ID + 批次生成型 ID 都需检查（批次生成型 ID 由批次锚定，但需防止物理删除后的复活——D-155/D-158）。
  // 三分支：current → 本执行 retry 幂等；other → 拒绝（不论内容）；
  // unknown（部分失败窗口）→ exact-content 全同 → 幂等恢复；有差异 → 拒绝。
  const executionBatchId = `${decision.recommendationId}::${decision.decidedAt}`;
  const explicitChildren = splitParameters.children.filter((child: { id?: string }) => Boolean(child.id));
  // 构造所有子结果的期望 Split ID（包括显式与批次生成型）
  const expectedSplitIds = splitResult.childResults.map((childResult) =>
    batchSplitId(parentResultId, executionBatchId, childResult.id)
  );
  // 对所有子结果（显式 + 批次生成）执行撤回终结判定（D-155/D-158）
  // 必须在"Result 不存在则跳过"之前执行——Result 被物理删除后终结证据由保留的 WorkloadSplit 标记承担
  // D-158 规则 2：终结证据在 WorkloadSplit 记录，需检查同一 executionBatchId 的任何 split 是否已 revoked
  const batchSplitPrefix = `${parentResultId}-split-${encodeIdComponent(executionBatchId)}-`;
  for (const childResult of splitResult.childResults) {
    const childExpectedSplitId = batchSplitId(parentResultId, executionBatchId, childResult.id);
    const childSplitRecord = [...context.existingWorkloadSplits.values()].find(
      (split) => split.id === childExpectedSplitId
    );
    if (childSplitRecord && isWorkloadSplitRecordRevoked(childSplitRecord)) {
      return {
        success: false,
        createdRelations: [],
        createdWorkloadResults: [],
        createdWorkloadSplits: [],
        error: `executionBatch 已被撤回终结（WorkloadSplit ${childExpectedSplitId} 已标记 revoked），不得复活已撤回的 Split 事实（D-155）`
      };
    }
  }
  // 额外检查：同一 executionBatchId 的其他 split 是否已被标记 revoked（D-158 规则 2：物理删除后终结证据在 split 记录）
  // 这处理了 childResult 物理删除后生成新 ID 的场景
  const anyBatchSplitRevoked = [...context.existingWorkloadSplits.values()].some(
    (split) => split.id.startsWith(batchSplitPrefix) && isWorkloadSplitRecordRevoked(split)
  );
  if (anyBatchSplitRevoked) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `executionBatch 已被撤回终结（批次 ${executionBatchId} 下存在已标记 revoked 的 WorkloadSplit），不得复活已撤回的 Split 事实（D-155/D-158）`
    };
  }
  // 对显式 child ID 执行跨 execution 身份检查（D-145/D-146）
  if (explicitChildren.length > 0) {
    for (const child of explicitChildren) {
      const existing = context.existingWorkloadResults.get(child.id!);
      if (!existing) continue; // 1. 不存在 → 正常创建（撤回终结检查已在上方先行）
      if (isBusinessRevoked(existing)) {
        return {
          success: false,
          createdRelations: [],
          createdWorkloadResults: [],
          createdWorkloadSplits: [],
          error: `child WorkloadResult ${child.id} 已被撤回终结（businessStatus=revoked），该 executionBatch 不得经 retry 复活（D-155）`
        };
      }
      const ownership = determineChildIdOwnership(
        [...context.existingWorkloadSplits.values()],
        child.id!,
        expectedSplitIds
      );
      if (ownership === "other") {
        // 3. 已明确属于其他 execution → 拒绝（不论内容）
        return {
          success: false,
          createdRelations: [],
          createdWorkloadResults: [],
          createdWorkloadSplits: [],
          error: `child WorkloadResult ID ${child.id} 已属于其他 execution，禁止跨 execution 复用`
        };
      }
      // 4. current / unknown 都必须执行 exact-content 判定（P1 修复 2026-10-05）：
      //    同一 execution identity 下不得提交另一份不同内容（D-144 规则 2）。
      //    current + 全同 → 幂等 retry；unknown + 全同 → 幂等恢复（D-146）；任一差异 → 拒绝。
      const candidate = splitResult.childResults.find((r) => r.id === child.id);
      if (!candidate || !workloadResultContentEquals(existing, candidate)) {
        return {
          success: false,
          createdRelations: [],
          createdWorkloadResults: [],
          createdWorkloadSplits: [],
          error: `已有 child WorkloadResult ${child.id} 内容与当前 execution 不一致，不允许使用相同 identity 覆盖旧统计事实`
        };
      }
      // 内容完全一致 → 幂等（current：retry；unknown：恢复），继续
    }
  }

  // 7. 构造待建立的 Split Relation 信息
  // 顺序与 splitResult.childResults 对应
  const pendingSplitRelations: PendingSplitRelation[] = splitResult.childResults.map((childResult) => ({
    parentWorkloadCardId,
    childWorkloadResultId: childResult.id,
  }));

// 7. 所有验证通过，构造返回结果
  // ActionExecutor 不直接修改 context 中的持久化事实集合
  // 由上层 ActionSubmissionService / DataService 负责持久化
  // Track which child results were reused (not newly created)
  const reusedChildResultIds: string[] = [];
  for (const childResult of splitResult.childResults) {
    const existing = context.existingWorkloadResults.get(childResult.id);
    if (existing && !isBusinessRevoked(existing)) {
      // Check if it was already present (not newly created)
      const wasExisting = context.existingWorkloadResults.has(childResult.id);
      if (wasExisting) {
        reusedChildResultIds.push(childResult.id);
      }
    }
  }

  const createdWorkloadResults: WorkloadResult[] = splitResult.childResults;
  const createdWorkloadSplits: WorkloadSplit[] = splitResult.workloadSplits;

  // R3 溯源复用的子结果 ID（跨批次复用，D-157 规则 B：同条件跨推荐复用）
  const r3ReusedChildResultIds = reusableChildIds.filter((id): id is string => id !== undefined);

  return {
    success: true,
    createdRelations: [],
    createdWorkloadResults,
    createdWorkloadSplits,
    pendingSplitRelations,
    executionBatchId,
    reusedChildResultIds,
    r3ReusedChildResultIds,
  };
}

/**
 * 执行 aggregate_descendants 推荐
 * 
 * 聚合语义约束（D-137, D-138, D-139）：
 * - 聚合必须遵循被聚合 Workload 原有的统计定义（不硬编码 SUM）
 * - 聚合结果必须能追溯到实际参与聚合的下级 Workload Result
 * - 聚合结果若需正式继续使用，最终需对应 WorkloadCard（但 Card 创建由上层负责）
 * 
 * 原子性：
 * 任何前置校验失败时：不修改 context.existingWorkloadResults / existingWorkloadSplits / existingRelations
 * 只有全部前置条件通过后，才执行聚合创建并一次性提交
 */
export function executeAggregateDescendants(
  recommendationId: string,
  decision: UserDecision,
  context: ActionExecutorContext
): ActionExecutorResult {
  const recommendation = context.recommendations.get(recommendationId);
  if (!recommendation) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Recommendation not found: ${recommendationId}`
    };
  }

  // 1. 获取 parent WorkloadCard：必须来自 context.workloadCard
  // sourceUnitId 在 confirm_aggregate 中是 UnitCard ID，不参与 parent WorkloadCard 判断
  const parentWorkloadCard = context.workloadCard;
  if (!parentWorkloadCard) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: "Missing context.workloadCard (parent WorkloadCard for aggregate)"
    };
  }
  if (parentWorkloadCard.type !== "workload") {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `context.workloadCard is not a WorkloadCard (type: ${parentWorkloadCard.type})`
    };
  }
  const parentWorkloadCardId = parentWorkloadCard.id;

  // 2. 验证 parent WorkloadCard 有 workloadResultId
  const parentResultId = parentWorkloadCard.workloadResultId;
  if (!parentResultId) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Parent WorkloadCard ${parentWorkloadCardId} has no workloadResultId`
    };
  }

  // 3. 获取并验证 Parent WorkloadResult 存在
  const parentResult = context.existingWorkloadResults.get(parentResultId);
  if (!parentResult) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Parent WorkloadResult ${parentResultId} not found`
    };
  }

  // 4. 获取用户明确选择的 child Result IDs
  const selectedChildResultIds = decision.selectedChildResultIds;
  if (!selectedChildResultIds || selectedChildResultIds.length === 0) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: "Missing selectedChildResultIds: at least one child must be selected"
    };
  }

  // 5. 验证每个 child Result 存在
  const childResults: WorkloadResult[] = [];
  for (const childResultId of selectedChildResultIds) {
    const childResult = context.existingWorkloadResults.get(childResultId);
    if (!childResult) {
      return {
        success: false,
        createdRelations: [],
        createdWorkloadResults: [],
        createdWorkloadSplits: [],
        error: `Child WorkloadResult ${childResultId} not found`
      };
    }
    if (childResult.value === null) {
      return {
        success: false,
        createdRelations: [],
        createdWorkloadResults: [],
        createdWorkloadSplits: [],
        error: `Child WorkloadResult ${childResultId} has null value, cannot aggregate`
      };
    }
    childResults.push(childResult);
  }

  // 6. 解析每个 child Result 到对应的 WorkloadCard，并验证 workloadResultId 匹配
  const childWorkloadCardIds: string[] = [];
  for (const childResult of childResults) {
    let childWorkloadCardId: string | undefined;
    for (const [cardId, card] of context.existingCards.entries()) {
      if (card.type === "workload" && card.workloadResultId === childResult.id) {
        childWorkloadCardId = cardId;
        break;
      }
    }

    if (!childWorkloadCardId) {
      return {
        success: false,
        createdRelations: [],
        createdWorkloadResults: [],
        createdWorkloadSplits: [],
        error: `Child WorkloadCard for WorkloadResult ${childResult.id} not found. Must create child WorkloadCard first.`
      };
    }

    // 验证 child WorkloadCard 的 workloadResultId 与 child Result ID 一致
    const childWorkloadCard = context.existingCards.get(childWorkloadCardId);
    if (!childWorkloadCard || childWorkloadCard.workloadResultId !== childResult.id) {
      return {
        success: false,
        createdRelations: [],
        createdWorkloadResults: [],
        createdWorkloadSplits: [],
        error: `Child WorkloadCard ${childWorkloadCardId} workloadResultId mismatch with child Result ${childResult.id}`
      };
    }

    childWorkloadCardIds.push(childWorkloadCardId);
  }

  // 7. 预检查所有 workload_split Relation 是否已存在（避免重复）
  for (let i = 0; i < childWorkloadCardIds.length; i++) {
    const childWorkloadCardId = childWorkloadCardIds[i];
    const duplicate = context.existingRelations.some(
      (r) =>
        r.active &&
        r.type === "workload_split" &&
        r.sourceId === parentWorkloadCardId &&
        r.targetId === childWorkloadCardId
    );
    if (duplicate) {
      return {
        success: false,
        createdRelations: [],
        createdWorkloadResults: [],
        createdWorkloadSplits: [],
        error: `workload_split already exists between ${parentWorkloadCardId} and ${childWorkloadCardId}`
      };
    }
  }

  // 8. 获取 aggregation 类型：partial 还是 complete
  // 从 recommendation.payload.aggregatePlan 获取 isPartial
  const isPartial = (recommendation.payload as any)?.aggregatePlan?.isPartial ?? true;

  // 8.5 重新验证执行能力 - ActionExecutor 必须在执行前重新验证
  // 推荐时的 executionFeasibility 仅为快照，执行时必须重新验证
  const capabilityProvider = new DefaultCapabilityProvider();
  capabilityProvider.setContext(context);
  
  // 获取 parent WorkloadCard 对应的 definitionId
  let definitionId: string | undefined;
  if (parentWorkloadCard.workloadResultId) {
    const parentResult = context.existingWorkloadResults.get(parentWorkloadCard.workloadResultId);
    if (parentResult && context.resultSets && context.snapshots && context.workloadDefinitionMap && context.workloadExecutionMap) {
      const parentResultSet = context.resultSets.get(parentResult.resultSetId);
      if (parentResultSet) {
        const snapshot = context.snapshots.find(s => s.id === parentResultSet.snapshotId);
        if (snapshot) {
          definitionId = snapshot.definition.id;
        }
      }
    }
  }

  if (definitionId) {
    const capability = capabilityProvider.assess({
      actionType: "aggregate",
      definitionId,
      selectedResultIds: selectedChildResultIds,
      isPartial
    });

    if (!capability.executable) {
      return {
        success: false,
        createdRelations: [],
        createdWorkloadResults: [],
        createdWorkloadSplits: [],
        error: capability.reason || "当前系统无法执行 Aggregate：执行能力不可用"
      };
    }
  } else {
    // 缺少必要的 context 信息（resultSets, snapshots 等），无法评估执行能力
    // 直接返回架构不支持的错误
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: "当前架构无法安全执行 Aggregate：缺少原始数据、Definition、Execution、CalculationGraph 以遵循原有统计定义。请由上层提供合法的 Aggregate Result（含合法的 ResultSet/ResultItem）后再执行。"
    };
  }
  
  // 当前架构不支持直接执行 Aggregate - 返回错误要求上层提供合法的 Aggregate Result
  return {
    success: false,
    createdRelations: [],
    createdWorkloadResults: [],
    createdWorkloadSplits: [],
    error: "当前架构无法安全执行 Aggregate：缺少原始数据、Definition、Execution、CalculationGraph 以遵循原有统计定义。请由上层提供合法的 Aggregate Result（含合法的 ResultSet/ResultItem）后再执行。"
  };
}

/**
 * 处理 cancel/dismiss - 只是更新 recommendation 状态，不创建 Domain Fact
 */
export function handleCancelOrDismiss(
  recommendationId: string,
  action: "cancel" | "dismiss",
  rejectionReason: string | undefined,
  context: ActionExecutorContext
): ActionExecutorResult {
  return {
    success: true,
    createdRelations: [],
    createdWorkloadResults: [],
    createdWorkloadSplits: [],
    error: undefined
  };
}

/**
 * 用户决策分发器 - 根据 action 类型分发到对应的执行函数
 */
export async function executeUserDecision(
  decision: UserDecision,
  context: ActionExecutorContext
): Promise<ActionExecutorResult> {
  const recommendation = context.recommendations.get(decision.recommendationId);
  if (!recommendation) {
    return {
      success: false,
      createdRelations: [],
      createdWorkloadResults: [],
      createdWorkloadSplits: [],
      error: `Recommendation not found: ${decision.recommendationId}`
    };
  }

  const action = decision.action;

  switch (action) {
    case "confirm_use_existing":
      return executeUseExistingResult(decision.recommendationId, decision, context);
    case "confirm_use_current":
      // confirm_use_current 语义明确：必须使用当前 WorkloadCard（useCurrent=true）
      // useCurrent=false 时直接失败，不 fallback 到 executeUseExistingResult
      if (!decision.useCurrent) {
        return {
          success: false,
          createdRelations: [],
          createdWorkloadResults: [],
          createdWorkloadSplits: [],
          error: "confirm_use_current requires useCurrent=true"
        };
      }
      if (!context.workloadCard) {
        return {
          success: false,
          createdRelations: [],
          createdWorkloadResults: [],
          createdWorkloadSplits: [],
          error: "confirm_use_current requires context.workloadCard"
        };
      }
      const modifiedDecision = { ...decision, targetWorkloadCardId: context.workloadCard.id };
      return executeUseExistingResult(decision.recommendationId, modifiedDecision, context);
    case "confirm_use_existing_parent":
      return executeFindExistingWorkload(decision.recommendationId, decision, context);
    case "confirm_split":
      return executeSplitWorkload(decision.recommendationId, decision, context);
    case "confirm_unit_split":
      const rec = context.recommendations.get(decision.recommendationId);
      if (!rec) {
        return {
          success: false,
          createdRelations: [],
          createdWorkloadResults: [],
          createdWorkloadSplits: [],
          error: `Recommendation not found: ${decision.recommendationId}`
        };
      }
      // Build decision payload from recommendation payload for executeUnitSplit
      const unitSplitPayload = rec.payload as { sourceUnitId: string; targetUnitId: string; newUnitName: string; newUnitKind: string };
      const enhancedDecision = {
        ...decision,
        payload: unitSplitPayload,
      };
      const unitSplitResult = await executeUnitSplit(context.dataService!, enhancedDecision);
      if ('error' in unitSplitResult) {
        return {
          success: false,
          createdRelations: [],
          createdWorkloadResults: [],
          createdWorkloadSplits: [],
          error: unitSplitResult.error
        };
      }
      return {
        success: true,
        createdRelations: [],
        createdWorkloadResults: [],
        createdWorkloadSplits: [],
        createdCards: [{ id: unitSplitResult.createdCardId, type: 'unit', name: unitSplitPayload.newUnitName, configurationState: 'configured' }],
        relationIds: [unitSplitResult.relationId],
      };
    case "confirm_aggregate":
      return executeAggregateDescendants(decision.recommendationId, decision, context);
    case "confirm_aggregate_children":
      return executeConfirmAggregateChildren(decision.recommendationId, decision, context);
    case "create_new_workload":
      return executeCreateNewWorkload(decision.recommendationId, context);
    case "create_new_relation":
      // 预留动作：类型契约已声明，但执行业务语义未经确认（不在 Q-09-C 实现范围）
      // 与 confirm_aggregate_children / create_new_workload 的 stub 模式一致，
      // 避免落入 default 的误导性 "Unknown action"
      return {
        success: false,
        createdRelations: [],
        createdWorkloadResults: [],
        createdWorkloadSplits: [],
        error: "Not implemented: create_new_relation（预留动作，执行语义未经业务确认）",
      };
    case "cancel":
    case "dismiss":
      return handleCancelOrDismiss(decision.recommendationId, action, decision.rejectionReason, context);
    default:
      return {
        success: false,
        createdRelations: [],
        createdWorkloadResults: [],
        createdWorkloadSplits: [],
        error: `Unknown action: ${action}`
      };
  }
}