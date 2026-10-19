import { describe, expect, it } from 'vitest';
import { GRID_SIZE } from '../../src/core/constants';
import type { LevelData } from '../../src/core/level/LevelData';
import { DEFAULT_RULES, type Rules } from '../../src/core/rules';
import { GameSession, type SessionEvent } from '../../src/core/sim/GameSession';
import { TileId } from '../../src/core/types';

const QUIET: Rules = { ...DEFAULT_RULES, bombChance: 0 };

/** A board with an unreachable Skully in the bottom-right corner (so never aim lane 12 at it) so the level is never won mid-test. */
function level(cells: (readonly [number, number, number])[]): LevelData {
  const grid = new Array<number>(GRID_SIZE * GRID_SIZE).fill(TileId.Empty);
  grid[12 * GRID_SIZE + 12] = TileId.Skully;
  for (const [col, row, id] of cells) grid[row * GRID_SIZE + col] = id;
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
  };
}

/** Fires `weight` from one bar (the other fires a harmless thingy along an empty lane), then settles. */
function fireWeight(
  cells: (readonly [number, number, number])[],
  weight: number,
  from: 'bottom' | 'right',
  lane: number,
  otherLane = 0,
): { s: GameSession; events: SessionEvent[] } {
  const s = new GameSession(level(cells), 1, QUIET);
  s.setLaneAmmo(from, 0, [weight]);
  s.setLaneAmmo(from === 'bottom' ? 'right' : 'bottom', 0, [TileId.Thingie6]);
  const aim =
    from === 'bottom' ? { bottom: lane, right: otherLane } : { bottom: otherLane, right: lane };
  const events: SessionEvent[] = [];
  events.push(...s.tick([{ t: 'aim', ...aim }, { t: 'fire' }]));
  for (let i = 0; i < 300 && s.inFlight.length > 0; i++) events.push(...s.tick());
  return { s, events };
}

const killsByWeight = (events: SessionEvent[]): number =>
  events.filter((e) => e.t === 'enemyKilled' && e.by === 'weight').length;

