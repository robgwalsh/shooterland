import { GRID_SIZE, TICK_RATE } from '../constants';
import { Grid } from '../grid';
import { Fnv1a } from '../hash';
import type { LevelData } from '../level/LevelData';
import { createRng, type Rng } from '../rng';
import { DEFAULT_RULES, type Rules } from '../rules';
import {
  enemyBlockKind,
  enemyId,
  enemyKind,
  isEnemy,
  isEnemyBlock,
  isThingie,
  isWeight,
  weightStrength,
} from '../tiles';
import {
  ENEMY_KINDS,
  type EnemyKind,
  type GridPos,
  type ItemKind,
  type ShooterSide,
  TileId,
} from '../types';
import { collectCombo, countGroup, findCombos } from './match';
import {
  type CellView,
  inBounds,
  isFree,
  nextCell,
  type Projectile,
  spawnProjectile,
} from './projectile';
import { Rosco } from './rosco';
import { walkWeightPath } from './weight';

export type Command =
  /** First lane of each bar; the session clamps them to the board. */
  | { readonly t: 'aim'; readonly bottom: number; readonly right: number }
  | { readonly t: 'fire' }
  | { readonly t: 'openStore' }
  | { readonly t: 'closeStore' }
  | {
      readonly t: 'buy';
      readonly item: ItemKind;
      readonly shooter: ShooterSide;
      /** 0..size-1: which of the bar's lanes receives the item. */
      readonly lane: number;
      /** Bombs can be bought several at a time (the +/- buttons). */
      readonly quantity?: number;
    };

export type KillMethod = 'combo' | 'bomb' | 'weight' | 'mine';

/** The exe's three destroy animations: a landed bomb, a blasted/crushed tile, a cleared ("popped") tile. */
export type DestroyKind = 'blast' | 'destroyed' | 'pop';

export type SessionEvent =
  | {
      readonly t: 'fired';
      readonly shots: readonly { shooter: ShooterSide; lane: number; ammo: number }[];
    }
  | { readonly t: 'cantFire'; readonly reason: 'inFlight' | 'blocked' | 'store' }
  | {
      readonly t: 'landed';
      readonly shooter: ShooterSide;
      readonly ammo: number;
      readonly at: GridPos;
      readonly dir: 'up' | 'down' | 'left' | 'right';
    }
  /** A shot that could not land went back into its lane's queue. */
  | { readonly t: 'returned'; readonly shooter: ShooterSide; readonly ammo: number }
  | {
      readonly t: 'bomb';
      /** Where the bomb came to rest (null when it never entered the board). */
      readonly at: GridPos | null;
      readonly target: GridPos | null;
      readonly destroyed: number;
    }
  | { readonly t: 'mine'; readonly at: GridPos; readonly by: 'shot' | 'push' | 'bomb' }
  | { readonly t: 'weightPushed'; readonly cells: readonly GridPos[] }
  /** A tile started its destroy animation; it is passable until `cleared`. */
  | {
      readonly t: 'destroyed';
      readonly at: GridPos;
      readonly id: number;
      readonly kind: DestroyKind;
    }
  /** A destroyed tile was removed from the board. */
  | { readonly t: 'cleared'; readonly at: GridPos; readonly id: number }
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
  | {
      readonly t: 'bought';
      readonly item: ItemKind;
      readonly shooter: ShooterSide;
      readonly lane: number;
      readonly quantity: number;
      readonly cost: number;
    }
  | { readonly t: 'storeOpened' }
  | { readonly t: 'storeClosed' }
  | { readonly t: 'roscoEmerged' }
  | { readonly t: 'roscoSpeedUp'; readonly periodMs: number }
  | { readonly t: 'roscoStole'; readonly amount: number; readonly money: number }
  | { readonly t: 'won'; readonly ticks: number; readonly star: boolean }
  | { readonly t: 'defeated'; readonly reason: 'rosco' };

