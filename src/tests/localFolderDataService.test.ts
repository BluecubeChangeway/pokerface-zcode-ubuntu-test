import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AnyCard, BudgetCard, UnitCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import type { WorkloadDefinition } from "../domain/workload/types";
import { createWorkloadSplit } from "../domain/workload/splitService";
import { LocalFolderDataService } from "../services/LocalFolderDataService";
import { mockCards } from "../mock/mockCards";
import {
  mockAdjustmentTable,
  mockCalculationResults,
  mockMeasurementResult
} from "../mock/mockScores";
import { mockWorkloadDefinitions } from "../mock/mockWorkloadDefinitions";
import {
  createLocalServer,
  debugWriteRawCollection,
  makeTempDataDir,
  removeDir,
  type LocalServerHandle,
} from "../../local-server/server";

/**
 * R4a 本地文件夹数据服务（用户 2026-10-22 裁定：数据 = "工程资源"，存于
 * 指定文件夹，不进浏览器）行为测试：
 * - save* upsert-by-id、delete* 缺失 no-op——与 MockDataService 行为级等价；
 * - **重启持久化**（核心用户价值：关掉再打开不丢）；
 * - 按 id getter 找不到抛错（与 Mock 同格式错误信息）；
 * - 空文件夹不伪造数据（getMeasurementResult 显式抛错）；
 * - 数据文件损坏时拒绝启动、保护现场（不静默清空）。
 *
 * 口径：全部为真实 HTTP + 真实文件落盘的行为级断言（非 mock fetch）。
 * 只读集合（definitions / adjustment-tables / measurement-results 等）无
 * DataService 保存方法，测试经原始 HTTP 直接播种（与适配器 getter 的读取
 * 路径解耦验证）。
 */

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function unitCard(id: string, name: string): UnitCard {
  return {
    id, type: "unit", name,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
}

/** 经原始 HTTP 向集合播种（绕过适配器写路径，用于验证只读 getter） */
async function seedViaHttp(
  baseUrl: string,
  collection: string,
  rows: Array<{ id: string }>
): Promise<void> {
  const response = await fetch(`${baseUrl}/api/${collection}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rows),
  });
  expect(response.ok).toBe(true);
}

describe("R4a 本地文件夹数据服务（local-server + LocalFolderDataService）", () => {
  let handle: LocalServerHandle;
  let adapter: LocalFolderDataService;
  let dataDir: string;
  let baseUrl: string;

  beforeAll(async () => {
    dataDir = makeTempDataDir();
    handle = await createLocalServer({ port: 0, dataDir });
    baseUrl = `http://127.0.0.1:${handle.port}`;
    adapter = new LocalFolderDataService(baseUrl);
  });

  afterAll(async () => {
    await handle.close();
    removeDir(dataDir);
  });

  it("五个可写集合的 upsert 语义与 Mock 行为等价（新行追加、同 id 替换）", async () => {
    const cards: AnyCard[] = [unitCard("t-unit-1", "内科"), unitCard("t-unit-2", "急诊")];
    const relations: Relation[] = [
      { id: "t-rel-1", type: "workload_assign", sourceId: "t-unit-1", targetId: "t-wl-1", active: true },
      { id: "t-rel-2", type: "workload_assign", sourceId: "t-unit-2", targetId: "t-wl-1", active: true },
    ];
    const parentResult = {
      id: "t-wr-parent", resultSetId: "t-rs", resultItemId: "t-ri-parent",
      name: "父结果", value: 100, dimensions: {},
    };
    const split = createWorkloadSplit({
      parentResultId: parentResult.id,
      children: [
        { name: "子1", value: 60, dimensions: {}, resultSetId: "t-rs", resultItemId: "t-ri-c1" },
        { name: "子2", value: 40, dimensions: {}, resultSetId: "t-rs", resultItemId: "t-ri-c2" },
      ],
      splitType: "complete",
      executionBatchId: "t-batch",
    }, parentResult);
    const calculationResult = clone(mockCalculationResults[0]);
    calculationResult.id = "t-calc-1";

    await adapter.saveCards(cards);
    await adapter.saveRelations(relations);
    await adapter.saveWorkloadResults([parentResult, ...split.childResults]);
    await adapter.saveWorkloadSplits(split.workloadSplits);
    await adapter.saveCalculationResults([calculationResult]);

    // 新行落盘可读
    expect((await adapter.getCards()).map((c) => c.id).sort()).toEqual(["t-unit-1", "t-unit-2"]);
    expect((await adapter.getRelations()).map((r) => r.id).sort()).toEqual(["t-rel-1", "t-rel-2"]);
    expect((await adapter.getWorkloadResults()).map((r) => r.id).sort())
      .toEqual(["t-wr-parent", split.childResults[0].id, split.childResults[1].id].sort());
    expect((await adapter.getWorkloadSplits()).map((s) => s.id).sort())
      .toEqual(split.workloadSplits.map((s) => s.id).sort());
    expect((await adapter.getCalculationResults()).map((r) => r.id)).toEqual(["t-calc-1"]);

    // 同 id upsert = 替换，不产生重复行
    const renamed = unitCard("t-unit-1", "内科改名");
    await adapter.saveCards([renamed]);
    const cardsAfter = await adapter.getCards();
    expect(cardsAfter.filter((c) => c.id === "t-unit-1")).toHaveLength(1);
    expect(cardsAfter.find((c) => c.id === "t-unit-1")!.name).toBe("内科改名");
    // 追加新行
    await adapter.saveCards([unitCard("t-unit-3", "外科")]);
    expect(await adapter.getCards()).toHaveLength(3);
  });

  it("deleteCards / deleteWorkloadResults：命中删除、缺失 no-op（重试安全）", async () => {
    const cards: AnyCard[] = [
      unitCard("d-unit-1", "内科"), unitCard("d-unit-2", "急诊"), unitCard("d-unit-3", "外科"),
    ];
    await adapter.saveCards(cards);
    // 混合存在/缺失 id：不抛错（断言限定本组 d- 前缀行——共享服务含前序测试数据）
    await adapter.deleteCards(["d-unit-1", "d-unit-none"]);
    const afterFirstDelete = (await adapter.getCards()).map((c) => c.id);
    expect(afterFirstDelete).not.toContain("d-unit-1");
    expect(afterFirstDelete).toContain("d-unit-2");
    expect(afterFirstDelete).toContain("d-unit-3");
    // 幂等重试：再删同一批不抛错、不变化
    await adapter.deleteCards(["d-unit-1", "d-unit-none"]);
    const afterRetry = (await adapter.getCards()).map((c) => c.id);
    expect(afterRetry).not.toContain("d-unit-1");
    expect(afterRetry).toContain("d-unit-2");
    expect(afterRetry).toContain("d-unit-3");

    const results = [
      { id: "d-wr-1", resultSetId: "d-rs", resultItemId: "d-ri-1", name: "结果1", value: 1, dimensions: {} },
      { id: "d-wr-2", resultSetId: "d-rs", resultItemId: "d-ri-2", name: "结果2", value: 2, dimensions: {} },
    ];
    await adapter.saveWorkloadResults(results);
    await adapter.deleteWorkloadResults(["d-wr-1", "d-wr-none"]);
    const afterResultDelete = (await adapter.getWorkloadResults()).map((r) => r.id);
    expect(afterResultDelete).not.toContain("d-wr-1");
    expect(afterResultDelete).toContain("d-wr-2");
  });

  it("按 id getter：命中返回、未命中抛错（错误信息与 Mock 同格式）", async () => {
    const definition = clone(mockWorkloadDefinitions[0]) as WorkloadDefinition;
    await seedViaHttp(baseUrl, "workload-definitions", [definition]);
    expect((await adapter.getWorkloadDefinition(definition.id)).id).toBe(definition.id);
    await expect(adapter.getWorkloadDefinition("def-none"))
      .rejects.toThrow("Unknown workload definition: def-none");

    const budgetSource = mockCards.find((card): card is BudgetCard => card.type === "budget");
    expect(budgetSource).toBeDefined();
    const budget = clone(budgetSource!);
    budget.id = "budget-test-1";
    await adapter.saveCards([budget]);
    expect((await adapter.getBudget("budget-test-1")).id).toBe("budget-test-1");
    await expect(adapter.getBudget("budget-none"))
      .rejects.toThrow("Unknown budget: budget-none");

    const table = clone(mockAdjustmentTable);
    await seedViaHttp(baseUrl, "adjustment-tables", [table]);
    expect((await adapter.getAdjustmentTable(table.id)).id).toBe(table.id);
    await expect(adapter.getAdjustmentTable("adj-none"))
      .rejects.toThrow("Unknown adjustment table: adj-none");
  });

  it("getRecommendations：返回文件夹落盘内容（context 为接口预留，不参与语义）", async () => {
    expect(await adapter.getRecommendations(undefined)).toEqual([]);
    const rec = {
      id: "rec-test-1",
      kind: "resolution",
      payload: { type: "use_existing_result" },
      status: "recommended",
      createdAt: "2026-10-22T00:00:00.000Z",
      updatedAt: "2026-10-22T00:00:00.000Z",
      relatedEntityIds: ["wl-x", "unit-y"],
    };
    await seedViaHttp(baseUrl, "recommendations", [rec]);
    const recommendations = await adapter.getRecommendations(undefined);
    expect(recommendations.map((r) => r.id)).toEqual(["rec-test-1"]);
  });

  it("重启持久化：关闭服务后重新启动，全部数据从文件夹恢复（关掉再打开不丢）", async () => {
    const restartDir = makeTempDataDir();
    const first = await createLocalServer({ port: 0, dataDir: restartDir });
    const firstAdapter = new LocalFolderDataService(`http://127.0.0.1:${first.port}`);
    const cards: AnyCard[] = [
      unitCard("r-unit-1", "重启内科"), unitCard("r-unit-2", "重启急诊"),
    ];
    const relations: Relation[] = [
      { id: "r-rel-1", type: "workload_assign", sourceId: "r-unit-1", targetId: "r-wl-1", active: true },
    ];
    await firstAdapter.saveCards(cards);
    await firstAdapter.saveRelations(relations);
    await first.close();

    // 全新服务实例、同一文件夹：数据完整恢复
    const second = await createLocalServer({ port: 0, dataDir: restartDir });
    const secondAdapter = new LocalFolderDataService(`http://127.0.0.1:${second.port}`);
    const restoredCards = await secondAdapter.getCards();
    const restoredRelations = await secondAdapter.getRelations();
    expect(restoredCards.map((c) => c.id).sort()).toEqual(["r-unit-1", "r-unit-2"]);
    expect(restoredCards.find((c) => c.id === "r-unit-1")!.name).toBe("重启内科");
    expect(restoredRelations.map((r) => r.id)).toEqual(["r-rel-1"]);
    // upsert 在恢复后继续正常工作
    await secondAdapter.saveCards([unitCard("r-unit-3", "重启外科")]);
    expect(await secondAdapter.getCards()).toHaveLength(3);
    await second.close();
    removeDir(restartDir);
  });

  it("空文件夹不伪造数据：getMeasurementResult 显式抛错，存入后可读", async () => {
    const emptyDir = makeTempDataDir();
    const serverHandle = await createLocalServer({ port: 0, dataDir: emptyDir });
    const emptyAdapter = new LocalFolderDataService(`http://127.0.0.1:${serverHandle.port}`);
    await expect(emptyAdapter.getMeasurementResult())
      .rejects.toThrow("Measurement result not found in local data folder");
    const measurement = clone(mockMeasurementResult);
    await seedViaHttp(`http://127.0.0.1:${serverHandle.port}`, "measurement-results", [measurement]);
    expect((await emptyAdapter.getMeasurementResult()).id).toBe(measurement.id);
    await serverHandle.close();
    removeDir(emptyDir);
  });

  it("数据文件损坏保护：拒绝启动、明确报错、不静默清空现场", async () => {
    const corruptDir = makeTempDataDir();
    debugWriteRawCollection(corruptDir, "cards", "{ 这不是合法 JSON");
    await expect(createLocalServer({ port: 0, dataDir: corruptDir }))
      .rejects.toThrow(/数据文件损坏.*cards\.json/);
    removeDir(corruptDir);
  });
});
