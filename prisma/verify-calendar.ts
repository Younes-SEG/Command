import 'dotenv/config';
import assert from 'node:assert/strict';
import { db } from '../src/lib/server/db';
import { applyCalendarFeed } from '../src/lib/server/calendar-subscriptions';
import { parseCalendarFeed } from '../src/lib/calendar-feed';

const rollback = new Error('ROLLBACK_CALENDAR_TEST');
const options = { fromDate: '2086-09-01', throughDate: '2086-12-31', timeZone: 'America/Toronto' };
const feed = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Integration test
BEGIN:VEVENT
UID:assessment
SUMMARY:Lab 1 – À échéance
LOCATION:TST9999 A00 Test Course 20869
DTSTART:20861001T120000Z
DESCRIPTION:Original notes
END:VEVENT
BEGIN:VEVENT
UID:notice
SUMMARY:Content available
DTSTART:20861001T130000Z
END:VEVENT
END:VCALENDAR`;
try {
  await db.$transaction(
    async (tx) => {
      const subscription = await tx.calendarSubscription.create({
        data: {
          url: `https://calendar.example/${Date.now()}`,
          name: 'Test',
          timeZone: options.timeZone,
          fromDate: new Date(options.fromDate),
          throughDate: new Date(options.throughDate),
        },
      });
      const preview = parseCalendarFeed(feed, options);
      await applyCalendarFeed(tx, subscription.id, preview, options);
      const rows = await tx.importedCalendarItem.findMany({
        where: { subscriptionId: subscription.id },
      });
      assert.equal(rows.length, 2);
      const assessmentId = rows.find((row) => row.assessmentId)!.assessmentId!;
      const eventId = rows.find((row) => row.eventId)!.eventId!;
      await tx.assessment.update({
        where: { id: assessmentId },
        data: { score: 85, weight: 20, status: 'GRADED', notes: 'Keep my notes' },
      });
      const updated = parseCalendarFeed(
        feed.replace('20861001T120000Z', '20861008T120000Z'),
        options,
      );
      await applyCalendarFeed(tx, subscription.id, updated, options);
      assert.equal(
        await tx.importedCalendarItem.count({ where: { subscriptionId: subscription.id } }),
        2,
      );
      const assessment = await tx.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
      assert.equal(assessment.dueDate?.toISOString(), '2086-10-08T12:00:00.000Z');
      assert.equal(assessment.score, 85);
      assert.equal(assessment.weight, 20);
      assert.equal(assessment.status, 'GRADED');
      assert.equal(assessment.notes, 'Keep my notes');
      await tx.calendarEvent.delete({ where: { id: eventId } });
      await applyCalendarFeed(tx, subscription.id, updated, options);
      assert.equal(await tx.calendarEvent.count({ where: { id: eventId } }), 0);
      assert.equal(
        await tx.importedCalendarItem.count({ where: { subscriptionId: subscription.id } }),
        2,
      );
      updated.items[0].cancelled = true;
      // Find by UID because the changed deadline affects sort order.
      updated.items.find((item) => item.key === 'assessment')!.cancelled = true;
      await applyCalendarFeed(tx, subscription.id, updated, options);
      const cancelled = await tx.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
      assert.equal(cancelled.dueDate, null);
      assert.match(cancelled.name, /^\[Cancelled\]/);
      assert.equal(cancelled.score, 85);
      await applyCalendarFeed(tx, subscription.id, { ...updated, items: [] }, options);
      assert.equal(await tx.assessment.count({ where: { id: assessmentId } }), 1);
      throw rollback;
    },
    { timeout: 30000 },
  );
} catch (error) {
  if (error !== rollback) throw error;
  console.log(
    'Calendar database checks passed: import, repeat sync, deadline changes, preserved grades/notes, deletion, cancellation, and missing entries. All test data rolled back.',
  );
} finally {
  await db.$disconnect();
}
