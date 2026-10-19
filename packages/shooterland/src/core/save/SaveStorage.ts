import { coerceSave, type SaveData, type SlotNumber } from './SaveData';

/** Where the three save files live. Implement this to persist elsewhere (a server, a file). */
export interface SaveStorage {
  load(slot: SlotNumber): Promise<SaveData | null>;
  save(slot: SlotNumber, data: SaveData): Promise<void>;
  remove(slot: SlotNumber): Promise<void>;
}

const clone = (d: SaveData): SaveData => JSON.parse(JSON.stringify(d)) as SaveData;

/** In-memory storage: for tests, server rendering, or throwaway sessions. */
export function memorySaveStorage(): SaveStorage {
  const slots = new Map<SlotNumber, SaveData>();
  return {
    load: async (slot) => {
      const d = slots.get(slot);
      return d ? clone(d) : null;
    },
    save: async (slot, data) => {
      slots.set(slot, clone(data));
    },
    remove: async (slot) => {
      slots.delete(slot);
    },
  };
}

/** The subset of the Web Storage API we use; declared here so core stays DOM-free. */
interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function webStorage(): WebStorageLike | null {
  try {
    const g = globalThis as { localStorage?: WebStorageLike };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Browser localStorage under `${prefix}${slot}`; silently falls back to memory when unavailable. */
export function localStorageSaveStorage(prefix = 'shooterland:save:'): SaveStorage {
  const fallback = memorySaveStorage();
  return {
    async load(slot) {
      const s = webStorage();
      if (!s) return fallback.load(slot);
      try {
        const raw = s.getItem(`${prefix}${slot}`);
        return raw ? coerceSave(JSON.parse(raw)) : null;
      } catch {
        return null;
      }
    },
    async save(slot, data) {
      const s = webStorage();
      if (!s) return fallback.save(slot, data);
      try {
        s.setItem(`${prefix}${slot}`, JSON.stringify(data));
      } catch {
        await fallback.save(slot, data);
      }
    },
    async remove(slot) {
      const s = webStorage();
      if (!s) return fallback.remove(slot);
      try {
        s.removeItem(`${prefix}${slot}`);
      } catch {
        await fallback.remove(slot);
      }
    },
  };
}
