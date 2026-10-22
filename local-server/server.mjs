#!/usr/bin/env node
/**
 * 本地数据服务（R4a 阶段 1；用户 2026-10-22 裁定：本地存储不进浏览器，
 * 存于用户/系统指定的特定文件夹——见 AGENT/DECISIONS-AND-ASSUMPTIONS.md A-004）
 *
 * 定位与边界：
 * - 拥有并管理 DATA_DIR 文件夹：全部业务数据以 JSON 文件分集合落盘
 *   （人可检视、可直接同步/备份——"工程资源"特质）；
 * - 写入为内存态 + 逐次落盘（write-through），原子写（tmp + rename），
 *   断电/崩溃最多丢最后一次写入，不产生半写文件；
 * - 语义与 MockDataService 对齐：save* = upsert by id；delete* = 按 id 过滤，
 *     不存在的 id 为 no-op（D-156/D-158 重试安全语义）；
 * - 单用户单实例（V1）；多用户/授权属阶段 3（R4c），届时另行设计；
 * - 生产 DataService 删除/持久化的"生产阻塞"解除即以此为承载——Mock ≠ 生产，
 *   本服务为真实落盘实现，但并发控制仍为应用层语义（WK §16.5 Deferred 不变）。
 *
 * 环境变量：
 *   POKER_FACE_DATA_DIR  数据文件夹（默认 ./poker-face-data）
 *   POKER_FACE_PORT      监听端口（默认 8787）
 *
 * HTTP API（全部 JSON）：
 *   GET    /api/health            → { ok: true, dataDir }
 *   GET    /api/:collection       → 该集合当前全部行
 *   POST   /api/:collection       → body: 行数组；upsert by id；返回 { ok, count }
 *   DELETE /api/:collection       → body: { ids: [...] }；按 id 删除（缺失 no-op）
 *
 * 集合清单（与 DataService 接口一一对应）：
 *   cards, relations, workload-results, workload-splits, calculation-results,
 *   result-sets, calculation-snapshots, workload-executions, workload-definitions,
 *   score-definitions, measurement-results, adjustment-tables, recommendations
 */

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const COLLECTIONS = [
  "cards",
  "relations",
  "workload-results",
  "workload-splits",
  "calculation-results",
  "result-sets",
  "calculation-snapshots",
  "workload-executions",
  "workload-definitions",
  "score-definitions",
  "measurement-results",
  "adjustment-tables",
  "recommendations",
];

const DEFAULT_PORT = 8787;

/** 集合文件路径：<dataDir>/<collection>.json */
function collectionFile(dataDir, name) {
  return path.join(dataDir, `${name}.json`);
}

/** 读单个集合（缺失文件 = 空数组；损坏文件 = 显式失败，不静默清空） */
function loadCollection(dataDir, name) {
  const file = collectionFile(dataDir, name);
  if (!fs.existsSync(file)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(parsed)) {
      throw new Error(`not an array`);
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `数据文件损坏，拒绝启动以保护现场：${file}（${error instanceof Error ? error.message : String(error)}）。` +
        `请人工检查或从备份恢复。`
    );
  }
}

