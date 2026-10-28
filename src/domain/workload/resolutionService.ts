import type {
  ResolutionContext,
  ResolutionResult,
  ResolutionMatchType,
  ResolutionRecommendation,
  ResolutionRecommendationType,
  MatchBasis,
  WorkloadResult,
  WorkloadCard,
  UnitCard,
  CalculationSnapshot,
  ResultSet,
  WorkloadDefinition,
  WorkloadExecution,
  SourceDataObject,
  MappingEvidence
} from "./resolutionTypes";

/**
 * 纯领域 Resolution Engine
 * 只负责计算 ResolutionResult，不创建任何 Domain Fact (Relation, WorkloadSplit, WorkloadResult, Card)
 * Resolution 属于 recommendation layer，仅生成 recommendation 数据
 */

/**
 * 根据 ResolutionContext 解析 WorkloadCard 与目标 Unit 的匹配关系
 * 纯函数，无副作用
 */
export function resolveWorkloadToUnit(context: ResolutionContext): ResolutionResult {
  const { workloadCard, targetUnit, existingResults, unitHierarchy, workloadHierarchy } = context;

  // 获取 WorkloadCard 关联的 WorkloadResult
  const workloadResult = workloadCard.workloadResultId
    ? existingResults.find(r => r.id === workloadCard.workloadResultId)
    : undefined;

  if (!workloadResult) {
    return buildNoMatchResult(workloadCard, targetUnit, "WorkloadCard 未关联有效 WorkloadResult");
  }

  // 确定 matchType
  const matchType = determineMatchType(workloadResult, targetUnit, unitHierarchy, context);

  // 查找 existingResult（如果存在）
  const existingResult = findExistingResult(workloadResult, targetUnit, existingResults, unitHierarchy, workloadHierarchy);

  // 构建 MatchBasis
  const matchBasis = buildMatchBasis(
    workloadResult,
    targetUnit,
    matchType,
    existingResult,
    unitHierarchy,
    workloadHierarchy,
    context
  );

  // 生成 Recommendation
  const recommendation = generateRecommendation(
    matchType,
    workloadCard,
    targetUnit,
    workloadResult,
    existingResult,
    matchBasis,
    context
  );

  // W3：精确匹配时 generateRecommendation 可能附带 supplementalSplit——
  // 提取到 ResolutionResult.supplementalRecommendation（不留在主推荐上），
  // resolutionTrigger 注册第二条推荐（稳定 ID 带 -split 后缀区分）
  const supplementalRecommendation = (recommendation as ResolutionRecommendation & {
    supplementalSplit?: ResolutionRecommendation;
  }).supplementalSplit;
  const primaryRecommendation = { ...recommendation };
  delete (primaryRecommendation as Record<string, unknown>).supplementalSplit;

  return {
    matchType,
    workloadCard: { id: workloadCard.id, name: workloadCard.name, workloadResultId: workloadCard.workloadResultId },
    targetUnit: { id: targetUnit.id, name: targetUnit.name },
    existingResult: existingResult ? { id: existingResult.id, name: existingResult.name, resultSetId: existingResult.resultSetId } : undefined,
    matchDetails: buildMatchDetails(matchType, workloadResult, targetUnit, existingResult, matchBasis),
    matchBasis,
    recommendation: primaryRecommendation,
    ...(supplementalRecommendation ? { supplementalRecommendation } : {})
  };
}

/**
 * 解析 targetWorkloadCardId
 * 规则：
 * - 0 个候选 Card：不得伪造，返回 undefined
 * - 1 个候选 Card：使用该 Card ID
 * - 多个候选 Card：无法确定，返回 undefined（不得按顺序取第一个）
 * 
 * 只有当上下文存在足够信息唯一确定 Card 时，才允许返回 Card ID。
 */
