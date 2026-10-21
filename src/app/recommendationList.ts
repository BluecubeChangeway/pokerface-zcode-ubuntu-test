import type { Recommendation } from "../domain/recommendation/types";
import type { ResolutionRecommendation } from "../domain/workload/resolutionTypes";
import type { MatchingBasisSnapshot } from "../domain/workload/matchingBasisSnapshot";

/**
 * Recommendation UI 最小纯 selector（Q-09-C Recommendation UI 第一刀）
 *
 * 职责仅限"store 数据 → 展示视图模型"的纯转换：
 * - 数据唯一来自 recommendationStore（调用方传入 store 读取结果）
 * - 不复制 Recommendation 到业务 state、不算 ID、不构造 payload
 * - 展示字段只取 payload 中已存在且语义明确的字段，不创造新文案语义
 */

/** 列表条目的展示视图模型（纯展示，无业务语义） */
export interface RecommendationListItem {
  id: string;
  kind: Recommendation["kind"];
  status: Recommendation["status"];
  createdAt: string;
  updatedAt: string;
  /** 推荐理由（Recommendation.reason，供 UI 展示的既有字段） */
  reason?: string;
  /** payload 中已存在且语义明确的最小展示信息（type / targetResultId），未定义则省略 */
  payloadType?: string;
  targetResultId?: string;
  /** 推荐产生时的 Matching Basis 快照（D-149；未携带则省略，不重算） */
  matchingBasis?: MatchingBasisSnapshot;
}

/** store → 列表视图模型（纯函数；同 ID upsert 天然只产生一条，UI 不做任何去重） */
export function toRecommendationListItems(
  recommendations: Recommendation[]
): RecommendationListItem[] {
  return recommendations.map((recommendation) => {
    // payload: unknown → 仅当 kind=resolution 且形状可识别时取已存在字段
    // D-149：matchingBasisSnapshot 是随推荐保存的深拷贝快照，selector 原样引用、不重算
    const payload = recommendation.payload as
      | (Partial<ResolutionRecommendation> & { matchingBasisSnapshot?: MatchingBasisSnapshot })
      | undefined;
    return {
      id: recommendation.id,
      kind: recommendation.kind,
      status: recommendation.status,
      createdAt: recommendation.createdAt,
      updatedAt: recommendation.updatedAt,
      reason: recommendation.reason,
      payloadType: payload && typeof payload.type === "string" ? payload.type : undefined,
      targetResultId:
        payload && typeof payload.targetResultId === "string"
          ? payload.targetResultId
          : undefined,
      matchingBasis: payload?.matchingBasisSnapshot,
    };
  });
}

/** 选中条目的详情视图模型（同样只取已存在字段） */
export interface RecommendationDetail extends RecommendationListItem {}

export function toRecommendationDetail(
  recommendation: Recommendation | undefined
): RecommendationDetail | undefined {
  if (!recommendation) return undefined;
  return toRecommendationListItems([recommendation])[0];
}

/** 状态展示标签（纯展示映射，无业务语义） */
export const STATUS_LABEL: Record<Recommendation["status"], string> = {
  recommended: "待处理",
  accepted: "已接受",
  ignored: "已忽略",
  dismissed: "已驳回",
};
