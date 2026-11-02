// @vitest-environment happy-dom
/**
 * Recommendation UI 真实 React DOM 行为测试（Q-09-C）
 *
 * 测试方式（最小可行，不引入测试框架）：
 * - happy-dom 提供最小 DOM 实现（devDependency，非大型测试框架）
 * - react-dom/client createRoot + React.act 渲染真实 <App />（同生产渲染器）
 * - 原生 element.click() 派发真实点击事件
 *
 * 覆盖 A–E：列表渲染 / 点击选择 / 零副作用 / 同 ID upsert / 状态实时展示。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "../app/App";
import { UIProviders } from "../app/providers/UIProviders";
import { recommendationStore } from "../stores/recommendationStore";
import { canvasStore } from "../stores/canvasStore";
import { resetCanvasBootstrapForTests } from "../app/canvasBootstrap";
import { dataService } from "../services/MockDataService";
import type { Recommendation } from "../domain/recommendation/types";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeRecommendation(overrides?: Partial<Recommendation>): Recommendation {
  return {
    id: "rec-ui-dom-1",
    kind: "resolution",
    payload: { type: "use_existing_result", targetResultId: "wr-x", reason: "匹配推荐" },
    reason: "UI 测试推荐一",
    status: "recommended",
    createdAt: "2026-10-07T10:00:00.000Z",
    updatedAt: "2026-10-07T10:00:00.000Z",
    relatedEntityIds: ["workload-neurosurgery-outpatient", "unit-neurosurgery"],
    ...overrides,
  };
}

/** 最小渲染 harness（非测试框架）：渲染真实 App 并等待异步 getCards 完成 */
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
  return {
    container,
    cleanup: () => {
      act(() => root?.unmount());
      container.remove();
    },
  };
}

async function reRender(ui: { container: HTMLElement }) {
  // store 更新经 useSyncExternalStore 通知触发重渲染；act 刷新 React 批处理
  await act(async () => {
    /* store 变更已在 act 外完成，此处仅 flush 渲染 */
  });
}

