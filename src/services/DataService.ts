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

export interface DataService {
  getCards(): Promise<AnyCard[]>;
  getRelations(): Promise<Relation[]>;
  getRecommendations(context: unknown): Promise<Recommendation[]>;
  getWorkloadDefinition(id: string): Promise<WorkloadDefinition>;
  getBudget(id: string): Promise<BudgetCard>;
  getScoreDefinitions(): Promise<ScoreDefinition[]>;
  getMeasurementResult(): Promise<MeasurementResult>;
  getAdjustmentTable(id: string): Promise<AdjustmentTable>;
  getCalculationResults(): Promise<CalculationResult[]>;
  getWorkloadExecutions(): Promise<WorkloadExecution[]>;
  getCalculationSnapshots(): Promise<CalculationSnapshot[]>;
  getResultSets(): Promise<ResultSet[]>;
  getWorkloadResults(): Promise<WorkloadResult[]>;
  getWorkloadSplits(): Promise<WorkloadSplit[]>;
  getSplitProvenances(): Promise<SplitProvenanceRecord[]>;
  saveSplitProvenances(records: SplitProvenanceRecord[]): Promise<void>;

  // 批量事实持久化（Q-09-C P0）
  saveRelations(relations: Relation[]): Promise<void>;
  saveWorkloadResults(results: WorkloadResult[]): Promise<void>;
  saveWorkloadSplits(splits: WorkloadSplit[]): Promise<void>;
  saveCards(cards: AnyCard[]): Promise<void>;
  /** 批量 CalculationResult 持久化（D-154：撤回显式失效需要经持久层表达，upsert by id） */
  saveCalculationResults(results: CalculationResult[]): Promise<void>;
  /**
   * 物理 deletion（D-156/D-158）：按 ID 批量删除 WorkloadCard / WorkloadResult。
   * 不存在的 ID 按 no-op 处理——重复删除与失败重试安全收敛。
   */
  deleteCards(ids: string[]): Promise<void>;
  deleteWorkloadResults(ids: string[]): Promise<void>;
}
