import { GameState, GridMap, ColumnHeightsMap, Point } from '../types/types';

export class GameModel {
  public grid: GridMap = new Map();
  public columnHeights: ColumnHeightsMap = new Map();
  public state: GameState;

  constructor() {
    this.state = this.getInitialState();
  }

  public getInitialState(): GameState {
    return {
      current: 1,
      selectedCol: 0,
      cameraX: 0,
      cameraY: 0,
      moves: 0,
      dragging: false,
      dragStartX: 0,
      dragStartY: 0,
      dragOriginX: 0,
      dragOriginY: 0,
      gameOver: false,
    };
  }

  public reset(): void {
    this.grid.clear();
    this.columnHeights.clear();
    this.state = this.getInitialState();
  }

  public cellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  public getCell(x: number, y: number): number {
    return this.grid.get(this.cellKey(x, y)) || 0;
  }

  public setCell(x: number, y: number, player: number): void {
    this.grid.set(this.cellKey(x, y), player);
  }

  public getHeight(col: number): number {
    return this.columnHeights.get(col) ?? 0;
  }

  public setHeight(col: number, height: number): void {
    this.columnHeights.set(col, height);
  }

  public switchPlayer(): void {
    this.state.current = this.state.current === 1 ? 2 : 1;
  }

  public incrementMoves(): void {
    this.state.moves += 1;
  }

  public checkWin(x: number, y: number, player: number): Point[] | null {
    const dirs: Point[] = [[1, 0], [0, 1], [1, 1], [1, -1]];
    
    for (const [dx, dy] of dirs) {
      const cells: Point[] = [[x, y]];
      
      let nx = x + dx;
      let ny = y + dy;
      while (this.getCell(nx, ny) === player) {
        cells.push([nx, ny]);
        nx += dx;
        ny += dy;
      }
      
      nx = x - dx;
      ny = y - dy;
      while (this.getCell(nx, ny) === player) {
        cells.unshift([nx, ny]);
        nx -= dx;
        ny -= dy;
      }
      
      if (cells.length >= 4) return cells;
    }
    return null;
  }
}