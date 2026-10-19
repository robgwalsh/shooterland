import { GRID_SIZE, TICK_RATE } from '../constants';
import { Grid } from '../grid';
import { Fnv1a } from '../hash';
import type { LevelData } from '../level/LevelData';
import { createRng, type Rng } from '../rng';
import { DEFAULT_RULES, type Rules } from '../rules';
import {
  enemyBlockKind,
  enemyKind,
  isEnemy,
  isRamp,
  isThingie,
  isWeight,
  weightSize,
} from '../tiles';
import {
  ENEMY_KINDS,
  type EnemyKind,
  type GridPos,
  type ItemKind,
  type ShooterSide,
  TileId,
} from '../types';
import { findCombos } from './match';
import { muzzleCell, type Projectile, spawnProjectile, stepProjectile } from './projectile';

export type Command =
  | { readonly t: 'aim'; readonly col: number; readonly row: number }
  | { readonly t: 'fire' }
  | { readonly t: 'openStore' }
  | { readonly t: 'closeStore' }
  | { readonly t: 'buy'; readonly item: ItemKind; readonly shooter: ShooterSide };

export type KillMethod = 'combo' | 'bomb' | 'weight' | 'mine';

export type SessionEvent =
  | {
      readonly t: 'fired';
      readonly shots: readonly { shooter: ShooterSide; lane: number; ammo: number }[];
    }
  | { readonly t: 'cantFire' }
  | {
      readonly t: 'landed';
      readonly shooter: ShooterSide;
      readonly ammo: number;
      readonly at: GridPos;
    }
  | { readonly t: 'deflected'; readonly at: GridPos }
  | { readonly t: 'bomb'; readonly at: GridPos; readonly destroyed: number }
  | { readonly t: 'lost'; readonly shooter: ShooterSide; readonly ammo: number }
  | {
      readonly t: 'combo';
      readonly kind: number;
      readonly cells: readonly GridPos[];
      readonly money: number;
    }
  | {
      readonly t: 'enemyKilled';
      readonly kind: EnemyKind;
      readonly at: GridPos;
      readonly by: KillMethod;
    }
  | {
      readonly t: 'enemyBlocksCleared';
      readonly kind: EnemyKind;
      readonly cells: readonly GridPos[];
    }
  | { readonly t: 'reloaded' }
  | {
      readonly t: 'bought';
      readonly item: ItemKind;
      readonly shooter: ShooterSide;
      readonly cost: number;
    }
  | { readonly t: 'won'; readonly ticks: number; readonly star: boolean }
  | { readonly t: 'defeated'; readonly reason: 'rosco' };

export interface ShooterState {
  readonly side: ShooterSide;
  /** How many adjacent lanes it fires at once (1..3). */
  size: number;
  /** First column (bottom) or row (right) it fires along. */
  lane: number;
  loaded: number;
  next: number;
}

export type SessionStatus = 'playing' | 'won' | 'lost';

export interface SessionStats {
  shots: number;
  combos: number;
  comboPieces: number;
}

export interface SessionState {
  readonly level: LevelData;
  readonly grid: Grid;
  readonly shooters: { readonly bottom: ShooterState; readonly right: ShooterState };
  readonly inFlight: readonly Projectile[];
  readonly enemies: Readonly<Record<EnemyKind, number>>;
  readonly money: number;
  readonly ticks: number;
  readonly status: SessionStatus;
  readonly storeOpen: boolean;
  readonly stats: Readonly<SessionStats>;
}

/**
 * One level's simulation: deterministic, DOM-free, advanced one fixed tick at
 * a time by `tick(commands)`, which returns the events the tick produced.
 */
export class GameSession implements SessionState {
  readonly level: LevelData;
  readonly rules: Rules;
  readonly grid: Grid;
  readonly shooters: { readonly bottom: ShooterState; readonly right: ShooterState };
  readonly enemies: Record<EnemyKind, number> = {
    crony: 0,
    crazy: 0,
    fatty: 0,
    fangie: 0,
    skully: 0,
  };
  readonly stats: SessionStats = { shots: 0, combos: 0, comboPieces: 0 };
  money: number;
  ticks = 0;
  status: SessionStatus = 'playing';
  storeOpen = false;
  private readonly rng: Rng;
  private readonly projectiles: Projectile[] = [];
  private nextProjectileId = 1;
  /** Thingies landed in the current volley, matched once every shot has settled. */
  private volley: GridPos[] | null = null;

