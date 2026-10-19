import type { EnemyKind } from './types';
import { TileId } from './types';

/**
 * How each enemy can be killed. `comboMin` is the smallest combo that kills it
 * when adjacent (null = combos never kill it).
 */
export interface EnemyRule {
  readonly comboMin: number | null;
  readonly bomb: boolean;
  readonly weight: boolean;
  readonly mine: boolean;
}

/**
 * Every tunable gameplay constant. Values whose original behaviour is not
 * verified carry the gap id from docs/GAPS.md; change them there first.
 */
export interface Rules {
  /** GAP:G2 - projectile speed in cells per second. */
  readonly projectileCellsPerSecond: number;
  /** GAP:G2 - whether a new volley may be fired while shots are in flight. */
  readonly fireWhileInFlight: boolean;
  /** Money for a 3-combo (tutorial 1-2). */
  readonly comboBaseMoney: number;
  /** Money per thingie beyond three (tutorial 1-2). */
  readonly comboExtraMoney: number;
  /** GAP:G3 - which cells next to a cleared combo count as "adjoining" an enemy. */
  readonly enemyAdjacency: 4 | 8;
  /** GAP:G4 - kill rules per enemy; crony/crazy/fatty from tutorials, the rest guessed. */
  readonly enemies: Readonly<Record<EnemyKind, EnemyRule>>;
  /** Number of thingie kinds in rotation (the tile sheets have six). */
  readonly thingieKinds: number;
  /**
   * GAP:G12/G15 - chance that a loaded shot is a bowling bomb. When
   * `bombChanceFromLevel` is set, the level's footer percent is read as the
   * thingie chance (so 80 means 20% bombs); otherwise `bombChance` applies.
   */
  readonly bombChanceFromLevel: boolean;
  readonly bombChance: number;
  /** GAP:G5 - store prices. */
  readonly prices: Readonly<Record<number, number>>;
  /** GAP:G5 - money at the start of a level. */
  readonly startingMoney: number;
  /** GAP:G14 - Rosco's walk between stump and piggy bank, in seconds, before any speed-up. */
  readonly roscoTripSeconds: number;
  /** GAP:G14 - multiplier applied to Rosco's speed each time the lair countdown ends. */
  readonly roscoSpeedUpFactor: number;
  /** Survival levels (no enemies) are won after the level's time-to-beat (exe string). */
  readonly survivalLevels: boolean;
}

export const DEFAULT_RULES: Rules = {
  projectileCellsPerSecond: 35,
  fireWhileInFlight: false,
  comboBaseMoney: 1,
  comboExtraMoney: 1,
  enemyAdjacency: 8,
  enemies: {
    crony: { comboMin: 3, bomb: true, weight: true, mine: true },
    crazy: { comboMin: null, bomb: true, weight: true, mine: true },
    fatty: { comboMin: 4, bomb: false, weight: true, mine: true },
    fangie: { comboMin: null, bomb: true, weight: true, mine: true },
    skully: { comboMin: null, bomb: false, weight: true, mine: true },
  },
  thingieKinds: 6,
  bombChanceFromLevel: true,
  bombChance: 0.2,
  prices: {
    [TileId.Weight1]: 2,
    [TileId.Weight2]: 3,
    [TileId.Weight3]: 4,
    [TileId.RampTopLeft]: 2,
    [TileId.RampTopRight]: 2,
    [TileId.RampBottomLeft]: 2,
    [TileId.RampBottomRight]: 2,
  },
  startingMoney: 0,
  roscoTripSeconds: 5,
  roscoSpeedUpFactor: 1.25,
  survivalLevels: true,
};
