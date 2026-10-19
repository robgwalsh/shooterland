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
 * World gating (tutorials 1-25 and 2-25): the previous world's last level
 * must be cleared and the player needs `starThresholds[world]` stars.
 * Thresholds beyond world 2 are unverified (docs/GAPS.md G9).
 */
export function isWorldUnlocked(
  save: SaveData,
  levels: readonly LevelData[],
  starThresholds: readonly number[],
  world: number,
): boolean {
  if (!worldExists(levels, world)) return false;
  if (world === 1) return true;
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
  return level === 1 || isCleared(save, world, level - 1);
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
  winPercent: number | null;
  averageComboSize: number | null;
  shotsPerCombo: number | null;
  /** GAP:G13 - the original's "SL Rating" formula is unknown; this is a placeholder blend. */
  slRating: number | null;
  completePercent: number;
  stars: number;
}

export function computeStats(save: SaveData, levels: readonly LevelData[]): SaveStats {
  const games = save.wins + save.losses;
  const winPercent = games > 0 ? (100 * save.wins) / games : null;
  const averageComboSize = save.combos > 0 ? save.comboPieces / save.combos : null;
  const shotsPerCombo = save.combos > 0 ? save.shots / save.combos : null;
  const playable = playableLevels(levels);
  const cleared = playable.filter((l) => isCleared(save, l.world, l.level)).length;
  const slRating =
    winPercent !== null && averageComboSize !== null && shotsPerCombo !== null
      ? (winPercent / 10) * (averageComboSize / shotsPerCombo)
      : null;
  return {
    winPercent,
    averageComboSize,
    shotsPerCombo,
    slRating,
    completePercent: playable.length > 0 ? Math.floor((100 * cleared) / playable.length) : 0,
    stars: countStars(save, levels),
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
  };
}
