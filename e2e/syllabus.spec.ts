import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { syllabusPdf } from '../tests/fixtures/syllabus-pdf';
import { syllabusModelResult } from '../tests/fixtures/syllabus-result';
import { validateSyllabusResult } from '../src/lib/syllabus-result';
import type { Workspace } from '../src/lib/types';

test('upload automatically opens AI review; saving preserves existing grades and notes (mocked provider)', async ({
  page,
  request,
}) => {
  const suffix = Date.now().toString(36).toUpperCase();
  const name = `Syllabus check ${suffix}`;
  let semesterId = '',
    courseId = '';
  const workspace = async (): Promise<Workspace> => (await request.get('/api/workspace')).json();
  try {
    expect(
      (
        await request.post('/api/semesters', {
          data: { name, startDate: '2090-09-01', endDate: '2090-12-31', isActive: false },
        })
      ).ok(),
    ).toBeTruthy();
    semesterId = (await workspace()).semesters.find((s) => s.name === name)!.id;
    expect(
      (
        await request.post('/api/courses', { data: { code: `SYL${suffix}`, name, semesterId } })
      ).ok(),
    ).toBeTruthy();
    courseId = (await workspace()).courses.find((c) => c.name === name)!.id;
    expect(
      (
        await request.post('/api/assessments', {
          data: {
            courseId,
            name: 'Midterm 1',
            weight: 0,
            score: 17,
            maxScore: 20,
            status: 'GRADED',
            notes: 'Keep my notes',
          },
        })
      ).ok(),
    ).toBeTruthy();
    const midterm = (await workspace()).assessments.find((a) => a.courseId === courseId)!;
    let reads = 0;
    await page.route('**/api/syllabus/preview', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { configured: true } });
        return;
      }
      reads++;
      expect(route.request().headers()['x-command-course']).toBe(courseId);
      expect(route.request().headers()['content-type']).toBe('application/pdf');
      expect(route.request().postDataBuffer()!.subarray(0, 5).toString()).toBe('%PDF-');
      await route.fulfill({
        json: validateSyllabusResult(syllabusModelResult, {
          startDate: '2090-09-01',
          endDate: '2090-12-31',
          pages: 1,
        }),
      });
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/courses/${courseId}`);
    await page.getByRole('link', { name: 'Import syllabus', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Course', exact: true })).toHaveValue(courseId);
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Choose a file', exact: true }).press('Enter'),
    ]);
    await fileChooser.setFiles({
      name: 'course-outline.pdf',
      mimeType: 'application/pdf',
      buffer: syllabusPdf([
        'Course syllabus',
        'Midterm 1 - October 20, 2090 at 14:00 - 25%',
        'Assignment 1 - November 2, 2090 at 23:59 - 10%',
        'Five quizzes worth 20% total',
        'Final exam - TBD - 35%',
      ]),
    });
    await expect(page.locator('#syllabus-file-status')).toHaveText('course-outline.pdf');
    const group = page.getByRole('group', { name: 'Assessment 1', exact: true });
    await expect(group.getByText('View source excerpt · page 1', { exact: true })).toBeVisible();
    expect(reads).toBe(1);
    await expect(group.getByLabel('Save as')).toHaveValue(midterm.id);
    await expect(group.getByLabel('Grade weight (%)')).toHaveValue('25');
    await expect(group.getByLabel('Due date')).toHaveValue('2090-10-20');
    await expect(
      page
        .getByRole('group', { name: 'Assessment 3', exact: true })
        .getByLabel('Include this assessment'),
    ).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Save reviewed assessments' })).toBeDisabled();
    expect((await workspace()).assessments.filter((a) => a.courseId === courseId)).toHaveLength(1);
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
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await group.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'artifacts/syllabus-review-mobile.png' });
    await page.getByRole('checkbox', { name: /^I checked the selected/ }).check();
    await page.getByRole('button', { name: 'Save reviewed assessments' }).click();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Saved: 2 new assessments and 1 updated assessments.' }),
    ).toBeVisible();
    const saved = (await workspace()).assessments.filter((a) => a.courseId === courseId);
    expect(saved).toHaveLength(3);
    expect(saved.find((a) => a.id === midterm.id)).toMatchObject({
      weight: 25,
      score: 17,
      maxScore: 20,
      status: 'GRADED',
      notes: 'Keep my notes',
      dueDate: '2090-10-20T18:00:00.000Z',
    });
    expect(saved.find((a) => a.name === 'Assignment 1')).toMatchObject({
      weight: 10,
      status: 'NOT_STARTED',
      score: null,
    });
    expect(saved.find((a) => a.name === 'Final exam')).toMatchObject({ weight: 35, dueDate: null });
    const item = {
      existingId: null,
      name: 'Assignment 1',
      type: 'ASSIGNMENT',
      dueDate: null,
      weight: 10,
      source: '',
    };
    const duplicate = await request.post('/api/syllabus/import', {
      data: { courseId, reviewed: true, items: [item] },
    });
    expect(duplicate.status()).toBe(409);
    const over = await request.post('/api/syllabus/import', {
      data: { courseId, reviewed: true, items: [{ ...item, name: 'New project', weight: 40 }] },
    });
    expect(over.status()).toBe(400);
    expect((await workspace()).assessments.filter((a) => a.courseId === courseId)).toHaveLength(3);
    const blank = await request.post('/api/syllabus/import', {
      data: {
        courseId,
        reviewed: true,
        items: [{ ...item, existingId: midterm.id, name: 'Ignored name', weight: null }],
      },
    });
    expect(blank.ok()).toBeTruthy();
    expect((await workspace()).assessments.find((a) => a.id === midterm.id)).toMatchObject({
      name: 'Midterm 1',
      weight: 25,
      score: 17,
      dueDate: '2090-10-20T18:00:00.000Z',
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Import syllabus', exact: true })).toBeVisible();
    expect(reads).toBe(1);
  } finally {
    if (courseId) await request.delete(`/api/courses/${courseId}`);
    if (semesterId) await request.delete(`/api/semesters/${semesterId}`);
  }
});

test('syllabus reader handles unsupported files and rejects cross-origin uploads', async ({
  request,
}) => {
  const invalid = await request.post('/api/syllabus/preview', {
    headers: { 'Content-Type': 'application/pdf' },
    data: Buffer.from('Not a PDF'),
  });
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error).toContain('not a PDF');
  const crossOrigin = await request.post('/api/syllabus/preview', {
    headers: { 'Content-Type': 'text/plain', Origin: 'https://untrusted.example' },
    data: 'Quiz 1 20%',
  });
  expect(crossOrigin.status()).toBe(403);
});

test('offline reader offers retry without asking users for AI setup', async ({ page }) => {
  let reads = 0;
  await page.route('**/api/syllabus/preview', async (route) => {
    if (route.request().method() === 'POST') reads++;
    await route.fulfill({ json: { configured: false } });
  });
  await page.goto('/syllabus');
  await expect(
    page.getByText('Syllabus reading is currently unavailable', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose a file', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Read with AI/i })).toHaveCount(0);
  await expect(page.getByText(/Connect an OpenAI API key/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(
    page.getByText('Syllabus reading is currently unavailable', { exact: true }),
  ).toBeVisible();
  await page.goto('/guide#syllabus-setup');
  await expect(
    page.getByRole('heading', { name: 'Syllabus reading: no setup needed' }),
  ).toBeVisible();
  await expect(page.getByText(/OPENAI_API_KEY|your_key_here/)).toHaveCount(0);
  expect(reads).toBe(0);
});

test('pasted text uses the AI reader and a failed read shows no fallback assessments', async ({
  page,
}) => {
  let reads = 0;
  await page.route('**/api/syllabus/preview', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { configured: true } });
      return;
    }
    reads++;
    expect(route.request().headers()['content-type']).toBe('text/plain');
    expect(route.request().postData()).toBe('Midterm 1 - October 20 - 25%');
    await route.fulfill({
      status: 502,
      json: {
        error:
          'The AI provider is temporarily unavailable. Nothing was saved. Please try again later.',
      },
    });
  });
  await page.goto('/syllabus');
  const course = page.getByRole('combobox', { name: 'Course', exact: true });
  // The workspace fixture is not modified by this read-only failure check.
  const option = await course.locator('option').nth(1).getAttribute('value');
  test.skip(!option, 'No existing course available for a read-only preview check.');
  await course.selectOption(option!);
  await page.getByText('Or paste syllabus text', { exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Syllabus text', exact: true })
    .fill('Midterm 1 - October 20 - 25%');
  await page.getByRole('button', { name: 'Find assessments from text' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'The AI provider is temporarily unavailable' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save reviewed assessments' })).toHaveCount(0);
  expect(reads).toBe(1);
});
