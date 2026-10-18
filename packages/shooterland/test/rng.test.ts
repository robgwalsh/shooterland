import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';

describe('createRng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 10 }, () => a.int(1000));
    const seqB = Array.from({ length: 10 }, () => b.int(1000));
    expect(seqA).toEqual(seqB);
  });

  it('stays within [0, n)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.int(6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it('forks into an independent stream', () => {
    const rng = createRng(1);
    const fork = rng.fork();
    expect(fork.state()).not.toBe(rng.state());
  });
});
