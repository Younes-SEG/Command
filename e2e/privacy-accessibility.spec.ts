import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('task priorities and the task editor remain readable in both themes', async ({
  page,
  request,
}) => {
  const title = `Accessibility test ${Date.now()}`;
  let id = '';
  try {
    const response = await request.post('/api/tasks', {
      data: {
        title,
        priority: 'MEDIUM',
        dueDate: new Date().toISOString(),
        status: 'NOT_STARTED',
        subtasks: [],
      },
    });
    expect(response.ok()).toBeTruthy();
    const workspace = await (await request.get('/api/workspace')).json();
    id = workspace.tasks.find((task: { title: string }) => task.title === title).id;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/tasks');
    for (const dark of [false, true]) {
      await page.evaluate(
        (value) => document.documentElement.classList.toggle('dark', value),
        dark,
      );
      await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
      let audit = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
      ).toEqual([]);
      await page.getByRole('button', { name: title, exact: true }).click();
      audit = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
      ).toEqual([]);
      await page.keyboard.press('Escape');
    }
  } finally {
    if (id) await request.delete(`/api/tasks/${id}`);
  }
});

test('workspace is local, policy responses contain no workspace, and erase requires confirmation', async ({
  request,
}) => {
  const snapshot = await request.get('/api/workspace');
  expect(snapshot.status()).toBe(200);
  const workspace = await snapshot.json();
  const blocked = await request.get('/api/workspace', { headers: { Host: 'public.example' } });
  expect(blocked.status()).toBe(403);
  const crossSite = await request.get('/api/privacy/export', {
    headers: { 'Sec-Fetch-Site': 'cross-site' },
  });
  expect(crossSite.status()).toBe(403);
  const legal = await request.get('/legal/privacy', { headers: { Host: 'public.example' } });
  expect(legal.status()).toBe(200);
  const html = await legal.text();
  for (const course of workspace.courses) expect(html).not.toContain(course.id);
  expect(html).not.toContain('initialData');
  const exported = await request.get('/api/privacy/export');
  expect(exported.headers()['content-disposition']).toContain('attachment');
  expect(exported.headers()['cache-control']).toContain('no-store');
  const copy = await exported.json();
  expect(copy.workspace.courses).toEqual(workspace.courses);
  for (const connection of copy.calendarConnections) expect(connection).not.toHaveProperty('url');
  const invalidErase = await request.post('/api/privacy/erase', { data: { confirmation: 'no' } });
  expect(invalidErase.status()).toBe(400);
  const forbiddenErase = await request.post('/api/privacy/erase', {
    data: { confirmation: 'DELETE MY DATA' },
    headers: { Origin: 'https://attacker.example' },
  });
  expect(forbiddenErase.status()).toBe(403);
  const noConsent = await request.post('/api/calendar-subscriptions', {
    data: {
      action: 'connect',
      url: 'https://calendar.example/test',
      fromDate: '2026-09-01',
      throughDate: '2026-12-31',
      timeZone: 'UTC',
    },
  });
  expect(noConsent.status()).toBe(400);
  expect((await (await request.get('/api/workspace')).json()).courses).toEqual(workspace.courses);
});

test('course tabs and labelled editor fields pass accessibility checks', async ({
  page,
  request,
}) => {
  const workspace = await (await request.get('/api/workspace')).json();
  test.skip(!workspace.courses.length, 'Requires at least one course');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/courses/${workspace.courses[0].id}`);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle('dark', dark),
      theme === 'dark',
    );
    for (const tab of ['Overview', 'Assessments', 'Grades', 'Schedule', 'Notes']) {
      await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
        `${theme} ${tab}`,
      ).toEqual([]);
    }
  }
});

for (const theme of ['light', 'dark']) {
  test(`core pages meet automated accessibility checks in ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme as 'light' | 'dark' });
    for (const path of [
      '/',
      '/courses',
      '/tasks',
      '/calendar',
      '/settings',
      '/legal/privacy',
      '/legal/terms',
      '/legal/cookies',
      '/legal/accessibility',
      '/legal/credits',
      '/legal/about',
    ]) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      // Exercise both palettes without changing persisted user preferences.
      await page.evaluate(
        (dark) => document.documentElement.classList.toggle('dark', dark),
        theme === 'dark',
      );
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
        path,
      ).toEqual([]);
    }
  });
}

test('keyboard skip link, erase cancellation and dialog focus work', async ({ page }) => {
  await page.goto('/settings');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const trigger = page.getByRole('button', { name: 'Erase workspace data' });
  await trigger.click();
  await expect(page.getByRole('button', { name: 'Permanently erase data' })).toBeDisabled();
  await page.getByLabel('Type DELETE MY DATA to confirm').fill('DELETE MY DATA');
  await expect(page.getByRole('button', { name: 'Permanently erase data' })).toBeEnabled();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
