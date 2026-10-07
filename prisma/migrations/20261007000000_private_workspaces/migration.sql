-- Preserve all pre-existing records in the local workspace. A hosted account never
-- inherits local records, even if it is the first account to sign in.
ALTER TABLE "Semester" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "Task" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "CalendarEvent" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "CalendarSubscription" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "Settings" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'local';

DROP INDEX "Semester_one_active";
CREATE UNIQUE INDEX "Semester_one_active" ON "Semester" ("workspaceId") WHERE "isActive" = true;
DROP INDEX "CalendarSubscription_url_key";
CREATE UNIQUE INDEX "CalendarSubscription_workspaceId_url_key" ON "CalendarSubscription" ("workspaceId", "url");
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_preferences_check";
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_preferences_check" CHECK ("timeFormat" IN ('12', '24') AND "weekStartsOn" IN (0, 1));
CREATE UNIQUE INDEX "Settings_workspaceId_key" ON "Settings" ("workspaceId");
CREATE INDEX "Semester_workspaceId_startDate_idx" ON "Semester" ("workspaceId", "startDate");
CREATE INDEX "Task_workspaceId_createdAt_idx" ON "Task" ("workspaceId", "createdAt");
CREATE INDEX "CalendarEvent_workspaceId_startAt_idx" ON "CalendarEvent" ("workspaceId", "startAt");
