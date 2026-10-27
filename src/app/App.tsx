import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { dataService, runtimeDataBackend } from "../services/runtimeDataService";
import { LocalFolderDataService } from "../services/LocalFolderDataService";
import { clearDemoData, seedDemoData } from "../services/demoSeeder";
import { recommendationStore } from "../stores/recommendationStore";
import { canvasStore } from "../stores/canvasStore";
import { deckStore } from "../stores/deckStore";
import { mockSlots } from "../mock/mockCards";
import type { AnyCard, BudgetCard, CardSlot, CardType, UnitCard, WorkloadCard } from "../domain/card/types";
import type { Relation } from "../domain/relation/types";
import {
  onBudgetCardDragStart,
  onBudgetCardSlotDragStart,
  onUnitCardDragStart,
  onUnitCardSlotDragStart,
  onWorkloadCardDragStart,
  onWorkloadCardDropOutsideSlots,
  onWorkloadCardSlotDragStart,
  onWorkloadCardSlotDrop,
  type DataTransferLike,
} from "./dropInteraction";
import {
  asUnitCard,
  asWorkloadCard,
  CANVAS_MOVE_DRAG_TYPE,
  cardById,
  computeDropPlacement,
  deckCardsOf,
  ensureCanvasBootstrapped,
  slotsOfUnit,
} from "./canvasBootstrap";
import {
  STATUS_LABEL,
  toRecommendationDetail,
  toRecommendationListItems,
  type RecommendationDetail,
  type RecommendationListItem,
} from "./recommendationList";
import {
  buildActionContext,
  confirmActionFor,
  sourceUnitIdFrom,
  sourceWorkloadCardFrom,
} from "./recommendationActions";
import {
  buildSplitParameters,
  draftFromRecommendation,
  isSplitDraftComplete,
  type SplitDraft,
} from "./splitConfirmPanel";
import {
  previewFullPathRevocation,
  revokeDerivedPathAsPreviewed,
  revokeSplitLayer,
} from "../services/revocationEntry";
import { previewSplitReuse } from "../services/splitReusePreview";
import type { WorkloadRevocationImpact } from "../domain/workload/revocationService";


/**
 * 真实数据流竖切片（Q-09-C：Deck → Canvas UnitCard → 动态 Slot → drop）：
 * - Deck：deckStore.activeType 切换 + dataService.getCards() 真实筛选
 * - Canvas：canvasStore.cards（placement）+ 真实 Card 数据解析 + ownerCardId 动态取得 Slot
 * - Drop：唯一经 dropInteraction → dropTrigger：先建立并持久化 workload_assign（D-150），
 *   持久化成功后才触发 Resolution → recommendationStore；失败经 actionError 通道透出
 *
 * 本组件不做：无限画布 / 卡片拖动重定位 / 缩放 / React Flow / Inspector /
 * Recommendation 正式 UI / Relation 线 / 动画，也不直接持久化——Drop 产生的业务事实
 * （workload_assign，D-150）由 dropTrigger → ActionSubmissionService 服务层建立并持久化，
 * 组件只做接线。
 */

const CARD_GROUPS: CardType[] = ["unit", "workload", "budget"];
const PLACEHOLDER = "（无）";

