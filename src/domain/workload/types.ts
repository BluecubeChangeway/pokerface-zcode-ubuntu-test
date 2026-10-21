import type { Period } from "../period/types";
export type { Period } from "../period/types";

export type ConditionOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "in"
  | "not_in"
  | "contains"
  | "between";

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface Dimension {
  field: string;
  alias?: string;
  order?: number;
}

export type CalculationType = "count" | "sum" | "avg" | "weighted" | "formula" | "custom";

/**
 * @deprecated 过渡遗留。
 * V1 起计算事实的唯一载体是 CalculationGraph（见 D-115）。
 * CalculationDefinition 只允许作为 Graph 的降载/简化构建描述，
 * 不得再作为“真正的算法事实”直接持久化。
 */
export interface CalculationDefinition {
  type: CalculationType;
  field?: string;
  expression?: string;
  parameters?: Record<string, unknown>;
}

export interface CoverageRule {
  actualValue?: number;
  monthlyAverage?: number;
  coveredValue?: number;
  sourcePeriod?: Period;
  targetPeriod?: Period;
}

export interface WorkloadAggregateSummary {
  childTotal: number;
  remainderTotal: number;
  coveredTotal: number;
}

export interface WorkloadDefinition {
  id: string;
  name: string;
  sourceDataObjectId: string;
  conditions: Condition[];
  dimensions: Dimension[];
  calculation: CalculationDefinition;
  coverage?: CoverageRule;
  version: number;
}

export interface WorkloadExecution {
  id: string;
  definitionId: string;
  period: Period;
  conditions: Condition[];
  dimensions: Dimension[];
  parameters?: Record<string, unknown>;
}

export type CalculationNodeKind =
  | "execution_dataset"
  | "field_ref"
  | "constant"
  | "filter"
  | "aggregate"
  | "arithmetic"
  | "output_column";

/** Execution Dataset 节点：代表整个执行数据集，是 Graph 的唯一数据入口。 */
export interface ExecutionDatasetNode {
  id: string;
  kind: "execution_dataset";
}

export interface FieldRefNode {
  id: string;
  kind: "field_ref";
  field: string;
  /** 引用当前正在求值的行。省略时默认指向正在被遍历的那一行。 */
  scope?: "currentRow";
}

export interface ConstantNode {
  id: string;
  kind: "constant";
  value: number | string | null;
}

export interface FilterNode {
  id: string;
  kind: "filter";
  input: string;
  condition: {
    left: FieldRefNode | ConstantNode;
    operator: "=" | "!=" | ">" | ">=" | "<" | "<=";
    right: FieldRefNode | ConstantNode;
  };
}

export interface AggregateNode {
  id: string;
  kind: "aggregate";
  aggregate: "count" | "sum" | "avg" | "min" | "max";
  input: string;
  field?: string;
}

export interface ArithmeticNode {
  id: string;
  kind: "arithmetic";
  operator: "+" | "-" | "*" | "/";
  left: string;
  right: string;
}

export interface OutputColumnNode {
  id: string;
  kind: "output_column";
  name: string;
  role: "final" | "intermediate";
  /** perGroup 预留，不在本阶段实现 */
  distribution: "perRow" | "perDataset" | "perGroup";
  source: string;
}

export type CalculationNode =
  | ExecutionDatasetNode
  | FieldRefNode
  | ConstantNode
  | FilterNode
  | AggregateNode
  | ArithmeticNode
  | OutputColumnNode;

export interface CalculationGraph {
  id: string;
  name?: string;
  nodes: CalculationNode[];
  rootNodeId: string;
}

export interface CalculationSnapshot {
  id: string;
  definition: WorkloadDefinition;
  execution: WorkloadExecution;
  graph: CalculationGraph;
  businessFields: string[];
  outputColumns: string[];
  resultDimensions: string[];
  modelVersionId?: string;
  dataVersionId?: string;
  note?: string;
  derivedFromSnapshotId?: string;
}

export type ResultGranularity = "row" | "group" | "aggregate" | "intermediate";

export interface ResultItem {
  id: string;
  /** null 表达"无数据"；缺失 ≠ 0（INV-079/080） */
  value: number | null;
  dimensions: Record<string, string>;
  granularity: ResultGranularity;
  /** 仅统计口径维度，不得表达 Unit/Budget 层级 */
  outputColumnName?: string;
  roleInGraph?: "final" | "intermediate";
}

export interface ResultSet {
  id: string;
  snapshotId: string;
  period: Period;
  items: ResultItem[];
  /** "missing" = 本次执行数据量为 0 行，不允许伪造 0 */
  status?: "complete" | "missing";
  warnings?: string[];
  /** 可选：源数据对象 ID */
  sourceDataObjectId?: string;
}

export interface WorkloadResult {
  id: string;
  resultSetId: string;
  resultItemId: string;
  name: string;
  value: number | null;
  dimensions: Record<string, string>;
  /** 结果所属期间（来自 ResultSet.period） */
  period?: Period;
  /**
   * 业务生命周期（D-154）：缺省 = active；"revoked" = 已被撤回。
   * 撤回只失效业务有效性，不改写任何统计数值字段；
   * revoked Result 在业务查询中等同不存在（不进入 Resolution / Recommendation / 计算）。
   */
  businessStatus?: "active" | "revoked";
}

export interface WorkloadSplit {
  id: string;
  parentResultId: string;
  childResultId: string;
  splitType: "complete" | "partial";
  splitRatio?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}
