import { describe, expect, it } from "vitest";
import type { AnyCard, UnitCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import { LocalFolderDataService } from "../services/LocalFolderDataService";
import {
  createLocalServer,
  debugWriteRawCollection,
  makeTempDataDir,
  removeDir,
  type LocalServerHandle,
} from "../../local-server/server";

/**
 * R4b 闲时备份/恢复（用户批准设计：时间戳全量快照 + 全量替换恢复 + 恢复前自动快照）行为测试。
 * 真实 HTTP + 真实文件落盘（与 localFolderDataService.test.ts 同口径）：
 * - 备份：创建快照（backups/<时间戳>/，14 集合文件 + manifest），列表可查；
 * - 恢复：全量替换（删除的回来、新增的消失——不是合并）；自动先做"恢复前快照"；
 * - 损坏防护：备份文件损坏 → 恢复中止、现有数据未动；备份名不存在 → 明确报错。
 */

function unitCard(id: string, name: string): UnitCard {
  return {
    id, type: "unit", name,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
}

describe("R4b 备份/恢复（真实服务器 + 真实文件）", () => {
  it("创建备份 → 修改数据 → 恢复 = 全量替换（删除的回来、新增的消失）+ 自动预快照", async () => {
    const dataDir = makeTempDataDir();
    const handle = await createLocalServer({ port: 0, dataDir });
    const adapter = new LocalFolderDataService(`http://127.0.0.1:${handle.port}`);
    try {
      // 初始状态：两张卡
      await adapter.saveCards([unitCard("bk-unit-1", "内科"), unitCard("bk-unit-2", "急诊")]);
      await adapter.saveRelations([{
        id: "bk-rel-1", type: "workload_assign",
        sourceId: "bk-unit-1", targetId: "bk-wl-1", active: true,
      }]);

      // 备份
      const backup = await adapter.createBackup();
      expect(backup.name).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      const list1 = await adapter.listBackups();
      expect(list1.some((entry) => entry.name === backup.name)).toBe(true);

      // 修改数据：删一张、加一张
      await adapter.deleteCards(["bk-unit-2"]);
      await adapter.saveCards([unitCard("bk-unit-3", "外科")]);
      expect((await adapter.getCards()).map((c) => c.id).sort()).toEqual(["bk-unit-1", "bk-unit-3"]);

      // 恢复
      const restore = await adapter.restoreBackup(backup.name);
      expect(restore.restoredFrom).toBe(backup.name);
      expect(restore.preRestoreSnapshot).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      // 全量替换：删除的回来（bk-unit-2）、新增的消失（bk-unit-3）
      expect((await adapter.getCards()).map((c) => c.id).sort()).toEqual(["bk-unit-1", "bk-unit-2"]);
      // 关系集合同样恢复
      const relations: Relation[] = await adapter.getRelations();
      expect(relations.some((r) => r.id === "bk-rel-1" && r.active)).toBe(true);

      // 自动预快照在列表中（含"恢复前"的世界：含 bk-unit-3、无 bk-unit-2）
      const list2 = await adapter.listBackups();
      const preRestore = list2.find((entry) => entry.name === restore.preRestoreSnapshot);
      expect(preRestore).toBeDefined();
      expect(preRestore!.marker).toBe("pre-restore");
      // 恢复"恢复前快照" = 回到恢复前状态（恢复永不丢数据的实证）
      const restore2 = await adapter.restoreBackup(restore.preRestoreSnapshot);
      expect((await adapter.getCards()).map((c) => c.id).sort()).toEqual(["bk-unit-1", "bk-unit-3"]);
      expect(restore2.preRestoreSnapshot).not.toBe(restore.preRestoreSnapshot);
    } finally {
      await handle.close();
      removeDir(dataDir);
    }
  });

  it("备份文件损坏 → 恢复中止、现有数据未动（同坏文件保护纪律）", async () => {
    const dataDir = makeTempDataDir();
    const handle = await createLocalServer({ port: 0, dataDir });
    const adapter = new LocalFolderDataService(`http://127.0.0.1:${handle.port}`);
    try {
      await adapter.saveCards([unitCard("bk2-unit-1", "内科")]);
      const backup = await adapter.createBackup();
      // 手动弄坏备份里的 cards 文件（直接写磁盘）
      debugWriteRawCollection(`${dataDir}/backups/${backup.name}`, "cards", "{ 坏掉的 JSON");
      await adapter.saveCards([unitCard("bk2-unit-2", "急诊")]);

      await expect(adapter.restoreBackup(backup.name)).rejects.toThrow(/备份文件损坏.*已中止恢复/s);
      // 现有数据未动
      expect((await adapter.getCards()).map((c) => c.id).sort()).toEqual(["bk2-unit-1", "bk2-unit-2"]);
    } finally {
      await handle.close();
      removeDir(dataDir);
    }
  });

  it("备份名不存在 → 明确报错，数据不动", async () => {
    const dataDir = makeTempDataDir();
    const handle = await createLocalServer({ port: 0, dataDir });
    const adapter = new LocalFolderDataService(`http://127.0.0.1:${handle.port}`);
    try {
      await adapter.saveCards([unitCard("bk3-unit-1", "内科")]);
      await expect(adapter.restoreBackup("9999-01-01T00-00-00-000")).rejects.toThrow(/备份不存在/);
      expect((await adapter.getCards()).length).toBe(1);
    } finally {
      await handle.close();
      removeDir(dataDir);
    }
  });
});