function useCards(): {
  cards: AnyCard[];
  relations: Relation[];
  bootError: string | undefined;
  reload: () => void;
} {
  const [cards, setCards] = useState<AnyCard[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [bootError, setBootError] = useState<string | undefined>(undefined);
  const [refreshToken, setRefreshToken] = useState(0);
  useEffect(() => {
    let alive = true;
    Promise.all([dataService.getCards(), dataService.getRelations()])
      .then(([cardResult, relationResult]) => {
        if (alive) {
          setCards(cardResult);
          setRelations(relationResult);
          ensureCanvasBootstrapped(cardResult);
        }
      })
      .catch((error) => {
        // 本地后端连接失败等启动异常：如实呈现，不静默空白
        if (alive) {
          setBootError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      alive = false;
    };
  }, [refreshToken]);
  const reload = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);
  return { cards, relations, bootError, reload };
}

export function App() {
  const { cards, relations, bootError, reload } = useCards();

  // ---- 数据来源面板（R4a-2 本地文件夹存储接入；最小功能面板，非正式 UI）----
  const localDataService = dataService instanceof LocalFolderDataService ? dataService : undefined;
  const [seedBusy, setSeedBusy] = useState(false);
  // R4b 备份/恢复（用户批准设计：全量替换 + 恢复前自动快照）
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | undefined>(undefined);
  const [backupListVisible, setBackupListVisible] = useState(false);
  const [backupEntries, setBackupEntries] = useState<
    Array<{ name: string; createdAt: string | null; marker: string | null }>
  >([]);
  const [restoreCandidate, setRestoreCandidate] = useState<string | undefined>(undefined);

  const refreshBackupList = async () => {
    if (!localDataService) return;
    const entries = await localDataService.listBackups();
    setBackupEntries(entries);
  };
  const handleCreateBackup = async () => {
    if (!localDataService || backupBusy) return;
    setBackupBusy(true);
    setBackupMessage(undefined);
    setActionError(undefined);
    try {
      const backup = await localDataService.createBackup();
      setBackupMessage(`备份完成：${backup.name}`);
      await refreshBackupList();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBackupBusy(false);
    }
  };
  const handleToggleBackupList = async () => {
    if (!localDataService || backupBusy) return;
    const next = !backupListVisible;
    setBackupListVisible(next);
    setRestoreCandidate(undefined);
    if (next) {
      await refreshBackupList();
    }
  };
  const handleConfirmRestore = async (name: string) => {
    if (!localDataService || backupBusy) return;
    setBackupBusy(true);
    setActionError(undefined);
    try {
      // 恢复 = 全量替换（用户批准）；服务端自动先做"恢复前快照"
      const result = await localDataService.restoreBackup(name);
      setRestoreCandidate(undefined);
      setBackupMessage(
        `已恢复自 ${result.restoredFrom}；恢复前快照：${result.preRestoreSnapshot}（可随时再恢复回来）`
      );
      // 恢复替换了全部数据集合：刷新界面数据 + 推荐面板与落盘推荐同步
      reload();
      const recommendations = await dataService.getRecommendations(undefined);
      recommendationStore.getState().setRecommendations(recommendations);
      await refreshBackupList();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBackupBusy(false);
    }
  };
  const handleSeedDemo = async () => {
    if (!localDataService || seedBusy) return;
    setSeedBusy(true);
    setActionError(undefined);
    try {
      await seedDemoData(localDataService);
      reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setSeedBusy(false);
    }
  };
  const handleClearDemo = async () => {
    if (!localDataService || seedBusy) return;
    setSeedBusy(true);
    setActionError(undefined);
    try {
      await clearDemoData(localDataService);
      reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setSeedBusy(false);
    }
  };

  // vanilla zustand store → React 渲染订阅
  useSyncExternalStore(canvasStore.subscribe, canvasStore.getState);
  useSyncExternalStore(deckStore.subscribe, deckStore.getState);
  useSyncExternalStore(recommendationStore.subscribe, recommendationStore.getState);

  // UI selection state（非 Domain Fact）：当前选中的 recommendationId
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | undefined>(
    undefined
  );

  const activeType = deckStore.getState().activeType;
  const placements = canvasStore.getState().cards;
  // A-008 Deck 消失/还原（用户 2026-10-26 裁定）：有 active 关联的卡不显示在 Deck，
  // 解除后自动还原——纯 Relations 投影（D-001/D-010）。showAllDeckCards 状态供全院
  // 组织架构场景切换（大量卡处于关联中时不至于"Deck 全空"）。
  // 缺陷修复（2026-10-27 用户发现）：hiddenDeckCount 必须按**过滤视图**计算且恒定，
  // 不随开关状态变化——原实现按当前显示数差值计算，开关打开后差值归零导致按钮消失、
  // 无法返回过滤态。用户确认该功能未来保留，按"待用/已用"语义修复为持久双向开关。
  const [showAllDeckCards, setShowAllDeckCards] = useState(false);
  const filteredDeckCards = deckCardsOf(cards, activeType, {
    relations,
    includeAssigned: false,
  });
  const allDeckCards = deckCardsOf(cards, activeType);
  const hiddenDeckCount = allDeckCards.length - filteredDeckCards.length;
  const deckCards = showAllDeckCards ? allDeckCards : filteredDeckCards;

  // Recommendation UI 数据唯一来自 recommendationStore（纯 selector 转展示视图模型）
  const recommendationItems: RecommendationListItem[] = toRecommendationListItems(
    recommendationStore.getState().recommendations
  );
  const selectedDetail: RecommendationDetail | undefined = toRecommendationDetail(
    recommendationStore.getState().getRecommendationById(selectedRecommendationId ?? "")
  );
  const handleSelectRecommendation = (id: string) => {
    // 仅更新 UI selection：不记录 UserDecision、不触发 executeDecision/cancelOrDismiss、
    // 不创建 Relation、不产生任何 Domain Fact
    setSelectedRecommendationId(id);
  };

  // ---- Confirm / Cancel / Dismiss 操作（第一刀）----
  // 选中条目的原始 Recommendation（store 读取，含完整 payload）
  const selectedRecommendation = selectedRecommendationId
    ? recommendationStore.getState().getRecommendationById(selectedRecommendationId)
    : undefined;
  const confirmAction = selectedRecommendation
    ? confirmActionFor(selectedRecommendation)
    : undefined;
  // confirm_split 专用：参数草稿（初始值 = splitPlan 建议的深拷贝；用户编辑后才成为正式参数）
  const [splitDraft, setSplitDraft] = useState<SplitDraft | undefined>(undefined);
  useEffect(() => {
    // 选中推荐变化时重置草稿为该推荐的建议值（不残留上一条的编辑）
    setSplitDraft(
      selectedRecommendation ? draftFromRecommendation(selectedRecommendation) : undefined
    );
  }, [selectedRecommendationId]);
  const executingAction = recommendationStore.getState().executingAction;
  const [actionError, setActionError] = useState<string | undefined>(undefined);

  // ---- R3 Q3 复用可见性：确认拆分前只读预览（面板可见，不静默复用）----
  const [reusePreview, setReusePreview] = useState<(string | undefined)[] | undefined>(undefined);
  useEffect(() => {
    if (confirmAction !== "confirm_split" || !splitDraft) {
      setReusePreview(undefined);
      return;
    }
    let alive = true;
    const parameters = buildSplitParameters(splitDraft);
    previewSplitReuse(dataService, splitDraft.parentResultId, parameters.children)
      .then((preview) => {
        if (alive) setReusePreview(preview);
      })
      .catch(() => {
        // 预览是提示信息：失败不渲染提示、不阻塞确认（执行时以实时事实为准）
        if (alive) setReusePreview(undefined);
      });
    return () => {
      alive = false;
    };
    // splitDraft 随用户编辑变化 → 预览随之刷新（本地只读查询，代价可忽略）
  }, [confirmAction, splitDraft]);

  const handleConfirm = async () => {
    if (!selectedRecommendation || !confirmAction || executingAction) return;
    setActionError(undefined);
    const sourceUnitId = sourceUnitIdFrom(selectedRecommendation);
    // UserDecision 契约：recommendationId / action / decidedAt / sourceUnitId（use_existing 族需要）
    // payload.targetWorkloadCardId 由 executor 从 recommendation.payload 读取（既有 fallback 语义），
    // UI 不构造 decision 参数 fallback，不现场推导业务参数。
    const decision = {
      recommendationId: selectedRecommendation.id,
      action: confirmAction,
      ...(sourceUnitId ? { sourceUnitId } : {}),
      // confirm_split：splitParameters 必须来自用户确认后的草稿（D-145 裁定 A）；
      // payload.splitPlan 仅是建议，永远不作为 fallback。
      ...(confirmAction === "confirm_split" && splitDraft
        ? { splitParameters: buildSplitParameters(splitDraft) }
        : {}),
      decidedAt: new Date().toISOString(),
    };
    try {
      const context = await buildActionContext(
        dataService,
        recommendationStore.getState().recommendations,
        sourceWorkloadCardFrom(selectedRecommendation, cards)
      );
      const result = await recommendationStore
        .getState()
        .executeDecision(decision as Parameters<
          ReturnType<typeof recommendationStore.getState>["executeDecision"]
        >[0], context);
      if (!result.success) {
        setActionError(result.error ?? "操作未成功");
      }
    } catch (error) {
      // 持久化/执行异常：store 保持 recommended（P2-6/持久化边界不变）；UI 不伪装 accepted
      setActionError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCancelOrDismiss = async (action: "cancel" | "dismiss") => {
    if (!selectedRecommendation || executingAction) return;
    setActionError(undefined);
    try {
      const context = await buildActionContext(
        dataService,
        recommendationStore.getState().recommendations,
        sourceWorkloadCardFrom(selectedRecommendation, cards)
      );
      // P2-6 通道边界：cancel/dismiss 只走 cancelOrDismiss，不进 executeDecision
      // rejectionReason 保持可选（本轮不要求填写，不新增必填规则）
      const result = await recommendationStore
        .getState()
        .cancelOrDismiss(selectedRecommendation.id, action, undefined, context);
      if (!result.success) {
        setActionError(result.error ?? "操作未成功");
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  };

  // ---- 撤回操作接线（D-153 层撤回 / D-158 全路径撤回：两个独立入口，不合并）----
  const workloadOptions = deckCardsOf(cards, "workload");
  const [revocationTargetCardId, setRevocationTargetCardId] = useState<string>("");
  const [fullPathPreview, setFullPathPreview] = useState<WorkloadRevocationImpact | undefined>(
    undefined
  );
  const [revocationBusy, setRevocationBusy] = useState(false);
  const [revocationResult, setRevocationResult] = useState<string | undefined>(undefined);

  const handlePreviewFullPath = async () => {
    if (!revocationTargetCardId || revocationBusy) return;
    setActionError(undefined);
    setRevocationBusy(true);
    try {
      // 预览严格只读：不写入、不删除、不失效任何业务数据
      const impact = await previewFullPathRevocation(dataService, revocationTargetCardId);
      setRevocationResult(undefined);
      setFullPathPreview(impact);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setRevocationBusy(false);
    }
  };
  const handleCancelFullPathPreview = () => {
    // 取消确认 = 不执行撤回
    setFullPathPreview(undefined);
  };
  const handleConfirmFullPathRevoke = async () => {
    if (!revocationTargetCardId || !fullPathPreview || revocationBusy) return;
    setRevocationBusy(true);
    try {
      // 确认范围守卫：执行前重新计算影响集，与用户确认的预览全字段比较；
      // 不一致时入口内部中止（零撤回写入）并抛错要求重新预览
      const impact = await revokeDerivedPathAsPreviewed(
        dataService,
        revocationTargetCardId,
        fullPathPreview
      );
      setFullPathPreview(undefined);
      setRevocationResult(
        `全路径撤回完成：删除 ${impact.deletedCards.length} 张派生卡、` +
          `${impact.deletedWorkloadResults.length} 个派生结果；核算失效 ` +
          `${impact.revokedCalculationResults.length} 项（待重算）；关系软删 ` +
          `${impact.deactivatedRelations.length} 条；来源不明待人工 ` +
          `${impact.manualReview.cards.length} 项（未删除）`
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setRevocationBusy(false);
    }
  };
  const handleLayerRevoke = async () => {
    if (!revocationTargetCardId || revocationBusy) return;
    setActionError(undefined);
    setRevocationBusy(true);
    try {
      const impact = await revokeSplitLayer(dataService, revocationTargetCardId);
      setFullPathPreview(undefined);
      setRevocationResult(
        `层撤回完成（D-153）：未使用子卡软失效 ${impact.revokedCards.length} 张；` +
          `保留已使用子卡 ${impact.retained.length} 张；拆分边软删 ` +
          `${impact.deactivatedRelations.length} 条`
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setRevocationBusy(false);
    }
  };

  const makeSlotDropHandler = (slot: CardSlot) => (event: ReactDragEvent) => {
    // 原生 DnD 需要 preventDefault 才能接收 drop；无业务语义
    event.preventDefault();
    // 槽已接管的业务拖放不再冒泡到画布根（画布根的槽外解除/重定位不重复处理）
    event.stopPropagation();
    void onWorkloadCardSlotDrop(
      dataService,
      event.dataTransfer as unknown as DataTransferLike,
      slot
    )
      .then((result) => {
        // D-150 规则 4：持久化失败不得伪报成功——失败结果复用既有 actionError 通道透出。
        if (result.outcome === "relation_failed" || result.outcome === "move_failed") {
          setActionError("error" in result && result.error ? result.error : "操作未成功");
          return;
        }
        // 建立关系（D-150 resolved / U-UI-13 budget_resolved）或槽间移动（moved / budget_moved）成功 → 刷新槽内卡显示
        if (
          result.outcome === "resolved" ||
          result.outcome === "moved" ||
          result.outcome === "budget_resolved" ||
          result.outcome === "budget_moved" ||
          result.outcome === "structure_resolved" ||
          result.outcome === "unit_moved"
        ) {
          reload();
        }
        // ignored（无效 Drop）与 no_op_same_unit（放回原槽）：静默，零变化（AGENTS §20 / A-002b）
      })
      .catch((error) => {
        // Resolution 阶段异常：关系事实已成立，异常如实透出，不静默吞掉
        setActionError(error instanceof Error ? error.message : String(error));
      });
  };
  const makeSlotDragOverHandler = () => (event: ReactDragEvent) => {
    // 原生 DnD 需要 dragOver preventDefault 才允许 drop；无业务语义
    event.preventDefault();
  };
  // A-002b 槽外解除 + U-UI-10 画布重定位：画布根 drop 的统一入口——
  // 画布移动 payload（纯 UI 状态）优先；否则走槽内卡拖出的解除判定
  const handleCanvasRootDrop = (event: ReactDragEvent) => {
    event.preventDefault();
    const dataTransfer = event.dataTransfer as unknown as DataTransferLike;
    const moveCardId = dataTransfer.getData(CANVAS_MOVE_DRAG_TYPE);
    if (moveCardId) {
      // U-UI-10 最小版重定位：placement 是 UI 状态（D-010），同 cardId upsert 幂等
      // 坐标非有限值（异常环境/合成事件缺省）时跳过，避免 NaN 污染 placement
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const placement = computeDropPlacement(event.clientX, event.clientY, {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
      canvasStore.getState().upsertCardPlacement({ cardId: moveCardId, ...placement });
      return;
    }
    void onWorkloadCardDropOutsideSlots(dataService, dataTransfer)
      .then((result) => {
        if (result.outcome === "unassigned") {
          reload(); // 解除成功 → 刷新槽内卡显示
        }
        // no_op（本无关系）/ ignored（Deck 来源拖到槽外）：静默
      })
      .catch((error) => {
        setActionError(error instanceof Error ? error.message : String(error));
      });
  };
  // A-002b 槽外解除：卡牌盒 drop（Deck 区域无画布重定位语义，仅解除判定）
  const handleDropOutsideSlots = (event: ReactDragEvent) => {
    event.preventDefault();
    void onWorkloadCardDropOutsideSlots(
      dataService,
      event.dataTransfer as unknown as DataTransferLike
    )
      .then((result) => {
        if (result.outcome === "unassigned") {
          reload(); // 解除成功 → 刷新槽内卡显示
        }
        // no_op（本无关系）/ ignored（Deck 来源拖到槽外）：静默
      })
      .catch((error) => {
        setActionError(error instanceof Error ? error.message : String(error));
      });
  };

  // 槽内已挂工作量卡（A-002b 槽内容渲染 + 拖出源）：relations 是唯一事实源（D-001），
  // 经 active workload_assign 投影；D-154：revoked 卡业务世界不存在，不出现在槽内
  const assignedWorkloadCardsOf = (unitCardId: string) => {
    const assignedCardIds = relations
      .filter(
        (relation) =>
          relation.active &&
          relation.type === "workload_assign" &&
          relation.sourceId === unitCardId
      )
      .map((relation) => relation.targetId);
    return assignedCardIds
      .map((cardId) => {
        const card = cardById(cards, cardId);
        const workloadCard = asWorkloadCard(card);
        return workloadCard ? { card: workloadCard } : undefined;
      })
      .filter((entry): entry is { card: WorkloadCard } => entry !== undefined);
  };

  // A-009 单元槽内容：已挂子单元（structure 方向 子Unit→父Unit：targetId = 本单元）
  const assignedChildUnitsOf = (unitCardId: string) => {
    const childUnitIds = relations
      .filter(
        (relation) =>
          relation.active &&
          relation.type === "structure" &&
          relation.targetId === unitCardId
      )
      .map((relation) => relation.sourceId);
    return childUnitIds
      .map((cardId) => {
        const card = cardById(cards, cardId);
        const unit = asUnitCard(card);
        return unit ? { card: unit } : undefined;
      })
      .filter((entry): entry is { card: UnitCard } => entry !== undefined);
  };

  // U-UI-13 预算槽内容：已分配预算卡（budget_assign 方向 Budget→Unit：targetId = 本单元）
  const assignedBudgetCardsOf = (unitCardId: string) => {
    const assignedCardIds = relations
      .filter(
        (relation) =>
          relation.active &&
          relation.type === "budget_assign" &&
          relation.targetId === unitCardId
      )
      .map((relation) => relation.sourceId);
    return assignedCardIds
      .map((cardId) => {
        const card = cardById(cards, cardId);
        return card && card.type === "budget" ? { card: card as BudgetCard } : undefined;
      })
      .filter((entry): entry is { card: BudgetCard } => entry !== undefined);
  };

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, display: "flex", gap: 48 }}>
      {/* Deck：真实 Card 数据（activeType 切换 CardGroup）。
          A-002b：Deck 区域同时是"槽外解除"目标——从槽内拖出的卡在卡牌盒松开 = 解除 */}
      <section
        aria-label="deck"
        data-testid="deck-root"
        style={{ width: 220 }}
        onDragOver={makeSlotDragOverHandler()}
        onDrop={handleDropOutsideSlots}
      >
        <h2>Deck</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {CARD_GROUPS.map((group) => (
            <button
              key={group}
              data-testid={`deck-tab-${group}`}
              onClick={() => deckStore.getState().setActiveType(group)}
              style={{ fontWeight: activeType === group ? "bold" : "normal" }}
            >
              {group}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {/* A-008（2026-10-27 修复）：持久双向开关——hiddenDeckCount 按过滤视图恒定计算，
              开关打开后按钮仍显示"只显示待用"可随时返回过滤态（用户确认该功能未来保留）。
              语义标签：待用 = 未建立关联、已用 = 已关联（挂入卡槽中） */}
          {hiddenDeckCount > 0 && (
            <button
              data-testid="deck-show-all-toggle"
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => setShowAllDeckCards((value) => !value)}
            >
              {showAllDeckCards
                ? "只显示待用卡牌"
                : `显示全部（含已用 ${hiddenDeckCount}）`}
            </button>
          )}
          {deckCards.length === 0 && hiddenDeckCount > 0 && (
            <div data-testid="deck-empty-with-assigned" style={{ fontSize: 11, color: "#888" }}>
              全部 {activeType} 卡已在卡槽中（{hiddenDeckCount} 张已用）
            </div>
          )}
          {deckCards.map((card) => {
            const workloadCard = asWorkloadCard(card);
            const unitCard = asUnitCard(card);
            const isBudget = activeType === "budget" && card.type === "budget";
            const isUnit = activeType === "unit" && unitCard !== undefined;
            const isDraggable = isBudget || isUnit || (activeType === "workload" && workloadCard !== undefined);
            return (
              <div
                key={card.id}
                data-testid={`deck-card-${card.id}`}
                draggable={isDraggable}
                onDragStart={
                  isDraggable && workloadCard
                    ? (event) =>
                        onWorkloadCardDragStart(
                          event.dataTransfer as unknown as DataTransferLike,
                          workloadCard.id
                        )
                    : isDraggable && isBudget
                      ? (event) =>
                          onBudgetCardDragStart(
                            event.dataTransfer as unknown as DataTransferLike,
                            card.id
                          )
                      : isDraggable && isUnit && unitCard
                        ? (event) =>
                            onUnitCardDragStart(
                              event.dataTransfer as unknown as DataTransferLike,
                              unitCard.id
                            )
                        : undefined
                }
                style={{
                  padding: 10,
                  border: `1px solid ${isDraggable ? "#88f" : "#ccc"}`,
                  borderRadius: 8,
                  background: isDraggable ? "#eef" : "#f5f5f5",
                  cursor: isDraggable ? "grab" : "default",
                  fontSize: 13,
                }}
              >
                {card.name}
              </div>
            );
          })}
        </div>
      </section>

      {/* Canvas：canvasStore.cards（placement）→ 真实 UnitCard → 动态 Slot。
          A-002b：画布空白区域同时是"槽外解除"目标——从槽内拖出的卡在空白处松开 = 解除 */}
      <section aria-label="canvas" style={{ flex: 1 }}>
        <h2>Canvas</h2>
        <div
          data-testid="canvas-root"
          style={{ position: "relative", width: 520, height: 400, border: "1px solid #999" }}
          onDragOver={makeSlotDragOverHandler()}
          onDrop={handleCanvasRootDrop}
        >
          {placements.map((placement) => {
            const card = cardById(cards, placement.cardId);
            const unitCard = asUnitCard(card);
            if (!unitCard) return null;
            const slots = slotsOfUnit(mockSlots, unitCard);
            return (
              <div
                key={placement.cardId}
                data-testid={`canvas-unit-${unitCard.id}`}
                draggable
                onDragStart={(event) => {
                  // U-UI-10 画布重定位（最小版）：整卡拖动 = 纯 placement 更新（D-010 UI 状态）。
                  // 守卫：槽内芯片发起的拖动（dragstart 冒泡到本卡）不得被当作画布移动——
                  // 事件 target 是芯片时跳过，芯片自身 onDragStart 已携带业务 payload。
                  if (event.target !== event.currentTarget) return;
                  (event.dataTransfer as unknown as DataTransferLike).setData(
                    CANVAS_MOVE_DRAG_TYPE,
                    unitCard.id
                  );
                }}
                style={{
                  position: "absolute",
                  left: placement.x,
                  top: placement.y,
                  padding: 10,
                  border: "2px solid #444",
                  borderRadius: 10,
                  background: "#fff",
                  width: 180,
                }}
              >
                <strong style={{ fontSize: 13 }}>{unitCard.name}</strong>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      data-testid={`slot-${slot.ownerCardId}-${slot.type}`}
                      onDragOver={makeSlotDragOverHandler()}
                      onDrop={makeSlotDropHandler(slot)}
                      style={{
                        padding: 8,
                        fontSize: 12,
                        border: `1px dashed ${slot.type === "workload" ? "#4a6" : "#a46"}`,
                        background: slot.type === "workload" ? "#f2faf4" : "#faf4f2",
                        cursor: "default",
                      }}
                    >
                      {slot.type === "workload" ? "Workload Slot" : `${slot.type} Slot`}
                      {/* A-002b 槽内容：已挂工作量卡（active workload_assign 投影，D-001 Relations 唯一事实源）。
                          槽内卡可拖出：落其他槽 = 移动（A-002）、落槽外 = 解除（A-002b）、落回原槽 = no-op */}
                      {slot.type === "workload" &&
                        assignedWorkloadCardsOf(unitCard.id).map(({ card }) => (
                          <div
                            key={card.id}
                            data-testid={`slot-chip-${unitCard.id}-${card.id}`}
                            draggable
                            onDragStart={(event) =>
                              onWorkloadCardSlotDragStart(
                                event.dataTransfer as unknown as DataTransferLike,
                                card.id,
                                unitCard.id
                              )
                            }
                            style={{
                              marginTop: 4,
                              padding: "2px 6px",
                              fontSize: 11,
                              background: "#cfe3cf",
                              borderRadius: 4,
                              cursor: "grab",
                            }}
                          >
                            {card.name}
                          </div>
                        ))}
                      {/* U-UI-13 预算槽内容：已分配预算卡（budget_assign 方向 Budget→Unit 投影）。
                          预算芯片同款手势：落其他单元预算槽 = 移动、落槽外 = 解除、落回原槽 = no-op */}
                      {slot.type === "budget" &&
                        assignedBudgetCardsOf(unitCard.id).map(({ card }) => (
                          <div
                            key={card.id}
                            data-testid={`budget-chip-${unitCard.id}-${card.id}`}
                            draggable
                            onDragStart={(event) =>
                              onBudgetCardSlotDragStart(
                                event.dataTransfer as unknown as DataTransferLike,
                                card.id,
                                unitCard.id
                              )
                            }
                            style={{
                              marginTop: 4,
                              padding: "2px 6px",
                              fontSize: 11,
                              background: "#e8d5e8",
                              borderRadius: 4,
                              cursor: "grab",
                            }}
                          >
                            {card.name}
                          </div>
                        ))}
                      {/* A-009 单元槽内容：已挂子单元（structure 投影），同款拖出手势 */}
                      {slot.type === "unit" &&
                        assignedChildUnitsOf(unitCard.id).map(({ card }) => (
                          <div
                            key={card.id}
                            data-testid={`unit-chip-${unitCard.id}-${card.id}`}
                            draggable
                            onDragStart={(event) =>
                              onUnitCardSlotDragStart(
                                event.dataTransfer as unknown as DataTransferLike,
                                card.id,
                                unitCard.id
                              )
                            }
                            style={{
                              marginTop: 4,
                              padding: "2px 6px",
                              fontSize: 11,
                              background: "#d5d5e8",
                              borderRadius: 4,
                              cursor: "grab",
                            }}
                          >
                            {card.name}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recommendation UI 第一刀：数据驱动列表 + 选择 + 基本内容（非完整 Inspector） */}
      <section aria-label="recommendation-ui" style={{ width: 320 }}>
        <h2>Recommendations</h2>
        {recommendationItems.length === 0 ? (
          <p data-testid="recommendation-empty">（暂无推荐）</p>
        ) : (
          <ul data-testid="recommendation-list" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {recommendationItems.map((item) => (
              <li
                key={item.id}
                data-testid={`recommendation-item-${item.id}`}
                onClick={() => handleSelectRecommendation(item.id)}
                style={{
                  padding: 10,
                  border: `1px solid ${selectedRecommendationId === item.id ? "#44f" : "#ccc"}`,
                  borderRadius: 8,
                  background: selectedRecommendationId === item.id ? "#eef4ff" : "#fafafa",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <div>
                  <strong>{item.kind}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12 }}>{STATUS_LABEL[item.status]}</span>
                </div>
                <div style={{ fontSize: 12, color: "#555" }}>{item.reason ?? item.id}</div>
              </li>
            ))}
          </ul>
        )}
        {selectedDetail ? (
          <div
            data-testid="recommendation-detail"
            style={{ marginTop: 16, padding: 12, border: "1px solid #888", borderRadius: 8, fontSize: 13 }}
          >
            <div data-testid="detail-id">id: {selectedDetail.id}</div>
            <div data-testid="detail-kind">kind: {selectedDetail.kind}</div>
            <div data-testid="detail-status">status: {STATUS_LABEL[selectedDetail.status]}</div>
            <div data-testid="detail-updated-at">updatedAt: {selectedDetail.updatedAt}</div>
            {selectedDetail.payloadType !== undefined && (
              <div data-testid="detail-payload-type">payload.type: {selectedDetail.payloadType}</div>
            )}
            {selectedDetail.targetResultId !== undefined && (
              <div data-testid="detail-target-result-id">
                targetResultId: {selectedDetail.targetResultId}
              </div>
            )}
            <div data-testid="detail-reason">reason: {selectedDetail.reason ?? PLACEHOLDER}</div>
            {selectedDetail.matchingBasis ? (
              <div
                data-testid="matching-basis"
                style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #ddd" }}
              >
                <div data-testid="basis-match-type">
                  Match Type: {selectedDetail.matchingBasis.matchType}
                </div>
                <div data-testid="basis-match-details">
                  Match Details: {selectedDetail.matchingBasis.matchDetails}
                </div>
                <div data-testid="basis-unit-relation">
                  Unit Relation: {selectedDetail.matchingBasis.unitRelation}
                </div>
                {selectedDetail.matchingBasis.resultDimensions !== undefined && (
                  <div data-testid="basis-result-dimensions">
                    Result Dimensions:{" "}
                    {Object.entries(selectedDetail.matchingBasis.resultDimensions)
                      .map(([key, value]) => `${key}=${value}`)
                      .join(", ")}
                  </div>
                )}
                {selectedDetail.matchingBasis.mappingEvidence !== undefined && (
                  <div data-testid="basis-mapping-evidence">
                    Mapping Evidence: {selectedDetail.matchingBasis.mappingEvidence}
                  </div>
                )}
                {selectedDetail.matchingBasis.mappingEvidences !== undefined && (
                  <div data-testid="basis-mapping-evidences">
                    Mapping Evidences: {selectedDetail.matchingBasis.mappingEvidences.length} 条
                    （首条目标：{selectedDetail.matchingBasis.mappingEvidences[0]?.targetChildUnitId}）
                  </div>
                )}
                {selectedDetail.matchingBasis.splitFeasibility !== undefined && (
                  <div data-testid="basis-split-feasibility">
                    Split Feasibility: {String(selectedDetail.matchingBasis.splitFeasibility.feasible)}
                    {selectedDetail.matchingBasis.splitFeasibility.requiredMappings !== undefined &&
                      `（requiredMappings: ${selectedDetail.matchingBasis.splitFeasibility.requiredMappings.join(", ")}）`}
                  </div>
                )}
                {selectedDetail.matchingBasis.aggregationFeasibility !== undefined && (
                  <div data-testid="basis-aggregation-feasibility">
                    Aggregation Feasibility:{" "}
                    {String(selectedDetail.matchingBasis.aggregationFeasibility.feasible)}
                  </div>
                )}
                {selectedDetail.matchingBasis.existingResult !== undefined && (
                  <div data-testid="basis-existing-result">
                    Existing Result: {selectedDetail.matchingBasis.existingResult.id}
                  </div>
                )}
              </div>
            ) : (
              <div data-testid="matching-basis-absent" style={{ marginTop: 8, fontSize: 12 }}>
                （无 Matching Basis 快照）
              </div>
            )}
            {confirmAction === "confirm_split" && splitDraft ? (
              <div
                data-testid="split-parameters-panel"
                style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #ddd", fontSize: 12 }}
              >
                <div>拆分参数（正式执行参数，初始值来自系统建议）</div>
                {reusePreview !== undefined && reusePreview.some((id) => id !== undefined) && (
                  <div data-testid="split-reuse-summary" style={{ marginTop: 4, color: "#262" }}>
                    本次拆分将复用 {reusePreview.filter((id) => id !== undefined).length} 个既有产物
                    （同源 + 同筛选条件 = 相同拆分过程；新名将不生效）
                  </div>
                )}
                <div data-testid="split-parent-result">parentResultId: {splitDraft.parentResultId}</div>
                {splitDraft.children.map((child, index) => (
                  <div
                    key={`${child.targetUnitId}-${index}`}
                    data-testid={`split-child-${index}`}
                    style={{ marginTop: 6, display: "grid", gap: 4 }}
                  >
                    <div>目标子单元：{child.targetUnitId}（只读）</div>
                    <label>
                      名称：
                      <input
                        data-testid={`split-child-name-${index}`}
                        value={child.name}
                        onChange={(event) => {
                          const next = [...splitDraft.children];
                          next[index] = { ...child, name: event.target.value };
                          setSplitDraft({ ...splitDraft, children: next });
                        }}
                      />
                    </label>
                    <label>
                      数值：
                      <input
                        data-testid={`split-child-value-${index}`}
                        type="number"
                        value={child.value ?? ""}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const next = [...splitDraft.children];
                          next[index] = {
                            ...child,
                            value: raw === "" ? null : Number(raw),
                          };
                          setSplitDraft({ ...splitDraft, children: next });
                        }}
                      />
                    </label>
                    <label>
                      ResultSet ID：
                      <input
                        data-testid={`split-child-rs-${index}`}
                        value={child.resultSetId}
                        onChange={(event) => {
                          const next = [...splitDraft.children];
                          next[index] = { ...child, resultSetId: event.target.value };
                          setSplitDraft({ ...splitDraft, children: next });
                        }}
                      />
                    </label>
                    <label>
                      ResultItem ID：
                      <input
                        data-testid={`split-child-ri-${index}`}
                        value={child.resultItemId}
                        onChange={(event) => {
                          const next = [...splitDraft.children];
                          next[index] = { ...child, resultItemId: event.target.value };
                          setSplitDraft({ ...splitDraft, children: next });
                        }}
                      />
                    </label>
                    {reusePreview?.[index] !== undefined && (
                      <div data-testid={`split-child-reuse-${index}`} style={{ color: "#262" }}>
                        ♻ 将复用既有结果（本行输入的新名称将不生效）
                      </div>
                    )}
                  </div>
                ))}
                <label style={{ marginTop: 6, display: "block" }}>
                  splitType：
                  <select
                    data-testid="split-type-select"
                    value={splitDraft.splitType}
                    onChange={(event) =>
                      setSplitDraft({
                        ...splitDraft,
                        splitType: event.target.value as "complete" | "partial",
                      })
                    }
                  >
                    <option value="partial">partial</option>
                    <option value="complete">complete</option>
                  </select>
                </label>
              </div>
            ) : null}
            {/* 操作按钮（第一刀）：仅当推荐处于待处理状态时显示 */}
            {selectedDetail.status === "recommended" && (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                {confirmAction !== undefined && (
                  <button
                    data-testid="confirm-button"
                    disabled={
                      executingAction ||
                      (confirmAction === "confirm_split" &&
                        (!splitDraft || !isSplitDraftComplete(splitDraft)))
                    }
                    onClick={() => void handleConfirm()}
                    style={{ padding: "6px 12px", cursor: executingAction ? "wait" : "pointer" }}
                  >
                    {confirmAction === "confirm_split" ? "确认拆分" : "Confirm"}
                  </button>
                )}
                <button
                  data-testid="cancel-button"
                  disabled={executingAction}
                  onClick={() => void handleCancelOrDismiss("cancel")}
                  style={{ padding: "6px 12px" }}
                >
                  暂不采用
                </button>
                <button
                  data-testid="dismiss-button"
                  disabled={executingAction}
                  onClick={() => void handleCancelOrDismiss("dismiss")}
                  style={{ padding: "6px 12px" }}
                >
                  驳回
                </button>
              </div>
            )}
          </div>
        ) : (
          <p data-testid="recommendation-detail-empty" style={{ marginTop: 16, fontSize: 13 }}>
            （未选择推荐）
          </p>
        )}
      </section>

      {/* 撤回操作（D-153 层撤回 / D-158 全路径撤回）：两个独立入口，语义不合并 */}
      <section aria-label="revocation" style={{ width: 320 }}>
        <h2>撤回操作</h2>
        <select
          data-testid="revocation-target-select"
          value={revocationTargetCardId}
          onChange={(event) => {
            setRevocationTargetCardId(event.target.value);
            setFullPathPreview(undefined);
            setRevocationResult(undefined);
          }}
          style={{ width: "100%", marginBottom: 8 }}
        >
          <option value="">（选择 WorkloadCard）</option>
          {workloadOptions.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            data-testid="revoke-layer-button"
            disabled={!revocationTargetCardId || revocationBusy}
            onClick={() => void handleLayerRevoke()}
          >
            撤回当前拆分层（D-153）
          </button>
          <button
            data-testid="preview-fullpath-button"
            disabled={!revocationTargetCardId || revocationBusy}
            onClick={() => void handlePreviewFullPath()}
          >
            全路径撤回预览（D-158）
          </button>
        </div>
        {fullPathPreview ? (
          <div
            data-testid="fullpath-preview"
            style={{ padding: 12, border: "1px solid #888", borderRadius: 8, fontSize: 13 }}
          >
            <div>影响范围预览（只读，尚未执行任何撤回）：</div>
            <div data-testid="preview-deleted-cards">
              待删除派生卡：{fullPathPreview.deletedCards.length}
            </div>
            {fullPathPreview.deletedCards.length > 0 ? (
              <div
                data-testid="preview-deleted-cards-list"
                style={{ maxHeight: 96, overflow: "auto", fontSize: 12, color: "#555", paddingLeft: 8 }}
              >
                {fullPathPreview.deletedCards.map((card) => (
                  <div key={card.id}>删除卡：{card.name}（{card.id}）</div>
                ))}
              </div>
            ) : null}
            <div data-testid="preview-deleted-results">
              待删除派生结果：{fullPathPreview.deletedWorkloadResults.length}
            </div>
            {fullPathPreview.deletedWorkloadResults.length > 0 ? (
              <div
                data-testid="preview-deleted-results-list"
                style={{ maxHeight: 96, overflow: "auto", fontSize: 12, color: "#555", paddingLeft: 8 }}
              >
                {fullPathPreview.deletedWorkloadResults.map((result) => (
                  <div key={result.id}>删除结果：{result.name}（{result.id}）</div>
                ))}
              </div>
            ) : null}
            <div data-testid="preview-calc">
              核算失效（待重算，不为 0）：{fullPathPreview.revokedCalculationResults.length}
            </div>
            {fullPathPreview.revokedCalculationResults.length > 0 ? (
              <div
                data-testid="preview-calc-list"
                style={{ maxHeight: 96, overflow: "auto", fontSize: 12, color: "#555", paddingLeft: 8 }}
              >
                {fullPathPreview.revokedCalculationResults.map((calc) => (
                  <div key={calc.id}>失效核算：{calc.id}</div>
                ))}
              </div>
            ) : null}
            <div data-testid="preview-relations">
              关系软删：{fullPathPreview.deactivatedRelations.length}
            </div>
            {fullPathPreview.deactivatedRelations.length > 0 ? (
              <div
                data-testid="preview-relations-list"
                style={{ maxHeight: 96, overflow: "auto", fontSize: 12, color: "#555", paddingLeft: 8 }}
              >
                {fullPathPreview.deactivatedRelations.map((relation) => (
                  <div key={relation.id}>软删关系：{relation.id}</div>
                ))}
              </div>
            ) : null}
            <div data-testid="preview-manual-review">
              来源不明对象（不自动删除，等待人工处理）：{fullPathPreview.manualReview.cards.length} 卡、
              {fullPathPreview.manualReview.results.length} 结果
            </div>
            {fullPathPreview.manualReview.cards.length + fullPathPreview.manualReview.results.length > 0 ? (
              <div
                data-testid="preview-manual-review-list"
                style={{ maxHeight: 96, overflow: "auto", fontSize: 12, color: "#555", paddingLeft: 8 }}
              >
                {fullPathPreview.manualReview.cards.map((card) => (
                  <div key={card.id}>待人工卡：{card.name}（{card.id}）——不自动删除</div>
                ))}
                {fullPathPreview.manualReview.results.map((result) => (
                  <div key={result.id}>待人工结果：{result.name}（{result.id}）——不自动删除</div>
                ))}
              </div>
            ) : null}
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                data-testid="confirm-fullpath-revoke"
                disabled={revocationBusy}
                onClick={() => void handleConfirmFullPathRevoke()}
              >
                确认撤回整条派生路径
              </button>
              <button
                data-testid="cancel-fullpath-preview"
                disabled={revocationBusy}
                onClick={handleCancelFullPathPreview}
              >
                取消
              </button>
            </div>
          </div>
        ) : null}
        {revocationResult ? (
          <div data-testid="revocation-result" style={{ marginTop: 8, fontSize: 12 }}>
            {revocationResult}
          </div>
        ) : null}
      </section>

      {/* 数据来源面板（R4a-2 本地文件夹存储接入）：后端标识 + 启动错误 + 演示数据灌入/清除 */}
      <section aria-label="data-source" style={{ width: 260 }}>
        <h2>数据来源</h2>
        <div data-testid="data-backend-label" style={{ fontSize: 12, marginBottom: 8 }}>
          {runtimeDataBackend === "local" ? "本地文件夹服务（重启不丢）" : "内存演示版（刷新即失）"}
        </div>
        {bootError !== undefined && (
          <div data-testid="data-boot-error" style={{ fontSize: 12, color: "#c33" }}>
            数据服务连接失败：{bootError}
          </div>
        )}
        {runtimeDataBackend === "local" && bootError === undefined && (
          <div style={{ display: "grid", gap: 8 }}>
            {cards.length === 0 ? (
              <button data-testid="seed-demo-button" disabled={seedBusy} onClick={() => void handleSeedDemo()}>
                灌入演示数据
              </button>
            ) : (
              <button data-testid="clear-demo-button" disabled={seedBusy} onClick={() => void handleClearDemo()}>
                清除演示数据（你自建的数据不受影响）
              </button>
            )}
            {/* R4b 备份/恢复（用户批准设计）：手动全量快照 + 全量替换恢复（含自动预快照） */}
            <button
              data-testid="create-backup-button"
              disabled={backupBusy}
              onClick={() => void handleCreateBackup()}
            >
              立即备份
            </button>
            <button
              data-testid="toggle-backup-list-button"
              disabled={backupBusy}
              onClick={() => void handleToggleBackupList()}
            >
              {backupListVisible ? "收起备份列表" : "从备份恢复…"}
            </button>
            {backupListVisible && (
              <div data-testid="backup-list" style={{ display: "grid", gap: 6, maxHeight: 200, overflow: "auto", fontSize: 11 }}>
                {backupEntries.length === 0 ? (
                  <div data-testid="backup-list-empty">（暂无备份）</div>
                ) : (
                  backupEntries.map((entry) => (
                    <div
                      key={entry.name}
                      data-testid={`backup-entry-${entry.name}`}
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <span style={{ flex: 1 }}>
                        {entry.name}
                        {entry.marker === "pre-restore" ? "（恢复前快照）" : ""}
                      </span>
                      {restoreCandidate === entry.name ? (
                        <>
                          <button
                            data-testid={`confirm-restore-${entry.name}`}
                            disabled={backupBusy}
                            onClick={() => void handleConfirmRestore(entry.name)}
                          >
                            确认恢复
                          </button>
                          <button
                            disabled={backupBusy}
                            onClick={() => setRestoreCandidate(undefined)}
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          disabled={backupBusy || restoreCandidate !== undefined}
                          onClick={() => {
                            setRestoreCandidate(entry.name);
                            setBackupMessage(undefined);
                          }}
                        >
                          恢复
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            {backupMessage !== undefined && (
              <div data-testid="backup-message" style={{ fontSize: 11, color: "#262" }}>
                {backupMessage}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 共享操作错误通道（confirm / 撤回 / 预览 / 播种失败均经此呈现；不依赖推荐选中状态） */}
      {actionError !== undefined && (
        <div data-testid="action-error" style={{ width: 320, fontSize: 12, color: "#c33" }}>
          {actionError}
        </div>
      )}
    </main>
  );
}

/** 本切片用到的最小 DOM 事件形状（避免把 React 事件类型引入可测 handler 模块） */
interface ReactDragEvent {
  preventDefault(): void;
  stopPropagation(): void;
  dataTransfer: unknown;
  clientX: number;
  clientY: number;
  currentTarget: EventTarget & { getBoundingClientRect(): DOMRect };
}
