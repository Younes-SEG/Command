import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { Client } from 'pg';
import { beforeAll, afterAll, expect, it, vi } from 'vitest';

// The identity substitute exists only in this test. Production always uses Neon Auth.
const identity = vi.hoisted(() => ({ current: 'local' }));
vi.mock('../src/lib/server/auth', () => ({ requireWorkspaceId: async () => identity.current }));
import { db } from '../src/lib/server/db';
import { saveEntity, deleteEntity } from '../src/lib/server/mutations';
import { getWorkspace } from '../src/lib/server/workspace';
import { eraseWorkspace, exportWorkspace } from '../src/lib/server/privacy';
import { importSyllabus } from '../src/lib/server/syllabus-import';
import { applyCalendarFeed, syncSubscription } from '../src/lib/server/calendar-subscriptions';
import { POST as calendarChange } from '../src/app/api/calendar-subscriptions/route';

const original = process.env.DATABASE_URL;
const name = `command_tenancy_test_${randomBytes(8).toString('hex')}`;
let admin: Client;
let disposable: Client;
let created = false;
beforeAll(async () => {
  if (!original || !/^command_tenancy_test_[a-f0-9]{16}$/.test(name))
    throw new Error('Invalid disposable database configuration');
  // Avoid inadvertently provisioning test databases in the deployed service.
  const url = new URL(original);
  if (!['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('Run tenancy checks against local PostgreSQL');
  admin = new Client({ connectionString: original });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  url.pathname = `/${name}`;
  process.env.DATABASE_URL = url.toString();
  disposable = new Client({ connectionString: process.env.DATABASE_URL });
  await disposable.connect();
  for (const entry of readdirSync('prisma/migrations', { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    await disposable.query(readFileSync(`prisma/migrations/${entry.name}/migration.sql`, 'utf8'));
  }
  const check = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  expect(check[0].name).toBe(name);
});
afterAll(async () => {
  await db.$disconnect();
  await disposable?.end();
  process.env.DATABASE_URL = original;
  if (created && /^command_tenancy_test_[a-f0-9]{16}$/.test(name))
    await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin?.end();
});

it('isolates complete workspaces, cross-references, imports, sync and erasure', async () => {
  async function populate(owner: string) {
    identity.current = owner;
    const semester = await saveEntity('semesters', {
      name: owner,
      startDate: '2090-01-01',
      endDate: '2090-05-01',
      isActive: true,
    });
    const course = await saveEntity('courses', {
      name: owner,
      code: 'TEST101',
      semesterId: semester.id,
    });
    const assessment = await saveEntity('assessments', {
      name: `${owner} grade`,
      courseId: course.id,
      status: 'GRADED',
      score: 87,
      weight: 20,
    });
    const task = await saveEntity('tasks', {
      title: `${owner} task`,
      subtasks: [{ title: `${owner} child` }],
      workspaceId: 'forged',
    });
    const event = await saveEntity('events', {
      title: `${owner} event`,
      startAt: '2090-02-01T12:00:00Z',
      endAt: '2090-02-01T13:00:00Z',
    });
    const schedule = await saveEntity('schedules', {
      courseId: course.id,
      title: owner,
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:00',
    });
    await saveEntity('settings', { displayName: owner }, 'preferences');
    const feed = await db.calendarSubscription.create({
      data: {
        workspaceId: owner,
        name: owner,
        url: 'https://calendar.example/PRIVATE-TEST-FEED',
        enabled: true,
        fromDate: new Date('2090-01-01'),
        throughDate: new Date('2090-05-01'),
        timeZone: 'UTC',
      },
    });
    return { semester, course, assessment, task, event, schedule, feed };
  }
  await populate('local');
  const alice = await populate('user:alice');
  const bob = await populate('user:bob');
  const bobBefore = JSON.stringify(await getWorkspace());
  identity.current = 'local';
  const localBefore = JSON.stringify(await getWorkspace());
  identity.current = 'user:alice';
  const exported = await exportWorkspace();
  expect(exported.workspace.semesters).toHaveLength(1);
  expect(exported.workspace.semesters[0].isActive).toBe(true);
  expect(exported.workspace.tasks[0].subtasks).toHaveLength(1);
  expect(exported.workspace.settings.displayName).toBe('user:alice');
  expect(JSON.stringify(exported)).not.toContain('user:bob');
  expect(JSON.stringify(exported)).not.toContain('PRIVATE-TEST-FEED');
  expect(exported.calendarConnections).toHaveLength(1);
  for (const [entity, entry] of [
    ['semesters', bob.semester],
    ['courses', bob.course],
    ['assessments', bob.assessment],
    ['tasks', bob.task],
    ['events', bob.event],
    ['schedules', bob.schedule],
  ] as const) {
    await expect(saveEntity(entity, {}, entry.id)).rejects.toMatchObject({ status: 404 });
    await expect(deleteEntity(entity, entry.id)).rejects.toBeDefined();
  }
  await expect(
    saveEntity('courses', { semesterId: bob.semester.id }, alice.course.id),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveEntity('assessments', { courseId: bob.course.id }, alice.assessment.id),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveEntity('tasks', { courseId: bob.course.id }, alice.task.id),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveEntity('tasks', { assessmentId: bob.assessment.id }, alice.task.id),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveEntity('events', { courseId: bob.course.id }, alice.event.id),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveEntity('schedules', { courseId: bob.course.id }, alice.schedule.id),
  ).rejects.toMatchObject({ status: 404 });
  const item = {
    existingId: null,
    name: 'Imported exam',
    type: 'MIDTERM',
    dueDate: null,
    weight: 10,
    source: '',
  };
  await expect(
    importSyllabus({ courseId: bob.course.id, reviewed: true, items: [item] }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    importSyllabus({
      courseId: alice.course.id,
      reviewed: true,
      items: [{ ...item, existingId: bob.assessment.id }],
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(
    await importSyllabus({ courseId: alice.course.id, reviewed: true, items: [item] }),
  ).toMatchObject({ created: 1 });
  await expect(syncSubscription(bob.feed.id)).rejects.toMatchObject({ status: 404 });
  for (const action of ['disconnect', 'forget']) {
    const response = await calendarChange(
      new Request('http://localhost/api/calendar-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
        body: JSON.stringify({ action, id: bob.feed.id }),
      }),
    );
    expect(response.ok).toBe(false);
  }
  const options = { fromDate: '2090-01-01', throughDate: '2090-05-01', timeZone: 'UTC' };
  await db.$transaction((tx) =>
    applyCalendarFeed(
      tx,
      bob.feed.id,
      { name: 'Hacked', total: 0, items: [] },
      options,
      'user:alice',
    ),
  );
  expect(
    (await db.calendarSubscription.findUniqueOrThrow({ where: { id: bob.feed.id } })).name,
  ).toBe('user:bob');
  await eraseWorkspace();
  expect((await getWorkspace()).courses).toHaveLength(0);
  expect((await getWorkspace()).tasks).toHaveLength(0);
  expect(await db.calendarSubscription.count({ where: { workspaceId: 'user:alice' } })).toBe(0);
  identity.current = 'user:bob';
  expect(JSON.stringify(await getWorkspace())).toBe(bobBefore);
  identity.current = 'local';
  expect(JSON.stringify(await getWorkspace())).toBe(localBefore);
  expect(await db.task.count({ where: { workspaceId: 'forged' } })).toBe(0);
});
