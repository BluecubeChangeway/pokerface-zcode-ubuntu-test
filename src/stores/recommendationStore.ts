import { createStore } from "zustand/vanilla";

import type { Recommendation, UserDecision, UserDecisionAction } from "../domain/recommendation/types";
import type { ActionExecutorContext, ActionExecutorResult } from "../services/actionExecutor";
import { executeUserDecision, handleCancelOrDismiss } from "../services/actionExecutor";
import { submitActionResult } from "../services/ActionSubmissionService";
import type { DataService } from "../services/DataService";

/**
 * 简单的深度相等比较，用于 Recommendation payload 一致性校验
 * 仅用于推荐层的结构化比较，不处理循环引用/复杂类型
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object" || typeof b !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

/**
 * 推荐状态机：
 * - recommended: 系统推荐，待用户处理
 * - accepted: 用户接受该推荐（不等于 Domain Fact 已创建，仅表示用户确认意图）
 * - ignored: 用户忽略（cancel 对应）
 * - dismissed: 用户明确拒绝（dismiss 对应）
 * 
 * 关键原则：accepted ≠ Fact。只有 ActionExecutor success=true 才更新为 accepted。
 */

export interface RecommendationState {
  recommendations: Recommendation[];
  /** 用户决策记录，用于审计/回溯 */
  userDecisions: UserDecision[];
  enabled: boolean;
  /** 正在执行的动作（防止并发） */
  executingAction: boolean;
  
  // 基础操作
  setRecommendations: (recommendations: Recommendation[]) => void;
  setEnabled: (enabled: boolean) => void;
  /**
   * 添加推荐（以 id 为身份：同 ID 后写覆盖，不同 ID 追加；不基于业务字段做全局去重）
   * 已处理（accepted / ignored / dismissed）的同 ID 推荐再次注册时重新置为 recommended
   * （D-142：处理过不代表永久禁止再次推荐）
   */
  addRecommendation: (recommendation: Recommendation) => void;
  /** 更新推荐状态（仅内部/测试使用，业务流程应通过 executeDecision/cancelOrDismiss） */
  updateRecommendationStatus: (id: string, status: Recommendation["status"]) => void;
  /** 移除推荐 */
  removeRecommendation: (id: string) => void;
  /** 根据 kind 过滤推荐 */
  getRecommendationsByKind: (kind: Recommendation["kind"]) => Recommendation[];
  /** 根据 ID 获取推荐 */
  getRecommendationById: (id: string) => Recommendation | undefined;
  /** 获取待处理的推荐（status === "recommended"） */
  getPendingRecommendations: () => Recommendation[];
  /** 获取用户决策历史 */
  getUserDecisions: (recommendationId?: string) => UserDecision[];
  
  // 生命周期管理
  /** 记录用户决策 - 仅保存决策，不改变 Recommendation status */
  recordUserDecision: (decision: UserDecision) => void;
  /** 执行用户决策 - 创建 Domain Fact，成功后才更新为 accepted */
  executeDecision: (
    decision: UserDecision,
    context: ActionExecutorContext
  ) => Promise<ActionExecutorResult>;
  /** 处理取消/拒绝 - 只更新状态，不创建 Domain Fact */
  cancelOrDismiss: (
    recommendationId: string,
    action: "cancel" | "dismiss",
    rejectionReason?: string,
    context?: ActionExecutorContext
  ) => Promise<ActionExecutorResult>;
  /** 批量清除已处理的推荐 */
  clearProcessedRecommendations: () => void;
}

