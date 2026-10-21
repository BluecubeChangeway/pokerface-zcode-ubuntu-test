import type { Period } from "../period/types";

export type CardType = "unit" | "workload" | "budget";

export type ConfigurationState = "unconfigured" | "partial" | "configured";

export type ValidationState = "warning" | "error";

/**
 * Card 领域核心状态（不含 UI 交互态）
 * UI 交互态（focused, hover, selected, dragging, ghost, collapsed, recommended 等）
 * 不属于领域模型，应由 UI 层管理。
 */
export interface Card {
  id: string;
  type: CardType;
  name: string;
  code?: string;
  visualGroup?: string;
  visualCode?: string;
  badgeCode?: string;
  skinId?: string;
  period?: Period;
  configurationState: ConfigurationState;
  validationState?: ValidationState;
  tags?: string[];
  metadata?: Record<string, unknown>;
  /**
   * 业务生命周期（D-154）：缺省 = active；"revoked" = 已被撤回，业务查询中等同不存在
   * （不出现在 Deck / Canvas / Slot / Resolution）。
   * V1 仅用于 Workload 派生卡撤回路径（D-153）；UnitCard / BudgetCard 不因 Workload 撤回而被 revoke。
   */
  businessStatus?: "active" | "revoked";
}

export type UnitKind =
  | "person"
  | "department"
  | "team"
  | "business_unit"
  | "custom";

export interface UnitCard extends Card {
  type: "unit";
  unitKind: UnitKind;
  attributes: {
    position?: string;
    administrativeParentId?: string;
    existencePeriod?: Period;
    tags?: string[];
  };
}

export interface WorkloadCard extends Card {
  type: "workload";
  /** 引用的 Workload Result ID，不复制 Result 的统计事实 */
  workloadResultId?: string;
  /** 仅作展示缓存，非统计事实来源。权威值来自 WorkloadResult。 */
  value?: number;
  unit?: string;
  /** 仅作展示缓存，真实来源信息以 WorkloadResult 为准。 */
  sourceSummary?: {
    dataObjectId?: string;
    period?: Period;
  };
}

export interface BudgetCard extends Card {
  type: "budget";
  /** 预算基础总额，唯一基础事实。其它派生值（已用/剩余/占用率/状态等）由 Budget 服务根据 Relation 派生。 */
  amount: number;
}

export type AnyCard = UnitCard | WorkloadCard | BudgetCard;

export type SlotType = "unit" | "workload" | "budget";

/**
 * 卡槽定义。不保存关系事实（cardIds），仅表达业务语义与 UI 配置。
 * 关系事实唯一来源为 Relation（D-078, INV-003, D-100）。
 */
export interface CardSlot {
  id: string;
  ownerCardId: string;
  type: SlotType;
  enabled: boolean;
  locked: boolean;
  acceptedCardTypes: CardType[];
  displayMode: "hand" | "stack" | "count";
  expanded: boolean;
}