import { createStore } from "zustand/vanilla";

export interface InspectorHighlight {
  field: string;
  reason: string;
}

export interface InspectorState {
  visible: boolean;
  activeCardId?: string;
  highlights: InspectorHighlight[];
  setVisible: (visible: boolean) => void;
  setActiveCard: (cardId?: string) => void;
  setHighlights: (highlights: InspectorHighlight[]) => void;
}

export const inspectorStore = createStore<InspectorState>((set) => ({
  visible: true,
  highlights: [],
  setVisible: (visible) => set({ visible }),
  setActiveCard: (cardId) => set({ activeCardId: cardId }),
  setHighlights: (highlights) => set({ highlights })
}));
