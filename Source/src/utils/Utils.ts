import { GAME_CONST } from "../types/const";
import { GameState } from "../types/types";

export class Utils {

  public static token(name: string, dom): string {
    return getComputedStyle(dom).getPropertyValue(name).trim();
  }

  public static pieceColor(player: number): number {
    return player === 1 ? 0xe25858 : 0xf0c84c;
  }

  public static pieceEdge(player: number): number {
    return player === 1 ? 0x7d2020 : 0x8a6200;
  }

  public static cellToWorld(cx: number, cy: number): { x: number; y: number } {
    return { x: cx * GAME_CONST.CELL_DIMENTION, y: -cy * GAME_CONST.CELL_DIMENTION };
  }

  public static screenToWorld(sx: number, sy: number, state: GameState, app): { x: number; y: number } {
    return {
      x: sx - app.screen.width / 2 - state.cameraX,
      y: sy - app.screen.height / 2 - state.cameraY
    };
  }
}
