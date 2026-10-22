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
import type { DataService } from "./DataService";

/**
 * 播种专用：可经原始集合写入的参考数据集合名（R4a-2 演示数据播种扩展）。
 * 与 local-server 的集合名一一对应；DataService 接口不开放这些集合的写方法。
 */
export type SeedableCollection =
  | "workload-definitions"
  | "workload-executions"
  | "calculation-snapshots"
  | "result-sets"
  | "score-definitions"
  | "measurement-results"
  | "adjustment-tables"
  | "recommendations";

/**
 * 本地文件夹数据服务（R4a 阶段 1；用户 2026-10-22 裁定：数据 = "工程资源"，
 * 存于用户/系统指定的特定文件夹，不进浏览器——见
 * AGENT/DECISIONS-AND-ASSUMPTIONS.md A-004）。
 *
 * 架构：本适配器实现 DataService 接口，经 HTTP 与 local-server（零依赖
 * Node 进程，拥有并管理数据文件夹）通信。领域层零改动——这是"减少重复
 * 开发"的结构保证：Mock → 本地文件夹 → 未来服务器备份/局域网协同，
 * 每阶段只换底层实现。
 *
 * 语义对齐（与 MockDataService 一致，行为级等价）：
 * - save* = upsert by id；delete* = 按 id 过滤、缺失 no-op（重试安全）；
 * - getWorkloadDefinition / getBudget / getAdjustmentTable 找不到即抛错
 *   （错误信息与 Mock 同格式）；
 * - getRecommendations(context)：context 参数为接口预留（同 Mock，不参与
 *   语义），返回文件夹中 recommendations 集合的当前内容——Mock 返回静态
 *   mock 推荐、本实现返回落盘数据（集成时的种子/空态差异见 README）；
 * - getMeasurementResult：文件夹为空时抛错（Mock 恒有静态对象）——
 *   空文件夹是合法初始态，显式报错优于伪造数据（不伪造原则）。
 *
 * 并发边界（如实记录）：单用户单实例语义；数据库级并发唯一性保证仍属
 * WK §16.5 Deferred——本适配器不改变应用层 check-then-write 语义。
 */
