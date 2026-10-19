import { expect, type Page, test } from '@playwright/test';

const scene = (page: Page) => page.evaluate(() => window.__shooterland?.debug.scene() ?? 'none');

test('title -> file select -> world map -> play -> pause -> quit back to the map', async ({
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

  // "Start Game" is painted at (45..141, 462..570).
  await click(93, 515);
  await expect.poll(() => scene(page)).toBe('SaveSelectScene');

  // File 1 then Load (panel at 230,300; buttons relative).
  await click(230 + 50, 300 + 31);
  await click(230 + 200, 300 + 142);
  await expect.poll(() => scene(page)).toBe('WorldMapScene');

  // Level 1 is selected by default; "Play Level" is at (670..716, 486..530).
  await click(693, 508);
  await expect(page.getByText('levelStart 1-1')).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => scene(page)).toBe('GameplayScene');

  // Pause with P, then quit through the pause menu's prompt.
  await canvas.focus();
  await page.keyboard.press('p');
  await page.waitForTimeout(100);
  await click(655, 498); // Quit level
  await click(315, 477); // Yes
  await expect.poll(() => scene(page)).toBe('WorldMapScene');

  // Stats and back.
  await click(164, 508);
  await expect.poll(() => scene(page)).toBe('StatsScene');
  await click(400, 498);
  await expect.poll(() => scene(page)).toBe('WorldMapScene');

  // Preview and back.
  await click(639, 508);
  await expect.poll(() => scene(page)).toBe('PreviewScene');
  await click(110, 538);
  await expect.poll(() => scene(page)).toBe('WorldMapScene');

  // Locked level: clicking node 2 then Play shows a toast and stays on the map.
  await click(471 + 25, 163 + 20);
  await click(693, 508);
  await page.waitForTimeout(200);
  expect(await scene(page)).toBe('WorldMapScene');

  if (process.env.SMOKE_SHOT_MAP) await canvas.screenshot({ path: process.env.SMOKE_SHOT_MAP });
  expect(errors).toEqual([]);
});
