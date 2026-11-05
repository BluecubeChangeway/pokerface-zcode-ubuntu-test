import type { WorkloadResult, WorkloadSplit, Period, WorkloadCard } from "../types";
import type { Relation } from "../../relation/types";
import { encodeIdComponent } from "../../../shared/idEncoding";

/**
 * SplitFeasibilityContext - Q-09-A: 可拆分性判断依据
 * 由 resolution service 在 recommendation 阶段构建并传入
 * split service 只负责执行已确认的 split
 */
export interface SplitFeasibilityContext {
  /** 源数据对象是否支持拆分 */
  sourceDataSupportsSplit: boolean;
  /** Workload Definition 是否允许拆分 */
  definitionAllowsSplit: boolean;
  /** Workload Execution 期间是否覆盖目标子单元 */
  executionCoversTargetUnits: boolean;
  /** 目标子单元列表 */
  targetUnitIds: string[];
  /** 必要的 mapping 字段（如 departmentId、doctorId 等） */
  requiredMappings: string[];
  /** 是否已有完整的 source 数据 */
  hasCompleteSourceData: boolean;
}

/**
 * SplitExecutionInput - 用户确认后执行 split 的输入
 * 由上层应用层在用户接受 resolution recommendation 后构建
 */
export interface SplitExecutionInput {
  /** 父 WorkloadResult ID */
  parentResultId: string;
  /** 子 WorkloadResult 创建参数 */
  children: Array<{
    period?: Period;
    /** 子结果 ID（由上层生成或由本函数生成） */
    id?: string;
    name: string;
    value: number | null;
    dimensions: Record<string, string>;
    resultSetId: string;
    resultItemId: string;
  }>;
  /** 拆分类型 */
  splitType: "complete" | "partial";
  /** 拆分理由 */
  reason?: string;
  /** 容差阈值（默认 0.01） */
  tolerance?: number;
  /**
   * 执行批次标识（Q-09-C 裁定② 2026-10-04）：区分不同 UserDecision / 执行批次。
   * 提供时：WorkloadSplit ID（及未显式提供 id 的 child Result ID）按批次派生——
   * 批次标识经单射安全编码直接嵌入 ID（不使用哈希，不存在短哈希碰撞）。
   * 同批次重试 → 相同 ID（幂等）；不同批次（即使同一 parent）→ 必然不同 ID（互不覆盖，
   * 不允许第二次 split 通过 upsert 覆盖第一次的业务记录）。
   * 未提供时：保持原有 parentResultId 域生成（非决策调用方的兼容路径）。
   */
  executionBatchId?: string;
}

/**
 * SplitExecutionResult - 正式拆分执行结果
 * 包含创建的子 WorkloadResult、正式 WorkloadSplit
 * 
 * 注意：不再返回 splitRelations。
 * workload_split Relation 的正确 endpoint 是 WorkloadCard → WorkloadCard，
 * 而非 WorkloadResult → WorkloadResult。
 * Relation 创建职责交给上层 ActionExecutor：
 * - 由 ActionExecutor 在创建 child WorkloadCard 后，调用 relationService.createRelation()
 * - 使用包含 endpointKinds 的 RelationValidationContext
 * 
 * WorkloadSplit 对象本身正确记录 parentResultId / childResultId，
 * 用于统计分解记录，供上层在创建 Card 与 Relation 时参考。
 */
export interface SplitExecutionResult {
  /** 创建的子 WorkloadResult 列表 */
  childResults: WorkloadResult[];
  /** 创建的 WorkloadSplit 业务语义对象列表（统计分解记录） */
  workloadSplits: WorkloadSplit[];
  /** 汇总信息 */
  summary: {
    parentResultId: string;
    parentValue: number | null;
    childTotal: number;
    remainder: number;
    isComplete: boolean;
    hasOverflow: boolean;
  };
}

/**
 * SplitValidationError - 拆分校验错误
 */
export class SplitValidationError extends Error {
  constructor(
    message: string,
    public readonly code: "overflow" | "invalid_input" | "parent_not_found" | "parent_value_null" | "child_value_null" | "split_type_mismatch" | "parent_id_mismatch"
  ) {
    super(message);
    this.name = "SplitValidationError";
  }
}

