import type {
  CalculationGraph,
  CalculationSnapshot,
  Period,
  ResultSet,
  WorkloadExecution,
  WorkloadResult
} from "../domain/workload/types";
import { createSnapshot } from "../domain/workload/snapshotService";
import { mockWorkloadDefinitions } from "./mockWorkloadDefinitions";
import type { RowRecord } from "../domain/workload/graphExecutor";
import type { PeriodMode } from "../domain/period/types";

/** 病种案例执行数据集（模拟 Data Object 的病历行数据） */
export const mockDiseaseCaseRows: RowRecord[] = [
  { caseId: "CASE-0001", diseaseGroup: "M78.1", departmentId: "unit-orthopedics", totalCost: 1800 },
  { caseId: "CASE-0002", diseaseGroup: "M78.1", departmentId: "unit-orthopedics", totalCost: 2000 },
  { caseId: "CASE-0003", diseaseGroup: "M78.1", departmentId: "unit-neurosurgery", totalCost: 2200 },
  { caseId: "CASE-0004", diseaseGroup: "A00.0", departmentId: "unit-orthopedics", totalCost: 2500 },
  { caseId: "CASE-0005", diseaseGroup: "A00.0", departmentId: "unit-neurosurgery", totalCost: 2100 },
  { caseId: "CASE-0006", diseaseGroup: "A00.0", departmentId: "unit-neurosurgery", totalCost: 2300 }
];

export const mockWorkloadExecutions: WorkloadExecution[] = [
  {
    id: "exec-outpatient-2025",
    definitionId: "def-outpatient-visits",
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" as PeriodMode },
    conditions: [{ field: "visitType", operator: "=", value: "outpatient" }],
    dimensions: [
      { field: "departmentId", alias: "科室", order: 1 },
      { field: "doctorId", alias: "医生", order: 2 }
    ]
  },
  {
    id: "exec-outpatient-2026-03",
    definitionId: "def-outpatient-visits",
    period: { start: "2026-03-01", end: "2026-03-31", mode: "calculation" as PeriodMode },
    conditions: [{ field: "visitType", operator: "=", value: "outpatient" }],
    dimensions: [
      { field: "departmentId", alias: "科室", order: 1 },
      { field: "doctorId", alias: "医生", order: 2 }
    ]
  },
  {
    id: "exec-disease-weight-2025",
    definitionId: "def-disease-weight",
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" as PeriodMode },
    conditions: [],
    dimensions: [{ field: "departmentId", alias: "科室", order: 1 }]
  },
  {
    id: "exec-discharge-2025",
    definitionId: "def-discharge-visits",
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" as PeriodMode },
    conditions: [{ field: "status", operator: "=", value: "discharged" }],
    dimensions: [
      { field: "wardId", alias: "病区", order: 1 },
      { field: "nursingTeamId", alias: "护理组", order: 2 },
      { field: "directorId", alias: "主任", order: 3 }
    ]
  },
  {
    id: "exec-wang-outpatient",
    definitionId: "def-wang-outpatient",
    period: { start: "2025-10-01", end: "2025-11-30", mode: "actual" as PeriodMode },
    conditions: [
      { field: "visitType", operator: "=", value: "outpatient" },
      { field: "doctorId", operator: "=", value: "unit-wang-xx" }
    ],
    dimensions: [{ field: "departmentId", alias: "实际发生科室", order: 1 }]
  },
  {
    id: "exec-li-outpatient",
    definitionId: "def-li-outpatient",
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" as PeriodMode },
    conditions: [
      { field: "visitType", operator: "=", value: "outpatient" },
      { field: "doctorId", operator: "=", value: "unit-li-xx" }
    ],
    dimensions: [{ field: "departmentId", alias: "实际发生科室", order: 1 }]
  },
  {
    id: "exec-surgery-count-2025",
    definitionId: "def-surgery-count",
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" },
    conditions: [{ field: "surgeryLevel", operator: "in", value: ["III", "IV"] }],
    dimensions: [{ field: "surgeonId", alias: "主刀医生", order: 1 }]
  },
  {
    id: "exec-herbal-amount-2025",
    definitionId: "def-herbal-amount",
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" },
    conditions: [{ field: "drugCategory", operator: "=", value: "herbal" }],
    dimensions: [{ field: "departmentId", alias: "科室", order: 1 }]
  }
];

