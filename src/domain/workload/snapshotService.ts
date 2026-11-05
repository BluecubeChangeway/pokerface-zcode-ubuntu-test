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
  outputColumns: Array<{ name: string; type: string }>;
  resultDimensions: string[];
  dataVersion?: string;
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
    outputColumns: [...extras.outputColumns],
    resultDimensions: [...extras.resultDimensions],
    dataVersion: extras.dataVersion,
    note: extras.note,
    createdAt: new Date().toISOString()
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
