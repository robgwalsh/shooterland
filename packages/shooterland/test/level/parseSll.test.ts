import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GRID_SIZE } from '../../src/core/constants';
import { levelIndex } from '../../src/core/level/LevelData';
import {
  cellAt,
  decodeSllMessage,
  parseMapDat,
  parseSll,
  parseTimesDat,
} from '../../src/core/level/parseSll';
import { TileId } from '../../src/core/types';

const LEGACY = join(__dirname, '../../../../legacy');
const LEVELS_DIR = join(LEGACY, 'levels');

const levelFiles = readdirSync(LEVELS_DIR)
  .filter((f) => /^level\d+-\d+\.sll$/i.test(f))
  .map((f) => {
    const m = /^level(\d+)-(\d+)\.sll$/i.exec(f);
    if (!m) throw new Error(f);
    return { file: f, world: Number(m[1]), level: Number(m[2]) };
  })
  .sort((a, b) => a.world - b.world || a.level - b.level);

const times = parseTimesDat(readFileSync(join(LEVELS_DIR, 'times.dat'), 'latin1'));

describe('legacy level files', () => {
  it('finds 151 numbered levels and 175 times', () => {
    expect(levelFiles).toHaveLength(151);
    expect(times).toHaveLength(175);
  });

  it.each(levelFiles)('parses $file', ({ file, world, level }) => {
    const text = readFileSync(join(LEVELS_DIR, file), 'latin1');
    const data = parseSll(text, {
      world,
      level,
      timeToBeat: times[levelIndex(world, level)] ?? 0,
    });
    expect(data.id).toBe(`${world}-${level}`);
    expect(data.cells).toHaveLength(GRID_SIZE * GRID_SIZE);
    expect(data.bottomShooterSize).toBeGreaterThanOrEqual(1);
    expect(data.bottomShooterSize).toBeLessThanOrEqual(3);
    expect(data.rightShooterSize).toBeGreaterThanOrEqual(1);
    expect(data.rightShooterSize).toBeLessThanOrEqual(3);
    expect([1, 2]).toContain(data.unknownFlag);
    expect(data.timeToBeat).toBeGreaterThan(0);
  });

  it('reads level 1-1 as the three plus-shaped tutorial groups', () => {
    const data = parseSll(readFileSync(join(LEVELS_DIR, 'Level1-1.sll'), 'latin1'), {
      world: 1,
      level: 1,
      timeToBeat: 15,
    });
    expect(data.bottomShooterSize).toBe(1);
    expect(data.lairDelayMs).toBe(30000);
    expect(data.speedUpIntervalMs).toBe(26000);
    expect(cellAt(data.cells, 4, 2)).toBe(TileId.Crony);
    expect(cellAt(data.cells, 4, 1)).toBe(TileId.Thingie1);
    expect(cellAt(data.cells, 3, 2)).toBe(TileId.Thingie1);
    expect(cellAt(data.cells, 9, 4)).toBe(TileId.Crony);
    expect(cellAt(data.cells, 3, 8)).toBe(TileId.Crony);
    expect(cellAt(data.cells, 0, 0)).toBe(TileId.Empty);
    expect(data.message.startsWith('Welcome to Shooterland!')).toBe(true);
    expect(data.message.endsWith('Good luck!')).toBe(true);
    expect(data.message).toContain('\n');
  });

  it('decodes placeholder messages to empty strings', () => {
    expect(decodeSllMessage('Instructions')).toBe('');
    expect(decodeSllMessage('80')).toBe('');
    expect(decodeSllMessage('Hello_there!_END')).toBe('Hello there!');
    expect(decodeSllMessage('Line_one*Line_two_END')).toBe('Line one\nLine two');
  });

  it('parses map.dat into 25 node positions, identical for every world', () => {
    const first = parseMapDat(readFileSync(join(LEGACY, 'graphics/world1/map.dat'), 'latin1'));
    expect(first).toHaveLength(25);
    for (let w = 2; w <= 7; w++) {
      const pts = parseMapDat(readFileSync(join(LEGACY, `graphics/world${w}/map.dat`), 'latin1'));
      expect(pts).toEqual(first);
    }
  });
});
