// @vitest-environment happy-dom
/**
 * 撤回入口 UI 真实 React DOM 行为测试（D-153 / D-158 接线）
 *
 * 测试方式（沿 recommendationUi.dom.test.ts 既有 harness 模式）：
 * - happy-dom + createRoot + React.act 渲染真实 <App />
 * - vi.mock 撤回入口层（独立文件 = 全新 ESM 模块注册表，bypass 先例），
 *   spy 证明 App 的确认/取消/层撤回分别调用正确入口、预览阶段不执行撤回。
 * 预览只读性/一致性由 revocationEntry.test.ts 以真实服务证明（本文件只验证 UI 接线）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Relation } from "../domain/relation/types";
import type { WorkloadSplit } from "../domain/workload/types";
import type { CalculationResult } from "../domain/score/types";
import type { WorkloadCard } from "../domain/card/types";
import type { WorkloadResult } from "../domain/workload/types";
import type { WorkloadRevocationImpact } from "../domain/workload/revocation/revocationService";
import { recommendationStore } from "../stores/recommendationStore";
import { canvasStore } from "../stores/canvasStore";
import { resetCanvasBootstrapForTests } from "../app/canvasBootstrap";

const spies = vi.hoisted(() => ({
  previewFullPathRevocation: vi.fn(),
  revokeDerivedPathAsPreviewed: vi.fn(),
  revokeSplitLayer: vi.fn(),
}));

vi.mock("../services/revocationEntry", () => ({
  previewFullPathRevocation: spies.previewFullPathRevocation,
  revokeDerivedPathAsPreviewed: spies.revokeDerivedPathAsPreviewed,
  revokeSplitLayer: spies.revokeSplitLayer,
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeCard(id: string): WorkloadCard {
  return { id, type: "workload", name: `卡-${id}`, configurationState: "configured" };
}
function makeResult(id: string): WorkloadResult {
  return { id, resultSetId: "rs-x", resultItemId: id, name: id, value: 1, dimensions: {} };
}
function makeImpact(): WorkloadRevocationImpact {
  const relation: Relation = {
    id: "rel-x", type: "workload_assign", sourceId: "unit-x", targetId: "wl-x", active: false,
  };
  const split: WorkloadSplit = {
    id: "sp-x", parentResultId: "wr-p", childResultId: "wr-c", splitType: "partial",
  };
  const calc: CalculationResult = {
    id: "calc-x", adjustmentTableId: "adj-x",
    period: { start: "2026-01-01", end: "2026-12-31" },
    scoreResults: [], adjustmentSnapshot: [],
  };
  return {
    revokedCards: [],
    revokedWorkloadResults: [],
    deactivatedRelations: [relation],
    revokedWorkloadSplits: [split],
    revokedCalculationResults: [calc],
    retained: [],
    deletedCards: [makeCard("wl-a"), makeCard("wl-b")],
    deletedWorkloadResults: [makeResult("wr-a"), makeResult("wr-b")],
    manualReview: { cards: [makeCard("wl-m")], results: [makeResult("wr-m")] },
  };
}

async function renderApp(): Promise<{ container: HTMLElement; cleanup: () => void }> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root | undefined;
  await act(async () => {
    root = createRoot(container);
    root.render(createElement((await import("../app/App")).App));
  });
  // Switch to calculation view since tests expect CalculationView
  await act(async () => {
    const tabs = container.querySelectorAll('button[role="tab"]');
    console.log("Tabs found:", tabs.length);
    for (const tab of tabs) {
      console.log("Tab text:", tab.textContent);
      if (tab.textContent?.includes("绩效测算")) {
        (tab as HTMLElement).click();
        break;
      }
    }
  });
  // Wait for animation and rendering to complete
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });
  return {
    container,
    cleanup: () => {
      act(() => root?.unmount());
      container.remove();
    },
  };
}

/** happy-dom 受控 <select> 需原生 value setter + change 事件（同 controlled-input 先例） */
async function selectTarget(ui: { container: HTMLElement }, cardId: string) {
  const select = ui.container.querySelector(
    '[data-testid="revocation-target-select"]'
  ) as HTMLSelectElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(select, cardId);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function click(ui: { container: HTMLElement }, testId: string) {
  const el = ui.container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
  expect(el, `missing ${testId}`).not.toBeNull();
  await act(async () => {
    el.click();
  });
}

describe("撤回入口 UI 真实 DOM 行为（预览 / 取消 / 确认 / 层撤回 / 失败通道）", () => {
  let ui: { container: HTMLElement; cleanup: () => void } | undefined;
  const TARGET = "workload-neurosurgery-outpatient";
  let fakeImpact: WorkloadRevocationImpact;

  beforeEach(async () => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.setState({ cards: [], focusCardId: undefined });
    resetCanvasBootstrapForTests();
    fakeImpact = makeImpact();
    spies.previewFullPathRevocation.mockReset().mockResolvedValue(fakeImpact);
    spies.revokeDerivedPathAsPreviewed.mockReset().mockResolvedValue(fakeImpact);
    spies.revokeSplitLayer.mockReset().mockResolvedValue(fakeImpact);
    ui = await renderApp();
  });

  afterEach(() => {
    ui?.cleanup();
    ui = undefined;
  });

  it("A：全路径预览 → 入口被正确调用，影响摘要与对象清单渲染（名称+ID），未执行撤回", async () => {
    await selectTarget(ui!, TARGET);
    await click(ui!, "preview-fullpath-button");

    expect(spies.previewFullPathRevocation).toHaveBeenCalledTimes(1);
    expect(spies.previewFullPathRevocation.mock.calls[0][1]).toBe(TARGET);
    expect(spies.previewFullPathRevocation.mock.calls[0][0]).toBeDefined();
    // 未执行任何撤回
    expect(spies.revokeDerivedPathAsPreviewed).not.toHaveBeenCalled();
    expect(spies.revokeSplitLayer).not.toHaveBeenCalled();
    // 影响摘要与对象清单渲染（不能只显示数量，必须含对象身份）
    const panel = ui!.container.querySelector('[data-testid="fullpath-preview"]');
    expect(panel).not.toBeNull();
    expect(panel!.querySelector('[data-testid="preview-deleted-cards"]')!.textContent).toContain("2");
    expect(panel!.querySelector('[data-testid="preview-deleted-cards-list"]')!.textContent).toContain("wl-a");
    expect(panel!.querySelector('[data-testid="preview-deleted-cards-list"]')!.textContent).toContain("wl-b");
    expect(panel!.querySelector('[data-testid="preview-deleted-results-list"]')!.textContent).toContain("wr-a");
    expect(panel!.querySelector('[data-testid="preview-calc-list"]')!.textContent).toContain("calc-x");
    expect(panel!.querySelector('[data-testid="preview-relations-list"]')!.textContent).toContain("rel-x");
    const manualReview = panel!.querySelector('[data-testid="preview-manual-review-list"]')!;
    expect(manualReview.textContent).toContain("wl-m");
    expect(manualReview.textContent).toContain("不自动删除");
  });

  it("B：取消确认 → 不执行撤回、面板清除", async () => {
    await selectTarget(ui!, TARGET);
    await click(ui!, "preview-fullpath-button");
    await click(ui!, "cancel-fullpath-preview");

    expect(spies.revokeDerivedPathAsPreviewed).not.toHaveBeenCalled();
    expect(ui!.container.querySelector('[data-testid="fullpath-preview"]')).toBeNull();
  });

  it("C：确认后 → 带预览影响集调用守卫入口一次，执行结果摘要含 manualReview 透传", async () => {
    await selectTarget(ui!, TARGET);
    await click(ui!, "preview-fullpath-button");
    await click(ui!, "confirm-fullpath-revoke");

    expect(spies.revokeDerivedPathAsPreviewed).toHaveBeenCalledTimes(1);
    expect(spies.revokeDerivedPathAsPreviewed.mock.calls[0][1]).toBe(TARGET);
    // 第三参 = 用户确认的预览影响集（同一实例）
    expect(spies.revokeDerivedPathAsPreviewed.mock.calls[0][2]).toBe(fakeImpact);
    expect(spies.previewFullPathRevocation).toHaveBeenCalledTimes(1); // 预览仍只有一次
    const result = ui!.container.querySelector('[data-testid="revocation-result"]');
    expect(result).not.toBeNull();
    expect(result!.textContent).toContain("删除 2 张派生卡");
    expect(result!.textContent).toContain("来源不明待人工 1 项");
    // 执行后面板清除
    expect(ui!.container.querySelector('[data-testid="fullpath-preview"]')).toBeNull();
  });

  it("D：层撤回独立入口 → 调用层撤回入口一次，不触碰全路径入口", async () => {
    await selectTarget(ui!, TARGET);
    await click(ui!, "revoke-layer-button");

    expect(spies.revokeSplitLayer).toHaveBeenCalledTimes(1);
    expect(spies.revokeSplitLayer.mock.calls[0][1]).toBe(TARGET);
    expect(spies.previewFullPathRevocation).not.toHaveBeenCalled();
    expect(spies.revokeDerivedPathAsPreviewed).not.toHaveBeenCalled();
    const result = ui!.container.querySelector('[data-testid="revocation-result"]');
    expect(result).not.toBeNull();
    expect(result!.textContent).toContain("层撤回完成");
  });

  it("E：预览失败 → 经既有 actionError 通道呈现，不显示预览面板", async () => {
    spies.previewFullPathRevocation.mockRejectedValueOnce(new Error("预览失败：入口卡不存在"));
    await selectTarget(ui!, TARGET);
    await click(ui!, "preview-fullpath-button");

    const error = ui!.container.querySelector('[data-testid="action-error"]');
    expect(error).not.toBeNull();
    expect(error!.textContent).toContain("预览失败：入口卡不存在");
    expect(ui!.container.querySelector('[data-testid="fullpath-preview"]')).toBeNull();
    expect(spies.revokeDerivedPathAsPreviewed).not.toHaveBeenCalled();
  });

  it("F：确认范围不一致 → 守卫入口抛错经 actionError 呈现、预览面板保留供重新预览", async () => {
    spies.revokeDerivedPathAsPreviewed.mockRejectedValueOnce(
      new Error("确认范围校验失败：影响范围与预览不一致（差异字段：deletedCards）。已中止，未提交任何撤回写入；请重新预览后再确认。")
    );
    await selectTarget(ui!, TARGET);
    await click(ui!, "preview-fullpath-button");
    await click(ui!, "confirm-fullpath-revoke");

    const error = ui!.container.querySelector('[data-testid="action-error"]');
    expect(error).not.toBeNull();
    expect(error!.textContent).toContain("确认范围校验失败");
    expect(error!.textContent).toContain("重新预览");
    // 面板保留：用户可重新预览刷新
    expect(ui!.container.querySelector('[data-testid="fullpath-preview"]')).not.toBeNull();
  });
});
