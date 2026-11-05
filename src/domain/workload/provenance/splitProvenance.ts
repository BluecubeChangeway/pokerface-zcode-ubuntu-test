import type { WorkloadResult } from "../types";

/**
 * 拆分溯源与跨批次复用（R3，用户 2026-10-21 裁定 A-003 + 2026-10-22 批复实施：
 * Q1 渠道初式 = 取用科室（经 dimensions 表达）；Q2 复用忽略新名直接用旧卡；
 * Q3 复用在确认面板可见展示。设计报告见 AGENT/R3-SPLIT-PROVENANCE-DESIGN.md）。
 *
 * 用户语义（本模块的全部依据）：
 * - 拆分 = 数据源按条件筛选统计形成结果 + 用条件本身命名卡片（非物理切分）；
 * - 拆分卡必须记住两件事：数据组的本源 + 拆解依据的筛选条件组；
 * - 两点一致的两次拆分 = 相同拆分过程；同一张源卡使用相同拆分过程 = 复用
 *   （D-157 规则 B 的"相同拆分原则/完整计算条件"判定依据就此落地）。
 *
 * 本模块为纯函数域层（零数据访问、零副作用）；持久化经 DataService 拆分溯源
 * 集合（查询投影，不进入 WorkloadSplit 身份字段，不改任何封板语义）。
 */

/** 拆分执行的一个条件项：与既有 D-148"顺序无业务语义"一致，条件组不依赖顺序 */
export interface SplitProvenanceCondition {
  /** 该条件产出的子结果 ID（复用时 = 被复用的既有结果 ID） */
  childResultId: string;
  resultSetId: string;
  resultItemId: string;
  value: number | null;
  dimensions: Record<string, string>;
}

/** 一次拆分执行的溯源记录（id = executionBatchId；upsert 幂等，重试收敛） */
export interface SplitProvenanceRecord {
  id: string;
  /** 本源：源结果 ID（拆分父对象） */
  parentWorkloadResultId: string;
  /** 本源：源结果所属 ResultSet（数据组的最深可得锚点；sourceDataObjects 仍 H-1 Deferred） */
  resultSetId: string;
  /** 本源：统计规则 ID（可推导时记录；比对时双侧都有才要求一致） */
  definitionId?: string;
  /** 本源：执行配置 ID（可推导时记录；比对时双侧都有才要求一致） */
  executionId?: string;
  /** 条件组（每个子卡一条） */
  conditions: SplitProvenanceCondition[];
  createdAt: string;
}

