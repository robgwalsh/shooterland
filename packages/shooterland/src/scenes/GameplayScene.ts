import type { Assets, WorldAssets } from '../assets/AssetLoader';
import type { GameAudio } from '../audio/AudioEngine';
import { GRID_SIZE, TICK_RATE, TILE_PX } from '../core/constants';
import type { LevelData } from '../core/level/LevelData';
import type { Rules } from '../core/rules';
import { type Command, GameSession, type SessionEvent } from '../core/sim/GameSession';
import { enemyKind, isEnemy, isThingie } from '../core/tiles';
import {
  ENEMY_KINDS,
  type EnemyKind,
  type ItemKind,
  type ShooterSide,
  TileId,
} from '../core/types';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import {
  bottomShooterRect,
  enemyFrame,
  fireFrame,
  itemRect,
  letterRect,
  MINE,
  PIGGY,
  RING,
  rightShooterRect,
  roscoFrame,
  STUMP,
  swirlFrame,
  thingieFrame,
  tileSheetRect,
} from '../render/sprites';
import { drawSlot, drawSlotCentred, Slot } from './fonts';
import { aimedLane, BUBBLE_PX, bubbleOrigins, cellAt, cellX, cellY, LAYOUT } from './layout';
import type { Scene, SceneContext } from './Scene';
import { contains, type Rect } from './ui';

export interface GameplayResult {
  readonly outcome: 'won' | 'lost';
  readonly session: GameSession;
}

export interface GameplayOptions {
  readonly assets: Assets;
  readonly world: WorldAssets;
  readonly level: LevelData;
  readonly seed: number;
  readonly rules?: Rules | undefined;
  readonly audio?: GameAudio | undefined;
  readonly onFinish: (result: GameplayResult) => void;
  readonly onEvents?: ((events: readonly SessionEvent[]) => void) | undefined;
  /** The player confirmed Quit (or pressed Escape). */
  readonly onQuit?: (() => void) | undefined;
  /** The player confirmed Retry. */
  readonly onRetry?: (() => void) | undefined;
}

const ENEMY_LABEL: Record<EnemyKind, string> = {
  crony: 'Cronies:',
  crazy: 'Crazies:',
  fatty: 'Fatties:',
  fangie: 'Fangies:',
  skully: 'Skullies:',
};

/** Store slots in the exe's order: weights 1-3, the bomb, the four ramps. */
const STORE_SLOTS: readonly { item: ItemKind; rect: Rect }[] = [
  { item: TileId.Weight1, rect: LAYOUT.store.weights[0] },
  { item: TileId.Weight2, rect: LAYOUT.store.weights[1] },
  { item: TileId.Weight3, rect: LAYOUT.store.weights[2] },
  { item: TileId.Bomb, rect: LAYOUT.store.bomb },
  { item: TileId.RampTopLeft, rect: LAYOUT.store.ramps[0] },
  { item: TileId.RampTopRight, rect: LAYOUT.store.ramps[1] },
  { item: TileId.RampBottomLeft, rect: LAYOUT.store.ramps[2] },
  { item: TileId.RampBottomRight, rect: LAYOUT.store.ramps[3] },
];

/** Ticks per animation frame: 100 ms for idle frames, 56 ms for destroy frames (as in the exe). */
const IDLE_FRAME_TICKS = 6;
const DESTROY_FRAMES = 11;

interface Wobble {
  readonly frames: readonly number[];
  readonly start: number;
  readonly until: number;
}

/**
 * One level of play, drawn and controlled the way the exe does it
 * (docs/RULES.md, docs/DISASSEMBLY.md "Layout"): the pointer aims both bars,
 * a left click on the board fires, the right button or the Store button
 * opens the store, the three panel buttons retry, pause and quit.
 */
export class GameplayScene implements Scene {
  readonly session: GameSession;
  private readonly assets: Assets;
  private readonly world: WorldAssets;
  private pending: Command[] = [];
  private pointerX = -1;
  private pointerY = -1;
  private frameTicks = 0;
  private finished = false;
  paused = false;
  /** The confirmation asked by the Retry or Quit button. */
  prompt: 'retry' | 'quit' | null = null;
  private musicOn = true;
  /** Item being dragged from the store toward a lane bubble. */
  private drag: ItemKind | null = null;
  private bombQuantity = 1;
  /** Landed-thingy wobbles by cell index. */
  private readonly wobbles = new Map<number, Wobble>();

