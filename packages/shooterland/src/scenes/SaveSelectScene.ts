import type { Assets } from '../assets/AssetLoader';
import { computeStats, isNewGame, type SlotNumber } from '../core/save/SaveData';
import type { SaveService } from '../core/save/SaveService';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import { drawSlot, drawSlotCentred, Slot } from './fonts';
import type { Scene, SceneContext } from './Scene';
import { contains, type Rect, rect } from './ui';

/** menusupplement.png sits over the title screen's buttons; hot-spots from `FUN_004025a3`. */
const PANEL = { x: 0, y: 435 };
const FILE_BUTTONS: Rect[] = [rect(25, 442, 47, 45), rect(25, 493, 47, 45), rect(25, 544, 47, 45)];
const BACK = rect(79, 563, 77, 28);
const LOAD = rect(161, 563, 77, 28);
const DELETE = rect(244, 563, 77, 28);
const HEADING = rect(85, 450, 228, 20);
const LINE_X = 90;
const LINE_YS = [477, 492, 507, 522];
const CONFIRM_YES = rect(120, 520, 60, 35);
const CONFIRM_NO = rect(220, 520, 60, 35);
const BETA = { x: 450, y: 110 };

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
      if (e.type !== 'down' || e.button !== 0 || this.loading) continue;
      if (this.confirmingDelete) {
        if (contains(CONFIRM_YES, e.x, e.y) && this.selected) {
          const slot = this.selected;
          this.confirmingDelete = false;
          this.loading = true;
          void this.saves.remove(slot).then(() => {
            this.loading = false;
          });
        } else if (contains(CONFIRM_NO, e.x, e.y)) {
          this.confirmingDelete = false;
        }
        continue;
      }
      FILE_BUTTONS.forEach((r, i) => {
        if (contains(r, e.x, e.y)) this.selected = (i + 1) as SlotNumber;
      });
      if (contains(BACK, e.x, e.y)) this.actions.onBack();
      else if (contains(LOAD, e.x, e.y) && this.selected) this.actions.onLoad(this.selected);
      else if (contains(DELETE, e.x, e.y) && this.selected && this.saves.peek(this.selected)) {
        this.confirmingDelete = true;
      }
    }
  }

  draw(renderer: Renderer): void {
    const { assets } = this;
    renderer.begin();
    renderer.drawImage(assets.image('shooterland'), 0, 0);
    renderer.drawImage(assets.image('beta'), BETA.x, BETA.y);
    renderer.drawImage(assets.image('menusupplement'), PANEL.x, PANEL.y);

    if (this.selected) {
      const r = FILE_BUTTONS[this.selected - 1] ?? rect(0, 0, 0, 0);
      renderer.drawRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 1, 1, 0.6, 0.35);
    }
    for (const r of [...FILE_BUTTONS, BACK, LOAD, DELETE]) {
      if (contains(r, this.hoverX, this.hoverY))
        renderer.drawRect(r.x, r.y, r.w, r.h, 1, 1, 1, 0.15);
    }

    if (this.loading || !this.selected) {
      drawSlotCentred(renderer, assets, Slot.bigWhite, 'Loading...', HEADING);
      renderer.end();
      return;
    }
    const slot = this.selected;
    const data = this.saves.peek(slot);
    if (!data || isNewGame(data)) {
      drawSlotCentred(renderer, assets, Slot.bigWhite, `File ${slot}: New Game`, HEADING);
    } else {
      const stats = computeStats(data, this.saves.levels);
      drawSlotCentred(
        renderer,
        assets,
        Slot.bigWhite,
        `File ${slot}: Level ${data.world}-${data.level}`,
        HEADING,
      );
      if (!this.confirmingDelete) {
        const h = Math.floor(data.secondsPlayed / 3600);
        const m = Math.floor((data.secondsPlayed % 3600) / 60);
        const s = data.secondsPlayed % 60;
        const lines = [
          `Stars: ${stats.stars}`,
          slot === 3 ? 'Record: I HATE CHICKEN' : `Record: ${data.wins}-${data.losses}`,
          `Complete: ${stats.completePercent}%`,
          `Time Played: ${h}h ${m}m ${s}s`,
        ];
        lines.forEach((line, i) => {
          drawSlot(renderer, assets, Slot.smallWhite, line, LINE_X, LINE_YS[i] ?? 0);
        });
      }
    }
    if (this.confirmingDelete) {
      drawSlot(renderer, assets, Slot.smallGreen, 'Are you sure you want', 120, 478);
      drawSlot(renderer, assets, Slot.smallGreen, `to delete File ${slot}?`, 130, 498);
      drawSlot(renderer, assets, Slot.smallWhite, 'Yes', 137, 528);
      drawSlot(renderer, assets, Slot.smallWhite, 'No', 241, 528);
      for (const r of [CONFIRM_YES, CONFIRM_NO]) {
        if (contains(r, this.hoverX, this.hoverY))
          renderer.drawRect(r.x, r.y, r.w, r.h, 1, 1, 1, 0.15);
      }
    }
    renderer.end();
  }

  leave(): void {}
}
