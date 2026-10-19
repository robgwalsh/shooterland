/** Grid position: `col` is x (0 = left), `row` is y (0 = top). */
export interface GridPos {
  readonly col: number;
  readonly row: number;
}

export type Dir = 'up' | 'down' | 'left' | 'right';

/**
 * Tile ids, exactly as the original uses them (docs/FORMATS.md). Ids 0 and
 * 12..15 never appear in level files: 0 is a landed bowling bomb during its
 * blast, 12..14 are the three weights the store sells and 15 is an unsold
 * strength-998 weight (docs/GAPS.md G24).
 */
export const TileId = {
  Empty: -1,
  Bomb: 0,
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
  Weight1: 12,
  Weight2: 13,
  Weight3: 14,
  /** The fourth weight in `items.png`: strength 998, never sold or placed by the original. */
  HeavyWeight: 15,
  /** Ramps: quarter-curves named by their two open edges. */
  RampTopLeft: 16,
  RampTopRight: 17,
  RampBottomLeft: 18,
  RampBottomRight: 19,
  GreyBlock: 20,
  BrownBlock: 21,
  Mine: 22,
  CronyBlock: 23,
  CrazyBlock: 24,
  FattyBlock: 25,
  FangieBlock: 26,
  SkullyBlock: 27,
} as const;
export type TileId = (typeof TileId)[keyof typeof TileId];

export type EnemyKind = 'crony' | 'crazy' | 'fatty' | 'fangie' | 'skully';
export const ENEMY_KINDS: readonly EnemyKind[] = ['crony', 'crazy', 'fatty', 'fangie', 'skully'];

export type ShooterSide = 'bottom' | 'right';

/**
 * Anything the store can load into a lane: a bomb, a copy of a thingy on the
 * board, a weight or a ramp (docs/RULES.md "Store").
 */
export type ItemKind =
  | typeof TileId.Bomb
  | typeof TileId.Thingie1
  | typeof TileId.Thingie2
  | typeof TileId.Thingie3
  | typeof TileId.Thingie4
  | typeof TileId.Thingie5
  | typeof TileId.Thingie6
  | typeof TileId.Weight1
  | typeof TileId.Weight2
  | typeof TileId.Weight3
  | typeof TileId.RampTopLeft
  | typeof TileId.RampTopRight
  | typeof TileId.RampBottomLeft
  | typeof TileId.RampBottomRight;
