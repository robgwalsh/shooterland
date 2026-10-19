import { expect, test } from '@playwright/test';

test('plays level 1-1: aiming and clicking fires both shooters', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?level=1-1&seed=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByText('levelStart 1-1')).toBeVisible({ timeout: 20_000 });

  const shots = () => page.evaluate(() => window.__shooterland?.debug.session()?.stats.shots ?? -1);
  expect(await shots()).toBe(0);

  // The canvas is 800x600 CSS pixels here, so virtual coordinates map 1:1.
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  // Column 6, row 6 of the board (board origin 20,20; 40px cells).
  await page.mouse.click(box.x + 20 + 6 * 40 + 20, box.y + 20 + 6 * 40 + 20);
  await expect.poll(shots, { timeout: 5_000 }).toBe(1);

  // Shots land and the shooters reload (no projectiles left in flight).
  await expect
    .poll(() => page.evaluate(() => window.__shooterland?.debug.session()?.inFlight.length ?? -1), {
      timeout: 5_000,
    })
    .toBe(0);

  if (process.env.SMOKE_SHOT_GAMEPLAY) {
    await canvas.screenshot({ path: process.env.SMOKE_SHOT_GAMEPLAY });
  }
  expect(errors).toEqual([]);
});
