import { TILE_PX } from '../core/constants';
import { enemyBlockKind, enemyKind, isRamp, isThingie, isWeight } from '../core/tiles';
import { type EnemyKind, TileId } from '../core/types';

/** A source rectangle in a sheet, in pixels. */
export interface SpriteRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const T = TILE_PX;
const rect = (x: number, y: number, w = T, h = T): SpriteRect => ({ x, y, w, h });

/**
 * Per-world tile sheet (`worlds/N/tiles.png`, 440x480 = 11 columns x 12 rows):
 * row 0 holds the bomb (frames 0-3) and its explosion (4-10); rows 1-6 the six
 * thingies with 11 animation frames each; rows 7-11 the five enemies with 9
 * frames each, and in columns 9-10 the ring, mine, plain blocks and enemy blocks.
 */
export const TILESHEET = {
  columns: 11,
  thingieFrames: 11,
  enemyFrames: 9,
  bombFrames: 4,
  explosionFrames: 7,
} as const;

const ENEMY_ROW: Record<EnemyKind, number> = {
  crony: 7,
  crazy: 8,
  fatty: 9,
  fangie: 10,
  skully: 11,
};
const ENEMY_BLOCK_CELL: Record<EnemyKind, SpriteRect> = {
  crony: rect(9 * T, 9 * T),
  crazy: rect(10 * T, 9 * T),
  fatty: rect(9 * T, 10 * T),
  fangie: rect(10 * T, 10 * T),
  skully: rect(9 * T, 11 * T),
};

export const RING = rect(9 * T, 7 * T);
export const MINE = rect(10 * T, 7 * T);
export const GREY_BLOCK = rect(9 * T, 8 * T);
export const BROWN_BLOCK = rect(10 * T, 8 * T);

export function bombFrame(frame: number): SpriteRect {
  return rect((frame % TILESHEET.bombFrames) * T, 0);
}

export function explosionFrame(frame: number): SpriteRect {
  return rect((TILESHEET.bombFrames + Math.min(frame, TILESHEET.explosionFrames - 1)) * T, 0);
}

export function thingieFrame(id: number, frame: number): SpriteRect {
  const row = id - TileId.Thingie1 + 1;
  return rect((frame % TILESHEET.thingieFrames) * T, row * T);
}

export function enemyFrame(kind: EnemyKind, frame: number): SpriteRect {
  return rect((frame % TILESHEET.enemyFrames) * T, ENEMY_ROW[kind] * T);
}

/** Where a board tile is drawn from. `frame` animates thingies and enemies. */
export function tileSheetRect(id: number, frame: number): SpriteRect | null {
  if (isThingie(id)) return thingieFrame(id, frame);
  const enemy = enemyKind(id);
  if (enemy) return enemyFrame(enemy, frame);
  const block = enemyBlockKind(id);
  if (block) return ENEMY_BLOCK_CELL[block];
  switch (id) {
    case TileId.GreyBlock:
      return GREY_BLOCK;
    case TileId.BrownBlock:
      return BROWN_BLOCK;
    case TileId.Mine:
      return MINE;
    case TileId.Bomb:
      return bombFrame(0);
    default:
      return null;
  }
}

/**
 * `items.png` (40x360): weights 1-3, the unsold heavy weight, the four ramps in
 * id order 16-19, and the green ring (the exe draws ids 12-19 from row id-12).
 */
export function itemRect(id: number): SpriteRect | null {
  if (isWeight(id)) return rect(0, (id - TileId.Weight1) * T);
  if (isRamp(id)) return rect(0, (4 + id - TileId.RampTopLeft) * T);
  return null;
}

export const ITEM_RING = rect(0, 8 * T);

/** Which sheet a tile id lives in. */
export function spriteFor(
  id: number,
  frame: number,
): { sheet: 'tiles' | 'items'; rect: SpriteRect } | null {
  const item = itemRect(id);
  if (item) return { sheet: 'items', rect: item };
  const tile = tileSheetRect(id, frame);
  return tile ? { sheet: 'tiles', rect: tile } : null;
}

/**
 * `shooters.png` (120x160): Mary's red horizontal bars and Poindexter's blue
 * vertical bars in sizes 1-3, nested so each size is a whole number of cells.
 */
export function bottomShooterRect(size: number): SpriteRect {
  return rect(120 - T * size, T * (3 - size), T * size, T);
}

export function rightShooterRect(size: number): SpriteRect {
  return rect(T * (3 - size), 160 - T * size, T, T * size);
}

/** `raccoon.png` (320x40): 8 frames. */
export const ROSCO = {
  walkLeft: [0, 1],
  walkAway: [2, 3],
  walkTowardWithBag: [4, 5],
  walkRightWithBag: [6, 7],
} as const;

export function roscoFrame(frame: number): SpriteRect {
  return rect(frame * T, 0);
}

/** `stumpandmoney.png` (40x80): the stump above the piggy bank. */
export const STUMP = rect(0, 0);
export const PIGGY = rect(0, T);

/** `bubbles.png` (124x124): 62px glossy squares, blue/red and their highlighted variants. */
export const BUBBLE = {
  blue: rect(0, 0, 62, 62),
  red: rect(62, 0, 62, 62),
  redLit: rect(0, 62, 62, 62),
  blueLit: rect(62, 62, 62, 62),
} as const;

/** `explosion.png` (440x80): fire explosion on row 0, blue swirl on row 1, 11 frames each. */
export function fireFrame(frame: number): SpriteRect {
  return rect(Math.min(frame, 10) * T, 0);
}

export function swirlFrame(frame: number): SpriteRect {
  return rect(Math.min(frame, 10) * T, T);
}

/**
 * `mini.png` (120x560): 6 columns x 28 rows of 20px preview tiles whose row
 * index is the legacy tile id. Thingie rows carry one column per world.
 */
export const MINI_PX = 20;
export function miniRect(id: number, world: number): SpriteRect | null {
  if (id < 0 || id > 27) return null;
  const col = isThingie(id) ? Math.max(0, Math.min(5, world - 1)) : 0;
  return rect(col * MINI_PX, id * MINI_PX, MINI_PX, MINI_PX);
}

/** `checkandstar.png` (2304x80): 36 frames of 64x40, a check mark on row 0 and a spinning star on row 1. */
export const CHECK_FRAMES = 36;
export function checkFrame(frame: number): SpriteRect {
  return rect((frame % CHECK_FRAMES) * 64, 0, 64, 40);
}
export function starFrame(frame: number): SpriteRect {
  return rect((frame % CHECK_FRAMES) * 64, 40, 64, 40);
}

/** Letter strips: `complete.png` 8x60x60, `defeat.png` 6x60x60, `pause.png` 5x80x80. */
export function letterRect(index: number, size: number): SpriteRect {
  return rect(0, index * size, size, size);
}
