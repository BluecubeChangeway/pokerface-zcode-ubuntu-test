/**
 * Recommendation 领域类型
 *
 * 定位：通用“推荐层容器/生命周期对象”。
 * 不承担具体业务推荐语义（如 ResolutionRecommendation 的 matchType、splitPlan 等）。
 * 具体业务推荐语义由对应领域模型承担（如 resolutionTypes.ts 中的 ResolutionRecommendation）。
 *
 * 用途：
 * - 统一承载推荐的元数据与生命周期状态
 * - 通过 `kind` 标识推荐所属业务域
 * - 通过 `payload` 携带具体业务推荐对象（如 ResolutionRecommendation）
 */

export type RecommendationKind =
  | "resolution"      // 工作量-单元匹配推荐
  | "relation"        // 关系建议
  | "card"            // 卡片推荐
  | "budget_status"   // 预算状态推荐（A-007：Q-05 派生状态的展示接入，信息型无执行链）
  | "other";          // 其它

export type RecommendationStatus =
  | "recommended"     // 系统推荐，待用户处理
  | "accepted"        // 用户接受该推荐
  | "ignored"         // 用户忽略
  | "dismissed";      // 用户明确拒绝

/**
 * 用户决策 - 明确表达用户对推荐的选择
 * 不要用字符串 options 作为唯一控制方式。
 * 当前 Recommendation 类型不足以安全表达用户选择时，使用此类型。
 */
export interface UserDecision {
  /** 关联的推荐 ID */
  recommendationId: string;
  /** 用户选择的动作 */
  action: UserDecisionAction;
  /** 如涉及 aggregation，明确选择的 childResultIds */
  selectedChildResultIds?: string[];
  /** 如涉及 split，明确用户确认的 split 参数 */
  splitParameters?: {
    parentResultId: string;
    children: Array<{
      id?: string;
      name: string;
      value: number | null;
      dimensions: Record<string, string>;
      resultSetId: string;
      resultItemId: string;
    }>;
    splitType?: "complete" | "partial";
    reason?: string;
    tolerance?: number;
  };
  /** 如涉及 use_existing / use_existing_parent，明确目标 WorkloadCard ID */
  targetWorkloadCardId?: string;
  /** 如涉及 use_existing_with_confirmation，是否使用当前 WorkloadCard */
  useCurrent?: boolean;
  /** 如涉及 use_existing / use_existing_parent / find_existing_workload，明确源 UnitCard ID */
  sourceUnitId?: string;
  /** 决策时间 */
  decidedAt: string;
  /** 取消/拒绝原因（可选） */
  rejectionReason?: string;
}

/** 用户可执行的动作类型 */
export type UserDecisionAction =
  | "confirm_use_existing"           // 确认复用现有结果
  | "confirm_use_current"            // 确认使用当前 WorkloadResult
  | "confirm_split"                  // 确认拆分
  | "confirm_aggregate"              // 确认聚合
  | "confirm_use_existing_parent"    // 确认使用已有父级 Workload
  | "confirm_aggregate_children"     // 确认聚合子 Workload
  | "create_new_workload"            // 创建新 Workload
  | "create_new_relation"            // 创建新关系
  | "cancel"                         // 取消
  | "dismiss";                       // 明确拒绝

/**
 * 通用推荐容器
 *
 * 注意：
 * - `accepted` 仅表示“用户接受该推荐”，不等于已经创建 Domain Relation / WorkloadSplit 等业务事实。
 * - 业务事实的创建由外层应用/服务层在用户确认后执行。
 * - `cardId`、`targetCardId`、`targetSlotId` 不作为通用核心字段；
 *   如业务域需要，应放入 `payload` 中由具体业务推荐类型承担。
 */
export interface Recommendation {
  id: string;
  /** 推荐所属业务域 */
  kind: RecommendationKind;
  /** 业务推荐载荷（如 ResolutionRecommendation） */
  payload: unknown;
  /** 推荐理由/说明，供 UI 展示 */
  reason?: string;
  /** 推荐生命周期状态 */
  status: RecommendationStatus;
  /** 创建时间 */
  createdAt: string;
  /** 最后更新时间 */
  updatedAt: string;
  /** 可选：关联的业务对象 ID（用于查询/过滤），非核心业务字段 */
  relatedEntityIds?: string[];
}

/**
 * 类型守卫：检查是否为 Resolution 推荐
 * 实际业务类型推断由使用方根据 `kind` 进行。
 */
export function isResolutionRecommendation(rec: Recommendation): rec is Recommendation & { payload: import("../workload/resolutionTypes").ResolutionRecommendation } {
  return rec.kind === "resolution";
}