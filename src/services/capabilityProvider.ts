import { 
  ExecutionCapabilityAssessment, 
  CapabilityQuery, 
  CapabilityProvider,
  ExecutionRoute 
} from "../domain/workload/executionCapability";
import type { ActionExecutorContext } from "./actionExecutor";
import type { WorkloadDefinition } from "../domain/workload/types";
import type { WorkloadCard } from "../domain/card/types";

/**
 * 默认 Capability Provider 实现
 * 当前 Aggregate 执行路径不可用，其他动作按现有逻辑处理
 */
export class DefaultCapabilityProvider implements CapabilityProvider {
  private context: ActionExecutorContext | null = null;

  /** 设置上下文供 Provider 使用 */
  setContext(context: ActionExecutorContext): void {
    this.context = context;
  }

  /** 评估当前业务动作的执行能力 */
  assess(query: { actionType: string; definitionId: string; selectedResultIds?: string[]; isPartial?: boolean }): { executable: boolean; route: "unavailable" | "result_layer_aggregate" | "original_calculation_chain"; reason?: string } {
    switch (query.actionType) {
      case "aggregate":
        return this.assessAggregateCapability(query.definitionId, query.selectedResultIds, query.isPartial);
      
      case "split":
        return this.assessSplitCapability(query.definitionId);
      
      case "reuse":
      case "use_existing":
        // 这些动作已有完整执行实现
        return { executable: true, route: "original_calculation_chain" as const };
      
      default:
        return { 
          executable: false, 
          route: "unavailable", 
          reason: `未知的动作类型: ${query.actionType}` 
        };
    }
  }

  /** 评估聚合执行能力 */
  private assessAggregateCapability(
    definitionId: string, 
    selectedResultIds?: string[], 
    isPartial?: boolean
  ): { executable: boolean; route: "unavailable" | "result_layer_aggregate" | "original_calculation_chain"; reason?: string } {
    if (!this.context) {
      return { 
        executable: false, 
        route: "unavailable", 
        reason: "缺少 ResolutionContext，无法评估聚合执行能力" 
      };
    }

    // 获取 Definition
    const definition = this.context.workloadDefinitionMap?.get(definitionId);
    if (!definition) {
      return { 
        executable: false, 
        route: "unavailable", 
        reason: `找不到 WorkloadDefinition: ${definitionId}` 
      };
    }

    const calcType = definition.calculation?.type;

    // 当前系统 Aggregate 完整执行路径不可用
    // count/sum 理论上可在 Result 层聚合，但缺乏 C1-C7 安全条件验证机制
    // avg/weighted/formula/custom 必须走原始计算链，但缺少 DataSource/原始数据访问
    // 因此当前 Aggregate 整体不可用

    const calcTypeLabel = calcType || "未知";
    
    if (calcType === "count" || calcType === "sum") {
      // count/sum 理论上可在 Result 层聚合，但当前缺乏 C1-C7 安全条件验证
      return { 
        executable: false, 
        route: "unavailable", 
        reason: `Definition 类型 ${calcTypeLabel} 理论可在 Result 层聚合，但当前缺乏统计分区安全验证机制（C1-C7），无法保证聚合安全` 
      };
    }

    // avg/weighted/formula/custom 必须走原始计算链
    return { 
      executable: false, 
      route: "unavailable", 
      reason: `Definition 类型 ${calcTypeLabel} 必须走原始计算链，但当前缺少原始数据访问能力、Snapshot 反向索引、执行入口编排` 
    };
  }

  /** 评估分解执行能力 */
  private assessSplitCapability(definitionId: string): { executable: boolean; route: "unavailable" | "result_layer_aggregate" | "original_calculation_chain"; reason?: string } {
    // Split 已有完整执行实现
    return { 
      executable: true, 
      route: "original_calculation_chain" as const 
    };
  }
}

/** 创建默认 Provider 实例 */
export function createDefaultCapabilityProvider(): CapabilityProvider {
  return new DefaultCapabilityProvider();
}