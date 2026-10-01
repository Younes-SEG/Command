-- iCalendar permits point-in-time events such as content availability notices.
ALTER TABLE "CalendarEvent" DROP CONSTRAINT "CalendarEvent_dates_check";
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_dates_check" CHECK ("endAt" >= "startAt");
