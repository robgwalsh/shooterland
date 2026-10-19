import type { BitmapFont, TextStyle } from './BitmapFont';
import { SpriteBatch } from './SpriteBatch';
import { Texture } from './Texture';
import type { Viewport } from './Viewport';

/**
 * Frame-level drawing API in virtual 800x600 coordinates. Everything goes
 * through one sprite batch; solid rectangles use a 1x1 white texture.
 */
export class Renderer {
  readonly batch: SpriteBatch;
  private readonly white: Texture;

  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly viewport: Viewport,
  ) {
    this.batch = new SpriteBatch(gl);
    this.white = Texture.white(gl);
  }

  /** Clears the canvas to black and the letterboxed virtual area to `rgb` (0..1), then starts batching. */
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
    this.batch.begin();
  }

  /** Draws a sub-rectangle of a texture. Destination size defaults to the source size. */
  drawSprite(
    tex: Texture,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw = sw,
    dh = sh,
    alpha = 1,
  ): void {
    this.batch.draw(tex, sx, sy, sw, sh, dx, dy, dw, dh, 1, 1, 1, alpha);
  }

  /** Draws a whole texture at dx,dy. */
  drawImage(tex: Texture, dx: number, dy: number, alpha = 1): void {
    this.batch.draw(
      tex,
      0,
      0,
      tex.width,
      tex.height,
      dx,
      dy,
      tex.width,
      tex.height,
      1,
      1,
      1,
      alpha,
    );
  }

  drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    g: number,
    b: number,
    a = 1,
  ): void {
    this.batch.draw(this.white, 0, 0, 1, 1, x, y, w, h, r, g, b, a);
  }

  drawText(font: BitmapFont, text: string, x: number, y: number, style?: TextStyle): void {
    font.draw(this.batch, text, x, y, style);
  }

  end(): void {
    this.batch.end();
    this.gl.disable(this.gl.SCISSOR_TEST);
  }

  /** Draws on top of a finished frame (cursor, debug), clipped to the virtual area. */
  drawOverlay(draw: (r: Renderer) => void): void {
    const { gl, viewport } = this;
    const { rect } = viewport;
    const y = viewport.canvasHeight - rect.y - rect.h;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(rect.x, y, rect.w, rect.h);
    gl.viewport(rect.x, y, rect.w, rect.h);
    this.batch.begin();
    draw(this);
    this.batch.end();
    gl.disable(gl.SCISSOR_TEST);
  }

  destroy(): void {
    this.batch.destroy();
    this.white.destroy();
  }
}
