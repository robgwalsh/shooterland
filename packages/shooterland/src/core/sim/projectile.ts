import { GRID_SIZE } from '../constants';
import type { Grid } from '../grid';
import { DIR_DELTA, deflect, isRamp } from '../tiles';
import { type Dir, type GridPos, type ShooterSide, TileId } from '../types';

export interface Projectile {
  readonly id: number;
  readonly shooter: ShooterSide;
  /** The column (bottom shooter) or row (right shooter) it was fired along. */
  readonly lane: number;
  readonly ammo: number;
  /** Current cell. Starts one cell outside the grid at the shooter. */
  col: number;
  row: number;
  dir: Dir;
  /** Fractional cells travelled since the last step. */
  progress: number;
  /** Cells visited, for presentation. */
  readonly path: GridPos[];
}

export type StepResult =
  | { readonly type: 'moved' }
  | { readonly type: 'deflected'; readonly ramp: GridPos }
  /** Stopped in its current cell, which is empty and in bounds. */
  | { readonly type: 'land'; readonly at: GridPos }
  /** Reached an obstacle it reacts to (bomb, weight): `target` is the obstacle cell. */
  | { readonly type: 'impact'; readonly at: GridPos; readonly target: GridPos }
  /** Would leave the grid or has nowhere to stop; the shot is gone. */
  | { readonly type: 'lost' };

/** Creates a projectile at the shooter's muzzle, one cell outside the board. */
export function spawnProjectile(
  id: number,
  shooter: ShooterSide,
  lane: number,
  ammo: number,
): Projectile {
  const bottom = shooter === 'bottom';
  return {
    id,
    shooter,
    lane,
    ammo,
    col: bottom ? lane : GRID_SIZE,
    row: bottom ? GRID_SIZE : lane,
    dir: bottom ? 'up' : 'left',
    progress: 0,
    path: [],
  };
}

/** The first cell a shot along `lane` would enter. */
export function muzzleCell(shooter: ShooterSide, lane: number): GridPos {
  return shooter === 'bottom'
    ? { col: lane, row: GRID_SIZE - 1 }
    : { col: GRID_SIZE - 1, row: lane };
}

function reactsToObstacle(ammo: number): boolean {
  return ammo === TileId.Bomb || (ammo >= TileId.Weight1 && ammo <= TileId.Weight3);
}

/**
 * Advances a projectile by one cell. Pure with respect to the grid: landing
 * and impacts are reported, not applied, so the session controls ordering.
 */
export function stepProjectile(grid: Grid, p: Projectile): StepResult {
  const d = DIR_DELTA[p.dir];
  const nc = p.col + d.dc;
  const nr = p.row + d.dr;
  const here: GridPos = { col: p.col, row: p.row };
  const inside = p.col >= 0 && p.row >= 0 && p.col < GRID_SIZE && p.row < GRID_SIZE;

  if (nc < 0 || nr < 0 || nc >= GRID_SIZE || nr >= GRID_SIZE) {
    // Off the board: stop here if we can, otherwise the shot is gone.
    return inside && grid.isEmpty(p.col, p.row) ? { type: 'land', at: here } : { type: 'lost' };
  }

  const next = grid.get(nc, nr);
  if (next === TileId.Empty) {
    p.col = nc;
    p.row = nr;
    p.path.push({ col: nc, row: nr });
    return { type: 'moved' };
  }

  if (isRamp(next)) {
    const out = deflect(next, p.dir);
    if (out) {
      p.col = nc;
      p.row = nr;
      p.dir = out;
      p.path.push({ col: nc, row: nr });
      return { type: 'deflected', ramp: { col: nc, row: nr } };
    }
  }

  // Blocked by whatever is in the next cell.
  if (reactsToObstacle(p.ammo)) {
    return { type: 'impact', at: here, target: { col: nc, row: nr } };
  }
  return inside && grid.isEmpty(p.col, p.row) ? { type: 'land', at: here } : { type: 'lost' };
}
