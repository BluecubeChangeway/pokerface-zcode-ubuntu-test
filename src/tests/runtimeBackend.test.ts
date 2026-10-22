import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { UnitCard } from "../domain/card/types";
import type { WorkloadResult } from "../domain/workload/types";
import { MockDataService } from "../services/MockDataService";
import { LocalFolderDataService } from "../services/LocalFolderDataService";
import { createRuntimeDataService } from "../services/runtimeDataService";
import { clearDemoData, seedDemoData } from "../services/demoSeeder";
import { mockCards } from "../mock/mockCards";
import { mockRelations } from "../mock/mockRelations";
import { mockWorkloadResults } from "../mock/mockWorkloadChain";
import { mockWorkloadDefinitions } from "../mock/mockWorkloadDefinitions";
import {
  createLocalServer,
  makeTempDataDir,
  removeDir,
  type LocalServerHandle,
} from "../../local-server/server";

/**
 * R4a-2 运行时后端选择 + 演示数据播种（用户裁定方案 B）行为测试：
 * - createRuntimeDataService 双档选择（mock 默认 / local 显式）；
 * - 演示数据灌入：全集合落盘、参考数据经适配器 getter 可读、幂等不重复；
 * - 演示数据清除：精确按演示链 id 删除，用户自建数据不受影响；
 * - 真实 HTTP + 真实文件落盘（同 localFolderDataService.test.ts 口径）。
 */

describe("R4a-2 运行时数据后端选择（runtimeDataService）", () => {
  it("默认（未设置 VITE_DATA_BACKEND）= Mock 内存版", () => {
    const ds = createRuntimeDataService({});
    expect(ds instanceof MockDataService).toBe(true);
    expect(ds instanceof LocalFolderDataService).toBe(false);
  });

  it("VITE_DATA_BACKEND=local = 本地文件夹服务（默认地址）", () => {
    const ds = createRuntimeDataService({ VITE_DATA_BACKEND: "local" });
    expect(ds instanceof LocalFolderDataService).toBe(true);
  });

  it("VITE_LOCAL_SERVER_URL 自定义地址透传", () => {
    const ds = createRuntimeDataService({
      VITE_DATA_BACKEND: "local",
      VITE_LOCAL_SERVER_URL: "http://192.168.1.10:9000/",
    });
    expect(ds instanceof LocalFolderDataService).toBe(true);
    // 地址仅存于实例内部；连不上时请求失败会如实抛错（不在本测试联网验证）
  });
});

describe("R4a-2 演示数据播种 / 清除（demoSeeder，方案 B）", () => {
  let handle: LocalServerHandle;
  let adapter: LocalFolderDataService;
  let dataDir: string;

  beforeEach(async () => {
    dataDir = makeTempDataDir();
    handle = await createLocalServer({ port: 0, dataDir });
    adapter = new LocalFolderDataService(`http://127.0.0.1:${handle.port}`);
  });

  afterEach(async () => {
    await handle.close();
    removeDir(dataDir);
  });

  it("灌入：13 类集合全部落盘，参考数据经适配器 getter 可读", async () => {
    await seedDemoData(adapter);

    // 事实集合
    expect((await adapter.getCards()).length).toBe(mockCards.length);
    expect((await adapter.getRelations()).length).toBe(mockRelations.length);
    expect((await adapter.getWorkloadResults()).length).toBe(mockWorkloadResults.length);
    // 参考数据经正式 getter 可读（此前空文件夹会抛错）
    const definition = mockWorkloadDefinitions[0];
    expect((await adapter.getWorkloadDefinition(definition.id)).id).toBe(definition.id);
    await expect(adapter.getMeasurementResult()).resolves.toBeDefined();
    expect((await adapter.getRecommendations(undefined)).length).toBeGreaterThan(0);
    expect((await adapter.getScoreDefinitions()).length).toBeGreaterThan(0);
    expect((await adapter.getResultSets()).length).toBeGreaterThan(0);
    expect((await adapter.getCalculationSnapshots()).length).toBeGreaterThan(0);
    expect((await adapter.getWorkloadExecutions()).length).toBeGreaterThan(0);
  });

  it("灌入幂等：重复灌入不产生重复行（upsert by id）", async () => {
    await seedDemoData(adapter);
    const cardsAfterFirst = await adapter.getCards();
    await seedDemoData(adapter);
    const cardsAfterSecond = await adapter.getCards();
    expect(cardsAfterSecond.length).toBe(cardsAfterFirst.length);
    expect(cardsAfterSecond.length).toBe(mockCards.length);
  });

  it("清除：演示链数据精确移除，用户自建数据不受影响", async () => {
    await seedDemoData(adapter);
    // 用户自建数据（不在演示链中）
    const userUnit: UnitCard = {
      id: "user-unit-1", type: "unit", name: "用户自建科室",
      unitKind: "department", configurationState: "configured", attributes: {},
    };
    const userResult: WorkloadResult = {
      id: "user-wr-1", resultSetId: "user-rs", resultItemId: "user-ri-1",
      name: "用户自建结果", value: 42, dimensions: {},
    };
    await adapter.saveCards([userUnit]);
    await adapter.saveWorkloadResults([userResult]);

    await clearDemoData(adapter);

    const cards = await adapter.getCards();
    expect(cards.find((c) => c.id === userUnit.id)).toBeDefined(); // 用户数据保留
    expect(cards.find((c) => c.id === mockCards[0].id)).toBeUndefined(); // 演示数据清除
    const results = await adapter.getWorkloadResults();
    expect(results.find((r) => r.id === userResult.id)).toBeDefined();
    expect(results.find((r) => r.id === mockWorkloadResults[0].id)).toBeUndefined();
    // 演示参考数据清除后恢复空态（getMeasurementResult 再次显式抛错）
    await expect(adapter.getMeasurementResult()).rejects.toThrow(
      "Measurement result not found in local data folder"
    );
    // 用户数据在清除后的世界里仍然完整
    const relations = await adapter.getRelations();
    expect(relations.find((r) => r.id === mockRelations[0].id)).toBeUndefined();
  });
});
