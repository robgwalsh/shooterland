import type { Assets } from '../assets/AssetLoader';
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '../core/constants';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import type { Scene, SceneContext } from './Scene';

const FADE = 0.6;
const HOLD = 1.8;

/** "9 Minute Productions" studio card: fades in, holds, fades out; a click skips it. */
export class LogoScene implements Scene {
  private t = 0;
  private done = false;

  constructor(
    private readonly assets: Assets,
    private readonly onDone: () => void,
  ) {}

  enter(_ctx: SceneContext): void {
    this.t = 0;
  }

  update(dt: number, input: readonly InputEvent[]): void {
    this.t += dt;
    const skip = input.some((e) => e.type === 'down' || e.type === 'key');
    if (!this.done && (skip || this.t >= FADE + HOLD + FADE)) {
      this.done = true;
      this.onDone();
    }
  }

  draw(renderer: Renderer): void {
    const logo = this.assets.image('logo');
    const t = this.t;
    const alpha =
      t < FADE ? t / FADE : t < FADE + HOLD ? 1 : Math.max(0, 1 - (t - FADE - HOLD) / FADE);
    renderer.begin();
    renderer.drawImage(
      logo,
      (VIRTUAL_WIDTH - logo.width) / 2,
      (VIRTUAL_HEIGHT - logo.height) / 2,
      alpha,
    );
    renderer.end();
  }

  leave(): void {}
}
