import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function readSpeed(page: Page) { return Number(await page.getByTestId('speed').textContent()); }
async function openSimulator(page: Page) {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
}
async function mirrorShot(page: Page, side: string) {
  const clip = await page.locator(`.mirror-${side} .mirror-glass`).boundingBox();
  if (!clip) throw new Error('Mirror viewport missing');
  return page.screenshot({ clip });
}

test('drive, steer, brake, shift, and update BOTH real mirror views', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await openSimulator(page);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('gear')).toHaveText('P');
  await expect(page.getByTestId('speed')).toHaveText('0.0');
  const initialLeft = await mirrorShot(page, 'left'), initialRight = await mirrorShot(page, 'right');
  await page.getByRole('button', { name: '排入 D 前進', exact: true }).click();
  await expect(page.getByTestId('gear')).toHaveText('D');
  await page.getByRole('button', { name: '解除煞車保持', exact: true }).click();
  await page.keyboard.down('w'); await page.keyboard.down('d');
  await expect.poll(() => readSpeed(page)).toBeGreaterThan(2);
  await page.keyboard.up('d'); await page.keyboard.up('w');
  const angleText = await page.locator('.steering-status small').textContent();
  const angle = parseInt(angleText || '0'); expect(angle).toBeGreaterThan(100);
  await page.waitForTimeout(250);
  expect(parseInt((await page.locator('.steering-status small').textContent())!)).toBe(angle);
  expect(Buffer.compare(initialLeft, await mirrorShot(page, 'left'))).not.toBe(0);
  expect(Buffer.compare(initialRight, await mirrorShot(page, 'right'))).not.toBe(0);
  await page.getByRole('button', { name: '排入 R 倒車', exact: true }).click();
  await expect(page.getByTestId('gear')).toHaveText('D');
  await expect(page.getByRole('status')).toContainText('請先煞停');
  await page.keyboard.down('Space');
  await expect.poll(() => readSpeed(page)).toBe(0);
  await page.getByRole('button', { name: '煞車保持', exact: true }).click();
  await page.getByRole('button', { name: '排入 R 倒車', exact: true }).click();
  await page.keyboard.up('Space');
  await expect(page.getByTestId('gear')).toHaveText('R');
  await page.getByRole('button', { name: '解除煞車保持', exact: true }).click();
  await expect.poll(() => readSpeed(page)).toBeGreaterThan(1);
  await page.getByRole('button', { name: '暫停分析', exact: true }).click();
  await expect(page.locator('.analysis-card')).toBeVisible();
  const frozenSpeed = await readSpeed(page);
  await page.waitForTimeout(250); expect(await readSpeed(page)).toBe(frozenSpeed);
  await page.getByRole('tab', { name: '俯視教學' }).click();
  await expect(page.locator('.scene-host')).toHaveClass(/view-top/);
  await page.screenshot({ path: '.local/top-analysis.png', fullPage: true });
  await page.getByRole('button', { name: '重新開始', exact: true }).click();
  await expect(page.getByTestId('gear')).toHaveText('P');
  await expect.poll(() => readSpeed(page)).toBe(0);
  expect(errors).toEqual([]);
});

test('mirror zoom shortcuts restore previous view, including overlapping held keys', async ({ page }) => {
  await openSimulator(page);
  await page.keyboard.press('4');
  await expect(page.locator('.scene-host')).toHaveClass(/view-top/);
  await page.keyboard.down('2');
  await expect(page.locator('.mirror-left')).toHaveClass(/enlarged/);
  await page.keyboard.down('3');
  await expect(page.locator('.mirror-right')).toHaveClass(/enlarged/);
  await page.keyboard.up('3');
  await expect(page.locator('.mirror-left')).toHaveClass(/enlarged/);
  await page.keyboard.up('2');
  await expect(page.locator('.scene-host')).toHaveClass(/view-top/);
  await page.getByRole('button', { name: '放大右後照鏡', exact: true }).click();
  await expect(page.locator('.mirror-right')).toHaveClass(/enlarged/);
  await page.getByRole('button', { name: '返回駕駛座' }).click();
  await expect(page.locator('.scene-host')).toHaveClass(/view-driver/);
});

test('calibration persists after reload; options and blur safety work', async ({ page }) => {
  await openSimulator(page);
  await page.getByRole('button', { name: '視野校正', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('slider', { name: '前方視野 FOV' }).fill('75');
  await page.getByRole('slider', { name: '視線高度' }).fill('1.4');
  await page.getByRole('button', { name: '套用並儲存', exact: true }).click();
  await expect(page.getByRole('button', { name: '已套用並儲存' })).toBeVisible();
  await page.getByRole('button', { name: '關閉校正面板' }).click();
  await page.reload();
  await page.getByRole('button', { name: '視野校正', exact: true }).click();
  await expect(page.getByRole('slider', { name: '前方視野 FOV' })).toHaveValue('75');
  await expect(page.getByRole('slider', { name: '視線高度' })).toHaveValue('1.4');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '開啟練習設定' }).click();
  await page.getByRole('checkbox', { name: /除錯模式/ }).check();
  await expect(page.locator('.debug-card')).toBeVisible();
  await page.getByRole('checkbox', { name: /半透明車身/ }).check();
  await page.getByRole('button', { name: '關閉練習設定' }).click();
  await page.getByRole('button', { name: '繼續練習' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('button', { name: '繼續練習' })).toBeVisible();
  await expect(page.getByRole('button', { name: '解除煞車保持' })).toBeVisible();
});

test('screen-held steering and throttle work without memorizing keyboard controls', async ({ page }) => {
  await openSimulator(page);
  await page.getByRole('button', { name: '排入 D 前進', exact: true }).click();
  await page.getByRole('button', { name: '解除煞車保持', exact: true }).click();
  const button = page.getByRole('button', { name: '按住方向盤左轉 A', exact: true });
  await button.scrollIntoViewIfNeeded();
  await button.hover(); await page.mouse.down();
  await expect.poll(async () => parseInt((await page.locator('.steering-status small').textContent())!)).toBeLessThan(-100);
  await page.mouse.up();
  const angle = parseInt((await page.locator('.steering-status small').textContent())!);
  await page.waitForTimeout(250);
  expect(parseInt((await page.locator('.steering-status small').textContent())!)).toBe(angle);
  await page.getByRole('button', { name: '按住輕踩油門 W', exact: true }).hover(); await page.mouse.down();
  await expect.poll(() => readSpeed(page)).toBeGreaterThan(2.5);
  await page.mouse.up();
  await expect(page.locator('.pedal-controls .hold-button')).not.toHaveClass(/throttle-active/);
});

test('narrow layout has no horizontal overflow and still exposes the simulator', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await openSimulator(page);
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '.local/mobile.png', fullPage: true });
});
