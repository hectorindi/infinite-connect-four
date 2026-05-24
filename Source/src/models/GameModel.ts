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
      player1Score: 0,
      player2Score: 0,
      gameOver: false,
      isAnimating: false,
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

  public findAllChains(): Point[][] {
    const chains: Point[][] = [];
    
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]]; 
    
    const cols = Array.from(this.columnHeights.keys());
    if (cols.length === 0) return chains;
    
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    for (let x = minCol; x <= maxCol; x++) {
      const height = this.getHeight(x);
      for (let y = 0; y < height; y++) {
        const player = this.getCell(x, y);
        if (!player) continue;

        for (const [dx, dy] of dirs) {
          
          const prevX = x - dx;
          const prevY = y - dy;
          if (this.getCell(prevX, prevY) === player) continue; 

          const currentChain: Point[] = [[x, y]];
          let nx = x + dx;
          let ny = y + dy;

          while (this.getCell(nx, ny) === player) {
            currentChain.push([nx, ny]);
            nx += dx;
            ny += dy;
          }

          if (currentChain.length >= 4) {
            chains.push(currentChain);
          }
        }
      }
    }
    return chains;
  }

  
  public removeTokens(chains: Point[][]): void {
    for (const chain of chains) {
      for (const [x, y] of chain) {
        this.grid.delete(this.cellKey(x, y));
      }
    }
  }

  
  public applyGravity(): { col: number, oldRow: number, newRow: number }[] {
    const movements: { col: number, oldRow: number, newRow: number }[] = [];
    const cols = Array.from(this.columnHeights.keys());

    for (const col of cols) {
      const height = this.getHeight(col);
      let writeY = 0;

      for (let readY = 0; readY < height; readY++) {
        const player = this.getCell(col, readY);
        
        if (player !== 0) {
          if (writeY !== readY) {
            
            this.setCell(col, writeY, player);
            this.grid.delete(this.cellKey(col, readY));
            movements.push({ col, oldRow: readY, newRow: writeY });
          }
          writeY++;
        }
      }
      this.setHeight(col, writeY);
    }
    return movements;
  }

  public getUniqueSortedPoints(chains: Point[][]): Point[] {
    const uniqueMap = new Map<string, Point>();
    for (const chain of chains) {
      for (const [x, y] of chain) {
        uniqueMap.set(this.cellKey(x, y), [x, y]);
      }
    }
    const points = Array.from(uniqueMap.values());
    points.sort((a, b) => {
      if (a[0] !== b[0]) return a[0] - b[0]; 
      return a[1] - b[1]; 
    });
    return points;
  }

  public removeSingleToken(x: number, y: number): void {
    this.grid.delete(this.cellKey(x, y));
  }
}