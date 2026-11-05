import type { AnyCard, WorkloadCard } from "../../card/types";
import type { Relation } from "../../relation/types";
import type { WorkloadResult, WorkloadSplit } from "../types";
import type { CalculationResult } from "../../score/types";
import { batchSplitId } from "../split/splitService";

/**
 * Split 撤回域服务（D-153～D-155）
 *
 * 纯函数影响集计算：只枚举"要撤回什么"，不执行持久化。
 * 两条意图分支严格分离：
 * - computeSplitLayerRevocationImpact：当前层撤销（used/unused 分流只属于本分支）
 * - computeFullPathRevocationImpact：整条错误路径撤回（自然派生闭包，无条件撤回，无 used/unused 判定）
 *
 * 撤回 = 业务失效（D-154），不是物理删除：
 * - Card / WorkloadResult / CalculationResult → businessStatus = "revoked"
 * - Relation → active = false（软删除，同 relationService.deleteRelation 语义）
 * - WorkloadSplit → metadata.revocationStatus = "revoked"（保留分解事实 + D-155 批次终结证据）
 * - 数值字段永不改写
 */

/** WorkloadSplit 记录的撤回标记 metadata key（D-154/D-155） */
export const WORKLOAD_SPLIT_REVOCATION_STATUS_KEY = "revocationStatus";

/** 业务生命周期谓词（D-154）：缺省 undefined = active */
export function isBusinessRevoked(
  obj: { businessStatus?: "active" | "revoked" } | undefined | null
): boolean {
  return obj?.businessStatus === "revoked";
}

/** WorkloadSplit 记录是否已被标记撤回（D-155 批次终结证据） */
export function isWorkloadSplitRecordRevoked(
  split: Pick<WorkloadSplit, "metadata">
): boolean {
  return split.metadata?.[WORKLOAD_SPLIT_REVOCATION_STATUS_KEY] === "revoked";
}

/** 继续使用证据（仅层撤销分支使用，D-153 规则 2；路径分支禁止使用） */
export interface ContinuedUseEvidence {
  cardId: string;
  evidence: string;
}

/**
 * 判断子卡是否已有"脱离当前层的继续使用证据"（D-153）：
 * - active workload_assign / workload_share / budget_occupancy 引用该子卡（Unit / 预算使用）；
 * - 该子卡为 active workload_split 的 source（存在更深层拆分路径）。
 * 注意：本层拆分边（parent → child，child 为 target）不算使用证据——它是正在被撤销的边。
 */
export function findContinuedUseEvidence(
  cardId: string,
  relations: Relation[]
): ContinuedUseEvidence | undefined {
  for (const relation of relations) {
    if (!relation.active) continue;
    if (
      (relation.type === "workload_assign" ||
        relation.type === "workload_share" ||
        relation.type === "budget_occupancy") &&
      relation.targetId === cardId
    ) {
      return {
        cardId,
        evidence: `active ${relation.type} Relation ${relation.id}`,
      };
    }
    if (relation.type === "workload_split" && relation.sourceId === cardId) {
      return {
        cardId,
        evidence: `deeper active workload_split Relation ${relation.id}`,
      };
    }
  }
  return undefined;
}

/** 撤回影响集计算所需的数据快照（只读；调用方负责取数） */
export interface RevocationSnapshot {
  cards: AnyCard[];
  relations: Relation[];
  workloadResults: WorkloadResult[];
  workloadSplits: WorkloadSplit[];
  calculationResults: CalculationResult[];
}

