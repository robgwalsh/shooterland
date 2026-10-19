import type { FontMetrics } from '../assets/manifest';
import type { SpriteBatch } from './SpriteBatch';
import type { Texture } from './Texture';

export interface TextStyle {
  /** 0..1 colour components; text textures are white so this is the text colour. */
  r?: number;
  g?: number;
  b?: number;
  a?: number;
  align?: 'left' | 'center' | 'right';
  scale?: number;
}

/**
 * LMNOpc Bitmap Font Builder font: a 16x16 grid of equal cells indexed by
 * character code, glyphs centred in their cells, and a per-character advance.
 */
export class BitmapFont {
  readonly cell: number;

  constructor(
    readonly texture: Texture,
    readonly metrics: FontMetrics,
  ) {
    this.cell = metrics.cell;
  }

  /** Line height in virtual pixels at scale 1. */
  get lineHeight(): number {
    return this.cell;
  }

  advance(code: number): number {
    return this.metrics.advances[code & 255] ?? 0;
  }

  measure(text: string, scale = 1): number {
    let w = 0;
    for (let i = 0; i < text.length; i++) w += this.advance(text.charCodeAt(i));
    return w * scale;
  }

  /** Draws one line of text with its top-left (or top-centre/right) at x,y. */
  draw(batch: SpriteBatch, text: string, x: number, y: number, style: TextStyle = {}): void {
    const scale = style.scale ?? 1;
    const align = style.align ?? 'left';
    let pen = x;
    if (align !== 'left') {
      const w = this.measure(text, scale);
      pen = align === 'center' ? x - w / 2 : x - w;
    }
    const { cell } = this;
    const r = style.r ?? 1;
    const g = style.g ?? 1;
    const b = style.b ?? 1;
    const a = style.a ?? 1;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i) & 255;
      const adv = this.advance(code);
      if (code !== 32) {
        const sx = (code & 15) * cell;
        const sy = (code >> 4) * cell;
        // Glyphs are centred in their cell; shift left so the ink starts near the pen.
        const dx = pen - Math.floor((cell - adv) / 2) * scale;
        batch.draw(this.texture, sx, sy, cell, cell, dx, y, cell * scale, cell * scale, r, g, b, a);
      }
      pen += adv * scale;
    }
  }
}
