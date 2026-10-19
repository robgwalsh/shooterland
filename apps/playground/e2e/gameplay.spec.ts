import { expect, test } from '@playwright/test';
import { virtualMapper } from './virtual';

test('plays level 1-1: aiming and clicking fires both shooters', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?audio=none&level=1-1&seed=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByText('levelStart 1-1')).toBeVisible({ timeout: 20_000 });

  const shots = () => page.evaluate(() => window.__shooterland?.debug.session()?.stats.shots ?? -1);
  expect(await shots()).toBe(0);

  const v = await virtualMapper(canvas);
  // Column 6, row 6 of the board (board origin 40,40; 40px cells).
  await page.mouse.click(v.x(40 + 6 * 40 + 20), v.y(40 + 6 * 40 + 20));
  await expect.poll(shots, { timeout: 5_000 }).toBe(1);

  // Shots land and nothing is left in flight.
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
