import type { AnyCard, CardSlot } from "../domain/card/types";
import { deriveAcceptedCardTypes } from "../domain/relation/relationService";

export const mockSlots: CardSlot[] = [
  // 神经外科 - 标准三槽位顺序：unit -> workload -> budget
  {
    id: "slot-unit-neurosurgery-units",
    ownerCardId: "unit-neurosurgery",
    type: "unit",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("unit"),
    displayMode: "hand",
    expanded: false
  },
  {
    id: "slot-unit-neurosurgery-workloads",
    ownerCardId: "unit-neurosurgery",
    type: "workload",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("workload"),
    displayMode: "stack",
    expanded: false
  },
  {
    id: "slot-unit-neurosurgery-budget",
    ownerCardId: "unit-neurosurgery",
    type: "budget",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("budget"),
    displayMode: "count",
    expanded: false
  },

  // 神经外科一病区
  {
    id: "slot-unit-neurosurgery-ward-1-units",
    ownerCardId: "unit-neurosurgery-ward-1",
    type: "unit",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("unit"),
    displayMode: "hand",
    expanded: false
  },
  {
    id: "slot-unit-neurosurgery-ward-1-workloads",
    ownerCardId: "unit-neurosurgery-ward-1",
    type: "workload",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("workload"),
    displayMode: "stack",
    expanded: false
  },
  {
    id: "slot-unit-neurosurgery-ward-1-budget",
    ownerCardId: "unit-neurosurgery-ward-1",
    type: "budget",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("budget"),
    displayMode: "count",
    expanded: false
  },

  // 神经外科二病区
  {
    id: "slot-unit-neurosurgery-ward-2-units",
    ownerCardId: "unit-neurosurgery-ward-2",
    type: "unit",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("unit"),
    displayMode: "hand",
    expanded: false
  },
  {
    id: "slot-unit-neurosurgery-ward-2-workloads",
    ownerCardId: "unit-neurosurgery-ward-2",
    type: "workload",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("workload"),
    displayMode: "stack",
    expanded: false
  },
  {
    id: "slot-unit-neurosurgery-ward-2-budget",
    ownerCardId: "unit-neurosurgery-ward-2",
    type: "budget",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("budget"),
    displayMode: "count",
    expanded: false
  },

  // 介入室
  {
    id: "slot-unit-intervention-room-units",
    ownerCardId: "unit-intervention-room",
    type: "unit",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("unit"),
    displayMode: "hand",
    expanded: false
  },
  {
    id: "slot-unit-intervention-room-workloads",
    ownerCardId: "unit-intervention-room",
    type: "workload",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("workload"),
    displayMode: "stack",
    expanded: false
  },
  {
    id: "slot-unit-intervention-room-budget",
    ownerCardId: "unit-intervention-room",
    type: "budget",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("budget"),
    displayMode: "count",
    expanded: false
  },

  // 内科
  {
    id: "slot-unit-internal-medicine-units",
    ownerCardId: "unit-internal-medicine",
    type: "unit",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("unit"),
    displayMode: "hand",
    expanded: false
  },
  {
    id: "slot-unit-internal-medicine-workloads",
    ownerCardId: "unit-internal-medicine",
    type: "workload",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("workload"),
    displayMode: "stack",
    expanded: false
  },
  {
    id: "slot-unit-internal-medicine-budget",
    ownerCardId: "unit-internal-medicine",
    type: "budget",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("budget"),
    displayMode: "count",
    expanded: false
  },

  // 急诊科
  {
    id: "slot-unit-emergency-units",
    ownerCardId: "unit-emergency",
    type: "unit",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("unit"),
    displayMode: "hand",
    expanded: false
  },
  {
    id: "slot-unit-emergency-workloads",
    ownerCardId: "unit-emergency",
    type: "workload",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("workload"),
    displayMode: "stack",
    expanded: false
  },
  {
    id: "slot-unit-emergency-budget",
    ownerCardId: "unit-emergency",
    type: "budget",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("budget"),
    displayMode: "count",
    expanded: false
  },

  // 王XX
  {
    id: "slot-unit-wang-xx-units",
    ownerCardId: "unit-wang-xx",
    type: "unit",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("unit"),
    displayMode: "hand",
    expanded: false
  },
  {
    id: "slot-unit-wang-xx-workloads",
    ownerCardId: "unit-wang-xx",
    type: "workload",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("workload"),
    displayMode: "stack",
    expanded: false
  },
  {
    id: "slot-unit-wang-xx-budget",
    ownerCardId: "unit-wang-xx",
    type: "budget",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("budget"),
    displayMode: "count",
    expanded: false
  },

  // 李XX
  {
    id: "slot-unit-li-xx-units",
    ownerCardId: "unit-li-xx",
    type: "unit",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("unit"),
    displayMode: "hand",
    expanded: false
  },
  {
    id: "slot-unit-li-xx-workloads",
    ownerCardId: "unit-li-xx",
    type: "workload",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("workload"),
    displayMode: "stack",
    expanded: false
  },
  {
    id: "slot-unit-li-xx-budget",
    ownerCardId: "unit-li-xx",
    type: "budget",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("budget"),
    displayMode: "count",
    expanded: false
  },

  // 护理组
  {
    id: "slot-unit-nursing-team-units",
    ownerCardId: "unit-nursing-team",
    type: "unit",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("unit"),
    displayMode: "hand",
    expanded: false
  },
  {
    id: "slot-unit-nursing-team-workloads",
    ownerCardId: "unit-nursing-team",
    type: "workload",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("workload"),
    displayMode: "stack",
    expanded: false
  },
  {
    id: "slot-unit-nursing-team-budget",
    ownerCardId: "unit-nursing-team",
    type: "budget",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("budget"),
    displayMode: "count",
    expanded: false
  },

  // 主任
  {
    id: "slot-unit-director-units",
    ownerCardId: "unit-director",
    type: "unit",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("unit"),
    displayMode: "hand",
    expanded: false
  },
  {
    id: "slot-unit-director-workloads",
    ownerCardId: "unit-director",
    type: "workload",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("workload"),
    displayMode: "stack",
    expanded: false
  },
  {
    id: "slot-unit-director-budget",
    ownerCardId: "unit-director",
    type: "budget",
    enabled: true,
    locked: false,
    acceptedCardTypes: deriveAcceptedCardTypes("budget"),
    displayMode: "count",
    expanded: false
  }
];

