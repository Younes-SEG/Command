import ICAL from 'ical.js';
import type { AssessmentType } from './types';

export interface FeedOptions {
  fromDate: string;
  throughDate: string;
  timeZone: string;
}
export interface FeedItem {
  key: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  cancelled: boolean;
  course: { code: string; name: string } | null;
  deadline: boolean;
  type: AssessmentType;
}
export interface FeedPreview {
  name: string;
  total: number;
  items: FeedItem[];
}

export function currentTerm(now: Date): FeedOptions {
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = month < 4 ? '01' : month < 8 ? '05' : '09';
  const last = month < 4 ? '04-30' : month < 8 ? '08-31' : '12-31';
  return {
    fromDate: `${year}-${first}-01`,
    throughDate: `${year}-${last}`,
    timeZone: 'America/Toronto',
  };
}

/** Convert floating calendar wall time without depending on the server's timezone. */
function wallTime(time: ICAL.Time, zone: string): Date {
  const target = Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, time.second);
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  let result = target;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      format.formatToParts(new Date(result)).map((p) => [p.type, p.value]),
    );
    const actual = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second,
    );
    const correction = target - actual;
    result += correction;
    if (!correction) break;
  }
  return new Date(result);
}

function instant(time: ICAL.Time, component: ICAL.Component, property: string, fallback: string) {
  if (!time.isDate && time.zone.tzid !== 'floating') return time.toJSDate();
  const zone = component.getFirstProperty(property)?.getParameter('tzid');
  return wallTime(time, typeof zone === 'string' ? zone : fallback);
}

function courseFromLocation(location: string) {
  const match = /^([A-Z]{2,5})\s?(\d{4,5})\s+(?:[A-Z]\d{2}\s+)?(.+?)(?:\s+20\d{3})?$/i.exec(
    location.trim(),
  );
  return match
    ? { code: `${match[1]}${match[2]}`.toUpperCase(), name: match[3].trim().slice(0, 200) }
    : null;
}

function assessmentType(title: string): AssessmentType {
  if (/\blab\b|laboratoire/i.test(title)) return 'LAB';
  if (/quiz|questionnaire/i.test(title)) return 'QUIZ';
  if (/midterm|intra/i.test(title)) return 'MIDTERM';
  if (/final.*exam|examen.*final/i.test(title)) return 'FINAL_EXAM';
  if (/project|projet|deliverable|livrable/i.test(title)) return 'PROJECT';
  return 'ASSIGNMENT';
}

/** Expand a bounded subscription window, preserving UID + original recurrence identity. */
export function parseCalendarFeed(
  text: string,
  options: FeedOptions,
  retainedKeys: ReadonlySet<string> = new Set(),
): FeedPreview {
  if (!text.trimStart().startsWith('BEGIN:VCALENDAR') || !text.includes('END:VCALENDAR'))
    throw new Error(
      'This link did not return an iCalendar feed. Copy the subscription link from Brightspace Calendar.',
    );
  const root = new ICAL.Component(ICAL.parse(text));
  const components = root.getAllSubcomponents('vevent');
  if (components.length > 5000)
    throw new Error('This calendar is too large. Subscribe to fewer courses.');
  const start = wallTime(ICAL.Time.fromDateString(options.fromDate), options.timeZone);
  const endTime = ICAL.Time.fromDateString(options.throughDate);
  endTime.adjust(1, 0, 0, 0);
  const end = wallTime(endTime, options.timeZone);
  const items = new Map<string, FeedItem>();
  let iterations = 0;
  const append = (event: ICAL.Event, startTime: ICAL.Time, endTime: ICAL.Time, key: string) => {
    const begin = instant(startTime, event.component, 'dtstart', options.timeZone);
    const finish = instant(endTime, event.component, 'dtend', options.timeZone);
    if (!Number.isFinite(begin.getTime()) || !Number.isFinite(finish.getTime()) || finish < begin)
      throw new Error('The calendar contains an invalid event date. No changes were saved.');
    if (
      (begin >= end || (finish > begin ? finish <= start : begin < start)) &&
      !retainedKeys.has(key)
    )
      return;
    const title = (event.summary || 'Untitled event').slice(0, 200);
    const location = (event.location || '').slice(0, 300);
    items.set(key, {
      key,
      title,
      description: (event.description || '').slice(0, 20000),
      location,
      startAt: begin.toISOString(),
      endAt: finish.toISOString(),
      allDay: startTime.isDate,
      cancelled: event.component.getFirstPropertyValue('status') === 'CANCELLED',
      course: courseFromLocation(location),
      deadline: /(?:à échéance|due(?:\s+date)?|deadline)\s*$/iu.test(title),
      type: assessmentType(title),
    });
    if (items.size > 2000)
      throw new Error('Too many events in this date range. Choose a shorter range.');
  };
  for (const component of components) {
    const event = new ICAL.Event(component);
    if (!event.uid || !component.hasProperty('dtstart'))
      throw new Error('An event is missing its ID or start date. No changes were saved.');
    if (event.isRecurrenceException()) continue;
    if (!event.isRecurring()) {
      append(event, event.startDate, event.endDate, event.uid);
      continue;
    }
    const frequencies = event.getRecurrenceTypes();
    if (frequencies.SECONDLY || frequencies.MINUTELY || frequencies.HOURLY)
      throw new Error('Calendars recurring more than once a day are not supported.');
    const iterator = event.iterator();
    for (let next = iterator.next(); next; next = iterator.next()) {
      if (++iterations > 20000)
        throw new Error('This calendar has too many recurring events to import safely.');
      if (instant(next, component, 'dtstart', options.timeZone) >= end) break;
      const occurrence = event.getOccurrenceDetails(next);
      append(
        occurrence.item,
        occurrence.startDate,
        occurrence.endDate,
        `${event.uid}::${next.toString()}`,
      );
    }
  }
  return {
    name: String(root.getFirstPropertyValue('x-wr-calname') || 'Calendar subscription').slice(
      0,
      200,
    ),
    total: components.length,
    items: [...items.values()].sort((a, b) => a.startAt.localeCompare(b.startAt)),
  };
}
