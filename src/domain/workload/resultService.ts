import type { ResultItem, ResultSet, WorkloadResult } from "./types";

/**
 * 创建 WorkloadResult：只有 role = final 的 ResultItem 才能被引用。
 * 中间结果只能用于追溯，不能作为卡面业务结果。
 * 
 * WorkloadResult.period 继承自 ResultSet.period，保证结果期间的完整性。
 */
export function createWorkloadResult(
  id: string,
  name: string,
  resultSet: ResultSet,
  resultItemId: string
): WorkloadResult {
  const item = resultSet.items.find((entry) => entry.id === resultItemId);

  if (!item) {
    throw new Error(`ResultItem 不存在：${resultItemId}`);
  }

  if (item.roleInGraph === "intermediate") {
    throw new Error(
      `resultItemId=${resultItemId} 是中间结果（${item.outputColumnName ?? "未命名输出列"}），不允许成为 WorkloadResult`
    );
  }

  return {
    id,
    name,
    resultSetId: resultSet.id,
    resultItemId,
    value: item.value,
    dimensions: item.dimensions,
    period: resultSet.period
  };
}

export function collectDimensions(item: ResultItem): Record<string, string> {
  return { ...item.dimensions };
}