export const recommendationStore = createStore<RecommendationState>((set, get) => {
  // 闭包内的执行锁：以 recommendationId 为 key，防止同一推荐并发执行
  const executingRecommendationIds = new Set<string>();
  
  return {
  recommendations: [],
  userDecisions: [],
  enabled: true,
  executingAction: false,
  
  setRecommendations: (recommendations) => set({ recommendations }),
  setEnabled: (enabled) => set({ enabled }),
  
  addRecommendation: (recommendation) =>
    set((state) => {
      // 以 id 为身份：同 ID 重复注册按"后写覆盖"，保证 store 内不会出现
      // 两条相同 id 的推荐；已处理（accepted / ignored / dismissed）的同 ID 推荐
      // 再次注册时重新置为 recommended（D-142：允许再次推荐，处理过不等于永久禁止）。
      // 不同 ID 正常追加；不引入基于业务字段的去重规则。
      const index = state.recommendations.findIndex((r) => r.id === recommendation.id);
      if (index === -1) {
        return { recommendations: [...state.recommendations, recommendation] };
      }
      const recommendations = [...state.recommendations];
      recommendations[index] = recommendation;
      return { recommendations };
    }),
  
  updateRecommendationStatus: (id, status) =>
    set((state) => ({
      recommendations: state.recommendations.map((r) =>
        r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
      )
    })),
  
  removeRecommendation: (id) =>
    set((state) => ({
      recommendations: state.recommendations.filter((r) => r.id !== id)
    })),
  
  getRecommendationsByKind: (kind) =>
    get().recommendations.filter((r) => r.kind === kind),
  
  getRecommendationById: (id) =>
    get().recommendations.find((r) => r.id === id),
  
  getPendingRecommendations: () =>
    get().recommendations.filter((r) => r.status === "recommended"),
  
  getUserDecisions: (recommendationId) =>
    recommendationId
      ? get().userDecisions.filter(d => d.recommendationId === recommendationId)
      : [...get().userDecisions],
  
  recordUserDecision: (decision) =>
    set((state) => ({
      userDecisions: [...state.userDecisions, decision]
      // 注意：不修改 recommendation status
      // confirm_* action 由 executeDecision 在 ActionExecutor 成功后更新为 accepted
      // cancel/dismiss 由 cancelOrDismiss 处理
    })),
  
  executeDecision: async (decision, context) => {
    set({ executingAction: true });
    
    // 推荐级执行锁：防止同一推荐并发执行
    const recId = decision.recommendationId;
    if (executingRecommendationIds.has(recId)) {
      set({ executingAction: false });
      throw new Error(`Recommendation ${recId} is already being executed`);
    }
    executingRecommendationIds.add(recId);
    
    try {
      // P2-6 门禁（2026-10-05）：cancel/dismiss 必须经 cancelOrDismiss 处理。
      // executeDecision 是 confirm 通道（ActionExecutor → ActionSubmissionService → accepted），
      // 不承担取消/拒绝语义；此前 handleCancelOrDismiss 在本通道下以 success=true 空转
      // 会导致误标 accepted。门禁只做通道隔离，不新增语义、不内部转发。
      if (decision.action === "cancel" || decision.action === "dismiss") {
        throw new Error(
          `cancel/dismiss 必须经 cancelOrDismiss 处理，不得经 executeDecision（action: ${decision.action}）`
        );
      }

      // 校验推荐存在且状态为 recommended
      const recommendation = get().getRecommendationById(decision.recommendationId);
      if (!recommendation) {
        throw new Error(`Recommendation not found: ${decision.recommendationId}`);
      }
      if (recommendation.status !== "recommended") {
        throw new Error(`Cannot execute decision on recommendation with status "${recommendation.status}": only "recommended" can accept actions`);
      }
      
      // 对于需要持久化的 confirm_* action，必须提供 dataService
      const confirmActions = ["confirm_use_existing", "confirm_use_current", "confirm_use_existing_parent", "confirm_split", "confirm_aggregate", "confirm_aggregate_children", "create_new_workload"];
      const isConfirmAction = confirmActions.includes(decision.action);
      if (isConfirmAction && !context.dataService) {
        throw new Error(`Action "${decision.action}" requires dataService for persistence`);
      }
      
      // 校验 context.recommendations 与 store 中的 Recommendation 一致
      const contextRecommendation = context.recommendations.get(decision.recommendationId);
      if (!contextRecommendation) {
        throw new Error(`Recommendation context mismatch: context.recommendations missing for id "${decision.recommendationId}"`);
      }
      // 比较关键业务字段，而不是对象引用
      if (
        contextRecommendation.id !== recommendation.id ||
        contextRecommendation.kind !== recommendation.kind ||
        !deepEqual(contextRecommendation.payload, recommendation.payload) ||
        contextRecommendation.status !== recommendation.status
      ) {
        throw new Error(`Recommendation context mismatch: context.recommendations entry differs from store for id "${decision.recommendationId}"`);
      }
      
      // 先记录决策
      get().recordUserDecision(decision);
      
      const result = await executeUserDecision(decision, context);
      
      // ActionExecutor 成功后，先持久化业务事实，再标记 accepted
      if (result.success && context.dataService) {
        try {
          // 先持久化业务事实
          await submitActionResult(result, context.dataService, decision.recommendationId);
          // 事实持久化成功后，才标记为 accepted
          set((state) => ({
            recommendations: state.recommendations.map((r) =>
              r.id === decision.recommendationId
                ? { ...r, status: "accepted", updatedAt: new Date().toISOString() }
                : r
            )
          }));
        } catch (persistError) {
          // 持久化失败：不标记 accepted，向上抛出错误
          console.error("Failed to persist action result:", persistError);
          throw persistError;
        }
      } else if (result.success && !context.dataService) {
        // confirm_* action 已在前面校验过 dataService，这里主要处理 cancel/dismiss
        // 理论上不会走到这里，但防御性编程
        throw new Error("Action succeeded but dataService is missing");
      }
      // 失败时保持原 status (recommended)，不提前 accepted
      
      return result;
    } finally {
      executingRecommendationIds.delete(recId);
      set({ executingAction: false });
    }
  },
  
  cancelOrDismiss: async (recommendationId, action, rejectionReason, context) => {
    set({ executingAction: true });
    
    // 推荐级执行锁：防止同一推荐并发执行（包括与 executeDecision 互斥）
    if (executingRecommendationIds.has(recommendationId)) {
      set({ executingAction: false });
      throw new Error(`Recommendation ${recommendationId} is already being executed`);
    }
    executingRecommendationIds.add(recommendationId);
    
    try {
      // 校验推荐存在且状态允许 cancel/dismiss
      const recommendation = get().getRecommendationById(recommendationId);
      if (!recommendation) {
        throw new Error(`Recommendation not found: ${recommendationId}`);
      }
      if (recommendation.status !== "recommended") {
        throw new Error(`Cannot ${action} recommendation with status "${recommendation.status}": only "recommended" can be cancelled or dismissed`);
      }
      
      // 必须提供有效的 context（包含现有业务事实用于校验）
      if (!context) {
        throw new Error("cancel/dismiss requires valid ActionExecutorContext for validation");
      }
      
      const decision: UserDecision = {
        recommendationId,
        action: action === "cancel" ? "cancel" : "dismiss",
        decidedAt: new Date().toISOString(),
        rejectionReason
      };
      
      // 记录决策
      get().recordUserDecision(decision);
      
      const result = handleCancelOrDismiss(recommendationId, action, rejectionReason, context);
      
      // 只有 result.success === true 时才更新状态
      if (result.success) {
        set((state) => ({
          recommendations: state.recommendations.map((r) =>
            r.id === recommendationId
              ? { 
                  ...r, 
                  status: action === "cancel" ? "ignored" : "dismissed", 
                  updatedAt: new Date().toISOString() 
                }
              : r
          )
        }));
      }
      // 失败时保持原 status (recommended)，不修改
      
      return result;
    } finally {
      executingRecommendationIds.delete(recommendationId);
      set({ executingAction: false });
    }
  },
  
clearProcessedRecommendations: () =>
    set((state) => ({
      recommendations: state.recommendations.filter(
        (r) => r.status === "recommended"
      )
    }))
}
});