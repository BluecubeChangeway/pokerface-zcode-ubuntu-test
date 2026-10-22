import type { AnyCard, BudgetCard } from "../domain/card/types";
import type { Recommendation } from "../domain/recommendation/types";
import type { Relation } from "../domain/relation/types";
import type {
  AdjustmentTable,
  CalculationResult,
  MeasurementResult,
  ScoreDefinition
} from "../domain/score/types";
import type { WorkloadDefinition, WorkloadExecution } from "../domain/workload/types";
import type { CalculationSnapshot, ResultSet, WorkloadResult, WorkloadSplit } from "../domain/workload/types";
import type { SplitProvenanceRecord } from "../domain/workload/splitProvenance";
import {
  mockCalculationSnapshots,
  mockResultSets,
  mockWorkloadExecutions,
  mockWorkloadResults
} from "../mock/mockWorkloadChain";
import { mockCards } from "../mock/mockCards";
import { mockRecommendations } from "../mock/mockRecommendations";
import { mockRelations } from "../mock/mockRelations";
import {
  mockAdjustmentTable,
  mockCalculationResults,
  mockMeasurementResult,
  mockScoreDefinitions
} from "../mock/mockScores";
import { mockWorkloadDefinitions } from "../mock/mockWorkloadDefinitions";
import type { DataService } from "./DataService";

// 内存存储扩展（Q-09-C P0）
let relationsStore = [...mockRelations];
let workloadResultsStore = [...mockWorkloadResults];
let workloadSplitsStore: WorkloadSplit[] = [];
let cardsStore = [...mockCards];
// CalculationResult 可写存储（D-154：撤回显式失效经 upsert 表达；初始为 mock 数据副本）
let calculationResultsStore: CalculationResult[] = [...mockCalculationResults];
// 拆分溯源存储（R3：confirm_split 持久化阶段写入；upsert by id；撤回不删除——历史记录）
let splitProvenancesStore: SplitProvenanceRecord[] = [];

export class MockDataService implements DataService {
  async getCards(): Promise<AnyCard[]> {
    return cardsStore;
  }

  async getRelations(): Promise<Relation[]> {
    return relationsStore;
  }

  async getRecommendations(_context: unknown): Promise<Recommendation[]> {
    return mockRecommendations;
  }

  async getWorkloadDefinition(id: string): Promise<WorkloadDefinition> {
    const definition = mockWorkloadDefinitions.find((item) => item.id === id);

    if (!definition) {
      throw new Error(`Unknown workload definition: ${id}`);
    }

    return definition;
  }

  async getBudget(id: string): Promise<BudgetCard> {
    const budget = mockCards.find((card): card is BudgetCard => card.type === "budget" && card.id === id);

    if (!budget) {
      throw new Error(`Unknown budget: ${id}`);
    }

    return budget;
  }

  async getScoreDefinitions(): Promise<ScoreDefinition[]> {
    return mockScoreDefinitions;
  }

  async getMeasurementResult(): Promise<MeasurementResult> {
    return mockMeasurementResult;
  }

  async getAdjustmentTable(id: string): Promise<AdjustmentTable> {
    if (mockAdjustmentTable.id !== id) {
      throw new Error(`Unknown adjustment table: ${id}`);
    }

    return mockAdjustmentTable;
  }

  async getCalculationResults(): Promise<CalculationResult[]> {
    return calculationResultsStore;
  }

  async getWorkloadExecutions(): Promise<WorkloadExecution[]> {
    return mockWorkloadExecutions;
  }

  async getCalculationSnapshots(): Promise<CalculationSnapshot[]> {
    return mockCalculationSnapshots;
  }

  async getResultSets(): Promise<ResultSet[]> {
    return mockResultSets;
  }

  async getWorkloadResults(): Promise<WorkloadResult[]> {
    return workloadResultsStore;
  }

  async getWorkloadSplits(): Promise<WorkloadSplit[]> {
    return workloadSplitsStore;
  }

  async getSplitProvenances(): Promise<SplitProvenanceRecord[]> {
    return splitProvenancesStore;
  }

  async saveSplitProvenances(records: SplitProvenanceRecord[]): Promise<void> {
    for (const record of records) {
      const existingIndex = splitProvenancesStore.findIndex((r) => r.id === record.id);
      if (existingIndex >= 0) {
        splitProvenancesStore[existingIndex] = record;
      } else {
        splitProvenancesStore.push(record);
      }
    }
  }

  // 批量事实持久化（Q-09-C P0）
  async saveRelations(relations: Relation[]): Promise<void> {
    for (const relation of relations) {
      const existingIndex = relationsStore.findIndex(r => r.id === relation.id);
      if (existingIndex >= 0) {
        relationsStore[existingIndex] = relation;
      } else {
        relationsStore.push(relation);
      }
    }
  }

  async saveWorkloadResults(results: WorkloadResult[]): Promise<void> {
    for (const result of results) {
      const existingIndex = workloadResultsStore.findIndex(r => r.id === result.id);
      if (existingIndex >= 0) {
        workloadResultsStore[existingIndex] = result;
      } else {
        workloadResultsStore.push(result);
      }
    }
  }

  async saveWorkloadSplits(splits: WorkloadSplit[]): Promise<void> {
    for (const split of splits) {
      const existingIndex = workloadSplitsStore.findIndex(s => s.id === split.id);
      if (existingIndex >= 0) {
        workloadSplitsStore[existingIndex] = split;
      } else {
        workloadSplitsStore.push(split);
      }
    }
  }

  async saveCards(cards: AnyCard[]): Promise<void> {
    for (const card of cards) {
      const existingIndex = cardsStore.findIndex(c => c.id === card.id);
      if (existingIndex >= 0) {
        cardsStore[existingIndex] = card;
      } else {
        cardsStore.push(card);
      }
    }
  }

  // D-154：CalculationResult 撤回显式失效的持久层表达（upsert by id，与其他事实存储一致）
  async saveCalculationResults(results: CalculationResult[]): Promise<void> {
    for (const result of results) {
      const existingIndex = calculationResultsStore.findIndex(c => c.id === result.id);
      if (existingIndex >= 0) {
        calculationResultsStore[existingIndex] = result;
      } else {
        calculationResultsStore.push(result);
      }
    }
  }

  // D-156/D-158：物理删除（按 id 整批过滤；不存在的 id 视为 no-op——重复删除/失败重试安全收敛）
  async deleteCards(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    cardsStore = cardsStore.filter((c) => !idSet.has(c.id));
  }

  async deleteWorkloadResults(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    workloadResultsStore = workloadResultsStore.filter((r) => !idSet.has(r.id));
  }
}

export const dataService: DataService = new MockDataService();
