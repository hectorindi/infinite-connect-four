import { GameModel }  from '../models/GameModel';
import { GAME_CONST } from '../types/const';
import { Utils } from '../utils/Utils';
import  {GameView}  from '../views/GameView';

export class GameController {
  constructor(private model: GameModel, private view: GameView) {}

  public init(): void {
    this.setupEventListeners();
    this.view.app.ticker.add((ticker: any) => {
      this.view.renderBoard(this.model.state);
      this.view.renderPreview(this.model.state, this.model.getHeight(this.model.state.selectedCol), ticker.lastTime);
    });
    this.resetGame();
  }

  private setupEventListeners(): void {
    const els = this.view.getElements();

    // Keydown Controls
    els.wrap.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.model.state.isAnimating) return;
      const key = e.key.toLowerCase();
      if (['arrowleft', 'a'].includes(key)) this.model.state.selectedCol -= 1;
      if (['arrowright', 'd'].includes(key)) this.model.state.selectedCol += 1;
      if (['arrowup', 'w'].includes(key)) this.model.state.cameraY += GAME_CONST.CELL_DIMENTION;
      if (['arrowdown', 's'].includes(key)) this.model.state.cameraY -= GAME_CONST.CELL_DIMENTION;
      if ([' ', 'enter'].includes(key)) this.dropPiece();
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

    await this.view.animateDisappear(chains);
    this.model.removeTokens(chains);
    
    const gravityMovements = this.model.applyGravity();
    if (gravityMovements.length > 0) {
      await this.view.animateGravity(gravityMovements);
    }
  }

  const currentPlayerScore = state.current === 1 ? state.player1Score : state.player2Score;
  
  if (currentPlayerScore >= 3) {
    state.gameOver = true;
    const playerColorText = state.current === 1 ? 'Red' : 'Gold';
    this.syncHud(`<strong>${playerColorText} wins!</strong> Reached 3 chains.`);
    state.isAnimating = false;
    return;
  }

  // 5. Next Turn
  this.model.switchPlayer();
  const nextPlayerText = state.current === 1 ? 'Red' : 'Gold';
  this.syncHud(`<strong>${nextPlayerText} turn.</strong> Drop a token to form chains.`);
  
  state.isAnimating = false;
}

  private resetGame(): void {
    this.model.reset();
    this.view.clearLayerEffects();
    this.syncHud('<strong>Red starts.</strong> Move the selector left or right and drop anywhere.');
    this.view.focusWrapper();
  }

  private syncHud(message?: string): void {
    const nextRow = this.model.getHeight(this.model.state.selectedCol);
    this.view.syncHud(this.model.state, nextRow, message);
  }
}