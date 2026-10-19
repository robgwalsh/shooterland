import type { Assets, WorldAssets } from '../assets/AssetLoader';
import { GRID_SIZE } from '../core/constants';
import type { LevelData } from '../core/level/LevelData';
import { bestTime, hasStar, isCleared, starsForNextWorld } from '../core/save/SaveData';
import type { SaveService } from '../core/save/SaveService';
import { TileId } from '../core/types';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import {
  bottomShooterRect,
  CHECK_FRAMES,
  checkFrame,
  MINI_PX,
  miniRect,
  starFrame,
} from '../render/sprites';
import { drawSlot, Slot } from './fonts';
import type { Scene, SceneContext } from './Scene';
import { contains, type Rect, rect } from './ui';

/** Hot-spots painted into worldN/map.png, as the exe registers them (`FUN_004025a3`). */
const TAB = (i: number): Rect => rect(116 + 82 * i, 465, 80, 15);
const MENU = rect(89, 488, 44, 44);
const STATS = rect(141, 488, 44, 44);
const PREVIEW = rect(617, 488, 44, 44);
const PLAY = rect(669, 488, 44, 44);
const NODE_W = 60;
const NODE_H = 40;
/** The preview overlay: wood panel and mini tiles (`FUN_00404660`). */
const PREVIEW_PANEL = { x: 200, y: 100 };
const PREVIEW_GRID = { x: 265, y: 165, step: 21 };
/** The check mark and star cycle through their 36 frames every 36 ms. */
const CHECK_TICKS_PER_FRAME = 2;
/** Secret: tapping F three times within this window unlocks every level. */
const CHEAT_KEY = 'f';
const CHEAT_TAPS = 3;
const CHEAT_WINDOW_TICKS = 60;

export interface WorldMapActions {
  onPlay: (level: LevelData) => void;
  onMenu: () => void;
  onStats: () => void;
}

/**
 * The spiral of 25 gems per world with tabs for worlds 1-7. Cleared levels
 * get a check mark, starred ones a spinning star; hovering Preview shows the
 * level's layout in mini tiles; Play opens the level intro.
 */
export class WorldMapScene implements Scene {
  private world: number;
  private selected: number;
  private worldAssets: WorldAssets | null = null;
  private ticks = 0;
  private toast: { text: string; until: number } | null = null;
  private hoverX = -1;
  private hoverY = -1;
  private cheatTaps: number[] = [];

  constructor(
    private readonly assets: Assets,
    private readonly saves: SaveService,
    private readonly starThresholds: readonly number[],
    private readonly actions: WorldMapActions,
    start?: { world: number; level: number },
  ) {
    this.world = start?.world ?? saves.data.world;
    this.selected = start?.level ?? saves.data.level;
    if (!saves.worldUnlocked(this.world)) {
      this.world = 1;
      this.selected = 1;
    }
  }

  enter(_ctx: SceneContext): void {
    this.loadWorld();
  }

  private loadWorld(): void {
    const w = this.world;
    this.worldAssets = null;
    void this.assets.world(w).then((wa) => {
      if (this.world === w) this.worldAssets = wa;
    });
  }

  private levelAt(index: number): LevelData | undefined {
    return this.assets.level(this.world, index + 1);
  }

  private say(text: string): void {
    this.toast = { text, until: this.ticks + 120 };
  }

  update(_dt: number, input: readonly InputEvent[]): void {
    this.ticks++;
    for (const e of input) {
      if (e.type === 'move') {
        this.hoverX = e.x;
        this.hoverY = e.y;
        continue;
      }
      if (e.type === 'key') {
        if (e.key === 'Enter' || e.key === ' ') this.play();
        else if (e.key === 'Escape') this.actions.onMenu();
        else if (e.key.toLowerCase() === CHEAT_KEY) this.cheatTap();
        continue;
      }
      if (e.type !== 'down' || e.button !== 0) continue;
      for (let i = 0; i < 7; i++) {
        if (contains(TAB(i), e.x, e.y)) this.selectWorld(i + 1);
      }
      this.assets.mapNodes.forEach((n, i) => {
        if (contains(rect(n.x, n.y, NODE_W, NODE_H), e.x, e.y) && this.levelAt(i)) {
          this.selected = i + 1;
          void this.saves.setPosition(this.world, this.selected);
        }
      });
      if (contains(MENU, e.x, e.y)) this.actions.onMenu();
      else if (contains(STATS, e.x, e.y)) this.actions.onStats();
      else if (contains(PLAY, e.x, e.y)) this.play();
    }
  }

  private cheatTap(): void {
    const now = this.ticks;
    this.cheatTaps = this.cheatTaps.filter((t) => now - t < CHEAT_WINDOW_TICKS);
    this.cheatTaps.push(now);
    if (this.cheatTaps.length < CHEAT_TAPS) return;
    this.cheatTaps = [];
    if (this.saves.data.allUnlocked) return;
    void this.saves.unlockAll();
    this.say('All levels unlocked!');
  }

