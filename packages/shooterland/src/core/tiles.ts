import { type Dir, type EnemyKind, TileId } from './types';

export function isEmpty(id: number): boolean {
  return id === TileId.Empty;
}

export function isThingie(id: number): boolean {
  return id >= TileId.Thingie1 && id <= TileId.Thingie6;
}

export function isEnemy(id: number): boolean {
  return id >= TileId.Crony && id <= TileId.Skully;
}

export function isWeight(id: number): boolean {
  return id >= TileId.Weight1 && id <= TileId.Weight3;
}

export function weightSize(id: number): number {
  return id - TileId.Weight1 + 1;
}

export function isRamp(id: number): boolean {
  return id >= TileId.RampTopLeft && id <= TileId.RampBottomRight;
}

export function isEnemyBlock(id: number): boolean {
  return id >= TileId.CronyBlock && id <= TileId.SkullyBlock;
}

/** Anything that occupies a cell and is neither a thingie nor an enemy. */
export function isObstacle(id: number): boolean {
  return (
    id === TileId.GreyBlock ||
    id === TileId.BrownBlock ||
    id === TileId.SpentWeight ||
    id === TileId.Mine ||
    isRamp(id) ||
    isEnemyBlock(id)
  );
}

const ENEMY_BY_ID: Record<number, EnemyKind> = {
  [TileId.Crony]: 'crony',
  [TileId.Crazy]: 'crazy',
  [TileId.Fatty]: 'fatty',
  [TileId.Fangie]: 'fangie',
  [TileId.Skully]: 'skully',
};
const ENEMY_BLOCK_BY_ID: Record<number, EnemyKind> = {
  [TileId.CronyBlock]: 'crony',
  [TileId.CrazyBlock]: 'crazy',
  [TileId.FattyBlock]: 'fatty',
  [TileId.FangieBlock]: 'fangie',
  [TileId.SkullyBlock]: 'skully',
};

export function enemyKind(id: number): EnemyKind | undefined {
  return ENEMY_BY_ID[id];
}

export function enemyBlockKind(id: number): EnemyKind | undefined {
  return ENEMY_BLOCK_BY_ID[id];
}

export type VEdge = 'top' | 'bottom';
export type HEdge = 'left' | 'right';

export interface RampShape {
  readonly v: VEdge;
  readonly h: HEdge;
}

/**
 * The two open (curved-face) edges of each ramp, read off the sprites and
 * confirmed by the geometry of levels 1-16 and 1-18. A shot entering through
 * an open edge leaves through the other; the two flat edges block.
 */
export const RAMP_SHAPES: Readonly<Record<number, RampShape>> = {
  [TileId.RampTopLeft]: { v: 'top', h: 'left' },
  [TileId.RampTopRight]: { v: 'top', h: 'right' },
  [TileId.RampBottomLeft]: { v: 'bottom', h: 'left' },
  [TileId.RampBottomRight]: { v: 'bottom', h: 'right' },
};

/** The edge a projectile moving in `dir` crosses when it enters a cell. */
export function entryEdge(dir: Dir): VEdge | HEdge {
  switch (dir) {
    case 'up':
      return 'bottom';
    case 'down':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
}

/** The direction of travel when leaving a cell through `edge`. */
export function exitDir(edge: VEdge | HEdge): Dir {
  switch (edge) {
    case 'top':
      return 'up';
    case 'bottom':
      return 'down';
    case 'left':
      return 'left';
    case 'right':
      return 'right';
  }
}

/**
 * Where a shot moving in `dir` goes after entering ramp `rampId`, or null if it
 * hit a flat side.
 */
export function deflect(rampId: number, dir: Dir): Dir | null {
  const shape = RAMP_SHAPES[rampId];
  if (!shape) return null;
  const edge = entryEdge(dir);
  if (edge === shape.v) return exitDir(shape.h);
  if (edge === shape.h) return exitDir(shape.v);
  return null;
}

export const DIR_DELTA: Readonly<Record<Dir, GridDelta>> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

export interface GridDelta {
  readonly dc: number;
  readonly dr: number;
}
