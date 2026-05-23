export class GameModel {
    grid = new Map();
    columnHeights = new Map();
    state;
    constructor() {
        this.state = this.getInitialState();
    }
    getInitialState() {
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
    reset() {
        this.grid.clear();
        this.columnHeights.clear();
        this.state = this.getInitialState();
    }
    cellKey(x, y) {
        return `${x},${y}`;
    }
    getCell(x, y) {
        return this.grid.get(this.cellKey(x, y)) || 0;
    }
    setCell(x, y, player) {
        this.grid.set(this.cellKey(x, y), player);
    }
    getHeight(col) {
        return this.columnHeights.get(col) ?? 0;
    }
    setHeight(col, height) {
        this.columnHeights.set(col, height);
    }
    switchPlayer() {
        this.state.current = this.state.current === 1 ? 2 : 1;
    }
    incrementMoves() {
        this.state.moves += 1;
    }
    checkWin(x, y, player) {
        const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (const [dx, dy] of dirs) {
            const cells = [[x, y]];
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
            if (cells.length >= 4)
                return cells;
        }
        return null;
    }
}
