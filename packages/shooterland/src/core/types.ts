/** Grid position: `col` is x (0 = left), `row` is y (0 = top). */
export interface GridPos {
  readonly col: number;
  readonly row: number;
}

export type Dir = 'up' | 'down' | 'left' | 'right';

/**
 * Tile ids. The ones that appear in the legacy `.sll` files keep their exact
 * numbers so levels round-trip. Ids 0 and 12..15 never appear in level files;
 * they are assigned here to the runtime-only items in the order of the store
 * sheet (`items.png`: weights 1-3, blank weight) and the tile sheet's bomb row,
 * which is an inference (docs/GAPS.md G6/G8).
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
  /** A weight that has already pushed and crushed, left on the board. */
  SpentWeight: 15,
  /** Ramps: quarter-curves named by their two open edges. */
  RampTopLeft: 16,
  RampTopRight: 17,
  RampBottomLeft: 18,
  RampBottomRight: 19,
  GreyBlock: 20,
  BrownBlock: 21,
  /** GAP:G10 - most likely the land mine. */
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

/** Store items, as the tile id they load into a shooter. */
export type ItemKind =
  | typeof TileId.Weight1
  | typeof TileId.Weight2
  | typeof TileId.Weight3
  | typeof TileId.RampTopLeft
  | typeof TileId.RampTopRight
  | typeof TileId.RampBottomLeft
  | typeof TileId.RampBottomRight;
