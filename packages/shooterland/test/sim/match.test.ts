import { describe, expect, it } from 'vitest';
import { GRID_SIZE } from '../../src/core/constants';
import { Grid } from '../../src/core/grid';
import { collectCombo, countGroup, findCombos } from '../../src/core/sim/match';
import type { CellView } from '../../src/core/sim/projectile';
import { TileId } from '../../src/core/types';

function board(
  cells: (readonly [number, number, number])[],
  dying: [number, number][] = [],
): CellView {
  const grid = new Grid();
  for (const [col, row, id] of cells) grid.set(col, row, id);
  const dead = new Set(dying.map(([c, r]) => r * GRID_SIZE + c));
  return { get: (c, r) => grid.get(c, r), isDying: (c, r) => dead.has(r * GRID_SIZE + c) };
}

describe('combo matching', () => {
  it('finds orthogonally connected groups of at least the minimum', () => {
    const v = board([
      [2, 2, TileId.Thingie1],
      [3, 2, TileId.Thingie1],
      [4, 2, TileId.Thingie1],
      [4, 3, TileId.Thingie1],
      [6, 6, TileId.Thingie2],
      [7, 7, TileId.Thingie2], // diagonal: not connected
    ]);
    const combos = findCombos(v, 3);
    expect(combos.map((c) => c.size)).toEqual([4, 4, 4, 4]); // every member of the group is a seed
    expect(countGroup(v, 6, 6, TileId.Thingie2, false)).toBe(1);
    expect(findCombos(v, 5)).toEqual([]);
  });

  it('ignores cells being destroyed unless asked to include them', () => {
    const v = board(
      [
        [2, 2, TileId.Thingie1],
        [3, 2, TileId.Thingie1],
        [4, 2, TileId.Thingie1],
      ],
      [[4, 2]],
    );
    expect(countGroup(v, 2, 2, TileId.Thingie1, false)).toBe(2);
    expect(countGroup(v, 2, 2, TileId.Thingie1, true)).toBe(3);
    // A dying seed still counts itself, as the exe does.
    expect(countGroup(v, 4, 2, TileId.Thingie1, false)).toBe(3);
  });

  it('collects the cleared cells and flags their four neighbours', () => {
    const v = board([
      [2, 2, TileId.Thingie1],
      [3, 2, TileId.Thingie1],
      [4, 2, TileId.Thingie1],
    ]);
    const { cells, flagged } = collectCombo(v, 2, 2, TileId.Thingie1);
    expect(cells).toHaveLength(3);
    const at = (c: number, r: number): number => flagged[r * GRID_SIZE + c] ?? 0;
    expect(at(2, 1)).toBe(1);
    expect(at(5, 2)).toBe(1);
    expect(at(1, 2)).toBe(1);
    expect(at(1, 1)).toBe(0); // diagonal corner is not adjacent
  });
});
