import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '../core/constants';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import type { Scene, SceneContext } from './Scene';

/**
 * Shown while assets download. Draws a bare progress bar (fonts are not
 * available yet) and turns red if loading fails.
 */
export class LoadingScene implements Scene {
  private fraction = 0;
  private failed = false;

  setProgress(loaded: number, total: number): void {
    this.fraction = total > 0 ? loaded / total : 0;
  }

  setFailed(): void {
    this.failed = true;
  }

  enter(_ctx: SceneContext): void {}

  update(_dt: number, _input: readonly InputEvent[]): void {}

  draw(renderer: Renderer): void {
    renderer.begin(0.04, 0.05, 0.08);
    const w = VIRTUAL_WIDTH * 0.5;
    const h = 14;
    const x = (VIRTUAL_WIDTH - w) / 2;
    const y = VIRTUAL_HEIGHT * 0.6;
    renderer.drawRect(x - 2, y - 2, w + 4, h + 4, 0.25, 0.25, 0.3);
    if (this.failed) renderer.drawRect(x, y, w, h, 0.8, 0.15, 0.1);
    else renderer.drawRect(x, y, w * this.fraction, h, 0.95, 0.75, 0.2);
    renderer.end();
  }

  leave(): void {}
}