/**
 * 创建统一 ID 生成器（供上层使用，避免多个 Date.now()）
 * 
 * 仅包含 childResultId 和 splitId，不包含 relationId（Relation 创建由 ActionExecutor 负责）
 */
export function createSplitIdGenerator(parentResultId: string) {
  let counter = 0;
  return {
    childResultId: (index: number) => `${parentResultId}-split-child-${index}-${counter++}`,
    // splitId 自 D-148（2026-10-05）起无调用方：Split 身份改为 childResultId 派生，
    // 保留仅为兼容旧引用方
    splitId: (index: number) => `${parentResultId}-split-${index}-${counter++}`,
  };
}

// 批次标识编码已提取为共享单射工具（src/shared/idEncoding.ts，Q-09-C 2026-10-04）：
// ActionSubmissionService 的 child WorkloadCard ID 与本处批次域 ID 使用同一编码规则

/**
 * 计算当前 executionBatch 下 child index 对应的 WorkloadSplit ID（确定性，与 createWorkloadSplit 内部格式一致）
 * H-2（D-145/D-146）执行归属判定用
 */
export function batchSplitId(parentResultId: string, executionBatchId: string, childResultId: string): string {
  return `${parentResultId}-split-${encodeIdComponent(executionBatchId)}-${encodeIdComponent(childResultId)}`;
}

/** H-2 执行归属判定结果 */
export type ExecutionOwnership = "current" | "other" | "unknown";

/**
 * 判断既有 WorkloadSplit 证据能否证明 childResultId 的执行归属（H-2 / D-145 / D-146）：
 * - 引用该 child 的 split ID ∈ 当前批次期望 ID → current（本执行此前已写部分事实）
 * - 存在引用该 child 但 ID ∉ 当前批次期望 → other（明确属于其他 execution）
 * - 无任何引用该 child 的 split → unknown（部分失败窗口，无法证明归属）
 * 纯函数：不做字符串前缀猜测、不依赖数据访问，仅与当前批次确定性计算的期望 ID 精确匹配
 */
export function determineChildIdOwnership(
  existingSplits: Array<Pick<WorkloadSplit, "id" | "childResultId">>,
  childResultId: string,
  currentBatchExpectedSplitIds: string[]
): ExecutionOwnership {
  let referenced = false;
  for (const split of existingSplits) {
    if (split.childResultId !== childResultId) continue;
    referenced = true;
    if (currentBatchExpectedSplitIds.includes(split.id)) {
      return "current";
    }
  }
  return referenced ? "other" : "unknown";
}

function periodEquals(a: Period | undefined, b: Period | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.start !== b.start || a.end !== b.end || a.mode !== b.mode) return false;
  const aSources = a.sourcePeriods ?? [];
  const bSources = b.sourcePeriods ?? [];
  if (aSources.length !== bSources.length) return false;
  for (let i = 0; i < aSources.length; i++) {
    if (!periodEquals(aSources[i], bSources[i])) return false;
  }
  return true;
}

/**
 * WorkloadResult 业务内容完全一致判定（H-2 幂等恢复例外 / D-146）：
 * 比较当前模型的全部业务字段 resultSetId / resultItemId / name / value / dimensions / period；
 * id 是查找键，不参与内容比较；
 * value 严格比较（null ≠ 0，INV-079）；dimensions 比较键集与每键值（键顺序无关）；
 * period 结构比较（start/end/mode/sourcePeriods 递归）。
 * 不比较任何当前模型不存在的字段。
 */
export function workloadResultContentEquals(
  a: Pick<WorkloadResult, "resultSetId" | "resultItemId" | "name" | "value" | "dimensions" | "period">,
  b: Pick<WorkloadResult, "resultSetId" | "resultItemId" | "name" | "value" | "dimensions" | "period">
): boolean {
  if (a.resultSetId !== b.resultSetId) return false;
  if (a.resultItemId !== b.resultItemId) return false;
  if (a.name !== b.name) return false;
  if (a.value !== b.value) return false;
  const aKeys = Object.keys(a.dimensions).sort();
  const bKeys = Object.keys(b.dimensions).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (a.dimensions[aKeys[i]] !== b.dimensions[bKeys[i]]) return false;
  }
  return periodEquals(a.period, b.period);
}

