import { GRID_SIZE } from '../constants';
import { DIR_DELTA, deflect, isRamp } from '../tiles';
import { type Dir, type GridPos, type ShooterSide, TileId } from '../types';

/** What the stepping rules need to know about the board. */
export interface CellView {
  get(col: number, row: number): number;
  /** True while a destroyed tile is still animating (passable, docs/RULES.md). */
  isDying(col: number, row: number): boolean;
}

export interface Projectile {
  readonly id: number;
  /** Global lane 0..5: Mary's three lanes, then Poindexter's. */
  readonly lane: number;
  readonly shooter: ShooterSide;
  /** 0..size-1 within its shooter. */
  readonly laneIndex: number;
  readonly ammo: number;
  /** Current cell. Starts one cell outside the grid at the shooter. */
  col: number;
  row: number;
  dir: Dir;
  /** Cells entered so far, oldest first (used to back up when a cell is taken). */
  readonly path: GridPos[];
}

export function inBounds(col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < GRID_SIZE && row < GRID_SIZE;
}

/**
 * Whether a shot may enter a cell (`FUN_0040a9ab`): empty cells, cells whose
 * contents are being destroyed and, when `mineIsFree`, land mines.
 */
export function isFree(view: CellView, col: number, row: number, mineIsFree: boolean): boolean {
  if (!inBounds(col, row)) return false;
  if (view.isDying(col, row)) return true;
  const id = view.get(col, row);
  if (id === TileId.Empty) return true;
  return mineIsFree && id === TileId.Mine;
}

export interface StepTarget {
  readonly col: number;
  readonly row: number;
  readonly dir: Dir;
}

/**
 * The cell a shot at (col,row) moving in `dir` occupies after one step
 * (`FUN_0040a38b`). Ramps are crossed within the step: entering an open edge
 * continues from the ramp in the new direction, and if that leads nowhere the
 * shot stays put in its old direction. With `blocking` false the shot moves
 * regardless of what is in the next cell (used for blast targets and weight
 * paths). Returns the same position when the shot cannot move.
 */
export function nextCell(
  view: CellView,
  col: number,
  row: number,
  dir: Dir,
  blocking: boolean,
  ramps: boolean,
): StepTarget {
  const d = DIR_DELTA[dir];
  const nc = col + d.dc;
  const nr = row + d.dr;
  const limit =
    (dir === 'up' && row > 0) ||
    (dir === 'left' && col > 0) ||
    (dir === 'down' && row < GRID_SIZE - 1) ||
    (dir === 'right' && col < GRID_SIZE - 1);
  if (!limit) return { col, row, dir };

  const id = inBounds(nc, nr) ? view.get(nc, nr) : TileId.Empty;
  if (ramps && isRamp(id)) {
    const out = deflect(id, dir);
    if (out) {
      const r = nextCell(view, nc, nr, out, blocking, true);
      if (r.col === nc && r.row === nr) return { col, row, dir };
      return r;
    }
  }
  if (!blocking || isFree(view, nc, nr, true)) return { col: nc, row: nr, dir };
  return { col, row, dir };
}

/** Creates a projectile at the shooter's muzzle, one cell outside the board. */
export function spawnProjectile(
  id: number,
  shooter: ShooterSide,
  laneIndex: number,
  position: number,
  ammo: number,
): Projectile {
  const bottom = shooter === 'bottom';
  return {
    id,
    lane: bottom ? laneIndex : 3 + laneIndex,
    shooter,
    laneIndex,
    ammo,
    col: bottom ? position + laneIndex : GRID_SIZE,
    row: bottom ? GRID_SIZE : position + laneIndex,
    dir: bottom ? 'up' : 'left',
    path: [],
  };
}
