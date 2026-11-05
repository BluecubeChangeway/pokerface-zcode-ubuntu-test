import type { DataService } from "./DataService";
import type { ActionExecutorResult, PendingSplitRelation } from "./actionExecutor";
import type { WorkloadResult, WorkloadSplit } from "../domain/workload/types";
import type { SplitProvenanceRecord } from "../domain/workload/provenance/splitProvenance";
import type { AnyCard, WorkloadCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import { createRelation } from "../domain/relation/relationService";
import { encodeIdComponent } from "../shared/idEncoding";
import {
  batchSplitId,
  determineChildIdOwnership,
  workloadResultContentEquals,
} from "../domain/workload/split/splitService";
import { reusableContentEquals } from "../domain/workload/provenance/splitProvenance";
import {
  isBusinessRevoked,
  isWorkloadSplitRecordRevoked,
} from "../domain/workload/revocation/revocationService";
import { v4 as uuidv4 } from "uuid";
import type { RelationEndpointKind } from "../domain/relation/endpointRules";

/**
 * ActionSubmissionService - Action 执行结果提交服务 (Q-09-C P0)
 * 
 * 职责：将 ActionExecutor 执行产生的业务事实提交到正式数据源
 * 不负责：执行 Action、验证业务规则、修改 Recommendation、修改 UI Store
 * 
 * Split 闭环编排（Q-09-C）：
 * 1. 保存 child WorkloadResult
 * 2. 为每个 child WorkloadResult 创建 WorkloadCard
 * 3. 保存 child WorkloadCard
 * 4. 创建 workload_split Relation (parent WorkloadCard -> child WorkloadCard)
 * 5. 保存 Relation 和 WorkloadSplit
 * 
 * 幂等性保证（Retry Idempotency）：
 * - 基于 recommendationId + childWorkloadResultId 生成稳定的 Card ID，Retry 时复用同一个 Card
 * - 同一次提交中不重复创建相同的 workload_split Relation
 * - 遵循 D-120：同一 WorkloadResult 可以被多个 WorkloadCard 引用（不同 Recommendation 可引用同一 Result）
 * - 不做全局的 workloadResultId 去重，仅防止同一次提交内的重复
 */
export async function submitActionResult(
  result: ActionExecutorResult,
  dataService: DataService,
  recommendationId: string
): Promise<void> {
  // 阶段 0（H-2 / D-145 / D-146）：持久化边界跨 execution 身份兜底检查。
  // 不信任 ActionExecutor 的 stale context——保存前重新查询正式数据，
  // 必须先检查、再决定是否允许保存（不得先 upsert 后判断）。
  if (result.createdWorkloadResults.length > 0 && result.executionBatchId) {
    const [existingResults, existingSplits] = await Promise.all([
      dataService.getWorkloadResults(),
      dataService.getWorkloadSplits(),
    ]);
    const parentResultId = result.createdWorkloadSplits[0]?.parentResultId;
    // E-2 / D-148：期望 Split ID 逐 child 以其 Result ID 计算（顺序无关，不使用 index）
    const expectedSplitIds = result.createdWorkloadResults.map((childResult) =>
      parentResultId ? batchSplitId(parentResultId, result.executionBatchId!, childResult.id) : ""
    );
    for (let i = 0; i < result.createdWorkloadResults.length; i++) {
      const childResult = result.createdWorkloadResults[i];
      // 撤回终结判定（D-155；D-158 顺序修正 2026-10-09）：必须在"Result 不存在则跳过"**之前**执行——
      // Result 被物理删除后 existing 不存在，终结证据由保留的 WorkloadSplit 标记（D-158 规则 2）承担；
      // 若此检查仍在存在性跳过之后，被删除批次的 retry 将复活已删事实。
      // 本层覆盖全部 child（含生成型 ID，expectedSplitIds 逐 child 计算）。
      const expectedSplitId = expectedSplitIds[i];
      if (expectedSplitId) {
        const splitRecord = existingSplits.find((s) => s.id === expectedSplitId);
        if (splitRecord && isWorkloadSplitRecordRevoked(splitRecord)) {
          throw new Error(
            `executionBatch 已被撤回终结（WorkloadSplit ${expectedSplitId} 已标记 revoked），不得复活已撤回事实（D-155，持久化边界拒绝）`
          );
        }
      }
      const existing = existingResults.find((r) => r.id === childResult.id);
      if (!existing) continue; // 不存在 → 正常保存（撤回终结检查已在上方先行）
      if (isBusinessRevoked(existing)) {
        throw new Error(
          `child WorkloadResult ${childResult.id} 已被撤回终结（businessStatus=revoked），该 executionBatch 不得经 retry 复活（D-155，持久化边界拒绝）`
        );
      }
      const ownership = determineChildIdOwnership(existingSplits, childResult.id, expectedSplitIds);
      // R3 溯源复用（D-157 规则 B）：跨批次复用的子结果允许"other"归属，且内容比对忽略名称（Q2）
      const isR3Reused = result.r3ReusedChildResultIds?.includes(childResult.id) ?? false;
      if (ownership === "other" && !isR3Reused) {
        // 已明确属于其他 execution → 拒绝（不论内容），但 R3 复用除外
        throw new Error(
          `child WorkloadResult ${childResult.id} 已属于其他 execution，禁止跨 execution 复用（持久化边界拒绝）`
        );
      }
      // current / unknown 都必须执行 exact-content 判定（P1 修复 2026-10-05）：
      // 同一 execution identity 下不得提交另一份不同内容（D-144 规则 2）。
      // current + 全同 → 复用/幂等 upsert；unknown + 全同 → 幂等恢复（D-146）；任一差异 → 拒绝。
      // R3 复用（D-157 规则 B + Q2）：内容比对忽略名称字段
      const contentEquals = isR3Reused
        ? reusableContentEquals(
            { resultSetId: existing.resultSetId, resultItemId: existing.resultItemId, value: existing.value, dimensions: existing.dimensions, period: existing.period },
            { resultSetId: childResult.resultSetId, resultItemId: childResult.resultItemId, value: childResult.value, dimensions: childResult.dimensions, period: childResult.period }
          )
        : workloadResultContentEquals(existing, childResult);
      if (!contentEquals) {
        throw new Error(
          `已有 child WorkloadResult ${childResult.id} 内容与当前 execution 不一致，不允许覆盖旧统计事实（持久化边界拒绝）`
        );
      }
      // 内容完全一致 → 幂等（current：retry；unknown：恢复），继续保存
    }
  }

  // 阶段 A：保存 child WorkloadResult
  if (result.createdWorkloadResults.length > 0) {
    await dataService.saveWorkloadResults(result.createdWorkloadResults);
  }

  // 阶段 B & C：创建并保存 child WorkloadCard（仅当有 pendingSplitRelations 时）
  const newCards: AnyCard[] = [];
  const childResultIdToCardId = new Map<string, string>();
  
  if (result.pendingSplitRelations && result.pendingSplitRelations.length > 0) {
    // 阶段 B：为每个 child WorkloadResult 创建 WorkloadCard
    // 幂等性：基于 recommendationId + childWorkloadResultId 生成稳定的 Card ID
    // 遵循 D-120：不做全局 workloadResultId 去重，同一 Result 可被多个 Card 引用
    // Retry 时：同一 recommendationId + childWorkloadResultId 生成相同的 Card ID，复用而非新建
    
    for (const pending of result.pendingSplitRelations) {
      // 找到对应的 child WorkloadResult
      const childResult = result.createdWorkloadResults.find(r => r.id === pending.childWorkloadResultId);
      if (!childResult) {
        throw new Error(`Child WorkloadResult ${pending.childWorkloadResultId} not found in createdWorkloadResults`);
      }

      // R3 溯源复用（D-157 规则 B + Q2）：跨推荐复用时，复用既有 Card（不产生新卡）
      // 查找已存在的引用该 childResultId 的 WorkloadCard
      let childCardId: string;
      const isR3Reused = result.r3ReusedChildResultIds?.includes(childResult.id) ?? false;
      if (isR3Reused) {
        const allCards = await dataService.getCards();
        const existingCard = allCards.find(
          (c) => c.type === "workload" && c.workloadResultId === childResult.id
        );
        if (existingCard) {
          childCardId = existingCard.id;
        } else {
          // 理论上不应发生：R3 复用的结果必有对应 Card
          childCardId = generateStableCardId(recommendationId, pending.childWorkloadResultId);
        }
      } else {
        // 普通情况：基于 recommendationId + childWorkloadResultId 生成稳定 Card ID（retry 幂等）
        childCardId = generateStableCardId(recommendationId, pending.childWorkloadResultId);
      }
      
      // 检查本次提交中是否已为该 childWorkloadResultId 创建过 Card
      if (childResultIdToCardId.has(pending.childWorkloadResultId)) {
        // 本次提交中已创建过该子结果的 Card，复用
        const existingChildCardId = childResultIdToCardId.get(pending.childWorkloadResultId)!;
      } else {
        // 检查数据库中是否已存在该 Card（R3 复用场景）
        const allCards = await dataService.getCards();
        const existingCardInDb = allCards.find(
          (c) => c.type === "workload" && c.id === childCardId
        );
        if (existingCardInDb) {
          // Card 已存在，无需创建
        } else {
          // 创建新的 child WorkloadCard
          // 注意：不复制 WorkloadResult.value 作为事实源，只通过 workloadResultId 引用
          // sourceSummary.dataObjectId 使用真实的 ResultSet 来源，不写空字符串
          let sourceDataObjectId: string | undefined;
          if (childResult.resultSetId) {
            const resultSets = await dataService.getResultSets();
            const resultSet = resultSets.find(rs => rs.id === childResult.resultSetId);
            if (resultSet?.sourceDataObjectId) {
              sourceDataObjectId = resultSet.sourceDataObjectId;
            }
          }

          const childCard: WorkloadCard = {
            id: childCardId,
            type: "workload",
            name: childResult.name,
            workloadResultId: childResult.id,
            configurationState: "configured",
            // 不复制 value：WorkloadCard 通过 workloadResultId 引用 WorkloadResult，不持有独立事实
            sourceSummary: sourceDataObjectId ? {
              dataObjectId: sourceDataObjectId,
              period: childResult.period,
            } : undefined,
            metadata: {},
          };

          newCards.push(childCard);
        }
      }
      childResultIdToCardId.set(pending.childWorkloadResultId, childCardId);
    }

    // 保存 child WorkloadCard
    if (newCards.length > 0) {
      await dataService.saveCards(newCards);
    }
  }

  // 阶段 D：建立 workload_split Relation
  const splitRelations: Relation[] = [];
  // 用于跟踪本次提交中已创建的 Relation，防止同一 parent+child 重复创建
  const createdSplitRelations = new Set<string>();
  
  if (result.pendingSplitRelations && result.pendingSplitRelations.length > 0) {
    // 获取真实的 existingRelations 用于 duplicate 检查
    const existingRelations = await dataService.getRelations();
    
    // 获取所有 Cards 用于 endpoint 验证
    const allCards = await dataService.getCards();
    const endpointKinds = new Map<string, RelationEndpointKind>();
    for (const card of allCards) {
      endpointKinds.set(card.id, card.type);
    }

    for (const pending of result.pendingSplitRelations) {
      const childCardId = childResultIdToCardId.get(pending.childWorkloadResultId);
      if (!childCardId) {
        throw new Error(`Child WorkloadCard for Result ${pending.childWorkloadResultId} was not created`);
      }

      // workload_split Relation 去重：检查本次提交中是否已创建相同的 Relation
      const relationKey = `${pending.parentWorkloadCardId}::${childCardId}`;
      if (createdSplitRelations.has(relationKey)) {
        // 本次提交中已创建过该 Relation，跳过
        continue;
      }

      // 检查数据库中是否已存在相同的 active workload_split Relation
      const duplicateSplitRelation = existingRelations.find(r => 
        r.active &&
        r.type === "workload_split" &&
        r.sourceId === pending.parentWorkloadCardId &&
        r.targetId === childCardId
      );

      if (duplicateSplitRelation) {
        // 复用已有 Relation
        splitRelations.push(duplicateSplitRelation);
        createdSplitRelations.add(relationKey);
      } else {
        // 获取 parent WorkloadCard 的 workloadResultId 作为 metadata.parentWorkloadResultId
        const allCards = await dataService.getCards();
        const parentCard = allCards.find(c => c.id === pending.parentWorkloadCardId);
        const parentResultId = (parentCard?.type === "workload" ? (parentCard as WorkloadCard).workloadResultId : undefined);

        const relation = createRelation({
          id: uuidv4(),
          type: "workload_split",
          sourceId: pending.parentWorkloadCardId,
          targetId: childCardId,
          metadata: {
            parentWorkloadResultId: parentResultId, // 正确的 WorkloadResult ID
            childWorkloadResultId: pending.childWorkloadResultId,
          }
        }, {
          existingRelations,
          endpointKinds,
        });
        splitRelations.push(relation);
        createdSplitRelations.add(relationKey);
      }
    }
  }

  // 阶段 E：保存所有 Relation（包括 splitRelations 和其他 Action 创建的 Relation）
  // Q-09-C P2-1 裁定 B（2026-10-04）：workload_assign 持久化边界业务键复用。
  // 业务键 = active + type + Unit(sourceId) + Workload(targetId)；
  // RecommendationId / UserDecision 不参与业务键（Recommendation 只是操作来源）。
  // 保存前查询 DB：已存在同键 active Relation 时复用已有行、丢弃新生成的 Relation，
  // 不创建第二条 —— 覆盖执行上下文过期（stale context）场景，与 executor 层复用互补，
  // 使"首次写入成功但 Action 后续失败"的 retry 无论上下文新旧均可收敛到 accepted。
  let relationsToSave = result.createdRelations;
  const hasAssignRelations = result.createdRelations.some(
    (relation) => relation.type === "workload_assign"
  );
  if (hasAssignRelations) {
    const existingRelationsForAssign = await dataService.getRelations();
    relationsToSave = result.createdRelations.map((relation) => {
      if (relation.type !== "workload_assign") {
        return relation;
      }
      const duplicateAssign = existingRelationsForAssign.find(
        (r) =>
          r.active &&
          r.type === "workload_assign" &&
          r.sourceId === relation.sourceId &&
          r.targetId === relation.targetId
      );
      // 复用已有行（同 ID upsert），新生成的 Relation 不落库 → 不产生第二条
      return duplicateAssign ?? relation;
    });
  }

  const allRelations = [...relationsToSave, ...splitRelations];
  if (allRelations.length > 0) {
    await dataService.saveRelations(allRelations);
  }

  // 保存 WorkloadSplit
  if (result.createdWorkloadSplits.length > 0) {
    await dataService.saveWorkloadSplits(result.createdWorkloadSplits);
  }

  // 保存 SplitProvenanceRecord（拆分溯源记录，D-157 规则 B）
  // 一次拆分执行 = 一个批次 = 一个 provenance 记录（id = executionBatchId，包含所有条件）
  if (result.createdWorkloadSplits.length > 0 && result.executionBatchId) {
    // 从 createdWorkloadResults 构造完整条件信息
    const conditions = result.createdWorkloadResults.map((childResult) => ({
      childResultId: childResult.id,
      resultSetId: childResult.resultSetId,
      resultItemId: childResult.resultItemId,
      value: childResult.value,
      dimensions: childResult.dimensions,
    }));
    const provenance: SplitProvenanceRecord = {
      id: result.executionBatchId,
      parentWorkloadResultId: result.createdWorkloadSplits[0].parentResultId,
      resultSetId: result.createdWorkloadResults[0].resultSetId,
      conditions,
      createdAt: new Date().toISOString(),
    };
    await dataService.saveSplitProvenances([provenance]);
  }

  // 保存 unit_split 创建的 UnitCard
  if (result.createdCards && result.createdCards.length > 0) {
    await dataService.saveCards(result.createdCards);
  }

  // unit_split 创建的 structure Relation 已在 executor 层持久化（通过 submitDropAssignRelation）
  // 这里只需记录 relationIds 用于追踪
  // 无需额外操作
}

/**
 * 生成稳定的 WorkloadCard ID（Q-09-C 2026-10-04 裁定 A / D-143）：
 * 身份输入 = recommendationId + "::" + childWorkloadResultId，
 * 经共享单射安全编码（encodeIdComponent）直接嵌入 ID ——
 * 相同 (recommendationId, childWorkloadResultId) → 必然相同 Card ID（retry upsert 同一 Card）；
 * 不同组合 → 必然不同 Card ID（不依赖任何概率性短哈希，无理论碰撞覆盖窗口）。
 */
function generateStableCardId(recommendationId: string, childWorkloadResultId: string): string {
  return `workload-card-${encodeIdComponent(`${recommendationId}::${childWorkloadResultId}`)}`;
}

/**
 * Drop 建立关系的持久化提交入口（D-150，2026-10-09）。
 *
 * 语义：成功 Drop（D-150）本身就是用户建立业务关系的操作。本入口承接该操作产生的
 * workload_assign Relation，使其经过与 submitActionResult 同一持久化边界落库——
 * 本服务仍是全项目唯一 save* 调用方（D-141 边界不因 Drop 而被绕过）。
 *
 * 幂等（P2-1 同一业务键：active + type + Unit sourceId + Workload targetId）：
 * 已存在同键 active Relation 时复用已有行并返回 reused，不创建第二条；
 * inactive 旧行不算 active 关系，不阻止新行保存。
 * metadata（如 origin="drop"）只是来源信息，不参与业务键。
 *
 * 本入口不做 Relation 创建 / 端点校验（调用方经 relationService.createRelation 完成），
 * 不涉及 WorkloadResult / WorkloadCard / WorkloadSplit / Recommendation。
 */
export async function submitDropAssignRelation(
  relation: Relation,
  dataService: DataService
): Promise<{ outcome: "persisted" | "reused"; relation: Relation }> {
  const existingRelations = await dataService.getRelations();
  const duplicate = existingRelations.find(
    (r) =>
      r.active &&
      r.type === "workload_assign" &&
      r.sourceId === relation.sourceId &&
      r.targetId === relation.targetId
  );
  if (duplicate) {
    return { outcome: "reused", relation: duplicate };
  }
  await dataService.saveRelations([relation]);
  return { outcome: "persisted", relation };
}

/**
 * 移动/解除关系的持久化提交入口（R2/A-002b，D-151）。
 *
 * 语义：移动操作 = 解除旧关系 + 新建/复用目标端关系，必须在同一批次提交（D-141 唯一持久化边界）。
 * - deactivatedRelation：被解除的旧关系（active=false，软删留痕）；为 null 时仅执行新建/复用
 * - newRelation：目标端关系（新建或复用既有同键 active 行）；metadata.origin 只作来源信息，不参与业务键
 * - 幂等（P2-1 同一业务键：active + type + Unit sourceId + Workload targetId）：
 *   - 新关系：已存在同键 active Relation 时复用并返回 reused
 *   - 旧关系：若已 inactive 则直接 upsert 为 inactive（幂等软删）
 * - 本入口不做 Relation 创建 / 端点校验（调用方经 relationService.createRelation 完成）
 * - 本入口不涉及 WorkloadResult / WorkloadCard / WorkloadSplit / Recommendation
 * - 失败不回滚（无事务语义），重试同一移动入口按当前事实收敛（软删 upsert + 业务键幂等）
 */
export async function submitMoveAssignRelation(
  deactivatedRelation: Relation | null,
  newRelation: Relation,
  dataService: DataService
): Promise<{ outcome: "persisted" | "reused"; relation: Relation }> {
  const existingRelations = await dataService.getRelations();
  const relationType = newRelation.type;

  // 1. 处理新关系：幂等业务键检查（P2-1）
  const duplicate = existingRelations.find(
    (r) =>
      r.active &&
      r.type === relationType &&
      r.sourceId === newRelation.sourceId &&
      r.targetId === newRelation.targetId
  );
  if (duplicate) {
    // 新关系已存在 → 复用，仅软删旧关系（如有）
    if (deactivatedRelation) {
      await dataService.saveRelations([{ ...deactivatedRelation, active: false }]);
    }
    return { outcome: "reused", relation: duplicate };
  }

  // 2. 准备批量保存：旧关系软删 + 新关系持久化
  const toSave: Relation[] = [newRelation];
  if (deactivatedRelation) {
    toSave.push({ ...deactivatedRelation, active: false });
  }
  await dataService.saveRelations(toSave);
  return { outcome: "persisted", relation: newRelation };
}

/**
 * 解除关系的持久化提交入口（R2/A-002b，D-151）。
 *
 * 语义：解除操作 = 旧关系软删（active=false，软删留痕）；不涉及新关系创建。
 * - deactivatedRelation：被解除的旧关系（active=false，软删留痕）
 * - 本入口不做 Relation 创建 / 端点校验
 * - 幂等（P2-1 同一业务键：active + type + Unit sourceId + Workload targetId）：
 *   - 旧关系：若已 inactive 则直接 upsert 为 inactive（幂等软删）
 * - 本入口不涉及 WorkloadResult / WorkloadCard / WorkloadSplit / Recommendation
 * - 失败不回滚（无事务语义），重试同一解除入口按当前事实收敛（软删 upsert 幂等）
 */
export async function submitUnassignRelation(
  deactivatedRelation: Relation,
  dataService: DataService
): Promise<{ outcome: "unassigned"; relation: Relation }> {
  const existingRelations = await dataService.getRelations();

  // 1. 检查是否已有同键 inactive 关系（幂等软删）
  const existingInactive = existingRelations.find(
    (r) =>
      !r.active &&
      r.type === deactivatedRelation.type &&
      r.sourceId === deactivatedRelation.sourceId &&
      r.targetId === deactivatedRelation.targetId
  );
  if (existingInactive) {
    // 已经软删过，幂等 no-op
    return { outcome: "unassigned", relation: existingInactive };
  }

  // 2. 软删旧关系
  await dataService.saveRelations([{ ...deactivatedRelation, active: false }]);
  return { outcome: "unassigned", relation: { ...deactivatedRelation, active: false } };
}