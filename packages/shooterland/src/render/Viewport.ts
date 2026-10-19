import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '../core/constants';

/** A rectangle in device pixels on the canvas. */
export interface DeviceRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Maps the fixed 800x600 virtual space onto a canvas of any size: the largest
 * 4:3 rectangle that fits, centred (letterboxed). The scale is fractional in
 * both directions so the game always fills the canvas it is given.
 */
export class Viewport {
  canvasWidth = VIRTUAL_WIDTH;
  canvasHeight = VIRTUAL_HEIGHT;
  scale = 1;
  readonly rect: DeviceRect = { x: 0, y: 0, w: VIRTUAL_WIDTH, h: VIRTUAL_HEIGHT };

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = Math.max(1, Math.floor(canvasWidth));
    this.canvasHeight = Math.max(1, Math.floor(canvasHeight));
    this.scale = Math.min(this.canvasWidth / VIRTUAL_WIDTH, this.canvasHeight / VIRTUAL_HEIGHT);
    const w = Math.round(VIRTUAL_WIDTH * this.scale);
    const h = Math.round(VIRTUAL_HEIGHT * this.scale);
    this.rect.x = Math.floor((this.canvasWidth - w) / 2);
    this.rect.y = Math.floor((this.canvasHeight - h) / 2);
    this.rect.w = w;
    this.rect.h = h;
  }

  /**
   * Converts a point in canvas-relative CSS pixels to virtual coordinates.
   * The result may fall outside 0..800 / 0..600 when the pointer is in the letterbox.
   */
  toVirtual(
    cssX: number,
    cssY: number,
    cssWidth: number,
    cssHeight: number,
  ): { x: number; y: number } {
    const dx = (cssX / cssWidth) * this.canvasWidth;
    const dy = (cssY / cssHeight) * this.canvasHeight;
    return {
      x: (dx - this.rect.x) / this.scale,
      y: (dy - this.rect.y) / this.scale,
    };
  }
}
