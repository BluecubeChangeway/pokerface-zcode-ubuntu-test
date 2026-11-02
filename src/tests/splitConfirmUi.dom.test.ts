// @vitest-environment happy-dom
/**
 * confirm_split 参数确认 UI（Q-09-C Recommendation 操作流第一刀）：
 * 真实 React DOM 测试 A–E。splitPlan 只是建议初始值；正式参数由用户确认后构造。
 */
import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../app/App";
import { UIProviders } from "../app/providers/UIProviders";
import { recommendationStore } from "../stores/recommendationStore";
import { canvasStore } from "../stores/canvasStore";
import { resetCanvasBootstrapForTests } from "../app/canvasBootstrap";
import { dataService } from "../services/MockDataService";
import {
  buildSplitParameters,
  draftFromRecommendation,
  isSplitDraftComplete,
} from "../app/splitConfirmPanel";
import type { Recommendation } from "../domain/recommendation/types";
import type { ActionExecutorContext } from "../services/actionExecutor";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PARENT_WORKLOAD = "workload-neurosurgery-outpatient";
const PARENT_RESULT = "workload-result-neurosurgery-outpatient";
const TARGET_UNIT = "unit-neurosurgery-ward-1";

/**
 * 构造一条真实的 split_workload 推荐（与 Engine ancestor 分支产出的 payload 形状一致）。
 * suffix 使每个测试的显式 child ID 唯一——dataService 在测试文件内跨用例持久化，
 * 已 accepted 的 child ID 属于其他 execution，H-2 会（正确地）拒绝跨 execution 复用。
 */
