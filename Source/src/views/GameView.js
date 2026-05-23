import * as PIXI from 'pixi.js';
export class GameView {
    CELL = 74;
    app;
    // DOM Elements
    root = document.documentElement;
    els = {
        wrap: document.getElementById('game-wrap'),
        pixiRoot: document.getElementById('pixi-root'),
        turnValue: document.getElementById('turnValue'),
        moveValue: document.getElementById('moveValue'),
        xValue: document.getElementById('xValue'),
        yValue: document.getElementById('yValue'),
        columnValue: document.getElementById('columnValue'),
        rowValue: document.getElementById('rowValue'),
        statusMessage: document.getElementById('statusMessage'),
        resetBtn: document.getElementById('resetBtn'),
        centerBtn: document.getElementById('centerBtn'),
        themeBtn: document.querySelector('[data-theme-toggle]')
    };
    // Pixi layers
    world;
    gridLayer;
    pieceLayer;
    fxLayer;
    preview;
    constructor() {
        this.app = new PIXI.Application();
        this.setupTheme();
    }
    async initPixi() {
        this.app = new PIXI.Application();
        await this.app.init({
            resizeTo: this.els.pixiRoot,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2)
        });
        this.els.pixiRoot.appendChild(this.app.canvas);
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
    setupTheme() {
        let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        this.root.setAttribute('data-theme', theme);
        const setThemeIcon = () => {
            this.els.themeBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
            this.els.themeBtn.innerHTML = theme === 'dark'
                ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
                : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
        };
        setThemeIcon();
        this.els.themeBtn.addEventListener('click', () => {
            theme = theme === 'dark' ? 'light' : 'dark';
            this.root.setAttribute('data-theme', theme);
            setThemeIcon();
        });
    }
    // Tokens & Helpers
    token(name) {
        return getComputedStyle(this.root).getPropertyValue(name).trim();
    }
    pieceColor(player) {
        return player === 1 ? 0xe25858 : 0xf0c84c;
    }
    pieceEdge(player) {
        return player === 1 ? 0x7d2020 : 0x8a6200;
    }
    cellToWorld(cx, cy) {
        return { x: cx * this.CELL, y: -cy * this.CELL };
    }
    screenToWorld(sx, sy, state) {
        return {
            x: sx - this.app.screen.width / 2 - state.cameraX,
            y: sy - this.app.screen.height / 2 - state.cameraY
        };
    }
    // HUD Update
    syncHud(state, nextRow, message) {
        this.els.turnValue.textContent = state.current === 1 ? 'Red' : 'Gold';
        this.els.moveValue.textContent = String(state.moves);
        this.els.xValue.textContent = String(state.selectedCol);
        this.els.yValue.textContent = String(nextRow);
        this.els.columnValue.textContent = String(state.selectedCol);
        this.els.rowValue.textContent = String(nextRow);
        if (message)
            this.els.statusMessage.innerHTML = message;
    }
    // Rendering Loops
    renderBoard(state) {
        this.world.x = this.app.screen.width / 2 + state.cameraX;
        this.world.y = this.app.screen.height / 2 + state.cameraY;
        this.gridLayer.clear();
        const line = new PIXI.Color(this.token('--color-border')).toNumber();
        const accent = new PIXI.Color(this.token('--color-primary')).toNumber();
        const visibleCols = Math.ceil(this.app.screen.width / this.CELL) + 4;
        const visibleRows = Math.ceil(this.app.screen.height / this.CELL) + 5;
        const centerCol = Math.round(-state.cameraX / this.CELL);
        const centerRow = Math.round(state.cameraY / this.CELL);
        const startCol = centerCol - Math.ceil(visibleCols / 2);
        const endCol = centerCol + Math.ceil(visibleCols / 2);
        const startRow = Math.max(0, centerRow - Math.ceil(visibleRows / 2));
        const endRow = Math.max(10, centerRow + Math.ceil(visibleRows / 2));
        for (let col = startCol; col <= endCol; col++) {
            const x = col * this.CELL;
            this.gridLayer
                .moveTo(x, -(startRow - 0.5) * this.CELL)
                .lineTo(x, -(endRow + 0.5) * this.CELL)
                .stroke({ color: line, width: col === 0 ? 3 : 1, alpha: col === state.selectedCol ? 0.9 : 0.45 });
        }
        for (let row = startRow; row <= endRow; row++) {
            const y = -row * this.CELL;
            this.gridLayer
                .moveTo((startCol - 0.5) * this.CELL, y)
                .lineTo((endCol + 0.5) * this.CELL, y)
                .stroke({ color: line, width: row === 0 ? 3 : 1, alpha: 0.45 });
        }
        const x = state.selectedCol * this.CELL;
        this.gridLayer
            .roundRect(x - this.CELL / 2 + 6, -(endRow + 0.5) * this.CELL + 6, this.CELL - 12, (endRow - startRow + 1) * this.CELL - 12, 18)
            .stroke({ color: accent, width: 3, alpha: 0.6 });
    }
    renderPreview(state, nextRow, time = 0) {
        const pos = this.cellToWorld(state.selectedCol, nextRow);
        this.preview.clear();
        this.preview
            .circle(pos.x, pos.y + Math.sin(time / 260) * 6, this.CELL * 0.34)
            .fill(this.pieceColor(state.current), 0.22)
            .stroke({ color: this.pieceColor(state.current), width: 3, alpha: 0.9 });
    }
    // Animation Elements
    makePieceSprite(player) {
        const g = new PIXI.Graphics({});
        g.circle(0, 0, this.CELL * 0.36)
            .fill(this.pieceColor(player))
            .stroke({ color: this.pieceEdge(player), width: 4 });
        g.circle(-this.CELL * 0.12, -this.CELL * 0.12, this.CELL * 0.11)
            .fill(0xffffff, 0.22);
        return g;
    }
    addPiece(col, row, player) {
        const pos = this.cellToWorld(col, row);
        const piece = this.makePieceSprite(player);
        piece.x = pos.x;
        piece.y = pos.y - this.CELL * 6;
        this.pieceLayer.addChild(piece);
        const targetY = pos.y;
        const startY = piece.y;
        const start = performance.now();
        const animate = (now) => {
            const t = Math.min((now - start) / 260, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            piece.y = startY + (targetY - startY) * eased;
            if (t < 1)
                requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }
    pulseWin(cells) {
        this.fxLayer.removeChildren();
        for (const [cx, cy] of cells) {
            const glow = new PIXI.Graphics({});
            const p = this.cellToWorld(cx, cy);
            glow.x = p.x;
            glow.y = p.y;
            glow.circle(0, 0, this.CELL * 0.42)
                .fill(0xffffff, 0.12)
                .stroke({ color: 0xffffff, width: 3, alpha: 0.7 });
            this.fxLayer.addChild(glow);
        }
    }
    clearLayerEffects() {
        this.pieceLayer.removeChildren();
        this.fxLayer.removeChildren();
    }
    focusWrapper() {
        this.els.wrap.focus();
    }
    getElements() {
        return this.els;
    }
}
