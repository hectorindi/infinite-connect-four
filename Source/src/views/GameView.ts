import * as PIXI from 'pixi.js';
import { GameState, Point } from '../types/types';
import { GAME_CONST } from '../types/const';
import { Utils } from '../utils/Utils';
console.log("Pixi Version:", PIXI.VERSION);
export class GameView {

  public app: PIXI.Application;

  // DOM Elements
  private root = document.documentElement;
  private gameElements = {
    wrap: document.getElementById('game-wrap') as HTMLElement,
    pixiRoot: document.getElementById('pixi-root') as HTMLElement,
    turnValue: document.getElementById('turnValue') as HTMLElement,
    moveValue: document.getElementById('moveValue') as HTMLElement,
    xValue: document.getElementById('xValue') as HTMLElement,
    yValue: document.getElementById('yValue') as HTMLElement,
    columnValue: document.getElementById('columnValue') as HTMLElement,
    rowValue: document.getElementById('rowValue') as HTMLElement,
    statusMessage: document.getElementById('statusMessage') as HTMLElement,
    resetBtn: document.getElementById('resetBtn') as HTMLElement,
    centerBtn: document.getElementById('centerBtn') as HTMLElement,
    themeBtn: document.querySelector('[data-theme-toggle]') as HTMLElement,
    redScoreValue: document.getElementById('redScoreValue') as HTMLElement,
    goldScoreValue: document.getElementById('goldScoreValue') as HTMLElement,
  };

  // Pixi layers
  public world!: PIXI.Container;
  private gridLayer!: PIXI.Graphics;
  private pieceLayer!: PIXI.Container;
  private fxLayer!: PIXI.Container;
  private preview!: PIXI.Graphics;

  private spriteMap: Map<string, PIXI.Graphics> = new Map();

  constructor() {
    this.app = new PIXI.Application();
    this.setupTheme();
  }

