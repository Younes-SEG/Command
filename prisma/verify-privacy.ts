import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { Client } from 'pg';

// Never test erasure against the active workspace. Provision an isolated database.
const original = process.env.DATABASE_URL;
assert(original, 'DATABASE_URL is required');
const name = `command_privacy_test_${randomBytes(8).toString('hex')}`;
assert(/^command_privacy_test_[a-f0-9]{16}$/.test(name));
const admin = new Client({ connectionString: original });
await admin.connect();
let disposable: Client | undefined;
let prisma: { $disconnect: () => Promise<void> } | undefined;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  const testUrl = new URL(original);
  testUrl.pathname = `/${name}`;
  process.env.DATABASE_URL = testUrl.toString();
  assert.notEqual(process.env.DATABASE_URL, original);
  disposable = new Client({ connectionString: process.env.DATABASE_URL });
  await disposable.connect();
  for (const entry of readdirSync('prisma/migrations', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    await disposable.query(readFileSync(`prisma/migrations/${entry.name}/migration.sql`, 'utf8'));
  }
  const { db } = await import('../src/lib/server/db');
  prisma = db;
  const identity = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assert.equal(identity[0].name, name, 'Refusing to test erasure outside the disposable database');
  const { exportWorkspace, eraseWorkspace } = await import('../src/lib/server/privacy');
  const { applyCalendarFeed } = await import('../src/lib/server/calendar-subscriptions');
  await db.settings.upsert({
    where: { id: 'preferences' },
    create: { displayName: 'Disposable test' },
    update: { displayName: 'Disposable test' },
  });
  const semester = await db.semester.create({
    data: { name: 'Test', startDate: new Date('2090-01-01'), endDate: new Date('2090-05-01') },
  });
  const course = await db.course.create({
    data: { code: 'TEST1000', name: 'Test', semesterId: semester.id, notes: 'Private test notes' },
  });
  const assessment = await db.assessment.create({
    data: { name: 'Test grade', courseId: course.id, score: 80, status: 'GRADED' },
  });
  await db.task.create({
    data: {
      title: 'Test task',
      courseId: course.id,
      assessmentId: assessment.id,
      subtasks: { create: { title: 'Subtask' } },
    },
  });
  const event = await db.calendarEvent.create({
    data: { title: 'Event', startAt: new Date(), endAt: new Date(), courseId: course.id },
  });
  await db.scheduleEntry.create({
    data: {
      courseId: course.id,
      title: 'Class',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:00',
    },
  });
  const link = await db.calendarSubscription.create({
    data: {
      name: 'Paused test',
      url: 'https://calendar.example/SECRET-CREDENTIAL',
      enabled: false,
      fromDate: new Date('2090-01-01'),
      throughDate: new Date('2090-05-01'),
      timeZone: 'UTC',
      items: {
        create: [
          { sourceKey: 'secret-provider-id', eventId: event.id },
          { sourceKey: 'grade-id', assessmentId: assessment.id },
        ],
      },
    },
  });
  const exported = await exportWorkspace();
  assert.equal(exported.workspace.courses[0].notes, 'Private test notes');
  assert.equal(exported.workspace.assessments[0].score, 80);
  assert.equal(exported.calendarConnections[0].enabled, false);
  assert(!JSON.stringify(exported).includes('SECRET-CREDENTIAL'));
  assert(!JSON.stringify(exported).includes('secret-provider-id'));
  await eraseWorkspace();
  for (const model of [
    db.semester,
    db.course,
    db.assessment,
    db.task,
    db.subtask,
    db.calendarEvent,
    db.scheduleEntry,
    db.calendarSubscription,
    db.importedCalendarItem,
  ]) {
    assert.equal(await (model.count as () => Promise<number>)(), 0);
  }
  assert.equal(
    (await db.settings.findUniqueOrThrow({ where: { id: 'preferences' } })).displayName,
    '',
  );
  await db.$transaction((tx) =>
    applyCalendarFeed(
      tx,
      link.id,
      { name: 'Stale sync', total: 0, items: [] },
      { fromDate: '2090-01-01', throughDate: '2090-05-01', timeZone: 'UTC' },
    ),
  );
  assert.equal(await db.calendarSubscription.count(), 0);
  console.log(
    'Privacy database checks passed: export, secret exclusion, all-record erasure, default preferences, and stale-sync suppression. Active workspace untouched.',
  );
} finally {
  await prisma?.$disconnect();
  await disposable?.end();
  process.env.DATABASE_URL = original;
  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end();
}
