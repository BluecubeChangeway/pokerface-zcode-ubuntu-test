import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  onWorkloadCardDragStart,
  onWorkloadCardSlotDrop,
  WORKLOAD_CARD_DRAG_TYPE,
  type DataTransferLike,
} from "../app/dropInteraction";
import { recommendationStore } from "../stores/recommendationStore";
import { canvasStore } from "../stores/canvasStore";
import type { DataService } from "../services/DataService";
import type { CardSlot } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import { mockCards, mockSlots } from "../mock/mockCards";
import { mockRelations } from "../mock/mockRelations";
import {
  mockWorkloadResults,
  mockResultSets,
  mockCalculationSnapshots,
  mockWorkloadExecutions,
} from "../mock/mockWorkloadChain";
import { mockWorkloadDefinitions } from "../mock/mockWorkloadDefinitions";

const WORKLOAD = "workload-neurosurgery-outpatient";
const NEURO_UNIT = "unit-neurosurgery";
/** 无种子 workload_assign 的干净配对（D-150 创建/持久化分支） */
const CLEAN_WORKLOAD = "workload-internal-outpatient";

/** 最小 DataTransfer 模拟（node 环境无 DOM） */
class MemoryDataTransfer implements DataTransferLike {
  private store = new Map<string, string>();
  setData(type: string, value: string): void {
    this.store.set(type, value);
  }
  getData(type: string): string {
    return this.store.get(type) ?? "";
  }
}

function dragStartedWith(cardId: string): MemoryDataTransfer {
  const dt = new MemoryDataTransfer();
  onWorkloadCardDragStart(dt, cardId);
  return dt;
}

function workloadSlotOf(ownerCardId: string, overrides?: Partial<CardSlot>): CardSlot {
  const base = mockSlots.find((s) => s.type === "workload" && s.ownerCardId === ownerCardId);
  if (!base) throw new Error(`mock 中不存在 ${ownerCardId} 的 workload slot`);
  return { ...base, ...overrides };
}

function unitSlotOf(ownerCardId: string): CardSlot {
  const base = mockSlots.find((s) => s.type === "unit" && s.ownerCardId === ownerCardId);
  if (!base) throw new Error(`mock 中不存在 ${ownerCardId} 的 unit slot`);
  return base;
}

/** 间谍 dataService：读侧真实、写侧记录（UI 链路不得产生任何写入） */
function createDataService(): DataService & {
  saveRelations: ReturnType<typeof vi.fn>;
  saveWorkloadResults: ReturnType<typeof vi.fn>;
  saveWorkloadSplits: ReturnType<typeof vi.fn>;
  saveCards: ReturnType<typeof vi.fn>;
} {
  return {
    getCards: async () => mockCards,
    getRelations: async () => mockRelations,
    getWorkloadResults: async () => mockWorkloadResults,
    getWorkloadSplits: async () => [],
    getResultSets: async () => mockResultSets,
    getCalculationSnapshots: async () => mockCalculationSnapshots,
    getWorkloadExecutions: async () => mockWorkloadExecutions,
    getWorkloadDefinition: async (id: string) => {
      const definition = mockWorkloadDefinitions.find((d) => d.id === id);
      if (!definition) throw new Error(`Unknown workload definition: ${id}`);
      return definition;
    },
    saveRelations: vi.fn(),
    saveWorkloadResults: vi.fn(),
    saveWorkloadSplits: vi.fn(),
    saveCards: vi.fn(),
  } as unknown as ReturnType<typeof createDataService>;
}

/** 有状态间谍 dataService（D-150：合法 Drop 经 UI handler 也必须真实建立并持久化关系） */
function createStatefulDataService(): DataService & {
  saveRelations: ReturnType<typeof vi.fn>;
} & { relations: Relation[] } {
  const relations = [...mockRelations];
  const ds = {
    getCards: async () => mockCards,
    getRelations: async () => relations,
    getWorkloadResults: async () => mockWorkloadResults,
    getWorkloadSplits: async () => [],
    getResultSets: async () => mockResultSets,
    getCalculationSnapshots: async () => mockCalculationSnapshots,
    getWorkloadExecutions: async () => mockWorkloadExecutions,
    getWorkloadDefinition: async (id: string) => {
      const definition = mockWorkloadDefinitions.find((d) => d.id === id);
      if (!definition) throw new Error(`Unknown workload definition: ${id}`);
      return definition;
    },
    saveRelations: vi.fn(async (saved: Relation[]) => {
      for (const relation of saved) {
        const index = relations.findIndex((r) => r.id === relation.id);
        if (index >= 0) {
          relations[index] = relation;
        } else {
          relations.push(relation);
        }
      }
    }),
    saveWorkloadResults: vi.fn(),
    saveWorkloadSplits: vi.fn(),
    saveCards: vi.fn(),
    saveCalculationResults: vi.fn(),
    relations,
  } as unknown as DataService & { saveRelations: ReturnType<typeof vi.fn> } & { relations: Relation[] };
  return ds;
}

