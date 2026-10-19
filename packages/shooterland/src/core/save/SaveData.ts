import { LEVELS_PER_WORLD, type LevelData, levelIndex, NUM_WORLDS } from '../level/LevelData';

export const SAVE_VERSION = 1;
export const TOTAL_LEVEL_SLOTS = NUM_WORLDS * LEVELS_PER_WORLD; // 175, as in the original .sav

/** One save file. Mirrors the original's 185-line .sav (docs/FORMATS.md). */
export interface SaveData {
  version: typeof SAVE_VERSION;
  /** Level last selected on the world map. */
  world: number;
  level: number;
  /** Best time in seconds per level slot, 0 = never cleared. */
  bestTimes: number[];
  wins: number;
  losses: number;
  shots: number;
  combos: number;
  comboPieces: number;
  secondsPlayed: number;
  /** Set by the unlock-everything cheat: every existing level is playable. */
  allUnlocked: boolean;
}

export type SlotNumber = 1 | 2 | 3;

export function newSave(): SaveData {
  return {
    version: SAVE_VERSION,
    world: 1,
    level: 1,
    bestTimes: new Array<number>(TOTAL_LEVEL_SLOTS).fill(0),
    wins: 0,
    losses: 0,
    shots: 0,
    combos: 0,
    comboPieces: 0,
    secondsPlayed: 0,
    allUnlocked: false,
  };
}

export function isNewGame(save: SaveData): boolean {
  return save.wins === 0 && save.losses === 0 && save.bestTimes.every((t) => t === 0);
}

export function bestTime(save: SaveData, world: number, level: number): number {
  return save.bestTimes[levelIndex(world, level)] ?? 0;
}

export function isCleared(save: SaveData, world: number, level: number): boolean {
  return bestTime(save, world, level) > 0;
}

export function hasStar(save: SaveData, level: LevelData): boolean {
  const t = bestTime(save, level.world, level.level);
  return t > 0 && t <= level.timeToBeat;
}

export function countStars(save: SaveData, levels: readonly LevelData[]): number {
  let n = 0;
  for (const l of levels) if (hasStar(save, l)) n++;
  return n;
}

/** Levels that actually exist in the data (the beta's placeholders are excluded). */
export function playableLevels(levels: readonly LevelData[]): LevelData[] {
  return levels.filter((l) => !l.placeholder);
}

export function lastLevelOfWorld(levels: readonly LevelData[], world: number): number {
  let last = 0;
  for (const l of levels) if (l.world === world && !l.placeholder && l.level > last) last = l.level;
  return last;
}

export function worldExists(levels: readonly LevelData[], world: number): boolean {
  return lastLevelOfWorld(levels, world) > 0;
}

/**
 * World gating (`FUN_0040609e`): the previous world's last level must be
 * cleared and the player needs `starThresholds[world]` stars (10, 30, 50, 75,
 * 100, 150 for worlds 2 to 7). The exe only checks this when a level is won;
 * here it is evaluated live, which opens a world as soon as both hold.
 */
export function isWorldUnlocked(
  save: SaveData,
  levels: readonly LevelData[],
  starThresholds: readonly number[],
  world: number,
): boolean {
  if (!worldExists(levels, world)) return false;
  if (world === 1 || save.allUnlocked) return true;
  const prevLast = lastLevelOfWorld(levels, world - 1);
  if (prevLast === 0 || !isCleared(save, world - 1, prevLast)) return false;
  return countStars(save, levels) >= (starThresholds[world] ?? Number.POSITIVE_INFINITY);
}

/** A level is playable once the level before it is cleared (and its world is unlocked). */
export function isLevelUnlocked(
  save: SaveData,
  levels: readonly LevelData[],
  starThresholds: readonly number[],
  world: number,
  level: number,
): boolean {
  if (!isWorldUnlocked(save, levels, starThresholds, world)) return false;
  if (level > lastLevelOfWorld(levels, world)) return false;
  return level === 1 || save.allUnlocked || isCleared(save, world, level - 1);
}

