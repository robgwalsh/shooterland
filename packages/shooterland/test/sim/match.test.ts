import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/core/grid';
import { findCombos } from '../../src/core/sim/match';
import { TileId } from '../../src/core/types';

describe('findCombos', () => {
  it('finds a horizontal line of three', () => {
    const g = new Grid();
    for (const c of [3, 4, 5]) g.set(c, 6, TileId.Thingie2);
    const combos = findCombos(g, [{ col: 5, row: 6 }]);
    expect(combos).toHaveLength(1);
    expect(combos[0]?.kind).toBe(TileId.Thingie2);
    expect(combos[0]?.cells).toHaveLength(3);
  });

  it('ignores pairs and diagonals', () => {
    const g = new Grid();
    g.set(3, 6, TileId.Thingie2);
    g.set(4, 6, TileId.Thingie2);
    g.set(5, 7, TileId.Thingie2);
    expect(findCombos(g, [{ col: 4, row: 6 }])).toHaveLength(0);
  });

  it('finds L and plus shapes of mixed length', () => {
    const g = new Grid();
    g.set(4, 1, TileId.Thingie1);
    g.set(3, 2, TileId.Thingie1);
    g.set(4, 2, TileId.Crony);
    g.set(5, 2, TileId.Thingie1);
    g.set(4, 3, TileId.Thingie1);
    // The plus around the crony is four separate singles: no combo yet.
    expect(findCombos(g, [{ col: 4, row: 1 }])).toHaveLength(0);
    // Add a row that connects two arms through the top.
    g.set(3, 1, TileId.Thingie1);
    g.set(5, 1, TileId.Thingie1);
    const combos = findCombos(g, [{ col: 4, row: 1 }]);
    expect(combos).toHaveLength(1);
    expect(combos[0]?.cells).toHaveLength(5);
  });

  it('returns one group when two seeds share it and separate groups otherwise', () => {
    const g = new Grid();
    for (const c of [0, 1, 2]) g.set(c, 0, TileId.Thingie3);
    for (const c of [10, 11, 12]) g.set(c, 12, TileId.Thingie4);
    const combos = findCombos(g, [
      { col: 0, row: 0 },
      { col: 2, row: 0 },
      { col: 12, row: 12 },
    ]);
    expect(combos.map((c) => c.kind)).toEqual([TileId.Thingie3, TileId.Thingie4]);
  });
});
