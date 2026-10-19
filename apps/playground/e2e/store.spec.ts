import { expect, test } from '@playwright/test';

test('store: dragging a weight onto Mary loads it and charges its price', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?audio=none&level=1-11&seed=3');
  const canvas = page.locator('canvas');
  await expect(page.getByText('levelStart 1-11')).toBeVisible({ timeout: 20_000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');

  // The debug handle returns the live session, so tests can grant money.
  await page.evaluate(() => {
    const s = window.__shooterland?.debug.session() as { money: number } | null;
    if (s) s.money = 5;
  });

  // Store button in the HUD panel (600 + 40..96, 36..54).
  await page.mouse.click(box.x + 600 + 68, box.y + 45);
  await expect
    .poll(() => page.evaluate(() => window.__shooterland?.debug.session()?.storeOpen ?? false))
    .toBe(true);

  // Press the first item (1-weight) and drag it to Mary's bubble under the board.
  const lane = await page.evaluate(
    () => window.__shooterland?.debug.session()?.shooters.bottom.lane ?? 6,
  );
  await page.mouse.move(box.x + 608 + 28, box.y + 60 + 30 + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 300, box.y + 400, { steps: 5 });
  await page.mouse.move(box.x + 20 + lane * 40 + 20, box.y + 540 + 20, { steps: 5 });
  await page.waitForTimeout(100);
  if (process.env.SMOKE_SHOT_STORE) await canvas.screenshot({ path: process.env.SMOKE_SHOT_STORE });
  await page.mouse.up();

  await expect
    .poll(() => page.evaluate(() => window.__shooterland?.debug.session()?.shooters.bottom.loaded))
    .toBe(12); // TileId.Weight1
  expect(await page.evaluate(() => window.__shooterland?.debug.session()?.money)).toBe(3);
  expect(await page.evaluate(() => window.__shooterland?.debug.session()?.storeOpen)).toBe(false);
  expect(errors).toEqual([]);
});
