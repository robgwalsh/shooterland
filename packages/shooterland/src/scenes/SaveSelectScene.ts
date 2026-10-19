import type { Assets } from '../assets/AssetLoader';
import { computeStats, isNewGame, type SlotNumber } from '../core/save/SaveData';
import type { SaveService } from '../core/save/SaveService';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import type { Scene, SceneContext } from './Scene';
import { contains, drawButton, drawDim, type Rect, rect } from './ui';

/** menusupplement.png (340x165) is drawn at this offset; hot-spots are relative to it. */
const PANEL_X = 230;
const PANEL_Y = 300;
const FILE_BUTTONS: Rect[] = [rect(25, 10, 50, 42), rect(25, 60, 50, 42), rect(25, 110, 50, 42)];
const INFO = rect(85, 9, 240, 113);
const BACK = rect(80, 127, 75, 30);
const LOAD = rect(162, 127, 75, 30);
const DELETE = rect(245, 127, 75, 30);

const abs = (r: Rect): Rect => rect(r.x + PANEL_X, r.y + PANEL_Y, r.w, r.h);

/**
 * File 1/2/3 menu over the title screen: pick a slot, read its summary in
 * the black panel, then Load, Delete (with confirmation) or go Back.
 */
export class SaveSelectScene implements Scene {
  private selected: SlotNumber | null = null;
  private confirmingDelete = false;
  private hoverX = -1;
  private hoverY = -1;
  private loading = true;

  constructor(
    private readonly assets: Assets,
    private readonly saves: SaveService,
    private readonly actions: { onLoad: (slot: SlotNumber) => void; onBack: () => void },
  ) {}

  enter(_ctx: SceneContext): void {
    this.loading = true;
    this.selected = this.saves.slot;
    void this.saves.peekAll().then(() => {
      this.loading = false;
    });
  }

  update(_dt: number, input: readonly InputEvent[]): void {
    for (const e of input) {
      if (e.type === 'move') {
        this.hoverX = e.x;
        this.hoverY = e.y;
        continue;
      }
      if (e.type === 'key' && e.key === 'Escape') {
        if (this.confirmingDelete) this.confirmingDelete = false;
        else this.actions.onBack();
        continue;
      }
      if (e.type !== 'down' || this.loading) continue;
      if (this.confirmingDelete) {
        const { yes, no } = this.confirmButtons();
        if (contains(yes, e.x, e.y) && this.selected) {
          const slot = this.selected;
          this.confirmingDelete = false;
          this.loading = true;
          void this.saves.remove(slot).then(() => {
            this.loading = false;
          });
        } else if (contains(no, e.x, e.y)) {
          this.confirmingDelete = false;
        }
        continue;
      }
      FILE_BUTTONS.forEach((r, i) => {
        if (contains(abs(r), e.x, e.y)) this.selected = (i + 1) as SlotNumber;
      });
      if (contains(abs(BACK), e.x, e.y)) this.actions.onBack();
      else if (contains(abs(LOAD), e.x, e.y) && this.selected) this.actions.onLoad(this.selected);
      else if (contains(abs(DELETE), e.x, e.y) && this.selected && this.saves.peek(this.selected)) {
        this.confirmingDelete = true;
      }
    }
  }

  private confirmButtons(): { yes: Rect; no: Rect } {
    const info = abs(INFO);
    return {
      yes: rect(info.x + 30, info.y + 70, 80, 30),
      no: rect(info.x + info.w - 110, info.y + 70, 80, 30),
    };
  }

  draw(renderer: Renderer): void {
    const { assets } = this;
    const font1 = assets.font('font1');
    const font2 = assets.font('font2');
    renderer.begin();
    renderer.drawImage(assets.image('shooterland'), 0, 0);
    drawDim(renderer, 0.45);
    renderer.drawImage(assets.image('menusupplement'), PANEL_X, PANEL_Y);

    // Highlight the selected file button.
    if (this.selected) {
      const r = abs(FILE_BUTTONS[this.selected - 1] ?? rect(0, 0, 0, 0));
      renderer.drawRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 1, 1, 0.6, 0.35);
    }

    const info = abs(INFO);
    const lines: string[] = [];
    if (this.loading) lines.push('Loading...');
    else if (this.selected) {
      const slot = this.selected;
      const data = this.saves.peek(slot);
      if (!data || isNewGame(data)) lines.push(`File ${slot}: New Game`);
      else {
        const stats = computeStats(data, this.saves.levels);
        lines.push(`File ${slot}: Level ${data.world}-${data.level}`);
        lines.push(`Stars: ${stats.stars}`);
        lines.push(`Complete: ${stats.completePercent}%`);
        const h = Math.floor(data.secondsPlayed / 3600);
        const m = Math.floor((data.secondsPlayed % 3600) / 60);
        const s = data.secondsPlayed % 60;
        lines.push(`Time Played: ${h}h ${m}m ${s}s`);
      }
    } else lines.push('Select a file');

    if (this.confirmingDelete && this.selected) {
      renderer.drawText(font2, 'Are you sure you want', info.x + info.w / 2, info.y + 12, {
        align: 'center',
      });
      renderer.drawText(
        font2,
        `to delete File ${this.selected}?`,
        info.x + info.w / 2,
        info.y + 32,
        {
          align: 'center',
        },
      );
      const { yes, no } = this.confirmButtons();
      drawButton(renderer, font2, yes, 'Yes', contains(yes, this.hoverX, this.hoverY));
      drawButton(renderer, font2, no, 'No', contains(no, this.hoverX, this.hoverY));
    } else {
      let y = info.y + 10;
      lines.forEach((line, i) => {
        renderer.drawText(i === 0 ? font1 : font2, line, info.x + 12, y);
        y += i === 0 ? 34 : 20;
      });
    }
    renderer.end();
  }

  leave(): void {}
}
