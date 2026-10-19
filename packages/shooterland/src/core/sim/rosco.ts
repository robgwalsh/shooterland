import { TICK_RATE, TICK_SECONDS } from '../constants';

export type RoscoPhase = 'lair' | 'toPiggy' | 'toStump';
export type RoscoEvent = 'emerged' | 'arrived' | 'speedUp';

function msToTicks(ms: number): number {
  return Math.max(0, Math.round((ms / 1000) * TICK_RATE));
}

/**
 * Rosco the raccoon (tutorials 1-3 and 1-7): waits in his stump for the
 * level's lair delay, then walks to the piggy bank, steals $1 and walks back,
 * forever. A separate countdown next to the lair speeds him up each time it
 * reaches zero. Arriving at an empty bank loses the level.
 * Exact speeds and the speed-up factor are unverified (docs/GAPS.md G14).
 * Timers count whole ticks so the simulation stays exactly reproducible.
 */
export class Rosco {
  phase: RoscoPhase = 'lair';
  /** 0 at the stump, 1 at the piggy bank. */
  position = 0;
  /** Trips per second multiplier; grows at every speed-up. */
  speed = 1;
  /** Ticks left before he first leaves the lair. */
  lairTicks: number;
  /** Ticks left on the speed-up countdown (runs once he has emerged). */
  speedUpTicks: number;
  speedUps = 0;
  private readonly speedUpIntervalTicks: number;

  constructor(
    lairDelayMs: number,
    speedUpIntervalMs: number,
    private readonly tripSeconds: number,
    private readonly speedUpFactor: number,
  ) {
    this.lairTicks = msToTicks(lairDelayMs);
    this.speedUpIntervalTicks = Math.max(1, msToTicks(speedUpIntervalMs));
    this.speedUpTicks = this.speedUpIntervalTicks;
  }

  /** Advances one tick and reports what happened. */
  tick(): RoscoEvent[] {
    const out: RoscoEvent[] = [];
    if (this.phase === 'lair') {
      this.lairTicks--;
      if (this.lairTicks > 0) return out;
      this.lairTicks = 0;
      this.phase = 'toPiggy';
      out.push('emerged');
    }
    this.speedUpTicks--;
    if (this.speedUpTicks <= 0) {
      this.speedUpTicks = this.speedUpIntervalTicks;
      this.speed *= this.speedUpFactor;
      this.speedUps++;
      out.push('speedUp');
    }
    const step = (TICK_SECONDS / this.tripSeconds) * this.speed;
    if (this.phase === 'toPiggy') {
      this.position += step;
      if (this.position >= 1) {
        this.position = 1;
        this.phase = 'toStump';
        out.push('arrived');
      }
    } else if (this.phase === 'toStump') {
      this.position -= step;
      if (this.position <= 0) {
        this.position = 0;
        this.phase = 'toPiggy';
      }
    }
    return out;
  }

  /** Whole seconds shown on the lair countdown. */
  get countdownSeconds(): number {
    const ticks = this.phase === 'lair' ? this.lairTicks : this.speedUpTicks;
    return Math.ceil(ticks / TICK_RATE);
  }
}
