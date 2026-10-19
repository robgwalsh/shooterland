import { BOARD_PX, TILE_PX } from '../core/constants';
import type { Rect } from './ui';

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

/**
 * Screen positions of every gameplay element, as the exe draws them
 * (docs/DISASSEMBLY.md "Layout"). Virtual 800x600 pixels.
 */
export const LAYOUT = {
  board: { x: 40, y: 40, size: BOARD_PX },
  /** Mary's bar sits just under the board, Poindexter's just right of it. */
  bottomBarY: 559,
  rightBarX: 559,
  /** Rosco's stump (top-right corner) and the piggy bank (bottom-left corner). */
  stump: { x: 560, y: 0 },
  piggy: { x: 0, y: 560 },
  /** Rosco's countdown to the next speed-up. */
  countdown: { x: 550, y: 17 },
  hud: {
    x: 600,
    width: 200,
    /** "Level %d-%d", centred, in the black box at the top of the panel. */
    title: r(632, 30, 138, 28),
    /** Money, centred, in the "$" box of the store panel. */
    money: r(641, 374, 63, 23),
    /** Enemy counts: Cronies, Crazies, Fatties in the left column, Fangies and Skullies in the right. */
    counters: [
      { x: 675, y: 80 },
      { x: 675, y: 115 },
      { x: 675, y: 149 },
      { x: 742, y: 80 },
      { x: 742, y: 115 },
    ],
    time: { x: 700, y: 150 },
    ttb: { x: 700, y: 165 },
    /** Next item per lane: Mary's along the bottom (right-aligned), Poindexter's down the side (bottom-aligned). */
    nextBottom: { xs: [639, 679, 719], y: 526 },
    nextRight: { x: 722, ys: [379, 419, 459] },
    musicButton: r(672, 480, 27, 31),
    storeButton: r(630, 397, 66, 19),
    /** The store panel art (supplement.png) is blitted here while the store is open. */
    supplement: { x: 600, y: 366 },
    /** Retry, Pause, Quit. */
    menuButtons: [r(626, 210, 150, 39), r(626, 261, 150, 39), r(626, 311, 150, 39)],
  },
  store: {
    weights: [r(655, 420, 40, 40), r(655, 460, 40, 40), r(655, 500, 40, 40)],
    bomb: r(655, 540, 40, 35),
    bombQuantity: { x: 665, y: 569 },
    minus: r(655, 578, 9, 9),
    plus: r(689, 578, 9, 9),
    ramps: [r(705, 420, 40, 40), r(705, 460, 40, 40), r(705, 500, 40, 40), r(705, 540, 40, 40)],
    priceLeftX: 625,
    priceRightX: 750,
    /** Bars park here (first lane) while the store is open: 11 - size. */
    park: 11,
  },
  /** The retry / quit prompt: wood panel, two text rows, two buttons. */
  prompt: {
    panel: { x: 100, y: 100 },
    line1: r(100, 220, 400, 50),
    line2: r(100, 260, 400, 50),
    buttons: [r(210, 335, 80, 40), r(310, 335, 80, 40)],
  },
  pause: {
    /** Column x of the four kill-method headers (bomb, combo, weight, mine) and their row. */
    headerXs: [280, 320, 360, 400],
    headerY: 280,
    enemyX: 240,
    nameX: 120,
    firstRowY: 320,
    rowStep: 40,
    letters: { x: 60, step: 100, y: 40, size: 80 },
  },
} as const;

export const BUBBLE_PX = 62;

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

/**
 * The bar position the exe derives from the pointer (`FUN_004084ac`): the
 * bar is centred under the pointer, with C integer division (toward zero).
 */
export function aimedLane(pointer: number, origin: number, size: number): number {
  return Math.trunc((pointer - origin - (size - 1) * 20) / TILE_PX);
}

/**
 * Top-left corners of the 62 px drop bubbles for each lane of a bar while
 * the store is open (`FUN_00408561`).
 */
export function bubbleOrigins(side: 'bottom' | 'right', pos: number, size: number): number[] {
  const p = pos * TILE_PX;
  const origin = side === 'bottom' ? LAYOUT.board.x : LAYOUT.board.y;
  switch (size) {
    case 1:
      return [p - 10 + origin];
    case 2:
      return [p - 25 + origin, p + TILE_PX + 2 + origin];
    default:
      return [p - 34 + origin, p + TILE_PX - 10 + origin, p + 94 + origin];
  }
}

export function inRect(x: number, y: number, rect: Rect, ox = 0, oy = 0): boolean {
  return (
    x >= rect.x + ox && y >= rect.y + oy && x < rect.x + ox + rect.w && y < rect.y + oy + rect.h
  );
}
