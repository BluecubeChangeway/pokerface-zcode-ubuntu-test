import { describe, expect, it } from "vitest";
import type { AnyCard, BudgetCard, CardSlot, UnitCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import { MockDataService } from "../services/MockDataService";
import {
  moveBudgetCardAssignment,
  unassignBudgetCard,
} from "../services/budgetRelationEntry";
import {
  BUDGET_CARD_DRAG_TYPE,
  onBudgetCardDragStart,
  onBudgetCardSlotDrop,
  onBudgetCardDropOutsideSlots,
  onCardDropOutsideSlots,
  onCardSlotDrop,
  type DataTransferLike,
} from "../../app/dropInteraction";
import type { StructureRelationOutcome, DropTriggerResult } from "../services/dropTrigger";

/**
 * U-UI-13 预算卡拖放（用户 2026-10-26 语义方向："budget 卡与 workload 卡在界面交互上
 * 十分接近"）行为测试：
 * - Deck 预算卡拖入 budget 槽 = budget_assign 建立关系（Q-05 / D-023；方向 Budget→Unit）；
 * - P2-1 幂等（同键 active 复用）；交叉目标（budget 卡落 workload 槽）静默取消；
 * - 预算芯片：拖出槽外 = 解除（软删留痕）；槽间 = 移动；拖回原槽 = no-op；
 * - 无 Resolution / 无推荐（预算域无解析机制，D-128 边界）。
 *
 * 口径：断言数据行与返回值，非函数调用计数。
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `bud${seq}`;
}

class MapDataTransfer implements DataTransferLike {
  private readonly values = new Map<string, string>();
  setData(type: string, value: string): void {
    this.values.set(type, value);
  }
  getData(type: string): string {
    return this.values.get(type) ?? "";
  }
}

interface Universe {
  s: string;
  unitA: UnitCard;
  unitB: UnitCard;
  budget: BudgetCard;
  relations: Relation[];
}

function buildUniverse(s: string, opts?: { assignedToA?: boolean }): Universe {
  const unitA: UnitCard = {
    id: `u-a-${s}`, type: "unit", name: `内科-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const unitB: UnitCard = {
    id: `u-b-${s}`, type: "unit", name: `急诊-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const budget: BudgetCard = {
    id: `bg-${s}`, type: "budget", name: `绩效奖金池-${s}`,
    amount: 1_000_000, configurationState: "configured",
  };
  const relations: Relation[] = [];
  if (opts?.assignedToA !== false) {
    // budget_assign 方向：BudgetCard → UnitCard（endpointRules / mock 同构）
    relations.push({
      id: `rel-bg-a-${s}`, type: "budget_assign",
      sourceId: budget.id, targetId: unitA.id, active: true,
    });
  }
  return { s, unitA, unitB, budget, relations };
}

async function seed(ds: MockDataService, u: Universe): Promise<void> {
  const cards: AnyCard[] = [u.unitA, u.unitB, u.budget];
  await ds.saveCards(cards);
  await ds.saveRelations(u.relations);
}

function budgetSlotOf(unitId: string): CardSlot {
  return {
    id: `slot-${unitId}`, type: "budget", ownerCardId: unitId,
    enabled: true, locked: false, acceptedCardTypes: ["budget"],
    displayMode: "count", expanded: false,
  };
}

function workloadSlotOf(unitId: string): CardSlot {
  return { ...budgetSlotOf(unitId), type: "workload", acceptedCardTypes: ["workload"] };
}

// Type guards for budget relation outcomes
function isBudgetResolved(result: DropTriggerResult): result is { outcome: "budget_resolved"; relationOutcome: "persisted" | "reused"; relation: Relation } {
  return result.outcome === "budget_resolved";
}
function isBudgetMoved(result: DropTriggerResult): result is { outcome: "budget_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation } {
  return result.outcome === "budget_moved";
}
function isNoOpSameUnit(result: DropTriggerResult): result is { outcome: "no_op_same_unit" } {
  return result.outcome === "no_op_same_unit";
}
function isUnassigned(result: DropTriggerResult): result is { outcome: "unassigned"; deactivatedRelation?: Relation } {
  return result.outcome === "unassigned";
}
function isIgnored(result: DropTriggerResult): result is { outcome: "ignored" } {
  return result.outcome === "ignored";
}

describe("U-UI-13 预算卡拖放", () => {
  let seq = 0;
  function nextSuffix(): string {
    seq += 1;
    return `bud${seq}`;
  }

  class MapDataTransfer implements DataTransferLike {
    private readonly values = new Map<string, string>();
    setData(type: string, value: string): void {
      this.values.set(type, value);
    }
    getData(type: string): string {
      return this.values.get(type) ?? "";
    }
  }

  interface Universe {
    s: string;
    unitA: UnitCard;
    unitB: UnitCard;
    budget: BudgetCard;
    relations: Relation[];
  }

  function buildUniverse(s: string, opts?: { assignedToA?: boolean }): Universe {
    const unitA: UnitCard = {
      id: `u-a-${s}`, type: "unit", name: `内科-${s}`,
      unitKind: "department", configurationState: "configured", attributes: {},
    };
    const unitB: UnitCard = {
      id: `u-b-${s}`, type: "unit", name: `急诊-${s}`,
      unitKind: "department", configurationState: "configured", attributes: {},
    };
    const budget: BudgetCard = {
      id: `bg-${s}`, type: "budget", name: `绩效奖金池-${s}`,
      amount: 1_000_000, configurationState: "configured",
    };
    const relations: Relation[] = [];
    if (opts?.assignedToA !== false) {
      // budget_assign 方向：BudgetCard → UnitCard（endpointRules / mock 同构）
      relations.push({
        id: `rel-bg-a-${s}`, type: "budget_assign",
        sourceId: budget.id, targetId: unitA.id, active: true,
      });
    }
    return { s, unitA, unitB, budget, relations };
  }

  async function seed(ds: MockDataService, u: Universe): Promise<void> {
    const cards: AnyCard[] = [u.unitA, u.unitB, u.budget];
    await ds.saveCards(cards);
    await ds.saveRelations(u.relations);
  }

  function budgetSlotOf(unitId: string): CardSlot {
    return {
      id: `slot-${unitId}`, type: "budget", ownerCardId: unitId,
      enabled: true, locked: false, acceptedCardTypes: ["budget"],
      displayMode: "count", expanded: false,
    };
  }

  function workloadSlotOf(unitId: string): CardSlot {
    return { ...budgetSlotOf(unitId), type: "workload", acceptedCardTypes: ["workload"] };
  }

  // Type guards for budget relation outcomes
  function isBudgetResolved(result: DropTriggerResult): result is { outcome: "budget_resolved"; relationOutcome: "persisted" | "reused"; relation: Relation } {
    return result.outcome === "budget_resolved";
  }
  function isBudgetMoved(result: DropTriggerResult): result is { outcome: "budget_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation } {
    return result.outcome === "budget_moved";
  }
  function isNoOpSameUnit(result: DropTriggerResult): result is { outcome: "no_op_same_unit" } {
    return result.outcome === "no_op_same_unit";
  }
  function isUnassigned(result: DropTriggerResult): result is { outcome: "unassigned"; deactivatedRelation?: Relation } {
    return result.outcome === "unassigned";
  }
  function isIgnored(result: DropTriggerResult): result is { outcome: "ignored" } {
    return result.outcome === "ignored";
  }

  describe("U-UI-13 预算卡拖放", () => {
    let seq = 0;
    function nextSuffix(): string {
      seq += 1;
      return `bud${seq}`;
    }

    class MapDataTransfer implements DataTransferLike {
      private readonly values = new Map<string, string>();
      setData(type: string, value: string): void {
        this.values.set(type, value);
      }
      getData(type: string): string {
        return this.values.get(type) ?? "";
      }
    }

    interface Universe {
      s: string;
      unitA: UnitCard;
      unitB: UnitCard;
      budget: BudgetCard;
      relations: Relation[];
    }

    function buildUniverse(s: string, opts?: { assignedToA?: boolean }): Universe {
      const unitA: UnitCard = {
        id: `u-a-${s}`, type: "unit", name: `内科-${s}`,
        unitKind: "department", configurationState: "configured", attributes: {},
      };
      const unitB: UnitCard = {
        id: `u-b-${s}`, type: "unit", name: `急诊-${s}`,
        unitKind: "department", configurationState: "configured", attributes: {},
      };
      const budget: BudgetCard = {
        id: `bg-${s}`, type: "budget", name: `绩效奖金池-${s}`,
        amount: 1_000_000, configurationState: "configured",
      };
      const relations: Relation[] = [];
      if (opts?.assignedToA !== false) {
        // budget_assign 方向：BudgetCard → UnitCard（endpointRules / mock 同构）
        relations.push({
          id: `rel-bg-a-${s}`, type: "budget_assign",
          sourceId: budget.id, targetId: unitA.id, active: true,
        });
      }
      return { s, unitA, unitB, budget, relations };
    }

    async function seed(ds: MockDataService, u: Universe): Promise<void> {
      const cards: AnyCard[] = [u.unitA, u.unitB, u.budget];
      await ds.saveCards(cards);
      await ds.saveRelations(u.relations);
    }

    function budgetSlotOf(unitId: string): CardSlot {
      return {
        id: `slot-${unitId}`, type: "budget", ownerCardId: unitId,
        enabled: true, locked: false, acceptedCardTypes: ["budget"],
        displayMode: "count", expanded: false,
      };
    }

    function workloadSlotOf(unitId: string): CardSlot {
      return { ...budgetSlotOf(unitId), type: "workload", acceptedCardTypes: ["workload"] };
    }

    // Type guards for budget relation outcomes
    function isBudgetResolved(result: DropTriggerResult): result is { outcome: "budget_resolved"; relationOutcome: "persisted" | "reused"; relation: Relation } {
      return result.outcome === "budget_resolved";
    }
    function isBudgetMoved(result: DropTriggerResult): result is { outcome: "budget_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation } {
      return result.outcome === "budget_moved";
    }
    function isNoOpSameUnit(result: DropTriggerResult): result is { outcome: "no_op_same_unit" } {
      return result.outcome === "no_op_same_unit";
    }
    function isUnassigned(result: DropTriggerResult): result is { outcome: "unassigned"; deactivatedRelation?: Relation } {
      return result.outcome === "unassigned";
    }
    function isIgnored(result: DropTriggerResult): result is { outcome: "ignored" } {
      return result.outcome === "ignored";
    }

    describe("U-UI-13 预算卡拖放", () => {
      let seq = 0;
      function nextSuffix(): string {
        seq += 1;
        return `bud${seq}`;
      }

      class MapDataTransfer implements DataTransferLike {
        private readonly values = new Map<string, string>();
        setData(type: string, value: string): void {
          this.values.set(type, value);
        }
        getData(type: string): string {
          return this.values.get(type) ?? "";
        }
      }

      interface Universe {
        s: string;
        unitA: UnitCard;
        unitB: UnitCard;
        budget: BudgetCard;
        relations: Relation[];
      }

      function buildUniverse(s: string, opts?: { assignedToA?: boolean }): Universe {
        const unitA: UnitCard = {
          id: `u-a-${s}`, type: "unit", name: `内科-${s}`,
          unitKind: "department", configurationState: "configured", attributes: {},
        };
        const unitB: UnitCard = {
          id: `u-b-${s}`, type: "unit", name: `急诊-${s}`,
          unitKind: "department", configurationState: "configured", attributes: {},
        };
        const budget: BudgetCard = {
          id: `bg-${s}`, type: "budget", name: `绩效奖金池-${s}`,
          amount: 1_000_000, configurationState: "configured",
        };
        const relations: Relation[] = [];
        if (opts?.assignedToA !== false) {
          // budget_assign 方向：BudgetCard → UnitCard（endpointRules / mock 同构）
          relations.push({
            id: `rel-bg-a-${s}`, type: "budget_assign",
            sourceId: budget.id, targetId: unitA.id, active: true,
          });
        }
        return { s, unitA, unitB, budget, relations };
      }

      async function seed(ds: MockDataService, u: Universe): Promise<void> {
        const cards: AnyCard[] = [u.unitA, u.unitB, u.budget];
        await ds.saveCards(cards);
        await ds.saveRelations(u.relations);
      }

      function budgetSlotOf(unitId: string): CardSlot {
        return {
          id: `slot-${unitId}`, type: "budget", ownerCardId: unitId,
          enabled: true, locked: false, acceptedCardTypes: ["budget"],
          displayMode: "count", expanded: false,
        };
      }

      function workloadSlotOf(unitId: string): CardSlot {
        return { ...budgetSlotOf(unitId), type: "workload", acceptedCardTypes: ["workload"] };
      }

      // Type guards for budget relation outcomes
      function isBudgetResolved(result: DropTriggerResult): result is { outcome: "budget_resolved"; relationOutcome: "persisted" | "reused"; relation: Relation } {
        return result.outcome === "budget_resolved";
      }
      function isBudgetMoved(result: DropTriggerResult): result is { outcome: "budget_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation } {
        return result.outcome === "budget_moved";
      }
      function isNoOpSameUnit(result: DropTriggerResult): result is { outcome: "no_op_same_unit" } {
        return result.outcome === "no_op_same_unit";
      }
      function isUnassigned(result: DropTriggerResult): result is { outcome: "unassigned"; deactivatedRelation?: Relation } {
        return result.outcome === "unassigned";
      }
      function isIgnored(result: DropTriggerResult): result is { outcome: "ignored" } {
        return result.outcome === "ignored";
      }

      describe("U-UI-13 预算卡拖放", () => {
        let seq = 0;
        function nextSuffix(): string {
          seq += 1;
          return `bud${seq}`;
        }

        class MapDataTransfer implements DataTransferLike {
          private readonly values = new Map<string, string>();
          setData(type: string, value: string): void {
            this.values.set(type, value);
          }
          getData(type: string): string {
            return this.values.get(type) ?? "";
          }
        }

        interface Universe {
          s: string;
          unitA: UnitCard;
          unitB: UnitCard;
          budget: BudgetCard;
          relations: Relation[];
        }

        function buildUniverse(s: string, opts?: { assignedToA?: boolean }): Universe {
          const unitA: UnitCard = {
            id: `u-a-${s}`, type: "unit", name: `内科-${s}`,
            unitKind: "department", configurationState: "configured", attributes: {},
          };
          const unitB: UnitCard = {
            id: `u-b-${s}`, type: "unit", name: `急诊-${s}`,
            unitKind: "department", configurationState: "configured", attributes: {},
          };
          const budget: BudgetCard = {
            id: `bg-${s}`, type: "budget", name: `绩效奖金池-${s}`,
            amount: 1_000_000, configurationState: "configured",
          };
          const relations: Relation[] = [];
          if (opts?.assignedToA !== false) {
            // budget_assign 方向：BudgetCard → UnitCard（endpointRules / mock 同构）
            relations.push({
              id: `rel-bg-a-${s}`, type: "budget_assign",
              sourceId: budget.id, targetId: unitA.id, active: true,
            });
          }
          return { s, unitA, unitB, budget, relations };
        }

        async function seed(ds: MockDataService, u: Universe): Promise<void> {
          const cards: AnyCard[] = [u.unitA, u.unitB, u.budget];
          await ds.saveCards(cards);
          await ds.saveRelations(u.relations);
        }

        function budgetSlotOf(unitId: string): CardSlot {
          return {
            id: `slot-${unitId}`, type: "budget", ownerCardId: unitId,
            enabled: true, locked: false, acceptedCardTypes: ["budget"],
            displayMode: "count", expanded: false,
          };
        }

        function workloadSlotOf(unitId: string): CardSlot {
          return { ...budgetSlotOf(unitId), type: "workload", acceptedCardTypes: ["workload"] };
        }

        // Type guards for budget relation outcomes
        function isBudgetResolved(result: DropTriggerResult): result is { outcome: "budget_resolved"; relationOutcome: "persisted" | "reused"; relation: Relation } {
          return result.outcome === "budget_resolved";
        }
        function isBudgetMoved(result: DropTriggerResult): result is { outcome: "budget_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation } {
          return result.outcome === "budget_moved";
        }
        function isNoOpSameUnit(result: DropTriggerResult): result is { outcome: "no_op_same_unit" } {
          return result.outcome === "no_op_same_unit";
        }
        function isUnassigned(result: DropTriggerResult): result is { outcome: "unassigned"; deactivatedRelation?: Relation } {
          return result.outcome === "unassigned";
        }
        function isIgnored(result: DropTriggerResult): result is { outcome: "ignored" } {
          return result.outcome === "ignored";
        }

        it("Deck 预算卡拖入 budget 槽 = budget_assign 建立（方向 Budget→Unit），无解析无推荐", async () => {
          const s = nextSuffix();
          const u = buildUniverse(s, { assignedToA: false });
          const ds = new MockDataService();
          await seed(ds, u);

          const dt = new MapDataTransfer();
          onBudgetCardDragStart(dt, u.budget.id, "");
          const result = await onCardSlotDrop(ds, dt, budgetSlotOf(u.unitB.id));

          expect(isBudgetResolved(result)).toBe(true);
          if (!isBudgetResolved(result)) throw new Error("unreachable");
          expect(result.relationOutcome).toBe("persisted");
          const relations = await ds.getRelations();
          const newAssign = relations.find(
            (r) => r.active && r.type === "budget_assign" &&
              r.sourceId === u.budget.id && r.targetId === u.unitB.id
          );
          expect(newAssign).toBeDefined();
          expect(newAssign!.metadata?.origin).toBe("drop");
        });

        it("P2-1 幂等：重复拖入同单元槽 = 复用既有行不建第二条；交叉目标（budget 卡落 workload 槽）静默", async () => {
          const s = nextSuffix();
          const u = buildUniverse(s); // 已分配给 unitA
          const ds = new MockDataService();
          await seed(ds, u);
          const rowsBefore = (await ds.getRelations()).length;

          // 同单元重复拖入（Deck 来源）→ reused
          const dt = new MapDataTransfer();
          onBudgetCardDragStart(dt, u.budget.id, "");
          const result = await onCardSlotDrop(ds, dt, budgetSlotOf(u.unitA.id));
          expect(isBudgetResolved(result)).toBe(true);
          if (!isBudgetResolved(result)) throw new Error("unreachable");
          expect(result.relationOutcome).toBe("reused");
          expect((await ds.getRelations()).length).toBe(rowsBefore); // 不建第二条

          // budget 卡落 workload 槽（交叉目标）→ 静默取消
          const dtCross = new MapDataTransfer();
          onBudgetCardDragStart(dtCross, u.budget.id, "");
          const cross = await onCardSlotDrop(ds, dtCross, workloadSlotOf(u.unitB.id));
          expect(isIgnored(cross)).toBe(true);
        });

        it("预算芯片拖出槽外 = 解除（软删留痕）；拖到另一单元预算槽 = 移动；拖回原槽 = no-op", async () => {
          const s = nextSuffix();
          const u = buildUniverse(s); // budget 已分配给 unitA
          const ds = new MockDataService();
          await seed(ds, u);

          // 拖回原槽 = no-op
          const dtBack = new MapDataTransfer();
          onBudgetCardDragStart(dtBack, u.budget.id, u.unitA.id);
          const back = await onBudgetCardSlotDrop(ds, dtBack, budgetSlotOf(u.unitA.id));
          expect(back.outcome).toBe("no_op_same_unit");
          expect(
            (await ds.getRelations()).find((r) => r.id === `rel-bg-a-${s}`)!.active
          ).toBe(true);

// 槽间移动：unitA → unitB
          const dtMove = new MapDataTransfer();
          onBudgetCardDragStart(dtMove, u.budget.id, u.unitA.id);
          const moved = await onBudgetCardSlotDrop(ds, dtMove, budgetSlotOf(u.unitB.id));
          expect(moved.outcome).toBe("budget_moved");
          const relations = await ds.getRelations();
          expect(relations.find((r) => r.id === `rel-bg-a-${s}`)!.active).toBe(false); // 旧软删留痕
          expect(
            relations.some(
              (r) => r.active && r.type === "budget_assign" &&
                r.sourceId === u.budget.id && r.targetId === u.unitB.id
            )
          ).toBe(true);

          // 拖出槽外 = 解除 unitB 上的关系
          const dtOut = new MapDataTransfer();
          onBudgetCardDragStart(dtOut, u.budget.id, u.unitB.id);
          const out = await onBudgetCardDropOutsideSlots(ds, dtOut);
          const after = await ds.getRelations();
          expect(
            after.filter(
              (r) => r.type === "budget_assign" &&
                (r.sourceId === u.budget.id) &&
                (r.targetId === u.unitA.id || r.targetId === u.unitB.id)
              ).every((r) => !r.active)
          ).toBe(true); // 全部软删，行留痕
          // 行未被物理删除（审计留痕）
          expect(after.some((r) => r.id === `rel-bg-a-${s}`)).toBe(true);
        });

        it("unassignBudgetCard 幂等 no-op + 无效静默；revoked 预算卡拒绝", async () => {
          const s = nextSuffix();
          const u = buildUniverse(s, { assignedToA: false });
          const ds = new MockDataService();
          await seed(ds, u);

          // 无关系 → no_op
          const noRel = await unassignBudgetCard(ds, u.budget.id, u.unitA.id);
          expect(noRel.outcome).toBe("no_op");

          // 分配后解除
          const dt = new MapDataTransfer();
          onBudgetCardDragStart(dt, u.budget.id, "");
          await onCardSlotDrop(ds, dt, budgetSlotOf(u.unitA.id));
          const unassigned = await unassignBudgetCard(ds, u.budget.id, u.unitA.id);
          expect(unassigned.outcome).toBe("unassigned");
          expect(unassigned.deactivatedRelation).toBeDefined();

          // revoked 预算卡 → 静默 ignored
          await ds.saveCards([{ ...u.budget, businessStatus: "revoked" as const }]);
          const revoked = await unassignBudgetCard(ds, u.budget.id, u.unitA.id);
          expect(revoked.outcome).toBe("ignored");
        });
      });
    });
  });
});