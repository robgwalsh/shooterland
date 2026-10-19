import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { LevelData } from '../../src/core/level/LevelData';
import { levelIndex } from '../../src/core/level/LevelData';
import { DEFAULT_RULES } from '../../src/core/rules';
import { parseLegacySave } from '../../src/core/save/legacySav';
import {
  coerceSave,
  computeStats,
  countStars,
  isLevelUnlocked,
  isWorldUnlocked,
  newSave,
  recordResult,
  starsForNextWorld,
} from '../../src/core/save/SaveData';
import { SaveService } from '../../src/core/save/SaveService';
import { memorySaveStorage } from '../../src/core/save/SaveStorage';

const LEGACY = join(__dirname, '../../../../legacy');
const levels: LevelData[] = JSON.parse(
  readFileSync(join(__dirname, '../../assets/levels/levels.json'), 'utf8'),
) as LevelData[];
const thresholds = DEFAULT_RULES.starThresholds;

describe('legacy .sav import', () => {
  it('reads File3: worlds 1 and 2 cleared, 138 wins', () => {
    const save = parseLegacySave(readFileSync(join(LEGACY, 'Save/File3.sav'), 'latin1'));
    expect(save.world).toBe(2);
    expect(save.level).toBe(4);
    expect(save.wins).toBe(138);
    expect(save.losses).toBe(55);
    expect(save.shots).toBe(5290);
    expect(save.combos).toBe(2737);
    expect(save.comboPieces).toBe(8732);
    expect(save.secondsPlayed).toBe(15525);
    expect(save.bestTimes[levelIndex(1, 1)]).toBeGreaterThan(0);
    expect(save.bestTimes[levelIndex(2, 19)]).toBeGreaterThan(0);
    expect(save.bestTimes[levelIndex(2, 20)]).toBe(0);
    const stats = computeStats(save, levels);
    expect(stats.averageComboSize).toBeCloseTo(3.19, 1);
    expect(stats.shotsPerCombo).toBeCloseTo(1.93, 1);
  });
});

describe('progression', () => {
  it('starts with only 1-1 unlocked', () => {
    const save = newSave();
    expect(isLevelUnlocked(save, levels, thresholds, 1, 1)).toBe(true);
    expect(isLevelUnlocked(save, levels, thresholds, 1, 2)).toBe(false);
    expect(isWorldUnlocked(save, levels, thresholds, 2)).toBe(false);
    expect(starsForNextWorld(save, levels, thresholds)).toEqual({ world: 2, needed: 10 });
  });

  it('unlocks the next level on a win and the next world with enough stars', () => {
    const save = newSave();
    const l11 = levels.find((l) => l.id === '1-1');
    if (!l11) throw new Error('missing 1-1');
    recordResult(save, l11, 'won', { seconds: 9, shots: 5, combos: 2, comboPieces: 6 });
    expect(isLevelUnlocked(save, levels, thresholds, 1, 2)).toBe(true);
    expect(countStars(save, levels)).toBe(1);
    // Clear all of world 1 within the time to beat: 25 stars opens world 2.
    for (const l of levels.filter((l) => l.world === 1)) {
      recordResult(save, l, 'won', { seconds: 1, shots: 1, combos: 1, comboPieces: 3 });
    }
    expect(isWorldUnlocked(save, levels, thresholds, 2)).toBe(true);
    expect(isWorldUnlocked(save, levels, thresholds, 3)).toBe(false);
    expect(save.wins).toBe(26);
    expect(save.bestTimes[levelIndex(1, 1)]).toBe(1); // better time replaces the old one
  });

  it('never unlocks the beta placeholders', () => {
    const save = newSave();
    for (const l of levels) {
      recordResult(save, l, 'won', { seconds: 1, shots: 1, combos: 1, comboPieces: 3 });
    }
    expect(isLevelUnlocked(save, levels, thresholds, 6, 13)).toBe(true);
    expect(isLevelUnlocked(save, levels, thresholds, 6, 14)).toBe(false);
    expect(isWorldUnlocked(save, levels, thresholds, 7)).toBe(false);
    expect(starsForNextWorld(save, levels, thresholds)).toBeNull();
  });

  it('coerces stored JSON defensively', () => {
    expect(coerceSave(null)).toBeNull();
    expect(coerceSave({ version: 99 })).toBeNull();
    const s = coerceSave({ version: 1, bestTimes: [5, 'x', -2], wins: 3 });
    expect(s?.bestTimes.slice(0, 3)).toEqual([5, 0, 0]);
    expect(s?.wins).toBe(3);
    expect(s?.losses).toBe(0);
  });
});

describe('SaveService', () => {
  it('round-trips through storage and reports progress', async () => {
    const storage = memorySaveStorage();
    const svc = new SaveService(storage, levels, thresholds);
    await svc.select(2);
    const l11 = levels.find((l) => l.id === '1-1');
    if (!l11) throw new Error('missing 1-1');
    await svc.finishLevel(l11, 'won', { seconds: 12, shots: 3, combos: 1, comboPieces: 3 });
    const again = new SaveService(storage, levels, thresholds);
    const peek = await again.peekAll();
    expect(peek[0]).toBeNull();
    expect(peek[1]?.wins).toBe(1);
    await again.select(2);
    expect(again.levelUnlocked(1, 2)).toBe(true);
    expect(again.stars()).toBe(1);
    await again.remove(2);
    expect((await again.peekAll())[1]).toBeNull();
  });
});
