import type { Recommendation, UserDecision } from "../domain/recommendation/types";
import type { ResolutionRecommendation } from "../domain/workload/resolutionTypes";
import type { MatchingBasisSnapshot } from "../domain/workload/matchingBasisSnapshot";

/**
 * confirm_split 参数确认面板（Q-09-C Recommendation 操作流第一刀）
 *
 * 语义边界（D-145 裁定 A / D-148）：
 * - Recommendation.payload.splitPlan = 系统建议（advisory）——只作为 UI 初始值展示；
 * - UserDecision.splitParameters = 用户本次正式确认的执行参数——由本面板构造；
 * - 两者不是同一对象、不是同一语义；不存在任何 splitPlan → splitParameters 的
 *   自动 fallback；executor 不依赖 payload.splitPlan 补全。
 *
 * child Result identity（2026-10-07 修复）：
 * - splitPlan.children[].workloadResultId 是 engine 的 advisory 占位
 *   （`new-<parentResultId>-<targetUnitId>`），不具正式 identity 语义；
 * - 本面板**不输出** children[].id——省略后 splitService 按 D-148 自动生成
 *   `parent + executionBatchId + 统计锚点` 型 ID（D-145 规则 4 已授权的省略路径）；
 * - 草稿的 targetUnitId 仅供 UI 展示与 dimensions 构造，与 child Result id 无关。
 */

/** 单个 child 的 UI 编辑状态（从建议值复制而来，可编辑；非 payload 引用） */
export interface SplitChildDraft {
  name: string;
  value: number | null;
  /** 目标子 UnitCard ID（只读展示——用于 UI 说明与 dimensions 构造，不是 Result identity） */
  targetUnitId: string;
  resultSetId: string;
  resultItemId: string;
}

/** 面板编辑状态：建议值的深拷贝形式（复制成 UI 可编辑值，不引用 payload） */
export interface SplitDraft {
  parentResultId: string;
  children: SplitChildDraft[];
  splitType: "complete" | "partial";
}

/**
 * 从 Recommendation 取目标子 Unit ID 列表（结构化来源优先）：
 * 1.（优先）D-149 快照 mappingEvidences[].targetChildUnitId —— 对 split_workload +
 *    feasible 推荐证据门保证每个目标 child 都有 evidence；
 * 2.（展示 fallback）splitPlan 占位 ID 前缀 `new-<parentResultId>-<targetUnitId>` 解析——
 *    仅用于 targetUnitId 展示，严禁进入 children[].id。
 */
function targetUnitIdsFrom(
  payload: Partial<ResolutionRecommendation> & {
    matchingBasisSnapshot?: MatchingBasisSnapshot;
  }
): string[] {
  const snapshotIds: string[] = (payload.matchingBasisSnapshot?.mappingEvidences ?? []).map(
    (evidence) => evidence.targetChildUnitId
  );
  if (snapshotIds.length > 0) {
    return [...new Set(snapshotIds)];
  }
  if (payload.splitPlan) {
    const placeholderPrefix = `new-${payload.splitPlan.parentResultId}-`;
    return payload.splitPlan.children
      .map((child) =>
        child.workloadResultId.startsWith(placeholderPrefix)
          ? child.workloadResultId.slice(placeholderPrefix.length)
          : child.workloadResultId
      )
      .filter((targetId) => !payload.splitPlan?.children.some(
        (c) => c.workloadResultId === targetId && targetId.startsWith("new-")
      ));
  }
  return [];
}

/**
 * 从 Recommendation.payload.splitPlan 构造 UI 草稿（初始值 = 建议值）。
 * 逐字段复制：后续对 payload 的任何变更不影响草稿，反之亦然。
 */
export function draftFromRecommendation(
  recommendation: Recommendation
): SplitDraft | undefined {
  const payload = recommendation.payload as
    | (Partial<ResolutionRecommendation> & { matchingBasisSnapshot?: MatchingBasisSnapshot })
    | undefined;
  if (payload?.type !== "split_workload" || !payload.splitPlan) return undefined;
  const targetUnitIds = targetUnitIdsFrom(payload);
  const children: SplitChildDraft[] = targetUnitIds.map((targetUnitId) => ({
    name: targetUnitId,
    value: null, // 建议不含默认值（engine 明确不生成 splitRatio）——由用户填写
    targetUnitId,
    resultSetId: "",
    resultItemId: "",
  }));
  return {
    parentResultId: payload.splitPlan.parentResultId,
    children,
    splitType: "partial",
  };
}

/** 参数完整性：decision 合约的必填项（parentResultId + 每行 name/value/rs/ri）。非新增校验规则——仅为合约必填字段的发送前置。不含 child id（D-145 授权省略 → 系统按 D-148 生成）。 */
export function isSplitDraftComplete(draft: SplitDraft): boolean {
  if (!draft.parentResultId) return false;
  if (draft.children.length === 0) return false;
  for (const child of draft.children) {
    if (!child.name) return false;
    if (child.value === null) return false;
    if (!child.resultSetId || !child.resultItemId) return false;
  }
  return true;
}

/**
 * 从草稿构造正式 UserDecision.splitParameters。
 * 全部字段来自草稿（用户确认后的值），不读取 payload.splitPlan；
 * children[].id 默认省略（D-145 规则 4：省略 → splitService 按 D-148 生成
 * parent + executionBatchId + 统计锚点 型 ID）。
 */
export function buildSplitParameters(
  draft: SplitDraft
): NonNullable<UserDecision["splitParameters"]> {
  return {
    parentResultId: draft.parentResultId,
    children: draft.children.map((child) => ({
      name: child.name,
      value: child.value,
      dimensions: { departmentId: child.targetUnitId },
      resultSetId: child.resultSetId,
      resultItemId: child.resultItemId,
    })),
    splitType: draft.splitType,
  };
}
