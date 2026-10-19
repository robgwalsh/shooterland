import type { Assets, WorldAssets } from '../assets/AssetLoader';
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '../core/constants';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import type { Scene, SceneContext } from './Scene';

const SAMPLE = 'Shooterland $123 Time: 45s TTB: 60s (Best 30s)';

/**
 * Development scene that exercises the renderer: the three bitmap fonts,
 * a colour-keyed sprite sheet, and one world's tile sheet. Clicking cycles
 * through worlds; the left/right halves of the screen go back/forward.
 */
export class AssetViewerScene implements Scene {
  private world = 1;
  private worldAssets: WorldAssets | null = null;
  private loading = false;
  private t = 0;

  constructor(private readonly assets: Assets) {}

  enter(_ctx: SceneContext): void {
    this.requestWorld(this.world);
  }

  private requestWorld(n: number): void {
    this.loading = true;
    this.worldAssets = null;
    this.assets
      .world(n)
      .then((w) => {
        if (this.world === n) {
          this.worldAssets = w;
          this.loading = false;
        }
      })
      .catch(() => {
        this.loading = false;
      });
  }

  update(dt: number, input: readonly InputEvent[]): void {
    this.t += dt;
    for (const e of input) {
      if (e.type !== 'down') continue;
      const next = e.x < VIRTUAL_WIDTH / 2 ? this.world - 1 : this.world + 1;
      this.world = ((next - 1 + 7) % 7) + 1;
      this.requestWorld(this.world);
    }
  }

  draw(renderer: Renderer): void {
    const { assets } = this;
    renderer.begin(0.12, 0.1, 0.18);

    // Fonts: each line in its own font, plus alignment and tint checks.
    renderer.drawText(assets.font('font1'), SAMPLE, 10, 8);
    renderer.drawText(assets.font('font2'), SAMPLE, 10, 44);
    renderer.drawText(assets.font('font3'), SAMPLE, 10, 64, { r: 1, g: 0.9, b: 0.3 });
    renderer.drawText(assets.font('font1'), 'centred', VIRTUAL_WIDTH / 2, 100, { align: 'center' });
    renderer.drawText(assets.font('font2'), 'right-aligned', VIRTUAL_WIDTH - 10, 110, {
      align: 'right',
      r: 0.5,
      g: 0.9,
      b: 1,
    });

    // Keyed sprite sheets on a light panel so holes show.
    renderer.drawRect(0, 130, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - 130, 0.55, 0.55, 0.6);
    renderer.drawImage(assets.image('items'), 10, 140);
    renderer.drawImage(assets.image('shooters'), 60, 140);
    renderer.drawImage(assets.image('raccoon'), 190, 140);
    renderer.drawImage(assets.image('stumpandmoney'), 190, 190);
    renderer.drawImage(assets.image('bubbles'), 240, 190);
    renderer.drawImage(assets.image('mouse'), 10, 520);
    renderer.drawImage(assets.image('plusminus'), 30, 520);
    renderer.drawImage(assets.image('buttonz'), 60, 520);

    const w = this.worldAssets;
    if (w) {
      renderer.drawImage(w.tiles, 350, 140);
      renderer.drawSprite(w.supplement, 0, 0, 200, 234, 60, 320, 160, 187);
      // One animated thingie frame to prove sub-rect sampling: row 1, 11 frames.
      const frame = Math.floor(this.t * 10) % 11;
      renderer.drawSprite(w.tiles, frame * 40, 40, 40, 40, 240, 360, 80, 80);
    }
    const label = this.loading ? `world ${this.world} (loading)` : `world ${this.world}`;
    renderer.drawText(assets.font('font1'), label, VIRTUAL_WIDTH - 10, VIRTUAL_HEIGHT - 40, {
      align: 'right',
    });
    renderer.end();
  }

  leave(): void {}
}