describe("UI 竖切片：原生拖放 handler → dropTrigger → Trigger → store", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
    canvasStore.getState().clearFocus();
  });

  it("dragStart：payload 仅携带 workloadCardId（唯一 MIME），不触碰任何 store", () => {
    const dt = new MemoryDataTransfer();
    const focusBefore = canvasStore.getState().focusCardId;
    onWorkloadCardDragStart(dt, WORKLOAD);

    expect(dt.getData(WORKLOAD_CARD_DRAG_TYPE)).toBe(WORKLOAD);
    // dragStart 不产生业务副作用（不改 focus / 不写推荐）
    expect(canvasStore.getState().focusCardId).toBe(focusBefore);
    expect(recommendationStore.getState().recommendations).toHaveLength(0);
  });

  it("A：合法 workload slot drop（干净配对）→ 先持久化 workload_assign，再出现 resolution 推荐（D-150）", async () => {
    const ds = createStatefulDataService();
    const dt = dragStartedWith(CLEAN_WORKLOAD);
    const result = await onWorkloadCardSlotDrop(ds, dt, workloadSlotOf(NEURO_UNIT));

    expect(result.outcome).toBe("resolved");
    if (result.outcome !== "resolved") throw new Error("unreachable");
    expect(result.relationOutcome).toBe("persisted");
    expect(result.relation.type).toBe("workload_assign");
    expect(result.relation.sourceId).toBe(NEURO_UNIT);
    expect(result.relation.targetId).toBe(CLEAN_WORKLOAD);
    expect(result.relation.active).toBe(true);
    // 关系已真实落库（有状态 spy 可见）
    const activeRows = ds.relations.filter(
      (r) =>
        r.active &&
        r.type === "workload_assign" &&
        r.sourceId === NEURO_UNIT &&
        r.targetId === CLEAN_WORKLOAD
    );
    expect(activeRows).toHaveLength(1);
    expect(ds.saveRelations).toHaveBeenCalledTimes(1);
    // 推荐已注册
    const recs = recommendationStore.getState().getRecommendationsByKind("resolution");
    expect(recs).toHaveLength(1);
    expect(recs[0].status).toBe("recommended");
    expect(recs[0].relatedEntityIds).toEqual([CLEAN_WORKLOAD, NEURO_UNIT]);
    // 除关系外零其他写入
    expect(ds.saveWorkloadResults).not.toHaveBeenCalled();
    expect(ds.saveWorkloadSplits).not.toHaveBeenCalled();
    expect(ds.saveCards).not.toHaveBeenCalled();
  });

  it("B：拖到非法 slot（unit 型）→ 静默取消，无推荐产生", async () => {
    const ds = createDataService();
    const dt = dragStartedWith(WORKLOAD);
    const result = await onWorkloadCardSlotDrop(ds, dt, unitSlotOf(NEURO_UNIT));

    expect(result.outcome).toBe("ignored");
    expect(recommendationStore.getState().getRecommendationsByKind("resolution")).toHaveLength(0);
  });

  it("B+：无 payload（非 WorkloadCard 拖入）→ 静默取消，无推荐", async () => {
    const ds = createDataService();
    const emptyDt = new MemoryDataTransfer();
    const result = await onWorkloadCardSlotDrop(ds, emptyDt, workloadSlotOf(NEURO_UNIT));

    expect(result.outcome).toBe("ignored");
    expect(recommendationStore.getState().getRecommendationsByKind("resolution")).toHaveLength(0);
  });

  it("C：重复 drop 同一 WorkloadCard 到同一 Slot → 关系幂等复用 + D-142 同 ID、store 中仍只有一条", async () => {
    const ds = createStatefulDataService();
    const slot = workloadSlotOf(NEURO_UNIT);

    const first = await onWorkloadCardSlotDrop(ds, dragStartedWith(CLEAN_WORKLOAD), slot);
    const second = await onWorkloadCardSlotDrop(ds, dragStartedWith(CLEAN_WORKLOAD), slot);

    expect(first.outcome).toBe("resolved");
    expect(second.outcome).toBe("resolved");
    if (first.outcome !== "resolved" || second.outcome !== "resolved") {
      throw new Error("unreachable");
    }
    expect(first.relationOutcome).toBe("persisted");
    expect(second.relationOutcome).toBe("reused");
    const firstId = first.trigger.recommendation.id;
    const secondId = second.trigger.recommendation.id;
    expect(secondId).toBe(firstId);

    // 该配对 active 关系仍恰 1 条（重复 Drop 不产生重复关系）
    const activeRows = ds.relations.filter(
      (r) =>
        r.active &&
        r.type === "workload_assign" &&
        r.sourceId === NEURO_UNIT &&
        r.targetId === CLEAN_WORKLOAD
    );
    expect(activeRows).toHaveLength(1);
    expect(ds.saveRelations).toHaveBeenCalledTimes(1);

    const recs = recommendationStore
      .getState()
      .getRecommendationsByKind("resolution")
      .filter((r) => r.id === firstId);
    expect(recs).toHaveLength(1);
  });

});
