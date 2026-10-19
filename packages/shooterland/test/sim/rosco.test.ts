import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/core/constants';
import { Rosco } from '../../src/core/sim/rosco';

describe('Rosco', () => {
  it('waits in the lair for the delay, then emerges', () => {
    const r = new Rosco(2000, 60000, 5, 1.25);
    for (let i = 0; i < 2 * TICK_RATE - 1; i++) expect(r.tick()).toEqual([]);
    expect(r.phase).toBe('lair');
    expect(r.tick()).toContain('emerged');
    expect(r.phase).toBe('toPiggy');
  });

  it('reaches the piggy bank after one trip and walks back', () => {
    const r = new Rosco(0, 60000, 5, 1.25);
    let arrived = 0;
    for (let i = 0; i < 5 * TICK_RATE + 2; i++) if (r.tick().includes('arrived')) arrived++;
    expect(arrived).toBe(1);
    expect(r.phase).toBe('toStump');
    for (let i = 0; i < 5 * TICK_RATE + 2; i++) r.tick();
    expect(r.phase).toBe('toPiggy');
    expect(r.position).toBeLessThan(0.1);
  });

  it('speeds up when the countdown ends, so later trips are shorter', () => {
    const r = new Rosco(0, 1000, 5, 2);
    const ticksToArrive = (): number => {
      let n = 0;
      while (!r.tick().includes('arrived')) n++;
      return n;
    };
    const first = ticksToArrive();
    expect(r.speedUps).toBeGreaterThan(0);
    // Walk back, then time the next trip: he is now at least twice as fast.
    while (r.phase !== 'toPiggy') r.tick();
    const second = ticksToArrive();
    expect(second).toBeLessThan(first / 2 + 5);
  });

  it('shows the lair delay, then the speed-up countdown, in whole seconds', () => {
    const r = new Rosco(3000, 10000, 5, 1.25);
    expect(r.countdownSeconds).toBe(3);
    for (let i = 0; i < 3 * TICK_RATE - 1; i++) r.tick();
    expect(r.phase).toBe('lair');
    r.tick();
    expect(r.phase).toBe('toPiggy');
    expect(r.countdownSeconds).toBe(10);
  });
});