  private selectWorld(w: number): void {
    if (w === this.world) return;
    if (!this.saves.worldUnlocked(w)) {
      const next = starsForNextWorld(this.saves.data, this.assets.levels, this.starThresholds);
      this.say(
        next && next.world === w
          ? `World ${w} needs ${next.needed} stars`
          : `World ${w} is not available yet`,
      );
      return;
    }
    this.world = w;
    this.selected = 1;
    void this.saves.setPosition(w, 1);
    this.loadWorld();
  }

  private play(): void {
    const level = this.levelAt(this.selected - 1);
    if (!level) return;
    if (!this.saves.levelUnlocked(level.world, level.level)) {
      this.say('Level not unlocked yet.');
      return;
    }
    this.actions.onPlay(level);
  }

  draw(renderer: Renderer): void {
    const { assets, saves } = this;
    renderer.begin(0.2, 0.17, 0.12);
    const wa = this.worldAssets;
    if (!wa) {
      drawSlot(renderer, assets, Slot.white, 'Loading...', 400, 280, 'center');
      renderer.end();
      return;
    }
    renderer.drawImage(wa.map, 0, 0);

    const checks = assets.image('checkandstar');
    const frame = Math.floor(this.ticks / CHECK_TICKS_PER_FRAME) % CHECK_FRAMES;
    const nodes = assets.mapNodes;
    nodes.forEach((n, i) => {
      const level = this.levelAt(i);
      if (!level) {
        renderer.drawRect(n.x, n.y, NODE_W, NODE_H, 0, 0, 0, 0.6);
        return;
      }
      if (!saves.levelUnlocked(level.world, level.level)) {
        renderer.drawRect(n.x, n.y, NODE_W, NODE_H, 0, 0, 0, 0.5);
      }
      if (isCleared(saves.data, level.world, level.level)) {
        const c = checkFrame(frame);
        renderer.drawSprite(checks, c.x, c.y, c.w, c.h, n.x + 2, n.y - 4);
        if (hasStar(saves.data, level)) {
          const s = starFrame(frame);
          renderer.drawSprite(checks, s.x, s.y, s.w, s.h, n.x - 8, n.y - 10);
        }
      }
      drawSlot(renderer, assets, Slot.smallWhite, `${i + 1}`, n.x + 36, n.y + 19);
    });

    // The player's marker is Mary's bar, parked on the selected gem.
    const marker = nodes[this.selected - 1];
    if (marker) {
      const m = bottomShooterRect(1);
      renderer.drawSprite(assets.image('shooters'), m.x, m.y, m.w, m.h, marker.x + 10, marker.y);
    }

    for (let i = 0; i < 7; i++) {
      if (!saves.worldUnlocked(i + 1)) {
        const r = TAB(i);
        renderer.drawRect(r.x, r.y, r.w, r.h, 0, 0, 0, 0.45);
      }
    }

    const star = starFrame(frame);
    renderer.drawSprite(checks, star.x, star.y, star.w, star.h, -12, 5);
    drawSlot(renderer, assets, Slot.white, `X ${saves.stars()}`, 35, 10);
    const next = starsForNextWorld(saves.data, assets.levels, this.starThresholds);
    if (next) drawSlot(renderer, assets, Slot.smallWhite, `Next: ${next.needed} stars`, 0, 40);

    const level = this.levelAt(this.selected - 1);
    if (level) {
      drawSlot(renderer, assets, Slot.bigWhite, `Level ${level.world}-${level.level}`, 210, 491);
      const best = bestTime(saves.data, level.world, level.level);
      drawSlot(renderer, assets, Slot.smallBlack, `Best time: ${best}`, 360, 500);
      drawSlot(renderer, assets, Slot.smallWhite, `Time to beat: ${level.timeToBeat}`, 488, 500);
    }

    if (this.toast && this.ticks < this.toast.until) {
      renderer.drawRect(200, 250, 400, 40, 0, 0, 0, 0.75);
      drawSlot(renderer, assets, Slot.smallWhite, this.toast.text, 400, 262, 'center');
    }
    for (const r of [MENU, STATS, PREVIEW, PLAY]) {
      if (contains(r, this.hoverX, this.hoverY))
        renderer.drawRect(r.x, r.y, r.w, r.h, 1, 1, 1, 0.15);
    }
    if (level && contains(PREVIEW, this.hoverX, this.hoverY)) this.drawPreview(renderer, level);
    renderer.end();
  }

  /** Hovering Preview shows the board in mini tiles on the wood panel. */
  private drawPreview(renderer: Renderer, level: LevelData): void {
    const { assets } = this;
    renderer.drawImage(assets.image('wood'), PREVIEW_PANEL.x, PREVIEW_PANEL.y);
    const mini = assets.image('mini');
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = PREVIEW_GRID.x + col * PREVIEW_GRID.step;
        const y = PREVIEW_GRID.y + row * PREVIEW_GRID.step;
        renderer.drawRect(x, y, MINI_PX, MINI_PX, 0, 0, 0);
        const id = level.cells[row * GRID_SIZE + col] ?? TileId.Empty;
        const r = miniRect(id, level.world);
        if (r) renderer.drawSprite(mini, r.x, r.y, r.w, r.h, x, y);
      }
    }
  }

  leave(): void {}
}
