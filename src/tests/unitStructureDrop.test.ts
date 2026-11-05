import { describe, expect, it } from "vitest";
import type { AnyCard, CardSlot, UnitCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import { MockDataService, resetMockDataService } from "../services/MockDataService";
import { moveUnitStructureAssignment, unassignUnitStructure } from "../services/unitRelationEntry";
import {
  onCardDropOutsideSlots,
  onCardSlotDrop,
  onUnitCardDragStart,
  onUnitCardSlotDragStart,
  type DataTransferLike,
} from "../../app/dropInteraction";
import type { StructureRelationOutcome, DropTriggerResult } from "../services/dropTrigger";

/**
 * A-009 第一半：单元卡拖入单元槽 = 组织结构从属（structure，Q-04 封板语义接线）行为测试：
 * - Deck 单元卡拖入 unit 槽 = structure 建立（方向 子Unit→父Unit；无 Resolution）；
 * - P2-1 幂等 + 自环禁止 + 交叉目标（unit 卡落 workload/budget 槽）静默 + revoked 静默；
 * - 单元芯片：拖出槽外 = 解除（软删留痕）；槽间 = 移动；拖回原槽 = no-op。
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `unit${seq}`;
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

function unit(id: string, name: string): UnitCard {
  return {
    id, type: "unit", name,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
}

function unitSlot(ownerId: string): CardSlot {
  return {
    id: `slot-${ownerId}`, type: "unit", ownerCardId: ownerId,
    enabled: true, locked: false, acceptedCardTypes: ["unit"],
    displayMode: "hand", expanded: false,
  };
}

function workloadSlot(ownerId: string): CardSlot {
  return { ...unitSlot(ownerId), type: "workload", acceptedCardTypes: ["workload"] };
}

// Type guards for structure relation outcomes
function isStructureResolved(result: DropTriggerResult): result is { outcome: "structure_resolved"; relationOutcome: "persisted" | "reused"; relation: Relation } {
  return result.outcome === "structure_resolved";
}
function isUnitMoved(result: DropTriggerResult): result is { outcome: "unit_moved"; relationOutcome: "persisted" | "reused"; relation: Relation; deactivatedRelation?: Relation } {
  return result.outcome === "unit_moved";
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

describe("A-009 单元卡组织结构接线", () => {
  let seq = 0;
  function nextSuffix(): string {
    seq += 1;
    return `unit${seq}`;
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

  function unit(id: string, name: string): UnitCard {
    return {
      id, type: "unit", name,
      unitKind: "department", configurationState: "configured", attributes: {},
    };
  }

  function unitSlot(ownerId: string): CardSlot {
    return {
      id: `slot-${ownerId}`, type: "unit", ownerCardId: ownerId,
      enabled: true, locked: false, acceptedCardTypes: ["unit"],
      displayMode: "hand", expanded: false,
    };
  }

  function workloadSlot(ownerId: string): CardSlot {
    return { ...unitSlot(ownerId), type: "workload", acceptedCardTypes: ["workload"] };
  }

  describe("A-009 单元卡组织结构接线", () => {
    beforeEach(() => {
      resetMockDataService();
    });
    let seq = 0;
    function nextSuffix(): string {
      seq += 1;
      return `unit${seq}`;
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

    function unit(id: string, name: string): UnitCard {
      return {
        id, type: "unit", name,
        unitKind: "department", configurationState: "configured", attributes: {},
      };
    }

    function unitSlot(ownerId: string): CardSlot {
      return {
        id: `slot-${ownerId}`, type: "unit", ownerCardId: ownerId,
        enabled: true, locked: false, acceptedCardTypes: ["unit"],
        displayMode: "hand", expanded: false,
      };
    }

    function workloadSlot(ownerId: string): CardSlot {
      return { ...unitSlot(ownerId), type: "workload", acceptedCardTypes: ["workload"] };
    }

    describe("A-009 单元卡组织结构接线", () => {
      let seq = 0;
      function nextSuffix(): string {
        seq += 1;
        return `unit${seq}`;
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

      function unit(id: string, name: string): UnitCard {
        return {
          id, type: "unit", name,
          unitKind: "department", configurationState: "configured", attributes: {},
        };
      }

      function unitSlot(ownerId: string): CardSlot {
        return {
          id: `slot-${ownerId}`, type: "unit", ownerCardId: ownerId,
          enabled: true, locked: false, acceptedCardTypes: ["unit"],
          displayMode: "hand", expanded: false,
        };
      }

      function workloadSlot(ownerId: string): CardSlot {
        return { ...unitSlot(ownerId), type: "workload", acceptedCardTypes: ["workload"] };
      }

      it("Deck 单元卡拖入 unit 槽 = structure 建立（子→父，无解析无推荐）", async () => {
        const s = nextSuffix();
        const parent = unit(`u-parent-${s}`, "神经外科");
        const child = unit(`u-child-${s}`, "一病区");
        const ds = new MockDataService();
        await ds.saveCards([parent, child]);

        const dt = new MapDataTransfer();
        onUnitCardDragStart(dt, child.id);
        const result = await onCardSlotDrop(ds, dt, unitSlot(parent.id));

        expect(result.outcome).toBe("structure_resolved");
        if (result.outcome !== "structure_resolved") throw new Error("unreachable");
        expect(result.relationOutcome).toBe("persisted");
        const relations = await ds.getRelations();
        // 方向：deriveUnitHierarchy 约定 sourceId = 父，targetId = 子
        const structure = relations.find(
          (r) => r.active && r.type === "structure" && r.sourceId === parent.id && r.targetId === child.id
        );
        expect(structure).toBeDefined();
        expect(structure!.metadata?.origin).toBe("drop");
      });

      it("P2-1 幂等 + 自环禁止 + 交叉目标静默 + revoked 静默", async () => {
        const s = nextSuffix();
        const parent = unit(`u-parent-${s}`, "神经外科");
        const child = unit(`u-child-${s}`, "一病区");
        const ds = new MockDataService();
        await ds.saveCards([parent, child]);

        // 幂等：重复拖入
        const dt1 = new MapDataTransfer();
        onUnitCardDragStart(dt1, child.id);
        await onCardSlotDrop(ds, dt1, unitSlot(parent.id));
        const dt2 = new MapDataTransfer();
        onUnitCardDragStart(dt2, child.id);
        const reuse = await onCardSlotDrop(ds, dt2, unitSlot(parent.id));
        expect(reuse.outcome).toBe("structure_resolved");
        if (reuse.outcome !== "structure_resolved") throw new Error("unreachable");
        expect(reuse.relationOutcome).toBe("reused");
        // 共享模块存储含演示链 structure——只断言本配对的行唯一（不建第二条）
        const mine = (await ds.getRelations()).filter(
          (r) => r.type === "structure" && r.sourceId === parent.id && r.targetId === child.id
        );
        expect(mine.length).toBe(1);

        // 自环禁止
        const dtSelf = new MapDataTransfer();
        onUnitCardDragStart(dtSelf, parent.id);
        const self = await onCardSlotDrop(ds, dtSelf, unitSlot(parent.id));
        expect(self.outcome).toBe("ignored");

        // 交叉目标：unit 卡落 workload 槽 → 静默
        const dtCross = new MapDataTransfer();
        onUnitCardDragStart(dtCross, child.id);
        const cross = await onCardSlotDrop(ds, dtCross, workloadSlot(parent.id));
        expect(cross.outcome).toBe("ignored");

        // revoked 单元卡 → 静默
        await ds.saveCards([{ ...child, businessStatus: "revoked" as const }]);
        const dtRevoked = new MapDataTransfer();
        onUnitCardDragStart(dtRevoked, child.id);
        const other = unit(`u-other-${s}`, "其他科室");
        await ds.saveCards([other]);
        const revokedResult = await onCardSlotDrop(ds, dtRevoked, unitSlot(other.id));
        expect(revokedResult.outcome).toBe("ignored");
      });

      it("单元芯片：槽间移动 + 拖出解除 + 拖回原槽 no-op", async () => {
        const s = nextSuffix();
        const parentA = unit(`u-pa-${s}`, "神经外科");
        const parentB = unit(`u-pb-${s}`, "内科");
        const child = unit(`u-child-${s}`, "一病区");
        const ds = new MockDataService();
        await ds.saveCards([parentA, parentB, child]);
        // 初始已挂 parentA
        await ds.saveRelations([{
          id: `rel-struct-${s}`, type: "structure",
          sourceId: parentA.id, targetId: child.id, active: true,
        }]);

        // 拖回原槽 no-op
        const dtBack = new MapDataTransfer();
        onUnitCardSlotDragStart(dtBack, child.id, parentA.id);
        const back = await onCardSlotDrop(ds, dtBack, unitSlot(parentA.id));
        expect(back.outcome).toBe("no_op_same_unit");

        // 槽间移动 parentA → parentB
        const dtMove = new MapDataTransfer();
        onUnitCardSlotDragStart(dtMove, child.id, parentA.id);
        const moved = await onCardSlotDrop(ds, dtMove, unitSlot(parentB.id));
        expect(moved.outcome).toBe("unit_moved");
        const relations = await ds.getRelations();
        expect(relations.find((r) => r.id === `rel-struct-${s}`)!.active).toBe(false); // 旧软删
        expect(
          relations.some(
            (r) => r.active && r.type === "structure" && r.sourceId === parentB.id && r.targetId === child.id
          )
        ).toBe(true);

        // 拖出槽外 = 解除
        const dtOut = new MapDataTransfer();
        onUnitCardSlotDragStart(dtOut, child.id, parentB.id);
        const out = await onCardDropOutsideSlots(ds, dtOut);
        expect(out.outcome).toBe("unassigned");
        const after = await ds.getRelations();
        expect(
          after.filter((r) => r.type === "structure" && r.targetId === child.id).every((r) => !r.active)
        ).toBe(true);
      });

      it("unassignUnitStructure 幂等 no-op + 无效静默", async () => {
        const s = nextSuffix();
        const parent = unit(`u-p-${s}`, "神经外科");
        const child = unit(`u-c-${s}`, "一病区");
        const ds = new MockDataService();
        await ds.saveCards([parent, child]);

        const noRel = await unassignUnitStructure(ds, child.id, parent.id);
        expect(noRel.outcome).toBe("no_op");

        const missing = await unassignUnitStructure(ds, `u-none-${s}`, parent.id);
        expect(missing.outcome).toBe("ignored");

        // moveUnitStructureAssignment 同单元 no-op
        const sameUnit = await moveUnitStructureAssignment(ds, child.id, parent.id, parent.id);
        expect(sameUnit.outcome).toBe("no_op_same_unit");
      });
    });
  });
});