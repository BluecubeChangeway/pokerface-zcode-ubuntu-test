// @vitest-environment happy-dom
/**
 * U-UI-10 画布卡片拖动重定位（最小版，2026-10-23）真实 React DOM 行为测试：
 * - 整卡拖动 → 画布 drop → placement 更新（纯 UI 状态，D-010；同 cardId upsert 幂等）；
 * - 槽内芯片发起的拖动（dragstart 冒泡到所属单元卡）不被误判为画布移动
 *   （芯片自身的业务 payload 不被覆盖）。
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

function placementOf(cardId: string): { x: number; y: number } | undefined {
  const placement = canvasStore
    .getState()
    .cards.find((entry) => entry.cardId === cardId);
  return placement ? { x: placement.x, y: placement.y } : undefined;
}

/** happy-dom 的 DragEvent 构造器不支持 dataTransfer/坐标 init——手工挂载（真实浏览器无此问题） */
function dragEventWithPayload(
  type: "dragstart" | "drop",
  dt: DataTransfer,
  coordinates?: { clientX: number; clientY: number }
): DragEvent {
  const event = new DragEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dt });
  if (coordinates) {
    Object.defineProperty(event, "clientX", { value: coordinates.clientX });
    Object.defineProperty(event, "clientY", { value: coordinates.clientY });
  }
  return event;
}

describe("U-UI-10 画布卡片拖动重定位（最小版）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    resetCanvasBootstrapForTests();
  });

  it("拖动单元卡到画布坐标 → placement 更新（同 cardId upsert，不产生第二条）", async () => {
    const { container, cleanup } = await renderApp();
    const unitCard = container.querySelector('[data-testid="canvas-unit-unit-neurosurgery"]');
    const canvasRoot = container.querySelector('[data-testid="canvas-root"]');
    expect(unitCard).not.toBeNull();
    expect(canvasRoot).not.toBeNull();
    const before = placementOf("unit-neurosurgery")!;
    const countBefore = canvasStore.getState().cards.length;

    await act(async () => {
      const dt = new DataTransfer();
      dt.setData("text/canvas-move-card-id", "unit-neurosurgery");
      unitCard!.dispatchEvent(dragEventWithPayload("dragstart", dt));
      canvasRoot!.dispatchEvent(
        dragEventWithPayload("drop", dt, { clientX: 300, clientY: 200 })
      );
    });

    const after = placementOf("unit-neurosurgery")!;
    expect(after).toBeDefined();
    expect(after.x).not.toBe(before.x);
    expect(after.y).not.toBe(before.y);
    // happy-dom 的 getBoundingClientRect 全零 → 不夹取，placement = drop 坐标原样
    expect(after).toEqual({ x: 300, y: 200 });
    // 同 cardId upsert：placement 总数不变
    expect(canvasStore.getState().cards.length).toBe(countBefore);

    cleanup();
  });

  it("槽内芯片 dragstart 冒泡到单元卡时不被误判为画布移动（业务 payload 不被覆盖）", async () => {
    const { container, cleanup } = await renderApp();
    // 演示链自带 assign：unit-neurosurgery → workload-neurosurgery-outpatient → 芯片存在
    const chip = container.querySelector(
      '[data-testid="slot-chip-unit-neurosurgery-workload-neurosurgery-outpatient"]'
    );
    expect(chip).not.toBeNull();

    await act(async () => {
      const dt = new DataTransfer();
      // 芯片自身的 onDragStart 在事件目标上执行（真实链路：目标=芯片）
      chip!.dispatchEvent(dragEventWithPayload("dragstart", dt));
      // 冒泡期间单元卡的 onDragStart 守卫跳过 → 不写 canvas-move payload
      expect(dt.getData("text/canvas-move-card-id")).toBe("");
      // 芯片业务 payload 完整保留（来源标记在，画布移动标记不在）
      expect(dt.getData("text/workload-card-id")).toBe("workload-neurosurgery-outpatient");
      expect(dt.getData("text/workload-card-origin-unit-id")).toBe("unit-neurosurgery");
    });

    cleanup();
  });
});
