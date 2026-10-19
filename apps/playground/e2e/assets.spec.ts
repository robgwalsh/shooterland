import { expect, test } from '@playwright/test';

test('loads the generated assets and renders the asset viewer', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?scene=assetViewer');
  await expect(page.locator('canvas')).toBeVisible();
  // 'ready' is logged once every sheet, font and level file has loaded.
  await expect(page.getByText('ready')).toBeVisible({ timeout: 20_000 });
  // Give the lazily loaded world art a moment to arrive and draw.
  await page.waitForTimeout(1000);
  if (process.env.SMOKE_SHOT_VIEWER) {
    await page.locator('canvas').screenshot({ path: process.env.SMOKE_SHOT_VIEWER });
  }
  expect(errors).toEqual([]);
});