function resolveTargetWorkloadCardId(
  targetResultId: string,
  context: ResolutionContext
): string | undefined {
  if (!context.existingCards) {
    return undefined;
  }
  
  const candidates: string[] = [];
  for (const [cardId, card] of context.existingCards.entries()) {
    if (card.type === "workload" && card.workloadResultId === targetResultId) {
      candidates.push(cardId);
    }
  }
  
  if (candidates.length === 0) {
    return undefined; // 0 个候选：不伪造
  }
  
  if (candidates.length === 1) {
    return candidates[0]; // 1 个候选：使用
  }
  
  // 多个候选：无法唯一确定，不得按顺序取第一个
  // 只有当上下文存在足够信息唯一确定时，才允许选择
  // 当前实现：保留 ambiguity，返回 undefined
  return undefined;
}
function determineMatchType(
  workloadResult: WorkloadResult,
  targetUnit: UnitCard,
  unitHierarchy: Map<string, string[]>,
  context: ResolutionContext
): ResolutionMatchType {
  const workloadDimensions = workloadResult.dimensions;
  const targetUnitId = targetUnit.id;

  // 提取 WorkloadResult 的部门/单元维度
  const workloadUnitId = workloadDimensions.departmentId || workloadDimensions.wardId;

  if (!workloadUnitId) {
    return "none";
  }

  // Exact Match: 维度完全一致
  if (workloadUnitId === targetUnitId) {
    return "exact";
  }

  // 检查 Unit hierarchy 关系
  const isAncestor = isAncestorOf(workloadUnitId, targetUnitId, unitHierarchy);
  const isDescendant = isAncestorOf(targetUnitId, workloadUnitId, unitHierarchy);

  if (isAncestor) {
    return "ancestor";
  }
  if (isDescendant) {
    return "descendant";
  }

  return "none";
}

/**
 * 检查 ancestorId 是否为 descendantId 的祖先
 */
function isAncestorOf(ancestorId: string, descendantId: string, hierarchy: Map<string, string[]>): boolean {
  const children = hierarchy.get(ancestorId);
  if (!children) return false;
  if (children.includes(descendantId)) return true;
  return children.some(child => isAncestorOf(child, descendantId, hierarchy));
}

/**
 * 比较两个 WorkloadResult 的 dimensions 是否完全相同
 */
function dimensionsEqual(dim1: Record<string, string>, dim2: Record<string, string>): boolean {
  const keys1 = Object.keys(dim1);
  const keys2 = Object.keys(dim2);
  if (keys1.length !== keys2.length) return false;
  return keys1.every(key => dim1[key] === dim2[key]);
}

/**
 * 查找 existingResult
 * - exact: 查找同一维度的既有结果（排除当前 workloadResult）
 * - ancestor: 查找 targetUnit 维度的既有子结果
 * - descendant: 查找父级维度的既有结果
 */
function findExistingResult(
  workloadResult: WorkloadResult,
  targetUnit: UnitCard,
  existingResults: WorkloadResult[],
  unitHierarchy: Map<string, string[]>,
  workloadHierarchy: Map<string, string[]>
): WorkloadResult | undefined {
  const targetUnitId = targetUnit.id;
  const workloadUnitId = workloadResult.dimensions.departmentId || workloadResult.dimensions.wardId;

  if (!workloadUnitId) return undefined;

  // ancestor: 找 targetUnit 的子结果
  if (isAncestorOf(workloadUnitId, targetUnitId, unitHierarchy)) {
    const targetChildren = unitHierarchy.get(targetUnitId) || [];
    for (const childId of targetChildren) {
      const childResult = existingResults.find(r =>
        (r.dimensions.departmentId === childId || r.dimensions.wardId === childId) &&
        r.id !== workloadResult.id
      );
      if (childResult) return childResult;
    }
  }

  // descendant: 找父级结果
  if (isAncestorOf(targetUnitId, workloadUnitId, unitHierarchy)) {
    for (const [parentId, children] of unitHierarchy.entries()) {
      if (children.includes(workloadUnitId)) {
        const parentResult = existingResults.find(r =>
          (r.dimensions.departmentId === parentId || r.dimensions.wardId === parentId) &&
          r.id !== workloadResult.id
        );
        if (parentResult) return parentResult;
      }
    }
  }

  // exact: 同一维度的其他结果（排除自身）
  // 只有当 workloadUnitId 与 targetUnitId 完全相同时才检查 exact match 的 existingResult
  // 且要求 dimensions 完全相同（而非仅 departmentId 相同）
  if (workloadUnitId === targetUnit.id) {
    const sameDimension = existingResults.find(r =>
      r.id !== workloadResult.id &&
      dimensionsEqual(r.dimensions, workloadResult.dimensions)
    );
    if (sameDimension) return sameDimension;
  }

  return undefined;
}