/** Stars still needed to open the next world, or null when everything is open. */
export function starsForNextWorld(
  save: SaveData,
  levels: readonly LevelData[],
  starThresholds: readonly number[],
): { world: number; needed: number } | null {
  for (let w = 2; w <= NUM_WORLDS; w++) {
    if (!worldExists(levels, w)) break;
    if (!isWorldUnlocked(save, levels, starThresholds, w)) {
      return { world: w, needed: starThresholds[w] ?? 0 };
    }
  }
  return null;
}

export interface SaveStats {
  /** Whole percent, as the exe truncates it. */
  winPercent: number | null;
  averageComboSize: number | null;
  shotsPerCombo: number | null;
  slRating: number | null;
  completePercent: number;
  stars: number;
}

/** Levels the file has reached: 25 per completed world plus the current level (`(world-1)*25 + level`). */
export function levelsReached(save: SaveData): number {
  return (save.world - 1) * LEVELS_PER_WORLD + save.level;
}

const clamp = (v: number): number => Math.max(0, Math.min(2.375, v));

/**
 * The stats screen's numbers, with the exe's formulas (`FUN_0040ad69`,
 * `FUN_0040521c`; docs/RULES.md "Winning, stars, worlds").
 */
export function computeStats(save: SaveData, levels: readonly LevelData[]): SaveStats {
  const games = save.wins + save.losses;
  const winPercent = games > 0 ? Math.floor((100 * save.wins) / games) : null;
  const averageComboSize = save.combos > 0 ? save.comboPieces / save.combos : null;
  const shotsPerCombo = save.combos > 0 ? save.shots / save.combos : null;
  const stars = countStars(save, levels);
  const reached = levelsReached(save);
  let slRating: number | null = null;
  if (
    winPercent !== null &&
    averageComboSize !== null &&
    shotsPerCombo !== null &&
    save.shots > 0
  ) {
    const a = clamp((winPercent - 30) * 0.04);
    const b = clamp((save.combos / save.shots - 0.3) * 5.9375);
    const c = clamp((averageComboSize - 3) * 11.875);
    const d = clamp((stars / Math.min(150, reached)) * 2.375);
    slRating = ((a + b + c + d) / 6) * 100;
  }
  return {
    winPercent,
    averageComboSize,
    shotsPerCombo,
    slRating,
    completePercent: Math.floor(((stars + 2 * (reached - 1)) * 100 + 6) / 456),
    stars,
  };
}

/** Records a finished level into the save. */
export function recordResult(
  save: SaveData,
  level: LevelData,
  outcome: 'won' | 'lost',
  stats: { seconds: number; shots: number; combos: number; comboPieces: number },
): void {
  save.shots += stats.shots;
  save.combos += stats.combos;
  save.comboPieces += stats.comboPieces;
  save.secondsPlayed += Math.floor(stats.seconds);
  if (outcome === 'won') {
    save.wins++;
    const i = levelIndex(level.world, level.level);
    // The exe stores whole seconds and treats 0 as "never cleared", so a sub-second win counts as 1.
    const secs = Math.max(1, Math.floor(stats.seconds));
    const prev = save.bestTimes[i] ?? 0;
    if (prev === 0 || secs < prev) save.bestTimes[i] = secs;
  } else {
    save.losses++;
  }
}

/** Validates data read from storage; returns null when it is not a usable save. */
export function coerceSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== SAVE_VERSION || !Array.isArray(r.bestTimes)) return null;
  const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const bestTimes = new Array<number>(TOTAL_LEVEL_SLOTS).fill(0);
  r.bestTimes.forEach((v, i) => {
    if (i < TOTAL_LEVEL_SLOTS) bestTimes[i] = Math.max(0, Math.floor(num(v)));
  });
  return {
    version: SAVE_VERSION,
    world: Math.max(1, Math.floor(num(r.world, 1))),
    level: Math.max(1, Math.floor(num(r.level, 1))),
    bestTimes,
    wins: num(r.wins),
    losses: num(r.losses),
    shots: num(r.shots),
    combos: num(r.combos),
    comboPieces: num(r.comboPieces),
    secondsPlayed: num(r.secondsPlayed),
    allUnlocked: r.allUnlocked === true,
  };
}