export const mockCalculationGraphs: CalculationGraph[] = [
  {
    id: "graph-outpatient-count",
    name: "门诊人次计数",
    rootNodeId: "visits-output",
    nodes: [
      { id: "ds", kind: "execution_dataset" },
      { id: "visit-count", kind: "aggregate", aggregate: "count", input: "ds" },
      {
        id: "visits-output",
        kind: "output_column",
        name: "visits",
        role: "final",
        distribution: "perDataset",
        source: "visit-count"
      }
    ]
  },
  {
    id: "graph-disease-weight",
    name: "病种权重 = 病种组均费 ÷ 全院均费",
    rootNodeId: "weight-output",
    nodes: [
      { id: "ds", kind: "execution_dataset" },
      { id: "cost-field", kind: "field_ref", field: "totalCost" },
      {
        id: "same-group-filter",
        kind: "filter",
        input: "ds",
        condition: {
          left: { id: "cond-left", kind: "field_ref", field: "diseaseGroup" },
          operator: "=",
          right: { id: "cond-right", kind: "field_ref", field: "diseaseGroup", scope: "currentRow" }
        }
      },
      {
        id: "group-avg",
        kind: "aggregate",
        aggregate: "avg",
        field: "totalCost",
        input: "same-group-filter"
      },
      {
        id: "overall-avg",
        kind: "aggregate",
        aggregate: "avg",
        field: "totalCost",
        input: "ds"
      },
      {
        id: "weight",
        kind: "arithmetic",
        operator: "/",
        left: "group-avg",
        right: "overall-avg"
      },
      {
        id: "group-avg-output",
        kind: "output_column",
        name: "diseaseGroupAverage",
        role: "intermediate",
        distribution: "perRow",
        source: "group-avg"
      },
      {
        id: "overall-avg-output",
        kind: "output_column",
        name: "overallAverage",
        role: "intermediate",
        distribution: "perDataset",
        source: "overall-avg"
      },
      {
        id: "weight-output",
        kind: "output_column",
        name: "diseaseWeight",
        role: "final",
        distribution: "perRow",
        source: "weight"
      }
    ]
  },
  {
    id: "graph-discharge-count",
    name: "出院人次计数",
    rootNodeId: "discharges-output",
    nodes: [
      { id: "ds", kind: "execution_dataset" },
      { id: "discharge-count", kind: "aggregate", aggregate: "count", input: "ds" },
      {
        id: "discharges-output",
        kind: "output_column",
        name: "discharges",
        role: "final",
        distribution: "perDataset",
        source: "discharge-count"
      }
    ]
  },
  {
    id: "graph-surgery-count",
    name: "手术台次计数",
    rootNodeId: "surgeries-output",
    nodes: [
      { id: "ds", kind: "execution_dataset" },
      { id: "surgery-count", kind: "aggregate", aggregate: "count", input: "ds" },
      {
        id: "surgeries-output",
        kind: "output_column",
        name: "surgeries",
        role: "final",
        distribution: "perDataset",
        source: "surgery-count"
      }
    ]
  },
  {
    id: "graph-herbal-sum",
    name: "中草药金额求和",
    rootNodeId: "herbal-output",
    nodes: [
      { id: "ds", kind: "execution_dataset" },
      { id: "amount-field", kind: "field_ref", field: "amount" },
      {
        id: "herbal-sum",
        kind: "aggregate",
        aggregate: "sum",
        field: "amount",
        input: "ds"
      },
      {
        id: "herbal-output",
        kind: "output_column",
        name: "amount",
        role: "final",
        distribution: "perDataset",
        source: "herbal-sum"
      }
    ]
  }
];

const diseaseWeightDefinition = mockWorkloadDefinitions.find(
  (item) => item.id === "def-disease-weight"
)!;
const diseaseWeightExecution = mockWorkloadExecutions.find(
  (item) => item.id === "exec-disease-weight-2025"
)!;
const diseaseWeightGraph = mockCalculationGraphs.find(
  (item) => item.id === "graph-disease-weight"
)!;

