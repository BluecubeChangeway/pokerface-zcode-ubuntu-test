import type {
  ResolutionContext,
  WorkloadDefinition,
  MappingEvidence,
  WorkloadResult,
  ResultSet,
  CalculationSnapshot,
} from "./resolutionTypes";
import type { DataService } from "../../services/DataService";
import { isBusinessRevoked } from "./revocation/revocationService";

/**
 * 从 Relations 推导 Unit hierarchy（structure 关系）
 * Key: parent Unit ID；Value: child Unit ID[]
 * 生产路径与测试适配层共用的纯推导逻辑
 */
export function deriveUnitHierarchy(
  relations: {
    type: string;
    active: boolean;
    sourceId: string;
    targetId: string;
  }[]
): Map<string, string[]> {
  const unitHierarchy = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.type === "structure" && relation.active) {
      const children = unitHierarchy.get(relation.sourceId) || [];
      children.push(relation.targetId);
      unitHierarchy.set(relation.sourceId, children);
    }
  }
  return unitHierarchy;
}

/**
 * 从 Relations 推导 Workload hierarchy（workload_split 关系）
 * Key: parent WorkloadCard ID；Value: child WorkloadCard ID[]
 * 生产路径与测试适配层共用的纯推导逻辑
 */
export function deriveWorkloadHierarchy(
  relations: {
    type: string;
    active: boolean;
    sourceId: string;
    targetId: string;
  }[]
): Map<string, string[]> {
  const workloadHierarchy = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.type === "workload_split" && relation.active) {
      const children = workloadHierarchy.get(relation.sourceId) || [];
      children.push(relation.targetId);
      workloadHierarchy.set(relation.sourceId, children);
    }
  }
  return workloadHierarchy;
}

/**
 * 从 active workload_assign Relation 派生查询投影（生产路径与测试适配层共用）
 * endpoint 语义：source=UnitCard, target=WorkloadCard → 此处反向索引
 * Key: WorkloadCard ID（workload_assign.targetId）；Value: source UnitCard ID[]
 * 不假设一个 WorkloadCard 只 assign 给一个 Unit；仅消费 active === true 的 Relation
 */
export function deriveWorkloadAssignments(
  relations: {
    type: string;
    active: boolean;
    sourceId: string;
    targetId: string;
  }[]
): Map<string, string[]> {
  const workloadAssignments = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.type === "workload_assign" && relation.active) {
      const units = workloadAssignments.get(relation.targetId) || [];
      units.push(relation.sourceId);
      workloadAssignments.set(relation.targetId, units);
    }
  }
  return workloadAssignments;
}

/**
 * 从父级 WorkloadResult 对应的 ResultSet.items 派生 mapping evidence 查询投影。
 * Q-09-C 2026-10-03 裁定语义：ResultSet.items 中实际出现的维度值观测
 * = "该统计曾按该 Unit 区分统计"的正式证据。
 *
 * 边界（不得违反）：
 * - 只用 ResultItem.dimensions 实际观测值；不从 Unit hierarchy 反向制造；
 * - 不从 Definition.dimensions 配置推断；不从 workload_assign 推断；
 * - 非 target 子 Unit 的观测不生成；
 * - 同一 target child 只取首个实际观测项（当前模型未定义同 child 多证据语义）；
 * - sourceDataObjectId 优先取 Definition 正式引用（经 Snapshot 解析），
 *   退化用 ResultSet.sourceDataObjectId；两者皆无时不生成（不伪造必填 ID）；
 * - rowCount / confidence 当前无正式来源/规则，保持 undefined，不伪造；
 * - Unit 维度提取语义与 resolutionService 一致：departmentId ?? wardId。
 * 这是查询投影，不是 Domain Fact（D-001 / D-130 不变）。
 */
export function deriveMappingEvidences(
  workloadResult: Pick<WorkloadResult, "resultSetId"> | undefined,
  resultSets: ResultSet[],
  snapshots: CalculationSnapshot[],
  targetChildUnitIds: string[]
): MappingEvidence[] {
  if (!workloadResult || targetChildUnitIds.length === 0) {
    return [];
  }
  const resultSet = resultSets.find((rs) => rs.id === workloadResult.resultSetId);
  if (!resultSet) {
    return [];
  }

  const snapshot = snapshots.find((s) => s.id === resultSet.snapshotId);
  const sourceDataObjectId =
    snapshot?.definition?.sourceDataObjectId ?? resultSet.sourceDataObjectId;
  if (!sourceDataObjectId) {
    return [];
  }

  const evidences: MappingEvidence[] = [];
  const seenChildUnitIds = new Set<string>();
  for (const item of resultSet.items) {
    const unitValue = item.dimensions.departmentId ?? item.dimensions.wardId;
    if (!unitValue) continue;
    if (!targetChildUnitIds.includes(unitValue)) continue;
    if (seenChildUnitIds.has(unitValue)) continue;
    seenChildUnitIds.add(unitValue);
    evidences.push({
      sourceDataObjectId,
      targetChildUnitId: unitValue,
      matchedDimensionValues: item.dimensions,
      rowCount: undefined, // 无正式来源，不伪造
      confidence: undefined, // 无正式判定规则，不伪造
      evidenceDescription: `来自父级 ResultSet "${resultSet.id}" 的实际维度观测（ResultItem ${item.id}），证明该统计曾按 ${unitValue} 区分统计；不表示系统已确认映射关系`,
    });
  }
  return evidences;
}