export interface LaneAmmo {
  /** Loaded item (fires next), or -1 for a blank slot. */
  readonly loaded: number;
  /** The item after it. */
  readonly next: number;
}

export interface ShooterState {
  readonly side: ShooterSide;
  /** How many adjacent lanes it fires at once (1..3), fixed per level. */
  readonly size: number;
  /** First column (bottom) or row (right) it fires along. */
  lane: number;
  /** One entry per lane, nearest the bar's start first. */
  readonly lanes: readonly LaneAmmo[];
}

export type SessionStatus = 'playing' | 'won' | 'lost';

export interface SessionStats {
  shots: number;
  combos: number;
  comboPieces: number;
  moneyEarned: number;
  moneyStolen: number;
}

export interface DyingCell {
  readonly kind: DestroyKind;
  /** Ticks since the animation started. */
  readonly elapsed: number;
  readonly total: number;
}

export interface SessionState {
  readonly level: LevelData;
  readonly grid: Grid;
  readonly shooters: { readonly bottom: ShooterState; readonly right: ShooterState };
  readonly inFlight: readonly Projectile[];
  /** Enemy tiles on the board per kind, dying ones included (the exe's HUD counters). */
  readonly enemies: Readonly<Record<EnemyKind, number>>;
  readonly rosco: Rosco;
  readonly money: number;
  readonly ticks: number;
  readonly status: SessionStatus;
  readonly storeOpen: boolean;
  readonly stats: Readonly<SessionStats>;
}

const DESTROY_CODE: Record<DestroyKind, number> = { blast: 3, destroyed: 4, pop: 8 };
const DESTROY_KIND: Record<number, DestroyKind> = { 3: 'blast', 4: 'destroyed', 8: 'pop' };
/** Where the bars park while the store is open (`0xb - size`). */
const STORE_PARK = 11;

interface MutableShooter extends ShooterState {
  lanes: LaneAmmo[];
}

/**
 * One level's simulation: deterministic, DOM-free, advanced one fixed tick at
 * a time by `tick(commands)`, which returns the events the tick produced.
 * The rules follow the disassembled exe (docs/RULES.md); the per-frame order
 * is that of its gameplay routine.
 */
export class GameSession implements SessionState, CellView {
  readonly level: LevelData;
  readonly rules: Rules;
  readonly grid: Grid;
  readonly shooters: { readonly bottom: MutableShooter; readonly right: MutableShooter };
  readonly stats: SessionStats = {
    shots: 0,
    combos: 0,
    comboPieces: 0,
    moneyEarned: 0,
    moneyStolen: 0,
  };
  readonly rosco: Rosco;
  money: number;
  ticks = 0;
  status: SessionStatus = 'playing';
  storeOpen = false;
  private readonly rng: Rng;
  /** Ammo per global lane (0-2 Mary, 3-5 Poindexter); index 0 is loaded. */
  private readonly queues: number[][] = [[], [], [], [], [], []];
  private readonly projectiles: Projectile[] = [];
  private nextProjectileId = 1;
  private readonly dyingTicks = new Int16Array(GRID_SIZE * GRID_SIZE);
  private readonly dyingCode = new Uint8Array(GRID_SIZE * GRID_SIZE);
  /** Enemies crushed by the weights of the current volley (shared, as in the exe). */
  private volleyCrushes = 0;
  private readonly comboMin: number;

  constructor(level: LevelData, seed: number, rules: Rules = DEFAULT_RULES) {
    this.level = level;
    this.rules = rules;
    this.rng = createRng(seed);
    this.grid = new Grid(level.cells);
    this.money = rules.startingMoney;
    this.comboMin = level.world === 7 ? rules.comboMinFinalWorld : rules.comboMin;
    this.rosco = new Rosco(level, rules.roscoMinPeriodMs);
    this.shooters = {
      bottom: { side: 'bottom', size: clampSize(level.bottomShooterSize), lane: 0, lanes: [] },
      right: { side: 'right', size: clampSize(level.rightShooterSize), lane: 0, lanes: [] },
    };
    for (const lane of this.activeLanes()) this.topUp(lane);
    this.syncLanes();
  }

