import { db } from './db';
import { getWorkspace } from './workspace';
import { listSubscriptions } from './calendar-subscriptions';

export async function exportWorkspace() {
  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    workspace: await getWorkspace(),
    // Explicit projection excludes feed URLs and provider source identifiers.
    calendarConnections: await listSubscriptions(),
  };
}

export async function eraseWorkspace() {
  await db.$transaction(
    async (tx) => {
      // Removing subscriptions first prevents in-flight syncs from applying new entries.
      await tx.calendarSubscription.deleteMany();
      await tx.task.deleteMany();
      await tx.calendarEvent.deleteMany();
      await tx.course.deleteMany();
      await tx.semester.deleteMany();
      await tx.settings.deleteMany();
      await tx.settings.create({ data: { id: 'preferences' } });
    },
    { isolationLevel: 'Serializable', timeout: 30000 },
  );
}
