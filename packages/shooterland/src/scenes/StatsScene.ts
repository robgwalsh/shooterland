import type { Assets } from '../assets/AssetLoader';
import { computeStats } from '../core/save/SaveData';
import type { SaveService } from '../core/save/SaveService';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import type { Scene, SceneContext } from './Scene';
import { contains, drawButton, rect } from './ui';

const PANEL = rect(150, 60, 500, 480);
const BACK = rect(340, 480, 120, 36);

/** "Stats: File N" screen with the original's six figures. */
export class StatsScene implements Scene {
  private hoverX = -1;
  private hoverY = -1;

  constructor(
    private readonly assets: Assets,
    private readonly saves: SaveService,
    private readonly onBack: () => void,
  ) {}

  enter(_ctx: SceneContext): void {}

  update(_dt: number, input: readonly InputEvent[]): void {
    for (const e of input) {
      if (e.type === 'move') {
        this.hoverX = e.x;
        this.hoverY = e.y;
      } else if (e.type === 'key' && (e.key === 'Escape' || e.key === 'Enter')) this.onBack();
      else if (e.type === 'down' && contains(BACK, e.x, e.y)) this.onBack();
    }
  }

  draw(renderer: Renderer): void {
    const { assets, saves } = this;
    const font1 = assets.font('font1');
    const font2 = assets.font('font2');
    const s = computeStats(saves.data, assets.levels);
    const d = saves.data;
    renderer.begin(0.1, 0.08, 0.06);
    const wood = assets.image('wood');
    renderer.drawSprite(wood, 0, 0, wood.width, wood.height, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    renderer.drawText(font1, `Stats: File ${saves.slot}`, 400, 80, { align: 'center' });
    const fmt = (v: number | null, digits: number, suffix = ''): string =>
      v === null ? 'N/A' : `${v.toFixed(digits)}${suffix}`;
    const h = Math.floor(d.secondsPlayed / 3600);
    const m = Math.floor((d.secondsPlayed % 3600) / 60);
    const sec = d.secondsPlayed % 60;
    const lines = [
      `Win Percentage: ${s.winPercent === null ? 'N/A' : `${Math.round(s.winPercent)}%`}`,
      `Average Combo Size: ${fmt(s.averageComboSize, 3)}`,
      `Shots per Combo: ${fmt(s.shotsPerCombo, 3)}`,
      `Number of Shots: ${d.shots}`,
      `SL Rating: ${fmt(s.slRating, 1)}`,
      `Stars: ${s.stars}`,
      `Complete: ${s.completePercent}%`,
      `Time Played: ${h}h ${m}m ${sec}s`,
      `Wins: ${d.wins}   Losses: ${d.losses}`,
    ];
    let y = 140;
    for (const line of lines) {
      renderer.drawText(font2, line, 200, y);
      y += 32;
    }
    drawButton(renderer, font2, BACK, 'Back', contains(BACK, this.hoverX, this.hoverY));
    renderer.end();
  }

  leave(): void {}
}