/**
 * ResolutionContextBuilder
 * D-139：ResolutionContext 的唯一构建入口。
 * 生产环境从 DataService 获取数据，本文件不 import 任何 mock 模块。
 *
 * 纯构建器，无副作用，不包含业务逻辑。
 * 测试专用路径（从 mock 数据构建）位于 src/mock/mockResolutionContextBuilder.ts。
 */
export class ResolutionContextBuilder {
  /**
   * 生产路径：从 DataService 获取正式数据构建 ResolutionContext
   */
  async buildFromDataService(
    dataService: DataService,
    workloadCardId: string,
    targetUnitId: string
  ): Promise<ResolutionContext> {
    const [allCards, relations, allResults, resultSets, snapshots, executions] =
      await Promise.all([
        dataService.getCards(),
        dataService.getRelations(),
        dataService.getWorkloadResults(),
        dataService.getResultSets(),
        dataService.getCalculationSnapshots(),
        dataService.getWorkloadExecutions(),
      ]);

    // D-154：revoked 对象在业务世界中等同不存在——不进入 ResolutionContext，
    // 不作为 existing 候选，不参与 Recommendation。缺省（undefined）= active。
    const cards = allCards.filter((c) => !isBusinessRevoked(c));
    const existingResults = allResults.filter((r) => !isBusinessRevoked(r));

    const workloadCard = cards.find(
      (c) => c.id === workloadCardId && c.type === "workload"
    );
    const targetUnit = cards.find(
      (c) => c.id === targetUnitId && c.type === "unit"
    );

    if (!workloadCard || !targetUnit) {
      throw new Error(
        `找不到 Card: workloadCard=${workloadCardId}, targetUnit=${targetUnitId}`
      );
    }

    // 构建 existingCards 映射
    const existingCards = new Map(
      cards.map((c) => [
        c.id,
        {
          id: c.id,
          type: c.type,
          name: (c as any).name,
          workloadResultId: (c as any).workloadResultId,
        },
      ])
    );

    // 构建 workloadCards 映射（仅 workload 类型）
    const workloadCards = new Map<
      string,
      { id: string; type: string; workloadResultId?: string }
    >();
    for (const card of cards) {
      if (card.type === "workload") {
        workloadCards.set(card.id, {
          id: card.id,
          type: card.type,
          workloadResultId: (card as any).workloadResultId,
        });
      }
    }

    // 从 Relations 推导两个 hierarchy
    const unitHierarchy = deriveUnitHierarchy(relations);
    const workloadHierarchy = deriveWorkloadHierarchy(relations);

    // 从同一次取数派生第三张查询投影：active workload_assign 反向索引
    // （不引入第二次 getRelations()；D-001：Relations 仍是唯一事实源，此为查询投影）
    const workloadAssignments = deriveWorkloadAssignments(relations);

    // 第四张投影：父级 WorkloadResult 对应 ResultSet.items 的 mapping evidence
    // 查询投影（Q-09-C 2026-10-03 裁定语义；不新增取数，全部来自既有 fetch）
    const parentWorkloadResult = (workloadCard as any).workloadResultId
      ? existingResults.find((r) => r.id === (workloadCard as any).workloadResultId)
      : undefined;
    const targetChildUnitIds = unitHierarchy.get(targetUnitId) || [];
    const mappingEvidences = deriveMappingEvidences(
      parentWorkloadResult,
      resultSets,
      snapshots,
      targetChildUnitIds
    );

    // 从 executions 的 definitionId 构建 definitionMap。
    // Definition 缺失时抛出明确错误（指出缺失的 definitionId），
    // 而不是让后续 map 构建在 undefined.id 上崩溃。
    const definitionIds = [...new Set(executions.map((e) => e.definitionId))];
    const definitions: WorkloadDefinition[] = [];
    for (const definitionId of definitionIds) {
      const definition = await dataService.getWorkloadDefinition(definitionId);
      if (!definition) {
        throw new Error(
          `找不到 WorkloadDefinition: definitionId=${definitionId}`
        );
      }
      definitions.push(definition);
    }

    return {
      workloadCard: workloadCard as any,
      targetUnit: targetUnit as any,
      existingResults,
      resultSets,
      snapshots,
      unitHierarchy,
      workloadHierarchy,
      workloadAssignments,
      existingCards,
      workloadCards,
      workloadDefinitionMap: new Map(definitions.map((d) => [d.id, d])),
      workloadExecutionMap: new Map(executions.map((e) => [e.id, e])),
      // sourceDataObjects 仍无正式生产来源（Data Object 模型等待 Phase 2，不伪造）
      // mappingEvidences = 父级 ResultSet.items 的正式查询投影
      sourceDataObjects: undefined,
      mappingEvidences,
    };
  }
}

// 生产默认实例
export const defaultResolutionContextBuilder = new ResolutionContextBuilder();
