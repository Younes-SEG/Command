import { db } from './db';
import { getWorkspace } from './workspace';
import { listSubscriptions } from './calendar-subscriptions';
import { requireWorkspaceId } from './auth';

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
  const workspaceId = await requireWorkspaceId();
  await db.$transaction(
    async (tx) => {
      // Removing subscriptions first prevents in-flight syncs from applying new entries.
      await tx.calendarSubscription.deleteMany({ where: { workspaceId } });
      await tx.task.deleteMany({ where: { workspaceId } });
      await tx.calendarEvent.deleteMany({ where: { workspaceId } });
      await tx.course.deleteMany({ where: { semester: { workspaceId } } });
      await tx.semester.deleteMany({ where: { workspaceId } });
      await tx.settings.deleteMany({ where: { workspaceId } });
      await tx.settings.create({
        data: {
          id: workspaceId === 'local' ? 'preferences' : `preferences:${workspaceId}`,
          workspaceId,
        },
      });
    },
    { isolationLevel: 'Serializable', timeout: 30000 },
  );
}
