import { GRID_SIZE } from '../constants';
import { TileId } from '../types';
import type { LevelData } from './LevelData';

const CELL_COUNT = GRID_SIZE * GRID_SIZE; // 169
const HEADER_COUNT = 5;
const FOOTER_COUNT = 2;
/** 5 header + 169 cells + 2 footer + 1 message. */
export const SLL_TOKEN_COUNT = HEADER_COUNT + CELL_COUNT + FOOTER_COUNT + 1;

const KNOWN_TILE_IDS: ReadonlySet<number> = new Set<number>(Object.values(TileId));

export class SllParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SllParseError';
  }
}

/**
 * Decodes the message token: `_` is a space, `*` a line break, and the text
 * ends with `END`. The placeholders `Instructions` and `80` become "".
 */
export function decodeSllMessage(token: string): string {
  if (token === 'Instructions' || token === '80' || token === '') return '';
  let text = token.replace(/_/g, ' ').replace(/\*/g, '\n');
  text = text.replace(/\s*END$/, '');
  return text.trim();
}

export interface ParseSllOptions {
  world: number;
  level: number;
  timeToBeat: number;
  placeholder?: boolean;
}

/**
 * Parses the text of a legacy `.sll` level file. The original read it with
 * `fscanf`, so any whitespace separates values and padding is irrelevant.
 */
export function parseSll(text: string, opts: ParseSllOptions): LevelData {
  const tokens = text.trim().split(/\s+/);
  if (tokens.length < SLL_TOKEN_COUNT) {
    throw new SllParseError(`expected ${SLL_TOKEN_COUNT} values, found ${tokens.length}`);
  }
  const int = (i: number, what: string): number => {
    const t = tokens[i] ?? '';
    if (!/^-?\d+$/.test(t))
      throw new SllParseError(`${what} (value ${i + 1}) is not an integer: "${t}"`);
    return Number.parseInt(t, 10);
  };

  const cells: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = int(HEADER_COUNT + i, `cell ${i}`);
    if (!KNOWN_TILE_IDS.has(v)) throw new SllParseError(`cell ${i} has unknown tile id ${v}`);
    cells.push(v);
  }
  const footerAt = HEADER_COUNT + CELL_COUNT;
  // Everything after the footer is the message; a stray real space would split it.
  const message = decodeSllMessage(tokens.slice(footerAt + FOOTER_COUNT).join(' '));

  return {
    id: `${opts.world}-${opts.level}`,
    world: opts.world,
    level: opts.level,
    bottomShooterSize: int(0, 'bottom shooter size'),
    rightShooterSize: int(1, 'right shooter size'),
    lairDelayMs: int(2, 'lair delay'),
    roscoPeriodMs: int(3, 'rosco period'),
    roscoStealAmount: int(4, 'rosco steal amount'),
    cells,
    roscoSpeedUpPercent: int(footerAt, 'speed-up percent'),
    roscoSpeedUpIntervalMs: int(footerAt + 1, 'speed-up interval'),
    message,
    timeToBeat: opts.timeToBeat,
    placeholder: opts.placeholder ?? false,
  };
}

/** Parses `times.dat`: one time-to-beat in seconds per level, 25 per world. */
export function parseTimesDat(text: string): number[] {
  return text
    .trim()
    .split(/\s+/)
    .map((t) => {
      if (!/^\d+$/.test(t)) throw new SllParseError(`times.dat value is not an integer: "${t}"`);
      return Number.parseInt(t, 10);
    });
}

/** Parses `map.dat`: 25 x,y pairs giving each level node's position on the world map. */
export function parseMapDat(text: string): { x: number; y: number }[] {
  const nums = text
    .trim()
    .split(/\s+/)
    .map((t) => Number.parseInt(t, 10));
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push({ x: nums[i] ?? 0, y: nums[i + 1] ?? 0 });
  }
  return points;
}

/** Cell accessor for row-major 13x13 data. */
export function cellAt(cells: readonly number[], col: number, row: number): number {
  return cells[row * GRID_SIZE + col] ?? TileId.Empty;
}
