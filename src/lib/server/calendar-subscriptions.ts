import { z } from 'zod';
import { calendarNoticeVersion } from '@/lib/legal';
import type { Prisma, CalendarSubscription } from '@/generated/prisma/client';
import { parseCalendarFeed, type FeedOptions, type FeedPreview } from '@/lib/calendar-feed';
import { db } from './db';
import { ApiError } from './errors';
import { fetchCalendarFeed, normalizeFeedUrl } from './feed-fetch';
import { requireWorkspaceId } from './auth';
import { isHosted } from './hosting';

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Choose valid import dates.');
export const subscriptionInput = z
  .object({
    url: z.string().min(1).max(8000).transform(normalizeFeedUrl),
    fromDate: date,
    throughDate: date,
    timeZone: z
      .string()
      .max(100)
      .refine((zone) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: zone });
          return true;
        } catch {
          return false;
        }
      }, 'Choose a valid time zone.'),
  })
  .refine((input) => {
    const days = (Date.parse(input.throughDate) - Date.parse(input.fromDate)) / 86400000;
    return days >= 0 && days <= 730;
  }, 'Choose a date range of at most two years.');

export async function previewSubscription(
  input: { url: string } & FeedOptions,
  retainedKeys?: ReadonlySet<string>,
) {
  const text = await fetchCalendarFeed(input.url);
  try {
    return parseCalendarFeed(text, input, retainedKeys);
  } catch {
    throw new ApiError(
      400,
      'This feed could not be read. Use the calendar subscription link, select fewer courses or a shorter date range, and try again.',
    );
  }
}

/** Explicit projection: the private URL must never enter a workspace response. */
export async function listSubscriptions() {
  const workspaceId = await requireWorkspaceId();
  const rows = await db.calendarSubscription.findMany({
    where: { workspaceId },
    select: {
      id: true,
      enabled: true,
      consentedAt: true,
      consentVersion: true,
      name: true,
      fromDate: true,
      throughDate: true,
      timeZone: true,
      lastSyncedAt: true,
      lastError: true,
      itemCount: true,
    },
    orderBy: { name: 'asc' },
  });
  return rows.map((row) => ({
    ...row,
    consentedAt: row.consentedAt?.toISOString() ?? null,
    fromDate: row.fromDate.toISOString().slice(0, 10),
    throughDate: row.throughDate.toISOString().slice(0, 10),
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
  }));
}

async function semesterForImport(
  tx: Prisma.TransactionClient,
  options: FeedOptions,
  workspaceId: string,
) {
  const from = new Date(options.fromDate);
  const through = new Date(options.throughDate);
  const existing = await tx.semester.findFirst({
    where: { workspaceId, startDate: { lte: through }, endDate: { gte: from } },
    orderBy: { isActive: 'desc' },
  });
  if (existing) return existing;
  const month = from.getUTCMonth();
  const name = `${month < 4 ? 'Winter' : month < 8 ? 'Summer' : 'Fall'} ${from.getUTCFullYear()}`;
  const active = await tx.semester.findFirst({ where: { workspaceId, isActive: true } });
  return tx.semester.create({
    data: { workspaceId, name, startDate: from, endDate: through, isActive: !active },
  });
}

/** Only source-owned fields are updated; grades, progress, weights and notes stay local. */
export async function applyCalendarFeed(
  tx: Prisma.TransactionClient,
  subscriptionId: string,
  preview: FeedPreview,
  options: FeedOptions,
  workspaceId = 'local',
) {
  if (
    !(
      await tx.calendarSubscription.findUnique({
        where: { id: subscriptionId, workspaceId },
        select: { enabled: true },
      })
    )?.enabled
  )
    return;
  const semester = preview.items.some((item) => item.course && !item.cancelled)
    ? await semesterForImport(tx, options, workspaceId)
    : null;
  const courses = new Map<string, string>();
  const existing = new Map(
    (await tx.importedCalendarItem.findMany({ where: { subscriptionId } })).map((item) => [
      item.sourceKey,
      item,
    ]),
  );
  for (const item of preview.items) {
    const previous = existing.get(item.key);
    if (item.cancelled) {
      if (previous?.eventId)
        await tx.calendarEvent.update({
          where: { id: previous.eventId },
          data: { title: `[Cancelled] ${item.title}`.slice(0, 200) },
        });
      if (previous?.assessmentId)
        await tx.assessment.update({
          where: { id: previous.assessmentId },
          data: { name: `[Cancelled] ${item.title}`.slice(0, 200), dueDate: null },
        });
      continue;
    }
    // A deleted imported item is a tombstone, so a refresh won't resurrect it.
    if (previous && !previous.assessmentId && !previous.eventId) continue;
    let courseId: string | null = null;
    if (item.course && semester) {
      courseId = courses.get(item.course.code) ?? null;
      if (!courseId) {
        const course = await tx.course.upsert({
          where: { semesterId_code: { semesterId: semester.id, code: item.course.code } },
          create: { semesterId: semester.id, ...item.course },
          update: {},
        });
        courseId = course.id;
        courses.set(item.course.code, courseId);
      }
    }
    if (previous?.assessmentId) {
      await tx.assessment.update({
        where: { id: previous.assessmentId },
        data: { name: item.title, dueDate: new Date(item.startAt) },
      });
    } else if (previous?.eventId) {
      await tx.calendarEvent.update({
        where: { id: previous.eventId },
        data: {
          title: item.title,
          startAt: new Date(item.startAt),
          endAt: new Date(item.endAt),
          allDay: item.allDay,
          location: item.location,
        },
      });
    } else if (courseId && item.deadline) {
      const assessment = await tx.assessment.create({
        data: {
          courseId,
          name: item.title,
          type: item.type,
          dueDate: new Date(item.startAt),
          notes: item.description,
        },
      });
      await tx.importedCalendarItem.create({
        data: { subscriptionId, sourceKey: item.key, assessmentId: assessment.id },
      });
    } else {
      const event = await tx.calendarEvent.create({
        data: {
          workspaceId,
          title: item.title,
          description: item.description,
          startAt: new Date(item.startAt),
          endAt: new Date(item.endAt),
          allDay: item.allDay,
          location: item.location,
          courseId,
        },
      });
      await tx.importedCalendarItem.create({
        data: { subscriptionId, sourceKey: item.key, eventId: event.id },
      });
    }
  }
  // Missing entries are retained: providers may truncate their feed without cancelling anything.
  await tx.calendarSubscription.update({
    where: { id: subscriptionId },
    data: {
      name: preview.name,
      lastSyncedAt: new Date(),
      lastError: null,
      itemCount: await tx.importedCalendarItem.count({
        where: {
          subscriptionId,
          OR: [{ assessmentId: { not: null } }, { eventId: { not: null } }],
        },
      }),
    },
  });
}

