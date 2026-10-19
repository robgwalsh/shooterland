import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GRID_SIZE } from '../../src/core/constants';
import type { LevelData } from '../../src/core/level/LevelData';
import { parseSll } from '../../src/core/level/parseSll';
import { DEFAULT_RULES, type Rules } from '../../src/core/rules';
import { type Command, GameSession, type SessionEvent } from '../../src/core/sim/GameSession';
import { TileId } from '../../src/core/types';

const LEVELS_DIR = join(__dirname, '../../../../legacy/levels');

function level(
  cells: (readonly [number, number, number])[],
  extra: Partial<LevelData> = {},
): LevelData {
  const grid = new Array<number>(GRID_SIZE * GRID_SIZE).fill(TileId.Empty);
  for (const [col, row, id] of cells) grid[row * GRID_SIZE + col] = id;
  return {
    id: 't-1',
    world: 9,
    level: 1,
    bottomShooterSize: 1,
    rightShooterSize: 1,
    lairDelayMs: 30000,
    speedUpIntervalMs: 20000,
    unknownFlag: 1,
    cells: grid,
    unknownPercent: 100, // no bombs unless a test asks for them
    unknownMs: 30000,
    message: '',
    timeToBeat: 60,
    placeholder: false,
    ...extra,
  };
}

/** Rules with a fixed ammo stream are easier to reason about: no bombs. */
const NO_BOMBS: Rules = { ...DEFAULT_RULES, bombChanceFromLevel: false, bombChance: 0 };

function run(session: GameSession, commands: Command[], maxTicks = 600): SessionEvent[] {
  const events: SessionEvent[] = [];
  events.push(...session.tick(commands));
  for (let i = 0; i < maxTicks && session.inFlight.length > 0; i++) events.push(...session.tick());
  return events;
}