/**
 * 计算拆分余数与完整性
 * 不使用 Math.max(0, ...) 隐藏非法状态
 * childTotal > parentValue 时抛出 overflow 错误
 */
export function calculateSplitRemainder(
  parentValue: number | null,
  childValues: number[],
  tolerance: number = 0.01
): { remainder: number; isComplete: boolean; hasOverflow: boolean } {
  if (parentValue === null) {
    throw new SplitValidationError("父结果值为 null，无法计算余数", "parent_value_null");
  }

  const childTotal = childValues.reduce((sum, v) => sum + v, 0);
  
  // 检查 childTotal 是否超过 parentValue（超出容差）
  if (childTotal > parentValue + tolerance) {
    throw new SplitValidationError(
      `子结果总值 ${childTotal} 超过父结果值 ${parentValue}（容差 ${tolerance}），非法拆分`,
      "overflow"
    );
  }

  const remainder = parentValue - childTotal;
  const isComplete = Math.abs(parentValue - childTotal) <= tolerance;

  return {
    remainder: Math.max(0, remainder), // 此处 max(0) 仅用于完整拆分时 remainder=0 的语义正确性，overflow 已在上方拦截
    isComplete,
    hasOverflow: false,
  };
}

/**
 * 执行正式 Workload 拆分
 * - 创建子 WorkloadResult
 * - 创建 WorkloadSplit 业务语义对象（统计分解记录）
 * - 不创建 workload_split Relation（Relation 端点是 WorkloadCard，不属于本层职责）
 * - Relation 创建由上层 ActionExecutor 在创建 child WorkloadCard 后完成
 * - 校验 splitType 与实际完整性一致性
 * - 校验 parentResult.id 与 input.parentResultId 一致
 * - 拒绝空 children
 */
