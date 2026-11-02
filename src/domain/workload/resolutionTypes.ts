import type { UnitCard, WorkloadCard } from "../card/types";
import type { WorkloadResult } from "../workload/types";
import type { CalculationSnapshot, ResultSet } from "../workload/types";
import type { WorkloadDefinition } from "../workload/types";
import type { WorkloadExecution } from "../workload/types";
import type { Period } from "../period/types";

// Re-export commonly used types
export type { UnitCard, WorkloadCard } from "../card/types";
export type { WorkloadResult, CalculationSnapshot, WorkloadDefinition, WorkloadExecution, ResultSet } from "../workload/types";
export type { Period } from "../period/types";

/**
 * Source Data Object - 最小类型，用于表达源数据对象的统计覆盖情况
 * 用于 split/aggregation feasibility 的 mapping evidence
 */
export interface SourceDataObject {
  id: string;
  name: string;
  /** 该数据对象覆盖的维度值集合，用于判断是否覆盖特定 child unit */
  coveredDimensions: Record<string, string[]>;
  /** 数据行数统计 */
  rowCount?: number;
  /** 最后更新时间 */
  updatedAt?: string;
}

/**
 * Mapping Evidence - 表达"目标子 Unit 可以从源统计中被区分"的依据
 * 正式语义（Q-09-C 2026-10-03 裁定）：父级 WorkloadResult 对应 ResultSet.items 中
 * 实际出现的维度值观测 = "该统计曾按该 Unit 区分统计"的正式证据。
 * 这是查询投影，不是 Domain Fact；不允许仅凭 Unit hierarchy / Definition.dimensions /
 * workload_assign 的存在推断生成。
 */
export interface MappingEvidence {
  /** 关联的 source data object id（来自 Definition.sourceDataObjectId 正式引用，不要求可读取实体） */
  sourceDataObjectId: string;
  /** 目标 child unit id（取自 ResultItem 实际维度值，不从 Unit hierarchy 反向制造） */
  targetChildUnitId: string;
  /** 该 child 在源统计中对应的实际维度值（ResultItem.dimensions 原样） */
  matchedDimensionValues: Record<string, string>;
  /** 该 child 在源数据中的行数/权重（当前无正式来源时保持 undefined，不伪造） */
  rowCount?: number;
  /**
   * 证据置信度。当前项目无正式 high/medium/low 判定规则
   * （2026-10-03 裁定：不得自行发明），故为可选：
   * undefined 表示"尚未评定"，禁止为通过类型检查而虚构值。
   * 待正式规则裁定后再恢复必填或定义判定逻辑。
   */
  confidence?: "high" | "medium" | "low";
  /** 证据来源描述（须描述"来自父级 ResultSet 的实际维度观测"，不得表述为"系统已确认映射关系"） */
  evidenceDescription: string;
  /** 要创建的新单元卡名称（拆分确认时使用） */
  newUnitName?: string;
  /** 要创建的新单元卡类型（拆分确认时使用） */
  newUnitKind?: UnitCard["unitKind"];
}

export type ResolutionMatchType = "exact" | "ancestor" | "descendant" | "none";

export type ResolutionRecommendationType =
  | "use_existing_result"
  | "use_existing_result_with_confirmation"
  | "split_workload"
  | "find_existing_workload"
  | "aggregate_descendants"
  | "no_match";

export interface MatchBasis {
  sourceDataObjectId?: string;
  definitionId?: string;
  definitionVersion?: number;
  executionId?: string;
  executionPeriod?: { start: string; end: string; mode?: string };
  resultDimensions?: Record<string, string>;
  targetUnitId: string;
  /** Workload 与目标 Unit 的匹配关系方向：self(同一) | ancestor(父级→子级) | descendant(子级→父级) | none(无匹配) */
  unitRelation: "self" | "ancestor" | "descendant" | "none";
  mappingEvidence?: string;
  /** 可选：具体的 mapping evidence 列表 */
  mappingEvidences?: MappingEvidence[];
  splitFeasibility?: {
    feasible: boolean | "cannot_determine";
    reason: string;
    /** 需要"进一步建立/验证映射"的目标 UnitCard ID 列表
     *  注意：不是 MappingEvidence ID，也不是 Relation ID；
     *  语义：缺少源统计实际观测证据（mapping evidence）的 target 子 UnitCard ID
     *  （见 resolutionService.assessSplitFeasibility；workloadAssignments join 仅提供
     *  "哪些 child 已有对应 Workload"的参考信息，不参与本列表）。
     *  evidence 由 ResolutionContext.mappingEvidences 提供
     *  （父级 ResultSet.items 的正式查询投影）。
     */
    requiredMappings?: string[];
    // 当 feasible=false 时，区分"确定不可拆分"与"信息不足无法判断"
    // true = 业务上确定不可拆分；false = 当前信息不足无法判断（非业务不可拆分）
    // "cannot_determine" = 缺少必要的上下文信息（如 Relations）无法判断
    certainlyNotFeasible: boolean;
  };
  aggregationFeasibility?: {
    feasible: boolean;
    reason: string;
    partialAllowed: boolean;
    selectedChildren?: string[];
    unselectedChildren?: string[];
    candidateChildren?: string[];
  };
  existingResult?: { id: string; name: string; resultSetId: string };
}

