import type {
  AdjustmentTable,
  CalculationResult,
  MeasurementBranch,
  MeasurementResult,
  ScoreDefinition
} from "../domain/score/types";
import { mockCards } from "./mockCards";
import { mockRelations } from "./mockRelations";

export const mockScoreDefinitions: ScoreDefinition[] = [
  {
    id: "score-outpatient-derived",
    workloadId: "workload-neurosurgery-outpatient",
    mode: "derived",
    unitScore: 12
  },
  {
    id: "score-disease-weight-reused",
    workloadId: "workload-disease-weight",
    mode: "reused",
    unitScore: 12
  },
  {
    id: "score-emergency-manual",
    workloadId: "workload-discharge-visits",
    mode: "manual",
    unitScore: 8
  },
  {
    id: "score-wang-outpatient",
    workloadId: "workload-wang-outpatient",
    mode: "reused",
    unitScore: 12
  }
];

export const mockMeasurementResult: MeasurementResult = {
  id: "measurement-result-2025",
  period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" },
  entries: [
    {
      scoreDefinitionId: "score-outpatient-derived",
      workloadId: "workload-neurosurgery-outpatient",
      measurementWorkloadValue: 1260,
      unitScore: 12,
      measuredTotalScore: 15120
    },
    {
      scoreDefinitionId: "score-disease-weight-reused",
      workloadId: "workload-disease-weight",
      measurementWorkloadValue: 0.9,
      unitScore: 12,
      measuredTotalScore: 10.8
    },
    {
      scoreDefinitionId: "score-emergency-manual",
      workloadId: "workload-discharge-visits",
      measurementWorkloadValue: 830,
      unitScore: 8,
      measuredTotalScore: 6640
    },
    {
      scoreDefinitionId: "score-wang-outpatient",
      workloadId: "workload-wang-outpatient",
      measurementWorkloadValue: 200,
      unitScore: 12,
      measuredTotalScore: 2400
    }
  ]
};

export const mockAdjustmentTable: AdjustmentTable = {
  id: "adjustment-table-main",
  baselineMeasurementResultId: "measurement-result-2025",
  entries: [
    {
      scoreDefinitionId: "score-outpatient-derived",
      originalUnitScore: 12,
      currentUnitScore: 12
    },
    {
      scoreDefinitionId: "score-disease-weight-reused",
      originalUnitScore: 12,
      currentUnitScore: 12
    },
    {
      scoreDefinitionId: "score-emergency-manual",
      originalUnitScore: 8,
      currentUnitScore: 8
    },
    {
      scoreDefinitionId: "score-wang-outpatient",
      originalUnitScore: 12,
      currentUnitScore: 10
    }
  ]
};

export const mockMeasurementBranch: MeasurementBranch = {
  id: "measurement-branch-main",
  name: "主测算分支",
  cards: mockCards,
  relations: mockRelations,
  measurementResultId: mockMeasurementResult.id
};

export const mockCalculationResults: CalculationResult[] = [
  {
    id: "calculation-result-2026-03",
    adjustmentTableId: "adjustment-table-main",
    period: { start: "2026-03-01", end: "2026-03-31", mode: "calculation" },
    scoreResults: [
      {
        id: "calculation-result-2026-03:score-wang-outpatient:workload-wang-outpatient",
        scoreDefinitionId: "score-wang-outpatient",
        workloadId: "workload-wang-outpatient",
        period: { start: "2026-03-01", end: "2026-03-31", mode: "calculation" },
        workloadValue: 180,
        totalScore: 1800
      },
      {
        id: "calculation-result-2026-03:score-outpatient-derived:workload-neurosurgery-outpatient",
        scoreDefinitionId: "score-outpatient-derived",
        workloadId: "workload-neurosurgery-outpatient",
        period: { start: "2026-03-01", end: "2026-03-31", mode: "calculation" },
        workloadValue: 220,
        totalScore: 2640
      }
    ],
    adjustmentSnapshot: [
      {
        scoreDefinitionId: "score-outpatient-derived",
        originalUnitScore: 12,
        currentUnitScore: 12
      },
      {
        scoreDefinitionId: "score-disease-weight-reused",
        originalUnitScore: 12,
        currentUnitScore: 12
      },
      {
        scoreDefinitionId: "score-emergency-manual",
        originalUnitScore: 8,
        currentUnitScore: 8
      },
      {
        scoreDefinitionId: "score-wang-outpatient",
        originalUnitScore: 12,
        currentUnitScore: 10
      }
    ]
  }
];