export const mockDiseaseWeightSnapshot = createSnapshot(
  "snapshot-disease-weight-2025",
  diseaseWeightDefinition,
  diseaseWeightExecution,
  diseaseWeightGraph,
  {
    businessFields: ["totalCost", "diseaseGroup", "departmentId"],
    outputColumns: ["diseaseGroupAverage", "overallAverage", "diseaseWeight"],
    resultDimensions: ["diseaseGroup", "departmentId"],
    dataVersionId: "data-version-2025",
    note: "2025 全院病种权重基线"
  }
);

const outpatientDefinition = mockWorkloadDefinitions.find(
  (item) => item.id === "def-outpatient-visits"
)!;
const outpatientExecution = mockWorkloadExecutions.find(
  (item) => item.id === "exec-outpatient-2025"
)!;
const outpatientGraph = mockCalculationGraphs.find(
  (item) => item.id === "graph-outpatient-count"
)!;

export const mockOutpatientSnapshot = createSnapshot(
  "snapshot-outpatient-2025",
  outpatientDefinition,
  outpatientExecution,
  outpatientGraph,
  {
    businessFields: ["visitType", "departmentId", "doctorId"],
    outputColumns: ["visits"],
    resultDimensions: ["departmentId", "doctorId"],
    dataVersionId: "data-version-2025",
    note: "2025 全院门诊人次测算"
  }
);

const dischargeDefinition = mockWorkloadDefinitions.find(
  (item) => item.id === "def-discharge-visits"
)!;
const dischargeExecution = mockWorkloadExecutions.find(
  (item) => item.id === "exec-discharge-2025"
)!;
const dischargeGraph = mockCalculationGraphs.find(
  (item) => item.id === "graph-discharge-count"
)!;

export const mockDischargeSnapshot = createSnapshot(
  "snapshot-discharge-2025",
  dischargeDefinition,
  dischargeExecution,
  dischargeGraph,
  {
    businessFields: ["status", "wardId", "nursingTeamId", "directorId"],
    outputColumns: ["discharges"],
    resultDimensions: ["wardId", "nursingTeamId", "directorId"],
    dataVersionId: "data-version-2025",
    note: "2025 全院出院人次测算"
  }
);

const wangOutpatientDefinition = mockWorkloadDefinitions.find(
  (item) => item.id === "def-wang-outpatient"
)!;
const wangOutpatientExecution = mockWorkloadExecutions.find(
  (item) => item.id === "exec-wang-outpatient"
)!;

export const mockWangOutpatientSnapshot = createSnapshot(
  "snapshot-outpatient-wang",
  wangOutpatientDefinition,
  wangOutpatientExecution,
  outpatientGraph,
  {
    businessFields: ["visitType", "departmentId", "doctorId"],
    outputColumns: ["visits"],
    resultDimensions: ["departmentId", "doctorId"],
    dataVersionId: "data-version-2025",
    note: "王XX 门诊人次 (2025-10~11 实际发生)"
  }
);

const liOutpatientDefinition = mockWorkloadDefinitions.find(
  (item) => item.id === "def-li-outpatient"
)!;
const liOutpatientExecution = mockWorkloadExecutions.find(
  (item) => item.id === "exec-li-outpatient"
)!;

export const mockLiOutpatientSnapshot = createSnapshot(
  "snapshot-outpatient-li",
  liOutpatientDefinition,
  liOutpatientExecution,
  outpatientGraph,
  {
    businessFields: ["visitType", "departmentId", "doctorId"],
    outputColumns: ["visits"],
    resultDimensions: ["departmentId", "doctorId"],
    dataVersionId: "data-version-2025",
    note: "李XX 门诊人次 (2025 全年)"
  }
);

const surgeryDefinition = mockWorkloadDefinitions.find(
  (item) => item.id === "def-surgery-count"
)!;
const surgeryExecution = mockWorkloadExecutions.find(
  (item) => item.id === "exec-surgery-count-2025"
)!;
const surgeryGraph = mockCalculationGraphs.find(
  (item) => item.id === "graph-surgery-count"
)!;

export const mockSurgeryCountSnapshot = createSnapshot(
  "snapshot-surgery-count",
  surgeryDefinition,
  surgeryExecution,
  surgeryGraph,
  {
    businessFields: ["surgeryLevel", "surgeonId"],
    outputColumns: ["surgeries"],
    resultDimensions: ["surgeonId"],
    dataVersionId: "data-version-2025",
    note: "2025 手术台次统计 (III/IV 级)"
  }
);

