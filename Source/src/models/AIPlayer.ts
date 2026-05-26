import { GameModel } from '../models/GameModel';

export class AIPlayer {
  private depth = 3;

  private simulateMove(model: GameModel, col: number, player: number): void {
    const row = model.getHeight(col);
    model.setCell(col, row, player);
    model.setHeight(col, row + 1);

    model.applyGravity();
    const chains = model.findAllChains();
    if (chains.length > 0) {
      model.removeTokens(chains);
      if (player === 1) model.state.player1Score += chains.length;
      else model.state.player2Score += chains.length;
      model.applyGravity();
    }
  }

  private evaluate(model: GameModel): number {
    if (model.state.player2Score >= 3) return 100000;
    if (model.state.player1Score >= 3) return -100000;

    let score = (model.state.player2Score - model.state.player1Score) * 1000;

    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    const cols = Array.from(model.columnHeights.keys());

    for (const col of cols) {
      const height = model.getHeight(col);
      for (let row = 0; row < height; row++) {
        const player = model.getCell(col, row);
        if (player === 0) continue;

        const centerBonus = (3 - Math.abs(3 - col)) * 10;
        if (player === 2) score += centerBonus;
        else score -= centerBonus;

        for (const [dx, dy] of dirs) {

          if (model.getCell(col - dx, row - dy) === player) continue;

          let count = 1;
          let nx = col + dx;
          let ny = row + dy;

          while (model.getCell(nx, ny) === player) {
            count++;
            nx += dx;
            ny += dy;
          }

          let chainWeight = 0;
          if (count === 2) chainWeight = 5;
          if (count === 3) chainWeight = 50;
          if (count >= 4) chainWeight = 500;

          if (player === 2) score += chainWeight;
          else score -= chainWeight;
        }
      }
    }

    return score;
  }

  private getSearchOrder(model: GameModel): number[] {
    const activeCols = Array.from(model.columnHeights.keys());

    // If the board is empty, default to start at column 0 (or your preferred center)
    if (activeCols.length === 0) return [0, 1, -1, 2, -2];

    const minCol = Math.min(...activeCols) - 1;
    const maxCol = Math.max(...activeCols) + 1;

    // Calculate current center of play
    const center = Math.round((minCol + maxCol) / 2);

    const columns: number[] = [];
    for (let i = minCol; i <= maxCol; i++) {
      columns.push(i);
    }

    // Sort columns by distance to center
    columns.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));

    return columns;
  }

  public getBestMove(model: GameModel): number {
    let bestVal = -Infinity;
    let bestCol = 0;

    // Use dynamic search order instead of 0..6
    const searchOrder = this.getSearchOrder(model);

    for (const col of searchOrder) {
      // Assuming '10' is your height limit; adjust as needed for an infinite height
      if (model.getHeight(col) < 10) {
        const simModel = model.clone();
        this.simulateMove(simModel, col, 2);

        let moveVal = this.minimax(simModel, this.depth, -Infinity, Infinity, false);

        if (moveVal > bestVal) {
          bestVal = moveVal;
          bestCol = col;
        }
      }
    }
    return bestCol;
  }

  // Update minimax to also use the dynamic search order
  public minimax(model: GameModel, depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
    if (depth === 0 || model.state.gameOver) return this.evaluate(model);

    const searchOrder = this.getSearchOrder(model);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const col of searchOrder) {
        if (model.getHeight(col) < 10) {
          const sim = model.clone();
          this.simulateMove(sim, col, 2);
          maxEval = Math.max(maxEval, this.minimax(sim, depth - 1, alpha, beta, false));
          alpha = Math.max(alpha, maxEval);
          if (beta <= alpha) break;
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const col of searchOrder) {
        if (model.getHeight(col) < 10) {
          const sim = model.clone();
          this.simulateMove(sim, col, 1);
          minEval = Math.min(minEval, this.minimax(sim, depth - 1, alpha, beta, true));
          beta = Math.min(beta, minEval);
          if (beta <= alpha) break;
        }
      }
      return minEval;
    }
  }
}