/** 撤回影响集（对既有对象的失效/删除副本，按序提交见 revocationSubmissionService） */
export interface WorkloadRevocationImpact {
  /** 层撤销：businessStatus = "revoked" 的 WorkloadCard 副本；全路径：恒空（派生卡改为物理删除） */
  revokedCards: AnyCard[];
  /** 层撤销：businessStatus = "revoked" 的 WorkloadResult 副本（数值字段未改写）；全路径：恒空 */
  revokedWorkloadResults: WorkloadResult[];
  /** active = false 的 Relation 副本（软删除） */
  deactivatedRelations: Relation[];
  /** 带 revocationStatus = "revoked" 标记的 WorkloadSplit 副本（记录保留，D-155 终结证据） */
  revokedWorkloadSplits: WorkloadSplit[];
  /** businessStatus = "revoked" 的 CalculationResult 副本（整体失效，待重新计算） */
  revokedCalculationResults: CalculationResult[];
  /** 仅层撤销分支：因继续使用证据被保留的直接派生卡及其证据 */
  retained: ContinuedUseEvidence[];
  /** D-158 全路径：物理删除的派生 WorkloadCard（层撤销恒空） */
  deletedCards: AnyCard[];
  /** D-158 全路径：物理删除的派生 WorkloadResult（层撤销恒空） */
  deletedWorkloadResults: WorkloadResult[];
  /**
   * D-158 全路径：来源不明、可经关系拓扑发现的对象（不删除、原状保留，等待人工处理）。
   * 覆盖 mock 时代子树与 Case C 窗口（有拓扑边、无 WorkloadSplit 记录）；
   * 盲区（如实声明）：既无记录又无关系的孤立 Result（Case A 窗口）对记录闭包与拓扑遍历均不可达，
   * 不在本清单内，也不得凭 ID/启发式猜测删除。
   */
  manualReview: { cards: AnyCard[]; results: WorkloadResult[] };
}

/** 批次归属判定（纯精确匹配，不做字符串前缀猜测）：子 Result 是否属于指定 executionBatch（经其 WorkloadSplit 记录证明） */
function childBelongsToExecutionBatch(
  childResultId: string | undefined,
  parentResultId: string | undefined,
  executionBatchId: string,
  splits: WorkloadSplit[]
): boolean {
  if (!childResultId || !parentResultId) return false;
  const expectedSplitId = batchSplitId(parentResultId, executionBatchId, childResultId);
  return splits.some((split) => split.id === expectedSplitId);
}

function revokeWorkloadResultCopy(result: WorkloadResult): WorkloadResult {
  return { ...result, businessStatus: "revoked" };
}

function deactivateRelationCopy(relation: Relation): Relation {
  return { ...relation, active: false };
}

function markWorkloadSplitCopy(split: WorkloadSplit): WorkloadSplit {
  return {
    ...split,
    metadata: { ...split.metadata, [WORKLOAD_SPLIT_REVOCATION_STATUS_KEY]: "revoked" },
  };
}

function revokeCalculationResultCopy(result: CalculationResult): CalculationResult {
  return { ...result, businessStatus: "revoked" };
}

function findResultById(
  results: WorkloadResult[],
  id: string | undefined
): WorkloadResult | undefined {
  return id ? results.find((r) => r.id === id) : undefined;
}

function collectCalculationResultsTouching(
  calculationResults: CalculationResult[],
  workloadCardIds: Set<string>
): CalculationResult[] {
  if (workloadCardIds.size === 0) return [];
  return calculationResults
    .filter((calc) =>
      calc.scoreResults.some((score) => workloadCardIds.has(score.workloadId))
    )
    .filter((calc) => !isBusinessRevoked(calc))
    .map(revokeCalculationResultCopy);
}

function requireWorkloadCard(cards: AnyCard[], cardId: string, role: string): WorkloadCard {
  const card = cards.find((c) => c.id === cardId && c.type === "workload");
  if (!card) {
    throw new Error(`Split 撤回：${role} WorkloadCard 不存在或不是 WorkloadCard：${cardId}`);
  }
  return card as WorkloadCard;
}

// ─────────────────────────────────────────────────────────
// D-158 记录级派生归属（全路径撤回的唯一来源依据）
// ─────────────────────────────────────────────────────────

