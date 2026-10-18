import { expect, type Page, test } from '@playwright/test';
import { PNG } from 'pngjs';

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

test('boots, draws the virtual area and letterboxes wider canvases', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('ready')).toBeVisible();

  // Native size: the whole canvas is the virtual area (blue boot colour).
  let px = await canvasPixels(page);
  expect(px.w).toBe(800);
  expect(px.h).toBe(600);
  expect(px.at(400, 300).b).toBeGreaterThan(100);
  expect(px.at(2, 2).b).toBeGreaterThan(100);

  // Wider than 4:3: letterbox bars appear left and right, virtual area stays centred.
  await page.getByRole('button', { name: 'Large (1200px)' }).click();
  await page.waitForTimeout(300);
  if (process.env.SMOKE_SHOT) await page.screenshot({ path: process.env.SMOKE_SHOT });
  px = await canvasPixels(page);
  expect(px.w).toBe(1200);
  expect(px.h).toBe(900);
  const corner = px.at(2, 2);
  expect(corner.r + corner.g + corner.b).toBeLessThan(30);
  expect(px.at(600, 450).b).toBeGreaterThan(100);

  // Pointer input reaches the scene: holding the pointer turns the area orange.
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.move(600, 450 + box.y);
  await page.mouse.down();
  await page.waitForTimeout(200);
  px = await canvasPixels(page);
  expect(px.at(600, 450).r).toBeGreaterThan(150);
  await page.mouse.up();

  // Unmounting tears the game down without errors.
  await page.getByRole('button', { name: 'Unmount' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});
