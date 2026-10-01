CREATE TABLE "CalendarSubscription" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "fromDate" DATE NOT NULL,
  "throughDate" DATE NOT NULL,
  "timeZone" TEXT NOT NULL,
  "lastSyncedAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "itemCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CalendarSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalendarSubscription_url_key" ON "CalendarSubscription"("url");
CREATE TABLE "ImportedCalendarItem" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "assessmentId" TEXT,
  "eventId" TEXT,
  CONSTRAINT "ImportedCalendarItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ImportedCalendarItem_subscriptionId_sourceKey_key" ON "ImportedCalendarItem"("subscriptionId", "sourceKey");
CREATE UNIQUE INDEX "ImportedCalendarItem_assessmentId_key" ON "ImportedCalendarItem"("assessmentId");
CREATE UNIQUE INDEX "ImportedCalendarItem_eventId_key" ON "ImportedCalendarItem"("eventId");
ALTER TABLE "ImportedCalendarItem" ADD CONSTRAINT "ImportedCalendarItem_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CalendarSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportedCalendarItem" ADD CONSTRAINT "ImportedCalendarItem_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportedCalendarItem" ADD CONSTRAINT "ImportedCalendarItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