  constructor(private readonly opts: GameplayOptions) {
    this.assets = opts.assets;
    this.world = opts.world;
    this.session = new GameSession(opts.level, opts.seed, opts.rules);
  }

  enter(_ctx: SceneContext): void {}

  update(_dt: number, input: readonly InputEvent[]): void {
    this.handleInput(input);
    if (this.paused || this.prompt) {
      this.pending = [];
      return;
    }
    const commands = this.pending;
    this.pending = [];
    const events = this.session.tick(commands);
    this.frameTicks++;
    for (const e of events) this.onEvent(e);
    if (events.length > 0) this.opts.onEvents?.(events);
    if (!this.finished && this.session.status !== 'playing') {
      this.finished = true;
      this.opts.onFinish({
        outcome: this.session.status === 'won' ? 'won' : 'lost',
        session: this.session,
      });
    }
  }

  // ---- input ---------------------------------------------------------------

  private handleInput(input: readonly InputEvent[]): void {
    for (const e of input) {
      if (e.type === 'key') {
        this.keyInput(e.key);
        continue;
      }
      this.pointerX = e.x;
      this.pointerY = e.y;
      if (e.type === 'move') {
        if (!this.session.storeOpen && !this.paused && !this.prompt) this.aim(e.x, e.y);
        continue;
      }
      if (e.type === 'up') {
        if (e.button === 0 && this.drag !== null) this.drop(e.x, e.y);
        continue;
      }
      // down
      if (this.prompt) {
        this.promptInput(e.x, e.y);
        continue;
      }
      if (e.button === 2) {
        if (!this.paused) this.toggleStore();
        continue;
      }
      if (e.button !== 0) continue;
      if (contains(LAYOUT.hud.menuButtons[1], e.x, e.y)) {
        this.paused = !this.paused;
        continue;
      }
      if (this.paused) continue;
      if (contains(LAYOUT.hud.menuButtons[0], e.x, e.y)) {
        this.prompt = 'retry';
        continue;
      }
      if (contains(LAYOUT.hud.menuButtons[2], e.x, e.y)) {
        this.prompt = 'quit';
        continue;
      }
      if (contains(LAYOUT.hud.musicButton, e.x, e.y) && !this.session.storeOpen) {
        this.toggleMusic();
        continue;
      }
      if (contains(LAYOUT.hud.storeButton, e.x, e.y)) {
        this.toggleStore();
        continue;
      }
      if (this.session.storeOpen) {
        this.storeInput(e.x, e.y);
        continue;
      }
      if (e.x < LAYOUT.hud.x) {
        this.aim(e.x, e.y);
        this.pending.push({ t: 'fire' });
      }
    }
  }

  private keyInput(key: string): void {
    if (key === 'Escape') {
      if (this.prompt) this.prompt = null;
      else this.opts.onQuit?.();
    } else if (key === 'p' || key === 'P') {
      if (!this.prompt) this.paused = !this.paused;
    }
  }

  private aim(x: number, y: number): void {
    const b = this.session.shooters.bottom;
    const r = this.session.shooters.right;
    this.pending.push({
      t: 'aim',
      bottom: aimedLane(x, LAYOUT.board.x, b.size),
      right: aimedLane(y, LAYOUT.board.y, r.size),
    });
  }

  private toggleStore(): void {
    if (this.session.storeOpen) {
      this.pending.push({ t: 'closeStore' });
      this.drag = null;
    } else {
      this.pending.push({ t: 'openStore' });
      this.bombQuantity = 1;
    }
  }

  private toggleMusic(): void {
    this.musicOn = !this.musicOn;
    const world = Math.min(7, Math.max(1, this.opts.level.world));
    this.opts.audio?.music(this.musicOn ? `world${world}` : null);
  }

  private promptInput(x: number, y: number): void {
    const [confirm, back] = LAYOUT.prompt.buttons;
    if (confirm && contains(confirm, x, y)) {
      const which = this.prompt;
      this.prompt = null;
      if (which === 'retry') this.opts.onRetry?.();
      else this.opts.onQuit?.();
    } else if (back && contains(back, x, y)) {
      this.prompt = null;
    }
  }

