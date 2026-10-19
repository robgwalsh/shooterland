import { describe, expect, it } from 'vitest';
import { GRID_SIZE } from '../../src/core/constants';
import { Grid } from '../../src/core/grid';
import { type CellView, isFree, nextCell, spawnProjectile } from '../../src/core/sim/projectile';
import { walkWeightPath } from '../../src/core/sim/weight';
import { TileId } from '../../src/core/types';

function board(cells: (readonly [number, number, number])[], dying: GridPos[] = []): CellView {
  const grid = new Grid();
  for (const [col, row, id] of cells) grid.set(col, row, id);
  const dead = new Set(dying.map((p) => p.row * GRID_SIZE + p.col));
  return {
    get: (c, r) => grid.get(c, r),
    isDying: (c, r) => dead.has(r * GRID_SIZE + c),
  };
}
type GridPos = { col: number; row: number };

describe('nextCell', () => {
  it('moves one cell into free space and stops before an obstacle', () => {
    const v = board([[4, 5, TileId.GreyBlock]]);
    expect(nextCell(v, 4, 8, 'up', true, true)).toEqual({ col: 4, row: 7, dir: 'up' });
    expect(nextCell(v, 4, 6, 'up', true, true)).toEqual({ col: 4, row: 6, dir: 'up' });
    expect(nextCell(v, 4, 0, 'up', true, true)).toEqual({ col: 4, row: 0, dir: 'up' }); // edge
  });

  it('enters the board from the muzzle cell outside it', () => {
    const v = board([]);
    const p = spawnProjectile(1, 'bottom', 0, 6, TileId.Thingie1);
    expect([p.col, p.row, p.dir]).toEqual([6, 13, 'up']);
    expect(nextCell(v, p.col, p.row, p.dir, true, true)).toEqual({ col: 6, row: 12, dir: 'up' });
    const q = spawnProjectile(2, 'right', 1, 2, TileId.Thingie1);
    expect([q.col, q.row, q.dir]).toEqual([13, 3, 'left']);
  });

  it('passes through cells whose contents are being destroyed, and into mines', () => {
    const v = board([[4, 5, TileId.Crony]], [{ col: 4, row: 5 }]);
    expect(nextCell(v, 4, 6, 'up', true, true)).toEqual({ col: 4, row: 5, dir: 'up' });
    const m = board([[4, 5, TileId.Mine]]);
    expect(isFree(m, 4, 5, true)).toBe(true);
    expect(isFree(m, 4, 5, false)).toBe(false);
    expect(nextCell(m, 4, 6, 'up', true, true)).toEqual({ col: 4, row: 5, dir: 'up' });
  });

  it('deflects through ramps in one step, exactly as the exe table says', () => {
    // Moving up: 18 turns left, 19 turns right.
    expect(nextCell(board([[4, 5, TileId.RampBottomLeft]]), 4, 6, 'up', true, true)).toEqual({
      col: 3,
      row: 5,
      dir: 'left',
    });
    expect(nextCell(board([[4, 5, TileId.RampBottomRight]]), 4, 6, 'up', true, true)).toEqual({
      col: 5,
      row: 5,
      dir: 'right',
    });
    // Moving left: 17 turns up, 19 turns down.
    expect(nextCell(board([[4, 5, TileId.RampTopRight]]), 5, 5, 'left', true, true)).toEqual({
      col: 4,
      row: 4,
      dir: 'up',
    });
    expect(nextCell(board([[4, 5, TileId.RampBottomRight]]), 5, 5, 'left', true, true)).toEqual({
      col: 4,
      row: 6,
      dir: 'down',
    });
    // Moving down: 16 turns left, 17 turns right. Moving right: 16 turns up, 18 turns down.
    expect(nextCell(board([[4, 5, TileId.RampTopLeft]]), 4, 4, 'down', true, true).dir).toBe(
      'left',
    );
    expect(nextCell(board([[4, 5, TileId.RampTopRight]]), 4, 4, 'down', true, true).dir).toBe(
      'right',
    );
    expect(nextCell(board([[4, 5, TileId.RampTopLeft]]), 3, 5, 'right', true, true).dir).toBe('up');
    expect(nextCell(board([[4, 5, TileId.RampBottomLeft]]), 3, 5, 'right', true, true).dir).toBe(
      'down',
    );
  });

  it('treats flat sides as walls and stops before a ramp whose exit is blocked', () => {
    // 16 is open at the top and left: approaching from below hits a flat side.
    const flat = board([[4, 5, TileId.RampTopLeft]]);
    expect(nextCell(flat, 4, 6, 'up', true, true)).toEqual({ col: 4, row: 6, dir: 'up' });
    // 18 would send an upward shot left, but the exit is blocked.
    const blocked = board([
      [4, 5, TileId.RampBottomLeft],
      [3, 5, TileId.GreyBlock],
    ]);
    expect(nextCell(blocked, 4, 6, 'up', true, true)).toEqual({ col: 4, row: 6, dir: 'up' });
    // Without blocking (blast targets) the shot goes through anyway.
    expect(nextCell(blocked, 4, 6, 'up', false, true)).toEqual({ col: 3, row: 5, dir: 'left' });
  });

  it('chains ramps across consecutive steps', () => {
    const v = board([
      [4, 5, TileId.RampBottomLeft],
      [2, 5, TileId.RampBottomRight],
    ]);
    // Up into 18 -> left, one cell past the ramp; then left into 19 -> down.
    const first = nextCell(v, 4, 6, 'up', true, true);
    expect(first).toEqual({ col: 3, row: 5, dir: 'left' });
    expect(nextCell(v, first.col, first.row, first.dir, true, true)).toEqual({
      col: 2,
      row: 6,
      dir: 'down',
    });
    // A ramp directly beside another is crossed in the same step.
    const adjacent = board([
      [4, 5, TileId.RampBottomLeft],
      [3, 5, TileId.RampBottomRight],
    ]);
    expect(nextCell(adjacent, 4, 6, 'up', true, true)).toEqual({ col: 3, row: 6, dir: 'down' });
  });
});

describe('walkWeightPath', () => {
  it('collects the run ahead and the free cell that ends it', () => {
    const v = board([
      [4, 5, TileId.GreyBlock],
      [4, 4, TileId.Crony],
    ]);
    const { path, run } = walkWeightPath(v, { col: 4, row: 6 }, 'up');
    expect(run).toBe(2);
    expect(path).toEqual([
      { col: 4, row: 6 },
      { col: 4, row: 5 },
      { col: 4, row: 4 },
      { col: 4, row: 3 },
    ]);
  });

  it('reports an immovable run at the board edge or an enemy block', () => {
    expect(walkWeightPath(board([[4, 0, TileId.GreyBlock]]), { col: 4, row: 1 }, 'up').run).toBe(
      Number.POSITIVE_INFINITY,
    );
    const v = board([
      [4, 5, TileId.GreyBlock],
      [4, 4, TileId.CronyBlock],
    ]);
    expect(walkWeightPath(v, { col: 4, row: 6 }, 'up').run).toBe(Number.POSITIVE_INFINITY);
  });

  it('stops at a land mine as if it were free', () => {
    const v = board([
      [4, 5, TileId.Skully],
      [4, 4, TileId.Mine],
    ]);
    const { path, run } = walkWeightPath(v, { col: 4, row: 6 }, 'up');
    expect(run).toBe(1);
    expect(path.at(-1)).toEqual({ col: 4, row: 4 });
  });
});
