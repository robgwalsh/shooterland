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

/**
 * A test board. Unless `sentinel` is false it holds an unreachable Skully in
 * the far corner, because a board without enemies is won on its first tick.
 */
function level(
  cells: (readonly [number, number, number])[],
  extra: Partial<LevelData> & { sentinel?: boolean } = {},
): LevelData {
  const { sentinel = true, ...rest } = extra;
  const grid = new Array<number>(GRID_SIZE * GRID_SIZE).fill(TileId.Empty);
  if (sentinel) grid[12 * GRID_SIZE + 12] = TileId.Skully;
  for (const [col, row, id] of cells) grid[row * GRID_SIZE + col] = id;
  extra = rest;
  return {
    id: 't-1',
    world: 1,
    level: 1,
    bottomShooterSize: 1,
    rightShooterSize: 1,
    lairDelayMs: 600000,
    roscoPeriodMs: 20000,
    roscoStealAmount: 1,
    cells: grid,
    roscoSpeedUpPercent: 80,
    roscoSpeedUpIntervalMs: 30000,
    message: '',
    timeToBeat: 60,
    placeholder: false,
    ...extra,
  };
}

/** Rules without random bombs make the ammo stream easy to reason about. */
const QUIET: Rules = { ...DEFAULT_RULES, bombChance: 0 };

function run(session: GameSession, commands: Command[], maxTicks = 600): SessionEvent[] {
  const events: SessionEvent[] = [];
  events.push(...session.tick(commands));
  for (let i = 0; i < maxTicks && session.inFlight.length > 0; i++) events.push(...session.tick());
  return events;
}

/** Lets destroy animations finish so tiles are actually removed. */
function settle(session: GameSession, ticks = 40): SessionEvent[] {
  const events: SessionEvent[] = [];
  for (let i = 0; i < ticks; i++) events.push(...session.tick());
  return events;
}

const aimFire = (bottom: number, right: number): Command[] => [
  { t: 'aim', bottom, right },
  { t: 'fire' },
];

