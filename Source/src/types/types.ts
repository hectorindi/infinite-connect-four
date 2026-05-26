export interface GameState {
  current: 1 | 2;
  selectedCol: number;
  cameraX: number;
  cameraY: number;
  moves: number;
  dragging: boolean;
  dragStartX: number;
  dragStartY: number;
  dragOriginX: number;
  dragOriginY: number;
  gameOver: boolean;
  player1Score: number,
  player2Score: number,
  isAnimating: boolean,
  player1Powerups: { bomb: number, row: number, col: number };
  player2Powerups: { bomb: number, row: number, col: number };
}

export type GridMap = Map<string, number>;
export type ColumnHeightsMap = Map<number, number>;
export type Point = [number, number];