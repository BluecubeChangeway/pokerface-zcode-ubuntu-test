import type {
  MatchBasis,
  MappingEvidence,
  ResolutionMatchType,
  ResolutionResult,
} from "./resolutionTypes";

/**
 * MatchingBasisSnapshot（D-149）：随 Recommendation 保存的匹配依据结构化快照。
 *
 * 分层（D-149 第 4 条）：Resolution Engine 负责计算判断；Recommendation 承载建议
 * 及其当时依据；本快照只是 ResolutionResult.matchBasis 的"解释性子集"的深拷贝，
 * 不是第二个 ResolutionResult 仓库。
 */

/**
 * 快照字段范围（逐项依据 D-136"解释推荐所需"）：
 * - matchType / matchDetails / unitRelation：匹配结论与方向（D-136 核心）；
 * - sourceDataObjectId / definitionId / definitionVersion / executionId / executionPeriod：
 *   统计链定位引用与期间（解释"按什么规则、哪次执行、什么期间匹配"）；
 * - resultDimensions：统计维度（匹配的核心证据）；
 * - targetUnitId：目标单元标识（快照自包含）；
 * - mappingEvidence / mappingEvidences：D-136 明列的 mapping evidence；
 * - splitFeasibility / aggregationFeasibility：D-136 明列的可行性判断；
 * - existingResult：use_existing 类推荐的关键依据。
 * 未纳入：ResolutionResult.workloadCard / targetUnit 的展示信息与 recommendation
 * 本体（已由 Recommendation 容器与 relatedEntityIds 承载，不重复）。
 */
export interface MatchingBasisSnapshot {
  matchType: ResolutionMatchType;
  matchDetails: string;
  unitRelation: MatchBasis["unitRelation"];
  sourceDataObjectId?: string;
  definitionId?: string;
  definitionVersion?: number;
  executionId?: string;
  executionPeriod?: { start: string; end: string; mode?: string };
  resultDimensions?: Record<string, string>;
  targetUnitId: string;
  mappingEvidence?: string;
  mappingEvidences?: MappingEvidence[];
  splitFeasibility?: MatchBasis["splitFeasibility"];
  aggregationFeasibility?: MatchBasis["aggregationFeasibility"];
  existingResult?: { id: string; name: string; resultSetId: string };
}

function copyDimensions(
  dimensions: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!dimensions) return undefined;
  const copy: Record<string, string> = {};
  for (const key of Object.keys(dimensions)) {
    copy[key] = dimensions[key];
  }
  return copy;
}

function copyMappingEvidences(
  evidences: MappingEvidence[] | undefined
): MappingEvidence[] | undefined {
  if (!evidences) return undefined;
  return evidences.map((evidence) => ({
    sourceDataObjectId: evidence.sourceDataObjectId,
    targetChildUnitId: evidence.targetChildUnitId,
    matchedDimensionValues: { ...evidence.matchedDimensionValues },
    rowCount: evidence.rowCount,
    confidence: evidence.confidence,
    evidenceDescription: evidence.evidenceDescription,
  }));
}

function copyExecutionPeriod(
  period: { start: string; end: string; mode?: string } | undefined
): { start: string; end: string; mode?: string } | undefined {
  if (!period) return undefined;
  return { start: period.start, end: period.end, mode: period.mode };
}

/**
 * 从当次 ResolutionResult 提取快照（D-149 第 2 条：唯一来源是当次 Resolution）。
 * 逐字段深拷贝——后续对原 matchBasis 对象的任何修改不得影响已保存的快照（引用隔离）。
 */
export function toMatchingBasisSnapshot(result: ResolutionResult): MatchingBasisSnapshot {
  const basis = result.matchBasis;
  const snapshot: MatchingBasisSnapshot = {
    matchType: result.matchType,
    matchDetails: result.matchDetails,
    unitRelation: basis.unitRelation,
    targetUnitId: basis.targetUnitId,
  };
  if (basis.sourceDataObjectId !== undefined) snapshot.sourceDataObjectId = basis.sourceDataObjectId;
  if (basis.definitionId !== undefined) snapshot.definitionId = basis.definitionId;
  if (basis.definitionVersion !== undefined) snapshot.definitionVersion = basis.definitionVersion;
  if (basis.executionId !== undefined) snapshot.executionId = basis.executionId;
  if (basis.executionPeriod !== undefined) {
    snapshot.executionPeriod = copyExecutionPeriod(basis.executionPeriod);
  }
  if (basis.resultDimensions !== undefined) {
    snapshot.resultDimensions = copyDimensions(basis.resultDimensions);
  }
  if (basis.mappingEvidence !== undefined) snapshot.mappingEvidence = basis.mappingEvidence;
  if (basis.mappingEvidences !== undefined) {
    snapshot.mappingEvidences = copyMappingEvidences(basis.mappingEvidences);
  }
  if (basis.splitFeasibility !== undefined) {
    snapshot.splitFeasibility = {
      feasible: basis.splitFeasibility.feasible,
      reason: basis.splitFeasibility.reason,
      requiredMappings: basis.splitFeasibility.requiredMappings
        ? [...basis.splitFeasibility.requiredMappings]
        : undefined,
      certainlyNotFeasible: basis.splitFeasibility.certainlyNotFeasible,
    };
  }
  if (basis.aggregationFeasibility !== undefined) {
    snapshot.aggregationFeasibility = {
      feasible: basis.aggregationFeasibility.feasible,
      reason: basis.aggregationFeasibility.reason,
      partialAllowed: basis.aggregationFeasibility.partialAllowed,
      selectedChildren: basis.aggregationFeasibility.selectedChildren
        ? [...basis.aggregationFeasibility.selectedChildren]
        : undefined,
      unselectedChildren: basis.aggregationFeasibility.unselectedChildren
        ? [...basis.aggregationFeasibility.unselectedChildren]
        : undefined,
      candidateChildren: basis.aggregationFeasibility.candidateChildren
        ? [...basis.aggregationFeasibility.candidateChildren]
        : undefined,
    };
  }
  if (basis.existingResult !== undefined) {
    snapshot.existingResult = { ...basis.existingResult };
  }
  return snapshot;
}
