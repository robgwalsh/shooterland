/** Grid position: `col` is x (0 = left), `row` is y (0 = top). */
export interface GridPos {
  readonly col: number;
  readonly row: number;
}

export type Dir = 'up' | 'down' | 'left' | 'right';

/**
 * Legacy tile ids exactly as they appear in the .sll files.
 * Kept numerically identical to the original files so levels round-trip.
 * Ids 0 and 12..15 never appear in any level file (see docs/GAPS.md G8/G10).
 */
export const TileId = {
  Empty: -1,
  Thingie1: 1,
  Thingie2: 2,
  Thingie3: 3,
  Thingie4: 4,
  Thingie5: 5,
  Thingie6: 6,
  Crony: 7,
  Crazy: 8,
  Fatty: 9,
  Fangie: 10,
  Skully: 11,
  Ramp16: 16,
  Ramp17: 17,
  Ramp18: 18,
  Ramp19: 19,
  GreyBlock: 20,
  BrownBlock: 21,
  /** GAP:G10 - probably the land mine. */
  Unknown22: 22,
  CronyBlock: 23,
  CrazyBlock: 24,
  FattyBlock: 25,
  FangieBlock: 26,
  SkullyBlock: 27,
} as const;
export type TileId = (typeof TileId)[keyof typeof TileId];

export type EnemyKind = 'crony' | 'crazy' | 'fatty' | 'fangie' | 'skully';
export const ENEMY_KINDS: readonly EnemyKind[] = ['crony', 'crazy', 'fatty', 'fangie', 'skully'];

export type ItemKind =
  | 'weight1'
  | 'weight2'
  | 'weight3'
  | 'ramp16'
  | 'ramp17'
  | 'ramp18'
  | 'ramp19';
