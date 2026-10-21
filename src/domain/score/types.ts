import type { AnyCard } from "../card/types";
import type { Period } from "../period/types";
import type { Relation } from "../relation/types";

export interface ScoreDefinition {
  id: string;
  workloadId: string;
  mode: "derived" | "manual" | "reused" | "adjusted";
  unitScore: number;
}

export interface MeasurementResultEntry {
  scoreDefinitionId: string;
  workloadId: string;
  measurementWorkloadValue: number;
  unitScore: number;
  measuredTotalScore: number;
}

export interface MeasurementResult {
  id: string;
  period: Period;
  entries: MeasurementResultEntry[];
  modelVersionId?: string;
  dataVersionId?: string;
}

export interface AdjustmentEntry {
  scoreDefinitionId: string;
  originalUnitScore: number;
  currentUnitScore: number;
}

export interface AdjustmentTable {
  id: string;
  baselineMeasurementResultId: string;
  entries: AdjustmentEntry[];
}

export interface FinalScoreTable {
  id: string;
  adjustmentTableId: string;
  entries: AdjustmentEntry[];
}

export interface ScoreResult {
  id: string;
  scoreDefinitionId: string;
  workloadId: string;
  period?: Period;
  workloadValue: number;
  totalScore: number;
}

export interface CalculationResult {
  id: string;
  adjustmentTableId: string;
  period: Period;
  scoreResults: ScoreResult[];
  adjustmentSnapshot: AdjustmentEntry[];
  modelVersionId?: string;
  dataVersionId?: string;
  /**
   * 业务生命周期（D-154）：缺省 = active；"revoked" = 已被显式撤回失效。
   * "待计算"是派生状态（当前不存在有效 CalculationResult 即 pending），不以 totalScore=0 冒充（D-064/D-121 仍成立）。
   */
  businessStatus?: "active" | "revoked";
}

export interface MeasurementBranch {
  id: string;
  name?: string;
  cards: AnyCard[];
  relations: Relation[];
  measurementResultId?: string;
}
