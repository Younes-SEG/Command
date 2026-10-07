import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Workspace } from '../src/lib/types';

test('completion, awaiting grades and direct grade entry persist without changing other assessment details', async ({
  page,
  request,
}) => {
  const suffix = Date.now().toString(36).toUpperCase();
  const name = `Grade entry check ${suffix}`;
  let semesterId = '';
  let courseId = '';
  const workspace = async (): Promise<Workspace> => (await request.get('/api/workspace')).json();
  try {
    expect(
      (
        await request.post('/api/semesters', {
          data: { name, startDate: '2090-01-01', endDate: '2090-05-01', isActive: false },
        })
      ).ok(),
    ).toBeTruthy();
    semesterId = (await workspace()).semesters.find((s) => s.name === name)!.id;
    expect(
      (
        await request.post('/api/courses', { data: { code: `GRADE${suffix}`, name, semesterId } })
      ).ok(),
    ).toBeTruthy();
    courseId = (await workspace()).courses.find((c) => c.name === name)!.id;
    expect(
      (
        await request.post('/api/assessments', {
          data: { name, courseId, weight: 20, maxScore: 20, notes: 'Preserve these notes' },
        })
      ).ok(),
    ).toBeTruthy();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/grades');
    await page.getByLabel('Course', { exact: true }).selectOption(courseId);
    const row = page.getByRole('form', { name: `Grade for ${name}`, exact: true });
    await row.getByRole('button', { name: 'Edit details' }).click();
    await page.getByRole('checkbox', { name: 'Completed', exact: true }).check();
    await expect(page.getByLabel('Status', { exact: true })).toHaveValue('SUBMITTED');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: /^Awaiting grades/ }).click();
    await expect(row).toContainText('Awaiting grade');
    await page.reload();
    await page.getByLabel('Course', { exact: true }).selectOption(courseId);
    await page.getByRole('button', { name: /^Awaiting grades/ }).click();
    await expect(row).toBeVisible();
    for (const dark of [false, true]) {
      await page.evaluate(
        (value) => document.documentElement.classList.toggle('dark', value),
        dark,
      );
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
      ).toEqual([]);
    }
    await row.getByLabel('Score received').fill('18');
    await row.getByRole('button', { name: 'Save grade', exact: true }).click();
    await expect(row).toHaveCount(0);
    await page.getByRole('button', { name: /^Recorded/ }).click();
    await expect(row).toContainText('Recorded: 90.0%');
    await row.getByRole('button', { name: 'Edit details' }).click();
    await expect(page.getByRole('checkbox', { name: 'Completed', exact: true })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Completed', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.reload();
    const saved = (await workspace()).assessments.find((a) => a.name === name)!;
    expect(saved).toMatchObject({
      score: 18,
      maxScore: 20,
      status: 'GRADED',
      weight: 20,
      notes: 'Preserve these notes',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    if (courseId) await request.delete(`/api/courses/${courseId}`);
    if (semesterId) await request.delete(`/api/semesters/${semesterId}`);
  }
});

test('user guide is discoverable and links to grade entry and calendar setup', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('link', { name: 'User guide', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'User guide', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Guide topics' })
    .getByRole('link', { name: 'Enter and track grades' })
    .click();
  await expect(page).toHaveURL(/\/guide#grades$/);
  for (const dark of [false, true]) {
    await page.evaluate((value) => document.documentElement.classList.toggle('dark', value), dark);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
    ).toEqual([]);
  }
  await page.getByRole('link', { name: 'Connect calendar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save calendar', exact: true })).toBeVisible();
});
