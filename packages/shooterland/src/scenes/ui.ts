import type { BitmapFont } from '../render/BitmapFont';
import type { Renderer } from '../render/Renderer';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

export function contains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

/** A plain labelled button drawn with rectangles, for screens whose art has none. */
export function drawButton(
  renderer: Renderer,
  font: BitmapFont,
  r: Rect,
  label: string,
  hovered: boolean,
): void {
  renderer.drawRect(r.x, r.y, r.w, r.h, 0.32, 0.18, 0.08, 0.95);
  renderer.drawRect(
    r.x + 2,
    r.y + 2,
    r.w - 4,
    r.h - 4,
    hovered ? 0.72 : 0.55,
    hovered ? 0.4 : 0.28,
    0.12,
  );
  renderer.drawText(font, label, r.x + r.w / 2, r.y + (r.h - font.lineHeight) / 2, {
    align: 'center',
  });
}

/** Dims the whole screen. */
export function drawDim(renderer: Renderer, alpha = 0.55): void {
  renderer.drawRect(0, 0, 800, 600, 0, 0, 0, alpha);
}

/** A framed panel with a wood-coloured fill. */
export function drawPanel(renderer: Renderer, r: Rect): void {
  renderer.drawRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 0.25, 0.14, 0.05);
  renderer.drawRect(r.x, r.y, r.w, r.h, 0.55, 0.42, 0.22);
}