function makeSplitRecommendation(suffix: string): Recommendation {
  const recId = `rec-resolution-${PARENT_WORKLOAD}-${TARGET_UNIT}-${suffix}`;
  return {
    id: recId,
    kind: "resolution",
    payload: {
      type: "split_workload",
      reason: `父级 Workload 可拆分到 3 个子单元`,
      splitPlan: {
        parentResultId: PARENT_RESULT,
        children: [
          { workloadResultId: `new-${PARENT_RESULT}-unit-wang-xx-${suffix}` },
          { workloadResultId: `new-${PARENT_RESULT}-unit-li-xx-${suffix}` },
          { workloadResultId: `new-${PARENT_RESULT}-unit-nursing-team-${suffix}` },
        ],
      },
    },
    reason: `父级 Workload 可拆分到 3 个子单元`,
    status: "recommended",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    relatedEntityIds: [PARENT_WORKLOAD, TARGET_UNIT],
  };
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

async function selectRec(container: HTMLElement, recId: string) {
  await act(async () => {
    // First, click the recommendation item
    for (let i = 0; i < 50; i++) {
      const elements = container.querySelectorAll('[data-testid^="recommendation-item-"]');
      for (const element of elements) {
        const testId = element.getAttribute('data-testid');
        if (testId === 'recommendation-item-' + recId) {
          console.log("Found matching element, clicking...");
          (element as HTMLElement).click();
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });
  // Wait for the split parameters panel to appear (splitDraft to be set)
  await act(async () => {
    for (let i = 0; i < 50; i++) {
      const panel = container.querySelector('[data-testid="split-parameters-panel"]');
      if (panel) {
        console.log("Split parameters panel found");
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Split parameters panel not found after waiting');
  });
};

/** React 受控输入需要原生 value setter 绕过 React 的 value tracker（happy-dom 实测必要） */
function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/** 用页面上编辑好的字段填写草稿（value/rs/ri 为 decision 合约必填） */
async function fillChildInputs(
  ui: { container: HTMLElement },
  index: number,
  values: { value: number; rs: string; ri: string }
) {
  await act(async () => {
    setNativeInputValue(
      ui.container.querySelector(`[data-testid="split-child-value-${index}"]`) as HTMLInputElement,
      String(values.value)
    );
    setNativeInputValue(
      ui.container.querySelector(`[data-testid="split-child-rs-${index}"]`) as HTMLInputElement,
      values.rs
    );
    setNativeInputValue(
      ui.container.querySelector(`[data-testid="split-child-ri-${index}"]`) as HTMLInputElement,
      values.ri
    );
  });
}

function buildContextForStore(): Promise<ActionExecutorContext> {
  return (async () => {
    const [relations, cards, results, splits] = await Promise.all([
      dataService.getRelations(),
      dataService.getCards(),
      dataService.getWorkloadResults(),
      dataService.getWorkloadSplits(),
    ]);
    return {
      existingRelations: [...relations],
      existingCards: new Map(
        cards.map((c: any) => [c.id, { id: c.id, type: c.type, name: c.name, workloadResultId: (c as any).workloadResultId }])
      ),
      workloadCard: { id: PARENT_WORKLOAD, type: "workload", name: "神经外科门诊人次", workloadResultId: PARENT_RESULT },
      existingWorkloadResults: new Map(results.map((r: any) => [r.id, r])),
      existingWorkloadSplits: new Map(splits.map((sp: any) => [sp.id, sp])),
      recommendations: new Map(recommendationStore.getState().recommendations.map((r) => [r.id, r])),
      endpointKinds: new Map(cards.map((c: any) => [c.id, c.type])),
      dataService,
    } as ActionExecutorContext;
  })();
}

describe("confirm_split 参数确认 UI（A–E）", () => {
  let ui: { container: HTMLElement; cleanup: () => void } | undefined;
  let rec: Recommendation;
  let currentTestSuffix = "t0";

  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.setState({ cards: [], focusCardId: undefined });
    resetCanvasBootstrapForTests();
    rec = makeSplitRecommendation(currentTestSuffix);
    recommendationStore.getState().addRecommendation(rec);
  });

  afterEach(() => {
    ui?.cleanup();
    ui = undefined;
  });

  it("A：split 推荐显示参数区域，初始值来自 splitPlan（3 个目标子单元、value 为空）", async () => {
    currentTestSuffix = "a1";
    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    const panel = ui.container.querySelector('[data-testid="split-parameters-panel"]');
    expect(panel).not.toBeNull();
    expect(panel!.querySelector('[data-testid="split-parent-result"]')!.textContent).toContain(
      PARENT_RESULT
    );
    expect(ui.container.querySelectorAll('[data-testid^="split-child-"]').length).toBeGreaterThan(0);
    // 初始值来自 splitPlan：value 为空（建议不含默认值），目标子单元只读展示
    const value0 = ui.container.querySelector('[data-testid="split-child-value-0"]') as HTMLInputElement;
    expect(value0.value).toBe("");
    const firstChild = ui.container.querySelector('[data-testid="split-child-0"]')!;
    expect(firstChild.textContent).toContain("unit-wang-xx");
  });

  it("B：填写参数 → 点击确认拆分 → accepted + 真实 Split Fact 持久化（Result/Split/Relation/Card）", async () => {
    currentTestSuffix = "b1";
    const resultsBefore = (await dataService.getWorkloadResults()).length;
    const splitsBefore = (await dataService.getWorkloadSplits()).length;
    const relationsBefore = (await dataService.getRelations()).length;
    const cardsBefore = (await dataService.getCards()).length;

    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    // 用户填写三个 child 的正式参数（value/rs/ri）
    await fillChildInputs(ui!, 0, { value: 400, rs: "rs-split-ui", ri: "ri-split-ui-0" });
    await fillChildInputs(ui!, 1, { value: 400, rs: "rs-split-ui", ri: "ri-split-ui-1" });
    await fillChildInputs(ui!, 2, { value: 460, rs: "rs-split-ui", ri: "ri-split-ui-2" });

    await act(async () => {
      (ui!.container.querySelector('[data-testid="confirm-button"]') as HTMLElement).click();
    });

    const stored = recommendationStore.getState().getRecommendationById(rec.id)!;
    expect(stored.status).toBe("accepted");
    // UI 状态展示
    expect(ui.container.querySelector(`[data-testid="recommendation-item-${rec.id}"]`)!.textContent).toContain(
      "已接受"
    );
    // 真实 Domain Facts：child Results / Splits / Relation / Card 均已持久化
    expect((await dataService.getWorkloadResults()).length).toBe(resultsBefore + 3);
    expect((await dataService.getWorkloadSplits()).length).toBe(splitsBefore + 3);
    expect((await dataService.getRelations()).length).toBe(relationsBefore + 3);
    expect((await dataService.getCards()).length).toBe(cardsBefore + 3);
  });

  it("C：参数不完整（value 未填）→ Confirm 禁用，不发送 decision，保持 recommended", async () => {
    currentTestSuffix = "c1";
    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    const confirmButton = ui.container.querySelector(
      '[data-testid="confirm-button"]'
    ) as HTMLButtonElement;
    expect(confirmButton.textContent).toContain("确认拆分");
    // value 为空 → isSplitDraftComplete=false → 按钮禁用
    expect(confirmButton.disabled).toBe(true);

    // 填两个 child，第三个仍不完整 → 仍禁用
    await fillChildInputs(ui, 0, { value: 400, rs: "rs-split-ui", ri: "ri-split-ui-0" });
    await fillChildInputs(ui, 1, { value: 400, rs: "rs-split-ui", ri: "ri-split-ui-1" });
    const stillDisabled = ui.container.querySelector(
      '[data-testid="confirm-button"]'
    ) as HTMLButtonElement;
    expect(stillDisabled.disabled).toBe(true);
    expect(recommendationStore.getState().getRecommendationById(rec.id)!.status).toBe("recommended");
  });

  it("D：splitPlan 不作为 fallback —— executor 收到的 splitParameters 是 UI 当前确认值（含用户改名）", async () => {
    currentTestSuffix = "d1";
    const originalExecuteDecision = recommendationStore.getState().executeDecision;
    const executeDecisionSpy = vi.fn(originalExecuteDecision);
    recommendationStore.getState().executeDecision = executeDecisionSpy as never;
    try {
      ui = await renderApp();
      await selectRec(ui.container, rec.id);

      await fillChildInputs(ui!, 0, { value: 100, rs: "rs-user", ri: "ri-user-0" });
      await fillChildInputs(ui!, 1, { value: 100, rs: "rs-user", ri: "ri-user-1" });
      await fillChildInputs(ui!, 2, { value: 100, rs: "rs-user", ri: "ri-user-2" });

      await act(async () => {
        (ui!.container.querySelector('[data-testid="confirm-button"]') as HTMLElement).click();
      });

      expect(executeDecisionSpy).toHaveBeenCalledTimes(1);
      const decision = executeDecisionSpy.mock.calls[0][0] as {
        action: string;
        splitParameters?: { children: Array<{ id: string; resultSetId: string; value: number | null }> };
      };
      expect(decision.action).toBe("confirm_split");
      expect(decision.splitParameters).toBeDefined();
      // 用户填写的正式参数（与 splitPlan 建议不同：rs=rs-user 为用户输入）
      for (const child of decision.splitParameters!.children) {
        expect(child.resultSetId).toBe("rs-user");
        expect(child.value).toBe(100);
      }
      // executor 收到的是 UI 确认值而非 payload.splitPlan 回读（splitPlan 中无 rs/value）
      expect(recommendationStore.getState().getRecommendationById(rec.id)!.status).toBe("accepted");
    } finally {
      recommendationStore.getState().executeDecision = originalExecuteDecision;
    }
  });

  it("E：persistence 失败 → recommended + 错误显示，不伪装 accepted", async () => {
    currentTestSuffix = "e1";
    const originalSaveResults = (dataService as unknown as { saveWorkloadResults: unknown })
      .saveWorkloadResults;
    (dataService as unknown as { saveWorkloadResults: unknown }).saveWorkloadResults = async () => {
      throw new Error("Simulated split persistence failure");
    };
    try {
      ui = await renderApp();
      await selectRec(ui.container, rec.id);

      await fillChildInputs(ui!, 0, { value: 400, rs: "rs-split-ui", ri: "ri-split-ui-0" });
      await fillChildInputs(ui!, 1, { value: 400, rs: "rs-split-ui", ri: "ri-split-ui-1" });
      await fillChildInputs(ui!, 2, { value: 460, rs: "rs-split-ui", ri: "ri-split-ui-2" });

      await act(async () => {
        (ui!.container.querySelector('[data-testid="confirm-button"]') as HTMLElement).click();
      });

      expect(recommendationStore.getState().getRecommendationById(rec.id)!.status).toBe(
        "recommended"
      );
      expect(ui.container.querySelector('[data-testid="action-error"]')!.textContent).toContain(
        "Simulated split persistence failure"
      );
    } finally {
      (dataService as unknown as { saveWorkloadResults: unknown }).saveWorkloadResults =
        originalSaveResults;
    }
  });

  it("单元补证：draft 与 payload 引用隔离 + buildSplitParameters 不读 payload", () => {
    const recA = makeSplitRecommendation("u1");
    const draft = draftFromRecommendation(recA)!;
    // 修改 payload.splitPlan 后，draft 不受影响（深拷贝）
    (recA.payload as { splitPlan: { children: Array<{ workloadResultId: string }> } }).splitPlan.children[0].workloadResultId = "mutated";
    expect(draft.children[0].targetUnitId).toBe("unit-wang-xx-u1"); // 占位篡改不影响草稿展示值
    // D-145 修复实证：正式参数不携带任何 child id（省略 → D-148 系统生成）
    expect("id" in (params_probe(draft) as object) ? (params_probe(draft) as Record<string, unknown>).id : undefined).toBeUndefined();
    function params_probe(d: typeof draft): unknown {
      return buildSplitParameters({ ...d, children: [{ ...d.children[0], value: 123, resultSetId: "rs-x", resultItemId: "ri-x" }] });
    }
    const params = buildSplitParameters({
      ...draft,
      children: [{ ...draft.children[0], value: 123, resultSetId: "rs-x", resultItemId: "ri-x" }],
    });
    expect(params.children[0].value).toBe(123);
    expect(params.children[0].resultSetId).toBe("rs-x");
    expect((params.children[0] as Record<string, unknown>).id).toBeUndefined();
    expect(isSplitDraftComplete({ ...draft, children: [{ ...draft.children[0], value: null, resultSetId: "", resultItemId: "" }] })).toBe(false);
    expect(isSplitDraftComplete({ ...draft, children: [{ ...draft.children[0], value: 1, resultSetId: "a", resultItemId: "b" }] })).toBe(true);
  });

  // A 前 context builder 可用性（保持 import 使用）
  it("targetUnitId 来源优先级：D-149 snapshot mappingEvidences 优先，placeholder 仅展示 fallback", () => {
    // 带 snapshot 的推荐：目标子 Unit 来自结构化 evidence（即使 splitPlan placeholder 被篡改）
    const recWithSnapshot = makeSplitRecommendation("s1");
    (recWithSnapshot.payload as Record<string, unknown>).matchingBasisSnapshot = {
      matchType: "ancestor",
      matchDetails: "d",
      unitRelation: "ancestor",
      targetUnitId: TARGET_UNIT,
      mappingEvidences: [
        {
          sourceDataObjectId: "sdo-1",
          targetChildUnitId: "unit-snap-a",
          matchedDimensionValues: { departmentId: "unit-snap-a" },
          confidence: "high",
          evidenceDescription: "e",
        },
        {
          sourceDataObjectId: "sdo-1",
          targetChildUnitId: "unit-snap-b",
          matchedDimensionValues: { departmentId: "unit-snap-b" },
          confidence: "high",
          evidenceDescription: "e",
        },
      ],
    };
    const draftSnapshot = draftFromRecommendation(recWithSnapshot)!;
    expect(draftSnapshot.children.map((c) => c.targetUnitId).sort()).toEqual(["unit-snap-a", "unit-snap-b"]);
    // 无 snapshot 的旧推荐：placeholder 解析仅作展示 fallback（id 不进入任何 identity）
    const legacy = makeSplitRecommendation("s2");
    const draftLegacy = draftFromRecommendation(legacy)!;
    expect(draftLegacy.children.map((c) => c.targetUnitId).sort()).toEqual([
      "unit-li-xx-s2",
      "unit-nursing-team-s2",
      "unit-wang-xx-s2",
    ]);
  });

  it("context 辅助：buildContextForStore 可为 store 状态构造执行 context", async () => {
    const context = await buildContextForStore();
    expect(context.existingWorkloadResults.get(PARENT_RESULT)).toBeDefined();
    expect(context.recommendations.get(rec.id)).toBeDefined();
  });
});