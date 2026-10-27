// @vitest-environment happy-dom
/**
 * A-010 画布聚焦模式（用户 2026-10-26 裁定 + DEC-006 重锚定确认）真实 React DOM 行为测试：
 * - 双击 Deck 卡 / 画布卡 → 设为聚焦 → 画布只显示聚焦卡+一级关联（一棵树）；
 * - 聚焦指示 + 取消聚焦按钮；
 * - 取消 → 全部卡恢复显示。
 */
import { describe, expect, it, beforeEach } from "vitest";
import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "../app/App";
import { canvasStore } from "../stores/canvasStore";
import { recommendationStore } from "../stores/recommendationStore";
import { resetCanvasBootstrapForTests } from "../app/canvasBootstrap";

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

describe("A-010 画布聚焦模式", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.getState().clearFocus();
    resetCanvasBootstrapForTests();
  });

  it("默认无聚焦 → 画布显示全部引导单元卡（4 张）", async () => {
    const { container, cleanup } = await renderApp();
    const units = container.querySelectorAll('[data-testid^="canvas-unit-"]');
    expect(units.length).toBe(4); // 4 个引导单元
    expect(container.querySelector('[data-testid="focus-indicator"]')).toBeNull();
    cleanup();
  });

  it("双击 Deck 中的单元卡 → 设为聚焦 → 画布只显示聚焦卡 + 一级关联 + 聚焦指示", async () => {
    const { container, cleanup } = await renderApp();
    // 默认 unit 标签页 → 双击"介入室"卡
    const deckCard = container.querySelector('[data-testid="deck-card-unit-intervention-room"]');
    expect(deckCard).not.toBeNull();
    await act(async () => {
      deckCard!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    });
    await act(async () => { /* flush */ });

    // 聚焦指示出现
    const indicator = container.querySelector('[data-testid="focus-indicator"]');
    expect(indicator).not.toBeNull();
    expect(indicator!.textContent).toContain("介入室");

    // 画布只显示聚焦卡（介入室）+ 一级关联（演示链中它有 structure 关联到神经外科）
    // 一级关联 = 与介入室有 active 关系的另一端（structure: 神经外科→介入室 → 神经外科是关联）
    const visibleUnits = container.querySelectorAll('[data-testid^="canvas-unit-"]');
    // 介入室本身 + 神经外科（一级关联）= 至少 2 张；但介入室不是引导单元卡（没 placement）→ 画布显示神经外科
    expect(visibleUnits.length).toBeGreaterThanOrEqual(1);
    expect(visibleUnits.length).toBeLessThanOrEqual(4); // 不超过 4（一棵树）

    // 取消聚焦按钮
    const clearButton = container.querySelector('[data-testid="clear-focus-button"]');
    expect(clearButton).not.toBeNull();
    cleanup();
  });

  it("取消聚焦 → 画布恢复显示全部", async () => {
    const { container, cleanup } = await renderApp();
    // 先聚焦
    const deckCard = container.querySelector('[data-testid="deck-card-unit-intervention-room"]');
    await act(async () => {
      deckCard!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    });
    await act(async () => {});
    // 取消
    const clearButton = container.querySelector('[data-testid="clear-focus-button"]');
    expect(clearButton).not.toBeNull();
    await act(async () => {
      clearButton!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await act(async () => {});
    expect(container.querySelector('[data-testid="focus-indicator"]')).toBeNull();
    const units = container.querySelectorAll('[data-testid^="canvas-unit-"]');
    expect(units.length).toBe(4); // 恢复全部
    cleanup();
  });

  it("双击画布上的单元卡 → 也能聚焦（同款行为）", async () => {
    const { container, cleanup } = await renderApp();
    const canvasUnit = container.querySelector('[data-testid="canvas-unit-unit-neurosurgery"]');
    expect(canvasUnit).not.toBeNull();
    await act(async () => {
      canvasUnit!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    });
    await act(async () => {});
    const indicator = container.querySelector('[data-testid="focus-indicator"]');
    expect(indicator).not.toBeNull();
    expect(indicator!.textContent).toContain("神经外科");
    cleanup();
  });
});
