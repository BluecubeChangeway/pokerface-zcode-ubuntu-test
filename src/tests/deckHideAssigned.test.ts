import { describe, expect, it } from "vitest";
import type { AnyCard, BudgetCard, UnitCard, WorkloadCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import type { WorkloadResult } from "../domain/workload/types";
import { deckCardsOf } from "../app/canvasBootstrap";

/**
 * A-008 Deck 消失/还原（用户 2026-10-26 裁定："拖入到画布成为某些卡片的关联卡之后，
 * 原来 deck 里的卡片消失；从卡槽拖回 deck 或画布空的位置则还原回 deck。
 * 这个在之前的最早的需求说明里明确过。"）行为测试。
 *
 * 语义：Deck = "当前上下文中可供发现和选择的卡牌集合"（历史 L6165）——
 * 有 active workload_assign / budget_assign 关联的卡不显示在 Deck（纯 Relations 投影，
 * 不新增领域概念）；解除关系 → 过滤自动反转 → 还原。
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `hide${seq}`;
}

function unitCard(id: string, name: string): UnitCard {
  return {
    id, type: "unit", name,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
}

function workloadCard(id: string, resultId: string): WorkloadCard {
  return {
    id, type: "workload", name: `工作量卡-${id}`,
    workloadResultId: resultId, configurationState: "configured",
  };
}

function budgetCard(id: string): BudgetCard {
  return {
    id, type: "budget", name: `预算卡-${id}`,
    amount: 1000, configurationState: "configured",
  };
}

describe("A-008 Deck 消失/还原（deckCardsOf 过滤规则）", () => {
  const s = nextSuffix();
  const units: AnyCard[] = [unitCard(`u-a-${s}`, "内科"), unitCard(`u-b-${s}`, "急诊")];
  const workloadResult: WorkloadResult = {
    id: `wr-${s}`, resultSetId: `rs-${s}`, resultItemId: `ri-${s}`,
    name: "结果", value: 100, dimensions: {},
  };
  const workloads: AnyCard[] = [
    workloadCard(`wl-1-${s}`, workloadResult.id),
    workloadCard(`wl-2-${s}`, workloadResult.id),
    workloadCard(`wl-3-${s}`, workloadResult.id),
  ];
  const budgets: AnyCard[] = [budgetCard(`bg-1-${s}`), budgetCard(`bg-2-${s}`)];

  it("无 relations 参数（默认）→ 全部显示（既有调用不受影响）", () => {
    const deck = deckCardsOf([...units, ...workloads], "workload");
    expect(deck.length).toBe(3);
  });

  it("有 active workload_assign 关联的工作量卡 → 不显示在 Deck；解除（active=false）→ 还原", () => {
    const relations: Relation[] = [
      // wl-1 已挂入内科（workload_assign: Unit→Workload → targetId = 工作量卡）
      { id: `rel-1-${s}`, type: "workload_assign", sourceId: `u-a-${s}`, targetId: `wl-1-${s}`, active: true },
      // wl-2 曾经挂入过急诊但已解除 → active=false → 应还原
      { id: `rel-2-${s}`, type: "workload_assign", sourceId: `u-b-${s}`, targetId: `wl-2-${s}`, active: false },
    ];
    const deck = deckCardsOf([...units, ...workloads], "workload", {
      relations,
      includeAssigned: false,
    });
    // wl-1 关联中 → 不显示；wl-2 已解除 → 还原；wl-3 从未关联 → 显示
    expect(deck.map((c) => c.id).sort()).toEqual([`wl-2-${s}`, `wl-3-${s}`].sort());
  });

  it("有 active budget_assign 关联的预算卡 → 不显示（方向 Budget→Unit → sourceId = 预算卡）", () => {
    const relations: Relation[] = [
      { id: `rel-b1-${s}`, type: "budget_assign", sourceId: `bg-1-${s}`, targetId: `u-a-${s}`, active: true },
    ];
    const deck = deckCardsOf([...units, ...budgets], "budget", {
      relations,
      includeAssigned: false,
    });
    expect(deck.map((c) => c.id)).toEqual([`bg-2-${s}`]);
  });

  it("includeAssigned=true → 全部显示（全院组织架构场景视图切换）", () => {
    const relations: Relation[] = [
      { id: `rel-1b-${s}`, type: "workload_assign", sourceId: `u-a-${s}`, targetId: `wl-1-${s}`, active: true },
      { id: `rel-b1b-${s}`, type: "budget_assign", sourceId: `bg-1-${s}`, targetId: `u-a-${s}`, active: true },
    ];
    const allWorkload = deckCardsOf([...units, ...workloads], "workload", {
      relations,
      includeAssigned: true,
    });
    expect(allWorkload.length).toBe(3);
    const allBudget = deckCardsOf([...units, ...budgets], "budget", {
      relations,
      includeAssigned: true,
    });
    expect(allBudget.length).toBe(2);
  });

  it("D-154 不变：revoked 卡仍不出现在 Deck", () => {
    const revokedWorkload: AnyCard = {
      ...workloadCard(`wl-revoked-${s}`, workloadResult.id),
      businessStatus: "revoked" as const,
    };
    const deck = deckCardsOf([...units, revokedWorkload], "workload");
    expect(deck.length).toBe(0);
  });
});
