import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import type { Scene, SceneContext } from './Scene';

/**
 * Placeholder first scene: proves the loop, letterbox and input plumbing work
 * by clearing to a colour that shifts while the pointer is held down.
 * Replaced by the studio-logo / title scenes in phase 6.
 */
export class BootScene implements Scene {
  private t = 0;
  private held = false;

  enter(_ctx: SceneContext): void {
    this.t = 0;
  }

  update(dt: number, input: readonly InputEvent[]): void {
    this.t += dt;
    for (const e of input) {
      if (e.type === 'down') this.held = true;
      else if (e.type === 'up') this.held = false;
    }
  }

  draw(renderer: Renderer): void {
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 2);
    if (this.held) renderer.begin(0.85, 0.3 + 0.2 * pulse, 0.1);
    else renderer.begin(0.1, 0.35 + 0.15 * pulse, 0.6);
    renderer.end();
  }

  leave(): void {}
}
