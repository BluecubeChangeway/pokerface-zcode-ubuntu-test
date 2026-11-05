import type { DataService } from "../../../services/DataService";
import type {
  RevocationSnapshot,
  WorkloadRevocationImpact,
} from "./revocationService";
import {
  computeSplitLayerRevocationImpact,
  computeFullPathRevocationImpact,
} from "./revocationService";

/**
 * 撤回持久化编排（D-153～D-158）
 *
 * 与 ActionSubmissionService 同哲学的有序提交（Q-09-C Recoverable Commit）：
 * - 先从数据源取快照，经纯函数完整计算影响集（D-153/D-158 两分支）；
 * - 再按固定顺序执行；
 * - 软处理写入全部是对既有 ID 的幂等整行覆盖；物理删除按 ID 整批过滤、
 *   不存在的 ID 视为 no-op——中途失败后重新执行同一撤回即收敛（不复活、不重复）。
 *
 * 固定阶段顺序（D-158 规则 2/3/4 + 阶段链要求）：
 * 1. WorkloadSplit 记录保留并标记 revoked（D-155 终止证据**先行**——
 *    自本阶段起，同批次旧 UserDecision retry 在 executor/持久化边界即被终结检查拒绝）；
 * 2. Relation 软删除（active = false，保留行与审计证据）；
 * 3. CalculationResult 软失效（businessStatus = "revoked"，待重新计算）；
 * 4. 层撤销软处理（WorkloadResult / WorkloadCard 软失效；全路径为空集，自动跳过）；
 * 5. 物理 WorkloadCard 删除（D-156/D-158 全路径；层撤销为空集）；
 * 6. 物理 WorkloadResult 删除（D-156/D-158 全路径；层撤销为空集）。
 *
 * manualReview 对象不经任何写入阶段（不删除、不失效、原状保留，随结果返回供人工处理）。
 */

/**
 * 撤回快照加载（严格只读：仅 get* 调用）。除撤回提交编排外，亦供
 * revocationEntry.previewFullPathRevocation 全路径影响预览复用——
 * 预览与执行共用同一快照来源与同一影响计算（computeFullPathRevocationImpact），
 * 确保预览不产生副作用，且与最终执行的派生来源判定一致。
 */
export async function loadRevocationSnapshot(
  dataService: DataService
): Promise<RevocationSnapshot> {
  const [cards, relations, workloadResults, workloadSplits, calculationResults] =
    await Promise.all([
      dataService.getCards(),
      dataService.getRelations(),
      dataService.getWorkloadResults(),
      dataService.getWorkloadSplits(),
      dataService.getCalculationResults(),
    ]);
  return { cards, relations, workloadResults, workloadSplits, calculationResults };
}

export async function submitRevocation(
  impact: WorkloadRevocationImpact,
  dataService: DataService
): Promise<void> {
  // 阶段 1：WorkloadSplit 记录标记（D-155 终止证据先行）
  if (impact.revokedWorkloadSplits.length > 0) {
    await dataService.saveWorkloadSplits(impact.revokedWorkloadSplits);
  }
  // 阶段 2：触及被删/被撤对象的 Relation 软删除
  if (impact.deactivatedRelations.length > 0) {
    await dataService.saveRelations(impact.deactivatedRelations);
  }
  // 阶段 3：受影响 CalculationResult 软失效（待重算）
  if (impact.revokedCalculationResults.length > 0) {
    await dataService.saveCalculationResults(impact.revokedCalculationResults);
  }
  // 阶段 4：层撤销软处理（全路径为空集，自动跳过）
  if (impact.revokedWorkloadResults.length > 0) {
    await dataService.saveWorkloadResults(impact.revokedWorkloadResults);
  }
  if (impact.revokedCards.length > 0) {
    await dataService.saveCards(impact.revokedCards);
  }
  // 阶段 5：物理 WorkloadCard 删除（D-156/D-158 全路径；层撤销为空集）
  if (impact.deletedCards.length > 0) {
    await dataService.deleteCards(impact.deletedCards.map((card) => card.id));
  }
  // 阶段 6：物理 WorkloadResult 删除（D-156/D-158 全路径；层撤销为空集）
  if (impact.deletedWorkloadResults.length > 0) {
    await dataService.deleteWorkloadResults(impact.deletedWorkloadResults.map((result) => result.id));
  }
}

/**
 * 执行"撤销当前这一层 Split"（D-153 规则 2）。
 * 只撤销该层拆分关系及其未继续使用的直接派生物；
 * 已继续使用的子卡及其后续用途保留（但其本层拆分边撤销）。
 */
export async function executeSplitLayerRevocation(
  dataService: DataService,
  parentWorkloadCardId: string,
  opts?: { executionBatchId?: string }
): Promise<WorkloadRevocationImpact> {
  const snapshot = await loadRevocationSnapshot(dataService);
  const impact = computeSplitLayerRevocationImpact({
    snapshot,
    parentWorkloadCardId,
    executionBatchId: opts?.executionBatchId,
  });
  await submitRevocation(impact, dataService);
  return impact;
}

/**
 * 执行"整条错误路径撤回"（D-153 规则 3）。
 * 从入口 WorkloadCard 沿 workload_split 自然派生闭包全部撤回；
 * 入口本身保留；不做任何 used/unused 判定。
 */
export async function executeFullPathRevocation(
  dataService: DataService,
  entryWorkloadCardId: string
): Promise<WorkloadRevocationImpact> {
  const snapshot = await loadRevocationSnapshot(dataService);
  const impact = computeFullPathRevocationImpact({
    snapshot,
    entryWorkloadCardId,
  });
  await submitRevocation(impact, dataService);
  return impact;
}
