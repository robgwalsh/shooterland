import type { Locator } from '@playwright/test';

/** The game's virtual resolution; scenes lay everything out in these units. */
export const VIRTUAL_WIDTH = 800;
export const VIRTUAL_HEIGHT = 600;

/**
 * Maps virtual game coordinates to page coordinates. The canvas is the largest
 * 4:3 box that fits the page, so its size depends on the viewport; tests that
 * click painted controls go through this instead of assuming 800x600.
 */
export async function virtualMapper(
  canvas: Locator,
): Promise<{ x: (vx: number) => number; y: (vy: number) => number; scale: number }> {
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const scale = box.width / VIRTUAL_WIDTH;
  return {
    scale,
    x: (vx) => box.x + vx * scale,
    y: (vy) => box.y + vy * scale,
  };
}