/** 溯源记录构建输入（confirm_split 提交阶段随拆分事实顺带落盘） */
export function buildSplitProvenance(input: {
  executionBatchId: string;
  parentResultId: string;
  resultSetId: string;
  definitionId?: string;
  executionId?: string;
  conditions: Array<Pick<SplitProvenanceCondition, "childResultId" | "resultSetId" | "resultItemId" | "value" | "dimensions">>;
  createdAt?: string;
}): SplitProvenanceRecord {
  return {
    id: input.executionBatchId,
    parentWorkloadResultId: input.parentResultId,
    resultSetId: input.resultSetId,
    ...(input.definitionId !== undefined ? { definitionId: input.definitionId } : {}),
    ...(input.executionId !== undefined ? { executionId: input.executionId } : {}),
    conditions: input.conditions.map((condition) => ({ ...condition, dimensions: { ...condition.dimensions } })),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

/**
 * 本源一致性（"相同拆分过程"判定的第一半）：
 * - 源结果一致（同 parentWorkloadResultId）且 ResultSet 一致；
 * - 统计规则 / 执行配置：**双侧都记录时才要求一致**（早期记录可能缺失——
 *   保守放宽，不做缺席推断）。
 */
export function provenanceOriginMatches(
  record: Pick<SplitProvenanceRecord, "parentWorkloadResultId" | "resultSetId" | "definitionId" | "executionId">,
  origin: {
    parentWorkloadResultId: string;
    resultSetId: string;
    definitionId?: string;
    executionId?: string;
  }
): boolean {
  if (record.parentWorkloadResultId !== origin.parentWorkloadResultId) return false;
  if (record.resultSetId !== origin.resultSetId) return false;
  if (record.definitionId !== undefined && origin.definitionId !== undefined) {
    if (record.definitionId !== origin.definitionId) return false;
  }
  if (record.executionId !== undefined && origin.executionId !== undefined) {
    if (record.executionId !== origin.executionId) return false;
  }
  return true;
}

/**
 * 复用内容等价（"相同拆分过程"判定的第二半，落在一个条件上）：
 * - 统计锚点（resultSetId + resultItemId）与维度一致 = 同一条件；
 * - 统计内容（value，null ≠ 0；period）一致 = 同一统计事实；
 * - **名称不参与比对**（用户批复 Q2：复用忽略本次新名，沿用旧卡）；
 * - id 是查找键，不比对。
 */
export function reusableContentEquals(
  existing: Pick<WorkloadResult, "resultSetId" | "resultItemId" | "value" | "dimensions" | "period">,
  proposed: {
    resultSetId: string;
    resultItemId: string;
    value: number | null;
    dimensions: Record<string, string>;
    period?: WorkloadResult["period"];
  }
): boolean {
  if (existing.resultSetId !== proposed.resultSetId) return false;
  if (existing.resultItemId !== proposed.resultItemId) return false;
  if ((existing.value ?? null) !== (proposed.value ?? null)) return false;
  const existingKeys = Object.keys(existing.dimensions).sort();
  const proposedKeys = Object.keys(proposed.dimensions).sort();
  if (existingKeys.length !== proposedKeys.length) return false;
  for (let i = 0; i < existingKeys.length; i++) {
    if (existingKeys[i] !== proposedKeys[i]) return false;
    if (existing.dimensions[existingKeys[i]] !== proposed.dimensions[proposedKeys[i]]) return false;
  }
  const existingPeriod = existing.period === undefined ? "absent" : JSON.stringify(existing.period);
  const proposedPeriod = proposed.period === undefined ? "absent" : JSON.stringify(proposed.period);
  if (existingPeriod !== proposedPeriod) return false;
  return true;
}

/**
 * 逐子项复用匹配（纯函数）：在同源溯源记录中查找与拟拆分条件一致的既有产物。
 *
 * 匹配规则（D-154 + D-157 规则 B）：
 * - 候选 = 同源（provenanceOriginMatches）记录的条件项所登记的子结果 ID；
 * - 复用仅当：子结果在当前事实中存在、未被撤回（D-154：revoked = 业务不存在）
 *   且统计内容等价（reusableContentEquals）；
 * - 已被物理删除（全路径撤回）或软失效的产物自然落选——撤回后重拆 = 新建
 *   （设计报告场景 2）。
 *
 * @returns 与 children 等长的数组：命中项为被复用的既有结果 ID，未命中为 undefined。
 */
export function matchReusableChildren(
  options: {
    provenanceRecords: SplitProvenanceRecord[];
    /** 排除本批次自己的溯源记录（retry 一致性由专用路径保证，不走匹配） */
    excludeRecordId?: string;
    origin: {
      parentWorkloadResultId: string;
      resultSetId: string;
      definitionId?: string;
      executionId?: string;
    };
    /** 既有结果查找表（id → result；由调用方从 DataService 装载） */
    existingResults: Map<string, WorkloadResult>;
    /** 拟拆分子项条件（顺序与 children 一致） */
    children: Array<{
      resultSetId: string;
      resultItemId: string;
      value: number | null;
      dimensions: Record<string, string>;
      period?: WorkloadResult["period"];
    }>;
  }
): (string | undefined)[] {
  const { provenanceRecords, excludeRecordId, origin, existingResults, children } = options;
  const candidateResultIds = new Set<string>();
  for (const record of provenanceRecords) {
    if (excludeRecordId !== undefined && record.id === excludeRecordId) continue;
    if (!provenanceOriginMatches(record, origin)) continue;
    for (const condition of record.conditions) {
      candidateResultIds.add(condition.childResultId);
    }
  }
  return children.map((child) => {
    for (const resultId of candidateResultIds) {
      const candidate = existingResults.get(resultId);
      if (!candidate) continue;
      if (candidate.businessStatus === "revoked") continue;
      if (reusableContentEquals(candidate, child)) {
        return resultId;
      }
    }
    return undefined;
  });
}

/**
 * 本源一致性（"相同拆分过程"判定的第一半）：
 * - 源结果一致（同 parentWorkloadResultId）且 ResultSet 一致；
 * - 统计规则 / 执行配置：**双侧都记录时才要求一致**（早期记录可能缺失——
 *   保守放宽，不做缺席推断）。
 */