  public async initPixi(): Promise<void> {
    this.app = new PIXI.Application();
    await this.app.init({
      resizeTo: this.gameElements.pixiRoot,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2)
    });
    this.setUpGame();
  }

  protected setUpGame() {
    this.gameElements.pixiRoot.appendChild(this.app.canvas);
    this.world = new PIXI.Container();
    this.gridLayer = new PIXI.Graphics({});
    this.pieceLayer = new PIXI.Container();
    this.fxLayer = new PIXI.Container();
    const previewLayer = new PIXI.Container();
    this.preview = new PIXI.Graphics({});
    previewLayer.addChild(this.preview);

    this.world.addChild(this.gridLayer, this.pieceLayer, this.fxLayer, previewLayer);
    this.app.stage.addChild(this.world);
  }

  // Theme Management
  private setupTheme(): void {
    let theme = matchMedia('(prefers-color-scheme: dark)').matches ? GAME_CONST.CSS.DARK : GAME_CONST.CSS.LIGHT;
    this.root.setAttribute('data-theme', theme);
    const setThemeIcon = () => {
      this.gameElements.themeBtn.setAttribute('aria-label', `Switch to ${theme === GAME_CONST.CSS.DARK ? GAME_CONST.CSS.LIGHT : GAME_CONST.CSS.DARK} mode`);
      this.gameElements.themeBtn.innerHTML = theme === 'dark'
        ? GAME_CONST.CSS.DARK_THEME
        : GAME_CONST.CSS.LIGHT_THEME;
    };
    setThemeIcon();
    this.gameElements.themeBtn.addEventListener('click', () => {
      theme = theme === GAME_CONST.CSS.DARK ? GAME_CONST.CSS.LIGHT : GAME_CONST.CSS.DARK;
      this.root.setAttribute('data-theme', theme);
      setThemeIcon();
    });
  }

  // HUD Update
  public syncHud(state: GameState, nextRow: number, message?: string): void {
    this.gameElements.turnValue.textContent = state.current === 1 ? GAME_CONST.PLAYER.color_red : GAME_CONST.PLAYER.color_yellow;
    this.gameElements.moveValue.textContent = String(state.moves);
    this.gameElements.xValue.textContent = String(state.selectedCol);
    this.gameElements.yValue.textContent = String(nextRow);
    this.gameElements.columnValue.textContent = String(state.selectedCol);
    this.gameElements.rowValue.textContent = String(nextRow);
    this.gameElements.redScoreValue.textContent = String(state.player1Score);
    this.gameElements.goldScoreValue.textContent = String(state.player2Score);
    if (message) this.gameElements.statusMessage.innerHTML = message;
  }

  // Rendering Loops
  public renderBoard(state: GameState): void {
    this.world.x = this.app.screen.width / 2 + state.cameraX;
    this.world.y = this.app.screen.height / 2 + state.cameraY;
    this.gridLayer.clear();

    const line = PIXI.Color.shared.setValue(Utils.token('--color-border', this.root)).toNumber();
    const accent = PIXI.Color.shared.setValue(Utils.token('--color-primary', this.root)).toNumber();

    const visibleCols = Math.ceil(this.app.screen.width / GAME_CONST.CELL_DIMENTION);
    const visibleRows = Math.ceil(this.app.screen.height / GAME_CONST.CELL_DIMENTION);
    const centerCol = Math.round(-state.cameraX / GAME_CONST.CELL_DIMENTION);
    const centerRow = Math.round(state.cameraY / GAME_CONST.CELL_DIMENTION);

    const startCol = centerCol - Math.ceil(visibleCols / 2);
    const endCol = centerCol + Math.ceil(visibleCols / 2);
    const startRow = Math.max(0, centerRow - Math.ceil(visibleRows / 2));
    const endRow = Math.max(10, centerRow + Math.ceil(visibleRows / 2));

    for (let col = startCol; col <= endCol; col++) {
      const x = col * GAME_CONST.CELL_DIMENTION;
      this.gridLayer
        .moveTo(x, -(startRow - 0.5) * GAME_CONST.CELL_DIMENTION)
        .lineTo(x, -(endRow + 0.5) * GAME_CONST.CELL_DIMENTION)
        .stroke({ color: line, width: col === 0 ? 3 : 1, alpha: col === state.selectedCol ? 0.9 : 0.45 });
    }

    for (let row = startRow; row <= endRow; row++) {
      const y = -row * GAME_CONST.CELL_DIMENTION;
      this.gridLayer
        .moveTo((startCol - 0.5) * GAME_CONST.CELL_DIMENTION, y)
        .lineTo((endCol + 0.5) * GAME_CONST.CELL_DIMENTION, y)
        .stroke({ color: line, width: row === 0 ? 3 : 1, alpha: 0.45 });
    }

    const x = state.selectedCol * GAME_CONST.CELL_DIMENTION;
    this.gridLayer
      .roundRect(x - GAME_CONST.CELL_DIMENTION / 2 + 6, -(endRow + 0.5) * GAME_CONST.CELL_DIMENTION + 6, GAME_CONST.CELL_DIMENTION - 12, (endRow - startRow + 1) * GAME_CONST.CELL_DIMENTION - 12, 18)
      .stroke({ color: accent, width: 3, alpha: 0.6 });
  }

  public renderPreview(state: GameState, nextRow: number, time: number = 0): void {
    const pos = Utils.cellToWorld(state.selectedCol, nextRow);
    this.preview.clear();
    this.preview
      .circle(pos.x, pos.y + Math.sin(time / GAME_CONST.PLAYER.animate_time) * GAME_CONST.PLAYER.spawn_height_mul, GAME_CONST.CELL_DIMENTION * GAME_CONST.PLAYER.radius - 0.02)
      .fill(Utils.pieceColor(state.current), 0.22)
      .stroke({ color: Utils.pieceColor(state.current), width: 3, alpha: 0.9 });
  }

  // Animation Elements
  private makePieceSprite(player: number): PIXI.Graphics {
    const g = new PIXI.Graphics({});
    g.circle(0, 0, GAME_CONST.CELL_DIMENTION * GAME_CONST.PLAYER.radius)
      .fill(Utils.pieceColor(player))
      .stroke({ color: Utils.pieceEdge(player), width: 4 });
    g.circle(-GAME_CONST.CELL_DIMENTION * GAME_CONST.PLAYER.highlight_offset, -GAME_CONST.CELL_DIMENTION * GAME_CONST.PLAYER.highlight_offset, GAME_CONST.CELL_DIMENTION * GAME_CONST.PLAYER.highlight_size)
      .fill(0xffffff, 0.22);
    return g;
  }

  public animateDrop(col: number, row: number, player: number): Promise<void> {
    return new Promise((resolve) => {
      const pos = Utils.cellToWorld(col, row);
      const piece = this.makePieceSprite(player);
      piece.x = pos.x;
      piece.y = pos.y - GAME_CONST.CELL_DIMENTION * GAME_CONST.PLAYER.spawn_height_mul;

      this.pieceLayer.addChild(piece);
      this.spriteMap.set(this.getCellKey(col, row), piece);

      const targetY = pos.y;
      const startY = piece.y;
      const start = performance.now();

      const animate = (now: number) => {
        const t = Math.min((now - start) / GAME_CONST.PLAYER.animate_time, 1);
        const eased = 1 - Math.pow(1 - t, GAME_CONST.PLAYER.ease);
        piece.y = startY + (targetY - startY) * eased;
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          piece.y = targetY;
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  public pulseWin(cells: Point[]): void {
    this.fxLayer.removeChildren();
    for (const [cx, cy] of cells) {
      const glow = new PIXI.Graphics({});
      const p = Utils.cellToWorld(cx, cy);
      glow.x = p.x;
      glow.y = p.y;
      glow.circle(0, 0, GAME_CONST.CELL_DIMENTION * 0.42)
        .fill(0xffffff, 0.12)
        .stroke({ color: 0xffffff, width: 3, alpha: 0.7 });
      this.fxLayer.addChild(glow);
    }
  }

  public clearLayerEffects(): void {
    this.pieceLayer.removeChildren();
    this.fxLayer.removeChildren();
    this.spriteMap.clear();
  }

  public focusWrapper(): void {
    this.gameElements.wrap.focus();
  }

  public getElements() {
    return this.gameElements;
  }

  private getCellKey(col: number, row: number): string {
    return `${col},${row}`;
  }

  public animateDisappear(chains: Point[][]): Promise<void> {
    return new Promise((resolve) => {
      // 1. Flatten the chains into a map to get unique points
      const uniquePointsMap = new Map<string, Point>();
      for (const chain of chains) {
        for (const [x, y] of chain) {
          uniquePointsMap.set(this.getCellKey(x, y), [x, y]);
        }
      }

      const uniquePoints = Array.from(uniquePointsMap.values());
      if (uniquePoints.length === 0) {
        resolve();
        return;
      }

      // 2. Sort by the global deterministic order:
      // Left-to-Right (X ascending), tie-breaker Bottom-to-Top (Y ascending)
      uniquePoints.sort((a, b) => {
        if (a[0] !== b[0]) return a[0] - b[0]; 
        return a[1] - b[1]; 
      });

      // 3. Staggered Animation settings
      const staggerDelay = 150; // ms delay between each token starting its fade
      const fadeDuration = 300; // ms duration of the actual fade
      const start = performance.now();

      // Map our sorted points to their specific animation timelines
      const sequence = uniquePoints.map((point, index) => {
        const key = this.getCellKey(point[0], point[1]);
        return {
          key,
          sprite: this.spriteMap.get(key),
          startTime: start + (index * staggerDelay),
        };
      });

      const animate = (now: number) => {
        let allAnimationsComplete = true;

        sequence.forEach(item => {
          if (!item.sprite) return;

          // If the current time has reached this sprite's specific start time
          if (now >= item.startTime) {
            const t = Math.min((now - item.startTime) / fadeDuration, 1);
            
            item.sprite.alpha = 1 - t; // Fade out
            item.sprite.scale.set(1 - (t * 0.5)); // Shrink slightly

            if (t < 1) allAnimationsComplete = false;
          } else {
            // Not time for this sprite to start yet
            allAnimationsComplete = false;
          }
        });

        if (!allAnimationsComplete) {
          requestAnimationFrame(animate);
        } else {
          // Cleanup phase once every sprite in the sequence has finished fading
          sequence.forEach(item => {
            if (item.sprite) {
              this.pieceLayer.removeChild(item.sprite);
              item.sprite.destroy();
              this.spriteMap.delete(item.key);
            }
          });
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  public animateGravity(movements: { col: number, oldRow: number, newRow: number }[]): Promise<void> {
    return new Promise((resolve) => {
      if (movements.length === 0) {
        resolve();
        return;
      }

      const activeSprites = movements.map(move => {
        const oldKey = this.getCellKey(move.col, move.oldRow);
        const newKey = this.getCellKey(move.col, move.newRow);
        const sprite = this.spriteMap.get(oldKey);

        if (sprite) {
          this.spriteMap.delete(oldKey);
          this.spriteMap.set(newKey, sprite);
        }

        return {
          sprite,
          startY: sprite ? sprite.y : 0,
          targetY: Utils.cellToWorld(move.col, move.newRow).y
        };
      });

      const start = performance.now();
      const duration = GAME_CONST.PLAYER.animate_time;

      const animate = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, GAME_CONST.PLAYER.ease); 

        activeSprites.forEach(item => {
          if (item.sprite) {
            item.sprite.y = item.startY + (item.targetY - item.startY) * eased;
          }
        });

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          activeSprites.forEach(item => {
            if (item.sprite) item.sprite.y = item.targetY;
          });
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }
}