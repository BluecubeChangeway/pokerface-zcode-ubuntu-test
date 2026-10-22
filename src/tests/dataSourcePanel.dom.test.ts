// @vitest-environment happy-dom
/**
 * 数据来源面板（R4a-2 本地文件夹存储接入）真实 React DOM 行为测试。
 *
 * 测试环境默认后端 = mock（未设置 VITE_DATA_BACKEND），验证：
 * - 面板渲染且后端标识为"内存演示版"；
 * - mock 后端不出现演示数据灌入/清除按钮（播种只服务本地文件夹后端）；
 * - 既有竖切片主体（Deck / Canvas / 推荐区）不受接线影响。
 *
 * local 后端的完整 UI 链路（连接失败呈现 / 播种后刷新）属浏览器 QA 阶段
 * （browser-use），播种/清除逻辑已由 runtimeBackend.test.ts 在真实服务器上
 * 行为级验证。
 */
import { describe, expect, it } from "vitest";
import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "../app/App";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderApp(): Promise<{ container: HTMLElement; cleanup: () => void }> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root | undefined;
  await act(async () => {
    root = createRoot(container);
    root.render(createElement(App));
  });
  return {
    container,
    cleanup: () => {
      act(() => root?.unmount());
      container.remove();
    },
  };
}

describe("数据来源面板（R4a-2，默认 mock 后端）", () => {
  it("面板渲染，后端标识为内存演示版；不出现演示数据按钮", async () => {
    const { container, cleanup } = await renderApp();

    const label = container.querySelector('[data-testid="data-backend-label"]');
    expect(label).not.toBeNull();
    expect(label!.textContent).toContain("内存演示版");

    expect(container.querySelector('[data-testid="seed-demo-button"]')).toBeNull();
    expect(container.querySelector('[data-testid="clear-demo-button"]')).toBeNull();
    expect(container.querySelector('[data-testid="data-boot-error"]')).toBeNull();

    cleanup();
  });

  it("接线不影响竖切片主体：Deck 与 Canvas 正常渲染", async () => {
    const { container, cleanup } = await renderApp();

    expect(container.querySelector('[aria-label="deck"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="canvas"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid^="canvas-unit-"]').length).toBeGreaterThan(0);

    cleanup();
  });
});
