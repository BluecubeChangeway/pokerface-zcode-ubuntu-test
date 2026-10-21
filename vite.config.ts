import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    // 单测超时上调（2026-10-08）：DOM 级测试（渲染完整 App + 真实持久化链）在
    // 并行全量运行下的实际耗时超过 vitest 默认 5s（本机实测隔离运行即达 ~6s）。
    // 仅放宽时间预算，不改变任何断言与测试语义。
    testTimeout: 20000
  }
});
