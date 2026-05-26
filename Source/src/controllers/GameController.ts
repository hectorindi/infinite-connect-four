import { GameModel } from '../models/GameModel';
import { GAME_CONST } from '../types/const';
import { Utils } from '../utils/Utils';
import { GameView } from '../views/GameView';

export class GameController {
  private lastRenderHash: string = '';
  constructor(private model: GameModel, private view: GameView) { }

  public init(): void {
    this.setupEventListeners();
    this.setupPowerupListeners();
    this.view.app.ticker.add((ticker: any) => {
      const state = this.model.state;
      const currentHash = [
        state.cameraX,
        state.cameraY,
        state.selectedCol,
        state.current,
        state.moves,
        this.model.grid.size,
        state.isAnimating
      ].join('|');

      if (this.lastRenderHash !== currentHash) {
        this.view.renderBoard(state);
        this.view.renderPreview(state, this.model.getHeight(state.selectedCol));
        this.lastRenderHash = currentHash;
      }
      this.view.animatePreview(ticker.lastTime, state.isAnimating);
    });
    this.resetGame();
  }

  private setupEventListeners(): void {
    const els = this.view.getElements();

    els.speedSlider.addEventListener('input', (e: Event) => {
      const speedMultiplier = parseFloat((e.target as HTMLInputElement).value);
      els.speedValueDisplay.textContent = `${speedMultiplier}x`;
      GAME_CONST.PLAYER.animate_time = GAME_CONST.PLAYER.base_animate_time / speedMultiplier;
      GAME_CONST.PLAYER.disappear_time = GAME_CONST.PLAYER.base_disappear_time / speedMultiplier;
    });

    // Keydown Controls
    els.wrap.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.model.state.isAnimating) return;
      const key = e.key.toLowerCase();
      if (['arrowleft', 'a'].includes(key)) this.model.state.selectedCol -= 1;
      if (['arrowright', 'd'].includes(key)) this.model.state.selectedCol += 1;
      if (['arrowup', 'w'].includes(key)) this.model.state.cameraY += GAME_CONST.CELL_DIMENTION;
      if (['arrowdown', 's'].includes(key)) this.model.state.cameraY -= GAME_CONST.CELL_DIMENTION;
      if ([' ', 'enter'].includes(key)) this.dropPiece();
      if (['1'].includes(key)) this.usePowerup('bomb');
      if (['2'].includes(key)) this.usePowerup('row');
      if (['3'].includes(key)) this.usePowerup('col');
      this.syncHud();
    });

    // Pointer Interractions
    this.view.app.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (this.model.state.isAnimating) return;
      const state = this.model.state;
      state.dragging = true;
      state.dragStartX = e.clientX;
      state.dragStartY = e.clientY;
      state.dragOriginX = state.cameraX;
      state.dragOriginY = state.cameraY;
      state.selectedCol = this.pointerColumn(e);
      this.syncHud();
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.model.state.isAnimating) return;
      const state = this.model.state;
      if (!state.dragging) return;
      state.cameraX = state.dragOriginX + (e.clientX - state.dragStartX);
      state.cameraY = state.dragOriginY + (e.clientY - state.dragStartY);
      state.selectedCol = this.pointerColumn(e);
      this.syncHud();
    });

    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (this.model.state.isAnimating) return;
      const state = this.model.state;
      if (!state.dragging) return;
      const moved = Math.hypot(e.clientX - state.dragStartX, e.clientY - state.dragStartY);
      state.dragging = false;
      if (moved < 8) {
        state.selectedCol = this.pointerColumn(e);
        this.dropPiece();
      }
    });

    // Button actions
    els.resetBtn.addEventListener('click', () => this.resetGame());
    els.centerBtn.addEventListener('click', () => {
      this.model.state.cameraX = 0;
      this.model.state.cameraY = 0;
      this.syncHud();
    });
  }

  private setupPowerupListeners(): void {
    const container = document.getElementById('powerupContainer') as HTMLElement;
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLButtonElement;
      const type = target.dataset.type as 'bomb' | 'row' | 'col';
      if (type) this.usePowerup(type);
    });
    this.updatePowerupButtons();
  }

  // Add this to update the UI
  private updatePowerupButtons(): void {
    const state = this.model.state;
    const inv = state.current === 1 ? state.player1Powerups : state.player2Powerups;
    const buttons = document.querySelectorAll('.btn-power') as NodeListOf<HTMLButtonElement>;

    buttons.forEach(btn => {
      const type = btn.dataset.type as 'bomb' | 'row' | 'col';
      const count = inv[type];
      btn.textContent = `${type.toUpperCase()} (${count})`;
      btn.disabled = count <= 0 || state.isAnimating;
    });
  }

  private pointerColumn(event: PointerEvent): number {
    const rect = this.view.app.canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const worldPos = Utils.screenToWorld(sx, sy, this.model.state, this.view.app);
    return Math.round(worldPos.x / GAME_CONST.CELL_DIMENTION);
  }

  private async dropPiece(): Promise<void> {
    const state = this.model.state;
    if (state.gameOver || state.isAnimating) return;

    state.isAnimating = true;

    const col = state.selectedCol;
    const row = this.model.getHeight(col);

    this.model.setCell(col, row, state.current);
    this.model.setHeight(col, row + 1);
    this.model.incrementMoves();

    await this.view.animateDrop(col, row, state.current);

    let cascadeActive = true;
    while (cascadeActive) {
      const chains = this.model.findAllChains();

      if (chains.length === 0) {
        cascadeActive = false;
        break;
      }

      if (state.current === 1) {
        state.player1Score += chains.length;
      } else {
        state.player2Score += chains.length;
      }

      const doomedPoints = this.model.getUniqueSortedPoints(chains);

      while (doomedPoints.length > 0) {
        const currentPoint = doomedPoints.shift();
        if (!currentPoint) continue;
        const [col, row] = currentPoint;

        await this.view.animateSingleDisappear(col, row);
        this.model.removeSingleToken(col, row);

        const gravityMovements = this.model.applyGravity();

        if (gravityMovements.length > 0) {
          await this.view.animateGravity(gravityMovements);

          for (const move of gravityMovements) {
            for (let i = 0; i < doomedPoints.length; i++) {
              if (doomedPoints[i][0] === move.col && doomedPoints[i][1] === move.oldRow) {
                doomedPoints[i][1] = move.newRow;
              }
            }
          }
        }
      }
    }

    const currentPlayerScore = state.current === 1 ? state.player1Score : state.player2Score;

    if (currentPlayerScore >= 3) {
      state.gameOver = true;
      const playerColorText = state.current === 1 ? 'Red' : 'Gold';
      this.syncHud(`<h1>${playerColorText} wins!</h1> Reached 3 chains.`);
      state.isAnimating = false;
      return;
    }

    // 5. Next Turn
    this.model.switchPlayer();
    const nextPlayerText = state.current === 1 ? 'Red' : 'Gold';
    this.syncHud(`<h1>${nextPlayerText.toUpperCase()} TURN.</h1> Drop a token to form chains.`);

    state.isAnimating = false;
  }

  private resetGame(): void {
    this.model.reset();
    this.view.clearLayerEffects();
    this.syncHud('<h1>Red starts.</h1> Move the selector left or right and drop anywhere.');
    this.view.focusWrapper();
  }

  private syncHud(message?: string): void {
    const nextRow = this.model.getHeight(this.model.state.selectedCol);
    this.view.syncHud(this.model.state, nextRow, message);
  }

  public async usePowerup(type: 'bomb' | 'row' | 'col'): Promise<void> {
    const state = this.model.state;
    if (state.gameOver || state.isAnimating) return;

    const inv = state.current === 1 ? state.player1Powerups : state.player2Powerups;
    if (inv[type] <= 0) return;

    state.isAnimating = true;
    inv[type] -= 1;

    const targets = this.model.getPowerupTargets(type, state.selectedCol, this.model.getHeight(state.selectedCol));

    for (const [tx, ty] of targets) {
      await this.view.animateSingleDisappear(tx, ty);
      this.model.removeSingleToken(tx, ty);
    }

    const gravityMovements = this.model.applyGravity();
    if (gravityMovements.length > 0) {
      await this.view.animateGravity(gravityMovements);
    }

    this.model.switchPlayer();
    this.syncHud(`<h1>Used ${type}! Turn passed.<h1>`);
    state.isAnimating = false;
    this.updatePowerupButtons();
  }
}