const herbalDefinition = mockWorkloadDefinitions.find(
  (item) => item.id === "def-herbal-amount"
)!;
const herbalExecution = mockWorkloadExecutions.find(
  (item) => item.id === "exec-herbal-amount-2025"
)!;
const herbalGraph = mockCalculationGraphs.find(
  (item) => item.id === "graph-herbal-sum"
)!;

export const mockHerbalAmountSnapshot = createSnapshot(
  "snapshot-herbal-amount",
  herbalDefinition,
  herbalExecution,
  herbalGraph,
  {
    businessFields: ["drugCategory", "departmentId", "amount"],
    outputColumns: ["amount"],
    resultDimensions: ["departmentId"],
    dataVersionId: "data-version-2025",
    note: "2025 中草药金额统计"
  }
);

export const mockCalculationSnapshots: CalculationSnapshot[] = [
  mockDiseaseWeightSnapshot,
  mockOutpatientSnapshot,
  mockDischargeSnapshot,
  mockWangOutpatientSnapshot,
  mockLiOutpatientSnapshot,
  mockSurgeryCountSnapshot,
  mockHerbalAmountSnapshot,
];

/** 病种权重 ResultSet：由 executeSnapshot 推出的参考结果（值与 GraphDiseaseCaseRows 一致） */
export const mockDiseaseWeightResultSet: ResultSet = {
  id: "rs-snapshot-disease-weight-2025",
  snapshotId: "snapshot-disease-weight-2025",
  period: mockDiseaseWeightSnapshot.execution.period,
  items: [
    // 行级：M78.1 组均 2000、A00.0 组均 2300、全院总均 2150（正确分母）
    { id: "ri-dw-c1", value: 2000 / 2150, dimensions: { diseaseGroup: "M78.1", departmentId: "unit-orthopedics" }, granularity: "row", outputColumnName: "diseaseWeight", roleInGraph: "final" },
    { id: "ri-dw-c2", value: 2000 / 2150, dimensions: { diseaseGroup: "M78.1", departmentId: "unit-orthopedics" }, granularity: "row", outputColumnName: "diseaseWeight", roleInGraph: "final" },
    { id: "ri-dw-c3", value: 2000 / 2150, dimensions: { diseaseGroup: "M78.1", departmentId: "unit-neurosurgery" }, granularity: "row", outputColumnName: "diseaseWeight", roleInGraph: "final" },
    { id: "ri-dw-c4", value: 2300 / 2150, dimensions: { diseaseGroup: "A00.0", departmentId: "unit-orthopedics" }, granularity: "row", outputColumnName: "diseaseWeight", roleInGraph: "final" },
    { id: "ri-dw-c5", value: 2300 / 2150, dimensions: { diseaseGroup: "A00.0", departmentId: "unit-neurosurgery" }, granularity: "row", outputColumnName: "diseaseWeight", roleInGraph: "final" },
    { id: "ri-dw-c6", value: 2300 / 2150, dimensions: { diseaseGroup: "A00.0", departmentId: "unit-neurosurgery" }, granularity: "row", outputColumnName: "diseaseWeight", roleInGraph: "final" },
    // 中间节点（追溯用，不允许成为 Workload Result）
    { id: "ri-dw-i1", value: 2000, dimensions: { diseaseGroup: "M78.1" }, granularity: "row", outputColumnName: "diseaseGroupAverage", roleInGraph: "intermediate" },
    { id: "ri-dw-i2", value: 2150, dimensions: {}, granularity: "aggregate", outputColumnName: "overallAverage", roleInGraph: "intermediate" },
    // 汇总（骨科病种总权重 = 2*0.9302 + 1.0698）
    { id: "ri-dw-orth-total", value: (2000 / 2150) * 2 + 2300 / 2150, dimensions: { departmentId: "unit-orthopedics" }, granularity: "aggregate", outputColumnName: undefined, roleInGraph: "final" }
  ]
};

