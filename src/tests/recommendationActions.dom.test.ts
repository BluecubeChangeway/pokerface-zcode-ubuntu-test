// @vitest-environment happy-dom
/**
 * Confirm / Cancel / Dismiss UI 第一刀：真实 React DOM 行为测试（A–H）
 * 渲染真实 <App />，经原生 click 触发；全部经 recommendationStore 既有通道。
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "../app/App";
import { recommendationStore } from "../stores/recommendationStore";
import { canvasStore } from "../stores/canvasStore";
import { resetCanvasBootstrapForTests } from "../app/canvasBootstrap";
import { dataService } from "../services/MockDataService";
import { resolveWorkloadToUnitAndRecommend } from "../services/resolutionTrigger";
import type { Recommendation } from "../domain/recommendation/types";
import { confirmActionFor } from "../app/recommendationActions";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// 使用 mock 中不存在既有 workload_assign 的真实对（保证 confirm 后产生"新"持久化 Fact）
// （unit-neurosurgery → workload-neurosurgery-outpatient 已有既有 assign，会命中 P2-1 复用而非新建）
const WORKLOAD = "workload-internal-outpatient";
const NEURO_UNIT = "unit-internal-medicine";

/** 走真实 Trigger 生成一条可确认推荐（use_existing 族，含 D-149 快照） */
async function seedRecommendedRec(): Promise<Recommendation> {
  const { recommendation } = await resolveWorkloadToUnitAndRecommend(
    dataService,
    WORKLOAD,
    NEURO_UNIT
  );
  return recommendation;
}

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

async function selectRec(container: HTMLElement, recId: string) {
  await act(async () => {
    (container.querySelector(`[data-testid="recommendation-item-${recId}"]`) as HTMLElement).click();
  });
}

function relationsSnapshot(): Promise<number> {
  return dataService.getRelations().then((r) => r.length);
}

