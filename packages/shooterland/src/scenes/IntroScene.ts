import type { Assets, WorldAssets } from '../assets/AssetLoader';
import { GRID_SIZE, TILE_PX } from '../core/constants';
import { isThingie } from '../core/tiles';
import { TileId } from '../core/types';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import { bottomShooterRect, itemRect, rightShooterRect, tileSheetRect } from '../render/sprites';
import { wrapText } from '../render/text';
import { drawSlot, drawSlotCentred, Slot, slotFont } from './fonts';
import type { GameplayScene } from './GameplayScene';
import { cellX, cellY, LAYOUT } from './layout';
import type { Scene, SceneContext } from './Scene';
import { contains, rect } from './ui';

const PLAY = rect(626, 530, 150, 39);
/** Message lines are centred in 200x20 boxes down the side panel from y = 80 (`FUN_00406cc2`). */
const MESSAGE_X = 600;
const MESSAGE_Y = 80;
const MESSAGE_W = 200;
const MESSAGE_LINE = 20;
/** The exe wraps the message at 170 px of font slot 6. */
const WRAP_WIDTH = 170;
const MAX_LINES = 30;

/**
 * The level intro (the exe's screen 3): the loaded board and bars, the
 * level's message down the side panel, and a Play button that starts the
 * clock. The gameplay scene already exists; this just shows it standing still.
 */
export class IntroScene implements Scene {
  private hoverX = -1;
  private hoverY = -1;

  constructor(
    private readonly assets: Assets,
    private readonly world: WorldAssets,
    private readonly gameplay: GameplayScene,
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
      } else if (e.type === 'down' && e.button === 0 && contains(PLAY, e.x, e.y)) {
        this.actions.onPlay();
      }
    }
  }

  draw(renderer: Renderer): void {
    const { assets, world } = this;
    const { session } = this.gameplay;
    const level = session.level;
    renderer.begin();
    renderer.drawImage(world.background, 0, 0);

    const items = assets.image('items');
    const drawTile = (id: number, x: number, y: number): void => {
      const item = itemRect(id);
      if (item) {
        renderer.drawSprite(items, item.x, item.y, item.w, item.h, x, y);
        return;
      }
      const r = tileSheetRect(id, 0);
      if (r) renderer.drawSprite(world.tiles, r.x, r.y, r.w, r.h, x, y);
    };
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const id = session.grid.get(col, row);
        if (id !== TileId.Empty) drawTile(id, cellX(col), cellY(row));
      }
    }
    const { board } = LAYOUT;
    for (let i = 0; i <= GRID_SIZE; i++) {
      renderer.drawRect(board.x, board.y + i * TILE_PX, board.size, 1, 1 / 255, 0, 11 / 255);
      renderer.drawRect(board.x + i * TILE_PX, board.y, 1, board.size, 1 / 255, 0, 11 / 255);
    }

    const shooters = assets.image('shooters');
    const b = session.shooters.bottom;
    b.lanes.forEach((lane, i) => {
      if (isThingie(lane.loaded) || lane.loaded === TileId.Bomb) {
        drawTile(lane.loaded, cellX(b.lane) + i * TILE_PX, LAYOUT.bottomBarY);
      }
    });
    const br = bottomShooterRect(b.size);
    renderer.drawSprite(shooters, br.x, br.y, br.w, br.h, cellX(b.lane), LAYOUT.bottomBarY);
    const r = session.shooters.right;
    r.lanes.forEach((lane, i) => {
      if (isThingie(lane.loaded) || lane.loaded === TileId.Bomb) {
        drawTile(lane.loaded, LAYOUT.rightBarX, cellY(r.lane) + i * TILE_PX);
      }
    });
    const rr = rightShooterRect(r.size);
    renderer.drawSprite(shooters, rr.x, rr.y, rr.w, rr.h, LAYOUT.rightBarX, cellY(r.lane));

    drawSlotCentred(
      renderer,
      assets,
      Slot.bigWhite,
      `Level ${level.world}-${level.level}`,
      LAYOUT.hud.title,
    );
    const text = level.message || (level.placeholder ? 'This level was never finished.' : '');
    const font = slotFont(assets, Slot.smallBlack);
    const lines = wrapText(font, text, WRAP_WIDTH).slice(0, MAX_LINES);
    lines.forEach((line, i) => {
      drawSlotCentred(renderer, assets, Slot.smallBlack, line, {
        x: MESSAGE_X,
        y: MESSAGE_Y + i * MESSAGE_LINE,
        w: MESSAGE_W,
        h: MESSAGE_LINE,
      });
    });

    const lit = contains(PLAY, this.hoverX, this.hoverY);
    const c = lit ? 0.9 : 0.35;
    renderer.drawRect(PLAY.x - 1, PLAY.y - 1, PLAY.w + 2, PLAY.h + 2, c, c, c);
    renderer.drawRect(PLAY.x, PLAY.y, PLAY.w, PLAY.h, 0.08, 0.05, 0.02);
    drawSlotCentred(renderer, assets, Slot.white, 'Play', PLAY);
    drawSlot(renderer, assets, Slot.smallWhite, 'Esc: back to the map', 606, 580);
    renderer.end();
  }

  leave(): void {}
}
