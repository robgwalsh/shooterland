import { expect, test } from '@playwright/test';

test('store: dragging a weight onto one of Mary\'s lanes loads it and charges its price', async ({
  page,
}) => {
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

  // The Store button sits in the panel at (630,397) 66x19.
  await page.mouse.click(box.x + 663, box.y + 406);
  await expect
    .poll(() => page.evaluate(() => window.__shooterland?.debug.session()?.storeOpen ?? false))
    .toBe(true);

  // Mary's bar parks at lane 10 while the store is open, so her bubble is at (430,540) 62x62.
  await expect
    .poll(() => page.evaluate(() => window.__shooterland?.debug.session()?.shooters.bottom.lane))
    .toBe(10);
  // Press the 1-weight slot (655,420) and drag it onto the bubble.
  await page.mouse.move(box.x + 675, box.y + 440);
  await page.mouse.down();
  await page.mouse.move(box.x + 500, box.y + 500, { steps: 5 });
  await page.mouse.move(box.x + 461, box.y + 571, { steps: 5 });
  await page.waitForTimeout(100);
  if (process.env.SMOKE_SHOT_STORE) await canvas.screenshot({ path: process.env.SMOKE_SHOT_STORE });
  await page.mouse.up();

  await expect
    .poll(() =>
      page.evaluate(
        () => window.__shooterland?.debug.session()?.shooters.bottom.lanes[0]?.loaded ?? -2,
      ),
    )
    .toBe(12); // TileId.Weight1
  expect(await page.evaluate(() => window.__shooterland?.debug.session()?.money)).toBe(3);
  expect(await page.evaluate(() => window.__shooterland?.debug.session()?.storeOpen)).toBe(false);
  expect(errors).toEqual([]);
});
