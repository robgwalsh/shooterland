import type { Viewport } from '../render/Viewport';

export type InputEvent =
  | { readonly type: 'down'; readonly x: number; readonly y: number; readonly button: number }
  | { readonly type: 'up'; readonly x: number; readonly y: number; readonly button: number }
  | { readonly type: 'move'; readonly x: number; readonly y: number }
  /** A key press while the canvas has focus; `key` is the DOM KeyboardEvent key. */
  | { readonly type: 'key'; readonly key: string };

/**
 * Listens to pointer and keyboard events on the canvas and queues them in
 * virtual (800x600) coordinates. Scenes drain the queue once per tick.
 */
export class PointerInput {
  private readonly queue: InputEvent[] = [];
  private readonly abort = new AbortController();
  /** Latest pointer position in virtual coordinates. */
  x = -1;
  y = -1;
  isDown = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly viewport: Viewport,
  ) {
    const { signal } = this.abort;
    const opts = { signal, passive: false } as const;
    if (canvas.tabIndex < 0) canvas.tabIndex = 0;
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        canvas.setPointerCapture(e.pointerId);
        canvas.focus({ preventScroll: true });
        const p = this.project(e);
        this.isDown = true;
        this.queue.push({ type: 'down', x: p.x, y: p.y, button: e.button });
        e.preventDefault();
      },
      opts,
    );
    const up = (e: PointerEvent): void => {
      const p = this.project(e);
      this.isDown = false;
      this.queue.push({ type: 'up', x: p.x, y: p.y, button: e.button });
    };
    canvas.addEventListener('pointerup', up, opts);
    canvas.addEventListener('pointercancel', up, opts);
    canvas.addEventListener(
      'pointermove',
      (e) => {
        const p = this.project(e);
        this.queue.push({ type: 'move', x: p.x, y: p.y });
      },
      opts,
    );
    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), opts);
    canvas.addEventListener(
      'keydown',
      (e) => {
        if (e.repeat) return;
        this.queue.push({ type: 'key', key: e.key });
        if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
      },
      opts,
    );
  }

  private project(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    const p = this.viewport.toVirtual(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    this.x = p.x;
    this.y = p.y;
    return p;
  }

  /** Returns and clears the events received since the last drain. */
  drain(): InputEvent[] {
    if (this.queue.length === 0) return [];
    return this.queue.splice(0, this.queue.length);
  }

  destroy(): void {
    this.abort.abort();
  }
}
