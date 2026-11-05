import type { WorkloadDefinition } from "../domain/workload/types";

export const mockWorkloadDefinitions: WorkloadDefinition[] = [
  {
    id: "def-outpatient-visits",
    name: "门诊人次",
    sourceDataObjectId: "data-object-outpatient",
    conditions: [{ field: "visitType", operator: "=", value: "outpatient" }],
    dimensions: [
      { field: "departmentId", alias: "科室", order: 1 },
      { field: "doctorId", alias: "医生", order: 2 }
    ],
    statisticField: "visitCount",
    aggregationMethod: "count",
    calculationMethod: "count",
    timeField: "visitDate",
    version: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "def-neurosurgery-outpatient",
    name: "神经外科门诊人次",
    sourceDataObjectId: "data-object-outpatient",
    conditions: [
      { field: "visitType", operator: "=", value: "outpatient" },
      { field: "departmentId", operator: "=", value: "unit-neurosurgery" }
    ],
    dimensions: [{ field: "doctorId", alias: "医生", order: 1 }],
    statisticField: "visitCount",
    aggregationMethod: "count",
    calculationMethod: "count",
    timeField: "visitDate",
    version: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "def-internal-outpatient",
    name: "内科门诊人次",
    sourceDataObjectId: "data-object-outpatient",
    conditions: [
      { field: "visitType", operator: "=", value: "outpatient" },
      { field: "departmentId", operator: "=", value: "unit-internal-medicine" }
    ],
    dimensions: [{ field: "doctorId", alias: "医生", order: 1 }],
    statisticField: "visitCount",
    aggregationMethod: "count",
    calculationMethod: "count",
    timeField: "visitDate",
    version: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "def-orthopedics-outpatient",
    name: "骨科门诊人次",
    sourceDataObjectId: "data-object-outpatient",
    conditions: [
      { field: "visitType", operator: "=", value: "outpatient" },
      { field: "departmentName", operator: "contains", value: "骨科" }
    ],
    dimensions: [{ field: "departmentId", alias: "科室", order: 1 }],
    statisticField: "visitCount",
    aggregationMethod: "count",
    calculationMethod: "count",
    timeField: "visitDate",
    version: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "def-wang-outpatient",
    name: "王XX门诊人次",
    sourceDataObjectId: "data-object-outpatient",
    conditions: [
      { field: "visitType", operator: "=", value: "outpatient" },
      { field: "doctorId", operator: "=", value: "unit-wang-xx" }
    ],
    dimensions: [{ field: "departmentId", alias: "实际发生科室", order: 1 }],
    statisticField: "visitCount",
    aggregationMethod: "count",
    calculationMethod: "count",
    timeField: "visitDate",
    version: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "def-li-outpatient",
    name: "李XX门诊人次",
    sourceDataObjectId: "data-object-outpatient",
    conditions: [
      { field: "visitType", operator: "=", value: "outpatient" },
      { field: "doctorId", operator: "=", value: "unit-li-xx" }
    ],
    dimensions: [{ field: "departmentId", alias: "实际发生科室", order: 1 }],
    statisticField: "visitCount",
    aggregationMethod: "count",
    calculationMethod: "count",
    timeField: "visitDate",
    version: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "def-discharge-visits",
    name: "出院人次",
    sourceDataObjectId: "data-object-discharge",
    conditions: [{ field: "status", operator: "=", value: "discharged" }],
    dimensions: [
      { field: "wardId", alias: "病区", order: 1 },
      { field: "nursingTeamId", alias: "护理组", order: 2 },
      { field: "directorId", alias: "主任", order: 3 }
    ],
    statisticField: "dischargeCount",
    aggregationMethod: "count",
    calculationMethod: "count",
    timeField: "dischargeDate",
    version: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "def-disease-weight",
    name: "病种权重",
    sourceDataObjectId: "data-object-diagnosis",
    conditions: [],
    dimensions: [{ field: "departmentId", alias: "科室", order: 1 }],
    statisticField: "cost",
    aggregationMethod: "weighted",
    calculationMethod: "weighted",
    timeField: "costDate",
    version: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "def-surgery-count",
    name: "手术台次",
    sourceDataObjectId: "data-object-surgery",
    conditions: [{ field: "surgeryLevel", operator: "in", value: ["III", "IV"] }],
    dimensions: [{ field: "surgeonId", alias: "主刀医生", order: 1 }],
    statisticField: "surgeryCount",
    aggregationMethod: "count",
    calculationMethod: "count",
    timeField: "surgeryDate",
    version: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "def-herbal-amount",
    name: "中草药金额",
    sourceDataObjectId: "data-object-prescription",
    conditions: [{ field: "drugCategory", operator: "=", value: "herbal" }],
    dimensions: [{ field: "departmentId", alias: "科室", order: 1 }],
    statisticField: "amount",
    aggregationMethod: "sum",
    calculationMethod: "sum",
    timeField: "prescriptionDate",
    version: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "def-average-cost",
    name: "次均费用",
    sourceDataObjectId: "data-object-outpatient-cost",
    conditions: [],
    dimensions: [{ field: "departmentId", alias: "科室", order: 1 }],
    statisticField: "cost",
    aggregationMethod: "avg",
    calculationMethod: "avg",
    timeField: "costDate",
    version: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  }
];
