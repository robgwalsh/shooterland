import type { Assets, WorldAssets } from '../assets/AssetLoader';
import { TILE_PX, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '../core/constants';
import type { LevelData } from '../core/level/LevelData';
import type { Rules } from '../core/rules';
import { type Command, GameSession, type SessionEvent } from '../core/sim/GameSession';
import { DIR_DELTA } from '../core/tiles';
import {
  ENEMY_KINDS,
  type EnemyKind,
  type GridPos,
  type ItemKind,
  type ShooterSide,
  TileId,
} from '../core/types';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import {
  BUBBLE,
  bottomShooterRect,
  explosionFrame,
  itemRect,
  PIGGY,
  ROSCO,
  rightShooterRect,
  roscoFrame,
  STUMP,
  spriteFor,
  swirlFrame,
} from '../render/sprites';
import { cellAt, cellX, cellY, inRect, LAYOUT } from './layout';
import type { Scene, SceneContext } from './Scene';

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
  readonly onFinish: (result: GameplayResult) => void;
  readonly onEvents?: ((events: readonly SessionEvent[]) => void) | undefined;
}

interface Effect {
  kind: 'fire' | 'swirl';
  col: number;
  row: number;
  frame: number;
}

const ENEMY_LABEL: Record<EnemyKind, string> = {
  crony: 'Cronies',
  crazy: 'Crazies',
  fatty: 'Fatties',
  fangie: 'Fangies',
  skully: 'Skullies',
};

const STORE_ITEMS: readonly ItemKind[] = [
  TileId.Weight1,
  TileId.Weight2,
  TileId.Weight3,
  TileId.RampTopLeft,
  TileId.RampTopRight,
  TileId.RampBottomLeft,
  TileId.RampBottomRight,
];
const ITEM_NAME: Record<ItemKind, string> = {
  [TileId.Weight1]: '1-weight',
  [TileId.Weight2]: '2-weight',
  [TileId.Weight3]: '3-weight',
  [TileId.RampTopLeft]: 'ramp',
  [TileId.RampTopRight]: 'ramp',
  [TileId.RampBottomLeft]: 'ramp',
  [TileId.RampBottomRight]: 'ramp',
};
const STORE_HEADER = 30;
const STORE_ROW = 44;
const BUBBLE_PX = 62;

/**
 * One level of play. Translates pointer input into simulation commands,
 * advances the session once per tick and draws the board, shooters, HUD,
 * Rosco and transient effects.
 */
export class GameplayScene implements Scene {
  readonly session: GameSession;
  private readonly assets: Assets;
  private readonly world: WorldAssets;
  private readonly effects: Effect[] = [];
  private pending: Command[] = [];
  private pointer: GridPos | null = null;
  private pointerX = -1;
  private pointerY = -1;
  /** Store item being dragged toward a shooter bubble. */
  private drag: ItemKind | null = null;
  private frameTicks = 0;
  private finished = false;

  constructor(private readonly opts: GameplayOptions) {
    this.assets = opts.assets;
    this.world = opts.world;
    this.session = new GameSession(opts.level, opts.seed, opts.rules);
  }

  enter(_ctx: SceneContext): void {}