  constructor(level: LevelData, seed: number, rules: Rules = DEFAULT_RULES) {
    this.level = level;
    this.rules = rules;
    this.rng = createRng(seed);
    this.grid = new Grid(level.cells);
    for (const { id } of this.grid.positions(isEnemy)) {
      const kind = enemyKind(id);
      if (kind) this.enemies[kind]++;
    }
    this.money = rules.startingMoney;
    const mid = Math.floor(GRID_SIZE / 2);
    this.shooters = {
      bottom: { side: 'bottom', size: level.bottomShooterSize, lane: mid, loaded: 0, next: 0 },
      right: { side: 'right', size: level.rightShooterSize, lane: mid, loaded: 0, next: 0 },
    };
    for (const s of [this.shooters.bottom, this.shooters.right]) {
      s.loaded = this.drawAmmo();
      s.next = this.drawAmmo();
    }
  }

  get inFlight(): readonly Projectile[] {
    return this.projectiles;
  }

  get seconds(): number {
    return this.ticks / TICK_RATE;
  }

  get enemiesRemaining(): number {
    let n = 0;
    for (const k of ENEMY_KINDS) n += this.enemies[k];
    return n;
  }

  private get bombChance(): number {
    const { rules, level } = this;
    if (rules.bombChanceFromLevel) return Math.min(1, Math.max(0, 1 - level.unknownPercent / 100));
    return rules.bombChance;
  }

  private drawAmmo(): number {
    if (this.rng.next() < this.bombChance) return TileId.Bomb;
    return TileId.Thingie1 + this.rng.int(this.rules.thingieKinds);
  }

  /** The lanes a shooter currently covers, clamped to the board. */
  lanesOf(s: ShooterState): number[] {
    const lanes: number[] = [];
    for (let i = 0; i < s.size; i++) lanes.push(s.lane + i);
    return lanes;
  }

  private clampLane(s: ShooterState, lane: number): number {
    return Math.max(0, Math.min(GRID_SIZE - s.size, lane));
  }

  /** Lanes whose first cell is free. A shooter can fire if at least one is (tutorial 1-24). */
  openLanes(s: ShooterState): number[] {
    return this.lanesOf(s).filter((lane) => {
      const m = muzzleCell(s.side, lane);
      return this.grid.isEmpty(m.col, m.row);
    });
  }

  canFire(): boolean {
    if (this.status !== 'playing' || this.storeOpen) return false;
    if (this.projectiles.length > 0 && !this.rules.fireWhileInFlight) return false;
    return (
      this.openLanes(this.shooters.bottom).length > 0 &&
      this.openLanes(this.shooters.right).length > 0
    );
  }

  tick(commands: readonly Command[] = []): SessionEvent[] {
    const events: SessionEvent[] = [];
    if (this.status !== 'playing') return events;
    for (const c of commands) this.apply(c, events);
    this.ticks++;
    this.advanceProjectiles(events);
    if (this.volley && this.projectiles.length === 0) this.settleVolley(events);
    this.checkWin(events);
    return events;
  }

  private apply(c: Command, events: SessionEvent[]): void {
    switch (c.t) {
      case 'aim': {
        const b = this.shooters.bottom;
        const r = this.shooters.right;
        b.lane = this.clampLane(b, Math.floor(c.col));
        r.lane = this.clampLane(r, Math.floor(c.row));
        return;
      }
      case 'fire':
        this.fire(events);
        return;
      case 'openStore':
        this.storeOpen = true;
        return;
      case 'closeStore':
        this.storeOpen = false;
        return;
      case 'buy': {
        const cost = this.rules.prices[c.item] ?? 0;
        if (this.money < cost) return;
        this.money -= cost;
        this.shooters[c.shooter].loaded = c.item;
        this.storeOpen = false;
        events.push({ t: 'bought', item: c.item, shooter: c.shooter, cost });
        return;
      }
    }
  }

