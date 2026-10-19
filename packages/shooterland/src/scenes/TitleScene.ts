import type { Assets } from '../assets/AssetLoader';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import type { Scene, SceneContext } from './Scene';
import { contains, rect } from './ui';

/** Button hot-spots painted into shooterland.png (`FUN_004025a3`). */
const START = rect(43, 459, 97, 111);
const QUIT = rect(204, 459, 97, 111);
const BETA = { x: 450, y: 110 };

export class TitleScene implements Scene {
  private hoverX = -1;
  private hoverY = -1;

  constructor(
    private readonly assets: Assets,
    private readonly actions: { onStart: () => void; onQuit: () => void },
  ) {}

  enter(_ctx: SceneContext): void {}

  update(_dt: number, input: readonly InputEvent[]): void {
    for (const e of input) {
      if (e.type === 'move') {
        this.hoverX = e.x;
        this.hoverY = e.y;
        continue;
      }
      if (e.type === 'key' && (e.key === 'Enter' || e.key === ' ')) {
        this.actions.onStart();
        return;
      }
      if (e.type !== 'down' || e.button !== 0) continue;
      if (contains(START, e.x, e.y)) {
        this.actions.onStart();
        return;
      }
      if (contains(QUIT, e.x, e.y)) {
        this.actions.onQuit();
        return;
      }
    }
  }

  draw(renderer: Renderer): void {
    renderer.begin();
    renderer.drawImage(this.assets.image('shooterland'), 0, 0);
    renderer.drawImage(this.assets.image('beta'), BETA.x, BETA.y);
    for (const r of [START, QUIT]) {
      if (contains(r, this.hoverX, this.hoverY))
        renderer.drawRect(r.x, r.y, r.w, r.h, 1, 1, 1, 0.12);
    }
    renderer.end();
  }

  leave(): void {}
}
