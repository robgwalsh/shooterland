import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/core/constants';
import { ROSCO_EDGE_PX, Rosco, type RoscoEvent } from '../../src/core/sim/rosco';

const timing = (over: Partial<ConstructorParameters<typeof Rosco>[0]> = {}) => ({
  lairDelayMs: 2000,
  roscoPeriodMs: 8000,
  roscoStealAmount: 1,
  roscoSpeedUpPercent: 50,
  roscoSpeedUpIntervalMs: 20000,
  ...over,
});

function runUntil(r: Rosco, from: number, what: RoscoEvent, limit = 100000): number {
  for (let t = from; t < from + limit; t++) {
    if (r.tick(t).includes(what)) return t;
  }
  throw new Error(`no ${what} within ${limit} ticks`);
}

describe('Rosco', () => {
  it('waits in the stump for the lair delay, then emerges', () => {
    const r = new Rosco(timing());
    for (let t = 0; t < 2 * TICK_RATE; t++) expect(r.tick(t)).toEqual([]);
    expect(r.emerged).toBe(false);
    expect(r.tick(2 * TICK_RATE)).toContain('emerged');
    expect(r.x).toBe(ROSCO_EDGE_PX);
    expect(r.y).toBe(0);
  });

  it('walks the top edge, then the left edge, steals at the halfway point and returns', () => {
    const r = new Rosco(timing({ lairDelayMs: 0, roscoPeriodMs: 8000 }));
    const period = 8 * TICK_RATE;
    r.tick(0);
    r.tick(period / 8);
    expect(r.facing).toBe('left');
    expect(r.y).toBe(0);
    expect(r.x).toBeCloseTo(ROSCO_EDGE_PX / 2, 0);
    r.tick((period * 3) / 8);
    expect(r.facing).toBe('down');
    expect(r.x).toBe(0);
    expect(r.y).toBeCloseTo(ROSCO_EDGE_PX / 2, 0);
    const stole = runUntil(r, (period * 3) / 8, 'stole');
    expect(stole).toBe(period / 2);
    expect(r.facing).toBe('up');
    r.tick((period * 7) / 8);
    expect(r.facing).toBe('right');
    expect(r.y).toBe(0);
    // Exactly one theft per trip.
    let thefts = 0;
    for (let t = period / 2 + 1; t < period * 3; t++) if (r.tick(t).includes('stole')) thefts++;
    expect(thefts).toBe(2);
  });

  it('shrinks the period by the level percentage at the start of a trip once the interval has passed', () => {
    const r = new Rosco(
      timing({
        lairDelayMs: 0,
        roscoPeriodMs: 4000,
        roscoSpeedUpPercent: 50,
        roscoSpeedUpIntervalMs: 5000,
      }),
    );
    const t = runUntil(r, 0, 'speedUp');
    // The interval ends during the second trip; the speed-up lands at the start of the third.
    expect(t).toBe(8 * TICK_RATE);
    expect(r.periodMs).toBe(2000);
    expect(r.x).toBe(ROSCO_EDGE_PX);
    const next = runUntil(r, t + 1, 'speedUp');
    expect(next - t).toBeGreaterThanOrEqual(5 * TICK_RATE);
    expect(r.periodMs).toBe(1000);
    runUntil(r, next + 1, 'speedUp');
    expect(r.periodMs).toBe(1000); // never below the minimum
  });

  it('counts down the seconds to the next speed-up', () => {
    const r = new Rosco(timing({ lairDelayMs: 0, roscoSpeedUpIntervalMs: 10000 }));
    r.tick(0);
    expect(r.countdownSeconds).toBe(10);
    r.tick(3 * TICK_RATE + 1);
    expect(r.countdownSeconds).toBe(6);
  });
});