export function createWorkloadSplit(
  input: SplitExecutionInput,
  parentResult: WorkloadResult
): SplitExecutionResult {
  // 1. 校验父结果存在（必须先于 .id 访问，避免 null 时 TypeError）
  if (!parentResult) {
    throw new SplitValidationError("父 WorkloadResult 不存在", "parent_not_found");
  }

  // 2. 校验父结果 ID 与 input.parentResultId 一致
  if (parentResult.id !== input.parentResultId) {
    throw new SplitValidationError(
      `父结果 ID 不匹配：input.parentResultId="${input.parentResultId}" 但 parentResult.id="${parentResult.id}"`,
      "parent_id_mismatch"
    );
  }

  // 3. 校验父结果值
  const parentValue = parentResult.value;
  if (parentValue === null) {
    throw new SplitValidationError("父结果值为 null，无法执行拆分", "parent_value_null");
  }

  // 4. 拒绝空 children
  if (input.children.length === 0) {
    throw new SplitValidationError("至少需要一个子结果", "invalid_input");
  }

  // 4.5 显式 child ID 唯一性（Q-09-C E-1 裁定 2026-10-05）：
  // 同一 Split Execution 中显式 children[].id 必须唯一。
  // 重复 = 非法输入（一次确定执行对同一 identity 只有一个结果，D-144）：
  // 整体拒绝，不得合并、不得"后者覆盖前者"、不得依赖数组顺序决定最终值。
  // 无 id 的 children 不参与本规则，继续走批次生成逻辑。
  const seenExplicitChildIds = new Set<string>();
  for (const child of input.children) {
    if (child.id) {
      if (seenExplicitChildIds.has(child.id)) {
        throw new SplitValidationError(
          `同一拆分决策中存在重复 child Result ID：${child.id}`,
          "invalid_input"
        );
      }
      seenExplicitChildIds.add(child.id);
    }
  }

  // 4.6 统计锚点唯一性（E-2 / D-148，2026-10-05）：
  // 同一 Split Execution 中 (resultSetId, resultItemId) 只能出现一次——
  // 无论 child.id / name / value 是否不同。Split 是分解（CASE/SEE 原则）：
  // 同一统计结果一次拆分只能对应一个 child；重复使用/组合属后续业务。
  // 显式 id 不能绕过本规则。
  const seenAnchors = new Set<string>();
  for (const child of input.children) {
    const anchor = `${child.resultSetId}::${child.resultItemId}`;
    if (seenAnchors.has(anchor)) {
      throw new SplitValidationError(
        `同一拆分决策中统计锚点重复：resultSetId=${child.resultSetId}，resultItemId=${child.resultItemId}（同一统计结果在一次拆分中只能对应一个 child）`,
        "invalid_input"
      );
    }
    seenAnchors.add(anchor);
  }

  // 5. 校验所有子结果值非 null
  for (const child of input.children) {
    if (child.value === null) {
      throw new SplitValidationError(`子结果 ${child.name} 值为 null，无法执行拆分`, "child_value_null");
    }
  }

  // 6. 生成 ID（使用统一生成器，或使用上层传入的 ID）
  const idGen = createSplitIdGenerator(input.parentResultId);
  // Q-09-C 裁定②：批次域 ID —— 同批次重试幂等；不同批次（即使同一 parent）互不覆盖。
  // 批次标识经单射安全编码直接嵌入 ID（不使用哈希，无碰撞风险）
  const batchKey = input.executionBatchId
    ? encodeIdComponent(input.executionBatchId)
    : undefined;

  // 7. 创建子 WorkloadResult
  // child period 来源于父 WorkloadResult.period：拆分的是同一统计事实，
  // child result 的结果期间与父一致，不自行创建新 Period。
  // 父 period 缺失时保持 undefined，不伪造期间。
  const childResults: WorkloadResult[] = input.children.map((child, index) => ({
    id: child.id || (batchKey
      ? // E-2 / D-148：锚点型生成 ID——不含 index/value/name/period，
        // 同批次+同锚点 → 永远同 ID；children 换序 → ID 不变；D-142 新批次 → 新 ID
        `${input.parentResultId}-split-child-${batchKey}-${encodeIdComponent(`${child.resultSetId}::${child.resultItemId}`)}`
      : idGen.childResultId(index)),
    resultSetId: child.resultSetId,
    resultItemId: child.resultItemId,
    name: child.name,
    value: child.value!,
    dimensions: child.dimensions,
    period: parentResult.period,
  }));

  // 8. 计算汇总（已在校验阶段保证 child.value 非 null）
  const childValues = childResults.map(c => c.value) as number[];
  const childTotal = childValues.reduce((sum, v) => sum + v, 0);
  const { remainder, isComplete, hasOverflow } = calculateSplitRemainder(parentValue, childValues, input.tolerance);

  // 9. 严格校验 splitType 与实际完整性一致
  if (input.splitType === "complete" && !isComplete) {
    throw new SplitValidationError(
      `splitType="complete" 但 childTotal(${childTotal}) 与 parentValue(${parentValue}) 不匹配，remainder=${remainder}`,
      "split_type_mismatch"
    );
  }
  if (input.splitType === "partial" && isComplete) {
    // partial 恰好完全拆完：允许但记录为完整拆分，建议改为 complete
    // 这里不抛出错误，但 summary 会反映 isComplete=true
  }

  // 10. 创建 WorkloadSplit 业务语义对象（统计分解记录）
  // WorkloadSplit 正确记录 parentResultId / childResultId（WorkloadResult ID）
  // 用于统计分解记录，供上层在创建 Card 与 Relation 时参考
  const workloadSplits: WorkloadSplit[] = childResults.map((child, index) => ({
    // E-2 / D-148：Split 身份 = parent + child（顺序无关，不含 index）。
    // 保留批次段：显式 child id 本身不含批次，批次段是 determineChildIdOwnership
    // 判定"other"（跨 execution 复用，D-145 无论内容必拒）的唯一证据；
    // 生成型 child id 已含批次，此处的批次段对其为冗余但无害（防御一致）。
    id: batchKey
      ? `${input.parentResultId}-split-${batchKey}-${encodeIdComponent(child.id)}`
      : `${input.parentResultId}-split-${encodeIdComponent(child.id)}`,
    parentResultId: input.parentResultId,
    childResultId: child.id,
    splitType: input.splitType,
    splitRatio: child.value !== null && parentValue !== 0 ? child.value / parentValue : undefined,
    reason: input.reason,
    metadata: {
      childIndex: index,
      childValue: child.value,
      // remainder 不记录在单个 child 上，属于整个 split operation
      // 如需记录整体 remainder，由 summary 提供
    },
  }));

  return {
    childResults,
    workloadSplits,
    summary: {
      parentResultId: input.parentResultId,
      parentValue,
      childTotal,
      remainder,
      isComplete,
      hasOverflow,
    },
  };
}

