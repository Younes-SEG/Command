import { beforeEach, expect, it, vi } from 'vitest';
import { POST, GET } from '../src/app/api/syllabus/preview/route';
import { db } from '../src/lib/server/db';
import { readSyllabusThroughService } from '../src/lib/server/syllabus-service';
import { syllabusPdf } from './fixtures/syllabus-pdf';

vi.mock('../src/lib/server/db', () => ({ db: { course: { findUnique: vi.fn() } } }));
vi.mock('../src/lib/server/syllabus-service', () => ({
  isSyllabusServiceAvailable: async () => false,
  readSyllabusThroughService: vi.fn(),
}));
const url = 'http://127.0.0.1:3000/api/syllabus/preview';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.course.findUnique).mockResolvedValue({
    code: 'TEST101',
    name: 'Test course',
    semester: { startDate: new Date('2090-09-01'), endDate: new Date('2090-12-31') },
  } as never);
  vi.mocked(readSyllabusThroughService).mockResolvedValue({
    items: [],
    warnings: ['Nothing found'],
  });
});

it('passes original PDF bytes and only the selected course context to the model', async () => {
  const pdf = syllabusPdf([]);
  const response = await POST(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', 'X-Command-Course': 'test-course' },
      body: Uint8Array.from(pdf),
    }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const input = vi.mocked(readSyllabusThroughService).mock.calls[0][0];
  expect(Buffer.from(input.bytes)).toEqual(pdf);
  expect(input.course).toEqual({
    code: 'TEST101',
    name: 'Test course',
    startDate: '2090-09-01',
    endDate: '2090-12-31',
  });
  expect(input).toMatchObject({ kind: 'pdf', pages: 1 });
  expect(input.text).toBeUndefined();
  expect(db.course.findUnique).toHaveBeenCalledWith({
    where: { id: 'test-course' },
    select: { code: true, name: true, semester: { select: { startDate: true, endDate: true } } },
  });
});

it('refuses missing courses and cross-origin requests before calling the model', async () => {
  let response = await POST(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'Midterm 25%',
    }),
  );
  expect(response.status).toBe(400);
  response = await POST(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Origin: 'https://untrusted.example' },
      body: 'Midterm 25%',
    }),
  );
  expect(response.status).toBe(403);
  vi.mocked(db.course.findUnique).mockResolvedValue(null);
  response = await POST(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-Command-Course': 'removed-course' },
      body: 'Midterm 25%',
    }),
  );
  expect(response.status).toBe(404);
  expect(readSyllabusThroughService).not.toHaveBeenCalled();
});

it('returns only setup availability, never the key', async () => {
  const response = await GET();
  expect(await response.json()).toEqual({ configured: false });
  expect(response.headers.get('cache-control')).toBe('no-store');
});
