import { Grid } from '../grid';
import type { EnemyRule } from '../rules';
import { DIR_DELTA, enemyKind, isEnemy, isEnemyBlock, isThingie } from '../tiles';
import type { Dir, EnemyKind, GridPos } from '../types';
import { TileId } from '../types';

export interface WeightResult {
  /** Where the weight came to rest (its cell before pushing started if nothing moved). */
  readonly restAt: GridPos;
  /** Final positions of thingies that were pushed, for combo matching. */
  readonly movedThingies: GridPos[];
  /** Enemies crushed, nearest first. */
  readonly crushed: { pos: GridPos; kind: EnemyKind }[];
  /** Number of cells the weight advanced while pushing. */
  readonly pushedDistance: number;
}

/** Objects a weight can shove along: everything that is not an enemy, an enemy block or empty. */
export function isPushable(id: number): boolean {
  return id !== TileId.Empty && !isEnemy(id) && !isEnemyBlock(id);
}

/**
 * Applies a weight of `size` that has stopped at `at` moving in `dir`
 * (tutorials 1-11 to 1-13): it pushes the contiguous run of movable objects
 * ahead of it, one cell at a time, as long as the run holds at most `size`
 * objects and the cell beyond the run is empty. When pushing stops, it crushes
 * up to `size` consecutive enemies immediately beyond the run, nearest first,
 * skipping none: an enemy its rule cannot crush ends the crushing.
 * The exact original algorithm is unverified (docs/GAPS.md G6).
 */
export function applyWeight(
  grid: Grid,
  at: GridPos,
  dir: Dir,
  size: number,
  rules: Readonly<Record<EnemyKind, EnemyRule>>,
): WeightResult {
  const d = DIR_DELTA[dir];
  let pos = { ...at };
  const movedIds = new Map<string, number>();
  let pushedDistance = 0;
  let tooHeavy = false;

  for (;;) {
    const chain: GridPos[] = [];
    let c = { col: pos.col + d.dc, row: pos.row + d.dr };
    while (Grid.inBounds(c.col, c.row) && isPushable(grid.get(c.col, c.row))) {
      chain.push(c);
      c = { col: c.col + d.dc, row: c.row + d.dr };
    }
    if (chain.length > size) {
      tooHeavy = true;
      break;
    }
    if (chain.length === 0) break;
    if (!Grid.inBounds(c.col, c.row) || grid.get(c.col, c.row) !== TileId.Empty) break;
    for (let i = chain.length - 1; i >= 0; i--) {
      const from = chain[i];
      if (!from) continue;
      const id = grid.get(from.col, from.row);
      grid.set(from.col + d.dc, from.row + d.dr, id);
      grid.set(from.col, from.row, TileId.Empty);
      movedIds.delete(`${from.col},${from.row}`);
      movedIds.set(`${from.col + d.dc},${from.row + d.dr}`, id);
    }
    pos = { col: pos.col + d.dc, row: pos.row + d.dr };
    pushedDistance++;
  }

  // Crush phase: walk past the (now stationary) chain and squash enemies in a row.
  let c = { col: pos.col + d.dc, row: pos.row + d.dr };
  while (Grid.inBounds(c.col, c.row) && isPushable(grid.get(c.col, c.row))) {
    c = { col: c.col + d.dc, row: c.row + d.dr };
  }
  // A run longer than the weight can shift also shields whatever is behind it (1-13).
  const crushed: { pos: GridPos; kind: EnemyKind }[] = [];
  while (!tooHeavy && crushed.length < size && Grid.inBounds(c.col, c.row)) {
    const kind = enemyKind(grid.get(c.col, c.row));
    if (!kind || !rules[kind].weight) break;
    crushed.push({ pos: c, kind });
    c = { col: c.col + d.dc, row: c.row + d.dr };
  }

  const movedThingies: GridPos[] = [];
  for (const [key, id] of movedIds) {
    if (!isThingie(id)) continue;
    const [col, row] = key.split(',').map(Number);
    movedThingies.push({ col: col ?? 0, row: row ?? 0 });
  }
  return { restAt: pos, movedThingies, crushed, pushedDistance };
}