/**
 * 获取 WorkloadCard ID(s) 通过 WorkloadResult ID
 * 通过 workloadCards 映射表查找
 * 
 * 注意：根据 D-120，同一个 WorkloadResult 可以被多个 WorkloadCard 引用。
 * 返回所有匹配的 WorkloadCard IDs。
 * 
 * 当需要找到当前正在解析的 WorkloadCard 时，应优先使用 context.workloadCard.id，
 * 而不是通过 WorkloadResult ID 反查（因为可能有多个 Card 引用同一个 Result）。
 */
function getWorkloadCardIdsByResultId(
  workloadResultId: string,
  context: ResolutionContext
): string[] {
  if (!context.workloadCards) return [];
  const result: string[] = [];
  for (const [cardId, card] of context.workloadCards.entries()) {
    if (card.workloadResultId === workloadResultId) {
      result.push(cardId);
    }
  }
  return result;
}

/**
 * 获取当前正在解析的 WorkloadCard ID
 * 优先使用 context.workloadCard，这是当前正在被解析的 Card
 */
function getCurrentWorkloadCardId(context: ResolutionContext): string | undefined {
  return context.workloadCard?.id;
}

/**
 * 获取 WorkloadResult 关联的 Definition 和 Execution
 */
function getDefinitionAndExecution(workloadResult: WorkloadResult, context: ResolutionContext) {
  const workloadResultSet = context.resultSets.find(rs => rs.id === workloadResult.resultSetId);
  const snapshotId = workloadResultSet?.snapshotId;
  const snapshot = context.snapshots.find(s => s.id === snapshotId);
  const definitionId = snapshot?.definition.id;
  const definition = definitionId ? context.workloadDefinitionMap.get(definitionId) : undefined;
  const execution = snapshot ? context.workloadExecutionMap.get(snapshot.execution.id) : undefined;
  return { definition, execution };
}

/**
 * 构建 MatchBasis - 保留用户可理解的匹配依据
 */
function buildMatchBasis(
  workloadResult: WorkloadResult,
  targetUnit: UnitCard,
  matchType: ResolutionMatchType,
  existingResult: WorkloadResult | undefined,
  unitHierarchy: Map<string, string[]>,
  workloadHierarchy: Map<string, string[]>,
  context: ResolutionContext
): MatchBasis {
  const workloadUnitId = workloadResult.dimensions.departmentId || workloadResult.dimensions.wardId;
  const targetUnitId = targetUnit.id;

  // 确定 unitRelation
  let unitRelation: "self" | "ancestor" | "descendant" | "none";
  if (matchType === "exact") unitRelation = "self";
  else if (matchType === "ancestor") unitRelation = "ancestor";
  else if (matchType === "descendant") unitRelation = "descendant";
  else unitRelation = "none";

  // 获取 source data/definition/execution 信息
  const { definition, execution } = getDefinitionAndExecution(workloadResult, context);

  // Split feasibility - 基于 source data + definition + execution + target children + mapping
  const splitFeasibility = assessSplitFeasibility(
    workloadResult,
    targetUnit,
    context.unitHierarchy,
    context.workloadHierarchy,
    context,
    matchType
  );

  // Aggregation feasibility
  const aggregationFeasibility = assessAggregationFeasibility(
    workloadResult,
    targetUnit,
    context.unitHierarchy,
    context.workloadHierarchy,
    context,
    matchType
  );

  return {
    sourceDataObjectId: definition?.sourceDataObjectId,
    definitionId: definition?.id,
    definitionVersion: definition?.version,
    executionId: execution?.id,
    executionPeriod: execution?.period,
    resultDimensions: workloadResult.dimensions,
    targetUnitId: targetUnit.id,
    unitRelation,
    mappingEvidence: buildMappingEvidence(workloadResult, targetUnit, matchType),
    // 源统计实际观测证据（直接引用 ResolutionContext 已生成的投影，不复制/不重构；
    // 与 mappingEvidence（单数，Unit 匹配解释文本）语义不同。D-136：matching basis 必须可见）
    mappingEvidences: context.mappingEvidences,
    splitFeasibility,
    aggregationFeasibility,
    existingResult: existingResult ? { id: existingResult.id, name: existingResult.name, resultSetId: existingResult.resultSetId } : undefined
  };
}

