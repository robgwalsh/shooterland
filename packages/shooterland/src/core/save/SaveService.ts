import type { LevelData } from '../level/LevelData';
import {
  countStars,
  isLevelUnlocked,
  isWorldUnlocked,
  newSave,
  recordResult,
  type SaveData,
  type SlotNumber,
} from './SaveData';
import type { SaveStorage } from './SaveStorage';

/** The active save slot, loaded once and written through on every change. */
export class SaveService {
  slot: SlotNumber = 1;
  data: SaveData = newSave();
  private readonly cache = new Map<SlotNumber, SaveData | null>();

  constructor(
    private readonly storage: SaveStorage,
    readonly levels: readonly LevelData[],
    private readonly starThresholds: readonly number[],
    private readonly onSaved?: (slot: SlotNumber) => void,
  ) {}

  /** Reads all three slots (for the file menu). Missing slots are null. */
  async peekAll(): Promise<(SaveData | null)[]> {
    const out: (SaveData | null)[] = [];
    for (const slot of [1, 2, 3] as const) {
      const d = await this.storage.load(slot);
      this.cache.set(slot, d);
      out.push(d);
    }
    return out;
  }

  peek(slot: SlotNumber): SaveData | null | undefined {
    return this.cache.get(slot);
  }

  async select(slot: SlotNumber): Promise<SaveData> {
    this.slot = slot;
    this.data = (await this.storage.load(slot)) ?? newSave();
    this.cache.set(slot, this.data);
    return this.data;
  }

  async remove(slot: SlotNumber): Promise<void> {
    await this.storage.remove(slot);
    this.cache.set(slot, null);
    if (slot === this.slot) this.data = newSave();
  }

  async commit(): Promise<void> {
    await this.storage.save(this.slot, this.data);
    this.cache.set(this.slot, this.data);
    this.onSaved?.(this.slot);
  }

  stars(): number {
    return countStars(this.data, this.levels);
  }

  worldUnlocked(world: number): boolean {
    return isWorldUnlocked(this.data, this.levels, this.starThresholds, world);
  }

  levelUnlocked(world: number, level: number): boolean {
    return isLevelUnlocked(this.data, this.levels, this.starThresholds, world, level);
  }

  /** Records a finished level and persists. */
  async finishLevel(
    level: LevelData,
    outcome: 'won' | 'lost',
    stats: { seconds: number; shots: number; combos: number; comboPieces: number },
  ): Promise<void> {
    recordResult(this.data, level, outcome, stats);
    await this.commit();
  }

  async setPosition(world: number, level: number): Promise<void> {
    if (this.data.world === world && this.data.level === level) return;
    this.data.world = world;
    this.data.level = level;
    await this.commit();
  }
}
