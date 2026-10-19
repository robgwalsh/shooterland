import { expect, type Page, test } from '@playwright/test';

const scene = (page: Page) => page.evaluate(() => window.__shooterland?.debug.scene() ?? 'none');

test('title -> file select -> world map -> intro -> play -> pause -> quit back to the map', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Fresh saves for every run.
  await page.addInitScript(() => localStorage.clear());

  await page.goto('/?audio=none&scene=title');
  const canvas = page.locator('canvas');
  await expect(page.getByText('ready')).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => scene(page)).toBe('TitleScene');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const click = (x: number, y: number) => page.mouse.click(box.x + x, box.y + y);

  // "Start Game" is painted at (43..140, 459..570).
  await click(91, 514);
  await expect.poll(() => scene(page)).toBe('SaveSelectScene');

  // File 1 (25,442 47x45) then Load (161,563 77x28).
  await click(48, 464);
  await click(199, 577);
  await expect.poll(() => scene(page)).toBe('WorldMapScene');

  // Level 1 is selected by default; "Play Level" is at (669,488 44x44) and opens the intro.
  await click(691, 510);
  await expect(page.getByText('levelStart 1-1')).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => scene(page)).toBe('IntroScene');
  // Play (626,530 150x39) starts the level.
  await click(701, 549);
  await expect.poll(() => scene(page)).toBe('GameplayScene');

  // Pause with the panel's Pause button (626,261 150x39), resume, then Quit (626,311) and confirm.
  await click(701, 280);
  await page.waitForTimeout(100);
  await click(701, 280);
  await click(701, 330);
  await click(250, 355);
  await expect.poll(() => scene(page)).toBe('WorldMapScene');

  // Stats (141,488 44x44); any click returns.
  await click(163, 510);
  await expect.poll(() => scene(page)).toBe('StatsScene');
  await click(400, 300);
  await expect.poll(() => scene(page)).toBe('WorldMapScene');

  // Locked level: clicking node 2 then Play shows a toast and stays on the map.
  await click(471 + 30, 163 + 20);
  await click(691, 510);
  await page.waitForTimeout(200);
  expect(await scene(page)).toBe('WorldMapScene');

  if (process.env.SMOKE_SHOT_MAP) await canvas.screenshot({ path: process.env.SMOKE_SHOT_MAP });
  expect(errors).toEqual([]);
});
