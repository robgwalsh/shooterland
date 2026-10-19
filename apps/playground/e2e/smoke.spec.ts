import { expect, type Page, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH, virtualMapper } from './virtual';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

async function canvasPixels(
  page: Page,
): Promise<{ at: (x: number, y: number) => Rgb; w: number; h: number }> {
  const png = PNG.sync.read(await page.locator('canvas').screenshot());
  return {
    w: png.width,
    h: png.height,
    at: (x, y) => {
      const i = (y * png.width + x) * 4;
      return { r: png.data[i] ?? 0, g: png.data[i + 1] ?? 0, b: png.data[i + 2] ?? 0 };
    },
  };
}

/** The canvas is the largest 4:3 box that fits the page: 4:3 itself, with the whole of it game. */
async function expectFittedCanvas(page: Page): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  expect(Math.abs(box.width / box.height - VIRTUAL_WIDTH / VIRTUAL_HEIGHT)).toBeLessThan(0.01);
  const px = await canvasPixels(page);
  // Blue boot colour in the middle and in every corner: no letterbox bars inside the canvas.
  expect(px.at(Math.floor(px.w / 2), Math.floor(px.h / 2)).b).toBeGreaterThan(100);
  for (const [x, y] of [
    [2, 2],
    [px.w - 3, 2],
    [2, px.h - 3],
    [px.w - 3, px.h - 3],
  ] as const) {
    expect(px.at(x, y).b).toBeGreaterThan(100);
  }
}

test('boots, fits the largest 4:3 box into the page and follows viewport resizes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?audio=none&scene=boot');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByText('ready')).toBeVisible();
  // The event log floats over the canvas corner; hide it so the pixel checks see only the game.
  await page.getByTestId('event-log').evaluate((el) => {
    el.style.visibility = 'hidden';
  });
  await expectFittedCanvas(page);
  const initial = await canvas.boundingBox();
  if (!initial) throw new Error('canvas has no bounding box');

  // Wide and short: height is the limit, so the canvas is narrower than the page.
  await page.setViewportSize({ width: 1400, height: 500 });
  await page.waitForTimeout(300);
  await expectFittedCanvas(page);
  const wide = await canvas.boundingBox();
  if (!wide) throw new Error('canvas has no bounding box');
  expect(wide.width).toBeLessThan(1400);
  expect(wide.height).toBeLessThan(initial.height);

  // Narrow and tall: width is the limit, so the canvas spans the page.
  await page.setViewportSize({ width: 600, height: 1000 });
  await page.waitForTimeout(300);
  await expectFittedCanvas(page);
  const tall = await canvas.boundingBox();
  if (!tall) throw new Error('canvas has no bounding box');
  expect(tall.width).toBeCloseTo(600, 0);
  if (process.env.SMOKE_SHOT) await page.screenshot({ path: process.env.SMOKE_SHOT });

  // Pointer input reaches the scene at the scaled size: holding the pointer turns the area orange.
  const v = await virtualMapper(canvas);
  await page.mouse.move(v.x(400), v.y(300));
  await page.mouse.down();
  await page.waitForTimeout(200);
  const px = await canvasPixels(page);
  expect(px.at(Math.floor(px.w / 2), Math.floor(px.h / 2)).r).toBeGreaterThan(150);
  await page.mouse.up();

  // Unmounting tears the game down without errors.
  await page.getByRole('button', { name: 'Unmount' }).click();
  await expect(canvas).toHaveCount(0);
  expect(errors).toEqual([]);
});