/**
 * 评估 split 可行性 - 基于 source data + definition + execution + target children + mapping
 * Unit hierarchy alone 不足以证明可 split
 * 必须有具体的 mapping evidence 证明具体 target child 可以从源统计中被区分
 * 
 * 关键边界：只有 ancestor match type 才评估 split feasibility
 * exact / descendant / none 不应产生 split feasibility
 *
 * 【Evidence 判定（Q-09-C 2026-10-03 裁定）】：
 * mappingEvidences（父级 WorkloadResult 对应 ResultSet.items 的查询投影）是
 * split feasibility 的唯一正式证据：逐 target child 判定实际观测证据是否存在，
 * 全部具备才允许 feasible = true；缺失时保持 cannot_determine，
 * 并在 requiredMappings 列出缺失 child（UnitCard ID 语义，不是 MappingEvidence / Relation ID）。
 * workloadAssignments join 仅提供"哪些 child 已有对应 Workload"的参考信息（写入 reason），不参与判定。
 * Relation 仍是唯一关系事实源（D-001）；不允许仅凭 Unit hierarchy / Definition.dimensions /
 * workload_assign 推断 evidence（核心不可破坏原则 12）。
 */
function assessSplitFeasibility(
  workloadResult: WorkloadResult,
  targetUnit: UnitCard,
  unitHierarchy: Map<string, string[]>,
  workloadHierarchy: Map<string, string[]>,
  context: ResolutionContext,
  matchType: ResolutionMatchType
): { feasible: boolean | "cannot_determine"; reason: string; requiredMappings?: string[]; certainlyNotFeasible: boolean } | undefined {
  // W3（2026-10-27）：ancestor 和 exact 都评估 split feasibility。
  // ancestor：父级 Workload 拆分到子单元（既有行为不变）。
  // exact：精确匹配时也可给出"按子单元拆分"的补充建议（D-122 完整语义：
  //   "拖入 Unit Slot 后，如果条件支持，可以提供按子 Unit 拆分建议"——无"仅限祖先匹配"）。
  // descendant/none 不评估（子级无法再拆分到目标单元的子级）。
  if (matchType !== "ancestor" && matchType !== "exact") {
    return undefined;
  }

  const workloadUnitId = workloadResult.dimensions.departmentId || workloadResult.dimensions.wardId;
  const targetUnitId = context.targetUnit.id;

  const targetChildren = context.unitHierarchy.get(targetUnitId) || [];
  if (targetChildren.length === 0) {
    return { feasible: false, reason: "目标 Unit 无子单元，无法进行 split", certainlyNotFeasible: true };
  }

  // 检查统计配置与 WorkloadResult 实际使用的 Unit 维度一致
  // （Q-09-C 2026-10-04 修正：不再硬编码 departmentId；
  //   wardId 型 Workload 同样允许进入 evidence gate。
  //   最小原则：Definition dimension = 统计配置具备该维度；
  //   ResultSet item dimension = 实际统计产生该维度证据；
  //   feasible=true 最终仍只能由 context.mappingEvidences 决定）
  const { definition } = getDefinitionAndExecution(workloadResult, context);

  if (!definition) {
    return { feasible: false, reason: "找不到对应的 WorkloadDefinition", certainlyNotFeasible: true };
  }

  // 当前 WorkloadResult 实际使用的 Unit 维度（与 determineMatchType 提取语义一致：departmentId ?? wardId）
  const unitDimensionField = workloadResult.dimensions.departmentId
    ? "departmentId"
    : workloadResult.dimensions.wardId
      ? "wardId"
      : undefined;
  if (!unitDimensionField) {
    return { feasible: false, reason: "WorkloadResult 不含 Unit 维度（departmentId/wardId），无法按 Unit 拆分", certainlyNotFeasible: true };
  }
  const definitionSupportsDimension = definition.dimensions.some(d => d.field === unitDimensionField);
  if (!definitionSupportsDimension) {
    return { feasible: false, reason: `Definition 缺少 ${unitDimensionField} 维度，统计配置与 WorkloadResult 实际使用的 Unit 维度不一致，不支持按该维度 split`, certainlyNotFeasible: true };
  }

  // 【Evidence 门控（Q-09-C 2026-10-03 裁定语义）】：
  // mappingEvidences（父级 ResultSet.items 查询投影）是 split feasibility 的唯一证据来源。
  // - 逐 target child 判定是否存在实际观测证据；
  // - 全部 child 均有 evidence → 才允许 feasible = true；
  // - 部分/全部缺失 → 保持 cannot_determine，requiredMappings 列出缺失 child；
  // - 不得因 Unit hierarchy / Definition.dimensions / workloadAssignments 的存在而判定 feasible；
  // - certainlyNotFeasible 仅表示确定性否定，缺 evidence 不设 true。
  const mappingEvidences = context.mappingEvidences || [];
  const evidenceCoveredChildren = new Set(
    mappingEvidences
      .map((evidence) => evidence.targetChildUnitId)
      .filter((childId) => targetChildren.includes(childId))
  );
  const childrenWithoutEvidence = targetChildren.filter(
    (childId) => !evidenceCoveredChildren.has(childId)
  );

  // workloadAssignments join：仅统计"哪些 target child 已有对应 child Workload"，
  // 作为 reason 参考信息，不参与 feasibility 判定
  let assignedChildCount = 0;
  if (context.workloadAssignments) {
    const currentWorkloadCardId = getCurrentWorkloadCardId(context);
    const childWorkloadCardIds = currentWorkloadCardId
      ? workloadHierarchy.get(currentWorkloadCardId) || []
      : [];
    const assignedChildUnits = new Set<string>();
    for (const childWorkloadCardId of childWorkloadCardIds) {
      for (const unitId of context.workloadAssignments.get(childWorkloadCardId) || []) {
        if (targetChildren.includes(unitId)) {
          assignedChildUnits.add(unitId);
        }
      }
    }
    assignedChildCount = assignedChildUnits.size;
  }

  if (childrenWithoutEvidence.length === 0) {
    return {
      feasible: true as const,
      reason: `所有 ${targetChildren.length} 个 target 子单元均具备源统计实际观测证据（父级 ResultSet 实际维度值）${context.workloadAssignments ? `，其中 ${assignedChildCount} 个已有对应 child Workload（workload_assign join，仅供参考）` : ""}，可判定支持拆分。`,
      requiredMappings: [],
      certainlyNotFeasible: false
    };
  }

  return {
    feasible: "cannot_determine" as const,
    reason: `无法判定 split feasibility：${childrenWithoutEvidence.length}/${targetChildren.length} 个 target 子单元缺少源统计实际观测证据（evidence 门控，核心不可破坏原则 12；不允许仅凭 Unit hierarchy / Definition.dimensions / workload_assign 推断）${context.workloadAssignments ? `；workload_assign join：${assignedChildCount}/${targetChildren.length} 个已有对应 child Workload（仅供参考）` : ""}。`,
    requiredMappings: childrenWithoutEvidence,
    certainlyNotFeasible: false
  };
}

