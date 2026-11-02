// @vitest-environment happy-dom
/**
 * D-142 split re-confirm 回归（2026-10-07 identity 修复的关键验证）：
 * 同一 Recommendation 两次确认（第二次经 D-142 re-offer）——
 * UI 省略 children[].id → 两次 execution 均成功、生成 ID 不同、互不覆盖。
 * 同时证明 placeholder 未进入 children[].id（否则第二次会被 H-2 拒绝）。
 */
import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../app/App";
import { UIProviders } from "../app/providers/UIProviders";
import { recommendationStore } from "../stores/recommendationStore";
import { canvasStore } from "../stores/canvasStore";
import { resetCanvasBootstrapForTests } from "../app/canvasBootstrap";
import { dataService } from "../services/MockDataService";
import type { Recommendation } from "../domain/recommendation/types";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PARENT_WORKLOAD = "workload-neurosurgery-outpatient";
const PARENT_RESULT = "workload-result-neurosurgery-outpatient";
const TARGET_UNIT = "unit-neurosurgery-ward-1";
const SUFFIX = "rc1"; // 本文件专属后缀（MockDataService 跨文件共享也隔离）

function makeSplitRecommendation(): Recommendation {
  return {
    id: `rec-resolution-${PARENT_WORKLOAD}-${TARGET_UNIT}-${SUFFIX}`,
    kind: "resolution",
    payload: {
      type: "split_workload",
      reason: "父级 Workload 可拆分到 3 个子单元",
      splitPlan: {
        parentResultId: PARENT_RESULT,
        children: [
          { workloadResultId: `new-${PARENT_RESULT}-unit-wang-xx-${SUFFIX}` },
          { workloadResultId: `new-${PARENT_RESULT}-unit-li-xx-${SUFFIX}` },
          { workloadResultId: `new-${PARENT_RESULT}-unit-nursing-team-${SUFFIX}` },
        ],
      },
    },
    reason: "父级 Workload 可拆分到 3 个子单元",
    status: "recommended",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    relatedEntityIds: [PARENT_WORKLOAD, TARGET_UNIT],
  };
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function renderApp(): Promise<{ container: HTMLElement; cleanup: () => void }> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root | undefined;
  await act(async () => {
    root = createRoot(container);
    root.render(createElement(UIProviders, null, createElement(App)));
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
  // Debug: check if recommendation list exists
  const recList = container.querySelector('[data-testid="recommendation-list"]');
  console.log("Recommendation list found:", !!recList);
  const recItems = container.querySelectorAll('[data-testid^="recommendation-item-"]');
  console.log("Recommendation items found:", recItems.length);
  return {
    container,
    cleanup: () => {
      act(() => root?.unmount());
      container.remove();
    },
  };
}

async function confirmOnce(ui: { container: HTMLElement }, recId: string) {
  await act(async () => {
    (ui.container.querySelector(`[data-testid="recommendation-item-${recId}"]`) as HTMLElement).click();
  });
  const panel = ui.container.querySelector('[data-testid="split-parameters-panel"]');
  if (!panel) throw new Error("split panel not rendered");
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      setNativeInputValue(
        ui.container.querySelector(`[data-testid="split-child-value-${i}"]`) as HTMLInputElement,
        "400"
      );
      setNativeInputValue(
        ui.container.querySelector(`[data-testid="split-child-rs-${i}"]`) as HTMLInputElement,
        `rs-reconfirm-${SUFFIX}`
      );
      setNativeInputValue(
        ui.container.querySelector(`[data-testid="split-child-ri-${i}"]`) as HTMLInputElement,
        `ri-reconfirm-${SUFFIX}-${i}`
      );
    });
  }
  await act(async () => {
    (ui.container.querySelector('[data-testid="confirm-button"]') as HTMLElement).click();
  });
}

/** 本文件执行的 child Results（按 parent + 生成前缀识别） */
async function childResultsOfThisPair(): Promise<Array<{ id: string }>> {
  const results = await dataService.getWorkloadResults();
  return results.filter(
    (r: { id: string }) =>
      r.id.startsWith(`${PARENT_RESULT}-split-child-`) &&
      // 本文件两次 execution 的 rs 均为 rs-reconfirm（生成 ID 内含其编码）
      r.id.includes("rs-reconfirm")
  );
}