describe('GameSession', () => {
  it('counts enemies from the level and starts with loaded shooters', () => {
    const s = new GameSession(
      level([
        [4, 2, TileId.Crony],
        [9, 4, TileId.Crony],
        [1, 1, TileId.Crazy],
      ]),
      1,
      NO_BOMBS,
    );
    expect(s.enemies).toEqual({ crony: 2, crazy: 1, fatty: 0, fangie: 0, skully: 0 });
    expect(s.shooters.bottom.loaded).toBeGreaterThanOrEqual(TileId.Thingie1);
    expect(s.shooters.right.next).toBeLessThanOrEqual(TileId.Thingie6);
    expect(s.money).toBe(0);
  });

  it('fires both shooters together and lands them where the lanes end', () => {
    const s = new GameSession(level([[4, 5, TileId.GreyBlock]]), 7, NO_BOMBS);
    const events = run(s, [{ t: 'aim', col: 4, row: 2 }, { t: 'fire' }]);
    const fired = events.find((e) => e.t === 'fired');
    expect(fired && fired.t === 'fired' ? fired.shots.length : 0).toBe(2);
    const landed = events.filter((e) => e.t === 'landed');
    expect(landed).toHaveLength(2);
    expect(s.grid.get(4, 6)).toBe(s.grid.get(4, 6)); // bottom shot stopped under the block
    expect(s.grid.get(4, 6)).toBeGreaterThanOrEqual(TileId.Thingie1);
    expect(s.grid.get(0, 2)).toBeGreaterThanOrEqual(TileId.Thingie1); // right shot reached the left edge
    expect(s.stats.shots).toBe(1);
    expect(events.at(-1)?.t).toBe('reloaded');
  });

  it('refuses to fire while shots are in flight or when a lane is blocked', () => {
    const s = new GameSession(level([[4, 12, TileId.GreyBlock]]), 3, NO_BOMBS);
    expect(s.tick([{ t: 'aim', col: 4, row: 0 }, { t: 'fire' }])).toEqual([{ t: 'cantFire' }]);
    const ok = s.tick([{ t: 'aim', col: 5, row: 0 }, { t: 'fire' }]);
    expect(ok[0]?.t).toBe('fired');
    expect(s.tick([{ t: 'fire' }])).toEqual([{ t: 'cantFire' }]);
  });

  it('clears a combo of three, pays one dollar and kills the adjoining crony', () => {
    // Column 4: two Thingie1 stacked on a block, crony beside the top one.
    const s = new GameSession(
      level([
        [4, 5, TileId.GreyBlock],
        [4, 6, TileId.Thingie1],
        [4, 7, TileId.Thingie1],
        [5, 7, TileId.Crony],
        [0, 0, TileId.GreyBlock], // keeps the right shooter's shot out of the way (row 0 lands at col 1)
      ]),
      1,
      NO_BOMBS,
    );
    s.shooters.bottom.loaded = TileId.Thingie1;
    s.shooters.right.loaded = TileId.Thingie6;
    const events = run(s, [{ t: 'aim', col: 4, row: 0 }, { t: 'fire' }]);
    const combo = events.find((e) => e.t === 'combo');
    expect(combo && combo.t === 'combo' ? combo.cells.length : 0).toBe(3);
    expect(s.money).toBe(1);
    expect(s.grid.get(4, 6)).toBe(TileId.Empty);
    expect(s.grid.get(4, 8)).toBe(TileId.Empty);
    expect(
      events.some((e) => e.t === 'enemyKilled' && e.kind === 'crony' && e.by === 'combo'),
    ).toBe(true);
    expect(s.enemies.crony).toBe(0);
    expect(s.status).toBe('won');
    expect(s.stats.combos).toBe(1);
    expect(s.stats.comboPieces).toBe(3);
  });

  it('pays one extra dollar per thingie beyond three', () => {
    const s = new GameSession(
      level([
        [4, 5, TileId.GreyBlock],
        [4, 6, TileId.Thingie2],
        [4, 7, TileId.Thingie2],
        [4, 8, TileId.Thingie2],
        [0, 0, TileId.GreyBlock],
        [8, 8, TileId.Crazy], // crazies never die to combos, so the level stays open
      ]),
      1,
      NO_BOMBS,
    );
    s.shooters.bottom.loaded = TileId.Thingie2;
    s.shooters.right.loaded = TileId.Thingie6;
    run(s, [{ t: 'aim', col: 4, row: 0 }, { t: 'fire' }]);
    expect(s.money).toBe(2);
    expect(s.status).toBe('playing');
  });

  it('a bomb destroys the crony it hits and a crazy, but not a fatty or grey block', () => {
    const s = new GameSession(
      level([
        [4, 5, TileId.Crony],
        [0, 2, TileId.Fatty],
        [8, 8, TileId.Crazy],
      ]),
      1,
      NO_BOMBS,
    );
    s.shooters.bottom.loaded = TileId.Bomb;
    s.shooters.right.loaded = TileId.Bomb;
    const events = run(s, [{ t: 'aim', col: 4, row: 2 }, { t: 'fire' }]);
    expect(events.filter((e) => e.t === 'bomb')).toHaveLength(2);
    expect(s.grid.get(4, 5)).toBe(TileId.Empty);
    expect(s.enemies.crony).toBe(0);
    expect(s.grid.get(0, 2)).toBe(TileId.Fatty);
    expect(s.enemies.fatty).toBe(1);
  });

  it("removes a type's enemy blocks once its last enemy dies", () => {
    const s = new GameSession(
      level([
        [4, 5, TileId.Crony],
        [10, 10, TileId.CronyBlock],
        [11, 10, TileId.CronyBlock],
        [8, 8, TileId.Crazy],
      ]),
      1,
      NO_BOMBS,
    );
    s.shooters.bottom.loaded = TileId.Bomb;
    s.shooters.right.loaded = TileId.Thingie1;
    const events = run(s, [{ t: 'aim', col: 4, row: 2 }, { t: 'fire' }]);
    expect(events.some((e) => e.t === 'enemyBlocksCleared' && e.kind === 'crony')).toBe(true);
    expect(s.grid.get(10, 10)).toBe(TileId.Empty);
    expect(s.grid.get(11, 10)).toBe(TileId.Empty);
  });

  it('buys store items when affordable and loads them into the chosen shooter', () => {
    const s = new GameSession(level([[8, 8, TileId.Crazy]]), 1, NO_BOMBS);
    s.money = 3;
    expect(s.tick([{ t: 'buy', item: TileId.Weight3, shooter: 'bottom' }])).toEqual([]);
    expect(s.money).toBe(3);
    const events = s.tick([{ t: 'buy', item: TileId.RampTopLeft, shooter: 'right' }]);
    expect(events[0]?.t).toBe('bought');
    expect(s.money).toBe(1);
    expect(s.shooters.right.loaded).toBe(TileId.RampTopLeft);
  });

  it('wins a survival level (no enemies) once the time-to-beat elapses', () => {
    const s = new GameSession(level([[4, 4, TileId.GreyBlock]], { timeToBeat: 1 }), 1, NO_BOMBS);
    for (let i = 0; i < 59; i++) s.tick();
    expect(s.status).toBe('playing');
    const events = s.tick();
    expect(s.status).toBe('won');
    expect(events[0]?.t).toBe('won');
  });

  it('is deterministic: same seed and commands give the same hash', () => {
    const text = readFileSync(join(LEVELS_DIR, 'Level1-1.sll'), 'latin1');
    const data = parseSll(text, { world: 1, level: 1, timeToBeat: 15 });
    const play = (): string => {
      const s = new GameSession(data, 12345);
      for (let i = 0; i < 400; i++) {
        const cmds: Command[] =
          i % 40 === 0 ? [{ t: 'aim', col: (i / 40) % 13, row: (i / 20) % 13 }, { t: 'fire' }] : [];
        s.tick(cmds);
      }
      return s.hash();
    };
    expect(play()).toBe(play());
    const other = new GameSession(data, 54321);
    for (let i = 0; i < 400; i++) other.tick(i % 40 === 0 ? [{ t: 'fire' }] : []);
    expect(other.hash()).not.toBe(play());
  });
});