/**
 * 评估 aggregation 可行性
 * 不得自动把所有 siblingResults 放进 selectedChildren
 * 必须区分：当前 WorkloadResult、可聚合候选 children、已明确选择的 children、未选择 children
 */
function assessAggregationFeasibility(
  workloadResult: WorkloadResult,
  targetUnit: UnitCard,
  unitHierarchy: Map<string, string[]>,
  workloadHierarchy: Map<string, string[]>,
  context: ResolutionContext,
  matchType: ResolutionMatchType
): { feasible: boolean; reason: string; partialAllowed: boolean; selectedChildren?: string[]; unselectedChildren?: string[]; candidateChildren?: string[] } | undefined {
  // 只有 descendant 类型需要评估 aggregation feasibility
  if (matchType !== "descendant") {
    return undefined;
  }

  const workloadUnitId = workloadResult.dimensions.departmentId || workloadResult.dimensions.wardId;
  const targetUnitId = context.targetUnit.id;

  // 查找 workload hierarchy 中的父级
  // workloadHierarchy 的 key 是 WorkloadCard ID，优先使用当前正在解析的 WorkloadCard ID
  const workloadCardId = getCurrentWorkloadCardId(context);
  if (!workloadCardId) {
    return { feasible: false, reason: "无法找到当前 WorkloadCard", partialAllowed: false };
  }

  let parentWorkloadCardId: string | undefined;
  for (const [parentId, children] of context.workloadHierarchy.entries()) {
    if (children.includes(workloadCardId)) {
      parentWorkloadCardId = parentId;
      break;
    }
  }

  if (!parentWorkloadCardId) {
    return { feasible: false, reason: "未找到父级 WorkloadCard，无法聚合", partialAllowed: false };
  }

  // 查找同父级下的其他 child WorkloadCard IDs
  const siblings = context.workloadHierarchy.get(parentWorkloadCardId) || [];
  const siblingCardIds = siblings.filter(id => id !== workloadCardId);

  // 查找 sibling WorkloadCard 对应的 WorkloadResult
  // 注意：同一个 WorkloadResult 可能被多个 WorkloadCard 引用
  // 这里通过 workloadCards 获取所有引用该 WorkloadResult 的 Card IDs
  const siblingResults = siblingCardIds
    .map(cardId => {
      const card = context.workloadCards?.get(cardId);
      if (!card?.workloadResultId) return undefined;
      return findWorkloadResultById(card.workloadResultId, context.existingResults);
    })
    .filter((r): r is WorkloadResult => r !== undefined);

  // 候选可聚合的 children（当前 workloadResult + 找到的 sibling results）
  const candidateChildren = [workloadResult.id, ...siblingResults.map(r => r.id)];
  
  // 默认不选中任何 sibling，只有当前 workloadResult
  // 用户需要在后续确认中明确选择哪些 children 参与聚合
  const selectedChildren = [workloadResult.id];
  const unselectedChildren = siblingResults.map(r => r.id);

  return {
    feasible: siblingResults.length > 0,
    reason: siblingResults.length > 0
      ? `发现 ${siblingResults.length} 个可聚合的同级 Workload，可部分或全部聚合到父级`
      : "无其他子 Workload 可聚合",
    partialAllowed: true,
    candidateChildren,
    selectedChildren: [workloadResult.id], // 仅包含当前 workloadResult，不预设选择任何 sibling
    unselectedChildren: siblingResults.map(r => r.id).length > 0 ? siblingResults.map(r => r.id) : undefined
  };
}