  update(_dt: number, input: readonly InputEvent[]): void {
    this.handleInput(input);
    const commands = this.pending;
    this.pending = [];
    const events = this.session.tick(commands);
    this.frameTicks++;
    for (const e of events) this.onEvent(e);
    if (events.length > 0) this.opts.onEvents?.(events);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      if (!fx) continue;
      if (this.frameTicks % 4 === 0) fx.frame++;
      if (fx.frame >= 7) this.effects.splice(i, 1);
    }
    if (!this.finished && this.session.status !== 'playing') {
      this.finished = true;
      this.opts.onFinish({
        outcome: this.session.status === 'won' ? 'won' : 'lost',
        session: this.session,
      });
    }
  }

  private handleInput(input: readonly InputEvent[]): void {
    const { session } = this;
    for (const e of input) {
      this.pointerX = e.x;
      this.pointerY = e.y;
      const cell = cellAt(e.x, e.y);
      if (session.storeOpen) {
        this.storeInput(e);
        continue;
      }
      if ((e.type === 'move' || e.type === 'down') && cell) {
        this.pointer = cell;
        this.pending.push({ t: 'aim', col: cell.col, row: cell.row });
      }
      if (e.type !== 'down') continue;
      if (cell) {
        this.pending.push({ t: 'fire' });
      } else if (inRect(e.x, e.y, LAYOUT.hud.storeButton, LAYOUT.hud.x, 0)) {
        this.pending.push({ t: 'openStore' });
      }
    }
  }

  /**
   * Store (tutorial 1-11): press an item, drag it onto Mary's red bubble or
   * Poindexter's blue bubble and release to buy it into that shooter.
   * Clicking outside the panel closes the store.
   */
  private storeInput(e: InputEvent): void {
    if (e.type === 'down') {
      const item = this.storeItemAt(e.x, e.y);
      if (item !== null) {
        const cost = this.session.rules.prices[item] ?? 0;
        if (this.session.money >= cost) this.drag = item;
        return;
      }
      if (!inRect(e.x, e.y, this.storePanel())) this.pending.push({ t: 'closeStore' });
      return;
    }
    if (e.type === 'up' && this.drag !== null) {
      const shooter = this.bubbleAt(e.x, e.y);
      if (shooter) this.pending.push({ t: 'buy', item: this.drag, shooter });
      this.drag = null;
    }
  }

  private storeItemAt(x: number, y: number): ItemKind | null {
    const panel = this.storePanel();
    if (!inRect(x, y, panel)) return null;
    const index = Math.floor((y - panel.y - STORE_HEADER) / STORE_ROW);
    return STORE_ITEMS[index] ?? null;
  }

  private storePanel(): { x: number; y: number; w: number; h: number } {
    return {
      x: LAYOUT.hud.x + 8,
      y: 60,
      w: LAYOUT.hud.width - 16,
      h: STORE_HEADER + STORE_ITEMS.length * STORE_ROW + 8,
    };
  }

  /** The 62px bubbles drawn over each shooter while the store is open. */
  private bubbleRect(side: ShooterSide): { x: number; y: number; w: number; h: number } {
    const s = this.session.shooters[side];
    const half = BUBBLE_PX / 2;
    if (side === 'bottom') {
      const cx = cellX(s.lane) + (TILE_PX * s.size) / 2;
      return {
        x: cx - half,
        y: LAYOUT.bottomShooterY + TILE_PX / 2 - half,
        w: BUBBLE_PX,
        h: BUBBLE_PX,
      };
    }
    const cy = cellY(s.lane) + (TILE_PX * s.size) / 2;
    return {
      x: LAYOUT.rightShooterX + TILE_PX / 2 - half,
      y: cy - half,
      w: BUBBLE_PX,
      h: BUBBLE_PX,
    };
  }

  private bubbleAt(x: number, y: number): ShooterSide | null {
    if (inRect(x, y, this.bubbleRect('bottom'))) return 'bottom';
    if (inRect(x, y, this.bubbleRect('right'))) return 'right';
    return null;
  }

  private onEvent(e: SessionEvent): void {
    switch (e.t) {
      case 'bomb':
        this.effects.push({ kind: 'fire', col: e.at.col, row: e.at.row, frame: 0 });
        break;
      case 'combo':
        for (const c of e.cells)
          this.effects.push({ kind: 'swirl', col: c.col, row: c.row, frame: 0 });
        break;
      case 'enemyKilled':
        this.effects.push({ kind: 'fire', col: e.at.col, row: e.at.row, frame: 0 });
        break;
      case 'mine':
        this.effects.push({ kind: 'fire', col: e.at.col, row: e.at.row, frame: 0 });
        for (const c of e.cleared)
          this.effects.push({ kind: 'swirl', col: c.col, row: c.row, frame: 0 });
        break;
      default:
        break;
    }
  }

  draw(renderer: Renderer): void {
    const { session, world, assets } = this;
    const thingieFrame = Math.floor(this.frameTicks / 8);
    const enemyFrame = Math.floor(this.frameTicks / 10);
    renderer.begin();
    renderer.drawImage(world.background, 0, 0);

    // Board.
    const items = assets.image('items');
    for (const { col, row, id } of session.grid.positions((id) => id !== TileId.Empty)) {
      const sprite = spriteFor(
        id,
        id >= TileId.Crony && id <= TileId.Skully ? enemyFrame : thingieFrame,
      );
      if (!sprite) continue;
      const tex = sprite.sheet === 'items' ? items : world.tiles;
      const r = sprite.rect;
      renderer.drawSprite(tex, r.x, r.y, r.w, r.h, cellX(col), cellY(row));
    }

    // Aim guides: the lanes each shooter covers.
    const b = session.shooters.bottom;
    const p = session.shooters.right;
    renderer.drawRect(
      cellX(b.lane),
      LAYOUT.board.y,
      TILE_PX * b.size,
      LAYOUT.board.size,
      1,
      0.2,
      0.2,
      0.12,
    );
    renderer.drawRect(
      LAYOUT.board.x,
      cellY(p.lane),
      LAYOUT.board.size,
      TILE_PX * p.size,
      0.2,
      0.4,
      1,
      0.12,
    );

    // Shooters and their loaded ammo.
    const shooters = assets.image('shooters');
    const br = bottomShooterRect(b.size);
    renderer.drawSprite(shooters, br.x, br.y, br.w, br.h, cellX(b.lane), LAYOUT.bottomShooterY);
    this.drawAmmo(
      renderer,
      b.loaded,
      cellX(b.lane) + (TILE_PX * (b.size - 1)) / 2,
      LAYOUT.bottomShooterY,
      thingieFrame,
    );
    const pr = rightShooterRect(p.size);
    renderer.drawSprite(shooters, pr.x, pr.y, pr.w, pr.h, LAYOUT.rightShooterX, cellY(p.lane));
    this.drawAmmo(
      renderer,
      p.loaded,
      LAYOUT.rightShooterX,
      cellY(p.lane) + (TILE_PX * (p.size - 1)) / 2,
      thingieFrame,
    );

    // Projectiles, interpolated toward their next cell.
    for (const proj of session.inFlight) {
      const d = DIR_DELTA[proj.dir];
      const x = cellX(proj.col + d.dc * proj.progress);
      const y = cellY(proj.row + d.dr * proj.progress);
      this.drawAmmo(renderer, proj.ammo, x, y, thingieFrame);
    }

    // Effects.
    const explosion = assets.image('explosion');
    for (const fx of this.effects) {
      const r = fx.kind === 'fire' ? explosionFrame(fx.frame) : swirlFrame(fx.frame + 2);
      const tex = fx.kind === 'fire' ? world.tiles : explosion;
      renderer.drawSprite(tex, r.x, r.y, r.w, r.h, cellX(fx.col), cellY(fx.row));
    }

    this.drawHud(renderer, thingieFrame);
    if (session.storeOpen) this.drawStore(renderer);
    renderer.end();
  }

  private drawAmmo(renderer: Renderer, ammo: number, x: number, y: number, frame: number): void {
    const sprite = spriteFor(ammo, frame);
    if (!sprite) return;
    const tex = sprite.sheet === 'items' ? this.assets.image('items') : this.world.tiles;
    const r = sprite.rect;
    renderer.drawSprite(tex, r.x, r.y, r.w, r.h, x, y);
  }

  private drawHud(renderer: Renderer, thingieFrame: number): void {
    const { session, assets, world } = this;
    const { hud } = LAYOUT;
    const font1 = assets.font('font1');
    const font2 = assets.font('font2');
    renderer.drawImage(world.supplement, hud.x, 0);
    renderer.drawText(font2, `${session.money}`, hud.x + hud.moneyBox.x + 6, hud.moneyBox.y + 3, {
      r: 1,
      g: 0.95,
      b: 0.4,
    });

    let y = hud.counters.y;
    for (const kind of ENEMY_KINDS) {
      const n = session.enemies[kind];
      if (n === 0 && session.level.cells.every((id) => tileKindOf(id) !== kind)) continue;
      renderer.drawText(font2, `${ENEMY_LABEL[kind]}: ${n}`, hud.counters.x, y);
      y += hud.counters.lineHeight;
    }

    const secs = Math.floor(session.seconds);
    renderer.drawText(font2, `Time: ${secs}s`, hud.timer.x, hud.timer.y);
    renderer.drawText(
      font2,
      `TTB: ${session.level.timeToBeat}s`,
      hud.timer.x,
      hud.timer.y + hud.counters.lineHeight,
    );

    // Next ammo for each shooter, inside their coloured bubbles.
    const bubbles = assets.image('bubbles');
    const nextY = hud.next.y;
    renderer.drawText(font2, 'Next', hud.x + 12, nextY - 18);
    renderer.drawSprite(bubbles, BUBBLE.red.x, BUBBLE.red.y, 62, 62, hud.x + 24, nextY);
    this.drawAmmo(
      renderer,
      session.shooters.bottom.next,
      hud.x + 24 + 11,
      nextY + 11,
      thingieFrame,
    );
    renderer.drawSprite(bubbles, BUBBLE.blue.x, BUBBLE.blue.y, 62, 62, hud.x + 110, nextY);
    this.drawAmmo(
      renderer,
      session.shooters.right.next,
      hud.x + 110 + 11,
      nextY + 11,
      thingieFrame,
    );

    // Rosco's route: piggy bank above, stump below.
    const stump = assets.image('stumpandmoney');
    renderer.drawSprite(stump, PIGGY.x, PIGGY.y, PIGGY.w, PIGGY.h, hud.piggy.x, hud.piggy.y);
    renderer.drawSprite(stump, STUMP.x, STUMP.y, STUMP.w, STUMP.h, hud.stump.x, hud.stump.y);
    const { rosco } = session;
    if (rosco.phase !== 'lair') {
      const raccoon = assets.image('raccoon');
      const frames = rosco.phase === 'toPiggy' ? ROSCO.walkAway : ROSCO.walkTowardWithBag;
      const f = frames[Math.floor(this.frameTicks / 8) % 2] ?? 0;
      const r = roscoFrame(f);
      const y = hud.stump.y + (hud.piggy.y - hud.stump.y) * rosco.position;
      renderer.drawSprite(raccoon, r.x, r.y, r.w, r.h, hud.piggy.x, y);
    }
    renderer.drawText(font1, `${rosco.countdownSeconds}`, hud.countdown.x, hud.countdown.y, {
      r: 1,
      g: 0.3,
      b: 0.2,
    });

    if (session.status !== 'playing') {
      renderer.drawRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 0, 0, 0, 0.4);
    }
  }

  private drawStore(renderer: Renderer): void {
    const { session, assets } = this;
    const font2 = assets.font('font2');
    const items = assets.image('items');
    const bubbles = assets.image('bubbles');
    const panel = this.storePanel();
    renderer.drawRect(panel.x, panel.y, panel.w, panel.h, 0.08, 0.06, 0.04, 0.92);
    renderer.drawText(font2, 'Drag onto a shooter', panel.x + 8, panel.y + 8);
    STORE_ITEMS.forEach((item, i) => {
      const y = panel.y + STORE_HEADER + i * STORE_ROW;
      const r = itemRect(item);
      if (r) renderer.drawSprite(items, r.x, r.y, r.w, r.h, panel.x + 8, y);
      const cost = session.rules.prices[item] ?? 0;
      const affordable = session.money >= cost;
      renderer.drawText(font2, `$${cost}  ${ITEM_NAME[item]}`, panel.x + 56, y + 12, {
        r: affordable ? 0.6 : 0.9,
        g: affordable ? 1 : 0.4,
        b: 0.5,
      });
    });

    // Drop targets: Mary's red bubble, Poindexter's blue bubble, lit while hovered.
    const hover = this.drag !== null ? this.bubbleAt(this.pointerX, this.pointerY) : null;
    for (const side of ['bottom', 'right'] as const) {
      const b = this.bubbleRect(side);
      const sprite =
        side === 'bottom'
          ? hover === side
            ? BUBBLE.redLit
            : BUBBLE.red
          : hover === side
            ? BUBBLE.blueLit
            : BUBBLE.blue;
      renderer.drawSprite(
        bubbles,
        sprite.x,
        sprite.y,
        sprite.w,
        sprite.h,
        b.x,
        b.y,
        b.w,
        b.h,
        0.85,
      );
    }

    if (this.drag !== null) {
      const r = itemRect(this.drag);
      if (r) {
        renderer.drawSprite(
          items,
          r.x,
          r.y,
          r.w,
          r.h,
          this.pointerX - TILE_PX / 2,
          this.pointerY - TILE_PX / 2,
        );
      }
    }
  }

  /** Expose the pointer's cell for debugging overlays. */
  get aimedCell(): GridPos | null {
    return this.pointer;
  }

  leave(): void {}
}

function tileKindOf(id: number): EnemyKind | null {
  switch (id) {
    case TileId.Crony:
      return 'crony';
    case TileId.Crazy:
      return 'crazy';
    case TileId.Fatty:
      return 'fatty';
    case TileId.Fangie:
      return 'fangie';
    case TileId.Skully:
      return 'skully';
    default:
      return null;
  }
}