  /** Press on a store slot, the +/- buttons, or a thingy on the board (`FUN_00408561`). */
  private storeInput(x: number, y: number): void {
    if (contains(LAYOUT.store.minus, x, y)) {
      this.bombQuantity = Math.max(1, this.bombQuantity - 1);
      return;
    }
    if (contains(LAYOUT.store.plus, x, y)) {
      this.bombQuantity++;
      return;
    }
    for (const slot of STORE_SLOTS) {
      if (contains(slot.rect, x, y)) {
        this.drag = slot.item;
        return;
      }
    }
    if (x < LAYOUT.hud.x) {
      const cell = cellAt(x, y);
      const id = cell ? this.session.grid.get(cell.col, cell.row) : TileId.Empty;
      if (isThingie(id)) this.drag = id as ItemKind;
    }
  }

  private drop(x: number, y: number): void {
    const item = this.drag;
    this.drag = null;
    if (item === null) return;
    const target = this.bubbleAt(x, y);
    if (!target) return;
    this.pending.push({
      t: 'buy',
      item,
      shooter: target.side,
      lane: target.lane,
      quantity: item === TileId.Bomb ? this.bombQuantity : 1,
    });
  }

  private bubbleRects(side: ShooterSide): Rect[] {
    const s = this.session.shooters[side];
    return bubbleOrigins(side, s.lane, s.size).map((o) =>
      side === 'bottom'
        ? { x: o, y: 540, w: BUBBLE_PX, h: BUBBLE_PX }
        : { x: 540, y: o, w: BUBBLE_PX, h: BUBBLE_PX },
    );
  }

  private bubbleAt(x: number, y: number): { side: ShooterSide; lane: number } | null {
    for (const side of ['bottom', 'right'] as const) {
      const rects = this.bubbleRects(side);
      for (let lane = 0; lane < rects.length; lane++) {
        const r = rects[lane];
        if (r && contains(r, x, y)) return { side, lane };
      }
    }
    return null;
  }

  // ---- events --------------------------------------------------------------

  private onEvent(e: SessionEvent): void {
    const audio = this.opts.audio;
    switch (e.t) {
      case 'fired':
        audio?.sfx('shoot');
        break;
      case 'landed':
        if (isThingie(e.ammo) && e.at.col < GRID_SIZE && e.at.row < GRID_SIZE) {
          audio?.sfx('thingyhit');
          // The exe wobbles a landed thingy for 0.8 to 8.8 s (frames 3-6 or 7-10 of its row).
          const vertical = e.dir === 'up' || e.dir === 'down';
          const frames = vertical ? [7, 8, 9, 10, 9, 8] : [3, 4, 5, 6, 5, 4];
          const seed = (e.at.col * 31 + e.at.row * 17 + this.frameTicks) % 480;
          this.wobbles.set(e.at.row * GRID_SIZE + e.at.col, {
            frames,
            start: this.frameTicks,
            until: this.frameTicks + 48 + seed,
          });
        }
        break;
      case 'bought':
        audio?.sfx('pop');
        break;
      case 'bomb':
      case 'mine':
        audio?.sfx('bomb');
        break;
      case 'combo':
        audio?.sfx('combo');
        break;
      case 'enemyKilled':
        if (e.by === 'weight' || e.by === 'mine') audio?.sfx('pop');
        break;
      case 'cleared':
        this.wobbles.delete(e.at.row * GRID_SIZE + e.at.col);
        break;
      default:
        break;
    }
  }

  // ---- drawing -------------------------------------------------------------

  draw(renderer: Renderer): void {
    const { session } = this;
    const hidden = this.paused || this.prompt !== null;
    renderer.begin();
    // The exe draws the "dark" variant during play: it carries the finished HUD art.
    renderer.drawImage(this.world.backgroundDark, 0, 0);
    if (!hidden) {
      this.drawBoard(renderer);
      this.drawGridLines(renderer, false);
      this.drawAuras(renderer);
      this.drawBars(renderer);
      this.drawProjectiles(renderer);
    } else {
      this.drawGridLines(renderer, true);
    }
    this.drawHud(renderer, hidden);
    if (!hidden) this.drawRosco(renderer);
    if (session.storeOpen && !hidden) this.drawStore(renderer);
    if (this.paused) this.drawPause(renderer);
    if (this.prompt) this.drawPrompt(renderer);
    renderer.end();
  }