/**
 * 查找 WorkloadResult by ID
 */
function findWorkloadResultById(id: string, existingResults: WorkloadResult[]): WorkloadResult | undefined {
  return existingResults.find(r => r.id === id);
}

/**
 * 构建 mapping evidence
 */
function buildMappingEvidence(
  workloadResult: WorkloadResult,
  targetUnit: UnitCard,
  matchType: ResolutionMatchType
): string {
  const workloadUnitId = workloadResult.dimensions.departmentId || workloadResult.dimensions.wardId;
  const targetUnitId = targetUnit.id;

  switch (matchType) {
    case "exact":
      return `Workload 统计维度 (${workloadUnitId}) 与目标 Unit (${targetUnitId}) 完全匹配`;
    case "ancestor":
      return `Workload 统计范围 (${workloadUnitId}) 包含目标 Unit (${targetUnitId})，属父级→子级关系`;
    case "descendant":
      return `Workload 统计范围 (${workloadUnitId}) 属于目标 Unit (${targetUnitId})，属子级→父级关系`;
    case "none":
      return `Workload 统计维度 (${workloadUnitId}) 与目标 Unit (${targetUnitId}) 无法建立层级关系`;
    default:
      return "未知匹配关系";
  }
}

/**
 * 生成 Recommendation
 * 关键规则：
 * - 即使发现等价 existingResult，也不能自动复用
 * - use_existing_result_with_confirmation 而非自动复用
 * - split/aggregate 只能生成 recommendation，不执行
 * - 如果既有 existingResult 又有 aggregation feasible，优先提示 existingResult，让用户选择
 */
