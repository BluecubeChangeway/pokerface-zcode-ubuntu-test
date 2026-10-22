/**
 * local-server/server.mjs 的类型声明（环境无关形态——不引入 node 类型，
 * 使 src/ 内代码在 tsc 严格模式下可直接引用本模块）。
 */

export interface LocalServerHandle {
  /** 底层 http server（环境无关，不暴露具体类型） */
  server: unknown;
  /** 实际监听端口（port 传 0 时为系统分配值） */
  port: number;
  /** 关闭并释放端口 */
  close(): Promise<void>;
}

export function createLocalServer(options: {
  port?: number;
  dataDir: string;
}): Promise<LocalServerHandle>;

/** 创建一次性临时数据目录（测试辅助，返回绝对路径） */
export function makeTempDataDir(): string;

/** 递归删除目录（仅用于清理临时目录） */
export function removeDir(dir: string): void;

/** 测试辅助：直接写入原始集合文件内容（仅供损坏保护等测试使用，生产勿用） */
export function debugWriteRawCollection(dataDir: string, name: string, raw: string): void;

export const COLLECTIONS: readonly string[];
