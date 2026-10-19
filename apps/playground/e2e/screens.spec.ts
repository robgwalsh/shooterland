import { expect, type Page, test } from '@playwright/test';
import { virtualMapper } from './virtual';

const scene = (page: Page) => page.evaluate(() => window.__shooterland?.debug.scene() ?? 'none');

/**
 * Walks the intro, pause and result screens and, when SMOKE_SHOT_SCREENS is
 * set, writes `${SMOKE_SHOT_SCREENS}-intro.png`, `-pause.png`, `-result.png`
 * for eyeballing against the original.
 */
test('intro, pause chart and result screens render without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/?audio=none&scene=worldMap');
  const canvas = page.locator('canvas');
  await expect(page.getByText('ready')).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => scene(page)).toBe('WorldMapScene');
  const v = await virtualMapper(canvas);
  const click = (x: number, y: number) => page.mouse.click(v.x(x), v.y(y));
  const shot = async (name: string) => {
    if (process.env.SMOKE_SHOT_SCREENS) {
      await canvas.screenshot({ path: `${process.env.SMOKE_SHOT_SCREENS}-${name}.png` });
    }
  };

  await click(691, 510); // Play Level
  await expect.poll(() => scene(page)).toBe('IntroScene');
  await page.waitForTimeout(300);
  await shot('intro');

  await click(701, 549); // Play
  await expect.poll(() => scene(page)).toBe('GameplayScene');
  await page.mouse.move(v.x(300), v.y(300));
  await click(701, 280); // Pause
  await page.waitForTimeout(300);
  await shot('pause');
  await click(701, 280); // Resume

  // Force a win: wipe every enemy tile, then let the win register.
  await page.evaluate(() => {
    const s = window.__shooterland?.debug.session() as {
      grid: { get(c: number, r: number): number; set(c: number, r: number, id: number): void };
    } | null;
    if (!s) return;
    for (let r = 0; r < 13; r++)
      for (let c = 0; c < 13; c++) {
        const id = s.grid.get(c, r);
        if (id >= 7 && id <= 11) s.grid.set(c, r, -1);
      }
  });
  await expect.poll(() => scene(page), { timeout: 5_000 }).toBe('ResultScene');
  await page.waitForTimeout(600);
  await shot('result');
  await click(250, 560); // OK
  await expect.poll(() => scene(page)).toBe('WorldMapScene');
  expect(errors).toEqual([]);
});
