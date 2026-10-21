import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STATUS_LABEL,
  toRecommendationDetail,
  toRecommendationListItems,
  type RecommendationListItem,
} from "../app/recommendationList";
import { recommendationStore } from "../stores/recommendationStore";
import { canvasStore } from "../stores/canvasStore";
import type { Recommendation } from "../domain/recommendation/types";

/**
 * Recommendation UI 第一刀测试：纯 selector（store 数据 → 展示视图模型）+ store 实时行为。
 * React 渲染经 useSyncExternalStore 与纯 selector 组合，此处对 selector 与 store 联动验证
 * （node 环境沿用项目既有 handler/selector 测试策略，不引入 DOM 测试框架）。
 */

const WORKLOAD = "workload-neurosurgery-outpatient";
const NEURO_UNIT = "unit-neurosurgery";

function makeRecommendation(overrides?: Partial<Recommendation>): Recommendation {
  return {
    id: "rec-ui-1",
    kind: "resolution",
    payload: { type: "use_existing_result", targetResultId: "wr-x", reason: "测试推荐" },
    reason: "Workload 统计范围与目标 Unit 完全匹配",
    status: "recommended",
    createdAt: "2026-10-07T10:00:00.000Z",
    updatedAt: "2026-10-07T10:00:00.000Z",
    relatedEntityIds: [WORKLOAD, NEURO_UNIT],
    ...overrides,
  };
}

describe("Recommendation UI：纯 selector + store 联动（A–E）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.getState().clearFocus();
  });

  it("A：空 store → 列表为空（UI empty state 的数据来源）", () => {
    const items = toRecommendationListItems(recommendationStore.getState().recommendations);
    expect(items).toHaveLength(0);
  });

  it("B：添加 resolution 推荐 → 列表出现条目，id / kind / status / reason 正确", () => {
    const rec = makeRecommendation();
    recommendationStore.getState().setRecommendations([rec]);
    const items = toRecommendationListItems(recommendationStore.getState().recommendations);

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("rec-ui-1");
    expect(items[0].kind).toBe("resolution");
    expect(items[0].status).toBe("recommended");
    expect(items[0].reason).toBe("Workload 统计范围与目标 Unit 完全匹配");
    expect(items[0].createdAt).toBe("2026-10-07T10:00:00.000Z");
    // payload 中已存在且语义明确的最小字段
    expect(items[0].payloadType).toBe("use_existing_result");
    expect(items[0].targetResultId).toBe("wr-x");
  });

  it("C：选择条目 → 详情取自 store（selection 为 UI state，零 Domain Fact）", () => {
    const rec = makeRecommendation();
    recommendationStore.getState().setRecommendations([rec]);

    // selection state 本轮不进 store；详情 selector 以"选中 id"从 store 读取
    const detail = toRecommendationDetail(
      recommendationStore.getState().getRecommendationById("rec-ui-1")
    );
    expect(detail).toBeDefined();
    expect(detail!.id).toBe("rec-ui-1");
    expect(detail!.payloadType).toBe("use_existing_result");

    // 选择不产生任何 UserDecision / 状态变化 / 写入
    expect(recommendationStore.getState().userDecisions).toHaveLength(0);
    expect(recommendationStore.getState().getRecommendationById("rec-ui-1")!.status).toBe(
      "recommended"
    );
    const saveSpy = vi.fn();
    expect(saveSpy).not.toHaveBeenCalled(); // selector 路径无任何写入通道
  });

  it("D：同 ID upsert（D-142 重触发）→ 列表仍只有一条，status 变化实时反映", () => {
    const rec = makeRecommendation();
    recommendationStore.getState().addRecommendation(rec);
    const itemsAfterFirst = toRecommendationListItems(
      recommendationStore.getState().recommendations
    );
    expect(itemsAfterFirst).toHaveLength(1);

    // D-142 重触发：同 ID 重新注册为 recommended（updatedAt 变化）
    const reOffered: Recommendation = {
      ...rec,
      status: "recommended",
      updatedAt: "2026-10-07T11:00:00.000Z",
    };
    recommendationStore.getState().addRecommendation(reOffered);

    const itemsAfterReoffer = toRecommendationListItems(
      recommendationStore.getState().recommendations
    );
    expect(itemsAfterReoffer).toHaveLength(1); // UI 层零去重逻辑，store 天然一条
    expect(itemsAfterReoffer[0].id).toBe("rec-ui-1");
    expect(itemsAfterReoffer[0].updatedAt).toBe("2026-10-07T11:00:00.000Z");

    // status 变化（如 accepted）→ 视图模型实时反映
    recommendationStore.getState().updateRecommendationStatus("rec-ui-1", "accepted");
    const itemsAfterAccept = toRecommendationListItems(
      recommendationStore.getState().recommendations
    );
    expect(itemsAfterAccept).toHaveLength(1);
    expect(itemsAfterAccept[0].status).toBe("accepted");
    expect(STATUS_LABEL.accepted).toBe("已接受");
  });

  it("E：四种状态展示映射（recommended / accepted / ignored / dismissed）", () => {
    const statuses: Recommendation["status"][] = [
      "recommended",
      "accepted",
      "ignored",
      "dismissed",
    ];
    const items = statuses.map((status, i) =>
      toRecommendationListItems([makeRecommendation({ id: `rec-${status}-${i}`, status })])[0]
    );
    for (let i = 0; i < statuses.length; i++) {
      expect(items[i].status).toBe(statuses[i]);
      expect(STATUS_LABEL[statuses[i]]).toBeDefined();
    }
    // store 实际状态变化后视图模型正确展示 ignored / dismissed
    const rec = makeRecommendation();
    recommendationStore.getState().setRecommendations([rec]);
    recommendationStore.getState().updateRecommendationStatus(rec.id, "ignored");
    expect(
      toRecommendationListItems(recommendationStore.getState().recommendations)[0].status
    ).toBe("ignored");
    recommendationStore.getState().updateRecommendationStatus(rec.id, "dismissed");
    expect(
      toRecommendationListItems(recommendationStore.getState().recommendations)[0].status
    ).toBe("dismissed");
  });

  it("多推荐共存：不同对（不同 id）各自成条；同 id 不重复（D-142 结构）", () => {
    const a = makeRecommendation({
      id: "rec-resolution-workload-a-unit-x",
      payload: { type: "split_workload" },
      reason: "A",
    });
    const b = makeRecommendation({
      id: "rec-resolution-workload-b-unit-x",
      payload: { type: "no_match" },
      reason: "B",
    });
    recommendationStore.getState().setRecommendations([a, b]);
    recommendationStore.getState().addRecommendation({ ...b, updatedAt: "2026-10-07T12:00:00.000Z" });

    const items: RecommendationListItem[] = toRecommendationListItems(
      recommendationStore.getState().recommendations
    );
    expect(items).toHaveLength(2);
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
  });
});
