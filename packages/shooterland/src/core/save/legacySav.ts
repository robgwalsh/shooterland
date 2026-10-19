import { newSave, type SaveData, TOTAL_LEVEL_SLOTS } from './SaveData';

/**
 * Parses an original `Save/FileN.sav` (185 integers, one per line, as the
 * exe's loader reads them): the new-game flag, the current level, the current
 * world, 175 best times, an unused slot, then wins, losses, shots, combos,
 * combo pieces and seconds played. The star count is not stored; it is
 * recounted from the best times. See docs/FORMATS.md.
 */
export function parseLegacySave(text: string): SaveData {
  const nums = text
    .trim()
    .split(/\s+/)
    .map((t) => Number.parseInt(t, 10));
  if (nums.length < 4 + TOTAL_LEVEL_SLOTS + 6 || nums.some((n) => Number.isNaN(n))) {
    throw new Error(`not a legacy save file (${nums.length} values)`);
  }
  const save = newSave();
  save.level = Math.max(1, nums[1] ?? 1);
  save.world = Math.max(1, nums[2] ?? 1);
  for (let i = 0; i < TOTAL_LEVEL_SLOTS; i++) save.bestTimes[i] = Math.max(0, nums[3 + i] ?? 0);
  const tail = 4 + TOTAL_LEVEL_SLOTS;
  save.wins = nums[tail] ?? 0;
  save.losses = nums[tail + 1] ?? 0;
  save.shots = nums[tail + 2] ?? 0;
  save.combos = nums[tail + 3] ?? 0;
  save.comboPieces = nums[tail + 4] ?? 0;
  save.secondsPlayed = nums[tail + 5] ?? 0;
  return save;
}
