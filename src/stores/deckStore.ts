import { createStore } from "zustand/vanilla";

import type { CardType } from "../domain/card/types";
import { recommendationStore } from "./recommendationStore";
import type { Recommendation } from "../domain/recommendation/types";

export interface DeckState {
  activeType: CardType;
  expandedCardId?: string;
  recommendationHighlights: string[];
  recommendationsEnabled: boolean;
  setActiveType: (type: CardType) => void;
  setExpandedCard: (cardId?: string) => void;
  /** 设置推荐高亮 */
  setRecommendationHighlights: (recommendationIds: string[]) => void;
  /** 清除推荐高亮 */
  clearRecommendationHighlights: () => void;
  /** 切换推荐显示开关 */
  toggleRecommendationsEnabled: () => void;
  /** 根据 cardId 获取相关的推荐 */
  getRecommendationsForCard: (cardId: string) => Recommendation[];
  /** 根据 kind 获取推荐 */
  getRecommendationsByKind: (kind: Recommendation["kind"]) => Recommendation[];
  /** 获取所有待处理推荐 */
  getPendingRecommendations: () => Recommendation[];
  /** 高亮特定卡片的相关推荐 */
  highlightRecommendationsForCard: (cardId: string) => void;
}

export const deckStore = createStore<DeckState>((set, get) => ({
  activeType: "unit",
  recommendationHighlights: [],
  recommendationsEnabled: true,
  setActiveType: (type) => set({ activeType: type }),
  setExpandedCard: (cardId) => set({ expandedCardId: cardId }),
  setRecommendationHighlights: (recommendationIds) => set({ recommendationHighlights: recommendationIds }),
  clearRecommendationHighlights: () => set({ recommendationHighlights: [] }),
  toggleRecommendationsEnabled: () => set((state) => ({ recommendationsEnabled: !state.recommendationsEnabled })),
  
  getRecommendationsForCard: (cardId) => {
    return recommendationStore.getState().recommendations.filter(
      (r) => r.relatedEntityIds?.includes(cardId)
    );
  },
  
  getRecommendationsByKind: (kind) => {
    return recommendationStore.getState().getRecommendationsByKind(kind);
  },
  
  getPendingRecommendations: () => {
    return recommendationStore.getState().getPendingRecommendations();
  },
  
  highlightRecommendationsForCard: (cardId) => {
    const related = recommendationStore.getState().recommendations.filter(
      (r) => r.relatedEntityIds?.includes(cardId) && r.status === "recommended"
    );
    set({ recommendationHighlights: related.map(r => r.id) });
  },
}));