/**
 * One level as parsed from a legacy `.sll` file (see docs/FORMATS.md).
 * Field names for the header/footer values whose meaning is unverified carry
 * the gap id from docs/GAPS.md.
 */
export interface LevelData {
  /** "world-level", e.g. "1-12". */
  readonly id: string;
  readonly world: number;
  readonly level: number;
  /** Line 1: size of Mary's (bottom) shooter, 1..3. */
  readonly bottomShooterSize: number;
  /** Line 2: size of Poindexter's (right) shooter, 1..3. */
  readonly rightShooterSize: number;
  /** Line 3: delay before Rosco first leaves his lair, in ms (medium confidence). */
  readonly lairDelayMs: number;
  /** Line 4: interval of the lair countdown that speeds Rosco up, in ms (medium confidence). */
  readonly speedUpIntervalMs: number;
  /** Line 5: 1 or 2, meaning unknown (GAP:G11). */
  readonly unknownFlag: number;
  /** Lines 6-174: 13x13 legacy tile ids, row-major, top row first; -1 = empty. */
  readonly cells: readonly number[];
  /** Line 175: 70..98, mostly 80, meaning unknown (GAP:G12). */
  readonly unknownPercent: number;
  /** Line 176: 10000..70000, probably ms, meaning unknown (GAP:G12). */
  readonly unknownMs: number;
  /** Line 177 decoded: spaces and newlines restored, trailing END removed; "" for placeholders. */
  readonly message: string;
  /** Seconds to beat for the star, from times.dat. */
  readonly timeToBeat: number;
  /** True for the unfinished beta content (world 6 levels 14-25 and world 7). */
  readonly placeholder: boolean;
}

export const LEVELS_PER_WORLD = 25;
export const NUM_WORLDS = 7;

export function levelIndex(world: number, level: number): number {
  return (world - 1) * LEVELS_PER_WORLD + (level - 1);
}
