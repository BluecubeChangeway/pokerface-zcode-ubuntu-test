import { beforeEach, describe, expect, it } from "vitest";
import type { AnyCard, UnitCard, WorkloadCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import type { WorkloadResult } from "../domain/workload/types";
import type { Recommendation } from "../domain/recommendation/types";
import { createWorkloadSplit } from "../domain/workload/splitService";
import { MockDataService } from "../services/MockDataService";
import { moveWorkloadCardAssignment } from "../services/moveRelationEntry";
import { buildResolutionRecommendationId } from "../services/resolutionTrigger";
import { recommendationStore } from "../stores/recommendationStore";

/**
 * R2 移动 / 解除关系（U-02，D-151 剩余②）行为测试 —— 用户 2026-10-21 裁定：
 * "把一张卡从一个单元的'口袋'拖到另一个 = 解除之前的关系又新建关系"
 * （语义记录见 AGENT/DECISIONS-AND-ASSUMPTIONS.md A-002）。
 *
 * 覆盖：移动全链（软删旧 + 幂等新建 + 旧配对反馈失效 + 新配对自动重推）、
 * 衍生卡与手工卡地位相同、同单元 no-op、目标端同键复用、无效参数静默、
 * from 无关系的纯指派、重试幂等收敛、失效边界（历史与他配对不误伤）。
 *
 * 口径：断言行为与状态结果（数据行、store 内容、返回值），非函数调用计数。
 */

let seq = 0;
function nextSuffix(): string {
  seq += 1;
  return `move${seq}`;
}

interface MoveUniverse {
  s: string;
  unitA: UnitCard;
  unitB: UnitCard;
  unitC: UnitCard;
  parentResult: WorkloadResult;
  parentCard: WorkloadCard;
  childResult: WorkloadResult;
  /** 拆分诞生的子卡（用户裁定：与手工卡地位相同） */
  childCard: WorkloadCard;
  handResult: WorkloadResult;
  /** 手工筛选命名的工作量卡 */
  handCard: WorkloadCard;
  relations: Relation[];
  splits: ReturnType<typeof createWorkloadSplit>["workloadSplits"];
}

function buildMoveUniverse(s: string, opts?: { assignChildToBoth?: boolean }): MoveUniverse {
  const unitA: UnitCard = {
    id: `u-a-${s}`, type: "unit", name: `内科-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const unitB: UnitCard = {
    id: `u-b-${s}`, type: "unit", name: `急诊-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const unitC: UnitCard = {
    id: `u-c-${s}`, type: "unit", name: `外科-${s}`,
    unitKind: "department", configurationState: "configured", attributes: {},
  };
  const parentResult: WorkloadResult = {
    id: `wr-parent-${s}`, resultSetId: `rs-${s}`, resultItemId: `ri-parent-${s}`,
    name: `父结果-${s}`, value: 100, dimensions: {},
  };
  const parentCard: WorkloadCard = {
    id: `wl-parent-${s}`, type: "workload", name: `父卡-${s}`,
    workloadResultId: parentResult.id, configurationState: "configured",
  };
  const layerSplit = createWorkloadSplit({
    parentResultId: parentResult.id,
    children: [
      { name: `王医生-${s}`, value: 60, dimensions: {}, resultSetId: `rs-${s}`, resultItemId: `ri-c1-${s}` },
    ],
    splitType: "partial",
    executionBatchId: `batch-${s}`,
  }, parentResult);
  const childResult = layerSplit.childResults[0];
  const childCard: WorkloadCard = {
    id: `wl-child-${s}`, type: "workload", name: childResult.name,
    workloadResultId: childResult.id, configurationState: "configured",
  };
  const handResult: WorkloadResult = {
    id: `wr-hand-${s}`, resultSetId: `rs-hand-${s}`, resultItemId: `ri-hand-${s}`,
    name: `手工结果-${s}`, value: 7, dimensions: {},
  };
  const handCard: WorkloadCard = {
    id: `wl-hand-${s}`, type: "workload", name: `手工卡-${s}`,
    workloadResultId: handResult.id, configurationState: "configured",
  };
  const relations: Relation[] = [
    { id: `rel-split-c1-${s}`, type: "workload_split", sourceId: parentCard.id, targetId: childCard.id, active: true, metadata: { parentWorkloadResultId: parentResult.id, childWorkloadResultId: childResult.id } },
    // 拆分卡当前挂在 unitA"口袋"里
    { id: `rel-assign-child-a-${s}`, type: "workload_assign", sourceId: unitA.id, targetId: childCard.id, active: true, metadata: { origin: "drop" } },
  ];
  if (opts?.assignChildToBoth) {
    relations.push({
      id: `rel-assign-child-b-${s}`, type: "workload_assign",
      sourceId: unitB.id, targetId: childCard.id, active: true,
    });
  }
  return {
    s, unitA, unitB, unitC, parentResult, parentCard, childResult, childCard,
    handResult, handCard, relations, splits: layerSplit.workloadSplits,
  };
}

async function seed(ds: MockDataService, u: MoveUniverse): Promise<void> {
  const cards: AnyCard[] = [u.unitA, u.unitB, u.unitC, u.parentCard, u.childCard, u.handCard];
  await ds.saveCards(cards);
  await ds.saveWorkloadResults([u.parentResult, u.childResult, u.handResult]);
  await ds.saveRelations(u.relations);
  await ds.saveWorkloadSplits(u.splits);
}

function makeRec(
  id: string,
  workloadCardId: string,
  unitId: string,
  overrides?: { status?: Recommendation["status"]; kind?: Recommendation["kind"] }
): Recommendation {
  return {
    id,
    kind: overrides?.kind ?? "resolution",
    payload: { type: "use_existing_result" },
    status: overrides?.status ?? "recommended",
    createdAt: "2026-10-21T00:00:00.000Z",
    updatedAt: "2026-10-21T00:00:00.000Z",
    relatedEntityIds: [workloadCardId, unitId],
  };
}

function storeIds(): Set<string> {
  return new Set(recommendationStore.getState().recommendations.map((r) => r.id));
}

function storeById(id: string): Recommendation | undefined {
  return recommendationStore.getState().recommendations.find((r) => r.id === id);
}

describe("R2 移动/解除关系（U-02，用户 2026-10-21 裁定语义）", () => {
  beforeEach(() => {
    recommendationStore.getState().setRecommendations([]);
  });

  it("移动全链：解除旧关系（软删留痕）+ 幂等新建 + 旧配对反馈失效 + 新配对自动重推；拆分卡与手工卡同等对待", async () => {
    const s = nextSuffix();
    const u = buildMoveUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    // 当前反馈：(拆分卡, unitA) 旧建议在案（稳定 ID）
    const staleRecId = buildResolutionRecommendationId(u.childCard.id, u.unitA.id);
    recommendationStore.getState().setRecommendations([makeRec(staleRecId, u.childCard.id, u.unitA.id)]);
    const cardsBefore = new Set((await ds.getCards()).map((c) => c.id));
    const resultsBefore = new Set((await ds.getWorkloadResults()).map((r) => r.id));

    const result = await moveWorkloadCardAssignment(
      ds, u.childCard.id, u.unitA.id, u.unitB.id
    );

    expect(result.outcome).toBe("moved");
    expect(result.relationOutcome).toBe("persisted");
    expect(result.resubmittedResolution).toEqual({
      workloadCardId: u.childCard.id, targetUnitId: u.unitB.id,
    });
    // 旧关系：软删除留痕（行在、active=false），非物理删除
    const relations = await ds.getRelations();
    const oldRow = relations.find((r) => r.id === `rel-assign-child-a-${s}`);
    expect(oldRow).toBeDefined();
    expect(oldRow!.active).toBe(false);
    // 新关系：unitB → 卡 active，origin=move
    const newRow = relations.find(
      (r) => r.active && r.type === "workload_assign" &&
        r.sourceId === u.unitB.id && r.targetId === u.childCard.id
    );
    expect(newRow).toBeDefined();
    expect(newRow!.metadata?.origin).toBe("move");
    expect(result.relation!.id).toBe(newRow!.id);
    // 旧配对反馈失效（D-151：不提示、不保留当前反馈）
    expect(result.invalidatedRecommendationIds).toEqual([staleRecId]);
    expect(storeIds().has(staleRecId)).toBe(false);
    // 新配对自动重推（D-151 示例：自动 Resolution(A, C)）
    const newRecId = buildResolutionRecommendationId(u.childCard.id, u.unitB.id);
    expect(storeById(newRecId)?.status).toBe("recommended");
    // 零事实创建：卡与结果行集合不变
    expect(new Set((await ds.getCards()).map((c) => c.id))).toEqual(cardsBefore);
    expect(new Set((await ds.getWorkloadResults()).map((r) => r.id))).toEqual(resultsBefore);
  });

  it("手工卡移动行为与拆分卡一致（衍生卡与手工卡地位相同）", async () => {
    const s = nextSuffix();
    const u = buildMoveUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    // 手工卡当前挂在 unitC"口袋"里
    await ds.saveRelations([{
      id: `rel-assign-hand-c-${s}`, type: "workload_assign",
      sourceId: u.unitC.id, targetId: u.handCard.id, active: true, metadata: { origin: "drop" },
    }]);

    const result = await moveWorkloadCardAssignment(
      ds, u.handCard.id, u.unitC.id, u.unitA.id
    );

    expect(result.outcome).toBe("moved");
    const relations = await ds.getRelations();
    expect(
      relations.find((r) => r.id === `rel-assign-hand-c-${s}`)!.active
    ).toBe(false);
    expect(
      relations.find(
        (r) => r.active && r.type === "workload_assign" &&
          r.sourceId === u.unitA.id && r.targetId === u.handCard.id
      )
    ).toBeDefined();
    expect(storeById(buildResolutionRecommendationId(u.handCard.id, u.unitA.id))?.status).toBe("recommended");
  });

  it("同单元移动：no-op，零变化", async () => {
    const s = nextSuffix();
    const u = buildMoveUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    const staleRecId = buildResolutionRecommendationId(u.childCard.id, u.unitA.id);
    recommendationStore.getState().setRecommendations([makeRec(staleRecId, u.childCard.id, u.unitA.id)]);
    const relationsBefore = await ds.getRelations();

    const result = await moveWorkloadCardAssignment(
      ds, u.childCard.id, u.unitA.id, u.unitA.id
    );

    expect(result.outcome).toBe("no_op_same_unit");
    expect(result.relation).toBeUndefined();
    expect(result.resubmittedResolution).toBeUndefined();
    expect(await ds.getRelations()).toEqual(relationsBefore);
    expect(storeIds().has(staleRecId)).toBe(true); // 反馈不动
  });

  it("目标端已有同键 active 关系（共享场景）：旧关系解除、目标端复用不建第二条", async () => {
    const s = nextSuffix();
    const u = buildMoveUniverse(s, { assignChildToBoth: true });
    const ds = new MockDataService();
    await seed(ds, u);
    const rowsBefore = (await ds.getRelations()).length;

    const result = await moveWorkloadCardAssignment(
      ds, u.childCard.id, u.unitA.id, u.unitB.id
    );

    expect(result.outcome).toBe("moved");
    expect(result.relationOutcome).toBe("reused"); // 复用既有 (unitB, 卡) 行
    const relations = await ds.getRelations();
    expect(relations.find((r) => r.id === `rel-assign-child-a-${s}`)!.active).toBe(false);
    const activeToB = relations.filter(
      (r) => r.active && r.type === "workload_assign" &&
        r.sourceId === u.unitB.id && r.targetId === u.childCard.id
    );
    expect(activeToB).toHaveLength(1);
    expect(relations.length).toBe(rowsBefore); // 不建第二条：行数不变
  });

  it("无效参数静默 ignored：卡不存在 / 目标 Unit 不存在 / revoked 卡", async () => {
    const s = nextSuffix();
    const u = buildMoveUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    const relationsBefore = await ds.getRelations();

    expect(
      (await moveWorkloadCardAssignment(ds, `wl-none-${s}`, u.unitA.id, u.unitB.id)).outcome
    ).toBe("ignored");
    expect(
      (await moveWorkloadCardAssignment(ds, u.childCard.id, u.unitA.id, `u-none-${s}`)).outcome
    ).toBe("ignored");
    // revoked 卡（D-154：业务世界中等同不存在）
    const revokedChild: AnyCard = { ...u.childCard, businessStatus: "revoked" };
    await ds.saveCards([revokedChild]);
    expect(
      (await moveWorkloadCardAssignment(ds, u.childCard.id, u.unitA.id, u.unitB.id)).outcome
    ).toBe("ignored");
    expect(await ds.getRelations()).toEqual(relationsBefore); // 零写入
  });

  it("from 端无 active 关系（纯指派）：解除为 no-op，仍新建并重推", async () => {
    const s = nextSuffix();
    const u = buildMoveUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const result = await moveWorkloadCardAssignment(
      ds, u.childCard.id, u.unitC.id, u.unitB.id // unitC 无该卡的 assign
    );

    expect(result.outcome).toBe("moved");
    expect(result.deactivatedRelation).toBeUndefined();
    expect(result.relationOutcome).toBe("persisted");
    expect(storeById(buildResolutionRecommendationId(u.childCard.id, u.unitB.id))?.status).toBe("recommended");
  });

  it("重试幂等收敛：同一移动重复提交不产生重复行与重复反馈", async () => {
    const s = nextSuffix();
    const u = buildMoveUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);

    const first = await moveWorkloadCardAssignment(
      ds, u.childCard.id, u.unitA.id, u.unitB.id
    );
    expect(first.outcome).toBe("moved");
    expect(first.relationOutcome).toBe("persisted");
    const rowsAfterFirst = (await ds.getRelations()).length;

    const second = await moveWorkloadCardAssignment(
      ds, u.childCard.id, u.unitA.id, u.unitB.id
    );
    expect(second.outcome).toBe("moved");
    expect(second.relationOutcome).toBe("reused"); // 目标端已 active
    expect(second.deactivatedRelation).toBeUndefined(); // 旧关系已软删，无可再删
    expect((await ds.getRelations()).length).toBe(rowsAfterFirst); // 行数不变
    // 同 ID 反馈仍唯一（D-142 upsert）
    const recId = buildResolutionRecommendationId(u.childCard.id, u.unitB.id);
    expect(
      recommendationStore.getState().recommendations.filter((r) => r.id === recId)
    ).toHaveLength(1);
  });

  it("失效边界：accepted 历史与他配对（同卡他 Unit / 他卡同 Unit）的当前反馈不误伤", async () => {
    const s = nextSuffix();
    const u = buildMoveUniverse(s);
    const ds = new MockDataService();
    await seed(ds, u);
    const staleRecId = buildResolutionRecommendationId(u.childCard.id, u.unitA.id);
    const acceptedHistory = makeRec(`rec-acc-${s}`, u.childCard.id, u.unitA.id, { status: "accepted" });
    const recOnOtherUnit = makeRec(`rec-c-unitC-${s}`, u.childCard.id, u.unitC.id);
    const recOnOtherCard = makeRec(`rec-hand-unitA-${s}`, u.handCard.id, u.unitA.id);
    recommendationStore.getState().setRecommendations([
      makeRec(staleRecId, u.childCard.id, u.unitA.id),
      acceptedHistory, recOnOtherUnit, recOnOtherCard,
    ]);

    const result = await moveWorkloadCardAssignment(
      ds, u.childCard.id, u.unitA.id, u.unitB.id
    );

    expect(result.invalidatedRecommendationIds).toEqual([staleRecId]);
    const ids = storeIds();
    expect(ids.has(acceptedHistory.id)).toBe(true); // accepted 历史不动
    expect(storeById(acceptedHistory.id)!.status).toBe("accepted");
    expect(ids.has(recOnOtherUnit.id)).toBe(true); // 同卡他 Unit 不动
    expect(ids.has(recOnOtherCard.id)).toBe(true); // 他卡同 Unit 不动
  });
});
