import type { EnemyKind } from './types';
import { TileId } from './types';

/**
 * How each enemy can be killed (the pause-screen chart). `comboMin` is the
 * smallest adjacent combo that kills it (null = never); `mine` is informational,
 * since anything pushed into a mine is destroyed.
 */
export interface EnemyRule {
  readonly comboMin: number | null;
  readonly bomb: boolean;
  readonly weight: boolean;
  readonly mine: boolean;
}

/**
 * Every gameplay constant. All values were read from the disassembled exe
 * (docs/RULES.md, docs/GAPS.md); the fields exist so a consumer can still
 * tune them.
 */
export interface Rules {
  /** Cells a shot advances per 60 Hz tick (the exe moves one cell per frame). */
  readonly projectileCellsPerTick: number;
  /** Whether a new volley may be fired while shots are in flight (the exe: no). */
  readonly fireWhileInFlight: boolean;
  /** Smallest group that clears, and the larger minimum the exe uses in world 7. */
  readonly comboMin: number;
  readonly comboMinFinalWorld: number;
  /** Kill table per enemy. */
  readonly enemies: Readonly<Record<EnemyKind, EnemyRule>>;
  /** Number of thingie kinds in rotation (the tile sheets have six). */
  readonly thingieKinds: number;
  /** Chance that a lane's next item is a bowling bomb (`rand() % 20 == 0`). */
  readonly bombChance: number;
  /** Store prices by item id; thingie copies and bombs included. */
  readonly prices: Readonly<Record<number, number>>;
  /** Money at the start of a level (the exe resets it to 0). */
  readonly startingMoney: number;
  /** Ticks a destroyed tile stays on the board, passable, before it is removed (11 frames of 56 ms). */
  readonly destroyTicks: number;
  /**
   * Opening the store inserts a blank slot in front of every lane and a
   * purchase only fills one, so the other lanes fire nothing on the next
   * volley. True reproduces the exe (docs/GAPS.md G27); false removes the
   * blanks from the other lanes when something is bought.
   */
  readonly storeBlanksOtherLanes: boolean;
  /** Rosco's period never drops below this after a speed-up. */
  readonly roscoMinPeriodMs: number;
  /** Stars needed to enter each world (index = world number). */
  readonly starThresholds: readonly number[];
}

export const DEFAULT_RULES: Rules = {
  projectileCellsPerTick: 1,
  fireWhileInFlight: false,
  comboMin: 3,
  comboMinFinalWorld: 4,
  enemies: {
    crony: { comboMin: 3, bomb: true, weight: true, mine: true },
    crazy: { comboMin: null, bomb: true, weight: true, mine: true },
    fatty: { comboMin: 4, bomb: false, weight: true, mine: true },
    fangie: { comboMin: 4, bomb: false, weight: false, mine: true },
    skully: { comboMin: null, bomb: false, weight: false, mine: true },
  },
  thingieKinds: 6,
  bombChance: 1 / 20,
  prices: {
    [TileId.Weight1]: 2,
    [TileId.Weight2]: 3,
    [TileId.Weight3]: 4,
    [TileId.Bomb]: 3,
    [TileId.RampTopLeft]: 2,
    [TileId.RampTopRight]: 2,
    [TileId.RampBottomLeft]: 2,
    [TileId.RampBottomRight]: 2,
    [TileId.Thingie1]: 3,
    [TileId.Thingie2]: 3,
    [TileId.Thingie3]: 3,
    [TileId.Thingie4]: 3,
    [TileId.Thingie5]: 3,
    [TileId.Thingie6]: 3,
  },
  startingMoney: 0,
  destroyTicks: 37,
  storeBlanksOtherLanes: true,
  roscoMinPeriodMs: 1000,
  starThresholds: [0, 0, 10, 30, 50, 75, 100, 150],
};
