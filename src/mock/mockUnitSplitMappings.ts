/**
 * 模拟"科室对应表"（W4，A-009 第二半 + A-011 裁定）
 *
 * 用户裁定（A-011）：科室对应表属数据准备阶段的人工工作（分析人员定义），
 * 当前用模拟数据推进开发（同 A-005 医生维度行先例——用事实性数据构造，不虚构业务规则）。
 *
 * 数据含义：当 sourceUnit 拖入 targetUnit 的 unit 槽时，系统查询此表——
 * 如果存在映射条目，提出"将拆分为：<newUnitName>"的推荐（推荐-确认流，不静默建事实）。
 *
 * 真实实现路径（Phase 2 数据清洗界面）：模板下载/上传 或 连连看式界面取唯一值对应。
 */

export interface UnitSplitMapping {
  /** 被拖入的单元卡（如"护理组"） */
  sourceUnitId: string;
  /** 拖入目标的单元卡（如"内科"） */
  targetUnitId: string;
  /** 拆分出的新单元卡名称（如"内科护理组"） */
  newUnitName: string;
  /** 新单元卡的 unitKind */
  newUnitKind: "department" | "team" | "ward" | "personnel";
}

export const mockUnitSplitMappings: UnitSplitMapping[] = [
  // 护理组按科室拆分（用户历史场景原例）
  { sourceUnitId: "unit-nursing-team", targetUnitId: "unit-internal-medicine", newUnitName: "内科护理组", newUnitKind: "team" },
  { sourceUnitId: "unit-nursing-team", targetUnitId: "unit-neurosurgery", newUnitName: "神经外科护理组", newUnitKind: "team" },
  { sourceUnitId: "unit-nursing-team", targetUnitId: "unit-emergency", newUnitName: "急诊科护理组", newUnitKind: "team" },
  { sourceUnitId: "unit-nursing-team", targetUnitId: "unit-neurosurgery-ward-1", newUnitName: "神经外科一病区护理组", newUnitKind: "team" },
  // 其他可能的映射（示例——未来由分析人员定义）
  { sourceUnitId: "unit-director", targetUnitId: "unit-neurosurgery", newUnitName: "神经外科主任", newUnitKind: "personnel" },
];

/** 查询映射表：sourceUnit 拖入 targetUnit 时是否存在拆分映射 */
export function findUnitSplitMapping(
  sourceUnitId: string,
  targetUnitId: string
): UnitSplitMapping | undefined {
  return mockUnitSplitMappings.find(
    (mapping) => mapping.sourceUnitId === sourceUnitId && mapping.targetUnitId === targetUnitId
  );
}