describe("Confirm / Cancel / Dismiss UI 第一刀（真实 DOM，A–H）", () => {
  let ui: { container: HTMLElement; cleanup: () => void } | undefined;
  let initialRelations: number;

  beforeEach(async () => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.setState({ cards: [], focusCardId: undefined });
    resetCanvasBootstrapForTests();
    initialRelations = await relationsSnapshot();
  });

  afterEach(() => {
    ui?.cleanup();
    ui = undefined;
  });

  it("A：选中推荐 → 点击 Confirm → executeDecision 执行 → accepted + 真实 workload_assign 已持久化", async () => {
    const rec = await seedRecommendedRec();
    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    const confirmButton = ui.container.querySelector('[data-testid="confirm-button"]');
    expect(confirmButton).not.toBeNull();
    const relationsBefore = await relationsSnapshot();

    await act(async () => {
      (confirmButton as HTMLElement).click();
    });

    expect(recommendationStore.getState().getRecommendationById(rec.id)!.status).toBe("accepted");
    // G：真实 Domain Fact 持久化（不只是 status）：新增一条 active workload_assign
    const relationsAfter = await relationsSnapshot();
    expect(relationsAfter).toBe(relationsBefore + 1);
    const newAssign = (await dataService.getRelations()).filter(
      (r) =>
        r.active &&
        r.type === "workload_assign" &&
        r.sourceId === NEURO_UNIT &&
        r.targetId === (rec.payload as { targetWorkloadCardId?: string }).targetWorkloadCardId
    );
    expect(newAssign).toHaveLength(1);
    // UI 状态展示
    expect(
      ui.container.querySelector(`[data-testid="recommendation-item-${rec.id}"]`)!.textContent
    ).toContain("已接受");
  });

  it("B+H：persistence 失败 → UI 不显示 accepted、保持 recommended、显示错误", async () => {
    const rec = await seedRecommendedRec();
    // 破坏持久化：saveRelations 抛错（真实服务方法替换，恢复于 finally）
    const original = (dataService as unknown as { saveRelations: unknown }).saveRelations;
    (dataService as unknown as { saveRelations: unknown }).saveRelations = async () => {
      throw new Error("Simulated persistence failure");
    };
    try {
      ui = await renderApp();
      await selectRec(ui.container, rec.id);

      await act(async () => {
        (ui!.container.querySelector('[data-testid="confirm-button"]') as HTMLElement).click();
      });

      const stored = recommendationStore.getState().getRecommendationById(rec.id)!;
      expect(stored.status).toBe("recommended");
      expect(
        ui.container.querySelector(`[data-testid="recommendation-item-${rec.id}"]`)!.textContent
      ).toContain("待处理");
      expect(ui.container.querySelector('[data-testid="action-error"]')!.textContent).toContain(
        "Simulated persistence failure"
      );
    } finally {
      (dataService as unknown as { saveRelations: unknown }).saveRelations = original;
    }
  });

  it("C：点击暂不采用 → cancelOrDismiss 执行 → ignored", async () => {
    const rec = await seedRecommendedRec();
    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    await act(async () => {
      (ui!.container.querySelector('[data-testid="cancel-button"]') as HTMLElement).click();
    });

    expect(recommendationStore.getState().getRecommendationById(rec.id)!.status).toBe("ignored");
    expect(
      ui.container.querySelector(`[data-testid="recommendation-item-${rec.id}"]`)!.textContent
    ).toContain("已忽略");
    expect(await relationsSnapshot()).toBe(initialRelations); // 零 Fact
  });

  it("D：点击驳回 → cancelOrDismiss 执行 → dismissed", async () => {
    const rec = await seedRecommendedRec();
    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    await act(async () => {
      (ui!.container.querySelector('[data-testid="dismiss-button"]') as HTMLElement).click();
    });

    expect(recommendationStore.getState().getRecommendationById(rec.id)!.status).toBe("dismissed");
    expect(
      ui.container.querySelector(`[data-testid="recommendation-item-${rec.id}"]`)!.textContent
    ).toContain("已驳回");
    expect(await relationsSnapshot()).toBe(initialRelations); // 零 Fact
  });

  it("E：通道隔离 —— cancel/dismiss 按钮点击后 store 内无 UserDecision 决策记录走 executeDecision", async () => {
    const rec = await seedRecommendedRec();
    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    // P2-6 边界的运行时证据：cancelOrDismiss 走 cancelOrDismiss 通道（此处为 ignored），
    // 而 executeDecision 通道的决策动作（confirm_*）从未被触发。
    const decisionsBefore = recommendationStore.getState().getUserDecisions(rec.id).length;
    await act(async () => {
      (ui!.container.querySelector('[data-testid="cancel-button"]') as HTMLElement).click();
    });
    // userDecisions 为跨测试累积的审计记录（无清理通道），此处按增量 + 末条 action 断言
    const decisions = recommendationStore.getState().getUserDecisions(rec.id);
    expect(decisions.length).toBe(decisionsBefore + 1);
    expect(decisions[decisions.length - 1].action).toBe("cancel");
    expect(recommendationStore.getState().getRecommendationById(rec.id)!.status).toBe("ignored");
  });

  it("E+：payload.type=no_match 的推荐 → 不显示 Confirm 按钮（无假按钮）", async () => {
    const rec: Recommendation = {
      id: "rec-nomatch-x",
      kind: "resolution",
      payload: { type: "no_match", reason: "无匹配" },
      status: "recommended",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedEntityIds: [WORKLOAD, NEURO_UNIT],
    };
    recommendationStore.getState().setRecommendations([rec]);
    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    expect(confirmActionFor(rec)).toBeUndefined();
    expect(ui.container.querySelector('[data-testid="confirm-button"]')).toBeNull();
    // cancel / dismiss 仍可用（与执行无关的生命周期操作）
    expect(ui.container.querySelector('[data-testid="cancel-button"]')).not.toBeNull();
    expect(ui.container.querySelector('[data-testid="dismiss-button"]')).not.toBeNull();
  });

  it("aggregate_descendants 推荐 → Confirm 按钮隐藏（capability boundary 的 UI 层反映）", async () => {
    const rec: Recommendation = {
      id: "rec-aggregate-x",
      kind: "resolution",
      payload: { type: "aggregate_descendants", reason: "可聚合" },
      status: "recommended",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedEntityIds: [WORKLOAD, NEURO_UNIT],
    };
    recommendationStore.getState().setRecommendations([rec]);
    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    expect(ui.container.querySelector('[data-testid="confirm-button"]')).toBeNull();
    // cancel / dismiss 仍可用（生命周期操作与执行能力无关）
    expect(ui.container.querySelector('[data-testid="cancel-button"]')).not.toBeNull();
    expect(ui.container.querySelector('[data-testid="dismiss-button"]')).not.toBeNull();
  });

  it("P2-6 A：点击暂不采用 → spy 证明 executeDecision 零调用 → cancelOrDismiss 完成 → ignored", async () => {
    const rec = await seedRecommendedRec();
    const executeDecisionSpy = vi.spyOn(
      recommendationStore.getState(),
      "executeDecision"
    );
    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    await act(async () => {
      (ui!.container.querySelector('[data-testid="cancel-button"]') as HTMLElement).click();
    });

    expect(executeDecisionSpy).toHaveBeenCalledTimes(0);
    expect(recommendationStore.getState().getRecommendationById(rec.id)!.status).toBe("ignored");
    executeDecisionSpy.mockRestore();
  });

  it("P2-6 B：点击驳回 → spy 证明 executeDecision 零调用 → cancelOrDismiss 完成 → dismissed", async () => {
    const rec = await seedRecommendedRec();
    const executeDecisionSpy = vi.spyOn(
      recommendationStore.getState(),
      "executeDecision"
    );
    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    await act(async () => {
      (ui!.container.querySelector('[data-testid="dismiss-button"]') as HTMLElement).click();
    });

    expect(executeDecisionSpy).toHaveBeenCalledTimes(0);
    expect(recommendationStore.getState().getRecommendationById(rec.id)!.status).toBe("dismissed");
    executeDecisionSpy.mockRestore();
  });

  it("F：executingAction 期间按钮禁用（防重复提交）", async () => {
    const rec = await seedRecommendedRec();
    recommendationStore.getState().setEnabled(false); // 利用 enabled=false 使 executingAction 不可用？
    recommendationStore.getState().setEnabled(true);
    ui = await renderApp();
    await selectRec(ui.container, rec.id);

    // 用慢 dataService 让 executeDecision 处于 executingAction=true 的窗口
    const originalSave = (dataService as unknown as { saveRelations: unknown }).saveRelations;
    let release: (() => void) | undefined;
    (dataService as unknown as { saveRelations: unknown }).saveRelations = () =>
      new Promise<void>((resolve) => {
        release = () => {
          (dataService as unknown as { saveRelations: unknown }).saveRelations = originalSave;
          resolve();
        };
      });
    try {
      let firstClick: Promise<unknown> | undefined;
      await act(async () => {
        (ui!.container.querySelector('[data-testid="confirm-button"]') as HTMLElement).click();
        firstClick = Promise.resolve();
      });
      // executingAction 应为 true，按钮进入 disabled
      expect(recommendationStore.getState().executingAction).toBe(true);
      expect(
        (ui!.container.querySelector('[data-testid="confirm-button"]') as HTMLButtonElement).disabled
      ).toBe(true);
      // 释放
      await act(async () => {
        release?.();
      });
      await act(async () => {});
      expect(recommendationStore.getState().executingAction).toBe(false);
      expect(recommendationStore.getState().getRecommendationById(rec.id)!.status).toBe(
        "accepted"
      );
    } finally {
      (dataService as unknown as { saveRelations: unknown }).saveRelations = originalSave;
    }
  });
});
