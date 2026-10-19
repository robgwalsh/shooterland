import { isEnemyBlock } from '../tiles';
import type { Dir, GridPos } from '../types';
import { type CellView, isFree, nextCell } from './projectile';

export interface WeightPath {
  /** The weight's own cell, then every cell ahead up to and including where the walk stopped. */
  readonly path: GridPos[];
  /** Occupied cells between the weight and the free cell that ends the run; Infinity when the run ends at the board edge or an enemy block. */
  readonly run: number;
}

/**
 * Walks ahead of a stopped weight (`FUN_0040ac8a`): through occupied cells
 * until a free cell (land mines count as free), the board edge or an enemy
 * block. The free cell is included in the path so the run can shift into it.
 */
export function walkWeightPath(view: CellView, start: GridPos, dir: Dir): WeightPath {
  const path: GridPos[] = [start];
  let pos = start;
  let d = dir;
  for (let guard = 0; guard < 64; guard++) {
    const n = nextCell(view, pos.col, pos.row, d, false, true);
    const cell = { col: n.col, row: n.row };
    path.push(cell);
    if (n.col === pos.col && n.row === pos.row) return { path, run: Number.POSITIVE_INFINITY };
    if (isEnemyBlock(view.get(n.col, n.row))) return { path, run: Number.POSITIVE_INFINITY };
    if (isFree(view, n.col, n.row, true)) return { path, run: path.length - 2 };
    pos = cell;
    d = n.dir;
  }
  return { path, run: Number.POSITIVE_INFINITY };
}