  private drawTile(renderer: Renderer, id: number, frame: number, x: number, y: number): void {
    const item = itemRect(id);
    if (item) {
      renderer.drawSprite(this.assets.image('items'), item.x, item.y, item.w, item.h, x, y);
      return;
    }
    const r = tileSheetRect(id, frame);
    if (r) renderer.drawSprite(this.world.tiles, r.x, r.y, r.w, r.h, x, y);
  }

  /** Idle frame of a tile: landed thingies wobble, enemies breathe, everything else is still. */
  private idleFrame(id: number, col: number, row: number): number {
    if (isThingie(id)) {
      const w = this.wobbles.get(row * GRID_SIZE + col);
      if (!w) return 0;
      if (this.frameTicks >= w.until) {
        this.wobbles.delete(row * GRID_SIZE + col);
        return 0;
      }
      const step = Math.floor((this.frameTicks - w.start) / IDLE_FRAME_TICKS);
      return w.frames[step % w.frames.length] ?? 0;
    }
    if (isEnemy(id)) {
      const cycle = [0, 1, 2, 3, 4, 3, 2, 1, 0, 5, 6, 7, 8, 7, 6, 5];
      const step = Math.floor(this.frameTicks / IDLE_FRAME_TICKS) + col * 3 + row * 5;
      return cycle[step % cycle.length] ?? 0;
    }
    return 0;
  }