describe("D-142 split re-confirm：UI 省略 child id → 两次 execution 独立生成、互不覆盖", () => {
  let ui: { container: HTMLElement; cleanup: () => void } | undefined;
  let rec: Recommendation;

  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.setState({ cards: [], focusCardId: undefined });
    resetCanvasBootstrapForTests();
    rec = makeSplitRecommendation();
    recommendationStore.getState().addRecommendation(rec);
  });

  afterEach(() => {
    ui?.cleanup();
    ui = undefined;
  });

  it("同一推荐两次确认：均 accepted、生成 ID 为 D-148 锚点型且两次不同、第一次事实不被覆盖", async () => {
    ui = await renderApp();

    // ── 第一次确认 ──
    await confirmOnce(ui, rec.id);
    const firstRec = recommendationStore.getState().getRecommendationById(rec.id)!;
    expect(firstRec.status).toBe("accepted");
    const firstResults = await childResultsOfThisPair();
    expect(firstResults).toHaveLength(3);
    const firstIds = firstResults.map((r) => r.id).sort();
    // E：实际生成 ID 来自 D-148（parent + executionBatchId 编码 + 统计锚点编码），而非 placeholder
    for (const id of firstIds) {
      expect(id.startsWith(`${PARENT_RESULT}-split-child-`)).toBe(true);
      expect(id.startsWith(`new-${PARENT_RESULT}-`)).toBe(false);
    }

    // ── D-142 re-offer：同 ID upsert 回 recommended ──
    recommendationStore.getState().addRecommendation({ ...rec, status: "recommended" });
    expect(recommendationStore.getState().getRecommendationsByKind("resolution")).toHaveLength(1);
    // 真实场景中两次用户决策发生在不同时刻——execution identity = recId::decidedAt，
    // 同毫秒的两次确认按 D-145 规则 1 属同一 execution（幂等复用是正确行为）。
    // 此处推进时间以模拟真正的新决策。
    await new Promise((resolve) => setTimeout(resolve, 10));
    await act(async () => {});

    // ── 第二次确认（placeholder 与第一次相同——若 UI 携带 placeholder id 会被 H-2 拒绝）──
    await confirmOnce(ui, rec.id);
    const secondRec = recommendationStore.getState().getRecommendationById(rec.id)!;
    expect(secondRec.status).toBe("accepted");

    const secondResults = await childResultsOfThisPair();
    expect(secondResults).toHaveLength(6); // 两次 execution 各 3 个，无覆盖
    const secondIds = secondResults.map((r) => r.id).sort();
    // 两次 execution 共 6 个 child Result：第二次新造 3 个 + 第一次的 3 个仍存在
    expect(secondIds).toHaveLength(6);
    expect(new Set(secondIds).size).toBe(6); // 无重复
    // 第一次的每个 Result 仍然存在（未被第二次 upsert 覆盖）
    for (const id of firstIds) {
      expect(secondIds).toContain(id);
    }
    // 第二次新造的 3 个 identity 与第一次完全不同（批次段不同 → ID 不同）
    const newIdsOfSecond = secondIds.filter((id) => !firstIds.includes(id));
    expect(newIdsOfSecond).toHaveLength(3);
    // 若 UI 曾把 placeholder 写进 children[].id，第二次会复用第一次的 ID（H-2 拒绝）或仅 3 条——此处 6 条即证明省略路径生效
    for (const id of newIdsOfSecond) {
      expect(firstIds).not.toContain(id);
      expect(id.startsWith(`${PARENT_RESULT}-split-child-`)).toBe(true); // D-148 锚点型
    }

    // WorkloadSplit 同理：两次 execution 的分解记录互不覆盖（D-148 批次隔离）
    const splits = await dataService.getWorkloadSplits();
    const pairSplits = splits.filter((sp: { childResultId: string }) =>
      secondIds.includes(sp.childResultId)
    );
    expect(pairSplits).toHaveLength(6);
    const splitIds = new Set(pairSplits.map((sp: { id: string }) => sp.id));
    expect(splitIds.size).toBe(6);
  });
});
