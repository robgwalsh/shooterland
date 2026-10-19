import { GRID_SIZE } from '../constants';
import { isThingie } from '../tiles';
import type { GridPos } from '../types';
import type { CellView } from './projectile';

const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * Size of the group of `kind` thingies connected to (col,row)
 * (`FUN_0040c85e`). Cells being destroyed do not join the group unless
 * `includeDying` is set, matching the two counters the exe uses; the seed
 * itself always counts.
 */
export function countGroup(
  view: CellView,
  col: number,
  row: number,
  kind: number,
  includeDying: boolean,
): number {
  const visited = new Uint8Array(GRID_SIZE * GRID_SIZE);
  const stack: GridPos[] = [{ col, row }];
  visited[row * GRID_SIZE + col] = 1;
  let n = 0;
  while (stack.length > 0) {
    const p = stack.pop();
    if (!p) break;
    n++;
    for (const [dc, dr] of NEIGHBOURS) {
      const c = p.col + dc;
      const r = p.row + dr;
      if (c < 0 || r < 0 || c >= GRID_SIZE || r >= GRID_SIZE) continue;
      const i = r * GRID_SIZE + c;
      if (visited[i] || view.get(c, r) !== kind) continue;
      if (!includeDying && view.isDying(c, r)) continue;
      visited[i] = 1;
      stack.push({ col: c, row: r });
    }
  }
  return n;
}

export interface ComboClear {
  /** Every cell of the group (dying members included, as the exe re-clears them). */
  readonly cells: GridPos[];
  /** 13x13 flags: the four neighbours of every cleared cell (`DAT_00416bb4`). */
  readonly flagged: Uint8Array;
}

/** The cells a combo seeded at (col,row) clears and the neighbours it flags (`FUN_0040cbac`). */
export function collectCombo(view: CellView, col: number, row: number, kind: number): ComboClear {
  const visited = new Uint8Array(GRID_SIZE * GRID_SIZE);
  const flagged = new Uint8Array(GRID_SIZE * GRID_SIZE);
  const cells: GridPos[] = [];
  const stack: GridPos[] = [{ col, row }];
  visited[row * GRID_SIZE + col] = 1;
  while (stack.length > 0) {
    const p = stack.pop();
    if (!p) break;
    cells.push(p);
    flagged[p.row * GRID_SIZE + p.col] = 1;
    for (const [dc, dr] of NEIGHBOURS) {
      const c = p.col + dc;
      const r = p.row + dr;
      if (c < 0 || r < 0 || c >= GRID_SIZE || r >= GRID_SIZE) continue;
      const i = r * GRID_SIZE + c;
      flagged[i] = 1;
      if (visited[i] || view.get(c, r) !== kind) continue;
      visited[i] = 1;
      stack.push({ col: c, row: r });
    }
  }
  return { cells, flagged };
}

/** Thingie groups of at least `min` cells, scanned row by row as the exe does. */
export function findCombos(
  view: CellView,
  min: number,
): { col: number; row: number; kind: number; size: number }[] {
  const out: { col: number; row: number; kind: number; size: number }[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const kind = view.get(col, row);
      if (!isThingie(kind)) continue;
      const size = countGroup(view, col, row, kind, false);
      if (size >= min) out.push({ col, row, kind, size });
    }
  }
  return out;
}
