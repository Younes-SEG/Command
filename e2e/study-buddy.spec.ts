import { test, expect } from '@playwright/test';

test('study buddy follows edges, travels with navigation, and saves appearance choices', async ({
  page,
  request,
}) => {
  const original = (await (await request.get('/api/workspace')).json()).settings;
  try {
    await request.patch('/api/settings/preferences', {
      data: { studyBuddy: 'CAT', buddyMotion: true },
    });
    await page.goto('/');
    let buddy = page.getByRole('img', { name: 'Mochi study buddy' });
    await expect(buddy).toBeVisible();
    expect(await buddy.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
    const initial = await buddy.boundingBox();
    await page.mouse.move(1100, 990);
    await expect(buddy).toHaveAttribute('data-walking', 'true');
    await expect.poll(async () => (await buddy.boundingBox())!.x).toBeLessThan(initial!.x - 2);
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(buddy).toHaveAttribute('data-travelling', 'true');
    await page.getByText('Sprout', { exact: true }).click();
    await expect(page.getByRole('radio', { name: /Sprout/ })).toBeChecked();
    await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
    buddy = page.getByRole('img', { name: 'Sprout study buddy' });
    await expect(buddy).toBeVisible();
    await page.reload();
    await expect(page.getByRole('radio', { name: /Sprout/ })).toBeChecked();
    await expect(buddy).toBeVisible();
    await page.getByText('Nimbus', { exact: true }).click();
    await page.getByLabel('Gentle movement', { exact: false }).uncheck();
    await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
    buddy = page.getByRole('img', { name: 'Nimbus study buddy' });
    await expect(buddy).toHaveAttribute('data-quiet', 'true');
    expect(await buddy.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(
      0,
    );
    await page.locator('#appearance').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'artifacts/study-buddy-settings.png' });
    await page.getByLabel('Gentle movement', { exact: false }).check();
    await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(buddy).toHaveAttribute('data-quiet', 'true');
    expect(await buddy.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    const box = (await buddy.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await page.getByText('Off', { exact: true }).click();
    await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
    await expect(page.locator('.study-buddy')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.study-buddy')).toHaveCount(0);
  } finally {
    await request.patch('/api/settings/preferences', {
      data: { studyBuddy: original.studyBuddy, buddyMotion: original.buddyMotion },
    });
  }
});

test('invalid study buddy choices are rejected', async ({ request }) => {
  const response = await request.patch('/api/settings/preferences', {
    data: { studyBuddy: 'UNKNOWN' },
  });
  expect(response.status()).toBe(400);
});
