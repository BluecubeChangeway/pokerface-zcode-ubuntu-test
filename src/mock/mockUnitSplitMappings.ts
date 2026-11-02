import type { MappingEvidence } from "../domain/workload/resolutionTypes";

/**
 * 单元拆分映射 Mock 数据（W4-1）
 *
 * 语义（Q-09-C 2026-10-03 裁定）：
 * - 仅记录"父级 WorkloadResult 对应的 ResultSet 实际观测到的维度值"
 * - 即：统计事实中出现过 departmentId=xxx / wardId=yyy 的记录
 * - 这组数据供 ResolutionContextBuilder.deriveMappingEvidences 使用
 * - 不从 Unit hierarchy 反向制造，不从 Definition.dimensions 推断
 *
 * 当前覆盖场景：
 * 1. 门诊人次 (data-object-outpatient) → departmentId 维度观测到：神经外科、骨科、急诊、内科
 * 2. 出院人次 (data-object-discharge) → wardId 维度观测到：神经外科一病区、骨科病区、急诊病区
 * 3. 中草药金额 (data-object-prescription) → departmentId 维度观测到：神经外科、内科、急诊等
 */

export const mockUnitSplitMappings: MappingEvidence[] = [
  // ===== 门诊人次 sourceDataObjectId: data-object-outpatient =====
  // 父级 ResultSet: rs-snapshot-outpatient-2025
  // 实际观测到的 departmentId 值：unit-neurosurgery, unit-orthopedics, unit-emergency, unit-internal-medicine
  {
    sourceDataObjectId: "data-object-outpatient",
    targetChildUnitId: "unit-neurosurgery",
    matchedDimensionValues: { departmentId: "unit-neurosurgery" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-outpatient-2025" 的实际维度观测（ResultItem ri-outpatient-neurosurgery），证明该统计曾按 unit-neurosurgery 区分统计；不表示系统已确认映射关系',
  },
  {
    sourceDataObjectId: "data-object-outpatient",
    targetChildUnitId: "unit-orthopedics",
    matchedDimensionValues: { departmentId: "unit-orthopedics" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-outpatient-2025" 的实际维度观测（ResultItem ri-outpatient-orthopedics），证明该统计曾按 unit-orthopedics 区分统计；不表示系统已确认映射关系',
  },
  {
    sourceDataObjectId: "data-object-outpatient",
    targetChildUnitId: "unit-emergency",
    matchedDimensionValues: { departmentId: "unit-emergency" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-outpatient-2025" 的实际维度观测（ResultItem ri-outpatient-emergency），证明该统计曾按 unit-emergency 区分统计；不表示系统已确认映射关系',
  },
  {
    sourceDataObjectId: "data-object-prescription",
    targetChildUnitId: "unit-emergency",
    matchedDimensionValues: { departmentId: "unit-emergency" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-herbal-amount" 的实际维度观测，证明该统计曾按 unit-emergency 区分统计；不表示系统已确认映射关系',
  },
  // ===== 单元拆分映射：护理组拖入内科 =====
  // 源单元：unit-nursing-team (护理组) -> 目标单元：unit-internal-medicine (内科)
  // 映射证据：基于门诊人次统计中护理组归属内科的观测
  {
    sourceDataObjectId: "unit-nursing-team",
    targetChildUnitId: "unit-internal-medicine",
    matchedDimensionValues: { departmentId: "unit-internal-medicine" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-outpatient-2025" 的实际维度观测，证明护理组可拆分至内科',
    newUnitName: "内科护理组",
    newUnitKind: "team",
  },
  // 反向映射：内科拖入护理组
  {
    sourceDataObjectId: "unit-internal-medicine",
    targetChildUnitId: "unit-nursing-team",
    matchedDimensionValues: { departmentId: "unit-nursing-team" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-outpatient-2025" 的实际维度观测，证明内科可拆分至护理组',
    newUnitName: "护理组内科",
    newUnitKind: "team",
  },
  // 护理组拖入急诊
  {
    sourceDataObjectId: "unit-nursing-team",
    targetChildUnitId: "unit-emergency",
    matchedDimensionValues: { departmentId: "unit-emergency" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-outpatient-2025" 的实际维度观测，证明护理组可拆分至急诊',
  },
  // 内科拖入急诊
  {
    sourceDataObjectId: "unit-internal-medicine",
    targetChildUnitId: "unit-emergency",
    matchedDimensionValues: { departmentId: "unit-emergency" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-outpatient-2025" 的实际维度观测，证明内科可拆分至急诊',
  },
  // 急诊拖入内科
  {
    sourceDataObjectId: "unit-emergency",
    targetChildUnitId: "unit-internal-medicine",
    matchedDimensionValues: { departmentId: "unit-internal-medicine" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-outpatient-2025" 的实际维度观测，证明急诊可拆分至内科',
  },
  // 急诊拖入护理组
  {
    sourceDataObjectId: "unit-emergency",
    targetChildUnitId: "unit-nursing-team",
    matchedDimensionValues: { departmentId: "unit-nursing-team" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-outpatient-2025" 的实际维度观测，证明急诊可拆分至护理组',
  },
  {
    sourceDataObjectId: "data-object-outpatient",
    targetChildUnitId: "unit-internal-medicine",
    matchedDimensionValues: { departmentId: "unit-internal-medicine" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-outpatient-2025" 的实际维度观测（ResultItem ri-outpatient-internal），证明该统计曾按 unit-internal-medicine 区分统计；不表示系统已确认映射关系',
  },

  // ===== 出院人次 sourceDataObjectId: data-object-discharge =====
  // 父级 ResultSet: rs-snapshot-discharge-2025
  // 实际观测到的 wardId 值：unit-neurosurgery-ward-1, unit-orthopedics-ward, unit-emergency-ward
  {
    sourceDataObjectId: "data-object-discharge",
    targetChildUnitId: "unit-neurosurgery-ward-1",
    matchedDimensionValues: { wardId: "unit-neurosurgery-ward-1" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-discharge-2025" 的实际维度观测（ResultItem ri-discharge-neurosurgery），证明该统计曾按 unit-neurosurgery-ward-1 区分统计；不表示系统已确认映射关系',
  },
  {
    sourceDataObjectId: "data-object-discharge",
    targetChildUnitId: "unit-orthopedics-ward",
    matchedDimensionValues: { wardId: "unit-orthopedics-ward" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-discharge-2025" 的实际维度观测（ResultItem ri-discharge-orthopedics），证明该统计曾按 unit-orthopedics-ward 区分统计；不表示系统已确认映射关系',
  },
  {
    sourceDataObjectId: "data-object-discharge",
    targetChildUnitId: "unit-emergency-ward",
    matchedDimensionValues: { wardId: "unit-emergency-ward" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-discharge-2025" 的实际维度观测（ResultItem ri-discharge-emergency），证明该统计曾按 unit-emergency-ward 区分统计；不表示系统已确认映射关系',
  },

  // ===== 中草药金额 sourceDataObjectId: data-object-prescription =====
  // 父级 ResultSet: rs-snapshot-herbal-amount
  // 实际观测到的 departmentId 值：神经外科、内科、急诊等（按现有 Snapshot 推导）
  {
    sourceDataObjectId: "data-object-prescription",
    targetChildUnitId: "unit-neurosurgery",
    matchedDimensionValues: { departmentId: "unit-neurosurgery" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-herbal-amount" 的实际维度观测，证明该统计曾按 unit-neurosurgery 区分统计；不表示系统已确认映射关系',
  },
  {
    sourceDataObjectId: "data-object-prescription",
    targetChildUnitId: "unit-internal-medicine",
    matchedDimensionValues: { departmentId: "unit-internal-medicine" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-herbal-amount" 的实际维度观测，证明该统计曾按 unit-internal-medicine 区分统计；不表示系统已确认映射关系',
  },
  {
    sourceDataObjectId: "data-object-prescription",
    targetChildUnitId: "unit-emergency",
    matchedDimensionValues: { departmentId: "unit-emergency" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-herbal-amount" 的实际维度观测，证明该统计曾按 unit-emergency 区分统计；不表示系统已确认映射关系',
  },

  // ===== 病种权重 sourceDataObjectId: data-object-diagnosis =====
  // 父级 ResultSet: rs-snapshot-disease-weight-2025
  // 实际观测到的 departmentId 值：unit-orthopedics, unit-neurosurgery
  {
    sourceDataObjectId: "data-object-diagnosis",
    targetChildUnitId: "unit-orthopedics",
    matchedDimensionValues: { departmentId: "unit-orthopedics", diseaseGroup: "M78.1" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-disease-weight-2025" 的实际维度观测（ResultItem ri-dw-c1/c2/c4），证明该统计曾按 unit-orthopedics 区分统计；不表示系统已确认映射关系',
  },
  {
    sourceDataObjectId: "data-object-diagnosis",
    targetChildUnitId: "unit-neurosurgery",
    matchedDimensionValues: { departmentId: "unit-neurosurgery", diseaseGroup: "M78.1" },
    rowCount: undefined,
    confidence: undefined,
    evidenceDescription: '来自父级 ResultSet "rs-snapshot-disease-weight-2025" 的实际维度观测（ResultItem ri-dw-c3/c5/c6），证明该统计曾按 unit-neurosurgery 区分统计；不表示系统已确认映射关系',
  },

  // ===== 手术台次 sourceDataObjectId: data-object-surgery =====
  // 父级 ResultSet: rs-snapshot-surgery-count
  // 当前只有汇总值，无 surgeonId 维度观测（待补充）
  // 暂不生成 mapping evidence

  // ===== 次均费用 sourceDataObjectId: data-object-outpatient-cost =====
  // 父级 ResultSet: (待补充)
  // 暂不生成 mapping evidence
];

/**
 * 按 sourceDataObjectId 分组的便捷查询
 */
export function getMappingsBySourceDataObject(
  sourceDataObjectId: string
): MappingEvidence[] {
  return mockUnitSplitMappings.filter(
    (m) => m.sourceDataObjectId === sourceDataObjectId
  );
}

/**
 * 按 targetChildUnitId 查找映射证据
 */
export function getMappingsForChildUnit(
  targetChildUnitId: string
): MappingEvidence[] {
  return mockUnitSplitMappings.filter(
    (m) => m.targetChildUnitId === targetChildUnitId
  );
}

/**
 * 查找特定的单元拆分映射证据
 */
export function findUnitSplitMapping(
  sourceDataObjectId: string,
  targetChildUnitId: string
): MappingEvidence | undefined {
  return mockUnitSplitMappings.find(
    (m) =>
      m.sourceDataObjectId === sourceDataObjectId &&
      m.targetChildUnitId === targetChildUnitId
  );
}