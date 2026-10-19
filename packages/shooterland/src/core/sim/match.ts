import { GRID_SIZE } from '../constants';
import type { Grid } from '../grid';
import { isThingie } from '../tiles';
import type { GridPos } from '../types';

export interface Combo {
  readonly kind: number;
  readonly cells: readonly GridPos[];
}

const MIN_COMBO = 3;

/**
 * Finds groups of three or more orthogonally connected identical thingies
 * that include at least one of `seeds`. Each group is returned once.
 */
export function findCombos(grid: Grid, seeds: readonly GridPos[]): Combo[] {
  const visited = new Uint8Array(GRID_SIZE * GRID_SIZE);
  const combos: Combo[] = [];
  for (const seed of seeds) {
    const kind = grid.get(seed.col, seed.row);
    if (!isThingie(kind) || visited[seed.row * GRID_SIZE + seed.col]) continue;
    const cells: GridPos[] = [];
    const stack: GridPos[] = [seed];
    visited[seed.row * GRID_SIZE + seed.col] = 1;
    while (stack.length > 0) {
      const p = stack.pop();
      if (!p) break;
      cells.push(p);
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const c = p.col + dc;
        const r = p.row + dr;
        if (c < 0 || r < 0 || c >= GRID_SIZE || r >= GRID_SIZE) continue;
        const i = r * GRID_SIZE + c;
        if (visited[i] || grid.get(c, r) !== kind) continue;
        visited[i] = 1;
        stack.push({ col: c, row: r });
      }
    }
    if (cells.length >= MIN_COMBO) combos.push({ kind, cells });
    // Groups below the minimum stay marked visited: they cannot grow from another seed.
  }
  return combos;
}