  get inFlight(): readonly Projectile[] {
    return this.projectiles;
  }

  get seconds(): number {
    return this.ticks / TICK_RATE;
  }

  /** Whole seconds, as the exe measures and stores them. */
  get elapsedSeconds(): number {
    return Math.floor(this.seconds);
  }

  get enemies(): Readonly<Record<EnemyKind, number>> {
    const out: Record<EnemyKind, number> = { crony: 0, crazy: 0, fatty: 0, fangie: 0, skully: 0 };
    for (const id of this.grid.cells) {
      const k = enemyKind(id);
      if (k) out[k]++;
    }
    return out;
  }

  get enemiesRemaining(): number {
    return this.grid.count(isEnemy);
  }

  // CellView
  get(col: number, row: number): number {
    return this.grid.get(col, row);
  }

  isDying(col: number, row: number): boolean {
    return inBounds(col, row) && (this.dyingTicks[row * GRID_SIZE + col] ?? 0) > 0;
  }

  /** The destroy animation playing in a cell, if any. */
  dying(col: number, row: number): DyingCell | null {
    if (!this.isDying(col, row)) return null;
    const i = row * GRID_SIZE + col;
    const total = this.rules.destroyTicks;
    return {
      kind: DESTROY_KIND[this.dyingCode[i] ?? 8] ?? 'pop',
      elapsed: total - (this.dyingTicks[i] ?? 0),
      total,
    };
  }

