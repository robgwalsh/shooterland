import type { Assets } from '../assets/AssetLoader';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import type { Scene, SceneContext } from './Scene';

/** The exe fades the logo in over 3.3 s, holds it until 6 s, then fades it out over 3.3 s (`FUN_004023dd`). */
const FADE = 3.314;
const HOLD_UNTIL = 6;
const LOGO = { x: 200, y: 150 };

/** "9 Minute Productions" studio card. A click after the fade-in skips it. */
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
    const skip = this.t >= FADE && input.some((e) => e.type === 'down' || e.type === 'key');
    if (!this.done && (skip || this.t >= HOLD_UNTIL + FADE)) {
      this.done = true;
      this.onDone();
    }
  }

  draw(renderer: Renderer): void {
    const t = this.t;
    const alpha =
      t < FADE ? t / FADE : t < HOLD_UNTIL ? 1 : Math.max(0, 1 - (t - HOLD_UNTIL) / FADE);
    renderer.begin();
    renderer.drawImage(this.assets.image('logo'), LOGO.x, LOGO.y, alpha);
    renderer.end();
  }

  leave(): void {}
}
