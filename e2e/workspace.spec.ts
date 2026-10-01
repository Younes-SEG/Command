import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { Workspace } from '../src/lib/types';

async function workspace(request: APIRequestContext): Promise<Workspace> {
  const response = await request.get('/api/workspace');
  expect(response.ok()).toBeTruthy();
  return response.json();
}
async function saved(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
}
async function command(page: Page, name: string) {
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Search commands' }).fill(name);
  await page.keyboard.press('Enter');
}
async function localDay(page: Page) {
  return page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
}

test('course, grades, task, calendar and persistence work together', async ({ page, request }) => {
  const suffix = Date.now().toString(36).toUpperCase();
  const code = `E2E${suffix}`;
  const courseName = `Workflow verification ${suffix}`;
  const taskTitle = `Read requirements ${suffix}`;
  const eventTitle = `Study break ${suffix}`;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let courseId = '';
  let taskId = '';
  let eventId = '';
  let semesterId = '';
  try {
    const start = new Date();
    const end = new Date();
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);
    const semester = await request.post('/api/semesters', {
      data: {
        name: `Workflow semester ${suffix}`,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        isActive: false,
      },
    });
    expect(semester.ok()).toBeTruthy();
    semesterId = (await workspace(request)).semesters.find(
      (s) => s.name === `Workflow semester ${suffix}`,
    )!.id;
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: 'Your courses' })).toBeVisible();
    await page.getByRole('button', { name: 'Add course', exact: true }).click();
    await page.getByLabel('Course code', { exact: true }).fill(code);
    await page.getByLabel('Course name', { exact: true }).fill(courseName);
    await page.getByLabel('Semester', { exact: true }).selectOption(semesterId);
    await saved(page, 'Create course');
    courseId = (await workspace(request)).courses.find((c) => c.code === code)!.id;
    await page.getByLabel('Filter by semester').selectOption(semesterId);
    await page
      .getByRole('link')
      .filter({ has: page.getByRole('heading', { name: courseName }) })
      .click();
    await page.getByRole('tab', { name: /Assessments/ }).click();
    await page.getByRole('button', { name: 'Add assessment', exact: true }).click();
    await page.getByLabel('Assessment name').fill('First assignment');
    await page.getByLabel('Course weight (%)').fill('25');
    await page.getByLabel('Maximum score').fill('100');
    await page.getByLabel('Due date & time (optional)').fill(`${await localDay(page)}T23:55`);
    await saved(page, 'Create assessment');
    await page.goto('/');
    const activeSemester = (await workspace(request)).semesters.find(
      (semester) => semester.isActive,
    );
    const homeDeadline = page.getByRole('button').filter({ hasText: 'First assignment' }).first();
    if (activeSemester && activeSemester.id !== semesterId) await expect(homeDeadline).toBeHidden();
    else await expect(homeDeadline).toBeVisible();
    await page.goto('/calendar');
    await expect(
      page
        .getByRole('region', { name: 'Selected day agenda' })
        .getByRole('button')
        .filter({ hasText: 'First assignment' }),
    ).toBeVisible();
    await page.goto(`/courses/${courseId}`);
    await page.getByRole('tab', { name: 'Grades', exact: true }).click();
    await page
      .getByRole('button', { name: 'Enter grade for First assignment', exact: true })
      .click();
    await page.getByLabel('Score received', { exact: false }).fill('82');
    await saved(page, 'Save changes');
    await expect(page.getByText('82%', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('79.4%', { exact: true })).toBeVisible();
    await page.getByLabel('Target final grade (%)').fill('99');
    await expect(page.getByText('This target is not achievable', { exact: false })).toBeVisible();
    await page.getByLabel('Target final grade (%)').fill('20');
    await expect(page.getByText('Target secured', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add assessment', exact: true }).click();
    await page.getByLabel('Assessment name').fill('Excess weight');
    await page.getByLabel('Course weight (%)').fill('80');
    await page.getByRole('button', { name: 'Create assessment', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('cannot exceed 100%');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
    await page.getByRole('button', { name: 'Add class session', exact: true }).click();
    await page.getByLabel('Session name').fill(`Lecture ${suffix}`);
    await page
      .getByLabel('Repeats every')
      .selectOption(String(await page.evaluate(() => new Date().getDay())));
    await saved(page, 'Create class session');
    await page.goto('/calendar');
    await expect(
      page
        .getByRole('region', { name: 'Selected day agenda' })
        .getByRole('button')
        .filter({ hasText: `Lecture ${suffix}` }),
    ).toBeVisible();

    await command(page, 'Add task');
    await page.getByLabel('Task title').fill(taskTitle);
    await page.getByLabel('Course (optional)', { exact: true }).selectOption(courseId);
    await page.getByLabel('Due date & time (optional)').fill(`${await localDay(page)}T00:10`);
    await page.getByLabel('Priority', { exact: true }).selectOption('URGENT');
    await page.getByRole('button', { name: 'Add a subtask', exact: true }).click();
    await page.getByRole('textbox', { name: 'Subtask 1', exact: true }).fill('Read the rubric');
    await saved(page, 'Create task');
    taskId = (await workspace(request)).tasks.find((t) => t.title === taskTitle)!.id;
    await page.goto('/');
    await expect(page.getByRole('button', { name: taskTitle, exact: true })).toBeVisible();
    await page.getByRole('button', { name: `Complete ${taskTitle}`, exact: true }).click();
    await expect(page.getByRole('button', { name: taskTitle, exact: true })).toBeHidden();
    await page.reload();
    const completed = (await workspace(request)).tasks.find((t) => t.id === taskId)!;
    expect(completed.status).toBe('COMPLETED');
    expect(completed.completedAt).not.toBeNull();
    expect(completed.subtasks[0].title).toBe('Read the rubric');
    await page.goto('/tasks');
    await page.getByRole('button', { name: /^Completed/ }).click();
    await page.getByRole('textbox', { name: 'Search tasks' }).fill(taskTitle);
    await page.getByRole('checkbox', { name: `Reopen ${taskTitle}` }).click();
    await expect(page.getByRole('checkbox', { name: `Reopen ${taskTitle}` })).toBeHidden();

    await page.goto('/calendar');
    await page.getByRole('button', { name: 'Add event', exact: true }).click();
    await page.getByLabel('Event title').fill(eventTitle);
    await page.getByLabel('All-day event').check();
    await page.getByLabel('Start date', { exact: true }).fill(await localDay(page));
    await page.getByLabel('Last day', { exact: true }).fill(await localDay(page));
    await saved(page, 'Create event');
    eventId = (await workspace(request)).events.find((e) => e.title === eventTitle)!.id;
    await expect(page.getByRole('button').filter({ hasText: eventTitle }).first()).toBeVisible();
    await page.getByRole('button', { name: 'week', exact: true }).click();
    await page.getByRole('button').filter({ hasText: eventTitle }).first().click();
    await expect(page.getByLabel('All-day event')).toBeChecked();
    await expect(page.getByLabel('Last day', { exact: true })).toHaveValue(await localDay(page));
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Delete event?' })).toBeVisible();
    await page.getByRole('button', { name: 'Keep event', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await workspace(request)).events.some((e) => e.id === eventId)).toBeTruthy();
    expect(errors).toEqual([]);
  } finally {
    const remaining = await workspace(request);
    taskId ||= remaining.tasks.find((t) => t.title === taskTitle)?.id ?? '';
    eventId ||= remaining.events.find((e) => e.title === eventTitle)?.id ?? '';
    courseId ||= remaining.courses.find((c) => c.code === code)?.id ?? '';
    if (taskId) await request.delete(`/api/tasks/${taskId}`);
    if (eventId) await request.delete(`/api/events/${eventId}`);
    if (courseId) await request.delete(`/api/courses/${courseId}`);
    if (semesterId) await request.delete(`/api/semesters/${semesterId}`);
  }
});

test('desktop light/dark and mobile navigation render without overflow', async ({
  page,
  request,
}) => {
  const original = (await workspace(request)).settings.theme;
  try {
    await request.patch('/api/settings/preferences', { data: { theme: 'LIGHT' } });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible();
    await page.screenshot({ path: 'artifacts/dashboard-light.png', fullPage: true });
    await page.getByRole('button', { name: 'Toggle color theme' }).click();
    await expect(page.locator('html')).toHaveClass('dark');
    await page.screenshot({ path: 'artifacts/dashboard-dark.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/dashboard-mobile.png', fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Calendar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your calendar' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: 'artifacts/calendar-mobile.png', fullPage: true });
  } finally {
    await request.patch('/api/settings/preferences', { data: { theme: original } });
  }
});
