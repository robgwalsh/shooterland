import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/core/grid';
import { spawnProjectile, stepProjectile } from '../../src/core/sim/projectile';
import { TileId } from '../../src/core/types';

/** Steps until the projectile finishes; returns the final result and cells visited. */
function fly(grid: Grid, shooter: 'bottom' | 'right', lane: number, ammo: number) {
  const p = spawnProjectile(1, shooter, lane, ammo);
  for (let i = 0; i < 100; i++) {
    const r = stepProjectile(grid, p);
    if (r.type !== 'moved' && r.type !== 'deflected') return { result: r, p };
  }
  throw new Error('projectile never settled');
}

describe('projectile stepping', () => {
  it('flies up an empty column and lands in the top row', () => {
    const { result } = fly(new Grid(), 'bottom', 4, TileId.Thingie1);
    expect(result).toEqual({ type: 'land', at: { col: 4, row: 0 } });
  });

  it('flies left along an empty row and lands in the left column', () => {
    const { result } = fly(new Grid(), 'right', 7, TileId.Thingie2);
    expect(result).toEqual({ type: 'land', at: { col: 0, row: 7 } });
  });

  it('stops in the cell before the first obstacle', () => {
    const g = new Grid();
    g.set(4, 5, TileId.GreyBlock);
    expect(fly(g, 'bottom', 4, TileId.Thingie1).result).toEqual({
      type: 'land',
      at: { col: 4, row: 6 },
    });
    g.set(2, 7, TileId.Crony);
    expect(fly(g, 'right', 7, TileId.Thingie1).result).toEqual({
      type: 'land',
      at: { col: 3, row: 7 },
    });
  });

  it('is lost when its first cell is blocked', () => {
    const g = new Grid();
    g.set(4, 12, TileId.GreyBlock);
    expect(fly(g, 'bottom', 4, TileId.Thingie1).result).toEqual({ type: 'lost' });
  });

  it('reports an impact for bombs and weights instead of landing', () => {
    const g = new Grid();
    g.set(4, 5, TileId.Crony);
    expect(fly(g, 'bottom', 4, TileId.Bomb).result).toEqual({
      type: 'impact',
      at: { col: 4, row: 6 },
      target: { col: 4, row: 5 },
    });
    expect(fly(g, 'bottom', 4, TileId.Weight2).result.type).toBe('impact');
  });

  describe('ramps (level 1-16 geometry)', () => {
    it('ramp 19 (open bottom+right) turns an upward shot right', () => {
      const g = new Grid();
      g.set(0, 6, TileId.RampBottomRight);
      g.set(6, 6, TileId.Crony);
      const { result, p } = fly(g, 'bottom', 0, TileId.Thingie1);
      expect(result).toEqual({ type: 'land', at: { col: 5, row: 6 } });
      expect(p.dir).toBe('right');
    });

    it('ramp 19 turns a leftward shot down', () => {
      const g = new Grid();
      g.set(6, 0, TileId.RampBottomRight);
      g.set(6, 6, TileId.Crony);
      expect(fly(g, 'right', 0, TileId.Thingie1).result).toEqual({
        type: 'land',
        at: { col: 6, row: 5 },
      });
    });

    it('ramp 17 (open top+right) turns a downward shot right (level 1-18)', () => {
      const g = new Grid();
      g.set(5, 0, TileId.RampBottomRight); // player-placed ramp: left -> down
      g.set(5, 5, TileId.RampTopRight); // level ramp: down -> right
      g.set(7, 5, TileId.Crony);
      expect(fly(g, 'right', 0, TileId.Thingie3).result).toEqual({
        type: 'land',
        at: { col: 6, row: 5 },
      });
    });

    it('flat sides block like any obstacle', () => {
      const g = new Grid();
      g.set(4, 5, TileId.RampTopLeft); // open top+left: an upward shot hits its flat bottom
      expect(fly(g, 'bottom', 4, TileId.Thingie1).result).toEqual({
        type: 'land',
        at: { col: 4, row: 6 },
      });
      g.set(4, 5, TileId.RampBottomRight); // open bottom+right: a leftward shot enters via right
      const { p } = fly(g, 'right', 5, TileId.Thingie1);
      expect(p.dir).toBe('down');
    });

    it('a shot deflected off the board stops in the ramp cell only if empty, else is lost', () => {
      const g = new Grid();
      g.set(0, 5, TileId.RampBottomLeft); // upward shot exits left, straight off the board
      expect(fly(g, 'bottom', 0, TileId.Thingie1).result).toEqual({ type: 'lost' });
    });

    it('covers all four orientations', () => {
      const cases: [number, 'bottom' | 'right', string | null][] = [
        [TileId.RampTopLeft, 'bottom', null],
        [TileId.RampTopLeft, 'right', null],
        [TileId.RampTopRight, 'bottom', null],
        [TileId.RampTopRight, 'right', 'up'],
        [TileId.RampBottomLeft, 'bottom', 'left'],
        [TileId.RampBottomLeft, 'right', null],
        [TileId.RampBottomRight, 'bottom', 'right'],
        [TileId.RampBottomRight, 'right', 'down'],
      ];
      for (const [ramp, shooter, dir] of cases) {
        const g = new Grid();
        g.set(6, 6, ramp);
        const { p } = fly(g, shooter, 6, TileId.Thingie1);
        const original = shooter === 'bottom' ? 'up' : 'left';
        expect(p.dir, `ramp ${ramp} from ${shooter}`).toBe(dir ?? original);
      }
    });
  });
});