/** 门诊人次 ResultSet (2025 测算期间) */
export const mockOutpatientResultSet: ResultSet = {
  id: "rs-snapshot-outpatient-2025",
  snapshotId: "snapshot-outpatient-2025",
  sourceDataObjectId: "data-object-outpatient",
  period: mockOutpatientSnapshot.execution.period,
  items: [
    { id: "ri-outpatient-neurosurgery", value: 1260, dimensions: { departmentId: "unit-neurosurgery" }, granularity: "aggregate", outputColumnName: "visits", roleInGraph: "final" },
    { id: "ri-outpatient-orthopedics", value: 980, dimensions: { departmentId: "unit-orthopedics" }, granularity: "aggregate", outputColumnName: "visits", roleInGraph: "final" },
    { id: "ri-outpatient-emergency", value: 2100, dimensions: { departmentId: "unit-emergency" }, granularity: "aggregate", outputColumnName: "visits", roleInGraph: "final" },
    { id: "ri-outpatient-internal", value: 1400, dimensions: { departmentId: "unit-internal-medicine" }, granularity: "aggregate", outputColumnName: "visits", roleInGraph: "final" },
    { id: "ri-outpatient-total", value: 4002, dimensions: {}, granularity: "aggregate", outputColumnName: "visits", roleInGraph: "final" },
  ]
};

/** 出院人次 ResultSet (2025 测算期间) */
export const mockDischargeResultSet: ResultSet = {
  id: "rs-snapshot-discharge-2025",
  snapshotId: "snapshot-discharge-2025",
  period: mockDischargeSnapshot.execution.period,
  items: [
    { id: "ri-discharge-orthopedics", value: 380, dimensions: { wardId: "unit-orthopedics-ward" }, granularity: "aggregate", outputColumnName: "discharges", roleInGraph: "final" },
    { id: "ri-discharge-neurosurgery", value: 250, dimensions: { wardId: "unit-neurosurgery-ward-1" }, granularity: "aggregate", outputColumnName: "discharges", roleInGraph: "final" },
    { id: "ri-discharge-emergency", value: 120, dimensions: { wardId: "unit-emergency-ward" }, granularity: "aggregate", outputColumnName: "discharges", roleInGraph: "final" },
    { id: "ri-discharge-total", value: 830, dimensions: {}, granularity: "aggregate", outputColumnName: "discharges", roleInGraph: "final" },
  ]
};

/** 王XX 门诊人次 ResultSet (医生维度, 实际发生期间 2025-10~11) */
export const mockWangOutpatientResultSet: ResultSet = {
  id: "rs-snapshot-outpatient-wang",
  snapshotId: "snapshot-outpatient-wang",
  period: mockWangOutpatientSnapshot.execution.period,
  items: [
    { id: "ri-wang-outpatient", value: 200, dimensions: { departmentId: "unit-neurosurgery", doctorId: "unit-wang-xx" }, granularity: "aggregate", outputColumnName: "visits", roleInGraph: "final" },
  ]
};

/** 李XX 门诊人次 ResultSet (医生维度) */
export const mockLiOutpatientResultSet: ResultSet = {
  id: "rs-snapshot-outpatient-li",
  snapshotId: "snapshot-outpatient-li",
  period: mockLiOutpatientSnapshot.execution.period,
  items: [
    { id: "ri-li-outpatient", value: 220, dimensions: { departmentId: "unit-neurosurgery", doctorId: "unit-li-xx" }, granularity: "aggregate", outputColumnName: "visits", roleInGraph: "final" },
  ]
};

/** 手术台次 ResultSet */
export const mockSurgeryCountResultSet: ResultSet = {
  id: "rs-snapshot-surgery-count",
  snapshotId: "snapshot-surgery-count",
  period: mockSurgeryCountSnapshot.execution.period,
  items: [
    { id: "ri-surgery-total", value: 120, dimensions: {}, granularity: "aggregate", outputColumnName: "surgeries", roleInGraph: "final" },
  ]
};

/** 中草药金额 ResultSet */
export const mockHerbalAmountResultSet: ResultSet = {
  id: "rs-snapshot-herbal-amount",
  snapshotId: "snapshot-herbal-amount",
  period: mockHerbalAmountSnapshot.execution.period,
  items: [
    { id: "ri-herbal-total", value: 360000, dimensions: {}, granularity: "aggregate", outputColumnName: "amount", roleInGraph: "final" },
  ]
};

