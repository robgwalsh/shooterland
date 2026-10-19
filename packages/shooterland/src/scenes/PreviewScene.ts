import type { Assets } from '../assets/AssetLoader';
import { GRID_SIZE } from '../core/constants';
import type { LevelData } from '../core/level/LevelData';
import { bestTime, hasStar } from '../core/save/SaveData';
import type { SaveService } from '../core/save/SaveService';
import { TileId } from '../core/types';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import { MINI_PX, miniRect } from '../render/sprites';
import { wrapText } from '../render/text';
import type { Scene, SceneContext } from './Scene';
import { contains, drawButton, rect } from './ui';

const PANEL = rect(20, 20, 760, 560);
const BOARD = rect(50, 110, GRID_SIZE * MINI_PX, GRID_SIZE * MINI_PX);
const TEXT_X = 340;
const TEXT_W = 420;
const BACK = rect(50, 520, 120, 36);
const PLAY = rect(630, 520, 120, 36);

/**
 * Level preview: the board in mini tiles, the time to beat and best time,
 * and the level's message (tutorial or lore), on a wood panel.
 */
export class PreviewScene implements Scene {
  private hoverX = -1;
  private hoverY = -1;

  constructor(
    private readonly assets: Assets,
    private readonly saves: SaveService,
    private readonly level: LevelData,
    private readonly actions: { onPlay: () => void; onBack: () => void },
  ) {}

  enter(_ctx: SceneContext): void {}

  update(_dt: number, input: readonly InputEvent[]): void {
    for (const e of input) {
      if (e.type === 'move') {
        this.hoverX = e.x;
        this.hoverY = e.y;
      } else if (e.type === 'key') {
        if (e.key === 'Escape') this.actions.onBack();
        else if (e.key === 'Enter' || e.key === ' ') this.actions.onPlay();
      } else if (e.type === 'down') {
        if (contains(BACK, e.x, e.y)) this.actions.onBack();
        else if (contains(PLAY, e.x, e.y)) this.actions.onPlay();
      }
    }
  }

  draw(renderer: Renderer): void {
    const { assets, level } = this;
    const font1 = assets.font('font1');
    const font2 = assets.font('font2');
    renderer.begin(0.1, 0.08, 0.06);
    const wood = assets.image('wood');
    renderer.drawSprite(wood, 0, 0, wood.width, wood.height, PANEL.x, PANEL.y, PANEL.w, PANEL.h);

    renderer.drawText(font1, `Level ${level.world}-${level.level}`, 400, 40, { align: 'center' });
    const best = bestTime(this.saves.data, level.world, level.level);
    const star = hasStar(this.saves.data, level);
    renderer.drawText(font2, `Time to beat: ${level.timeToBeat}`, BOARD.x, 82);
    if (best > 0) renderer.drawText(font2, `Best time: ${best}`, BOARD.x + 160, 82);
    renderer.drawText(
      font2,
      star
        ? "You have this level's star!"
        : `Beat ${level.timeToBeat} seconds to acquire this level's star.`,
      TEXT_X,
      82,
      { r: 1, g: 0.95, b: 0.5 },
    );

    // Mini board.
    renderer.drawRect(BOARD.x - 2, BOARD.y - 2, BOARD.w + 4, BOARD.h + 4, 0, 0, 0, 0.5);
    const mini = assets.image('mini');
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const id = level.cells[row * GRID_SIZE + col] ?? TileId.Empty;
        const r = miniRect(id, level.world);
        if (!r) continue;
        renderer.drawSprite(
          mini,
          r.x,
          r.y,
          r.w,
          r.h,
          BOARD.x + col * MINI_PX,
          BOARD.y + row * MINI_PX,
        );
      }
    }

    // Message.
    const text = level.message || (level.placeholder ? 'This level was never finished.' : '');
    let y = BOARD.y;
    for (const line of wrapText(font2, text, TEXT_W)) {
      renderer.drawText(font2, line, TEXT_X, y);
      y += font2.lineHeight + 2;
      if (y > PANEL.y + PANEL.h - 80) break;
    }

    drawButton(renderer, font2, BACK, 'Back', contains(BACK, this.hoverX, this.hoverY));
    drawButton(renderer, font2, PLAY, 'Play Level', contains(PLAY, this.hoverX, this.hoverY));
    renderer.end();
  }

  leave(): void {}
}
