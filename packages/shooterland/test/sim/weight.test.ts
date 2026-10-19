import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/core/grid';
import { DEFAULT_RULES } from '../../src/core/rules';
import { applyWeight } from '../../src/core/sim/weight';
import { TileId } from '../../src/core/types';

const rules = DEFAULT_RULES.enemies;

describe('applyWeight', () => {
  it('level 1-11: a 1-weight pushes one block into a crony and crushes it', () => {
    const g = new Grid();
    g.set(0, 0, TileId.Crony);
    g.set(1, 0, TileId.GreyBlock);
    // Weight came along row 0 from the right and stopped at (2,0).
    const r = applyWeight(g, { col: 2, row: 0 }, 'left', 1, rules);
    expect(r.pushedDistance).toBe(0); // the block cannot move: the crony is behind it
    expect(r.crushed).toEqual([{ pos: { col: 0, row: 0 }, kind: 'crony' }]);
    expect(g.get(1, 0)).toBe(TileId.GreyBlock);
    expect(r.restAt).toEqual({ col: 2, row: 0 });
  });

  it('level 1-13: three blocks need a 3-weight', () => {
    const g = new Grid();
    g.set(8, 8, TileId.Crony);
    for (const c of [9, 10, 11]) g.set(c, 8, TileId.GreyBlock);
    expect(applyWeight(g.clone(), { col: 12, row: 8 }, 'left', 2, rules).crushed).toHaveLength(0);
    expect(applyWeight(g.clone(), { col: 12, row: 8 }, 'left', 3, rules).crushed).toHaveLength(1);
  });

  it('keeps pushing a short chain until it is blocked, carrying thingies along', () => {
    const g = new Grid();
    g.set(0, 8, TileId.Thingie4); // level 1-11, column 0
    g.set(0, 5, TileId.Thingie5);
    g.set(0, 1, TileId.GreyBlock);
    g.set(0, 0, TileId.Crony);
    const r = applyWeight(g, { col: 0, row: 9 }, 'up', 2, rules);
    // Chain grows to [4,5] at rows 5/4 ... then to 3 objects at the block: stop with 2 pushed up to the block.
    expect(g.get(0, 2)).toBe(TileId.Thingie5);
    expect(g.get(0, 3)).toBe(TileId.Thingie4);
    expect(g.get(0, 1)).toBe(TileId.GreyBlock);
    expect(r.restAt).toEqual({ col: 0, row: 4 });
    expect(r.movedThingies).toHaveLength(2);
    expect(r.crushed).toHaveLength(0); // the chain is 3 long at the block, so no crush reaches the crony
  });

  it('crushes up to N consecutive enemies, nearest first, and stops at an uncrushable one', () => {
    const g = new Grid();
    g.set(5, 5, TileId.Crony);
    g.set(4, 5, TileId.Crazy);
    g.set(3, 5, TileId.Fatty);
    g.set(2, 5, TileId.Crony);
    const strict = { ...rules, fatty: { ...rules.fatty, weight: false } };
    const r = applyWeight(g, { col: 6, row: 5 }, 'left', 3, strict);
    expect(r.crushed.map((c) => c.kind)).toEqual(['crony', 'crazy']);
  });

  it('never pushes enemy blocks and never crushes through them', () => {
    const g = new Grid();
    g.set(6, 3, TileId.BrownBlock);
    g.set(6, 2, TileId.CronyBlock);
    g.set(6, 1, TileId.Crony);
    const r = applyWeight(g, { col: 6, row: 4 }, 'up', 3, rules);
    expect(r.pushedDistance).toBe(0);
    expect(r.crushed).toHaveLength(0);
  });
});