/** 病种权重总值 ResultSet - 基于现有病种权重 Snapshot，取 M78.1 组权重作为代表值 */
export const mockDiseaseWeightTotalResultSet: ResultSet = {
  id: "rs-snapshot-disease-weight-total",
  snapshotId: "snapshot-disease-weight-2025",
  period: mockDiseaseWeightSnapshot.execution.period,
  items: [
    { id: "ri-dw-total", value: 2000 / 2150, dimensions: { diseaseGroup: "M78.1" }, granularity: "aggregate", outputColumnName: "diseaseWeight", roleInGraph: "final" },
  ]
};

export const mockResultSets: ResultSet[] = [
  mockDiseaseWeightResultSet,
  mockOutpatientResultSet,
  mockDischargeResultSet,
  mockWangOutpatientResultSet,
  mockLiOutpatientResultSet,
  mockDiseaseWeightTotalResultSet,
  mockSurgeryCountResultSet,
  mockHerbalAmountResultSet,
];

export const mockWorkloadResults: WorkloadResult[] = [
  {
    id: "workload-result-orthopedics-disease-weight",
    resultSetId: "rs-snapshot-disease-weight-2025",
    resultItemId: "ri-dw-orth-total",
    name: "骨科病种总权重",
    value: (2000 / 2150) * 2 + 2300 / 2150,
    dimensions: { departmentId: "unit-orthopedics" }
  },
  {
    id: "workload-result-neurosurgery-outpatient",
    resultSetId: "rs-snapshot-outpatient-2025",
    resultItemId: "ri-outpatient-neurosurgery",
    name: "神经外科门诊人次",
    value: 1260,
    dimensions: { departmentId: "unit-neurosurgery" }
  },
  {
    id: "workload-result-orthopedics-discharge",
    resultSetId: "rs-snapshot-discharge-2025",
    resultItemId: "ri-discharge-orthopedics",
    name: "骨科出院人次",
    value: 380,
    dimensions: { wardId: "unit-orthopedics-ward" }
  },
  {
    id: "workload-result-neurosurgery-discharge",
    resultSetId: "rs-snapshot-discharge-2025",
    resultItemId: "ri-discharge-neurosurgery",
    name: "神经外科出院人次",
    value: 250,
    dimensions: { wardId: "unit-neurosurgery-ward-1" }
  },
  {
    id: "workload-result-wang-outpatient",
    resultSetId: "rs-snapshot-outpatient-wang",
    resultItemId: "ri-wang-outpatient",
    name: "王XX门诊人次",
    value: 200,
    dimensions: { departmentId: "unit-neurosurgery", doctorId: "unit-wang-xx" }
  },
  {
    id: "workload-result-li-outpatient",
    resultSetId: "rs-snapshot-outpatient-li",
    resultItemId: "ri-li-outpatient",
    name: "李XX门诊人次",
    value: 220,
    dimensions: { departmentId: "unit-neurosurgery", doctorId: "unit-li-xx" }
  },
  {
    id: "workload-result-outpatient-total",
    resultSetId: "rs-snapshot-outpatient-2025",
    resultItemId: "ri-outpatient-total",
    name: "全院门诊人次",
    value: 4002,
    dimensions: {}
  },
  {
    id: "workload-result-internal-outpatient",
    resultSetId: "rs-snapshot-outpatient-2025",
    resultItemId: "ri-outpatient-internal",
    name: "内科门诊人次",
    value: 1400,
    dimensions: { departmentId: "unit-internal-medicine" }
  },
  {
    id: "workload-result-discharge-total",
    resultSetId: "rs-snapshot-discharge-2025",
    resultItemId: "ri-discharge-total",
    name: "全院出院人次",
    value: 830,
    dimensions: {}
  },
  {
    id: "workload-result-disease-weight",
    resultSetId: "rs-snapshot-disease-weight-total",
    resultItemId: "ri-dw-total",
    name: "病种权重 (M78.1 代表值)",
    value: 2000 / 2150,
    dimensions: { diseaseGroup: "M78.1" }
  },
  {
    id: "workload-result-surgery-count",
    resultSetId: "rs-snapshot-surgery-count",
    resultItemId: "ri-surgery-total",
    name: "手术台次",
    value: 120,
    dimensions: {}
  },
  {
    id: "workload-result-herbal-amount",
    resultSetId: "rs-snapshot-herbal-amount",
    resultItemId: "ri-herbal-total",
    name: "中草药金额",
    value: 360000,
    dimensions: {}
  }
];