describe('GameSession', () => {
  it('counts enemies from the level, loads every lane and starts with $0', () => {
    const s = new GameSession(
      level([
        [4, 2, TileId.Crony],
        [9, 4, TileId.Crony],
        [1, 1, TileId.Crazy],
      ]),
      1,
      QUIET,
    );
    expect(s.enemies).toEqual({ crony: 2, crazy: 1, fatty: 0, fangie: 0, skully: 1 });
    expect(s.shooters.bottom.lanes).toHaveLength(1);
    expect(s.shooters.bottom.lanes[0]?.loaded).toBeGreaterThanOrEqual(TileId.Thingie1);
    expect(s.shooters.right.lanes[0]?.next).toBeLessThanOrEqual(TileId.Thingie6);
    expect(s.money).toBe(0);
  });

  it('draws bombs with the level-independent 1/20 chance', () => {
    let bombs = 0;
    let draws = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const s = new GameSession(level([], { bottomShooterSize: 2, rightShooterSize: 2 }), seed);
      for (const bar of [s.shooters.bottom, s.shooters.right]) {
        for (const lane of bar.lanes) {
          for (const item of [lane.loaded, lane.next]) {
            draws++;
            if (item === TileId.Bomb) bombs++;
            else expect(item).toBeGreaterThanOrEqual(TileId.Thingie1);
          }
        }
      }
    }
    expect(draws).toBe(8000);
    expect(bombs / draws).toBeGreaterThan(0.035);
    expect(bombs / draws).toBeLessThan(0.065);
  });

  it('fires both bars together, one cell per tick, and lands them where the lanes end', () => {
    const s = new GameSession(level([[4, 5, TileId.GreyBlock]]), 7, QUIET);
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.setLaneAmmo('right', 0, [TileId.Thingie2]);
    const first = s.tick(aimFire(4, 2));
    expect(first[0]?.t).toBe('fired');
    expect(s.inFlight.map((p) => [p.col, p.row])).toEqual([
      [4, 12],
      [12, 2],
    ]);
    const events: SessionEvent[] = [];
    let ticks = 0;
    while (s.inFlight.length > 0 && ticks < 100) {
      events.push(...s.tick());
      ticks++;
    }
    expect(ticks).toBe(13); // 12 more moves to column 0, then one tick to notice it cannot go on
    expect(s.grid.get(4, 6)).toBe(TileId.Thingie1);
    expect(s.grid.get(0, 2)).toBe(TileId.Thingie2);
    expect(events.filter((e) => e.t === 'landed')).toHaveLength(2);
    expect(s.stats.shots).toBe(1);
  });

  it('refuses to fire while shots fly or when every lane of a bar is blocked', () => {
    const s = new GameSession(level([[4, 12, TileId.GreyBlock]]), 3, QUIET);
    expect(s.tick(aimFire(4, 0))).toEqual([{ t: 'cantFire', reason: 'blocked' }]);
    expect(s.stats.shots).toBe(0);
    const ok = s.tick(aimFire(5, 0));
    expect(ok[0]?.t).toBe('fired');
    expect(s.tick([{ t: 'fire' }])).toEqual([{ t: 'cantFire', reason: 'inFlight' }]);
  });

  it('a bar with one open lane out of two still fires (tutorial 1-24)', () => {
    const s = new GameSession(
      level([[4, 12, TileId.GreyBlock]], { bottomShooterSize: 2 }),
      3,
      QUIET,
    );
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.setLaneAmmo('bottom', 1, [TileId.Thingie2]);
    const events = run(s, aimFire(4, 0));
    const fired = events[0];
    expect(fired?.t === 'fired' && fired.shots.length).toBe(3);
    expect(events.some((e) => e.t === 'returned')).toBe(true); // the blocked lane keeps its item
    expect(s.shooters.bottom.lanes[0]?.loaded).toBe(TileId.Thingie1);
    expect(s.grid.get(5, 0)).toBe(TileId.Thingie2);
  });

  it('clears three in a row, pays $1 plus $1 per extra, and kills an adjacent Crony (1-2, 1-9)', () => {
    const s = new GameSession(
      level(
        [
          [4, 2, TileId.Thingie1],
          [4, 3, TileId.Thingie1],
          [3, 4, TileId.Crony],
        ],
        { sentinel: false },
      ),
      1,
      QUIET,
    );
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.setLaneAmmo('right', 0, [TileId.Thingie6]);
    const events = run(s, aimFire(4, 0));
    const combo = events.find((e) => e.t === 'combo');
    expect(combo?.t === 'combo' && combo.cells.length).toBe(3);
    expect(s.money).toBe(1);
    expect(events.some((e) => e.t === 'enemyKilled' && e.by === 'combo')).toBe(true);
    // Killed tiles stay (passable) for the destroy animation, then vanish.
    expect(s.enemies.crony).toBe(1);
    expect(s.status).toBe('playing');
    const later = settle(s);
    expect(later.some((e) => e.t === 'cleared')).toBe(true);
    expect(s.enemies.crony).toBe(0);
    expect(s.status).toBe('won');
    expect(s.stats.combos).toBe(1);
    expect(s.stats.comboPieces).toBe(3);
  });

  it('a four-combo pays $2 and kills an adjacent Fatty, but a Crazy ignores combos (2-1, 2-18)', () => {
    const s = new GameSession(
      level([
        [4, 1, TileId.Thingie1],
        [4, 2, TileId.Thingie1],
        [4, 3, TileId.Thingie1],
        [5, 4, TileId.Fatty],
        [3, 4, TileId.Crazy],
      ]),
      1,
      QUIET,
    );
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.setLaneAmmo('right', 0, [TileId.Thingie6]);
    const events = run(s, aimFire(4, 0));
    expect(s.money).toBe(2);
    const kills = events.filter((e) => e.t === 'enemyKilled');
    expect(kills.map((e) => e.t === 'enemyKilled' && e.kind)).toEqual(['fatty']);
    settle(s);
    expect(s.enemies.crazy).toBe(1);
  });

  it('a three-combo does not kill a Fatty', () => {
    const s = new GameSession(
      level([
        [4, 2, TileId.Thingie1],
        [4, 3, TileId.Thingie1],
        [5, 4, TileId.Fatty],
      ]),
      1,
      QUIET,
    );
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.setLaneAmmo('right', 0, [TileId.Thingie6]);
    run(s, aimFire(4, 0));
    settle(s);
    expect(s.enemies.fatty).toBe(1);
  });

  it('only adjacent enemies die: a diagonal neighbour survives (4-neighbourhood)', () => {
    const s = new GameSession(
      level([
        [4, 2, TileId.Thingie1],
        [4, 3, TileId.Thingie1],
        [5, 5, TileId.Crony],
      ]),
      1,
      QUIET,
    );
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.setLaneAmmo('right', 0, [TileId.Thingie6]);
    run(s, aimFire(4, 0));
    settle(s);
    expect(s.enemies.crony).toBe(1);
  });

  it('a bomb lands before its target, destroys it unless it resists, and leaves no tile', () => {
    const s = new GameSession(
      level([
        [4, 2, TileId.Crony],
        [2, 5, TileId.Fatty],
      ]),
      1,
      QUIET,
    );
    s.setLaneAmmo('bottom', 0, [TileId.Bomb]);
    s.setLaneAmmo('right', 0, [TileId.Bomb]);
    const events = run(s, aimFire(4, 5));
    const bombs = events.filter((e) => e.t === 'bomb');
    expect(bombs).toHaveLength(2);
    expect(events.some((e) => e.t === 'enemyKilled' && e.kind === 'crony' && e.by === 'bomb')).toBe(
      true,
    );
    expect(s.grid.get(4, 3)).toBe(TileId.Bomb); // blast animation in progress
    settle(s);
    expect(s.grid.get(4, 3)).toBe(TileId.Empty);
    expect(s.grid.get(4, 2)).toBe(TileId.Empty);
    expect(s.grid.get(2, 5)).toBe(TileId.Fatty);
  });

  it('a bomb in a blocked lane still blasts the first cell', () => {
    const s = new GameSession(level([[4, 12, TileId.BrownBlock]]), 1, QUIET);
    s.setLaneAmmo('bottom', 0, [TileId.Bomb]);
    s.setLaneAmmo('right', 0, [TileId.Thingie6]);
    const events = run(s, aimFire(4, 0));
    expect(events[0]?.t).toBe('fired');
    const bomb = events.find((e) => e.t === 'bomb');
    expect(bomb?.t === 'bomb' && bomb.at).toBeNull();
    settle(s);
    expect(s.grid.get(4, 12)).toBe(TileId.Empty);
  });

  it('a shot passes through a cell a bomb is destroying (2-8)', () => {
    // Right shot along row 5 meets the block at column 4 only if the bomb has not gone first.
    const s = new GameSession(level([[4, 5, TileId.BrownBlock]]), 1, QUIET);
    s.setLaneAmmo('bottom', 0, [TileId.Bomb]);
    s.setLaneAmmo('right', 0, [TileId.Thingie1]);
    run(s, aimFire(4, 5));
    expect(s.grid.get(0, 5)).toBe(TileId.Thingie1);
  });

  it('when two shots want the same cell the later one backs up to the last free cell', () => {
    // Both shots reach (3,3) on the same tick: Mary's is blocked above it, Poindexter's beyond it.
    const s = new GameSession(
      level([
        [3, 2, TileId.GreyBlock],
        [2, 3, TileId.GreyBlock],
      ]),
      1,
      QUIET,
    );
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.setLaneAmmo('right', 0, [TileId.Thingie2]);
    run(s, aimFire(3, 3));
    expect(s.grid.get(3, 3)).toBe(TileId.Thingie1); // Mary's lanes land first
    expect(s.grid.get(4, 3)).toBe(TileId.Thingie2);
  });

  it('a shot that reaches a land mine is destroyed with it, nothing else happens', () => {
    const s = new GameSession(
      level([
        [4, 5, TileId.Mine],
        [3, 5, TileId.Crony],
        [4, 4, TileId.Thingie2],
      ]),
      1,
      QUIET,
    );
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.setLaneAmmo('right', 0, [TileId.Thingie6]);
    const events = run(s, aimFire(4, 0));
    expect(events.some((e) => e.t === 'mine' && e.by === 'shot')).toBe(true);
    settle(s);
    expect(s.grid.get(4, 5)).toBe(TileId.Empty);
    expect(s.grid.get(3, 5)).toBe(TileId.Crony);
    expect(s.grid.get(4, 4)).toBe(TileId.Thingie2);
    expect(s.grid.count((id) => id === TileId.Thingie1)).toBe(0);
  });

  it('removes enemy blocks once their enemy type is gone (2-6, 2-9)', () => {
    const s = new GameSession(
      level([
        [4, 2, TileId.Thingie1],
        [4, 3, TileId.Thingie1],
        [3, 4, TileId.Crony],
        [8, 8, TileId.CronyBlock],
        [9, 9, TileId.CrazyBlock],
        [0, 0, TileId.Crazy],
      ]),
      1,
      QUIET,
    );
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.setLaneAmmo('right', 0, [TileId.Thingie6]);
    run(s, aimFire(4, 0));
    const events = settle(s, 80);
    expect(events.some((e) => e.t === 'enemyBlocksCleared' && e.kind === 'crony')).toBe(true);
    expect(s.grid.get(8, 8)).toBe(TileId.Empty);
    expect(s.grid.get(9, 9)).toBe(TileId.CrazyBlock);
  });

  it('the store sells into one lane, parks the bars and leaves the other lanes blank (G27)', () => {
    const s = new GameSession(level([], { rightShooterSize: 2 }), 1, QUIET);
    s.money = 10;
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.setLaneAmmo('right', 0, [TileId.Thingie2]);
    s.setLaneAmmo('right', 1, [TileId.Thingie3]);
    s.tick([{ t: 'openStore' }]);
    expect(s.storeOpen).toBe(true);
    expect(s.shooters.bottom.lane).toBe(10);
    expect(s.shooters.right.lane).toBe(9);
    expect(s.shooters.bottom.lanes[0]?.loaded).toBe(TileId.Empty);
    expect(s.shooters.bottom.lanes[0]?.next).toBe(TileId.Thingie1);
    // Aiming is ignored while the store is open.
    s.tick([{ t: 'aim', bottom: 2, right: 2 }]);
    expect(s.shooters.bottom.lane).toBe(10);
    const events = s.tick([{ t: 'buy', item: TileId.RampTopLeft, shooter: 'right', lane: 1 }]);
    expect(events).toEqual([
      { t: 'bought', item: TileId.RampTopLeft, shooter: 'right', lane: 1, quantity: 1, cost: 2 },
    ]);
    expect(s.money).toBe(8);
    expect(s.storeOpen).toBe(false);
    expect(s.shooters.right.lanes[1]?.loaded).toBe(TileId.RampTopLeft);
    expect(s.shooters.right.lanes[0]?.loaded).toBe(TileId.Empty);
    expect(s.shooters.bottom.lanes[0]?.loaded).toBe(TileId.Empty);
    const fired = run(s, aimFire(5, 4));
    expect(fired[0]?.t === 'fired' && fired[0].shots).toEqual([
      { shooter: 'right', lane: 5, ammo: TileId.RampTopLeft },
    ]);
    expect(s.grid.get(0, 5)).toBe(TileId.RampTopLeft);
    // The blanks were consumed: the original items are loaded again.
    expect(s.shooters.bottom.lanes[0]?.loaded).toBe(TileId.Thingie1);
    expect(s.shooters.right.lanes[0]?.loaded).toBe(TileId.Thingie2);
  });

  it('closing the store without buying restores every lane, and purchases need the money', () => {
    const s = new GameSession(level([]), 1, QUIET);
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.tick([{ t: 'openStore' }]);
    s.tick([{ t: 'buy', item: TileId.Weight3, shooter: 'bottom', lane: 0 }]);
    expect(s.storeOpen).toBe(true);
    expect(s.shooters.bottom.lanes[0]?.loaded).toBe(TileId.Empty);
    s.tick([{ t: 'closeStore' }]);
    expect(s.storeOpen).toBe(false);
    expect(s.shooters.bottom.lanes[0]?.loaded).toBe(TileId.Thingie1);
  });

  it('buying several bombs queues them in front, inserting a blank elsewhere for each extra', () => {
    const s = new GameSession(level([]), 1, QUIET);
    s.money = 9;
    s.setLaneAmmo('right', 0, [TileId.Thingie2]);
    s.tick([{ t: 'openStore' }]);
    const events = s.tick([
      { t: 'buy', item: TileId.Bomb, shooter: 'bottom', lane: 0, quantity: 3 },
    ]);
    expect(events[0]?.t === 'bought' && events[0].quantity).toBe(3);
    expect(s.money).toBe(0);
    expect(s.shooters.bottom.lanes[0]).toEqual({ loaded: TileId.Bomb, next: TileId.Bomb });
    expect(s.shooters.right.lanes[0]).toEqual({ loaded: TileId.Empty, next: TileId.Empty });
  });

  it('with storeBlanksOtherLanes off, the other lanes keep their items after a purchase', () => {
    const s = new GameSession(level([]), 1, { ...QUIET, storeBlanksOtherLanes: false });
    s.money = 5;
    s.setLaneAmmo('bottom', 0, [TileId.Thingie1]);
    s.setLaneAmmo('right', 0, [TileId.Thingie2]);
    s.tick([{ t: 'openStore' }]);
    s.tick([{ t: 'buy', item: TileId.Weight1, shooter: 'bottom', lane: 0 }]);
    expect(s.shooters.right.lanes[0]?.loaded).toBe(TileId.Thingie2);
  });

  it('a thingy copy from the board costs $3 and loads like any item', () => {
    const s = new GameSession(level([[3, 3, TileId.Thingie4]]), 1, QUIET);
    s.money = 3;
    s.tick([{ t: 'openStore' }]);
    s.tick([{ t: 'buy', item: TileId.Thingie4, shooter: 'bottom', lane: 0 }]);
    expect(s.money).toBe(0);
    expect(s.shooters.bottom.lanes[0]?.loaded).toBe(TileId.Thingie4);
  });

  it('a ramp loaded into a lane is fired and placed like a thingy, and deflects later shots', () => {
    const s = new GameSession(level([[4, 2, TileId.GreyBlock]]), 1, QUIET);
    s.setLaneAmmo('bottom', 0, [TileId.RampBottomLeft, TileId.Thingie1]);
    s.setLaneAmmo('right', 0, [TileId.Thingie6, TileId.Thingie6]);
    run(s, aimFire(4, 11));
    expect(s.grid.get(4, 3)).toBe(TileId.RampBottomLeft);
    settle(s);
    run(s, aimFire(4, 10));
    // Up into 18 turns left: the thingy travels along row 3 to the left edge.
    expect(s.grid.get(0, 3)).toBe(TileId.Thingie1);
  });

  it('Rosco steals the level amount at the piggy bank and bankrupts the player', () => {
    const s = new GameSession(
      level([[0, 0, TileId.Skully]], {
        lairDelayMs: 1000,
        roscoPeriodMs: 2000,
        roscoStealAmount: 2,
      }),
      1,
      QUIET,
    );
    s.money = 3;
    const events: SessionEvent[] = [];
    for (let i = 0; i < 60 * 5 && s.status === 'playing'; i++) events.push(...s.tick());
    const thefts = events.filter((e) => e.t === 'roscoStole');
    expect(thefts.length).toBe(2);
    expect(thefts[0]?.t === 'roscoStole' && thefts[0].money).toBe(1);
    expect(s.money).toBe(-1);
    expect(s.status).toBe('lost');
    expect(events.at(-1)).toEqual({ t: 'defeated', reason: 'rosco' });
  });

  it('wins when the last enemy tile is gone and awards the star by whole seconds', () => {
    const s = new GameSession(
      level([[4, 2, TileId.Crony]], { timeToBeat: 1, sentinel: false }),
      1,
      QUIET,
    );
    s.setLaneAmmo('bottom', 0, [TileId.Bomb]);
    s.setLaneAmmo('right', 0, [TileId.Thingie6]);
    run(s, aimFire(4, 12));
    const events = settle(s);
    const won = events.find((e) => e.t === 'won');
    expect(won?.t === 'won' && won.star).toBe(true);
    expect(s.elapsedSeconds).toBe(0);
  });

  it('is deterministic: the same seed and commands give the same hash, another seed differs', () => {
    const script = (seed: number): string => {
      const s = new GameSession(
        level([
          [4, 2, TileId.Crony],
          [6, 6, TileId.GreyBlock],
          [7, 7, TileId.Thingie2],
        ]),
        seed,
      );
      for (let i = 0; i < 400; i++) {
        s.tick(i % 40 === 0 ? aimFire((i / 40) % 13, (i / 20) % 13) : []);
      }
      return s.hash();
    };
    expect(script(42)).toBe(script(42));
    expect(script(42)).not.toBe(script(43));
  });

  it('plays every shipped tutorial level without throwing', () => {
    const times = [15, 20, 30];
    for (const [w, l] of [
      [1, 1],
      [1, 11],
      [1, 16],
      [2, 8],
      [3, 16],
    ] as const) {
      const text = readFileSync(join(LEVELS_DIR, `level${w}-${l}.sll`), 'latin1');
      const data = parseSll(text, { world: w, level: l, timeToBeat: times[l % 3] ?? 30 });
      const s = new GameSession(data, w * 100 + l);
      for (let i = 0; i < 1200 && s.status === 'playing'; i++) {
        s.tick(i % 30 === 0 ? aimFire((i / 30) % 13, (i / 15) % 13) : []);
      }
      expect(s.hash()).toHaveLength(8);
    }
  });
});