/**
 * 按 WorkloadSplit 记录重建派生后代结果集合（D-158 规则 6）。
 *
 * - 唯一依据：记录的 parentResultId → childResultId 字段（BFS，visited 防环）；
 * - **不依赖 Relation.active**——中间拆分关系已失活的分支仍被纳入；
 * - **不解析 ID 前缀**（D-146 原则：归属判定只用显式字段精确匹配）；
 * - 覆盖多层派生与同父多执行批次（每 child 恒有记录，批次不影响遍历）。
 * 返回按发现顺序排列的派生 WorkloadResult ID（不含入口自身）。
 */
export function collectDerivedResultsByRecords(
  entryResultId: string | undefined,
  splits: WorkloadSplit[]
): string[] {
  if (!entryResultId) return [];
  const visited = new Set<string>([entryResultId]);
  const queue: string[] = [entryResultId];
  const derived: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const split of splits) {
      if (split.parentResultId !== current) continue;
      if (visited.has(split.childResultId)) continue;
      visited.add(split.childResultId);
      derived.push(split.childResultId);
      queue.push(split.childResultId);
    }
  }
  return derived;
}

/**
 * 全关系拓扑后代发现（含 inactive 边）——仅用于 manualReview 差集，不用于删除范围：
 * 来源不明对象 = 拓扑可达但记录不可归属者（mock 时代子树 / Case C 窗口）。
 */
function collectTopologyDescendantCardIds(entryCardId: string, relations: Relation[]): Set<string> {
  const visited = new Set<string>([entryCardId]);
  const queue: string[] = [entryCardId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const relation of relations) {
      if (relation.type !== "workload_split" || relation.sourceId !== current) continue;
      if (visited.has(relation.targetId)) continue;
      visited.add(relation.targetId);
      queue.push(relation.targetId);
    }
  }
  visited.delete(entryCardId);
  return visited;
}

// ─────────────────────────────────────────────────────────
// 分支一：撤销当前这一层 Split（Layer Revocation，D-153 规则 2）
// ─────────────────────────────────────────────────────────

export interface SplitLayerRevocationInput {
  snapshot: RevocationSnapshot;
  /** 父 WorkloadCard ID：撤销它的当前直接 Split 层 */
  parentWorkloadCardId: string;
  /**
   * 可选：限定本层的执行批次（同父多批次场景）。
   * 缺省 = 该父卡当前全部 active 直接 Split 层。
   * 批次归属经 WorkloadSplit 记录的批次域 ID 精确匹配证明（无记录的历史边不属任何批次）。
   */
  executionBatchId?: string;
}