export const mockCards: AnyCard[] = [
  {
    id: "unit-neurosurgery",
    type: "unit",
    name: "神经外科",
    code: "UNIT-NEURO",
    visualGroup: "unit",
    visualCode: "gold-inscription",
    configurationState: "configured",
    unitKind: "department",
    attributes: {
      tags: ["临床科室"]
    },
    tags: ["临床科室"]
  },
  {
    id: "unit-neurosurgery-ward-1",
    type: "unit",
    name: "神经外科一病区",
    code: "UNIT-NEURO-W1",
    configurationState: "configured",
    unitKind: "team",
    attributes: {
      administrativeParentId: "unit-neurosurgery",
      tags: ["病区"]
    },
    tags: ["病区"]
  },
  {
    id: "unit-neurosurgery-ward-2",
    type: "unit",
    name: "神经外科二病区",
    code: "UNIT-NEURO-W2",
    configurationState: "configured",
    unitKind: "team",
    attributes: {
      administrativeParentId: "unit-neurosurgery",
      tags: ["病区"]
    },
    tags: ["病区"]
  },
  {
    id: "unit-intervention-room",
    type: "unit",
    name: "介入室",
    code: "UNIT-INTERVENTION",
    configurationState: "configured",
    unitKind: "team",
    attributes: {
      administrativeParentId: "unit-neurosurgery",
      tags: ["特殊团队"]
    },
    tags: ["特殊团队"]
  },
  {
    id: "unit-internal-medicine",
    type: "unit",
    name: "内科",
    code: "UNIT-INTERNAL",
    configurationState: "configured",
    unitKind: "department",
    attributes: {
      tags: ["临床科室"]
    },
    tags: ["临床科室"]
  },
  {
    id: "unit-emergency",
    type: "unit",
    name: "急诊科",
    code: "UNIT-ER",
    configurationState: "configured",
    unitKind: "department",
    attributes: {
      tags: ["临床科室"]
    },
    tags: ["临床科室"]
  },
  {
    id: "unit-wang-xx",
    type: "unit",
    name: "王XX",
    code: "DOCTOR-WANG-XX",
    configurationState: "configured",
    unitKind: "person",
    attributes: {
      position: "医生",
      administrativeParentId: "unit-neurosurgery",
      existencePeriod: { start: "2025-01-01", end: "2025-12-31", mode: "actual" },
      tags: ["门诊人员", "临床人员"]
    },
    tags: ["门诊人员", "临床人员"],
    metadata: {
      servicePeriods: [
        { unitId: "unit-neurosurgery", start: "2025-01-01", end: "2025-11-30" },
        { unitId: "unit-emergency", start: "2025-10-01", end: "2025-12-31" }
      ]
    }
  },
  {
    id: "unit-li-xx",
    type: "unit",
    name: "李XX",
    code: "DOCTOR-LI-XX",
    configurationState: "configured",
    unitKind: "person",
    attributes: {
      position: "医生",
      administrativeParentId: "unit-neurosurgery-ward-1",
      tags: ["门诊人员", "临床人员"]
    },
    tags: ["门诊人员", "临床人员"]
  },
  {
    id: "unit-nursing-team",
    type: "unit",
    name: "护理组",
    code: "UNIT-NURSING",
    configurationState: "configured",
    unitKind: "team",
    attributes: {
      administrativeParentId: "unit-neurosurgery-ward-1",
      tags: ["护理人员", "全院护理统计池"]
    },
    tags: ["护理人员", "全院护理统计池"]
  },
  {
    id: "unit-director",
    type: "unit",
    name: "主任",
    code: "ROLE-DIRECTOR",
    configurationState: "configured",
    unitKind: "custom",
    attributes: {
      tags: ["管理岗位"]
    },
    tags: ["管理岗位"]
  },
  {
    id: "workload-outpatient-visits",
    type: "workload",
    name: "门诊人次",
    code: "WL-OUTPATIENT",
    visualGroup: "workload",
    visualCode: "blue-hammer",
    configurationState: "partial",
    workloadResultId: "workload-result-outpatient-total",
    value: 4002,
    unit: "人次",
    sourceSummary: {
      dataObjectId: "data-object-outpatient",
      period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
    },
    metadata: {
      aggregate: {
        childTotal: 3260,
        remainderTotal: 742,
        coveredTotal: 4002
      }
    }
  },
  {
    id: "workload-neurosurgery-outpatient",
    type: "workload",
    name: "神经外科门诊人次",
    code: "WL-NEURO-OUTPATIENT",
    configurationState: "configured",
    workloadResultId: "workload-result-neurosurgery-outpatient",
    value: 1260,
    unit: "人次",
    sourceSummary: {
      dataObjectId: "data-object-outpatient",
      period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
    }
  },
  {
    id: "workload-internal-outpatient",
    type: "workload",
    name: "内科门诊人次",
    code: "WL-INTERNAL-OUTPATIENT",
    configurationState: "configured",
    workloadResultId: "workload-result-internal-outpatient",
    value: 1400,
    unit: "人次",
    sourceSummary: {
      dataObjectId: "data-object-outpatient",
      period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
    }
  },
  {
    id: "workload-wang-outpatient",
    type: "workload",
    name: "王XX门诊人次",
    code: "WL-WANG-OUTPATIENT",
    configurationState: "configured",
    workloadResultId: "workload-result-wang-outpatient",
    value: 200,
    unit: "人次",
    sourceSummary: {
      dataObjectId: "data-object-outpatient",
      period: { start: "2025-10-01", end: "2025-11-30", mode: "actual" }
    },
    metadata: {
      coverage: {
        actualValue: 200,
        monthlyAverage: 100,
        coveredValue: 1200
      }
    }
  },
  {
    id: "workload-li-outpatient",
    type: "workload",
    name: "李XX门诊人次",
    code: "WL-LI-OUTPATIENT",
    configurationState: "configured",
    workloadResultId: "workload-result-li-outpatient",
    value: 220,
    unit: "人次",
    sourceSummary: {
      dataObjectId: "data-object-outpatient",
      period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
    }
  },
  {
    id: "workload-discharge-visits",
    type: "workload",
    name: "出院人次",
    code: "WL-DISCHARGE",
    configurationState: "configured",
    workloadResultId: "workload-result-discharge-total",
    value: 830,
    unit: "人次",
    sourceSummary: {
      dataObjectId: "data-object-discharge",
      period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
    }
  },
  {
    id: "workload-disease-weight",
    type: "workload",
    name: "病种权重",
    code: "WL-DISEASE-WEIGHT",
    configurationState: "configured",
    workloadResultId: "workload-result-disease-weight",
    value: 0.9,
    unit: "权重",
    metadata: {
      diagnosisCode: "M78.1",
      averageCost: 1800,
      hospitalAverageCost: 2000,
      weight: 0.9
    }
  },
  {
    id: "workload-surgery-count",
    type: "workload",
    name: "手术台次",
    code: "WL-SURGERY",
    configurationState: "configured",
    workloadResultId: "workload-result-surgery-count",
    value: 120,
    unit: "台次"
  },
  {
    id: "workload-herbal-amount",
    type: "workload",
    name: "中草药金额",
    code: "WL-HERBAL",
    configurationState: "configured",
    workloadResultId: "workload-result-herbal-amount",
    value: 360000,
    unit: "元"
  },
  {
    id: "budget-hospital-performance",
    type: "budget",
    name: "全院原绩效奖金",
    code: "BDG-HOSPITAL-PERF",
    visualGroup: "budget",
    visualCode: "green-rice",
    configurationState: "configured",
    amount: 5000000,
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
  },
  {
    id: "budget-doctor",
    type: "budget",
    name: "医生预算",
    code: "BDG-DOCTOR",
    configurationState: "configured",
    amount: 3000000,
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
  },
  {
    id: "budget-outpatient",
    type: "budget",
    name: "门诊预算",
    code: "BDG-OUTPATIENT",
    configurationState: "configured",
    amount: 1200000,
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
  },
  {
    id: "budget-inpatient",
    type: "budget",
    name: "住院预算",
    code: "BDG-INPATIENT",
    configurationState: "configured",
    amount: 1000000,
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
  },
  {
    id: "budget-nursing",
    type: "budget",
    name: "护理预算",
    code: "BDG-NURSING",
    configurationState: "configured",
    amount: 1300000,
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
  },
  {
    id: "budget-other",
    type: "budget",
    name: "其他预算",
    code: "BDG-OTHER",
    configurationState: "configured",
    amount: 700000,
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
  },
  {
    id: "budget-emergency-additional",
    type: "budget",
    name: "急诊追加预算",
    code: "BDG-ER-ADD",
    configurationState: "configured",
    amount: 200000,
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
  },
  {
    id: "budget-obstetrics-additional",
    type: "budget",
    name: "妇产科追加预算",
    code: "BDG-OB-ADD",
    configurationState: "configured",
    amount: 150000,
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
  },
  {
    id: "budget-pediatrics-additional",
    type: "budget",
    name: "儿科追加预算",
    code: "BDG-PED-ADD",
    configurationState: "configured",
    amount: 150000,
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
  },
  {
    id: "budget-critical-care-additional",
    type: "budget",
    name: "重症医学科追加预算",
    code: "BDG-ICU-ADD",
    configurationState: "configured",
    amount: 180000,
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" }
  },
  {
    id: "budget-backcalc-surgery",
    type: "budget",
    name: "手术台次倒算预算",
    code: "BDG-BACKCALC-SURGERY",
    configurationState: "configured",
    amount: 600,
    period: { start: "2025-01-01", end: "2025-12-31", mode: "measurement" },
    metadata: {
      origin: {
        kind: "back_calculated",
        workloadId: "workload-surgery-count",
        presetUnitScore: 5
      }
    }
  }
];