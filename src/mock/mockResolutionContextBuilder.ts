import type {
  ResolutionContext,
  SourceDataObject,
  WorkloadExecution,
} from "../domain/workload/resolutionTypes";
import {
  deriveUnitHierarchy,
  deriveWorkloadHierarchy,
  deriveWorkloadAssignments,
  deriveMappingEvidences,
} from "../domain/workload/resolutionContextBuilder";
import { mockCards } from "./mockCards";
import { mockRelations } from "./mockRelations";
import {
  mockWorkloadResults,
  mockWorkloadExecutions,
  mockCalculationGraphs,
  mockCalculationSnapshots,
  mockResultSets,
} from "./mockWorkloadChain";
import { mockWorkloadDefinitions } from "./mockWorkloadDefinitions";

export interface MockResolutionContextBuilderConfig {
  /** 如果为 true，从 mock 数据自动构建 sourceDataObjects 和 mappingEvidences（仅用于测试路径） */
  autoPopulateFromMock?: boolean;
}

/**
 * MockResolutionContextBuilder
 * 测试路径适配器：从 mock 数据构建 ResolutionContext，仅供单元测试使用。
 *
 * 生产代码不得使用此类（D-139）；
 * 生产环境使用 ResolutionContextBuilder.buildFromDataService()。
 *
 * hierarchy 推导复用生产 builder 导出的纯函数，保证测试路径与生产路径行为一致。
 */
export class MockResolutionContextBuilder {
  private config: { autoPopulateFromMock: boolean };

  constructor(config: MockResolutionContextBuilderConfig = {}) {
    this.config = { autoPopulateFromMock: true, ...config };
  }

  /**
   * 测试路径：从 mock 数据构建 ResolutionContext（仅供现有单元测试使用）
   */
  build(workloadCardId: string, targetUnitId: string): ResolutionContext {
    const workloadCard = mockCards.find(
      (c) => c.id === workloadCardId && c.type === "workload"
    );
    const targetUnit = mockCards.find(
      (c) => c.id === targetUnitId && c.type === "unit"
    );

    if (!workloadCard || !targetUnit) {
      throw new Error(
        `找不到测试数据: workloadCard=${workloadCardId}, targetUnit=${targetUnitId}`
      );
    }

    // 构建 unitHierarchy (从 structure relations 推导)
    const unitHierarchy = deriveUnitHierarchy(mockRelations);

    // 构建 workloadHierarchy (从 workload_split relations 推导)
    const workloadHierarchy = deriveWorkloadHierarchy(mockRelations);

    // 从同一次 mock relations 派生 workload_assign 查询投影（与生产路径保持一致）
    const workloadAssignments = deriveWorkloadAssignments(mockRelations);

    // mapping evidence：与生产一致的正式查询投影（父级 ResultSet.items），不再手工构造
    const parentWorkloadResult = (workloadCard as any).workloadResultId
      ? mockWorkloadResults.find((r) => r.id === (workloadCard as any).workloadResultId)
      : undefined;
    const targetChildUnitIds = unitHierarchy.get(targetUnitId) || [];
    const mappingEvidences = deriveMappingEvidences(
      parentWorkloadResult,
      mockResultSets,
      mockCalculationSnapshots,
      targetChildUnitIds
    );

    // 只有当 autoPopulateFromMock 为 true 时才构建 sourceDataObjects
    // （sourceDataObjects 仍为 mock 脚手架：Data Object 正式模型等待 Phase 2）
    const { sourceDataObjects } = this.config.autoPopulateFromMock
      ? this.buildSourceDataObjects()
      : { sourceDataObjects: undefined };

    return {
      workloadCard: workloadCard as any,
      targetUnit: targetUnit as any,
      existingResults: mockWorkloadResults,
      resultSets: mockResultSets,
      snapshots: mockCalculationSnapshots,
      unitHierarchy,
      workloadHierarchy,
      workloadAssignments,
      workloadDefinitionMap: new Map(
        mockWorkloadDefinitions.map((d) => [d.id, d])
      ),
      workloadExecutionMap: new Map(
        mockWorkloadExecutions.map((e) => [e.id, e])
      ),
      sourceDataObjects,
      mappingEvidences,
    };
  }

  /**
   * 构建 source data objects（mock 脚手架：Data Object 正式模型等待 Phase 2）
   * mappingEvidences 已改为 deriveMappingEvidences 正式投影，不再在此手工构造
   */
  private buildSourceDataObjects(): {
    sourceDataObjects: Map<string, SourceDataObject>;
  } {
    const sourceDataObjects = new Map<string, SourceDataObject>();

    // 为每个 workload execution 创建对应的 source data object
    for (const execution of mockWorkloadExecutions) {
      const definition = mockWorkloadDefinitions.find(
        (d) => d.id === execution.definitionId
      );
      if (definition) {
        const sourceDataObject: SourceDataObject = {
          id: `source-${execution.id}`,
          name: `${definition.name} 数据源`,
          coveredDimensions: this.extractCoveredDimensionsWithValues(execution),
          rowCount: undefined, // 无真实数据来源时保持 undefined
          updatedAt: undefined, // 无真实数据来源时保持 undefined
        };
        sourceDataObjects.set(sourceDataObject.id, sourceDataObject);
      }
    }

    return { sourceDataObjects };
  }

  /**
   * 从 WorkloadExecution 中提取覆盖的维度及其具体值
   * 基于 mock 数据的实际值填充
   */
  private extractCoveredDimensionsWithValues(
    execution: WorkloadExecution
  ): Record<string, string[]> {
    const dimensions: Record<string, string[]> = {};

    // 基于 mock 数据的实际值填充
    if (
      execution.id === "exec-outpatient-2025" ||
      execution.id === "exec-outpatient-2026-03"
    ) {
      dimensions["departmentId"] = [
        "unit-neurosurgery",
        "unit-neurosurgery-ward-1",
        "unit-neurosurgery-ward-2",
        "unit-intervention-room",
        "unit-internal-medicine",
        "unit-emergency",
        "unit-orthopedics",
      ];
      dimensions["doctorId"] = ["unit-wang-xx", "unit-li-xx"];
    } else if (execution.id === "exec-discharge-2025") {
      dimensions["wardId"] = [
        "unit-neurosurgery-ward-1",
        "unit-neurosurgery-ward-2",
        "unit-emergency-ward",
      ];
      dimensions["nursingTeamId"] = ["unit-nursing-team"];
      dimensions["directorId"] = ["unit-director"];
    } else if (execution.id === "exec-wang-outpatient") {
      dimensions["departmentId"] = ["unit-neurosurgery"];
      dimensions["doctorId"] = ["unit-wang-xx"];
    } else if (execution.id === "exec-li-outpatient") {
      dimensions["departmentId"] = ["unit-neurosurgery-ward-1"];
      dimensions["doctorId"] = ["unit-li-xx"];
    } else if (execution.id === "exec-disease-weight-2025") {
      dimensions["departmentId"] = ["unit-orthopedics", "unit-neurosurgery"];
    } else if (execution.id === "exec-surgery-count-2025") {
      dimensions["surgeonId"] = ["unit-surgeon-1", "unit-surgeon-2"];
    } else if (execution.id === "exec-herbal-amount-2025") {
      dimensions["departmentId"] = ["unit-orthopedics", "unit-neurosurgery"];
    }

    return dimensions;
  }
}

// 测试用默认实例
export const defaultMockResolutionContextBuilder =
  new MockResolutionContextBuilder({
    autoPopulateFromMock: true,
  });
