import { TICK_RATE } from '../constants';

export type RoscoEvent = 'emerged' | 'speedUp' | 'stole';
export type RoscoFacing = 'left' | 'down' | 'up' | 'right';

export interface RoscoTiming {
  readonly lairDelayMs: number;
  readonly roscoPeriodMs: number;
  readonly roscoStealAmount: number;
  readonly roscoSpeedUpPercent: number;
  readonly roscoSpeedUpIntervalMs: number;
}

export function msToTicks(ms: number): number {
  return Math.max(0, Math.round((ms / 1000) * TICK_RATE));
}

/** Pixels Rosco walks along each edge of the board (560 in the exe). */
export const ROSCO_EDGE_PX = 560;

/**
 * Rosco the raccoon, as `FUN_00409e61` runs him: after the lair delay he
 * repeats a trip of `roscoPeriodMs`, a quarter of it leftwards along the top
 * edge from his stump, a quarter down the left edge to the piggy bank, where he
 * takes `roscoStealAmount` dollars, then back the same way. Every
 * `roscoSpeedUpIntervalMs` the period shrinks to `roscoSpeedUpPercent` of
 * itself (never below `minPeriodMs`) and the trip restarts from the stump.
 * Everything counts in whole ticks so the simulation stays reproducible.
 */
export class Rosco {
  emerged = false;
  periodMs: number;
  /** Trips completed or in progress since he emerged, for display. */
  speedUps = 0;
  /** Position along the margins in pixels: x along the top edge, y along the left edge. */
  x = ROSCO_EDGE_PX;
  y = 0;
  facing: RoscoFacing = 'left';
  /** 0 or 1, toggling every 425 ms as in the exe. */
  walkFrame = 0;
  readonly stealAmount: number;
  private readonly lairTicks: number;
  private readonly intervalTicks: number;
  private readonly percent: number;
  private readonly minPeriodMs: number;
  private periodTicks: number;
  private cycleStart = 0;
  private speedUpRef = 0;
  private stealArmed = false;
  private speedUpArmed = false;
  private countdown = 0;

  constructor(timing: RoscoTiming, minPeriodMs = 1000) {
    this.lairTicks = msToTicks(timing.lairDelayMs);
    this.periodMs = Math.max(1, timing.roscoPeriodMs);
    this.periodTicks = Math.max(1, msToTicks(this.periodMs));
    this.intervalTicks = msToTicks(timing.roscoSpeedUpIntervalMs);
    this.percent = timing.roscoSpeedUpPercent;
    this.stealAmount = timing.roscoStealAmount;
    this.minPeriodMs = minPeriodMs;
    this.countdown = Math.floor(this.intervalTicks / TICK_RATE);
  }

  /** Advances to tick `now` (ticks since the level started) and reports what happened. */
  tick(now: number): RoscoEvent[] {
    const out: RoscoEvent[] = [];
    if (!this.emerged) {
      if (now < this.lairTicks) return out;
      this.emerged = true;
      this.cycleStart = this.lairTicks;
      this.speedUpRef = this.lairTicks;
      out.push('emerged');
    }
    const c = (now - this.cycleStart) % this.periodTicks;
    const since = now - this.speedUpRef;
    const quarter = Math.floor(this.periodTicks / 4);
    const half = Math.floor(this.periodTicks / 2);
    const threeQuarters = this.periodTicks * 0.75;
    const q = Math.max(1, quarter);
    this.walkFrame = Math.floor((c * 1000) / TICK_RATE / 425) & 1;

    if (c < quarter) {
      this.stealArmed = true;
      this.facing = 'left';
      this.x = ROSCO_EDGE_PX - (ROSCO_EDGE_PX * c) / q;
      this.y = 0;
      if (since > this.intervalTicks && this.speedUpArmed) {
        this.periodMs = Math.max(
          this.minPeriodMs,
          Math.floor((this.periodMs * this.percent) / 100),
        );
        this.periodTicks = Math.max(1, msToTicks(this.periodMs));
        this.speedUpRef = now;
        this.cycleStart = now;
        this.speedUpArmed = false;
        this.speedUps++;
        this.x = ROSCO_EDGE_PX;
        out.push('speedUp');
      }
    } else if (c < half) {
      this.stealArmed = true;
      this.facing = 'down';
      this.x = 0;
      this.y = (ROSCO_EDGE_PX * (c - quarter)) / q;
    } else if (c < threeQuarters) {
      if (this.stealArmed) {
        this.stealArmed = false;
        out.push('stole');
      }
      this.facing = 'up';
      this.x = 0;
      this.y = ROSCO_EDGE_PX - (ROSCO_EDGE_PX * (c - half)) / q;
    } else {
      if (this.stealArmed) {
        this.stealArmed = false;
        out.push('stole');
      }
      this.facing = 'right';
      this.x = (ROSCO_EDGE_PX * (c - threeQuarters)) / q;
      this.y = 0;
      if (since > this.intervalTicks) this.speedUpArmed = true;
    }
    this.countdown = Math.max(
      0,
      Math.floor((this.intervalTicks - (now - this.speedUpRef)) / TICK_RATE),
    );
    return out;
  }

  /** Whole seconds until the next speed-up, as the HUD shows once he has emerged. */
  get countdownSeconds(): number {
    return this.countdown;
  }

  /** Values that affect future ticks, for hashing. */
  get hashInputs(): number[] {
    return [
      this.emerged ? 1 : 0,
      this.periodMs,
      this.periodTicks,
      this.cycleStart,
      this.speedUpRef,
      this.stealArmed ? 1 : 0,
      this.speedUpArmed ? 1 : 0,
    ];
  }
}
