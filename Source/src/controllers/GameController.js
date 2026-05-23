export class GameController {
    model;
    view;
    constructor(model, view) {
        this.model = model;
        this.view = view;
    }
    init() {
        this.setupEventListeners();
        this.view.app.ticker.add((ticker) => {
            this.view.renderBoard(this.model.state);
            this.view.renderPreview(this.model.state, this.model.getHeight(this.model.state.selectedCol), ticker.lastTime);
        });
        this.resetGame();
    }
    setupEventListeners() {
        const els = this.view.getElements();
        // Keydown Controls
        els.wrap.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (['arrowleft', 'a'].includes(key))
                this.model.state.selectedCol -= 1;
            if (['arrowright', 'd'].includes(key))
                this.model.state.selectedCol += 1;
            if (['arrowup', 'w'].includes(key))
                this.model.state.cameraY += this.view.CELL;
            if (['arrowdown', 's'].includes(key))
                this.model.state.cameraY -= this.view.CELL;
            if ([' ', 'enter'].includes(key))
                this.dropPiece();
            this.syncHud();
        });
        // Pointer Interractions
        this.view.app.canvas.addEventListener('pointerdown', (e) => {
            const state = this.model.state;
            state.dragging = true;
            state.dragStartX = e.clientX;
            state.dragStartY = e.clientY;
            state.dragOriginX = state.cameraX;
            state.dragOriginY = state.cameraY;
            state.selectedCol = this.pointerColumn(e);
            this.syncHud();
        });
        window.addEventListener('pointermove', (e) => {
            const state = this.model.state;
            if (!state.dragging)
                return;
            state.cameraX = state.dragOriginX + (e.clientX - state.dragStartX);
            state.cameraY = state.dragOriginY + (e.clientY - state.dragStartY);
            state.selectedCol = this.pointerColumn(e);
            this.syncHud();
        });
        window.addEventListener('pointerup', (e) => {
            const state = this.model.state;
            if (!state.dragging)
                return;
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
    pointerColumn(event) {
        const rect = this.view.app.canvas.getBoundingClientRect();
        const sx = event.clientX - rect.left;
        const sy = event.clientY - rect.top;
        const worldPos = this.view.screenToWorld(sx, sy, this.model.state);
        return Math.round(worldPos.x / this.view.CELL);
    }
    dropPiece() {
        const state = this.model.state;
        if (state.gameOver)
            return;
        const col = state.selectedCol;
        const row = this.model.getHeight(col);
        this.model.setCell(col, row, state.current);
        this.model.setHeight(col, row + 1);
        this.view.addPiece(col, row, state.current);
        this.model.incrementMoves();
        const player = state.current;
        const win = this.model.checkWin(col, row, player);
        if (win) {
            state.gameOver = true;
            this.view.pulseWin(win);
            const playerColorText = player === 1 ? 'Red' : 'Gold';
            this.syncHud(`<strong>${playerColorText} wins.</strong> Connected ${win.length} in a row on the infinite board.`);
            return;
        }
        this.model.switchPlayer();
        const nextPlayerText = state.current === 1 ? 'Red' : 'Gold';
        this.syncHud(`<strong>${nextPlayerText} turn.</strong> The board keeps expanding, so every column stays playable.`);
    }
    resetGame() {
        this.model.reset();
        this.view.clearLayerEffects();
        this.syncHud('<strong>Red starts.</strong> Move the selector left or right and drop anywhere.');
        this.view.focusWrapper();
    }
    syncHud(message) {
        const nextRow = this.model.getHeight(this.model.state.selectedCol);
        this.view.syncHud(this.model.state, nextRow, message);
    }
}
