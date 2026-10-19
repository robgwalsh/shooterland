import { GRID_SIZE } from './constants';
import { type GridPos, TileId } from './types';

/** The 13x13 board. Cells hold tile ids; -1 is empty. */
export class Grid {
  readonly cells: Int8Array;

  constructor(cells?: ArrayLike<number>) {
    this.cells = new Int8Array(GRID_SIZE * GRID_SIZE);
    if (cells) {
      if (cells.length !== this.cells.length) {
        throw new Error(`grid needs ${this.cells.length} cells, got ${cells.length}`);
      }
      this.cells.set(cells);
    } else {
      this.cells.fill(TileId.Empty);
    }
  }

  static inBounds(col: number, row: number): boolean {
    return col >= 0 && row >= 0 && col < GRID_SIZE && row < GRID_SIZE;
  }

  get(col: number, row: number): number {
    if (!Grid.inBounds(col, row)) return TileId.Empty;
    return this.cells[row * GRID_SIZE + col] ?? TileId.Empty;
  }

  set(col: number, row: number, id: number): void {
    if (!Grid.inBounds(col, row)) throw new RangeError(`cell (${col},${row}) is off the grid`);
    this.cells[row * GRID_SIZE + col] = id;
  }

  isEmpty(col: number, row: number): boolean {
    return Grid.inBounds(col, row) && this.get(col, row) === TileId.Empty;
  }

  clone(): Grid {
    return new Grid(this.cells);
  }

  count(predicate: (id: number) => boolean): number {
    let n = 0;
    for (const id of this.cells) if (predicate(id)) n++;
    return n;
  }

  *positions(predicate?: (id: number) => boolean): IterableIterator<GridPos & { id: number }> {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const id = this.cells[row * GRID_SIZE + col] ?? TileId.Empty;
        if (!predicate || predicate(id)) yield { col, row, id };
      }
    }
  }
}
