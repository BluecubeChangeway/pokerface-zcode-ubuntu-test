import { type LocalFolderDataService } from "./LocalFolderDataService";
import { mockCards } from "../mock/mockCards";
import { mockRelations } from "../mock/mockRelations";
import { mockRecommendations } from "../mock/mockRecommendations";
import { mockWorkloadDefinitions } from "../mock/mockWorkloadDefinitions";
import {
  mockCalculationSnapshots,
  mockResultSets,
  mockWorkloadExecutions,
  mockWorkloadResults,
} from "../mock/mockWorkloadChain";
import {
  mockAdjustmentTable,
  mockCalculationResults,
  mockMeasurementResult,
  mockScoreDefinitions,
} from "../mock/mockScores";

/**
 * 演示数据播种 / 清除（R4a-2 方案 B，用户裁定：空文件夹首启空白、不伪造数据；
 * 演示数据 = 可一键灌入、可整体清除的普通数据——与"工作起点是数据上传"
 * 原则一致）。
 *
 * 边界：
 * - 数据源 = 既有 mock 演示链（单一事实源，不复制第二份演示数据定义）；
 * - 灌入 = 全量 upsert by id：重复灌入把演示数据重置为初始状态，
 *   不产生重复行；
 * - 清除 = 精确按演示链自身的 id 删除（缺失 no-op）：**用户自建的任何
 *   不在演示链中的数据（新卡、新关系、拆分产物等）不受影响**；
 * - 全部经 LocalFolderDataService 的持久化方法落盘，不绕过边界。
 */
export async function seedDemoData(ds: LocalFolderDataService): Promise<void> {
  // 五个可写事实集合（DataService 接口成员）
  await ds.saveCards(mockCards);
  await ds.saveRelations(mockRelations);
  await ds.saveWorkloadResults(mockWorkloadResults);
  await ds.saveCalculationResults(mockCalculationResults);
  // 八个参考数据集合（播种扩展，见 LocalFolderDataService 播种扩展注释）
  await ds.saveSeedCollection("workload-definitions", mockWorkloadDefinitions);
  await ds.saveSeedCollection("workload-executions", mockWorkloadExecutions);
  await ds.saveSeedCollection("calculation-snapshots", mockCalculationSnapshots);
  await ds.saveSeedCollection("result-sets", mockResultSets);
  await ds.saveSeedCollection("score-definitions", mockScoreDefinitions);
  await ds.saveSeedCollection("measurement-results", [mockMeasurementResult]);
  await ds.saveSeedCollection("adjustment-tables", [mockAdjustmentTable]);
  await ds.saveSeedCollection("recommendations", mockRecommendations);
}

/** 按演示链自身 id 精确清除演示数据（用户自建数据不受影响；缺失 no-op） */
export async function clearDemoData(ds: LocalFolderDataService): Promise<void> {
  await ds.deleteCards(mockCards.map((card) => card.id));
  await ds.deleteWorkloadResults(mockWorkloadResults.map((result) => result.id));
  await ds.deleteDemoRelations(mockRelations.map((relation) => relation.id));
  await ds.deleteDemoCalculationResults(mockCalculationResults.map((result) => result.id));
  await ds.deleteSeedCollectionRows("workload-definitions", mockWorkloadDefinitions.map((d) => d.id));
  await ds.deleteSeedCollectionRows("workload-executions", mockWorkloadExecutions.map((e) => e.id));
  await ds.deleteSeedCollectionRows("calculation-snapshots", mockCalculationSnapshots.map((s) => s.id));
  await ds.deleteSeedCollectionRows("result-sets", mockResultSets.map((r) => r.id));
  await ds.deleteSeedCollectionRows("score-definitions", mockScoreDefinitions.map((s) => s.id));
  await ds.deleteSeedCollectionRows("measurement-results", [mockMeasurementResult.id]);
  await ds.deleteSeedCollectionRows("adjustment-tables", [mockAdjustmentTable.id]);
  await ds.deleteSeedCollectionRows("recommendations", mockRecommendations.map((r) => r.id));
}