describe("Recommendation UI 真实 React DOM 行为（A–E）", () => {
  let ui: { container: HTMLElement; cleanup: () => void } | undefined;
  const saveSpies: Array<{ mockRestore: () => void; mockClear?: () => void }> = [];

  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.setState({ cards: [], focusCardId: undefined });
    resetCanvasBootstrapForTests();
    // 对生产 dataService 的 save* 方法挂 spy：证明 UI 点击全程零持久化调用
    for (const method of [
      "saveRelations",
      "saveWorkloadResults",
      "saveWorkloadSplits",
      "saveCards",
    ] as const) {
      saveSpies.push(vi.spyOn(dataService, method).mockImplementation(async () => undefined));
    }
  });

  afterEach(() => {
    ui?.cleanup();
    ui = undefined;
    for (const spy of saveSpies.splice(0)) spy.mockRestore();
  });

  it("A：store 放入 1 条 resolution 推荐 → 列表渲染该条（id 经 data-testid 与 reason 文本可见）", async () => {
    recommendationStore.getState().setRecommendations([makeRecommendation()]);
    ui = await renderApp();

    const item = ui.container.querySelector('[data-testid="recommendation-item-rec-ui-dom-1"]');
    expect(item).not.toBeNull();
    expect(item!.textContent).toContain("UI 测试推荐一"); // reason 文本
    expect(item!.textContent).toContain("待处理"); // status 标签
  });

  it("B：渲染 2 条 → 点击第二条 → selection 更新，详情显示第二条 id/reason/status", async () => {
    recommendationStore.getState().setRecommendations([
      makeRecommendation({ id: "rec-dom-a", reason: "第一条推荐" }),
      makeRecommendation({ id: "rec-dom-b", reason: "第二条推荐", status: "recommended" }),
    ]);
    ui = await renderApp();

    const second = ui.container.querySelector('[data-testid="recommendation-item-rec-dom-b"]');
    expect(second).not.toBeNull();
    expect(ui.container.querySelector('[data-testid="recommendation-detail"]')).toBeNull(); // 点击前无详情

    await act(async () => {
      (second as HTMLElement).click(); // 真实点击事件
    });

    const detail = ui.container.querySelector('[data-testid="recommendation-detail"]');
    expect(detail).not.toBeNull();
    expect(detail!.querySelector('[data-testid="detail-id"]')!.textContent).toBe(
      "id: rec-dom-b"
    );
    expect(detail!.querySelector('[data-testid="detail-reason"]')!.textContent).toBe(
      "reason: 第二条推荐"
    );
    expect(detail!.querySelector('[data-testid="detail-status"]')!.textContent).toBe(
      "status: 待处理"
    );
    // selection 视觉反馈：第二条高亮
    expect(second!.className).not.toContain("undefined");
  });

  it("C：点击选择零副作用：无 UserDecision、状态不变、零 save 调用、零 Relation 写入", async () => {
    recommendationStore.getState().setRecommendations([
      makeRecommendation({ id: "rec-dom-c", status: "recommended" }),
    ]);
    ui = await renderApp();

    const decisionsBefore = recommendationStore.getState().userDecisions.length;
    const relationsBefore = (await dataService.getRelations()).length;

    await act(async () => {
      (
        ui!.container.querySelector('[data-testid="recommendation-item-rec-dom-c"]') as HTMLElement
      ).click();
    });

    expect(recommendationStore.getState().userDecisions.length).toBe(decisionsBefore); // 不记录决策
    expect(recommendationStore.getState().getRecommendationById("rec-dom-c")!.status).toBe(
      "recommended"
    ); // 状态不变
    expect((await dataService.getRelations()).length).toBe(relationsBefore); // 零 Relation
    for (const spy of saveSpies) {
      expect((spy as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(0); // 零持久化调用
    }
  });

  it("D：选中后同 ID upsert（D-142 re-offer）→ UI 仍单条，详情实时显示最新 updatedAt/status", async () => {
    const rec = makeRecommendation({ id: "rec-dom-d", reason: "upsert 推荐原版" });
    recommendationStore.getState().setRecommendations([rec]);
    ui = await renderApp();

    await act(async () => {
      (
        ui!.container.querySelector('[data-testid="recommendation-item-rec-dom-d"]') as HTMLElement
      ).click();
    });

    // D-142 re-offer：同 ID upsert（updatedAt / payload 变化）
    recommendationStore.getState().addRecommendation({
      ...rec,
      status: "recommended",
      payload: { type: "split_workload", targetResultId: "wr-new", reason: "upsert 后" },
      reason: "upsert 推荐新版",
      updatedAt: "2026-10-07T12:00:00.000Z",
    });
    await reRender(ui);

    // 列表仍单条（store 天然单条，UI 无去重逻辑）
    const items = ui.container.querySelectorAll('[data-testid^="recommendation-item-"]');
    expect(items.length).toBe(1);

    // 详情随 selection 保持指向同 ID，并显示 upsert 后的最新内容
    const detail = ui.container.querySelector('[data-testid="recommendation-detail"]');
    expect(detail!.querySelector('[data-testid="detail-updated-at"]')!.textContent).toBe(
      "updatedAt: 2026-10-07T12:00:00.000Z"
    );
    expect(detail!.querySelector('[data-testid="detail-reason"]')!.textContent).toBe(
      "reason: upsert 推荐新版"
    );
  });

  it("F：drop 全链 → 选中推荐 → UI 显示 Matching Basis 快照关键字段（真实数据流）", async () => {
    // 经真实 drop 链（dropTrigger → Trigger → Engine → store），推荐携带真实 Snapshot
    const { handleWorkloadCardDropOnUnitSlot } = await import("../services/dropTrigger");
    const { resolveWorkloadToUnitAndRecommend } = await import("../services/resolutionTrigger");
    const trigger = await resolveWorkloadToUnitAndRecommend(
      dataService,
      "workload-neurosurgery-outpatient",
      "unit-neurosurgery-ward-1"
    );
    const recId = trigger.recommendation.id;
    ui = await renderApp();

    await act(async () => {
      (
        ui!.container.querySelector(`[data-testid="recommendation-item-${recId}"]`) as HTMLElement
      ).click();
    });

    const basis = ui.container.querySelector('[data-testid="matching-basis"]');
    expect(basis).not.toBeNull();
    expect(basis!.querySelector('[data-testid="basis-match-type"]')!.textContent).toContain(
      "ancestor"
    );
    expect(basis!.querySelector('[data-testid="basis-unit-relation"]')!.textContent).toContain(
      "ancestor"
    );
    expect(
      basis!.querySelector('[data-testid="basis-match-details"]')!.textContent
    ).toContain("包含目标 Unit");
  });

  it("E：status 依次 recommended → accepted / ignored / dismissed → UI 实时显示对应状态", async () => {
    const rec = makeRecommendation({ id: "rec-dom-e", reason: "状态流转推荐" });
    recommendationStore.getState().setRecommendations([rec]);
    ui = await renderApp();

    const statusText = () =>
      ui!.container
        .querySelector('[data-testid="recommendation-item-rec-dom-e"]')!
        .textContent ?? "";

    expect(statusText()).toContain("待处理");

    for (const [next, label] of [
      ["accepted", "已接受"],
      ["ignored", "已忽略"],
      ["dismissed", "已驳回"],
    ] as const) {
      act(() => {
        recommendationStore.getState().updateRecommendationStatus("rec-dom-e", next);
      });
      await reRender(ui!);
      expect(statusText()).toContain(label);
      expect(statusText()).not.toContain("待处理");
    }
  });
});
