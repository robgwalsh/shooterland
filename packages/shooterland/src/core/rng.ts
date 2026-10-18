/**
 * Mulberry32: small, fast, deterministic 32-bit PRNG. Good enough for gameplay
 * randomness and makes every session replayable from a seed.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, n). */
  int(n: number): number;
  /** A new independent generator seeded from this one. */
  fork(): Rng;
  /** Current internal state, for hashing/serialisation. */
  state(): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => Math.floor(next() * n),
    fork: () => createRng(Math.floor(next() * 4294967296)),
    state: () => a,
  };
}