export class LocalFolderDataService implements DataService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async requestJson<T>(pathname: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      ...init,
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    });
    if (!response.ok) {
      let detail = "";
      try {
        const body = (await response.json()) as { error?: string };
        detail = body?.error ? `：${body.error}` : "";
      } catch {
        detail = "";
      }
      throw new Error(`本地数据服务请求失败 ${pathname}（HTTP ${response.status}${detail}）`);
    }
    return (await response.json()) as T;
  }

  private async getCollection<T>(name: string): Promise<T[]> {
    return this.requestJson<T[]>(`/api/${name}`);
  }

  private async saveCollection<T extends { id: string }>(name: string, rows: T[]): Promise<void> {
    await this.requestJson(`/api/${name}`, { method: "POST", body: JSON.stringify(rows) });
  }

  private async deleteCollectionRows(name: string, ids: string[]): Promise<void> {
    await this.requestJson(`/api/${name}`, {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    });
  }

  async getCards(): Promise<AnyCard[]> {
    return this.getCollection<AnyCard>("cards");
  }

  async getRelations(): Promise<Relation[]> {
    return this.getCollection<Relation>("relations");
  }

  async getRecommendations(_context: unknown): Promise<Recommendation[]> {
    return this.getCollection<Recommendation>("recommendations");
  }

  async getWorkloadDefinition(id: string): Promise<WorkloadDefinition> {
    const definitions = await this.getCollection<WorkloadDefinition>("workload-definitions");
    const definition = definitions.find((item) => item.id === id);
    if (!definition) {
      throw new Error(`Unknown workload definition: ${id}`);
    }
    return definition;
  }

  async getBudget(id: string): Promise<BudgetCard> {
    const cards = await this.getCards();
    const budget = cards.find(
      (card): card is BudgetCard => card.type === "budget" && card.id === id
    );
    if (!budget) {
      throw new Error(`Unknown budget: ${id}`);
    }
    return budget;
  }

  async getScoreDefinitions(): Promise<ScoreDefinition[]> {
    return this.getCollection<ScoreDefinition>("score-definitions");
  }

  async getMeasurementResult(): Promise<MeasurementResult> {
    const results = await this.getCollection<MeasurementResult>("measurement-results");
    const result = results[0];
    if (!result) {
      throw new Error("Measurement result not found in local data folder");
    }
    return result;
  }

  async getAdjustmentTable(id: string): Promise<AdjustmentTable> {
    const tables = await this.getCollection<AdjustmentTable>("adjustment-tables");
    const table = tables.find((item) => item.id === id);
    if (!table) {
      throw new Error(`Unknown adjustment table: ${id}`);
    }
    return table;
  }

  async getCalculationResults(): Promise<CalculationResult[]> {
    return this.getCollection<CalculationResult>("calculation-results");
  }

  async getWorkloadExecutions(): Promise<WorkloadExecution[]> {
    return this.getCollection<WorkloadExecution>("workload-executions");
  }

  async getCalculationSnapshots(): Promise<CalculationSnapshot[]> {
    return this.getCollection<CalculationSnapshot>("calculation-snapshots");
  }

  async getResultSets(): Promise<ResultSet[]> {
    return this.getCollection<ResultSet>("result-sets");
  }

  async getWorkloadResults(): Promise<WorkloadResult[]> {
    return this.getCollection<WorkloadResult>("workload-results");
  }

  async getWorkloadSplits(): Promise<WorkloadSplit[]> {
    return this.getCollection<WorkloadSplit>("workload-splits");
  }

  async getSplitProvenances(): Promise<SplitProvenanceRecord[]> {
    return this.getCollection<SplitProvenanceRecord>("split-provenances");
  }

  async saveSplitProvenances(records: SplitProvenanceRecord[]): Promise<void> {
    await this.saveCollection("split-provenances", records);
  }

  async saveRelations(relations: Relation[]): Promise<void> {
    await this.saveCollection("relations", relations);
  }

  async saveWorkloadResults(results: WorkloadResult[]): Promise<void> {
    await this.saveCollection("workload-results", results);
  }

  async saveWorkloadSplits(splits: WorkloadSplit[]): Promise<void> {
    await this.saveCollection("workload-splits", splits);
  }

  async saveCards(cards: AnyCard[]): Promise<void> {
    await this.saveCollection("cards", cards);
  }

  async saveCalculationResults(results: CalculationResult[]): Promise<void> {
    await this.saveCollection("calculation-results", results);
  }

  async deleteCards(ids: string[]): Promise<void> {
    await this.deleteCollectionRows("cards", ids);
  }

  async deleteWorkloadResults(ids: string[]): Promise<void> {
    await this.deleteCollectionRows("workload-results", ids);
  }

  // ---- 演示数据播种扩展（R4a-2 方案 B：空文件夹首启空白，演示数据一键灌入/清除）----
  // 非 DataService 接口成员：DataService 接口只开放五个可写事实集合
  //（cards/relations/workload-results/workload-splits/calculation-results）；
  // 演示链还包含通常只读的参考数据集合（definitions/executions/snapshots/
  // resultSets/scoreDefs/measurement/adjustmentTable/recommendations），
  // 播种需要对其落盘。本扩展仅供 demoSeeder 使用，业务运行时不调用。

  /** 播种专用：向参考数据集合写入行（upsert by id，同 save* 语义） */
  async saveSeedCollection<T extends { id: string }>(
    collection: SeedableCollection,
    rows: T[]
  ): Promise<void> {
    await this.saveCollection(collection, rows);
  }

  /** 播种专用：按 id 删除参考数据集合行（缺失 no-op，同 delete* 语义） */
  async deleteSeedCollectionRows(collection: SeedableCollection, ids: string[]): Promise<void> {
    await this.deleteCollectionRows(collection, ids);
  }

  /**
   * 播种专用（demoSeeder 清除）：按 id 删除 relations 行。
   * DataService 接口只声明了 deleteCards / deleteWorkloadResults；relations
   * 的删除在业务运行时经撤回编排（软删 = upsert active=false，不物理删行），
   * 演示数据清除是唯一需要物理删除 relations 的场景，语义同 delete*
   * （按 id 过滤、缺失 no-op）。业务代码不得调用本方法。
   */
  async deleteDemoRelations(ids: string[]): Promise<void> {
    await this.deleteCollectionRows("relations", ids);
  }

  /** 播种专用（demoSeeder 清除）：按 id 删除 calculation-results 行（同上边界） */
  async deleteDemoCalculationResults(ids: string[]): Promise<void> {
    await this.deleteCollectionRows("calculation-results", ids);
  }
}