describe('weights (tutorials 1-11 to 1-13)', () => {
  it('1-11: a 1-weight shoves the block into the corner and crushes the Crony hiding behind it', () => {
    // The level's top-left corner: Crony at (0,0), grey blocks at (1,0) and (0,1).
    const corner: (readonly [number, number, number])[] = [
      [0, 0, TileId.Crony],
      [1, 0, TileId.GreyBlock],
      [0, 1, TileId.GreyBlock],
    ];
    const { s, events } = fireWeight(corner, TileId.Weight1, 'bottom', 0, 11);
    expect(killsByWeight(events)).toBe(1);
    expect(s.grid.get(0, 0)).toBe(TileId.GreyBlock);
    expect(s.enemies.crony).toBe(0);
    // The weight itself lands where it stopped and vanishes with the pop animation.
    expect(s.grid.get(0, 1)).toBe(TileId.Weight1);
    expect(s.grid.count((id) => id >= TileId.Weight1 && id <= TileId.HeavyWeight)).toBe(1);
    for (let i = 0; i < 40; i++) s.tick();
    expect(s.grid.count((id) => id >= TileId.Weight1 && id <= TileId.HeavyWeight)).toBe(0);
  });

  it('1-12: a 2-weight pushes block and Crony to the wall one cell per tick, then crushes him', () => {
    // Row 3 of the level: Crony at (3,3) with a grey block at (4,3), shot from the right.
    const { s, events } = fireWeight(
      [
        [3, 3, TileId.Crony],
        [4, 3, TileId.GreyBlock],
      ],
      TileId.Weight2,
      'right',
      3,
    );
    expect(events.filter((e) => e.t === 'weightPushed')).toHaveLength(3);
    expect(killsByWeight(events)).toBe(1);
    expect(s.grid.get(0, 3)).toBe(TileId.GreyBlock);
    expect(s.enemies.crony).toBe(0);
  });

  it('1-12: a Crony two blocks deep inside the cluster needs a weight that can reach him', () => {
    // Column 6 of the level: two blocks, the Crony, two blocks, then free space.
    const cluster: (readonly [number, number, number])[] = [
      [6, 4, TileId.GreyBlock],
      [6, 5, TileId.GreyBlock],
      [6, 6, TileId.Crony],
      [6, 7, TileId.GreyBlock],
      [6, 8, TileId.GreyBlock],
    ];
    // Shot downwards is impossible; from below the run is five objects, too heavy to push.
    expect(fireWeight(cluster, TileId.Weight1, 'bottom', 6, 11).s.enemies.crony).toBe(1);
    expect(fireWeight(cluster, TileId.Weight2, 'bottom', 6, 11).s.enemies.crony).toBe(0);
    expect(fireWeight(cluster, TileId.Weight3, 'bottom', 6, 11).s.enemies.crony).toBe(0);
  });

  it('1-13: a Crony three blocks deep needs a 3-weight', () => {
    // Column 8 of the level, shot from below: three blocks, the Crony, three blocks, free.
    const deep: (readonly [number, number, number])[] = [
      [8, 5, TileId.GreyBlock],
      [8, 6, TileId.GreyBlock],
      [8, 7, TileId.GreyBlock],
      [8, 8, TileId.Crony],
      [8, 9, TileId.GreyBlock],
      [8, 10, TileId.GreyBlock],
      [8, 11, TileId.GreyBlock],
    ];
    expect(fireWeight(deep, TileId.Weight2, 'bottom', 8, 11).s.enemies.crony).toBe(1);
    const { s } = fireWeight(deep, TileId.Weight3, 'bottom', 8, 11);
    expect(s.enemies.crony).toBe(0);
    expect(s.grid.get(8, 8)).toBe(TileId.GreyBlock);
  });

  it('pushes a run no longer than its strength until it is stuck', () => {
    const { s, events } = fireWeight(
      [
        [4, 5, TileId.GreyBlock],
        [4, 4, TileId.BrownBlock],
      ],
      TileId.Weight2,
      'bottom',
      4,
      11,
    );
    expect(events.filter((e) => e.t === 'weightPushed').length).toBe(4);
    expect(s.grid.get(4, 0)).toBe(TileId.BrownBlock);
    expect(s.grid.get(4, 1)).toBe(TileId.GreyBlock);
  });

  it('crushes at most its strength in enemies, nearest first', () => {
    const { s } = fireWeight(
      [
        [4, 0, TileId.Crony],
        [4, 1, TileId.Crony],
        [4, 2, TileId.Crony],
      ],
      TileId.Weight2,
      'bottom',
      4,
      11,
    );
    expect(s.enemies.crony).toBe(1);
    expect(s.grid.get(4, 0)).toBe(TileId.Crony);
  });

  it('only crushes enemies the kill table allows', () => {
    expect(
      fireWeight([[4, 0, TileId.Skully]], TileId.Weight3, 'bottom', 4, 11).s.enemies.skully,
    ).toBe(2);
    expect(
      fireWeight([[4, 0, TileId.Fangie]], TileId.Weight3, 'bottom', 4, 11).s.enemies.fangie,
    ).toBe(1);
    expect(
      fireWeight([[4, 0, TileId.Fatty]], TileId.Weight1, 'bottom', 4, 11).s.enemies.fatty,
    ).toBe(0);
    expect(
      fireWeight([[4, 0, TileId.Crazy]], TileId.Weight1, 'bottom', 4, 11).s.enemies.crazy,
    ).toBe(0);
  });

  it('pushing a Skully into a land mine kills it and sets the mine off', () => {
    const { s, events } = fireWeight(
      [
        [4, 5, TileId.Skully],
        [4, 4, TileId.Mine],
      ],
      TileId.Weight1,
      'bottom',
      4,
      11,
    );
    expect(events.some((e) => e.t === 'mine' && e.by === 'push')).toBe(true);
    expect(
      events.some((e) => e.t === 'enemyKilled' && e.kind === 'skully' && e.by === 'mine'),
    ).toBe(true);
    expect(s.enemies.skully).toBe(1); // only the sentinel remains
    for (let i = 0; i < 40; i++) s.tick();
    expect(s.grid.get(4, 4)).toBe(TileId.Empty);
  });

  it('pushed thingies can form a combo once the weight has settled', () => {
    const { s, events } = fireWeight(
      [
        [4, 5, TileId.Thingie1],
        [3, 4, TileId.Thingie1],
        [5, 4, TileId.Thingie1],
        [4, 3, TileId.GreyBlock], // stops the push after one cell
      ],
      TileId.Weight1,
      'bottom',
      4,
      11,
    );
    expect(events.some((e) => e.t === 'combo')).toBe(true);
    expect(s.money).toBe(1);
  });
});
