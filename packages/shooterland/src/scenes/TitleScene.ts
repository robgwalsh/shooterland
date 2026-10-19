import type { Assets } from '../assets/AssetLoader';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import type { Scene, SceneContext } from './Scene';
import { contains, rect } from './ui';

/** Button hot-spots painted into shooterland.png. */
const START = rect(45, 462, 96, 108);
const QUIT = rect(205, 462, 96, 106);

export class TitleScene implements Scene {
  constructor(
    private readonly assets: Assets,
    private readonly actions: { onStart: () => void; onQuit: () => void },
  ) {}

  enter(_ctx: SceneContext): void {}

  update(_dt: number, input: readonly InputEvent[]): void {
    for (const e of input) {
      if (e.type === 'key' && (e.key === 'Enter' || e.key === ' ')) {
        this.actions.onStart();
        return;
      }
      if (e.type !== 'down') continue;
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
    const beta = this.assets.image('beta');
    renderer.drawImage(beta, 800 - beta.width - 8, 8);
    renderer.end();
  }

  leave(): void {}
}