/** 原子写：先写 tmp 再 rename，避免半写文件 */
function persistCollection(dataDir, name, rows) {
  const file = collectionFile(dataDir, name);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

/** upsert by id（与 MockDataService 语义一致） */
function upsertRows(rows, incoming) {
  for (const item of incoming) {
    if (item === null || item === undefined || typeof item !== "object" || typeof item.id !== "string") {
      throw new Error(`非法行：缺少字符串 id 字段`);
    }
    const index = rows.findIndex((row) => row.id === item.id);
    if (index >= 0) {
      rows[index] = item;
    } else {
      rows.push(item);
    }
  }
}

/** 按 id 删除；缺失 no-op（重试安全） */
function deleteRows(rows, ids) {
  const idSet = new Set(ids);
  const removed = [];
  const kept = [];
  for (const row of rows) {
    if (idSet.has(row.id)) {
      removed.push(row.id);
    } else {
      kept.push(row);
    }
  }
  rows.length = 0;
  rows.push(...kept);
  return removed;
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256 * 1024 * 1024) {
      throw new Error("请求体过大");
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    throw new Error("请求体为空（期望 JSON）");
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * 创建本地数据服务。port 传 0 = 由系统分配临时端口（测试用）。
 * 返回 { server, port, close }——close 完成后端口释放。
 * async 函数：目录装载/损坏保护等同步异常统一以 Promise rejection 呈现。
 */
export async function createLocalServer({ port = DEFAULT_PORT, dataDir }) {
  const dir = path.resolve(dataDir);
  fs.mkdirSync(dir, { recursive: true });
  const store = new Map();
  for (const name of COLLECTIONS) {
    store.set(name, loadCollection(dir, name));
  }

  const handler = async (req, res) => {
    const url = new URL(req.url === "/" ? "/api/health" : req.url, "http://localhost");
    try {
      if (req.method === "GET" && url.pathname === "/api/health") {
        return sendJson(res, 200, { ok: true, dataDir: dir });
      }
      const match = url.pathname.match(/^\/api\/([a-z-]+)$/);
      if (!match || !store.has(match[1])) {
        return sendJson(res, 404, { ok: false, error: `未知集合：${url.pathname}` });
      }
      const name = match[1];
      const rows = store.get(name);
      if (req.method === "GET") {
        return sendJson(res, 200, rows);
      }
      if (req.method === "POST") {
        const body = await readJsonBody(req);
        if (!Array.isArray(body)) {
          throw new Error("POST 请求体必须是行数组");
        }
        upsertRows(rows, body);
        persistCollection(dir, name, rows);
        return sendJson(res, 200, { ok: true, count: rows.length });
      }
      if (req.method === "DELETE") {
        const body = await readJsonBody(req);
        if (!body || !Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string")) {
          throw new Error("DELETE 请求体必须是 { ids: string[] }");
        }
        const removed = deleteRows(rows, body.ids);
        persistCollection(dir, name, rows);
        return sendJson(res, 200, { ok: true, removed });
      }
      return sendJson(res, 405, { ok: false, error: `不支持的请求方法：${req.method}` });
    } catch (error) {
      return sendJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const server = http.createServer((req, res) => {
    void handler(req, res);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const actualPort = server.address().port;
      resolve({
        server,
        port: actualPort,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((closeError) => {
              if (closeError) {
                closeReject(closeError);
              } else {
                closeResolve(undefined);
              }
            });
          }),
      });
    });
  });
}

/** 测试辅助：创建一次性临时数据目录（避免测试代码直接依赖 node API） */
export function makeTempDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "poker-face-data-"));
}

/** 测试辅助：递归删除目录（仅用于清理临时目录） */
export function removeDir(dir) {
  fs.rmSync(path.resolve(dir), { recursive: true, force: true });
}

/** 测试辅助：直接写入原始集合文件内容（仅供损坏保护等测试使用，生产勿用） */
export function debugWriteRawCollection(dataDir, name, raw) {
  fs.mkdirSync(path.resolve(dataDir), { recursive: true });
  fs.writeFileSync(collectionFile(path.resolve(dataDir), name), raw, "utf8");
}

/* ---------------- 直接运行入口（npm run server） ---------------- */

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const dataDir = process.env.POKER_FACE_DATA_DIR
    ? process.env.POKER_FACE_DATA_DIR
    : path.resolve(process.cwd(), "poker-face-data");
  const port = Number(process.env.POKER_FACE_PORT ?? DEFAULT_PORT);
  try {
    const handle = await createLocalServer({ port, dataDir });
    console.log(`[local-server] 数据文件夹：${path.resolve(dataDir)}`);
    console.log(`[local-server] 监听：http://127.0.0.1:${handle.port}`);
    console.log(`[local-server] Ctrl+C 停止（数据已逐次落盘，直接关闭不丢已写数据）`);
    const shutdown = () => {
      console.log("[local-server] 收到退出信号，关闭。");
      void handle.close().then(() => process.exit(0));
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error(`[local-server] 启动失败：${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
