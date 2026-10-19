import { expect, test } from '@playwright/test';

test('audio boots on the first click without errors (worker synth + soundfont)', async ({
  page,
}) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    if (m.type() === 'warning') warnings.push(m.text());
  });

  await page.goto('/?scene=title');
  const canvas = page.locator('canvas');
  await expect(page.getByText('ready')).toBeVisible({ timeout: 20_000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  // Any click unlocks audio; this one also starts the game.
  await page.mouse.click(box.x + 93, box.y + 515);
  // Give the worker, worklet and 8 MB sound bank time to load and start the title track.
  await page.waitForTimeout(6000);
  const state = await page.evaluate(
    () => (window as unknown as { __audioState?: string }).__audioState,
  );
  expect(state ?? 'n/a').not.toBe('failed');
  expect(warnings.filter((w) => w.includes('[shooterland]'))).toEqual([]);
  expect(errors).toEqual([]);
});