  private drawBoard(renderer: Renderer): void {
    const { session } = this;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const id = session.grid.get(col, row);
        if (id === TileId.Empty) continue;
        const x = cellX(col);
        const y = cellY(row);
        const dying = session.dying(col, row);
        if (!dying) {
          this.drawTile(renderer, id, this.idleFrame(id, col, row), x, y);
          continue;
        }
        const frame = Math.min(
          DESTROY_FRAMES - 1,
          Math.floor((dying.elapsed * DESTROY_FRAMES) / dying.total),
        );
        if (dying.kind === 'blast') {
          // A landed bomb plays the tile sheet's bomb row.
          const r = thingieFrame(TileId.Thingie1, frame);
          renderer.drawSprite(this.world.tiles, r.x, r.y - TILE_PX, r.w, r.h, x, y);
          continue;
        }
        if (frame < 7) this.drawTile(renderer, id, 0, x, y);
        const fx = dying.kind === 'destroyed' ? fireFrame(frame) : swirlFrame(frame);
        renderer.drawSprite(this.assets.image('explosion'), fx.x, fx.y, fx.w, fx.h, x, y);
      }
    }
  }

  /** The exe's 14 grid lines each way; the lines around the bars cycle colour (`FUN_004016db`). */
  private drawGridLines(renderer: Renderer, plain: boolean): void {
    const { board } = LAYOUT;
    const t = (this.frameTicks * 1000) / TICK_RATE;
    const pulse = (period: number): number => (Math.abs(Math.sin(t / period)) * 128 + 128) / 255;
    const hi = { r: pulse(8000), g: pulse(6400), b: pulse(4800) };
    const lo = { r: 1 / 255, g: 0, b: 11 / 255 };
    const b = this.session.shooters.bottom;
    const r = this.session.shooters.right;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const hLit = !plain && i >= r.lane && i <= r.lane + r.size;
      const vLit = !plain && i >= b.lane && i <= b.lane + b.size;
      const hc = hLit ? hi : lo;
      const vc = vLit ? hi : lo;
      renderer.drawRect(board.x, board.y + i * TILE_PX, board.size, 1, hc.r, hc.g, hc.b);
      renderer.drawRect(board.x + i * TILE_PX, board.y, 1, board.size, vc.r, vc.g, vc.b);
    }
  }

  /** Pulsing red 3 px outline around every enemy (`FUN_004015cc`). */
  private drawAuras(renderer: Renderer): void {
    const t = (this.frameTicks * 1000) / TICK_RATE;
    const red = (Math.abs(Math.sin(t / 1000)) * 128) / 255;
    for (const p of this.session.grid.positions(isEnemy)) {
      const x = cellX(p.col) - 1;
      const y = cellY(p.row) - 1;
      renderer.drawRect(x, y, TILE_PX, 3, red, 0, 0);
      renderer.drawRect(x, y + TILE_PX - 1, TILE_PX + 2, 3, red, 0, 0);
      renderer.drawRect(x, y, 3, TILE_PX, red, 0, 0);
      renderer.drawRect(x + TILE_PX - 1, y, 3, TILE_PX + 3, red, 0, 0);
    }
  }

  /** Bars with their loaded items showing through (`FUN_0040e9d1`). */
  private drawBars(renderer: Renderer): void {
    const { session } = this;
    const shooters = this.assets.image('shooters');
    const b = session.shooters.bottom;
    const bx = cellX(b.lane);
    b.lanes.forEach((lane, i) => {
      if (lane.loaded !== TileId.Empty) {
        this.drawTile(renderer, lane.loaded, 0, bx + i * TILE_PX, LAYOUT.bottomBarY);
      }
    });
    const br = bottomShooterRect(b.size);
    renderer.drawSprite(shooters, br.x, br.y, br.w, br.h, bx, LAYOUT.bottomBarY);

    const r = session.shooters.right;
    const ry = cellY(r.lane);
    r.lanes.forEach((lane, i) => {
      if (lane.loaded !== TileId.Empty) {
        this.drawTile(renderer, lane.loaded, 0, LAYOUT.rightBarX, ry + i * TILE_PX);
      }
    });
    const rr = rightShooterRect(r.size);
    renderer.drawSprite(shooters, rr.x, rr.y, rr.w, rr.h, LAYOUT.rightBarX, ry);
  }

  private drawProjectiles(renderer: Renderer): void {
    for (const p of this.session.inFlight) {
      this.drawTile(renderer, p.ammo, 0, cellX(p.col), cellY(p.row));
    }
  }

  private drawHud(renderer: Renderer, hidden: boolean): void {
    const { session, assets } = this;
    const { hud } = LAYOUT;
    drawSlotCentred(
      renderer,
      assets,
      Slot.bigWhite,
      `Level ${session.level.world}-${session.level.level}`,
      hud.title,
    );
    drawSlotCentred(renderer, assets, Slot.yellow, `${session.money}`, hud.money);

    // Enemy counts next to the icons painted into the panel art.
    const counts = session.enemies;
    ENEMY_KINDS.forEach((kind, i) => {
      const pos = hud.counters[i];
      if (pos) drawSlot(renderer, assets, Slot.bigBlack, `${counts[kind]}`, pos.x, pos.y);
    });

    if (!hidden) {
      drawSlot(
        renderer,
        assets,
        Slot.smallBlack,
        `Time: ${session.elapsedSeconds}s`,
        hud.time.x,
        hud.time.y,
      );
      drawSlot(
        renderer,
        assets,
        Slot.smallBlack,
        `TTB: ${session.level.timeToBeat}s`,
        hud.ttb.x,
        hud.ttb.y,
      );
    }

    // Next item per lane, in black boxes (`FUN_0040e3a8`).
    const b = session.shooters.bottom;
    b.lanes.forEach((lane, i) => {
      const x = hud.nextBottom.xs[3 - b.size + i];
      if (x === undefined) return;
      renderer.drawRect(x, hud.nextBottom.y, TILE_PX, TILE_PX, 0, 0, 0);
      if (lane.next !== TileId.Empty) this.drawTile(renderer, lane.next, 0, x, hud.nextBottom.y);
    });
    const r = session.shooters.right;
    r.lanes.forEach((lane, i) => {
      const y = hud.nextRight.ys[3 - r.size + i];
      if (y === undefined) return;
      renderer.drawRect(hud.nextRight.x, y, TILE_PX, TILE_PX, 0, 0, 0);
      if (lane.next !== TileId.Empty) this.drawTile(renderer, lane.next, 0, hud.nextRight.x, y);
    });

    // Music toggle (buttonz.png: 0/1 off, 2/3 on; odd frames are hovered).
    const hovered = contains(hud.musicButton, this.pointerX, this.pointerY);
    const frame = (this.musicOn ? 2 : 0) + (hovered ? 1 : 0);
    const mb = hud.musicButton;
    renderer.drawSprite(assets.image('buttonz'), frame * mb.w, 0, mb.w, mb.h, mb.x, mb.y);

    // Retry / Pause / Quit (painted into the panel) get an outline under the pointer, as the exe's button class draws.
    hud.menuButtons.forEach((rect, i) => {
      const lit = contains(rect, this.pointerX, this.pointerY) || (i === 1 && this.paused);
      this.drawOutline(renderer, rect, lit);
    });
  }

  private drawOutline(renderer: Renderer, rect: Rect, lit: boolean): void {
    const c = lit ? { r: 0.67, g: 0.67, b: 1 } : { r: 0.25, g: 0.25, b: 0.25 };
    renderer.drawRect(rect.x - 1, rect.y - 1, rect.w + 2, 1, c.r, c.g, c.b);
    renderer.drawRect(rect.x - 1, rect.y + rect.h, rect.w + 2, 1, c.r, c.g, c.b);
    renderer.drawRect(rect.x - 1, rect.y - 1, 1, rect.h + 2, c.r, c.g, c.b);
    renderer.drawRect(rect.x + rect.w, rect.y - 1, 1, rect.h + 2, c.r, c.g, c.b);
  }

  /** Stump, piggy bank, Rosco on his rounds and the speed-up countdown (`FUN_00409e61`). */
  private drawRosco(renderer: Renderer): void {
    const { assets, session } = this;
    const sheet = assets.image('stumpandmoney');
    renderer.drawSprite(sheet, STUMP.x, STUMP.y, STUMP.w, STUMP.h, LAYOUT.stump.x, LAYOUT.stump.y);
    renderer.drawSprite(sheet, PIGGY.x, PIGGY.y, PIGGY.w, PIGGY.h, LAYOUT.piggy.x, LAYOUT.piggy.y);
    const { rosco } = session;
    if (!rosco.emerged) return;
    const base = { left: 0, down: 2, up: 4, right: 6 }[rosco.facing];
    const f = roscoFrame(base + rosco.walkFrame);
    renderer.drawSprite(
      assets.image('raccoon'),
      f.x,
      f.y,
      f.w,
      f.h,
      Math.round(rosco.x),
      Math.round(rosco.y),
    );
    drawSlot(
      renderer,
      assets,
      Slot.smallWhite,
      `${rosco.countdownSeconds}`,
      LAYOUT.countdown.x,
      LAYOUT.countdown.y,
    );
  }

  private drawStore(renderer: Renderer): void {
    const { session, assets } = this;
    const { store, hud } = LAYOUT;
    // The panel art covers the next-item boxes while the store is open, as in the exe.
    renderer.drawImage(this.world.supplement, hud.supplement.x, hud.supplement.y);
    drawSlotCentred(renderer, assets, Slot.yellow, `${session.money}`, hud.money);
    const prices = session.rules.prices;
    for (const slot of STORE_SLOTS) {
      this.drawTile(renderer, slot.item, 0, slot.rect.x, slot.rect.y);
      const priceX = slot.rect.x < 700 ? store.priceLeftX : store.priceRightX;
      drawSlot(renderer, assets, Slot.black, `$${prices[slot.item] ?? 0}`, priceX, slot.rect.y + 5);
    }
    const pm = assets.image('plusminus');
    renderer.drawSprite(pm, 0, 0, 9, 9, store.minus.x, store.minus.y);
    renderer.drawSprite(pm, 9, 0, 9, 9, store.plus.x, store.plus.y);
    drawSlot(
      renderer,
      assets,
      Slot.smallWhite,
      `X${this.bombQuantity}`,
      store.bombQuantity.x,
      store.bombQuantity.y,
    );

    // Drop bubbles over every lane; the one under a dragged item turns red.
    const bubbles = assets.image('bubbles');
    const hover = this.drag !== null ? this.bubbleAt(this.pointerX, this.pointerY) : null;
    for (const side of ['bottom', 'right'] as const) {
      this.bubbleRects(side).forEach((rect, lane) => {
        const lit = hover !== null && hover.side === side && hover.lane === lane;
        renderer.drawSprite(
          bubbles,
          lit ? BUBBLE_PX : 0,
          0,
          BUBBLE_PX,
          BUBBLE_PX,
          rect.x,
          rect.y,
          BUBBLE_PX,
          BUBBLE_PX,
          0.5,
        );
      });
    }

    if (this.drag !== null) {
      const x = this.pointerX - TILE_PX / 2;
      const y = this.pointerY - TILE_PX / 2;
      this.drawTile(renderer, this.drag, 0, x, y);
      if (this.drag === TileId.Bomb) {
        drawSlot(renderer, assets, Slot.smallWhite, `X${this.bombQuantity}`, x + 10, y + 10);
      } else if (isThingie(this.drag)) {
        drawSlot(renderer, assets, Slot.smallWhite, `$${prices[this.drag] ?? 0}`, x, y);
      }
    }
  }

  /** Pause screen (`FUN_00407371`): bobbing letters and the kill-method chart. */
  private drawPause(renderer: Renderer): void {
    const { assets, session } = this;
    const { pause } = LAYOUT;
    const t = (this.frameTicks * 1000) / TICK_RATE;
    const letters = assets.image('pause');
    for (let i = 0; i < 5; i++) {
      const r = letterRect(i, pause.letters.size);
      const y = pause.letters.y + Math.sin((t + i * 800) / 500) * 15 + 15;
      renderer.drawSprite(letters, r.x, r.y, r.w, r.h, pause.letters.x + i * pause.letters.step, y);
    }
    const [bombX, comboX, weightX, mineX] = pause.headerXs;
    const bomb = tileSheetRect(TileId.Bomb, 0);
    if (bomb)
      renderer.drawSprite(
        this.world.tiles,
        bomb.x,
        bomb.y,
        bomb.w,
        bomb.h,
        bombX ?? 0,
        pause.headerY,
      );
    const pop = swirlFrame(7);
    renderer.drawSprite(
      assets.image('explosion'),
      pop.x,
      pop.y,
      pop.w,
      pop.h,
      comboX ?? 0,
      pause.headerY,
    );
    const weight = itemRect(TileId.HeavyWeight);
    if (weight)
      renderer.drawSprite(
        assets.image('items'),
        weight.x,
        weight.y,
        weight.w,
        weight.h,
        weightX ?? 0,
        pause.headerY,
      );
    renderer.drawSprite(
      this.world.tiles,
      MINE.x,
      MINE.y,
      MINE.w,
      MINE.h,
      mineX ?? 0,
      pause.headerY,
    );

    ENEMY_KINDS.forEach((kind, i) => {
      const y = pause.firstRowY + i * pause.rowStep;
      const e = enemyFrame(kind, 0);
      renderer.drawSprite(this.world.tiles, e.x, e.y, e.w, e.h, pause.enemyX, y);
      drawSlot(renderer, assets, Slot.white, ENEMY_LABEL[kind], pause.nameX, y + 3);
      const rule = session.rules.enemies[kind];
      const marks: (number | undefined)[] = [
        rule.bomb ? bombX : undefined,
        rule.comboMin !== null ? comboX : undefined,
        rule.weight ? weightX : undefined,
        rule.mine ? mineX : undefined,
      ];
      marks.forEach((x, c) => {
        if (x === undefined) return;
        renderer.drawSprite(this.world.tiles, RING.x, RING.y, RING.w, RING.h, x, y);
        if (c === 1 && rule.comboMin !== null) {
          drawSlot(renderer, assets, Slot.white, `${rule.comboMin}`, x + 12, y + 3);
        }
      });
    });
  }

  /** "Do you wish to retry the level?" / "Are you sure you wish to quit?" on the wood panel. */
  private drawPrompt(renderer: Renderer): void {
    const { assets } = this;
    const { prompt } = LAYOUT;
    renderer.drawImage(assets.image('wood'), prompt.panel.x, prompt.panel.y);
    const retry = this.prompt === 'retry';
    drawSlotCentred(
      renderer,
      assets,
      Slot.white,
      retry ? 'Do you wish to' : 'Are you sure you',
      prompt.line1,
    );
    drawSlotCentred(
      renderer,
      assets,
      Slot.white,
      retry ? 'retry the level?' : 'wish to quit?',
      prompt.line2,
    );
    const labels = retry ? ['Retry', 'Back'] : ['Quit', 'Back'];
    prompt.buttons.forEach((rect, i) => {
      this.drawOutline(renderer, rect, contains(rect, this.pointerX, this.pointerY));
      drawSlotCentred(renderer, assets, Slot.smallWhite, labels[i] ?? '', rect);
    });
  }

  leave(): void {}
}

export { enemyKind };
