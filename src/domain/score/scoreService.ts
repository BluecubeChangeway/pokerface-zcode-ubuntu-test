import type { Period } from "../period/types";
import type {
  AdjustmentEntry,
  AdjustmentTable,
  CalculationResult,
  FinalScoreTable,
  MeasurementBranch,
  MeasurementResult,
  ScoreResult
} from "./types";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function adjustmentDelta(entry: AdjustmentEntry): number {
  return entry.currentUnitScore - entry.originalUnitScore;
}

export function adjustmentPercent(entry: AdjustmentEntry): number | undefined {
  if (entry.originalUnitScore === 0) {
    return undefined;
  }
  return ((entry.currentUnitScore - entry.originalUnitScore) / entry.originalUnitScore) * 100;
}

export function applyPercentAdjustment(entry: AdjustmentEntry, percent: number): AdjustmentEntry {
  return {
    ...entry,
    currentUnitScore: entry.originalUnitScore + (entry.originalUnitScore * percent) / 100
  };
}

export function createAdjustmentTable(id: string, baseline: MeasurementResult): AdjustmentTable {
  return {
    id,
    baselineMeasurementResultId: baseline.id,
    entries: baseline.entries.map((entry) => ({
      scoreDefinitionId: entry.scoreDefinitionId,
      originalUnitScore: entry.unitScore,
      currentUnitScore: entry.unitScore
    }))
  };
}

export function setCurrentUnitScore(
  table: AdjustmentTable,
  scoreDefinitionId: string,
  currentUnitScore: number
): AdjustmentTable {
  if (!table.entries.some((entry) => entry.scoreDefinitionId === scoreDefinitionId)) {
    throw new Error(`Unknown score item in adjustment table: ${scoreDefinitionId}`);
  }

  return {
    ...table,
    entries: table.entries.map((entry) =>
      entry.scoreDefinitionId === scoreDefinitionId ? { ...entry, currentUnitScore } : entry
    )
  };
}

export function forkAdjustmentTable(table: AdjustmentTable, forkId: string): AdjustmentTable {
  return { ...deepClone(table), id: forkId };
}

export function finalizeAdjustmentTable(
  table: AdjustmentTable,
  finalTableId: string
): FinalScoreTable {
  return {
    id: finalTableId,
    adjustmentTableId: table.id,
    entries: deepClone(table.entries)
  };
}

export function forkMeasurementBranch(branch: MeasurementBranch, forkId: string): MeasurementBranch {
  return {
    id: forkId,
    cards: deepClone(branch.cards),
    relations: deepClone(branch.relations)
  };
}

export interface CalculationInput {
  scoreDefinitionId: string;
  workloadId: string;
  workloadValue: number;
}

export interface CalculationDraft {
  scoreResults: ScoreResult[];
  adjustmentSnapshot: AdjustmentEntry[];
}

export function runCalculation(
  calculationResultId: string,
  table: AdjustmentTable,
  period: Period,
  inputs: CalculationInput[]
): CalculationDraft {
  const scoreResults = inputs.map((input) => {
    const entry = table.entries.find((item) => item.scoreDefinitionId === input.scoreDefinitionId);
    if (!entry) {
      throw new Error(`Unknown score item in adjustment table: ${input.scoreDefinitionId}`);
    }

    return {
      id: `${calculationResultId}:${input.scoreDefinitionId}:${input.workloadId}`,
      scoreDefinitionId: input.scoreDefinitionId,
      workloadId: input.workloadId,
      period,
      workloadValue: input.workloadValue,
      totalScore: entry.currentUnitScore * input.workloadValue
    };
  });

  return { scoreResults, adjustmentSnapshot: deepClone(table.entries) };
}

export function createCalculationResult(
  id: string,
  table: AdjustmentTable,
  period: Period,
  inputs: CalculationInput[]
): CalculationResult {
  const draft = runCalculation(id, table, period, inputs);

  return {
    id,
    adjustmentTableId: table.id,
    period,
    scoreResults: draft.scoreResults,
    adjustmentSnapshot: draft.adjustmentSnapshot
  };
}
