import type { Assets } from '../assets/AssetLoader';
import type { BitmapFont } from '../render/BitmapFont';
import type { Renderer } from '../render/Renderer';
import type { Rect } from './ui';

/**
 * The exe loads its three bitmap fonts eleven times, each with a colour
 * (`FUN_0040d4b7`; docs/DISASSEMBLY.md "Font slots"). Slot numbers below are
 * the exe's, so coordinates in the disassembly notes can be used as they are.
 */
export const FONT_SLOTS: readonly { font: string; r: number; g: number; b: number }[] = [
  { font: 'font1', r: 1, g: 0, b: 0 },
  { font: 'font1', r: 1, g: 1, b: 0 },
  { font: 'font1', r: 0, g: 1, b: 0 },
  { font: 'font1', r: 0, g: 0, b: 1 },
  { font: 'font1', r: 1, g: 1, b: 1 },
  { font: 'font1', r: 0, g: 0, b: 0 },
  { font: 'font2', r: 0, g: 0, b: 0 },
  { font: 'font2', r: 1, g: 1, b: 1 },
  { font: 'font2', r: 0, g: 1, b: 0 },
  { font: 'font3', r: 1, g: 1, b: 1 },
  { font: 'font3', r: 0, g: 0, b: 0 },
];

export const Slot = {
  red: 0,
  yellow: 1,
  green: 2,
  blue: 3,
  white: 4,
  black: 5,
  smallBlack: 6,
  smallWhite: 7,
  smallGreen: 8,
  bigWhite: 9,
  bigBlack: 10,
} as const;

export function slotFont(assets: Assets, slot: number): BitmapFont {
  return assets.font(FONT_SLOTS[slot]?.font ?? 'font1');
}

/** Draws text with its top-left at (x,y) in the slot's font and colour (`FUN_0040ee5f`). */
export function drawSlot(
  renderer: Renderer,
  assets: Assets,
  slot: number,
  text: string,
  x: number,
  y: number,
  align: 'left' | 'center' | 'right' = 'left',
): void {
  const s = FONT_SLOTS[slot] ?? FONT_SLOTS[4];
  if (!s) return;
  renderer.drawText(assets.font(s.font), text, x, y, { r: s.r, g: s.g, b: s.b, align });
}

/** Draws text centred in a rectangle (`FUN_0040f0b0`). */
export function drawSlotCentred(
  renderer: Renderer,
  assets: Assets,
  slot: number,
  text: string,
  rect: Rect,
): void {
  const s = FONT_SLOTS[slot] ?? FONT_SLOTS[4];
  if (!s) return;
  const font = assets.font(s.font);
  const y = rect.y + Math.floor(rect.h / 2) - Math.floor(font.lineHeight / 2);
  renderer.drawText(font, text, rect.x + Math.floor(rect.w / 2), y, {
    r: s.r,
    g: s.g,
    b: s.b,
    align: 'center',
  });
}
