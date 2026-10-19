import type { Assets, WorldAssets } from '../assets/AssetLoader';
import type { LevelData } from '../core/level/LevelData';
import { bestTime, hasStar, isCleared, starsForNextWorld } from '../core/save/SaveData';
import type { SaveService } from '../core/save/SaveService';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import { checkFrame, RING, starFrame } from '../render/sprites';
import type { Scene, SceneContext } from './Scene';
import { contains, type Rect, rect } from './ui';

/** Hot-spots painted into worldN/map.png. */
const TAB = (i: number): Rect => rect(117 + 83 * i, 460, 78, 22);
const MENU = rect(90, 486, 46, 44);
const STATS = rect(142, 486, 44, 44);
const PREVIEW = rect(617, 486, 44, 44);
const PLAY = rect(670, 486, 46, 44);
const NODE_W = 50;
const NODE_H = 40;

export interface WorldMapActions {
  onPlay: (level: LevelData) => void;
  onPreview: (level: LevelData) => void;
  onMenu: () => void;
  onStats: () => void;
}

/**
 * The spiral of 25 gems per world, with tabs for worlds 1-7. Cleared levels
 * get a check mark, starred ones a spinning star, locked ones are dimmed.
 */
export class WorldMapScene implements Scene {
  private world: number;
  private selected: number;
  private worldAssets: WorldAssets | null = null;
  private t = 0;
  private toast: { text: string; until: number } | null = null;
  private hoverX = -1;
  private hoverY = -1;

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
    this.toast = { text, until: this.t + 2 };
  }

  update(dt: number, input: readonly InputEvent[]): void {
    this.t += dt;
    for (const e of input) {
      if (e.type === 'move') {
        this.hoverX = e.x;
        this.hoverY = e.y;
        continue;
      }
      if (e.type === 'key') {
        if (e.key === 'Enter' || e.key === ' ') this.play();
        else if (e.key === 'Escape') this.actions.onMenu();
        continue;
      }
      if (e.type !== 'down') continue;
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
      else if (contains(PREVIEW, e.x, e.y)) {
        const level = this.levelAt(this.selected - 1);
        if (level) this.actions.onPreview(level);
      }
    }
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
    const font1 = assets.font('font1');
    const font2 = assets.font('font2');
    renderer.begin(0.2, 0.17, 0.12);
    const wa = this.worldAssets;
    if (!wa) {
      renderer.drawText(font1, 'Loading...', 400, 280, { align: 'center' });
      renderer.end();
      return;
    }
    renderer.drawImage(wa.map, 0, 0);

    const nodes = assets.mapNodes;
    nodes.forEach((n, i) => {
      const level = this.levelAt(i);
      if (!level) {
        renderer.drawRect(n.x, n.y, NODE_W, NODE_H, 0, 0, 0, 0.6);
        return;
      }
      const unlocked = saves.levelUnlocked(level.world, level.level);
      if (!unlocked) renderer.drawRect(n.x, n.y, NODE_W, NODE_H, 0, 0, 0, 0.5);
      if (hasStar(saves.data, level)) {
        const r = starFrame(Math.floor(this.t * 24) + i);
        renderer.drawSprite(assets.image('checkandstar'), r.x, r.y, r.w, r.h, n.x - 7, n.y);
      } else if (isCleared(saves.data, level.world, level.level)) {
        const r = checkFrame(0);
        renderer.drawSprite(assets.image('checkandstar'), r.x, r.y, r.w, r.h, n.x - 7, n.y);
      }
      if (i + 1 === this.selected) {
        renderer.drawSprite(wa.tiles, RING.x, RING.y, RING.w, RING.h, n.x + 5, n.y);
      }
    });

    // Tabs for worlds the player cannot enter yet are shaded.
    for (let i = 0; i < 7; i++) {
      if (!saves.worldUnlocked(i + 1)) {
        const r = TAB(i);
        renderer.drawRect(r.x, r.y, r.w, r.h, 0, 0, 0, 0.45);
      }
    }

    const level = this.levelAt(this.selected - 1);
    const stars = saves.stars();
    renderer.drawText(font2, `Stars: ${stars}`, 20, 20, { r: 1, g: 0.95, b: 0.5 });
    const next = starsForNextWorld(saves.data, assets.levels, this.starThresholds);
    if (next)
      renderer.drawText(font2, `Next: ${next.needed} stars`, 20, 40, { r: 1, g: 0.95, b: 0.5 });
    if (level) {
      const best = bestTime(saves.data, level.world, level.level);
      renderer.drawText(font1, `Level ${level.world}-${level.level}`, 400, 540, {
        align: 'center',
      });
      renderer.drawText(
        font2,
        best > 0
          ? `Best time: ${best}   Time to beat: ${level.timeToBeat}`
          : `Time to beat: ${level.timeToBeat}`,
        400,
        574,
        { align: 'center' },
      );
    }
    if (this.toast && this.t < this.toast.until) {
      renderer.drawRect(200, 250, 400, 40, 0, 0, 0, 0.75);
      renderer.drawText(font2, this.toast.text, 400, 262, { align: 'center' });
    }
    // Hover feedback on the art's buttons.
    for (const r of [MENU, STATS, PREVIEW, PLAY]) {
      if (contains(r, this.hoverX, this.hoverY))
        renderer.drawRect(r.x, r.y, r.w, r.h, 1, 1, 1, 0.15);
    }
    renderer.end();
  }

  leave(): void {}
}