export async function connectSubscription(input: z.infer<typeof subscriptionInput>) {
  const workspaceId = await requireWorkspaceId();
  const preview = await previewSubscription(input);
  if (!preview.items.some((item) => !item.cancelled))
    throw new ApiError(
      400,
      'No events fall within these dates. Adjust the import dates and preview again.',
    );
  await db.$transaction(
    async (tx) => {
      const data = {
        ...input,
        workspaceId,
        enabled: true,
        consentedAt: new Date(),
        consentVersion: calendarNoticeVersion,
        name: preview.name,
        fromDate: new Date(input.fromDate),
        throughDate: new Date(input.throughDate),
        lastAttemptAt: new Date(),
      };
      const subscription = await tx.calendarSubscription.upsert({
        where: { workspaceId_url: { workspaceId, url: input.url } },
        create: data,
        update: data,
      });
      await applyCalendarFeed(tx, subscription.id, preview, input, workspaceId);
    },
    { timeout: 30000, isolationLevel: 'Serializable' },
  );
}

function optionsFor(subscription: CalendarSubscription): FeedOptions {
  return {
    fromDate: subscription.fromDate.toISOString().slice(0, 10),
    throughDate: subscription.throughDate.toISOString().slice(0, 10),
    timeZone: subscription.timeZone,
  };
}

export async function syncSubscription(id: string, automatic = false) {
  return syncOwnedSubscription(id, await requireWorkspaceId(), automatic);
}

async function syncOwnedSubscription(id: string, workspaceId: string, automatic: boolean) {
  const subscription = await db.calendarSubscription.findUnique({ where: { id, workspaceId } });
  if (!subscription || !subscription.enabled)
    throw new ApiError(404, 'This calendar is no longer connected.');
  // Atomic lease also prevents separate server workers from syncing the same feed together.
  const threshold = new Date(Date.now() - (automatic ? 15 * 60000 : 60000));
  const claim = await db.calendarSubscription.updateMany({
    where: {
      id,
      workspaceId,
      enabled: true,
      OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: threshold } }],
    },
    data: { lastAttemptAt: new Date() },
  });
  if (!claim.count) {
    if (!automatic)
      throw new ApiError(429, 'This calendar was just checked. Try again in one minute.');
    return;
  }
  try {
    const options = optionsFor(subscription);
    const imported = await db.importedCalendarItem.findMany({
      where: { subscriptionId: id },
      select: { sourceKey: true },
    });
    const preview = await previewSubscription(
      { ...options, url: subscription.url },
      new Set(imported.map((item) => item.sourceKey)),
    );
    await db.$transaction((tx) => applyCalendarFeed(tx, id, preview, options, workspaceId), {
      timeout: 30000,
      isolationLevel: 'Serializable',
    });
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Sync could not finish. Your existing entries are safe; try again.';
    await db.calendarSubscription.updateMany({
      where: { id, workspaceId },
      data: { lastError: message },
    });
    if (!automatic) throw new ApiError(400, message);
  }
}

export async function syncDueSubscriptions(workspaceId?: string) {
  workspaceId ??= await requireWorkspaceId();
  const rows = await db.calendarSubscription.findMany({
    where: {
      workspaceId,
      enabled: true,
      OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: new Date(Date.now() - 15 * 60000) } }],
    },
    orderBy: { lastAttemptAt: { sort: 'asc', nulls: 'first' } },
    ...(isHosted() ? { take: 3 } : {}),
    select: { id: true },
  });
  for (const row of rows) await syncOwnedSubscription(row.id, workspaceId, true);
}

export function startCalendarSync() {
  if (isHosted()) return; // Serverless work runs after authenticated requests, never in global timers.
  const state = globalThis as typeof globalThis & {
    calendarSyncTimer?: ReturnType<typeof setInterval>;
  };
  if (state.calendarSyncTimer) return;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await syncDueSubscriptions();
    } catch {
      /* Retry after database startup; never log feed URLs. */
    } finally {
      running = false;
    }
  };
  state.calendarSyncTimer = setInterval(() => void run(), 60000);
  state.calendarSyncTimer.unref();
  void run();
}
