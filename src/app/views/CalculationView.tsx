import { useEffect, useState, useSyncExternalStore } from "react";

import { dataService } from "../../services/MockDataService";
import { recommendationStore } from "../../stores/recommendationStore";
import { canvasStore } from "../../stores/canvasStore";
import { deckStore } from "../../stores/deckStore";
import { mockSlots } from "../../mock/mockCards";
import type { AnyCard, CardSlot, CardType } from "../../domain/card/types";
import {
  onWorkloadCardDragStart,
  onWorkloadCardSlotDrop,
  onUnitCardDragStart,
  onBudgetCardDragStart,
  onUnitCardCanvasDrop,
  onBudgetCardSlotDrop,
  onWorkloadCardDropOnWorkloadCard,
  type DataTransferLike,
  type UnitCardDropResult,
} from "../dropInteraction";
import {
  asUnitCard,
  asWorkloadCard,
  asBudgetCard,
  cardById,
  deckCardsOf,
  ensureCanvasBootstrapped,
  slotsOfUnit,
} from "../canvasBootstrap";
import {
  STATUS_LABEL,
  toRecommendationDetail,
  toRecommendationListItems,
  type RecommendationDetail,
  type RecommendationListItem,
} from "../recommendationList";
import {
  buildActionContext,
  confirmActionFor,
  sourceUnitIdFrom,
  sourceWorkloadCardFrom,
} from "../recommendationActions";
import {
  buildSplitParameters,
  draftFromRecommendation,
  isSplitDraftComplete,
  type SplitDraft,
} from "../splitConfirmPanel";
import {
  previewFullPathRevocation,
  revokeDerivedPathAsPreviewed,
  revokeSplitLayer,
} from "../../services/revocationEntry";
import type { WorkloadRevocationImpact } from "../../domain/workload/revocationService";
import { clsx } from "clsx";
import { useI18n } from "../providers/I18nProvider";
/* Framer Motion removed for happy-dom compatibility - using CSS transitions instead */
import { useTheme } from "../providers/ThemeProvider";
import {
  LayoutDashboard,
  Calculator,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Eye,
  FileText,
  Search,
  RefreshCw,
  Download,
  Upload,
} from "lucide-react";

const CARD_GROUPS: CardType[] = ["unit", "workload", "budget"];
const PLACEHOLDER = "（无）";