function generateRecommendation(
  matchType: ResolutionMatchType,
  workloadCard: WorkloadCard,
  targetUnit: UnitCard,
  workloadResult: WorkloadResult,
  existingResult: WorkloadResult | undefined,
  matchBasis: MatchBasis,
  context: ResolutionContext
): ResolutionRecommendation {
  const workloadUnitId = workloadResult.dimensions.departmentId || workloadResult.dimensions.wardId;

  switch (matchType) {
    case "exact":
      if (existingResult && existingResult.id !== workloadResult.id) {
        // 发现等价结果 - 必须用户确认，不能自动复用
        const targetResultId = existingResult.id;
        return {
          type: "use_existing_result_with_confirmation",
          reason: `发现已有匹配结果 "${existingResult.name}"，是否复用？`,
          targetResultId,
          targetWorkloadCardId: resolveTargetWorkloadCardId(targetResultId, context),
          options: ["复用现有结果", "仍使用当前 WorkloadResult", "取消"]
        };
      }
      const currentResultId = workloadResult.id;
      // W3（2026-10-27）：精确匹配时也检查拆分可行性——如果目标有子单元且可行，
      // 生成补充拆分建议（与 use_existing_result 并列，用户二选一）。
      // 补充推荐通过 ResolutionResult.supplementalRecommendation 传递（不改主推荐 type）。
      if (matchBasis.splitFeasibility?.feasible === true) {
        const exactTargetChildren = context.unitHierarchy.get(targetUnit.id) || [];
        if (exactTargetChildren.length > 0) {
          return {
            type: "use_existing_result",
            reason: `Workload 统计范围与目标 Unit 完全匹配，直接使用当前 WorkloadResult`,
            targetResultId: currentResultId,
            targetWorkloadCardId: resolveTargetWorkloadCardId(currentResultId, context),
            supplementalSplit: {
              type: "split_workload",
              reason: `精确匹配可拆分：Workload 可按 ${exactTargetChildren.length} 个子单元拆分（补充建议）`,
              splitPlan: {
                parentResultId: currentResultId,
                children: exactTargetChildren.map((childId) => ({
                  workloadResultId: childId,
                })),
              },
            },
          };
        }
      }
      return {
        type: "use_existing_result",
        reason: `Workload 统计范围与目标 Unit 完全匹配，直接使用当前 WorkloadResult`,
        targetResultId: currentResultId,
        targetWorkloadCardId: resolveTargetWorkloadCardId(currentResultId, context)
      };

    case "ancestor":
      // 父级 Workload 包含子单元
      const targetChildren = context.unitHierarchy.get(targetUnit.id) || [];
      // workloadHierarchy 的 key 是 WorkloadCard ID，使用当前正在解析的 WorkloadCard ID
      const parentWorkloadCardId = getCurrentWorkloadCardId(context);
      const workloadHierarchyChildren = parentWorkloadCardId ? context.workloadHierarchy.get(parentWorkloadCardId) || [] : [];
      const missingChildren = targetChildren.filter(c => !workloadHierarchyChildren.includes(c));

      if (existingResult) {
        // 发现已有子结果
        const targetResultId = existingResult.id;
        return {
          type: "use_existing_result_with_confirmation",
          reason: `发现已有子 WorkloadResult "${existingResult.name}"，是否复用？`,
          targetResultId,
          targetWorkloadCardId: resolveTargetWorkloadCardId(targetResultId, context),
          options: ["复用现有子结果", "拆分父级 Workload", "取消"]
        };
      }

      if (matchBasis.splitFeasibility?.feasible === true) {
        // splitPlan 不生成默认的 splitRatio，留给用户决定
        return {
          type: "split_workload",
          reason: `父级 Workload 可拆分到 ${targetChildren.length} 个子单元`,
          splitPlan: {
            parentResultId: workloadResult.id,
            children: targetChildren.map(childId => ({
              workloadResultId: `new-${workloadResult.id}-${childId}`, // 占位 ID
              // 不生成默认 splitRatio，由用户在确认时决定分配比例
            }))
          }
        };
      }

      return {
        type: "no_match",
        reason: "父级 Workload 无法自动拆分到目标子单元",
        options: ["手动创建子 Workload", "取消"]
      };

    case "descendant":
      // 关键规则：如果既有 existingResult 又有 aggregation feasible，
      // 优先提示 existingResult，让用户选择复用还是重新聚合
      // 不能因为 aggregationFeasible 就静默返回 aggregate_descendants
      if (existingResult) {
        // 即使有 aggregation feasible，也优先提示 existingResult
        const targetResultId = existingResult.id;
        return {
          type: "find_existing_workload",
          reason: `发现父级 Workload "${existingResult.name}"，可汇总或使用父级。同时也可聚合现有子 Workload。`,
          targetResultId,
          targetWorkloadCardId: resolveTargetWorkloadCardId(targetResultId, context),
          options: ["使用已有父级 Workload", "聚合子 Workload 形成新父级", "取消"]
        };
      }

      if (matchBasis.aggregationFeasibility?.feasible) {
        return {
          type: "aggregate_descendants",
          reason: "可将子 Workload 聚合形成目标 Unit 的 Workload",
          aggregatePlan: {
            // childResultIds 表示当前实际选择参与聚合的 child WorkloadResult ID
            // 使用 selectedChildren（当前实际选择参与聚合的 child），而非 candidateChildren（候选全集）
            childResultIds: matchBasis.aggregationFeasibility.selectedChildren || [workloadResult.id],
            isPartial: true,
            // unselectedChildren 保留作为推荐上下文，供用户参考
            unselectedChildren: matchBasis.aggregationFeasibility.unselectedChildren || []
          }
        };
      }

      return {
        type: "no_match",
        reason: "无可用父级 Workload 可聚合",
        options: ["手动创建父级 Workload", "取消"]
      };

    case "none":
    default:
      return {
        type: "no_match",
        reason: "Workload 统计范围与目标 Unit 无法建立合理匹配",
        options: ["创建新 Workload", "关联现有 Workload", "取消"]
      };
  }
}