export interface ResolutionRecommendation {
  type: ResolutionRecommendationType;
  reason: string;
  /**
   * 推荐产生时的 Matching Basis 结构化快照（D-149）：
   * 由 Resolution Trigger 从当次 ResolutionResult.matchBasis 提取的深拷贝子集；
   * 解释推荐依据，不复制完整 ResolutionResult，不改变既有字段语义。
   */
  matchingBasisSnapshot?: import("./matchingBasisSnapshot").MatchingBasisSnapshot;
  targetResultId?: string;
  targetWorkloadCardId?: string;
  splitPlan?: {
    parentResultId: string;
    children: Array<{ workloadResultId: string; splitRatio?: number }>;
  };
  aggregatePlan?: {
    childResultIds: string[];
    isPartial: boolean;
    unselectedChildren?: string[];
  };
  options?: string[];
}

export interface ResolutionResult {
  matchType: ResolutionMatchType;
  workloadCard: { id: string; name: string; workloadResultId?: string };
  targetUnit: { id: string; name: string };
  existingResult?: { id: string; name: string; resultSetId: string };
  matchDetails: string;
  matchBasis: MatchBasis;
  recommendation: ResolutionRecommendation;
}

export interface ResolutionContext {
  workloadCard: WorkloadCard;
  targetUnit: UnitCard;
  existingResults: WorkloadResult[];
  resultSets: ResultSet[];
  snapshots: CalculationSnapshot[];
  unitHierarchy: Map<string, string[]>;
  /** 仅表示已存在的 Workload 业务分解关系（workload_split 等），不等同于 Unit hierarchy，也不作为独立的组织树
   *  Key: parent WorkloadCard ID (workload_split.sourceId)
   *  Value: child WorkloadCard ID[] (workload_split.targetId)
   *  与 WorkloadResult ID 无关
   */
  workloadHierarchy: Map<string, string[]>;
  /** workload_assign Relation 的查询投影（由 active workload_assign 派生，不是关系事实存储；
   *  D-001：Relation 仍是唯一关系事实源，此 Map 仅为 ResolutionContext 内的查询便利投影）
   *  Key: WorkloadCard ID（workload_assign.targetId，endpoint 语义：source=UnitCard, target=WorkloadCard）
   *  Value: source UnitCard ID[]（workload_assign.sourceId；不假设一个 WorkloadCard 只 assign 给一个 Unit）
   *  未注入（undefined）时 ResolutionService 保持现有 cannot_determine 语义
   */
  workloadAssignments?: Map<string, string[]>;
  /** WorkloadCard 映射表，用于通过 WorkloadCard ID 查找 workloadResultId
   *  Key: WorkloadCard ID
   *  Value: WorkloadCard (至少包含 id, type, workloadResultId)
   */
  workloadCards?: Map<string, { id: string; type: string; workloadResultId?: string }>;
  /** 现有 Card 列表，用于查找和验证（更完整的信息，包含 name） */
  existingCards?: Map<string, { id: string; type: string; name: string; workloadResultId?: string }>;
  workloadDefinitionMap: Map<string, WorkloadDefinition>;
  workloadExecutionMap: Map<string, WorkloadExecution>;
  /** 可用的 source data objects，用于 mapping evidence 判断 */
  sourceDataObjects?: Map<string, SourceDataObject>;
  /**
   * 可用的 mapping evidence 列表，用于 split feasibility 判断。
   * 正式来源：父级 WorkloadResult 对应 ResultSet.items 的查询投影
   * （resolutionContextBuilder.deriveMappingEvidences，Q-09-C 2026-10-03 裁定语义）。
   * 未注入（undefined）时 ResolutionService 保持 cannot_determine（evidence 门控）。
   */
  mappingEvidences?: MappingEvidence[];
}
