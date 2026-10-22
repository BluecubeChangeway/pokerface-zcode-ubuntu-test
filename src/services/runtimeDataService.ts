import type { DataService } from "./DataService";
import { dataService as mockBackendDataService } from "./MockDataService";
import { LocalFolderDataService } from "./LocalFolderDataService";

/**
 * 运行时数据后端选择（R4a-2；用户 2026-10-22 裁定存储路线，见
 * AGENT/DECISIONS-AND-ASSUMPTIONS.md A-004）。
 *
 * 两档：
 * - mock（默认）：内存演示版（刷新即失）——与既有全部测试共用同一语义；
 * - local：本地文件夹服务（local-server + LocalFolderDataService）——
 *   数据落盘于指定文件夹（"工程资源"），重启不丢。
 *
 * 切换方式（构建/开发期环境变量，非运行时开关——避免双数据源歧义）：
 *   VITE_DATA_BACKEND=local  选择本地文件夹后端
 *   VITE_LOCAL_SERVER_URL    本地服务地址（默认 http://127.0.0.1:8787）
 * 使用：`npm run dev:local`（先 `npm run server`）。
 *
 * 生产代码只 import 本模块的 dataService 单例（App 等）；测试不受影响——
 * 测试默认 env 为 mock，且仍可直接 import MockDataService 的单例/类。
 * 测试可用 createRuntimeDataService(env) 显式验证选择逻辑。
 */

export type RuntimeDataBackend = "mock" | "local";

export interface RuntimeDataBackendEnv {
  VITE_DATA_BACKEND?: string;
  VITE_LOCAL_SERVER_URL?: string;
}

export function createRuntimeDataService(
  env: RuntimeDataBackendEnv = import.meta.env
): DataService {
  if (env.VITE_DATA_BACKEND === "local") {
    return new LocalFolderDataService(env.VITE_LOCAL_SERVER_URL ?? "http://127.0.0.1:8787");
  }
  // mock 档复用 MockDataService 模块的既有单例（App 原先直接 import 它）——
  // 不创建第二实例：既有测试对该单例的 spy、运行时共享内存态均保持不变。
  return mockBackendDataService;
}

/** App 运行时数据服务单例（后端由 VITE_DATA_BACKEND 决定，默认 mock） */
export const dataService: DataService = createRuntimeDataService();

/** 当前生效后端标识（UI 展示用；与 dataService 单例同源同判） */
export const runtimeDataBackend: RuntimeDataBackend =
  import.meta.env.VITE_DATA_BACKEND === "local" ? "local" : "mock";