/**
 * 校验拆分是否可行（仅做基础结构校验，业务可行性由 SplitFeasibilityContext 决定）
 * resolution service 负责构建 SplitFeasibilityContext 并生成 recommendation
 * split service 只负责执行
 */
export function validateSplitExecution(
  input: SplitExecutionInput,
  parentResult: WorkloadResult | null,
  feasibilityContext?: SplitFeasibilityContext
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!parentResult) {
    errors.push("父 WorkloadResult 不存在");
    return { valid: false, errors };
  }

  if (parentResult.value === null) {
    errors.push("父结果值为 null，无法执行拆分");
  }

  if (input.children.length === 0) {
    errors.push("至少需要一个子结果");
  }

  for (const child of input.children) {
    if (child.value === null) {
      errors.push(`子结果 ${child.name} 值为 null`);
    }
    if (!child.resultSetId || !child.resultItemId) {
      errors.push(`子结果 ${child.name} 缺少 resultSetId 或 resultItemId`);
    }
  }

  // 可选：校验业务可行性上下文
  if (feasibilityContext) {
    if (!feasibilityContext.sourceDataSupportsSplit) {
      errors.push("源数据不支持拆分");
    }
    if (!feasibilityContext.definitionAllowsSplit) {
      errors.push("Workload Definition 不允许拆分");
    }
    if (!feasibilityContext.executionCoversTargetUnits) {
      errors.push("Workload Execution 期间不覆盖目标子单元");
    }
    if (!feasibilityContext.hasCompleteSourceData) {
      errors.push("缺少完整的源数据");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取已存在的 workload_split 关系（查询正式 Relation）
 * 
 * 语义修正（Q-09-C）：
 * - workload_split Relation 的 endpoint 是 WorkloadCard → WorkloadCard
 * - 参数语义为 parentWorkloadCardId（而非 parentResultId）
 * - 仅查询 active && type === "workload_split" && sourceId === parentWorkloadCardId
 */
export function getExistingSplitRelations(
  parentWorkloadCardId: string,
  existingRelations: Relation[]
): Relation[] {
  return existingRelations.filter(
    r => r.type === "workload_split" && r.sourceId === parentWorkloadCardId && r.active
  );
}

/**
 * 获取已存在的子 WorkloadResult（通过正式 Relation 查询）
 * 
 * 语义修正（Q-09-C）：
 * - workload_split Relation 的 targetId 是 child WorkloadCard ID
 * - 不能直接把 Relation.targetId 当作 WorkloadResult ID
 * - 必须通过：Relation.targetId → child WorkloadCard → workloadResultId → WorkloadResult
 * 
 * @param parentWorkloadCardId 父 WorkloadCard ID
 * @param existingRelations 现有 Relation 列表
 * @param allCards 所有 Card 列表（用于查找 child WorkloadCard 并解析 workloadResultId）
 * @param allResults 所有 WorkloadResult 列表（用于通过 workloadResultId 查找结果）
 */
export function getExistingSplitChildren(
  parentWorkloadCardId: string,
  existingRelations: Relation[],
  allCards: Map<string, { id: string; type: string; workloadResultId?: string }>,
  allResults: WorkloadResult[]
): WorkloadResult[] {
  // 1. 查找 parentWorkloadCardId 下的所有 workload_split Relation
  const splitRelations = getExistingSplitRelations(parentWorkloadCardId, existingRelations);
  
  // 2. 通过 Relation.targetId 找到 child WorkloadCard
  const childCardIds = splitRelations.map(r => r.targetId);
  
  // 3. 从 child WorkloadCard 获取 workloadResultId
  const childResultIds: string[] = [];
  for (const childCardId of childCardIds) {
    const childCard = allCards.get(childCardId);
    if (childCard && childCard.type === "workload" && childCard.workloadResultId) {
      childResultIds.push(childCard.workloadResultId);
    }
  }
  
  // 4. 通过 workloadResultId 找到 WorkloadResult
  return allResults.filter(r => childResultIds.includes(r.id));
}
