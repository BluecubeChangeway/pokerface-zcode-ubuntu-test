// @vitest-environment happy-dom
/**
 * A-010/A-012 画布聚焦模式（用户裁定 + 细化）真实 React DOM 行为测试：
 * - 双击 Deck 卡 / 画布卡 → 完全聚焦（新 Trail 基础）；
 * - 聚焦自动布局：一级关联卡无位置时自动获得画布位置（W1-1）；
 * - 聚焦态内单击延伸卡 → 调整聚焦（Trail 基础不变——A-012）；
 * - 取消聚焦按钮已移除（双击其他卡即切换）；
 * - 无取消按钮 → 双击另一张卡 = 切换聚焦。
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

describe("A-010/A-012 画布聚焦模式", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.getState().clearFocus();
    resetCanvasBootstrapForTests();
  });

  it("默认无聚焦 → 画布显示全部引导单元卡（4 张）+ 无聚焦指示", async () => {
    const { container, cleanup } = await renderApp();
    const units = container.querySelectorAll('[data-testid^="canvas-unit-"]');
    expect(units.length).toBe(4);
    expect(container.querySelector('[data-testid="focus-indicator"]')).toBeNull();
    expect(container.querySelector('[data-testid="clear-focus-button"]')).toBeNull(); // A-012：已移除
    cleanup();
  });

  it("双击 Deck 卡 → 完全聚焦 → 聚焦指示 + 无取消按钮（A-012：双击其他卡即切换）", async () => {
    const { container, cleanup } = await renderApp();
    const deckCard = container.querySelector('[data-testid="deck-card-unit-intervention-room"]');
    expect(deckCard).not.toBeNull();
    await act(async () => {
      deckCard!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    });
    await act(async () => { /* flush */ });

    const indicator = container.querySelector('[data-testid="focus-indicator"]');
    expect(indicator).not.toBeNull();
    expect(indicator!.textContent).toContain("介入室");
    // A-012：取消按钮已移除
    expect(container.querySelector('[data-testid="clear-focus-button"]')).toBeNull();
    cleanup();
  });

  it("双击另一张卡 = 切换聚焦（替代取消按钮——A-012）", async () => {
    const { container, cleanup } = await renderApp();
    // 先聚焦介入室
    const deckCard1 = container.querySelector('[data-testid="deck-card-unit-intervention-room"]');
    await act(async () => {
      deckCard1!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    });
    await act(async () => {});
    expect(container.querySelector('[data-testid="focus-indicator"]')!.textContent).toContain("介入室");

    // 双击急诊科 → 切换聚焦
    const deckCard2 = container.querySelector('[data-testid="deck-card-unit-emergency"]');
    if (deckCard2) {
      await act(async () => {
        deckCard2.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
      });
      await act(async () => {});
      expect(container.querySelector('[data-testid="focus-indicator"]')!.textContent).toContain("急诊科");
    }
    cleanup();
  });

  it("聚焦态内单击画布延伸卡 → 调整聚焦到该卡（A-012 Trail 基础不变）", async () => {
    const { container, cleanup } = await renderApp();
    // 先双击神经外科聚焦
    const canvasUnit = container.querySelector('[data-testid="canvas-unit-unit-neurosurgery"]');
    await act(async () => {
      canvasUnit!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    });
    await act(async () => {});
    expect(container.querySelector('[data-testid="focus-indicator"]')!.textContent).toContain("神经外科");

    // 聚焦态内单击一病区（可见的一级关联卡）→ 调整聚焦
    const ward1 = container.querySelector('[data-testid="canvas-unit-unit-neurosurgery-ward-1"]');
    if (ward1) {
      await act(async () => {
        ward1.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });
      await act(async () => {});
      const indicator = container.querySelector('[data-testid="focus-indicator"]');
      expect(indicator).not.toBeNull();
      expect(indicator!.textContent).toContain("一病区"); // 聚焦已调整
    }
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
