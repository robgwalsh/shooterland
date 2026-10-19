import { BOARD_PX, TILE_PX, VIRTUAL_HEIGHT } from '../core/constants';

/**
 * Screen layout of the gameplay scene in virtual pixels. The original's
 * exact positions are unverified (docs/GAPS.md G25); these follow the
 * background art: a 600x600 play area and a 200px HUD panel on the right.
 */
export const LAYOUT = {
  board: { x: 20, y: 20, size: BOARD_PX },
  /** Mary's bar sits directly under the board, Poindexter's directly right of it. */
  bottomShooterY: 20 + BOARD_PX,
  rightShooterX: 20 + BOARD_PX,
  hud: {
    x: 600,
    width: 200,
    /** Black money box in supplement.png, relative to the panel. */
    moneyBox: { x: 38, y: 8, w: 68, h: 22 },
    storeButton: { x: 40, y: 36, w: 56, h: 18 },
    counters: { x: 612, y: 70, lineHeight: 18 },
    timer: { x: 612, y: 175 },
    next: { y: 230 },
    piggy: { x: 680, y: 300 },
    stump: { x: 680, y: VIRTUAL_HEIGHT - 80 },
    countdown: { x: 730, y: VIRTUAL_HEIGHT - 70 },
  },
} as const;

export function cellX(col: number): number {
  return LAYOUT.board.x + col * TILE_PX;
}

export function cellY(row: number): number {
  return LAYOUT.board.y + row * TILE_PX;
}

/** Board cell under a virtual-space point, or null outside the board. */
export function cellAt(x: number, y: number): { col: number; row: number } | null {
  const col = Math.floor((x - LAYOUT.board.x) / TILE_PX);
  const row = Math.floor((y - LAYOUT.board.y) / TILE_PX);
  if (col < 0 || row < 0 || col >= 13 || row >= 13) return null;
  return { col, row };
}

export function inRect(
  x: number,
  y: number,
  r: { x: number; y: number; w: number; h: number },
  ox = 0,
  oy = 0,
): boolean {
  return x >= r.x + ox && y >= r.y + oy && x < r.x + ox + r.w && y < r.y + oy + r.h;
}
