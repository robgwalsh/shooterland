import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';

export interface SceneContext {
  /** Requests a scene change; applied at the start of the next tick. */
  go(next: Scene): void;
}

/**
 * One screen of the game (title, world map, gameplay, ...). Mirrors the
 * original's state-machine shape: enter / update / draw / leave.
 */
export interface Scene {
  enter(ctx: SceneContext): void;
  /** One fixed simulation step. `input` holds the pointer events since the last step. */
  update(dt: number, input: readonly InputEvent[]): void;
  draw(renderer: Renderer): void;
  leave(): void;
}

export class SceneManager implements SceneContext {
  private current: Scene | null = null;
  private next: Scene | null = null;

  go(next: Scene): void {
    this.next = next;
  }

  /** Applies any pending transition, then updates the active scene. */
  update(dt: number, input: readonly InputEvent[]): void {
    if (this.next) {
      this.current?.leave();
      this.current = this.next;
      this.next = null;
      this.current.enter(this);
    }
    this.current?.update(dt, input);
  }

  draw(renderer: Renderer): void {
    this.current?.draw(renderer);
  }

  destroy(): void {
    this.current?.leave();
    this.current = null;
    this.next = null;
  }
}
