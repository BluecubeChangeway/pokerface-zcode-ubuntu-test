export interface CanvasCardPlacement {
  cardId: string;
  x: number;
  y: number;
  rotation?: number;
  depth?: number;
  layer?: number;
}

export interface TrailNode {
  cardId: string;
  timestamp: number;
}

export interface GhostState {
  cardId: string;
  visible: boolean;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}
