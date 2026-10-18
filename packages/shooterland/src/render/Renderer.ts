import type { Viewport } from './Viewport';

/**
 * Phase-0 renderer: owns the GL state for one frame and clears the letterboxed
 * virtual area. The sprite batcher and bitmap-font text land here in phase 1.
 */
export class Renderer {
  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly viewport: Viewport,
  ) {}

  /** Clears the whole canvas to black and the virtual area to `rgb` (0..1 components). */
  begin(r = 0, g = 0, b = 0): void {
    const { gl, viewport } = this;
    const { rect } = viewport;
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, viewport.canvasWidth, viewport.canvasHeight);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // GL's origin is bottom-left; flip the letterbox rect's y.
    const y = viewport.canvasHeight - rect.y - rect.h;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(rect.x, y, rect.w, rect.h);
    gl.viewport(rect.x, y, rect.w, rect.h);
    gl.clearColor(r, g, b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  end(): void {
    this.gl.disable(this.gl.SCISSOR_TEST);
  }
}
