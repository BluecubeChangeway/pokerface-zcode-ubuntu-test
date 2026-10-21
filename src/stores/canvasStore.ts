import { createStore } from "zustand/vanilla";

import type {
  CameraState,
  CanvasCardPlacement,
  GhostState,
  TrailNode
} from "../domain/canvas/types";
import { recommendationStore } from "./recommendationStore";
import type { Recommendation } from "../domain/recommendation/types";

export interface CanvasState {
  cards: CanvasCardPlacement[];
  focusCardId?: string;
  selectedCardIds: string[];
  camera: CameraState;
  trail: TrailNode[];
  ghost?: GhostState;
  setFocus: (cardId: string) => void;
  clearFocus: () => void;
  /**
   * Canvas UI placement 最小写入（Q-09-C 真实数据流竖切片）：
   * 以 cardId 为唯一身份幂等 upsert——同 cardId 只保留一个 placement，
   * 不产生任何 Domain Fact / Relation（纯 UI state）。
   */
  upsertCardPlacement: (placement: CanvasCardPlacement) => void;
  /** 获取当前焦点卡片的推荐 */
  getRecommendationsForFocusedCard: () => Recommendation[];
  /** 获取特定卡片的推荐 */
  getRecommendationsForCard: (cardId: string) => Recommendation[];
  /** 高亮焦点卡片的推荐 */
  highlightFocusedCardRecommendations: () => void;
}

export const canvasStore = createStore<CanvasState>((set, get) => ({
  cards: [],
  selectedCardIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  trail: [],
  setFocus: (cardId) => set({ focusCardId: cardId }),
  clearFocus: () => set({ focusCardId: undefined }),
  upsertCardPlacement: (placement) =>
    set((state) => {
      // 幂等：cardId 是 Canvas placement 的唯一身份（同 cardId 后写覆盖）
      const index = state.cards.findIndex((c) => c.cardId === placement.cardId);
      if (index === -1) {
        return { cards: [...state.cards, placement] };
      }
      const cards = [...state.cards];
      cards[index] = placement;
      return { cards };
    }),
  getRecommendationsForFocusedCard: () => {
    const { focusCardId } = get();
    if (!focusCardId) return [];
    return recommendationStore
      .getState()
      .recommendations.filter(
        (r) => r.kind === "resolution" && r.relatedEntityIds?.includes(focusCardId) && r.status === "recommended"
      );
  },
  
  getRecommendationsForCard: (cardId) => {
    return recommendationStore
      .getState()
      .recommendations.filter(
        (r) => r.kind === "resolution" && r.relatedEntityIds?.includes(cardId) && r.status === "recommended"
      );
  },
  
  highlightFocusedCardRecommendations: () => {
    const { focusCardId } = get();
    if (!focusCardId) return;
    const related = recommendationStore.getState().recommendations.filter(
      (r) => r.kind === "resolution" && r.relatedEntityIds?.includes(focusCardId) && r.status === "recommended"
    );
    // 可以通过事件或直接调用 deckStore 来高亮
    // 这里简单返回，UI 层可以基于此结果自行高亮
  },
}));