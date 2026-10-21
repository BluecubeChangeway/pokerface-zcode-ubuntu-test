import type {
  CalculationGraph,
  CalculationSnapshot,
  WorkloadDefinition,
  WorkloadExecution
} from "./types";

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

export interface SnapshotExtras {
  businessFields: string[];
  outputColumns: string[];
  resultDimensions: string[];
  modelVersionId?: string;
  dataVersionId?: string;
  note?: string;
}

export function createSnapshot(
  id: string,
  definition: WorkloadDefinition,
  execution: WorkloadExecution,
  graph: CalculationGraph,
  extras: SnapshotExtras
): CalculationSnapshot {
  return {
    id,
    definition: deepClone(definition),
    execution: deepClone(execution),
    graph: deepClone(graph),
    businessFields: [...extras.businessFields],
    outputColumns: [...extras.outputColumns],
    resultDimensions: [...extras.resultDimensions],
    modelVersionId: extras.modelVersionId,
    dataVersionId: extras.dataVersionId,
    note: extras.note
  };
}

export interface SnapshotDerivation {
  id: string;
  execution?: WorkloadExecution;
  graph?: CalculationGraph;
  note?: string;
}

export function deriveSnapshot(
  source: CalculationSnapshot,
  derivation: SnapshotDerivation
): CalculationSnapshot {
  const next = deepClone(source);
  next.id = derivation.id;
  next.derivedFromSnapshotId = source.id;

  if (derivation.execution) {
    next.execution = deepClone(derivation.execution);
  }

  if (derivation.graph) {
    next.graph = deepClone(derivation.graph);
  }

  if (derivation.note !== undefined) {
    next.note = derivation.note;
  }

  return next;
}
