import { describe, expect, it } from 'vitest';
import { currentTerm, parseCalendarFeed } from '../src/lib/calendar-feed';
import { isPublicAddress, normalizeFeedUrl } from '../src/lib/server/feed-fetch';

const options = { fromDate: '2026-09-01', throughDate: '2026-12-31', timeZone: 'America/Toronto' };
const calendar = (...events: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', 'X-WR-CALNAME:My courses', ...events, 'END:VCALENDAR'].join(
    '\r\n',
  );
const event = (body: string) => `BEGIN:VEVENT\r\n${body}\r\nEND:VEVENT`;

describe('Brightspace calendar import', () => {
  it('unfolds French deadlines and identifies courses without inventing grades', () => {
    const result = parseCalendarFeed(
      calendar(
        event(
          'UID:lab1\r\nSUMMARY:Lab 1 – À échéance\r\nDTSTART:20260918T035959Z\r\nDTEND:20260918T035959Z\r\nLOCATION:SEG3102 A00 Software Design & Architecture 20269\r\nDESCRIPTION:Read chapter one\\nAnd\\,\r\n  chapter two',
        ),
      ),
      options,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      key: 'lab1',
      deadline: true,
      type: 'LAB',
      course: { code: 'SEG3102', name: 'Software Design & Architecture' },
      startAt: '2026-09-18T03:59:59.000Z',
      description: 'Read chapter one\nAnd, chapter two',
    });
  });
  it('keeps availability notices as events and excludes old terms', () => {
    const result = parseCalendarFeed(
      calendar(
        event('UID:old\r\nSUMMARY:Old work\r\nDTSTART:20250918T035959Z'),
        event('UID:available\r\nSUMMARY:Sujet : lab3_sol – disponible\r\nDTSTART:20261001T120000Z'),
      ),
      options,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].deadline).toBe(false);
  });
  it('keeps identity when a deadline changes', () => {
    const source = calendar(
      event('UID:stable\r\nSUMMARY:Assignment – Due\r\nDTSTART:20261001T120000Z'),
    );
    const first = parseCalendarFeed(source, options).items[0];
    const later = parseCalendarFeed(source.replace('20261001T120000Z', '20261008T120000Z'), options)
      .items[0];
    expect(later.key).toBe(first.key);
    expect(later.startAt).not.toBe(first.startAt);
  });
  it('handles floating, TZID and all-day values independently of server timezone', () => {
    const result = parseCalendarFeed(
      calendar(
        event('UID:floating\r\nDTSTART:20261001T090000'),
        event('UID:zoned\r\nDTSTART;TZID=America/Toronto:20261109T090000'),
        event('UID:allday\r\nDTSTART;VALUE=DATE:20261109\r\nDTEND;VALUE=DATE:20261110'),
      ),
      options,
    );
    expect(result.items.find((e) => e.key === 'floating')?.startAt).toBe(
      '2026-10-01T13:00:00.000Z',
    );
    expect(result.items.find((e) => e.key === 'zoned')?.startAt).toBe('2026-11-09T14:00:00.000Z');
    expect(result.items.find((e) => e.key === 'allday')).toMatchObject({
      startAt: '2026-11-09T05:00:00.000Z',
      endAt: '2026-11-10T05:00:00.000Z',
      allDay: true,
    });
  });
  it('expands recurrence, exceptions and EXDATE with stable occurrence keys', () => {
    const result = parseCalendarFeed(
      calendar(
        event(
          'UID:weekly\r\nSUMMARY:Class\r\nDTSTART;TZID=America/Toronto:20261026T090000\r\nDTEND;TZID=America/Toronto:20261026T100000\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nEXDATE;TZID=America/Toronto:20261109T090000',
        ),
        event(
          'UID:weekly\r\nRECURRENCE-ID;TZID=America/Toronto:20261102T090000\r\nSUMMARY:Moved class\r\nDTSTART;TZID=America/Toronto:20261103T110000\r\nDTEND;TZID=America/Toronto:20261103T120000',
        ),
      ),
      options,
    );
    expect(result.items).toHaveLength(3);
    expect(result.items[1]).toMatchObject({
      key: 'weekly::2026-11-02T09:00:00',
      title: 'Moved class',
      startAt: '2026-11-03T16:00:00.000Z',
    });
    expect(result.items[2].startAt).toBe('2026-11-16T14:00:00.000Z');
  });
  it('retains explicit cancellation status', () => {
    expect(
      parseCalendarFeed(
        calendar(event('UID:cancelled\r\nDTSTART:20261001T120000Z\r\nSTATUS:CANCELLED')),
        options,
      ).items[0].cancelled,
    ).toBe(true);
  });
  it('refreshes an existing deadline even when it moves beyond the initial import window', () => {
    const source = calendar(event('UID:existing\r\nDTSTART:20270108T120000Z'));
    expect(parseCalendarFeed(source, options).items).toHaveLength(0);
    expect(parseCalendarFeed(source, options, new Set(['existing'])).items[0].startAt).toBe(
      '2027-01-08T12:00:00.000Z',
    );
  });
  it('rejects HTML login pages and incomplete feeds', () => {
    expect(() => parseCalendarFeed('<html>Sign in</html>', options)).toThrow();
    expect(() => parseCalendarFeed('BEGIN:VCALENDAR', options)).toThrow();
    expect(() =>
      parseCalendarFeed(calendar(event('SUMMARY:Missing ID\r\nDTSTART:20261001T120000Z')), options),
    ).toThrow();
  });
  it('bounds unreasonably frequent recurrence', () => {
    expect(() =>
      parseCalendarFeed(
        calendar(event('UID:seconds\r\nDTSTART:20261001T120000Z\r\nRRULE:FREQ=SECONDLY')),
        options,
      ),
    ).toThrow(/once a day/);
  });
  it('selects the current academic term', () => {
    expect(currentTerm(new Date(2026, 8, 30))).toMatchObject({
      fromDate: '2026-09-01',
      throughDate: '2026-12-31',
    });
  });
});

describe('subscription URL safety', () => {
  it('accepts HTTPS and normalizes webcal without leaking credentials', () => {
    expect(normalizeFeedUrl('webcal://calendar.example/feed?token=private')).toBe(
      'https://calendar.example/feed?token=private',
    );
    for (const url of [
      'file:///etc/passwd',
      'http://example.com/calendar',
      'https://name:pass@example.com/',
      'https://example.com:5432/',
    ])
      expect(() => normalizeFeedUrl(url)).toThrow();
  });
  it('rejects loopback, internal, metadata and IPv4-mapped addresses', () => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '169.254.169.254',
      '172.16.1.1',
      '192.168.1.1',
      '100.100.100.200',
      '::1',
      'fe80::1',
      'fd00::1',
      '::ffff:127.0.0.1',
      '2002:7f00:1::',
    ])
      expect(isPublicAddress(address), address).toBe(false);
    expect(isPublicAddress('8.8.8.8')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
  });
});