  private fire(events: SessionEvent[]): void {
    if (!this.canFire()) {
      events.push({ t: 'cantFire' });
      return;
    }
    const shots: { shooter: ShooterSide; lane: number; ammo: number }[] = [];
    for (const s of [this.shooters.bottom, this.shooters.right]) {
      for (const lane of this.openLanes(s)) {
        this.projectiles.push(spawnProjectile(this.nextProjectileId++, s.side, lane, s.loaded));
        shots.push({ shooter: s.side, lane, ammo: s.loaded });
      }
    }
    this.stats.shots++;
    this.volley = [];
    events.push({ t: 'fired', shots });
  }

  private advanceProjectiles(events: SessionEvent[]): void {
    const perTick = this.rules.projectileCellsPerSecond / TICK_RATE;
    for (let i = 0; i < this.projectiles.length; ) {
      const p = this.projectiles[i];
      if (!p) break;
      p.progress += perTick;
      let done = false;
      while (p.progress >= 1 && !done) {
        p.progress -= 1;
        done = this.stepOne(p, events);
      }
      if (done) this.projectiles.splice(i, 1);
      else i++;
    }
  }

  /** Steps one cell; returns true when the projectile is finished. */
  private stepOne(p: Projectile, events: SessionEvent[]): boolean {
    const r = stepProjectile(this.grid, p);
    switch (r.type) {
      case 'moved':
        return false;
      case 'deflected':
        events.push({ t: 'deflected', at: r.ramp });
        return false;
      case 'land':
        this.land(p, r.at, events);
        return true;
      case 'impact':
        this.impact(p, r.at, r.target, events);
        return true;
      case 'lost':
        events.push({ t: 'lost', shooter: p.shooter, ammo: p.ammo });
        return true;
    }
  }

  private land(p: Projectile, at: GridPos, events: SessionEvent[]): void {
    const { ammo } = p;
    if (ammo === TileId.Bomb) {
      // A bomb with nothing to hit (open lane to the edge) just fizzles there.
      events.push({ t: 'bomb', at, destroyed: TileId.Empty });
      return;
    }
    if (isWeight(ammo)) {
      // A weight that reaches the edge without pushing anything settles as a spent weight.
      this.grid.set(at.col, at.row, TileId.SpentWeight);
      events.push({ t: 'landed', shooter: p.shooter, ammo, at });
      return;
    }
    this.grid.set(at.col, at.row, ammo);
    if (isThingie(ammo)) this.volley?.push(at);
    events.push({ t: 'landed', shooter: p.shooter, ammo, at });
  }

  private impact(p: Projectile, at: GridPos, target: GridPos, events: SessionEvent[]): void {
    if (p.ammo === TileId.Bomb) {
      this.explodeBomb(target, events);
      return;
    }
    // Weights: full push/crush arrives in phase 5. For now a weight crushes one
    // adjacent enemy if its rule allows and then settles where it stopped.
    const size = weightSize(p.ammo);
    const id = this.grid.get(target.col, target.row);
    const kind = enemyKind(id);
    if (kind && this.rules.enemies[kind].weight && size >= 1) {
      this.killEnemy(target, kind, 'weight', events);
    }
    if (Grid.inBounds(at.col, at.row) && this.grid.isEmpty(at.col, at.row)) {
      this.grid.set(at.col, at.row, TileId.SpentWeight);
      events.push({ t: 'landed', shooter: p.shooter, ammo: p.ammo, at });
    } else {
      events.push({ t: 'lost', shooter: p.shooter, ammo: p.ammo });
    }
  }

  /** A bowling bomb destroys what it hits unless that thing resists explosives. */
  private explodeBomb(target: GridPos, events: SessionEvent[]): void {
    const id = this.grid.get(target.col, target.row);
    const kind = enemyKind(id);
    let destroyed = TileId.Empty as number;
    if (kind) {
      if (this.rules.enemies[kind].bomb) {
        this.killEnemy(target, kind, 'bomb', events);
        destroyed = id;
      }
    } else if (
      isThingie(id) ||
      id === TileId.BrownBlock ||
      id === TileId.SpentWeight ||
      isRamp(id)
    ) {
      this.grid.set(target.col, target.row, TileId.Empty);
      destroyed = id;
    }
    events.push({ t: 'bomb', at: target, destroyed });
  }

