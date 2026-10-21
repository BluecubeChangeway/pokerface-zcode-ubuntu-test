/**
 * 执行能力评估 - 最小声明式能力抽象
 * 
 * Capability 只回答：针对当前业务动作，当前系统是否存在合法执行路径？
 * 不暴露：GraphExecutor、DataSource、AggregateMethod、具体 Service 名称、具体算法实现
 */

export type ExecutionRoute = "unavailable" | "result_layer_aggregate" | "original_calculation_chain";

export interface ExecutionCapabilityAssessment {
  /** 当前业务动作是否存在合法执行路径 */
  executable: boolean;
  
  /** 执行路径类型：当前不可用 / Result层聚合 / 原始计算链 */
  route: "unavailable" | "result_layer_aggregate" | "original_calculation_chain";
  
  /** 不可执行时的原因（供用户/上层参考） */
  reason?: string;
}

/** 能力查询请求 - 只接受最小执行请求，不依赖完整 ResolutionContext */
export interface CapabilityQuery {
  /** 业务动作类型 */
  actionType: "aggregate" | "split" | "reuse" | "use_existing";
  
  /** Workload Definition ID - 决定统计语义 */
  definitionId: string;
  
  /** 用户明确选择的 Child Result IDs（仅 aggregate 相关） */
  selectedResultIds?: string[];
  
  /** 是否 partial 聚合 */
  isPartial?: boolean;
}

/** 由执行层实现，Resolution 只读 */
export interface CapabilityProvider {
  /** 评估当前业务动作的执行能力 */
  assess(query: CapabilityQuery): ExecutionCapabilityAssessment;
}

/** 推荐时刻的执行能力快照 - 记录在 Recommendation 中 */
export interface ExecutionFeasibilitySnapshot {
  /** 推荐生成时刻是否可执行 */
  feasibleAtRecommendation: boolean;
  
  /** 推荐时刻的执行路由 */
  routeAtRecommendation: "unavailable" | "result_layer_aggregate" | "original_calculation_chain";
  
  /** 评估时间 */
  assessedAt: string;
}