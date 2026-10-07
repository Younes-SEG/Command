import { test, expect } from '@playwright/test';

test('calendar saves directly beside its link without saving preferences', async ({ page }) => {
  const actions: string[] = [];
  await page.route('**/api/calendar-subscriptions', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      actions.push(body.action);
      expect(body.consentVersion).toBeTruthy();
    }
    return route.fulfill({ json: [] });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings');
  await page.getByLabel('Calendar subscription link').fill('https://calendar.example/test');
  const save = page.getByRole('button', { name: 'Save calendar', exact: true });
  await expect(save).toBeInViewport();
  await save.click();
  await expect(page.getByRole('status').filter({ hasText: 'Calendar connected' })).toBeVisible();
  expect(actions).toEqual(['connect']);
});

test('calendar connection preview, import feedback and disconnect work on a narrow screen', async ({
  page,
}) => {
  let connected = false;
  const connection = {
    id: 'mock-calendar',
    enabled: true,
    name: 'University calendar',
    fromDate: '2026-09-01',
    throughDate: '2026-12-31',
    lastSyncedAt: new Date().toISOString(),
    lastError: null,
    itemCount: 1,
  };
  await page.route('**/api/calendar-subscriptions', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({ json: connected ? [connection] : [] });
    const body = request.postDataJSON();
    if (body.action === 'preview')
      return route.fulfill({
        json: {
          name: connection.name,
          total: 176,
          items: [
            {
              key: 'lab',
              title: 'Lab 1 – À échéance',
              description: '',
              location: 'SEG3102',
              startAt: '2026-10-08T03:59:00Z',
              endAt: '2026-10-08T03:59:00Z',
              allDay: false,
              cancelled: false,
              course: { code: 'SEG3102', name: 'Software Design' },
              deadline: true,
              type: 'LAB',
            },
          ],
        },
      });
    if (body.action === 'disconnect') connected = false;
    if (body.action === 'connect') connected = true;
    return route.fulfill({ json: connected ? [connection] : [] });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings');
  await page
    .getByLabel('Calendar subscription link')
    .fill('https://calendar.example/private-token');
  await page.getByRole('button', { name: 'Preview calendar' }).click();
  await expect(page.getByLabel('Calendar import preview')).toContainText('Lab 1');
  await expect(page.getByText('1 courses · 1 deadlines · 0 other events')).toBeVisible();
  await page.getByRole('button', { name: 'Connect and import' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Calendar connected' })).toBeVisible();
  await expect(page.getByLabel('Calendar subscription link')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Sync now' })).toBeVisible();
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText('Calendar is up to date.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(page.getByText('Disconnected. Your imported entries are still here.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('real subscription endpoint rejects unsafe links and cross-origin writes', async ({
  request,
}) => {
  const payload = {
    action: 'preview',
    url: 'https://127.0.0.1/private',
    fromDate: '2026-09-01',
    throughDate: '2026-12-31',
    timeZone: 'America/Toronto',
  };
  const denied = await request.post('/api/calendar-subscriptions', { data: payload });
  expect(denied.status()).toBe(400);
  expect(await denied.text()).not.toContain('/private');
  const crossOrigin = await request.post('/api/calendar-subscriptions', {
    data: payload,
    headers: { Origin: 'https://attacker.example' },
  });
  expect(crossOrigin.status()).toBe(403);
});
