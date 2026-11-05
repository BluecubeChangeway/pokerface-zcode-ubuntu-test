import type { DataService } from "./DataService";
import type { WorkloadResult } from "../domain/workload/types";
import { matchReusableChildren } from "../domain/workload/provenance/splitProvenance";

/**
 * R3 Q3 复用可见性（用户批复：确认面板可见展示，不静默）：
 * 确认拆分前的**只读**预览——按当前事实预测每个拟拆分子项是否将复用既有产物。
 *
 * 边界：
 * - 纯查询（零写入、零推荐注册）；与执行器复用判定同一套纯函数
 *   （matchReusableChildren），预览结果与实际执行一致或保守（执行时以
 *   实时事实为准，D-157 规则 B）；
 * - 父结果不存在 → 全部未命中（不抛错——预览是提示信息，不阻塞确认）；
 * - 调用方对失败容忍（catch 后不渲染提示），确认执行不受预览失败影响。
 */
export async function previewSplitReuse(
  dataService: DataService,
  parentResultId: string,
  children: Array<{
    resultSetId: string;
    resultItemId: string;
    value: number | null;
    dimensions: Record<string, string>;
    period?: WorkloadResult["period"];
  }>
): Promise<(string | undefined)[]> {
  const [provenances, results] = await Promise.all([
    dataService.getSplitProvenances(),
    dataService.getWorkloadResults(),
  ]);
  const parent = results.find((r) => r.id === parentResultId);
  if (!parent) {
    return children.map(() => undefined);
  }
  return matchReusableChildren({
    provenanceRecords: provenances,
    origin: {
      parentWorkloadResultId: parentResultId,
      resultSetId: parent.resultSetId,
    },
    existingResults: new Map(results.map((r) => [r.id, r])),
    children: children.map((child) => ({ ...child, period: child.period ?? parent.period })),
  });
}
