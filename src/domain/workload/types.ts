/**
 * Workload Domain Types - 核心类型定义
 */

// ============================================
// 基础类型 (from period/types)
// ============================================

import type { Period, PeriodMode, Phase } from "../period/types";
export type { Period, PeriodMode, Phase } from "../period/types";

export interface SourcePeriod {
  sourceId: string;
  period: Period;
}

// ============================================
// Workload Definition & Execution
// ============================================

export interface Condition {
  field: string;
  operator: string;
  value: unknown;
}

export interface WorkloadDefinition {
  id: string;
  name: string;
  description?: string;
  sourceDataObjectId: string;
  statisticField: string;
  aggregationMethod: "sum" | "avg" | "count" | "min" | "max" | "custom" | "weighted";
  calculationMethod?: string;
  timeField: string;
  filters?: Record<string, unknown>;
  dimensions?: Array<{ field: string; alias: string; order: number }>;
  conditions?: Condition[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface WorkloadExecution {
  id: string;
  definitionId: string;
  period?: Period;
  conditions?: Condition[];
  dimensions?: Array<{
    field: string;
    alias: string;
    order: number;
  }>;
  status?: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

// ============================================
// Workload Result & ResultSet
// ============================================

export interface ResultItem {
  id: string;
  resultSetId: string;
  name: string;
  value: number | null;
  dimensions: Record<string, string>;
  outputColumnName?: string;
  roleInGraph?: "final" | "intermediate";
  granularity?: "aggregate" | "row" | "perRow" | "perGroup";
  metadata?: Record<string, unknown>;
}

export interface ResultSet {
  snapshotId?: string;
  sourceDataObjectId?: string;
  id: string;
  workloadDefinitionId: string;
  workloadExecutionId: string;
  period?: Period;
  items: ResultItem[];
  columns?: string[];
  totalCount: number;
  createdAt: string;
  status?: string;
  warnings?: string[];
}

export interface WorkloadResult {
  id: string;
  resultSetId: string;
  resultItemId: string;
  name: string;
  value: number | null;
  dimensions: Record<string, string>;
  period?: Period;
  workloadDefinitionId?: string;
  workloadExecutionId?: string;
  businessStatus?: "active" | "revoked";
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkloadResultSet {
  id: string;
  workloadDefinitionId: string;
  workloadExecutionId: string;
  period?: Period;
  items: ResultItem[];
  totalCount: number;
  createdAt: string;
  status?: string;
  warnings?: string[];
}

export interface WorkloadResultItem {
  id: string;
  resultSetId: string;
  name: string;
  value: number | null;
  dimensions: Record<string, string>;
  metadata?: Record<string, unknown>;
}

// ============================================
// Workload Split
// ============================================

export interface WorkloadSplit {
  id: string;
  parentResultId: string;
  childResultId: string;
  splitType: "complete" | "partial";
  splitRatio?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface SplitFeasibilityContext {
  sourceDataSupportsSplit: boolean;
  definitionAllowsSplit: boolean;
  executionCoversTargetUnits: boolean;
  targetUnitIds: string[];
  requiredMappings: string[];
  hasCompleteSourceData: boolean;
}

export interface SplitExecutionInput {
  parentResultId: string;
  children: Array<{
    id?: string;
    name: string;
    value: number | null;
    dimensions: Record<string, string>;
    resultSetId: string;
    resultItemId: string;
    period?: Period;
  }>;
  splitType: "complete" | "partial";
  reason?: string;
  tolerance?: number;
  executionBatchId?: string;
}

export interface SplitExecutionResult {
  childResults: WorkloadResult[];
  workloadSplits: WorkloadSplit[];
  summary: {
    parentResultId: string;
    parentValue: number | null;
    childTotal: number;
    remainder: number;
    isComplete: boolean;
    hasOverflow: boolean;
  };
}

export type ExecutionOwnership = "current" | "other" | "unknown";

// ============================================
// Calculation Types
// ============================================

export type CalculationNodeKind =
  | "execution_dataset"
  | "filter"
  | "aggregate"
  | "arithmetic"
  | "field_ref"
  | "constant"
  | "output_column";

export interface CalculationNode {
  id: string;
  kind: CalculationNodeKind;
  name?: string;
  description?: string;
  createdAt?: string;
  
  // execution_dataset
  definitionId?: string;
  executionId?: string;
  period?: Period;
  
  // filter
  input?: string;
  condition?: any;
  
  // aggregate
  aggregate?: string;
  aggregateType?: "sum" | "avg" | "count" | "min" | "max" | "custom";
  aggregateField?: string;
  groupBy?: string[];
  
  // arithmetic
  left?: string;
  right?: string;
  operator?: "+" | "-" | "*" | "/";
  
  // field_ref
  fieldName?: string;
  field?: string;
  sourceNodeId?: string;
  scope?: string;
  
  // constant
  value?: number | string | boolean;
  
  // output_column
  source?: string;
  outputName?: string;
  outputColumnName?: string;
  outputType?: "number" | "string" | "boolean";
  role?: "final" | "intermediate";
  distribution?: "perDataset" | "perRow" | "perGroup";
  
  // common
  // name?: string; // 定义在 line 198
}

// Specific node type interfaces for graphExecutor
export interface AggregateNode extends CalculationNode {
  kind: "aggregate";
  input?: string;
  aggregate?: string;
  aggregateField?: string;
}

export interface ArithmeticNode extends CalculationNode {
  kind: "arithmetic";
  left?: string;
  right?: string;
  operator?: "+" | "-" | "*" | "/";
}

export interface FilterNode extends CalculationNode {
  kind: "filter";
  input?: string;
  condition?: any;
}

export interface OutputColumnNode extends CalculationNode {
  kind: "output_column";
  source: string;
  outputName: string;
  outputColumnName?: string;
  role?: "final" | "intermediate";
  distribution?: "perDataset" | "perRow" | "perGroup";
}

export interface CalculationGraph {
  id: string;
  name?: string;
  rootNodeId?: string;
  nodes: CalculationNode[];
  edges?: Array<{ from: string; to: string }>;
  createdAt: string;
}

export interface CalculationSnapshot {
  id: string;
  graph: CalculationGraph;
  dataSourceId?: string;
  dataVersion?: string;
  definition?: WorkloadDefinition;
  execution?: WorkloadExecution;
  outputColumns?: Array<{ name: string; type: string }>;
  resultDimensions?: string[];
  versionRefs?: Record<string, string>;
  note?: string;
  derivedFromSnapshotId?: string;
  createdAt: string;
}

export interface CalculationResult {
  id: string;
  snapshotId: string;
  scoreResults: ScoreResult[];
  businessStatus?: "active" | "revoked";
  createdAt: string;
  updatedAt: string;
}

export interface ScoreResult {
  workloadId: string;
  score: number;
  workloadIdInContext?: string;
}

// ============================================
// Score & Measurement
// ============================================

export interface ScoreDefinition {
  id: string;
  name: string;
  description?: string;
  formula: string;
  variables: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementResult {
  id: string;
  definitionId: string;
  executionId: string;
  unitScores: Record<string, number>;
  ruler: Record<string, number>;
  adjustmentTable: AdjustmentTable;
  createdAt: string;
}

export interface AdjustmentTable {
  id: string;
  measurementResultId: string;
  adjustments: Array<{
    unitId: string;
    originalScore: number;
    adjustedScore: number;
    adjustmentType: "add" | "multiply" | "override";
    reason: string;
  }>;
  createdAt: string;
}

export interface WorkloadAggregateSummary {
  workloadId: string;
  totalValue: number;
  childCount: number;
  averageValue: number;
  minValue: number;
  maxValue: number;
  period: Period;
  childTotal?: number;
  coveredTotal?: number;
}

// ============================================
// Split Provenance (从 provenance 模块导出)
// ============================================

export interface RevocationSnapshot {
  cards: any[];
  relations: any[];
  workloadResults: WorkloadResult[];
  workloadSplits: any[];
  calculationResults: any[];
}

export interface WorkloadRevocationImpact {
  revokedCards: any[];
  revokedWorkloadResults: WorkloadResult[];
  deactivatedRelations: any[];
  revokedWorkloadSplits: any[];
  revokedCalculationResults: any[];
  retained: any[];
  deletedCards: any[];
  deletedWorkloadResults: WorkloadResult[];
  manualReview: { cards: any[]; results: WorkloadResult[] };
}

export interface SplitLayerRevocationInput {
  snapshot: RevocationSnapshot;
  parentWorkloadCardId: string;
  executionBatchId?: string;
}

export interface FullPathRevocationInput {
  snapshot: RevocationSnapshot;
  entryWorkloadCardId: string;
}

export interface ContinuedUseEvidence {
  cardId: string;
  evidence: string;
}

// ============================================
// DropTriggerResult
// ============================================

export interface DropTriggerResult {
  outcome: string;
  relationOutcome: string;
  relation?: any;
  recommendation?: any;
  error?: string;
  deactivatedRelation?: any;
}

// ============================================
// Re-exports from submodules
// ============================================

// Split 相关类型 (已在本文件定义，不需要重复导出)
// 从 splitService 导出 SplitValidationError
export type { SplitValidationError } from "./split/splitService";

// 从 provenance 导出溯源相关类型 (已在 splitProvenance.ts 定义，仅作类型导出)
export type { SplitProvenanceCondition, SplitProvenanceRecord } from "./provenance/splitProvenance";

// Revocation 相关类型 (RevocationSnapshot, WorkloadRevocationImpact 等已在本文件定义)
// 从 revocationService 导出其他未在本文件定义的类型
// 注意：RevocationSnapshot, WorkloadRevocationImpact, SplitLayerRevocationInput, FullPathRevocationInput, ContinuedUseEvidence 已在本文件定义

// 外部类型
export type { WorkloadCard } from "../card/types";
export type { Relation } from "../relation/types";
// CalculationResult 已在本文件定义（line 297），不再从 score 重复导出