/**
 * 构建 matchDetails 供用户展示
 */
function buildMatchDetails(
  matchType: ResolutionMatchType,
  workloadResult: WorkloadResult,
  targetUnit: UnitCard,
  existingResult: WorkloadResult | undefined,
  matchBasis: MatchBasis
): string {
  const workloadUnitId = workloadResult.dimensions.departmentId || workloadResult.dimensions.wardId;
  const targetUnitId = targetUnit.id;

  switch (matchType) {
    case "exact":
      if (existingResult && existingResult.id !== workloadResult.id) {
        return `Exact Match: Workload 统计维度 (${workloadUnitId}) 与目标 Unit (${targetUnitId}) 完全匹配。发现已有等价结果 "${existingResult.name}"，需用户确认是否复用。`;
      }
      return `Exact Match: Workload 统计维度 (${workloadUnitId}) 与目标 Unit (${targetUnitId}) 完全匹配，直接使用当前 WorkloadResult。`;

    case "ancestor":
      return `Ancestor Match: Workload 统计范围 (${workloadUnitId}) 包含目标 Unit (${targetUnitId})。${
        existingResult ? `发现已有子结果 "${existingResult.name}"。` : `需将父级 Workload 拆分到子单元。`
      }`;

    case "descendant":
      return `Descendant Match: Workload 统计范围 (${workloadUnitId}) 属于目标 Unit (${targetUnitId}) 的子级。${
        matchBasis.aggregationFeasibility?.feasible ? "可聚合子 Workload 形成目标 Unit Workload。" : "无可聚合的父级 Workload。"
      }${
        matchBasis.existingResult ? ` 发现已有父级结果 "${matchBasis.existingResult.name}"，需用户确认是否复用。` : ""
      }`;

    case "none":
    default:
      return `No Match: Workload 统计维度 (${workloadUnitId}) 与目标 Unit (${targetUnitId}) 无法建立层级关系，无法自动解析。`;
  }
}

/**
 * 构建 No Match 结果
 */
function buildNoMatchResult(workloadCard: WorkloadCard, targetUnit: UnitCard, reason: string): ResolutionResult {
  return {
    matchType: "none",
    workloadCard: { id: workloadCard.id, name: workloadCard.name, workloadResultId: workloadCard.workloadResultId },
    targetUnit: { id: targetUnit.id, name: targetUnit.name },
    matchDetails: reason,
    matchBasis: {
      targetUnitId: targetUnit.id,
      unitRelation: "none",
      mappingEvidence: reason
    },
    recommendation: {
      type: "no_match",
      reason,
      options: ["创建新 Workload", "关联现有 Workload", "取消"]
    }
  };
}