  /** Global lane indices in use: Mary's first, then Poindexter's. */
  private activeLanes(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.shooters.bottom.size; i++) out.push(i);
    for (let i = 0; i < this.shooters.right.size; i++) out.push(3 + i);
    return out;
  }

  private shooterOf(lane: number): MutableShooter {
    return lane < 3 ? this.shooters.bottom : this.shooters.right;
  }

  private queue(lane: number): number[] {
    const q = this.queues[lane];
    if (!q) throw new RangeError(`lane ${lane} is out of range`);
    return q;
  }

  private draw(): number {
    if (this.rng.next() < this.rules.bombChance) return TileId.Bomb;
    return TileId.Thingie1 + this.rng.int(this.rules.thingieKinds);
  }

  private topUp(lane: number): void {
    const q = this.queue(lane);
    while (q.length < 2) q.push(this.draw());
  }

  private syncLanes(): void {
    for (const s of [this.shooters.bottom, this.shooters.right]) {
      const lanes: LaneAmmo[] = [];
      for (let i = 0; i < s.size; i++) {
        const q = this.queue(s.side === 'bottom' ? i : 3 + i);
        lanes.push({ loaded: q[0] ?? TileId.Empty, next: q[1] ?? TileId.Empty });
      }
      s.lanes = lanes;
    }
  }

  /**
   * Overwrites the front of a lane's ammo queue (loaded item first). Meant for
   * tests, tutorials and debugging; the exe never changes queues this way.
   */
  setLaneAmmo(shooter: ShooterSide, laneIndex: number, items: readonly number[]): void {
    const s = this.shooters[shooter];
    if (laneIndex < 0 || laneIndex >= s.size)
      throw new RangeError(`lane ${laneIndex} is not on the ${shooter} bar`);
    const q = this.queue(shooter === 'bottom' ? laneIndex : 3 + laneIndex);
    q.splice(0, items.length, ...items);
    this.topUp(shooter === 'bottom' ? laneIndex : 3 + laneIndex);
    this.syncLanes();
  }

  private clampLane(s: ShooterState, lane: number): number {
    return Math.max(0, Math.min(GRID_SIZE - s.size, Math.floor(lane)));
  }

  /** Whether a shot fired along `lane` could enter the board right now. */
  private laneOpen(shooter: MutableShooter, laneIndex: number): boolean {
    const p = spawnProjectile(0, shooter.side, laneIndex, shooter.lane, TileId.Thingie1);
    const n = nextCell(this, p.col, p.row, p.dir, true, true);
    return n.col !== p.col || n.row !== p.row;
  }

  /**
   * The exe cancels a volley when every lane of a bar that holds a thingy,
   * weight or ramp is blocked (bombs and blanks never count).
   */
  private shooterBlocked(shooter: MutableShooter): boolean {
    let blocked = 0;
    for (let i = 0; i < shooter.size; i++) {
      const item = this.queue(shooter.side === 'bottom' ? i : 3 + i)[0] ?? TileId.Empty;
      if (item === TileId.Empty || item === TileId.Bomb) continue;
      if (!this.laneOpen(shooter, i)) blocked++;
    }
    return blocked >= shooter.size;
  }

  canFire(): boolean {
    if (this.status !== 'playing' || this.storeOpen) return false;
    if (this.projectiles.length > 0 && !this.rules.fireWhileInFlight) return false;
    return !this.shooterBlocked(this.shooters.bottom) && !this.shooterBlocked(this.shooters.right);
  }

  tick(commands: readonly Command[] = []): SessionEvent[] {
    const events: SessionEvent[] = [];
    if (this.status !== 'playing') return events;
    for (const c of commands) this.apply(c, events);
    this.ticks++;
    if (this.money < 0) {
      this.status = 'lost';
      events.push({ t: 'defeated', reason: 'rosco' });
      return events;
    }
    this.stepProjectiles(events);
    if (this.projectiles.length === 0) this.resolveCombos(events);
    this.updateBlocksAndWin(events);
    if (this.status === 'playing') this.advanceRosco(events);
    this.advanceDying(events);
    return events;
  }

  private apply(c: Command, events: SessionEvent[]): void {
    switch (c.t) {
      case 'aim': {
        if (this.storeOpen) return;
        const b = this.shooters.bottom;
        const r = this.shooters.right;
        b.lane = this.clampLane(b, c.bottom);
        r.lane = this.clampLane(r, c.right);
        return;
      }
      case 'fire':
        this.fire(events);
        return;
      case 'openStore':
        this.openStore(events);
        return;
      case 'closeStore':
        this.closeStore(events);
        return;
      case 'buy':
        this.buy(c, events);
        return;
    }
  }

  private fire(events: SessionEvent[]): void {
    if (this.status !== 'playing' || this.storeOpen) {
      events.push({ t: 'cantFire', reason: 'store' });
      return;
    }
    if (this.projectiles.length > 0 && !this.rules.fireWhileInFlight) {
      events.push({ t: 'cantFire', reason: 'inFlight' });
      return;
    }
    if (this.shooterBlocked(this.shooters.bottom) || this.shooterBlocked(this.shooters.right)) {
      events.push({ t: 'cantFire', reason: 'blocked' });
      return;
    }
    this.stats.shots++;
    this.volleyCrushes = 0;
    const shots: { shooter: ShooterSide; lane: number; ammo: number }[] = [];
    for (const lane of this.activeLanes()) {
      const q = this.queue(lane);
      const item = q.shift() ?? TileId.Empty;
      this.topUp(lane);
      if (item === TileId.Empty) continue;
      const s = this.shooterOf(lane);
      const laneIndex = lane < 3 ? lane : lane - 3;
      this.projectiles.push(
        spawnProjectile(this.nextProjectileId++, s.side, laneIndex, s.lane, item),
      );
      shots.push({ shooter: s.side, lane: s.lane + laneIndex, ammo: item });
    }
    this.syncLanes();
    events.push({ t: 'fired', shots });
  }

  private openStore(events: SessionEvent[]): void {
    if (this.storeOpen || this.status !== 'playing') return;
    this.storeOpen = true;
    for (const lane of this.activeLanes()) this.queue(lane).unshift(TileId.Empty);
    for (const s of [this.shooters.bottom, this.shooters.right]) {
      s.lane = this.clampLane(s, STORE_PARK - s.size);
    }
    this.syncLanes();
    events.push({ t: 'storeOpened' });
  }

  private closeStore(events: SessionEvent[]): void {
    if (!this.storeOpen) return;
    this.storeOpen = false;
    for (const lane of this.activeLanes()) {
      this.queue(lane).shift();
      this.topUp(lane);
    }
    this.syncLanes();
    events.push({ t: 'storeClosed' });
  }

  private buy(c: Extract<Command, { t: 'buy' }>, events: SessionEvent[]): void {
    if (!this.storeOpen) return;
    const s = this.shooters[c.shooter];
    if (c.lane < 0 || c.lane >= s.size || !Number.isInteger(c.lane)) return;
    const cost = this.rules.prices[c.item];
    if (cost === undefined || this.money < cost) return;
    const lane = c.shooter === 'bottom' ? c.lane : 3 + c.lane;
    const wanted = Math.max(1, Math.floor(c.quantity ?? 1));
    let quantity = 0;
    const q = this.queue(lane);
    q[0] = c.item;
    this.money -= cost;
    quantity++;
    if (c.item === TileId.Bomb) {
      while (quantity < wanted && this.money >= cost) {
        for (const l of this.activeLanes()) this.queue(l).unshift(TileId.Empty);
        q[0] = c.item;
        this.money -= cost;
        quantity++;
      }
    }
    if (!this.rules.storeBlanksOtherLanes) {
      for (const l of this.activeLanes()) {
        if (l === lane) continue;
        const other = this.queue(l);
        while (other.length > 0 && other[0] === TileId.Empty) other.shift();
        this.topUp(l);
      }
    }
    this.storeOpen = false;
    this.syncLanes();
    events.push({ t: 'bought', item: c.item, shooter: c.shooter, lane: c.lane, quantity, cost });
  }

  // ---- projectiles -------------------------------------------------------

  private stepProjectiles(events: SessionEvent[]): void {
    for (const p of [...this.projectiles]) {
      if (!this.projectiles.includes(p)) continue;
      if (
        inBounds(p.col, p.row) &&
        this.get(p.col, p.row) === TileId.Mine &&
        !this.isDying(p.col, p.row)
      ) {
        this.startDying({ col: p.col, row: p.row }, 'destroyed', events);
        events.push({ t: 'mine', at: { col: p.col, row: p.row }, by: 'shot' });
        this.remove(p);
        continue;
      }
      for (let n = 0; n < this.rules.projectileCellsPerTick; n++) {
        if (this.stepOne(p, events)) break;
      }
    }
  }

  /** Advances one cell; returns true when the projectile is finished. */
  private stepOne(p: Projectile, events: SessionEvent[]): boolean {
    const n = nextCell(this, p.col, p.row, p.dir, true, true);
    if (n.col !== p.col || n.row !== p.row) {
      p.col = n.col;
      p.row = n.row;
      p.dir = n.dir;
      p.path.push({ col: n.col, row: n.row });
      return false;
    }
    if (isWeight(p.ammo)) return this.weightStep(p, events);
    this.landShot(p, events);
    return true;
  }

  private remove(p: Projectile): void {
    const i = this.projectiles.indexOf(p);
    if (i >= 0) this.projectiles.splice(i, 1);
  }

  private returnToQueue(p: Projectile, events: SessionEvent[]): void {
    this.queue(p.lane).unshift(p.ammo);
    this.syncLanes();
    events.push({ t: 'returned', shooter: p.shooter, ammo: p.ammo });
    this.remove(p);
  }

  /** The projectile stopped: place it, or back it up if its cell was taken (`FUN_0040bceb`). */
  private landShot(p: Projectile, events: SessionEvent[]): void {
    if (!inBounds(p.col, p.row)) {
      if (p.ammo === TileId.Bomb) {
        this.blast(p, { col: p.col, row: p.row }, null, events);
        this.remove(p);
      } else {
        this.returnToQueue(p, events);
      }
      return;
    }
    if (isFree(this, p.col, p.row, true)) {
      this.place(p, { col: p.col, row: p.row }, events);
      return;
    }
    p.path.pop();
    while (p.path.length > 0) {
      const back = p.path[p.path.length - 1];
      if (back && isFree(this, back.col, back.row, true)) {
        this.place(p, back, events);
        return;
      }
      p.path.pop();
    }
    this.returnToQueue(p, events);
  }

  private place(p: Projectile, at: GridPos, events: SessionEvent[]): void {
    this.remove(p);
    this.grid.set(at.col, at.row, p.ammo);
    this.clearDying(at);
    if (isWeight(p.ammo)) {
      this.startDying(at, 'pop', events);
      events.push({ t: 'landed', shooter: p.shooter, ammo: p.ammo, at, dir: p.dir });
      return;
    }
    if (p.ammo === TileId.Bomb) {
      this.startDying(at, 'blast', events);
      this.blast(p, at, at, events);
      return;
    }
    events.push({ t: 'landed', shooter: p.shooter, ammo: p.ammo, at, dir: p.dir });
  }

  /** A landed bomb destroys the next cell in its direction unless it resists (`FUN_0040b6d7`, `FUN_0040c396`). */
  private blast(
    p: Projectile,
    from: GridPos,
    restAt: GridPos | null,
    events: SessionEvent[],
  ): void {
    const n = nextCell(this, from.col, from.row, p.dir, false, true);
    let target: GridPos | null = null;
    let destroyed: number = TileId.Empty;
    if ((n.col !== from.col || n.row !== from.row) && inBounds(n.col, n.row)) {
      target = { col: n.col, row: n.row };
      const id = this.get(n.col, n.row);
      if (this.bombDestroys(id)) {
        destroyed = id;
        this.startDying(target, 'destroyed', events);
        const kind = enemyKind(id);
        if (kind) events.push({ t: 'enemyKilled', kind, at: target, by: 'bomb' });
        if (id === TileId.Mine) events.push({ t: 'mine', at: target, by: 'bomb' });
      }
    }
    events.push({ t: 'bomb', at: restAt, target, destroyed });
  }

  private bombDestroys(id: number): boolean {
    if (id === TileId.Empty || id === TileId.GreyBlock || isEnemyBlock(id)) return false;
    const kind = enemyKind(id);
    return kind ? this.rules.enemies[kind].bomb : true;
  }

  /**
   * A weight that cannot move (`FUN_0040b6d7`): shove the run ahead, crush
   * the first enemy in reach, or land and vanish. Returns true when finished.
   */
  private weightStep(p: Projectile, events: SessionEvent[]): boolean {
    const strength = weightStrength(p.ammo);
    if (this.volleyCrushes >= strength) return this.landWeight(p, events);
    if (!inBounds(p.col, p.row)) return this.landWeight(p, events);
    const { path, run } = walkWeightPath(this, { col: p.col, row: p.row }, p.dir);
    if (run <= strength && this.volleyCrushes === 0) {
      const moved = this.shiftRun(path, path.length, events);
      events.push({ t: 'weightPushed', cells: moved });
      return false;
    }
    for (let i = 0; i <= strength + 1 && i < path.length; i++) {
      const cell = path[i];
      if (!cell) break;
      const kind = enemyKind(this.get(cell.col, cell.row));
      if (this.volleyCrushes < strength && kind && this.rules.enemies[kind].weight) {
        const beyond = path[i + 1];
        if (beyond && this.get(beyond.col, beyond.row) !== TileId.Empty) {
          this.volleyCrushes++;
          this.shiftRun(path, i + 1, events);
          events.push({ t: 'enemyKilled', kind, at: cell, by: 'weight' });
          return false;
        }
        break;
      }
    }
    return this.landWeight(p, events);
  }

  private landWeight(p: Projectile, events: SessionEvent[]): boolean {
    this.landShot(p, events);
    return true;
  }

  /**
   * Shifts `path[1..count-1]` one cell forward (`FUN_0040b3e8`): every cell
   * takes the contents of the one before it; a land mine explodes instead of
   * receiving anything, which destroys the object that would have entered it.
   */
  private shiftRun(path: readonly GridPos[], count: number, events: SessionEvent[]): GridPos[] {
    const moved: GridPos[] = [];
    let previousWasMine = false;
    for (let i = count - 1; i >= 1; i--) {
      const dst = path[i];
      const src = path[i - 1];
      if (!dst || !src) continue;
      const dstId = this.get(dst.col, dst.row);
      if (dstId === TileId.Mine && !this.isDying(dst.col, dst.row)) {
        this.startDying(dst, 'destroyed', events);
        events.push({ t: 'mine', at: dst, by: 'push' });
        previousWasMine = true;
        continue;
      }
      if (previousWasMine) {
        const kind = enemyKind(dstId);
        if (kind) events.push({ t: 'enemyKilled', kind, at: dst, by: 'mine' });
        previousWasMine = false;
      }
      const srcId = this.get(src.col, src.row);
      this.grid.set(dst.col, dst.row, srcId);
      this.copyDying(src, dst);
      if (srcId !== TileId.Empty) moved.push(dst);
    }
    return moved;
  }

  // ---- combos and kills --------------------------------------------------

  private resolveCombos(events: SessionEvent[]): void {
    for (const combo of findCombos(this, this.comboMin)) {
      if (this.get(combo.col, combo.row) !== combo.kind) continue;
      const size = countGroup(this, combo.col, combo.row, combo.kind, false);
      if (size < this.comboMin) continue;
      const money = size - 2;
      this.money += money;
      this.stats.moneyEarned += money;
      this.stats.combos++;
      this.stats.comboPieces += size;
      const { cells, flagged } = collectCombo(this, combo.col, combo.row, combo.kind);
      for (const c of cells) this.startDying(c, 'pop', events);
      events.push({ t: 'combo', kind: combo.kind, cells, money });
      this.killFlagged(flagged, events);
    }
  }

  /** `FUN_0040bf59`: enemies next to a cleared combo die according to their rule. */
  private killFlagged(flagged: Uint8Array, events: SessionEvent[]): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!flagged[row * GRID_SIZE + col]) continue;
        const kind = enemyKind(this.get(col, row));
        if (!kind || this.isDying(col, row)) continue;
        const min = this.rules.enemies[kind].comboMin;
        if (min === null) continue;
        let dies = min <= this.comboMin;
        if (!dies) {
          for (const [dc, dr] of [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0],
          ] as const) {
            const id = this.get(col + dc, row + dr);
            if (!isThingie(id)) continue;
            if (countGroup(this, col + dc, row + dr, id, true) >= min) {
              dies = true;
              break;
            }
          }
        }
        if (!dies) continue;
        const at = { col, row };
        this.startDying(at, 'pop', events);
        events.push({ t: 'enemyKilled', kind, at, by: 'combo' });
      }
    }
  }

  /** `FUN_00404be5`: blocks of an extinct enemy type pop, and the level is won when none remain. */
  private updateBlocksAndWin(events: SessionEvent[]): void {
    const counts = this.enemies;
    for (const kind of ENEMY_KINDS) {
      if (counts[kind] > 0) continue;
      const cells: GridPos[] = [];
      for (const p of this.grid.positions((id) => enemyBlockKind(id) === kind)) {
        if (this.isDying(p.col, p.row)) continue;
        const at = { col: p.col, row: p.row };
        this.startDying(at, 'pop', events);
        cells.push(at);
      }
      if (cells.length > 0) events.push({ t: 'enemyBlocksCleared', kind, cells });
    }
    if (this.level.world === 7) {
      // The beta's final level is a survival challenge; its duration was never set in the exe.
      if (this.seconds >= this.level.timeToBeat) this.win(events);
      return;
    }
    let total = 0;
    for (const kind of ENEMY_KINDS) total += counts[kind];
    if (total === 0) this.win(events);
  }

  private win(events: SessionEvent[]): void {
    this.status = 'won';
    events.push({
      t: 'won',
      ticks: this.ticks,
      star: this.elapsedSeconds <= this.level.timeToBeat,
    });
  }

  private advanceRosco(events: SessionEvent[]): void {
    for (const what of this.rosco.tick(this.ticks)) {
      if (what === 'emerged') events.push({ t: 'roscoEmerged' });
      else if (what === 'speedUp')
        events.push({ t: 'roscoSpeedUp', periodMs: this.rosco.periodMs });
      else {
        this.money -= this.rosco.stealAmount;
        this.stats.moneyStolen += this.rosco.stealAmount;
        events.push({ t: 'roscoStole', amount: this.rosco.stealAmount, money: this.money });
      }
    }
  }

  // ---- destroy animations ------------------------------------------------

  private startDying(at: GridPos, kind: DestroyKind, events: SessionEvent[]): void {
    if (!inBounds(at.col, at.row)) return;
    const i = at.row * GRID_SIZE + at.col;
    const already = (this.dyingTicks[i] ?? 0) > 0;
    this.dyingTicks[i] = this.rules.destroyTicks;
    this.dyingCode[i] = DESTROY_CODE[kind];
    if (!already) events.push({ t: 'destroyed', at, id: this.get(at.col, at.row), kind });
  }

  private clearDying(at: GridPos): void {
    const i = at.row * GRID_SIZE + at.col;
    this.dyingTicks[i] = 0;
    this.dyingCode[i] = 0;
  }

  private copyDying(from: GridPos, to: GridPos): void {
    const f = from.row * GRID_SIZE + from.col;
    const t = to.row * GRID_SIZE + to.col;
    this.dyingTicks[t] = this.dyingTicks[f] ?? 0;
    this.dyingCode[t] = this.dyingCode[f] ?? 0;
  }

  private advanceDying(events: SessionEvent[]): void {
    for (let i = 0; i < this.dyingTicks.length; i++) {
      const left = this.dyingTicks[i] ?? 0;
      if (left <= 0) continue;
      const id = this.grid.cells[i] ?? TileId.Empty;
      if (id === TileId.Empty) {
        this.dyingTicks[i] = 0;
        this.dyingCode[i] = 0;
        continue;
      }
      if (left > 1) {
        this.dyingTicks[i] = left - 1;
        continue;
      }
      this.dyingTicks[i] = 0;
      this.dyingCode[i] = 0;
      this.grid.cells[i] = TileId.Empty;
      events.push({ t: 'cleared', at: { col: i % GRID_SIZE, row: Math.floor(i / GRID_SIZE) }, id });
    }
  }

  /** Fingerprint of everything that affects future ticks, for replay tests. */
  hash(): string {
    const h = new Fnv1a();
    h.bytes(this.grid.cells);
    for (let i = 0; i < this.dyingTicks.length; i++) {
      h.int(this.dyingTicks[i] ?? 0).byte(this.dyingCode[i] ?? 0);
    }
    h.int(this.ticks).int(this.money).int(this.rng.state());
    h.string(this.status)
      .byte(this.storeOpen ? 1 : 0)
      .int(this.volleyCrushes);
    for (const s of [this.shooters.bottom, this.shooters.right]) h.int(s.size).int(s.lane);
    for (const q of this.queues) {
      h.int(q.length);
      for (const v of q) h.int(v);
    }
    for (const p of this.projectiles) {
      h.int(p.lane).int(p.col).int(p.row).int(p.ammo).string(p.dir);
    }
    h.int(this.stats.shots).int(this.stats.combos).int(this.stats.comboPieces);
    for (const v of this.rosco.hashInputs) h.int(v);
    return h.hex();
  }
}

function clampSize(n: number): number {
  return Math.max(1, Math.min(3, Math.floor(n)));
}

export { enemyId };