export function computeSplitLayerRevocationImpact(
  input: SplitLayerRevocationInput
): WorkloadRevocationImpact {
  const { snapshot, parentWorkloadCardId, executionBatchId } = input;
  const parent = requireWorkloadCard(snapshot.cards, parentWorkloadCardId, "父卡");
  const parentResultId = parent.workloadResultId;

  // 1. 本层 active Split Relations（parent 为 source）
  const allLayerRelations = snapshot.relations.filter(
    (r) => r.active && r.type === "workload_split" && r.sourceId === parentWorkloadCardId
  );

  // 2. 可选批次过滤（D-153：本层事实可按 executionBatch 圈定）
  const scopedLayerRelations = executionBatchId
    ? allLayerRelations.filter((r) => {
        const childCard = snapshot.cards.find((c) => c.id === r.targetId && c.type === "workload");
        return childBelongsToExecutionBatch(
          (childCard as WorkloadCard | undefined)?.workloadResultId,
          parentResultId,
          executionBatchId,
          snapshot.workloadSplits
        );
      })
    : allLayerRelations;

  // 3. 直接派生卡 + used/unused 分流（只属于本分支，D-153 规则 1）
  const retained: ContinuedUseEvidence[] = [];
  const revokedChildCards: WorkloadCard[] = [];
  const scopedChildCards: WorkloadCard[] = [];
  for (const relation of scopedLayerRelations) {
    const childCard = snapshot.cards.find(
      (c): c is WorkloadCard => c.id === relation.targetId && c.type === "workload"
    );
    if (!childCard) continue; // endpoint 缺失：拆分边仍会被撤销，但无子卡事实可处理
    scopedChildCards.push(childCard);
    const evidence = findContinuedUseEvidence(childCard.id, snapshot.relations);
    if (evidence) {
      retained.push(evidence);
    } else {
      revokedChildCards.push(childCard);
    }
  }

  // 4. 撤回影响：
  //    a. 本层拆分边全部撤销（含被保留的已使用子卡的拆分边——D-153 规则 2：保留子卡不保留 active 拆分边）
  //    b. 未使用子卡：Card / Result 失效 + 其触及的所有 active Relation 软删除
  const revokedCardIds = new Set(revokedChildCards.map((c) => c.id));
  const deactivatedById = new Map<string, Relation>();
  for (const relation of scopedLayerRelations) {
    deactivatedById.set(relation.id, deactivateRelationCopy(relation));
  }
  for (const relation of snapshot.relations) {
    if (!relation.active) continue;
    if (deactivatedById.has(relation.id)) continue;
    if (
      revokedCardIds.has(relation.sourceId) ||
      revokedCardIds.has(relation.targetId)
    ) {
      deactivatedById.set(relation.id, deactivateRelationCopy(relation));
    }
  }

  const revokedWorkloadResults: WorkloadResult[] = [];
  for (const childCard of revokedChildCards) {
    const result = findResultById(snapshot.workloadResults, childCard.workloadResultId);
    if (result && !isBusinessRevoked(result)) {
      revokedWorkloadResults.push(revokeWorkloadResultCopy(result));
    }
  }

  // 5. WorkloadSplit 记录标记：本层全部子卡（含 retained）的分解记录 → revocationStatus = "revoked"
  //    （本层 Split 整体被撤销；retained 子卡的记录标记同时是 D-155 批次终结证据）
  const scopedChildResultIds = new Set(
    scopedChildCards.map((c) => c.workloadResultId).filter((id): id is string => Boolean(id))
  );
  const revokedWorkloadSplits: WorkloadSplit[] = [];
  for (const split of snapshot.workloadSplits) {
    if (!scopedChildResultIds.has(split.childResultId)) continue;
    if (isWorkloadSplitRecordRevoked(split)) continue;
    revokedWorkloadSplits.push(markWorkloadSplitCopy(split));
  }

  // 6. 计算影响：仅未使用（被撤回）子卡参与的 CalculationResult 整体失效（D-154 规则 4）
  const revokedCalculationResults = collectCalculationResultsTouching(
    snapshot.calculationResults,
    revokedCardIds
  );

  return {
    revokedCards: revokedChildCards
      .filter((c) => !isBusinessRevoked(c))
      .map((c) => ({ ...c, businessStatus: "revoked" as const })),
    revokedWorkloadResults,
    deactivatedRelations: [...deactivatedById.values()],
    revokedWorkloadSplits,
    revokedCalculationResults,
    retained,
    // D-158 专有字段：层撤销不物理删除、不产生 manualReview（兼容空集合，语义零变）
    deletedCards: [],
    deletedWorkloadResults: [],
    manualReview: { cards: [], results: [] },
  };
}

// ─────────────────────────────────────────────────────────
// 分支二：整条错误路径撤回（Full-Path Revocation，D-153 规则 3 + D-156/D-158）
// ─────────────────────────────────────────────────────────

export interface FullPathRevocationInput {
  snapshot: RevocationSnapshot;
  /**
   * 错误路径入口 WorkloadCard ID：该节点本身保留；
   * 派生范围按 WorkloadSplit 记录闭包重建（D-158 规则 6：不依赖 Relation.active、
   * 不解析 ID 前缀，含已失活分支与同父多批次）；
   * 拓扑可达但记录不可归属的对象进入 manualReview（不删除）。
   * 不做任何 used/unused 判定（D-153 规则 1：不得复用层分支分流逻辑）。
   */
  entryWorkloadCardId: string;
}

