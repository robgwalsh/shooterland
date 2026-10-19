import type { Assets } from '../assets/AssetLoader';
import { computeStats } from '../core/save/SaveData';
import type { SaveService } from '../core/save/SaveService';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import { drawSlot, drawSlotCentred, Slot } from './fonts';
import type { Scene, SceneContext } from './Scene';
import { rect } from './ui';

const LINE = (y: number) => rect(200, y, 400, 50);
const SUFFLE = { x: 25, y: 50, w: 150, h: 500 };

/** "Stats: File N" (`FUN_0040ad69`): the original's figures on a black screen; any click returns. */
export class StatsScene implements Scene {
  constructor(
    private readonly assets: Assets,
    private readonly saves: SaveService,
    private readonly onBack: () => void,
  ) {}

  enter(_ctx: SceneContext): void {}

  update(_dt: number, input: readonly InputEvent[]): void {
    for (const e of input) {
      if (e.type === 'key' && (e.key === 'Escape' || e.key === 'Enter')) this.onBack();
      else if (e.type === 'down') this.onBack();
    }
  }

  draw(renderer: Renderer): void {
    const { assets, saves } = this;
    const s = computeStats(saves.data, assets.levels);
    const d = saves.data;
    renderer.begin(0, 0, 0);
    // The tower of green thingies on the left, and a stretched mirror of it on the right (`FUN_0040df86`).
    const suffle = assets.image('suffle');
    renderer.drawImage(suffle, SUFFLE.x, SUFFLE.y);
    for (let i = 0; i < SUFFLE.w; i++) {
      renderer.drawSprite(suffle, SUFFLE.w - i, 0, 1, SUFFLE.h, 625 + i, SUFFLE.y, 1, SUFFLE.h);
    }

    const fmt = (v: number | null, digits: number): string =>
      v === null ? 'N/A' : v.toFixed(digits);
    const h = Math.floor(d.secondsPlayed / 3600);
    const m = Math.floor((d.secondsPlayed % 3600) / 60);
    const sec = d.secondsPlayed % 60;
    drawSlotCentred(renderer, assets, Slot.bigWhite, `Stats: File ${saves.slot}`, LINE(100));
    const lines = [
      saves.slot === 3 ? 'Record: I HATE CHICKEN' : `Record: ${d.wins}-${d.losses}`,
      s.winPercent === null ? 'Win Percentage: N/A' : `Win Percentage: ${s.winPercent}%`,
      `Stars: ${s.stars}`,
      `Time Played: ${h}h ${m}m ${sec}s`,
      s.averageComboSize === null
        ? 'Average Combo Size: N/A'
        : `Average Combo Size: ${fmt(s.averageComboSize, 3)}`,
      s.shotsPerCombo === null
        ? 'Shots per Combo: N/A'
        : `Shots per Combo: ${fmt(s.shotsPerCombo, 3)}`,
      `Number of Shots: ${d.shots}`,
      s.slRating === null ? 'SL Rating: N/A' : `SL Rating: ${fmt(s.slRating, 1)}`,
    ];
    lines.forEach((line, i) => {
      drawSlotCentred(renderer, assets, Slot.smallWhite, line, LINE(150 + 40 * i));
    });
    drawSlot(renderer, assets, Slot.smallWhite, 'Click to return...', 5, 580);
    renderer.end();
  }

  leave(): void {}
}