function useCards(): AnyCard[] {
  const [cards, setCards] = useState<AnyCard[]>([]);
  useEffect(() => {
    let alive = true;
    void dataService.getCards().then((result) => {
      if (alive) {
        setCards(result);
        ensureCanvasBootstrapped(result);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  return cards;
}

export function CalculationView() {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();
  const cards = useCards();

  useSyncExternalStore(canvasStore.subscribe, canvasStore.getState);
  useSyncExternalStore(deckStore.subscribe, deckStore.getState);
  useSyncExternalStore(recommendationStore.subscribe, recommendationStore.getState);

  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | undefined>(undefined);

  const activeType = deckStore.getState().activeType;
  const placements = canvasStore.getState().cards;
  const deckCards = deckCardsOf(cards, activeType);

  const recommendationItems: RecommendationListItem[] = toRecommendationListItems(
    recommendationStore.getState().recommendations
  );
  const selectedDetail: RecommendationDetail | undefined = toRecommendationDetail(
    recommendationStore.getState().getRecommendationById(selectedRecommendationId ?? "")
  );
  const handleSelectRecommendation = (id: string) => {
    const rec = recommendationStore.getState().getRecommendationById(id);
    if (rec) {
      setSplitDraft(draftFromRecommendation(rec));
    }
    setSelectedRecommendationId(id);
  };

  const selectedRecommendation = selectedRecommendationId
    ? recommendationStore.getState().getRecommendationById(selectedRecommendationId)
    : undefined;
  const confirmAction = selectedRecommendation
    ? confirmActionFor(selectedRecommendation)
    : undefined;
  const [splitDraft, setSplitDraft] = useState<SplitDraft | undefined>(undefined);
  useEffect(() => {
    setSplitDraft(
      selectedRecommendation ? draftFromRecommendation(selectedRecommendation) : undefined
    );
  }, [selectedRecommendationId]);
  const executingAction = recommendationStore.getState().executingAction;
  const [actionError, setActionError] = useState<string | undefined>(undefined);

  const handleConfirm = async () => {
    if (!selectedRecommendation || !confirmAction || executingAction) return;
    setActionError(undefined);
    const sourceUnitId = sourceUnitIdFrom(selectedRecommendation);
    const decision = {
      recommendationId: selectedRecommendation.id,
      action: confirmAction,
      ...(sourceUnitId ? { sourceUnitId } : {}),
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

  const workloadOptions = deckCardsOf(cards, "workload");
  const [revocationTargetCardId, setRevocationTargetCardId] = useState<string>("");
  const [fullPathPreview, setFullPathPreview] = useState<WorkloadRevocationImpact | undefined>(undefined);
  const [revocationBusy, setRevocationBusy] = useState(false);
  const [revocationResult, setRevocationResult] = useState<string | undefined>(undefined);

  const handlePreviewFullPath = async () => {
    if (!revocationTargetCardId || revocationBusy) return;
    setActionError(undefined);
    setRevocationBusy(true);
    try {
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
    setFullPathPreview(undefined);
  };
  const handleConfirmFullPathRevoke = async () => {
    if (!revocationTargetCardId || !fullPathPreview || revocationBusy) return;
    setRevocationBusy(true);
    try {
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

  const makeSlotDropHandler = (slot: CardSlot) => (event: React.DragEvent) => {
    event.preventDefault();
    if (slot.type === "budget") {
      void onBudgetCardSlotDrop(
        dataService,
        event.dataTransfer as unknown as DataTransferLike,
        slot
      ).then((result) => {
        if (result.outcome === "relation_failed") {
          setActionError(result.error);
        }
      }).catch((error) => {
        setActionError(error instanceof Error ? error.message : String(error));
      });
    } else {
      void onWorkloadCardSlotDrop(
        dataService,
        event.dataTransfer as unknown as DataTransferLike,
        slot
      ).then((result) => {
        if (result.outcome === "relation_failed") {
          setActionError(result.error);
        }
      }).catch((error) => {
        setActionError(error instanceof Error ? error.message : String(error));
      });
    }
  };
  const makeSlotDragOverHandler = () => (event: React.DragEvent) => {
    event.preventDefault();
  };

  const makeCanvasDragOverHandler = () => (event: React.DragEvent) => {
    event.preventDefault();
  };

  const makeCanvasDropHandler = () => (event: React.DragEvent) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const result = onUnitCardCanvasDrop(
      event.dataTransfer as unknown as DataTransferLike,
      x,
      y
    );

    if (result.outcome === "placed") {
      canvasStore.getState().upsertCardPlacement({
        cardId: result.unitCardId,
        x: result.x,
        y: result.y,
      });
    }
  };

  const renderDeck = () => (
    <section aria-label="deck" className="w-64 flex-shrink-0 flex flex-col">
      <div className="flex items-center justify-between px-3 py-3 border-b border-[rgb(var(--color-border-primary))]">
        <h2 className="text-sm font-semibold text-[rgb(var(--color-text-primary))]">卡片库</h2>
      </div>
      <div className="flex gap-1 px-2 py-2 border-b border-[rgb(var(--color-border-primary))]" role="tablist">
        {CARD_GROUPS.map((group) => (
          <button
            key={group}
            role="tab"
            aria-selected={activeType === group}
            onClick={() => deckStore.getState().setActiveType(group)}
            className={clsx(
              "flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors duration-brand",
              "text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]",
              activeType === group
                ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                : "hover:bg-[rgb(var(--color-bg-tertiary))]"
            )}
          >
            {group}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-2">
        <div className="grid gap-2">
          {deckCards.map((card) => {
            const workloadCard = asWorkloadCard(card);
            const budgetCard = asBudgetCard(card);
            const unitCard = asUnitCard(card);
            const isDraggable =
              (activeType === "workload" && workloadCard !== undefined) ||
              (activeType === "budget" && budgetCard !== undefined) ||
              (activeType === "unit" && unitCard !== undefined);

            const getDragStart = () => {
              if (activeType === "workload" && workloadCard) {
                return (event: React.DragEvent) =>
                  onWorkloadCardDragStart(
                    event.dataTransfer as unknown as DataTransferLike,
                    workloadCard.id
                  );
              }
              if (activeType === "budget" && budgetCard) {
                return (event: React.DragEvent) =>
                  onBudgetCardDragStart(
                    event.dataTransfer as unknown as DataTransferLike,
                    budgetCard.id
                  );
              }
              if (activeType === "unit" && unitCard) {
                return (event: React.DragEvent) =>
                  onUnitCardDragStart(
                    event.dataTransfer as unknown as DataTransferLike,
                    unitCard.id
                  );
              }
              return undefined;
            };

            const getWorkloadDropHandlers = workloadCard ? {
              onDragOver: (event: React.DragEvent) => event.preventDefault(),
              onDrop: (event: React.DragEvent) => {
                event.preventDefault();
                void onWorkloadCardDropOnWorkloadCard(
                  dataService,
                  event.dataTransfer as unknown as DataTransferLike,
                  workloadCard.id
                ).then((result) => {
                  if (result.outcome === "relation_failed") {
                    setActionError(result.error);
                  }
                }).catch((error) => {
                  setActionError(error instanceof Error ? error.message : String(error));
                });
              }
            } : {};

            return (
              <div
                key={card.id}
                data-testid={`deck-card-${card.id}`}
                draggable={isDraggable}
                onDragStart={getDragStart()}
                {...getWorkloadDropHandlers}
                className={clsx(
                  "p-3 rounded-lg border transition-colors duration-brand cursor-default",
                  isDraggable ? "cursor-grab bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800" : "bg-[rgb(var(--color-bg-tertiary))] border-[rgb(var(--color-border-primary))]",
                  workloadCard && "border-l-2 border-l-brand-500",
                  budgetCard && "border-l-2 border-l-green-500",
                  unitCard && "border-l-2 border-l-purple-500"
                )}
              >
                <div className="flex items-center gap-2">
                  {workloadCard && <Calculator className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
                  {budgetCard && <LayoutDashboard className="w-4 h-4 text-green-600 dark:text-green-400" />}
                  {unitCard && <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                  <span className="text-sm font-medium text-[rgb(var(--color-text-primary))] truncate">{card.name}</span>
                </div>
                {isDraggable && (
                  <span className="text-xs text-[rgb(var(--color-text-muted))] ml-auto">可拖拽</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  const renderCanvas = () => (
    <section aria-label="canvas" className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between px-3 py-3 border-b border-[rgb(var(--color-border-primary))] bg-[rgb(var(--color-bg-secondary))] sticky top-0 z-10">
        <h2 className="text-sm font-semibold text-[rgb(var(--color-text-primary))]">画布</h2>
        <div className="flex items-center gap-2">
          <button className="toolbar-btn" aria-label="缩小"><ChevronLeft className="w-4 h-4" /></button>
          <button className="toolbar-btn" aria-label="放大"><ChevronRight className="w-4 h-4" /></button>
          <button className="toolbar-btn" aria-label="适配画布"><LayoutDashboard className="w-4 h-4" /></button>
        </div>
      </div>
      <div
        className="flex-1 relative overflow-hidden bg-[rgb(var(--color-bg-primary))]"
        onDragOver={makeCanvasDragOverHandler()}
        onDrop={makeCanvasDropHandler()}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0z' fill='none'/%3E%3Cpath d='M0 0h1v20H0zM0 0h20v1H0z' stroke='%23e5e5e5' stroke-width='0.5'/%3C/svg%3E")`, backgroundSize: '20px 20px' }}
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
              style={{
                position: "absolute",
                left: placement.x,
                top: placement.y,
              }}
              className="transition-all duration-brand hover:scale-102 active:scale-98 hover:z-10"
            >
              <div className="card-elevated min-w-[180px] max-w-[220px]">
                <div className="flex items-center justify-between p-3 border-b border-[rgb(var(--color-border-primary))] bg-[rgb(var(--color-bg-tertiary))] rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <strong className="text-sm text-[rgb(var(--color-text-primary))] truncate max-w-[140px]">{unitCard.name}</strong>
                  </div>
                  <span className="text-xs text-[rgb(var(--color-text-muted))] px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
                    {unitCard.unitKind}
                  </span>
                </div>
                <div className="p-3">
                  <div className="grid gap-2">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        data-testid={`slot-${slot.ownerCardId}-${slot.type}`}
                        onDragOver={makeSlotDragOverHandler()}
                        onDrop={makeSlotDropHandler(slot)}
                        className={clsx(
                          "p-2 rounded-lg text-xs border transition-colors duration-brand cursor-default",
                          slot.type === "workload"
                            ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                            : slot.type === "budget"
                            ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
                            : "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-[rgb(var(--color-text-secondary))] capitalize">{slot.type}</span>
                          <span className="text-xs text-[rgb(var(--color-text-muted))]">{slot.displayMode}</span>
                        </div>
                        <div className="h-8 bg-[rgb(var(--color-bg-tertiary))] rounded border border-dashed border-[rgb(var(--color-border-primary))] flex items-center justify-center text-[rgb(var(--color-text-muted))] text-xs">
                          拖入 {slot.type === "workload" ? "工作量卡" : slot.type === "budget" ? "预算卡" : "单元卡"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  const renderRecommendation = () => (
    <div>
      <section aria-label="recommendation" className="w-80 flex-shrink-0 flex flex-col border-l border-[rgb(var(--color-border-primary))] bg-[rgb(var(--color-bg-secondary))]">
        <div className="flex items-center justify-between px-3 py-3 border-b border-[rgb(var(--color-border-primary))]">
          <h2 className="text-sm font-semibold text-[rgb(var(--color-text-primary))]">推荐列表</h2>
          {executingAction && (
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {recommendationItems.length === 0 ? (
            <div className="p-6 text-center text-[rgb(var(--color-text-muted))]">
              <LayoutDashboard className="w-10 h-10 mx-auto text-[rgb(var(--color-text-muted))] mb-2 opacity-50" />
              <p className="text-sm">{t("common.empty")}</p>
            </div>
          ) : (
            <ul className="p-2 space-y-2" data-testid="recommendation-list">
              {recommendationItems.map((item) => (
                <li
                  key={item.id}
                  data-testid={`recommendation-item-${item.id}`}
                  onClick={() => handleSelectRecommendation(item.id)}
                  className={clsx(
                    "p-3 rounded-lg cursor-pointer transition-colors duration-brand",
                    "text-[rgb(var(--color-text-primary))]",
                    selectedRecommendationId === item.id
                      ? "bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800"
                      : "hover:bg-[rgb(var(--color-bg-tertiary))] border border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <strong className="text-sm truncate">{item.kind}</strong>
                    <span className={clsx(
                      "badge text-xs",
                      item.status === "recommended" && "badge-info",
                      item.status === "accepted" && "badge-success",
                      item.status === "ignored" && "badge-warning",
                      item.status === "dismissed" && "badge-danger"
                    )}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <div className="text-xs text-[rgb(var(--color-text-muted))] truncate">{item.reason ?? item.id}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {(selectedDetail || actionError) && (
          <div className="border-t border-[rgb(var(--color-border-primary))] p-3 max-h-[300px] overflow-auto">
            {actionError && (
              <div className="badge-danger p-3 mb-3 transition-opacity duration-brand" data-testid="action-error">
                {actionError}
              </div>
            )}
            {selectedDetail && (
              <div className="space-y-2 text-xs" data-testid="recommendation-detail">
                <div className="flex justify-between text-[rgb(var(--color-text-muted))]" data-testid="detail-id">
                  <span>id: </span>
                  <span className="font-mono truncate max-w-[200px]">{selectedDetail.id}</span>
                </div>
                <div className="flex justify-between text-[rgb(var(--color-text-muted))]">
                  <span>类型:</span>
                  <span>{selectedDetail.kind}</span>
                </div>
                <div className="flex justify-between text-[rgb(var(--color-text-muted))]" data-testid="detail-status">
                  <span>status: </span>
                  <span>{STATUS_LABEL[selectedDetail.status]}</span>
                </div>
                <div className="flex justify-between text-[rgb(var(--color-text-muted))]" data-testid="detail-updated-at">
                  <span>updatedAt: </span>
                  <span>{selectedDetail.updatedAt}</span>
                </div>
                {selectedDetail.payloadType !== undefined && (
                  <div className="flex justify-between text-[rgb(var(--color-text-muted))]">
                    <span>Payload:</span>
                    <span>{selectedDetail.payloadType}</span>
                  </div>
                )}
                {selectedDetail.targetResultId !== undefined && (
                  <div className="flex justify-between text-[rgb(var(--color-text-muted))]">
                    <span>目标结果:</span>
                    <span className="font-mono truncate max-w-[200px]">{selectedDetail.targetResultId}</span>
                  </div>
                )}
                {selectedDetail.reason && (
                  <div className="flex justify-between text-[rgb(var(--color-text-muted))]" data-testid="detail-reason">
                    <span>reason: </span>
                    <span>{selectedDetail.reason}</span>
                  </div>
                )}
                {selectedDetail.matchingBasis && (
                  <div className="pt-2 border-t border-[rgb(var(--color-border-primary))] space-y-1" data-testid="matching-basis">
                    <div className="font-medium text-[rgb(var(--color-text-primary))]">匹配依据</div>
                    <div className="flex justify-between" data-testid="basis-match-type"><span>匹配类型:</span><span>{selectedDetail.matchingBasis.matchType}</span></div>
                    <div className="flex justify-between" data-testid="basis-unit-relation"><span>单元关系:</span><span>{selectedDetail.matchingBasis.unitRelation}</span></div>
                    {selectedDetail.matchingBasis.splitFeasibility && (
                      <div className="flex justify-between">
                        <span>拆分可行性:</span>
                        <span className={clsx(
                          String(selectedDetail.matchingBasis.splitFeasibility.feasible) === "true" ? "text-green-600" :
                          String(selectedDetail.matchingBasis.splitFeasibility.feasible) === "false" ? "text-red-600" :
                          "text-orange-600"
                        )}>
                          {String(selectedDetail.matchingBasis.splitFeasibility.feasible)}
                        </span>
                      </div>
                    )}
                    {selectedDetail.matchingBasis.splitFeasibility?.requiredMappings?.length && (
                      <div className="flex justify-between"><span>需映射:</span><span>{selectedDetail.matchingBasis.splitFeasibility?.requiredMappings.join(", ")}</span></div>
                    )}
                    <div className="flex justify-between" data-testid="basis-match-details"><span>匹配详情:</span><span>{selectedDetail.matchingBasis.unitRelation === "ancestor" ? "包含目标 Unit" : "其他关系"}</span></div>
                  </div>
                )}
                {selectedDetail.matchingBasis?.splitFeasibility?.requiredMappings?.length && (
                  <button
                    onClick={() => handleSelectRecommendation(selectedDetail.id)}
                    className="w-full mt-2 btn-primary text-xs transition-transform hover:scale-102 active:scale-98"
                  >
                    确认拆分
                  </button>
                )}
                {/* Split Parameters Panel - shown when split_workload recommendation has splitFeasibility */}
                {selectedDetail.payloadType === "split_workload" && splitDraft && (
                  <div
                    data-testid="split-parameters-panel"
                    className="mt-4 p-3 border border-[rgb(var(--color-border-primary))] rounded-lg bg-[rgb(var(--color-bg-tertiary))]"
                  >
                    <div className="mb-2 text-sm font-medium text-[rgb(var(--color-text-primary))]">拆分参数（正式执行参数，初始值来自系统建议）</div>
                    <div data-testid="split-parent-result" className="mb-2 text-xs text-[rgb(var(--color-text-muted))]">
                      parentResultId: {splitDraft.parentResultId}
                    </div>
                    <div className="space-y-2">
                      {splitDraft.children.map((child, index) => (
                        <div
                          key={`${child.targetUnitId}-${index}`}
                          data-testid={`split-child-${index}`}
                          className="p-2 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border-primary))] rounded"
                        >
                          <div className="mb-1 text-xs font-medium text-[rgb(var(--color-text-secondary))]">目标子单元：{child.targetUnitId}（只读）</div>
                          <label className="block mb-1">
                            <span className="text-xs text-[rgb(var(--color-text-muted))]">名称：</span>
                            <input
                              data-testid={`split-child-name-${index}`}
                              type="text"
                              value={child.name}
                              onChange={(e) => {
                                const next = [...splitDraft.children];
                                next[index] = { ...child, name: e.target.value };
                                setSplitDraft({ ...splitDraft, children: next });
                              }}
                              className="w-full mt-1 px-2 py-1 text-xs border border-[rgb(var(--color-border-primary))] rounded bg-[rgb(var(--color-bg-primary))] focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </label>
                          <label className="block mb-1">
                            <span className="text-xs text-[rgb(var(--color-text-muted))]">数值：</span>
                            <input
                              data-testid={`split-child-value-${index}`}
                              type="number"
                              value={child.value ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const next = [...splitDraft.children];
                                next[index] = { ...child, value: raw === "" ? null : Number(raw) };
                                setSplitDraft({ ...splitDraft, children: next });
                              }}
                              className="w-full mt-1 px-2 py-1 text-xs border border-[rgb(var(--color-border-primary))] rounded bg-[rgb(var(--color-bg-primary))] focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </label>
                          <label className="block mb-1">
                            <span className="text-xs text-[rgb(var(--color-text-muted))]">ResultSet ID：</span>
                            <input
                              data-testid={`split-child-rs-${index}`}
                              type="text"
                              value={child.resultSetId}
                              onChange={(e) => {
                                const next = [...splitDraft.children];
                                next[index] = { ...child, resultSetId: e.target.value };
                                setSplitDraft({ ...splitDraft, children: next });
                              }}
                              className="w-full mt-1 px-2 py-1 text-xs border border-[rgb(var(--color-border-primary))] rounded bg-[rgb(var(--color-bg-primary))] focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </label>
                          <label className="block mb-1">
                            <span className="text-xs text-[rgb(var(--color-text-muted))]">ResultItem ID：</span>
                            <input
                              data-testid={`split-child-ri-${index}`}
                              type="text"
                              value={child.resultItemId}
                              onChange={(e) => {
                                const next = [...splitDraft.children];
                                next[index] = { ...child, resultItemId: e.target.value };
                                setSplitDraft({ ...splitDraft, children: next });
                              }}
                              className="w-full mt-1 px-2 py-1 text-xs border border-[rgb(var(--color-border-primary))] rounded bg-[rgb(var(--color-bg-primary))] focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedDetail && !selectedDetail.matchingBasis?.splitFeasibility?.requiredMappings?.length && (
                  <div className="flex gap-2 mt-2">
                    {confirmAction && (
                      <button
                        onClick={handleConfirm}
                        disabled={executingAction || (confirmAction === "confirm_split" && splitDraft && !isSplitDraftComplete(splitDraft))}
                        className="flex-1 btn-primary text-xs transition-transform hover:scale-102 active:scale-98"
                        data-testid="confirm-button"
                      >
                        {confirmAction === "confirm_split" ? "确认拆分" : "确认"}
                      </button>
                    )}
                    <button
                      onClick={() => handleCancelOrDismiss("cancel")}
                      className="flex-1 btn-secondary text-xs transition-transform hover:scale-102 active:scale-98"
                      data-testid="cancel-button"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleCancelOrDismiss("dismiss")}
                      className="btn-secondary text-xs transition-transform hover:scale-102 active:scale-98"
                      data-testid="dismiss-button"
                    >
                      拒绝
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  const renderRevocation = () => (
    <section className="border-t border-[rgb(var(--color-border-primary))] p-3 bg-[rgb(var(--color-bg-tertiary))]" aria-label="revocation">
      <h3 className="text-xs font-medium text-[rgb(var(--color-text-secondary))] mb-2">工作量撤回</h3>
      <div className="space-y-2">
        <select
          value={revocationTargetCardId}
          onChange={(e) => setRevocationTargetCardId(e.target.value)}
          className="input text-xs"
          data-testid="revocation-target-select"
        >
          <option value="">选择工作量卡...</option>
          {workloadOptions.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <button className="btn-secondary text-xs flex-1" onClick={handlePreviewFullPath} disabled={!revocationTargetCardId || revocationBusy} data-testid="preview-fullpath-button">
            {revocationBusy ? "预览中..." : "全路径预览"}
          </button>
          <button className="btn-danger text-xs" onClick={handleLayerRevoke} disabled={!revocationTargetCardId || revocationBusy} data-testid="revoke-layer-button">
            层撤回
          </button>
        </div>
        {fullPathPreview && (
          <div className="card p-2 text-xs space-y-1" data-testid="fullpath-preview">
            <p className="font-medium text-[rgb(var(--color-text-primary))]">预览影响</p>
            <div data-testid="preview-deleted-cards">
              删除派生卡: {fullPathPreview.deletedCards.length}
              <ul data-testid="preview-deleted-cards-list" className="ml-2 text-[rgb(var(--color-text-muted))]">
                {fullPathPreview.deletedCards.map((c) => <li key={c.id}>{c.name}</li>)}
              </ul>
            </div>
            <div data-testid="preview-deleted-results">
              删除派生结果: {fullPathPreview.deletedWorkloadResults.length}
              <ul data-testid="preview-deleted-results-list" className="ml-2 text-[rgb(var(--color-text-muted))]">
                {fullPathPreview.deletedWorkloadResults.map((r) => <li key={r.id}>{r.name}</li>)}
              </ul>
            </div>
            <div data-testid="preview-revoked-calcs">
              核算失效: {fullPathPreview.revokedCalculationResults.length}
              <ul data-testid="preview-calc-list" className="ml-2 text-[rgb(var(--color-text-muted))]">
                {fullPathPreview.revokedCalculationResults.map((c) => <li key={c.id}>{c.id}</li>)}
              </ul>
            </div>
            <div data-testid="preview-relations">
              关系软删: {fullPathPreview.deactivatedRelations.length}
              <ul data-testid="preview-relations-list" className="ml-2 text-[rgb(var(--color-text-muted))]">
                {fullPathPreview.deactivatedRelations.map((r) => <li key={r.id}>{r.id}</li>)}
              </ul>
            </div>
            <div data-testid="preview-manual-review">
              待人工: {fullPathPreview.manualReview.cards.length}
              <ul data-testid="preview-manual-review-list" className="ml-2 text-[rgb(var(--color-text-muted))]">
                {fullPathPreview.manualReview.cards.map((c) => (
                  <li key={c.id}>{c.name} (不自动删除)</li>
                ))}
              </ul>
            </div>
            <div className="flex gap-1 pt-1">
              <button className="btn-danger text-xs flex-1" onClick={handleConfirmFullPathRevoke} disabled={revocationBusy} data-testid="confirm-fullpath-revoke">确认撤回</button>
              <button className="btn-secondary text-xs" onClick={handleCancelFullPathPreview} data-testid="cancel-fullpath-preview">取消</button>
            </div>
          </div>
        )}
        {revocationResult && (
          <p data-testid="revocation-result" className="text-xs text-green-600 dark:text-green-400 whitespace-pre-wrap transition-opacity duration-brand">
            {revocationResult}
          </p>
        )}
      </div>
    </section>
  );

  return (
    <div className="flex h-full bg-[rgb(var(--color-bg-primary))]" style={{ colorScheme: resolvedTheme }}>
      <div className="w-64 flex-shrink-0">
        {renderDeck()}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {renderCanvas()}
      </div>
      <div className="w-80 flex-shrink-0 flex flex-col">
        {renderRecommendation()}
        {renderRevocation()}
      </div>
    </div>
  );
}