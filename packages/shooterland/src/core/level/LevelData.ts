/**
 * One level as parsed from a legacy `.sll` file. Field meanings were read
 * from the exe's loader and Rosco routine (docs/FORMATS.md).
 */
export interface LevelData {
  /** "world-level", e.g. "1-12". */
  readonly id: string;
  readonly world: number;
  readonly level: number;
  /** Line 1: size of Mary's (bottom) bar, 1..3. */
  readonly bottomShooterSize: number;
  /** Line 2: size of Poindexter's (right) bar, 1..3. */
  readonly rightShooterSize: number;
  /** Line 3: delay before Rosco first leaves his stump, in ms. */
  readonly lairDelayMs: number;
  /** Line 4: Rosco's round trip (stump to piggy bank and back), in ms. */
  readonly roscoPeriodMs: number;
  /** Line 5: dollars Rosco takes per visit (1 or 2). */
  readonly roscoStealAmount: number;
  /** Lines 6-174: 13x13 legacy tile ids, row-major, top row first; -1 = empty. */
  readonly cells: readonly number[];
  /** Line 175: each speed-up multiplies the period by this percentage (70..98). */
  readonly roscoSpeedUpPercent: number;
  /** Line 176: ms between speed-ups, shown as the countdown. */
  readonly roscoSpeedUpIntervalMs: number;
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