  private killEnemy(at: GridPos, kind: EnemyKind, by: KillMethod, events: SessionEvent[]): void {
    this.grid.set(at.col, at.row, TileId.Empty);
    this.enemies[kind]--;
    events.push({ t: 'enemyKilled', kind, at, by });
    if (this.enemies[kind] === 0) this.clearEnemyBlocks(kind, events);
  }

  private clearEnemyBlocks(kind: EnemyKind, events: SessionEvent[]): void {
    const cells: GridPos[] = [];
    for (const p of this.grid.positions((id) => enemyBlockKind(id) === kind)) {
      this.grid.set(p.col, p.row, TileId.Empty);
      cells.push({ col: p.col, row: p.row });
    }
    if (cells.length > 0) events.push({ t: 'enemyBlocksCleared', kind, cells });
  }

  /** Every shot of the volley has settled: resolve combos, kills and reload. */
  private settleVolley(events: SessionEvent[]): void {
    const seeds = this.volley ?? [];
    this.volley = null;
    const { rules } = this;
    for (const combo of findCombos(this.grid, seeds)) {
      const size = combo.cells.length;
      const money = rules.comboBaseMoney + (size - 3) * rules.comboExtraMoney;
      this.money += money;
      this.stats.combos++;
      this.stats.comboPieces += size;
      for (const c of combo.cells) this.grid.set(c.col, c.row, TileId.Empty);
      events.push({ t: 'combo', kind: combo.kind, cells: combo.cells, money });
      for (const e of this.adjacentEnemies(combo.cells)) {
        const kind = enemyKind(this.grid.get(e.col, e.row));
        if (!kind) continue;
        const min = rules.enemies[kind].comboMin;
        if (min !== null && size >= min) this.killEnemy(e, kind, 'combo', events);
      }
    }
    for (const s of [this.shooters.bottom, this.shooters.right]) {
      s.loaded = s.next;
      s.next = this.drawAmmo();
    }
    events.push({ t: 'reloaded' });
  }

  private adjacentEnemies(cells: readonly GridPos[]): GridPos[] {
    const seen = new Set<number>();
    const out: GridPos[] = [];
    const reach = this.rules.enemyAdjacency === 8 ? 1 : 0;
    for (const c of cells) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (reach === 0 && dr !== 0 && dc !== 0) continue;
          const col = c.col + dc;
          const row = c.row + dr;
          if (!Grid.inBounds(col, row)) continue;
          const key = row * GRID_SIZE + col;
          if (seen.has(key) || !isEnemy(this.grid.get(col, row))) continue;
          seen.add(key);
          out.push({ col, row });
        }
      }
    }
    return out;
  }

  private checkWin(events: SessionEvent[]): void {
    if (this.status !== 'playing' || this.projectiles.length > 0) return;
    const survival =
      this.rules.survivalLevels &&
      this.grid.count(isEnemy) === 0 &&
      this.enemiesRemainingAtStart === 0;
    const won = survival ? this.seconds >= this.level.timeToBeat : this.enemiesRemaining === 0;
    if (!won) return;
    this.status = 'won';
    events.push({
      t: 'won',
      ticks: this.ticks,
      star: survival || this.seconds <= this.level.timeToBeat,
    });
  }

  private get enemiesRemainingAtStart(): number {
    let n = 0;
    for (const id of this.level.cells) if (isEnemy(id)) n++;
    return n;
  }

  /** Fingerprint of everything that affects future ticks, for replay tests. */
  hash(): string {
    const h = new Fnv1a();
    h.bytes(this.grid.cells);
    h.int(this.ticks).int(this.money).int(this.rng.state());
    h.string(this.status).byte(this.storeOpen ? 1 : 0);
    for (const s of [this.shooters.bottom, this.shooters.right]) {
      h.int(s.size).int(s.lane).int(s.loaded).int(s.next);
    }
    for (const k of ENEMY_KINDS) h.int(this.enemies[k]);
    for (const p of this.projectiles) {
      h.int(p.col)
        .int(p.row)
        .int(p.ammo)
        .string(p.dir)
        .int(Math.round(p.progress * 1e6));
    }
    h.int(this.stats.shots).int(this.stats.combos).int(this.stats.comboPieces);
    return h.hex();
  }
}