export function computeFullPathRevocationImpact(
  input: FullPathRevocationInput
): WorkloadRevocationImpact {
  const { snapshot, entryWorkloadCardId } = input;
  const entry = requireWorkloadCard(snapshot.cards, entryWorkloadCardId, "入口");

  // 1. 记录级闭包（D-158 规则 6）：由该路径产生的派生 WorkloadResult 全集
  const derivedResultIds = new Set(
    collectDerivedResultsByRecords(entry.workloadResultId, snapshot.workloadSplits)
  );

  // 2. 物理删除集：闭包内派生 Result + 引用这些结果的派生 Card
  //    （D-158：即使被其他业务引用也不保留；引用方核算另行软失效）
  const deletedWorkloadResults: WorkloadResult[] = [];
  for (const resultId of derivedResultIds) {
    const result = findResultById(snapshot.workloadResults, resultId);
    if (result) {
      deletedWorkloadResults.push(result);
    }
  }
  const deletedCards: AnyCard[] = snapshot.cards.filter(
    (c): c is WorkloadCard =>
      c.type === "workload" &&
      c.workloadResultId !== undefined &&
      derivedResultIds.has(c.workloadResultId)
  );
  const deletedCardIds = new Set(deletedCards.map((c) => c.id));

  // 3. 关系软删（规则 3）：所有触及被删对象的 active Relation
  const deactivatedRelations: Relation[] = [];
  for (const relation of snapshot.relations) {
    if (!relation.active) continue;
    if (deletedCardIds.has(relation.sourceId) || deletedCardIds.has(relation.targetId)) {
      deactivatedRelations.push(deactivateRelationCopy(relation));
    }
  }

  // 4. WorkloadSplit 记录：保留并标记（规则 2，D-155 终止证据；不物理删除）
  const revokedWorkloadSplits: WorkloadSplit[] = [];
  for (const split of snapshot.workloadSplits) {
    if (!derivedResultIds.has(split.childResultId)) continue;
    if (isWorkloadSplitRecordRevoked(split)) continue;
    revokedWorkloadSplits.push(markWorkloadSplitCopy(split));
  }

  // 5. 核算软失效（规则 4）：引用被删卡的 CalculationResult 整体 revoked（待重算，不为 0）
  const revokedCalculationResults = collectCalculationResultsTouching(
    snapshot.calculationResults,
    deletedCardIds
  );

  // 6. manualReview（规则 7/8）：拓扑可发现但记录不可归属者——不删除、原状保留
  const topologyDescendantIds = collectTopologyDescendantCardIds(entry.id, snapshot.relations);
  const manualReviewCards: AnyCard[] = snapshot.cards.filter(
    (c) => topologyDescendantIds.has(c.id) && !deletedCardIds.has(c.id)
  );
  const manualReviewResultIds = new Set(
    manualReviewCards
      .map((c) => (c as WorkloadCard).workloadResultId)
      .filter(
        (id): id is string =>
          id !== undefined && !derivedResultIds.has(id) && id !== entry.workloadResultId
      )
  );
  const manualReviewResults: WorkloadResult[] = snapshot.workloadResults.filter((r) =>
    manualReviewResultIds.has(r.id)
  );

  return {
    // 全路径分支：派生卡/结果物理删除，不再产出软失效副本
    revokedCards: [],
    revokedWorkloadResults: [],
    deletedCards,
    deletedWorkloadResults,
    deactivatedRelations,
    revokedWorkloadSplits,
    revokedCalculationResults,
    manualReview: { cards: manualReviewCards, results: manualReviewResults },
    retained: [], // 路径分支无保留分流（D-153 规则 1）
  };
}
