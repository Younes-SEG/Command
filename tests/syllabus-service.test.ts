import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readSyllabusThroughService,
  isSyllabusServiceAvailable,
} from '../src/lib/server/syllabus-service';
import { validateSyllabusResult } from '../src/lib/syllabus-result';
import { syllabusModelResult } from './fixtures/syllabus-result';
import { syllabusPdf } from './fixtures/syllabus-pdf';

const course = {
  code: 'TEST101',
  name: 'Test course',
  startDate: '2090-09-01',
  endDate: '2090-12-31',
};
const input = () => ({
  course,
  kind: 'pdf' as const,
  pages: 1,
  bytes: new Uint8Array(syllabusPdf([])),
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('shared reader client', () => {
  it('sends only document and course context without a local provider key', async () => {
    vi.stubEnv('COMMAND_SYLLABUS_SERVICE_URL', 'https://reader.example');
    vi.stubEnv('OPENAI_API_KEY', 'local-key-must-not-leave');
    const preview = validateSyllabusResult(syllabusModelResult, { ...course, pages: 1 });
    const fetcher = vi.fn().mockResolvedValue(Response.json(preview));
    vi.stubGlobal('fetch', fetcher);
    const source = input();
    expect(await readSyllabusThroughService(source)).toEqual(preview);
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe('https://reader.example/v1/syllabus');
    expect(options.redirect).toBe('error');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(options.body)).toEqual({
      kind: 'pdf',
      document: Buffer.from(source.bytes).toString('base64'),
      course,
    });
    expect(JSON.stringify(options)).not.toContain('local-key');
  });
  it.each([
    '',
    'http://reader.example',
    'https://user:secret@reader.example',
    'https://reader.example/?key=secret',
    'https://reader.example/path',
  ])('rejects absent or unsafe release URL %s', async (url) => {
    vi.stubEnv('COMMAND_SYLLABUS_SERVICE_URL', url);
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect(await isSyllabusServiceAvailable()).toBe(false);
    await expect(readSyllabusThroughService(input())).rejects.toMatchObject({ status: 503 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('never accepts plain HTTP in a production build', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COMMAND_SYLLABUS_SERVICE_URL', 'http://127.0.0.1:8080');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect(await isSyllabusServiceAvailable()).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([429, 503])(
    'shows a safe service error for %s without echoing upstream content',
    async (status) => {
      vi.stubEnv('COMMAND_SYLLABUS_SERVICE_URL', 'https://reader.example');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('private data and key', { status })),
      );
      await expect(readSyllabusThroughService(input())).rejects.toMatchObject({ status });
    },
  );
  it('rejects oversized and malformed service responses', async () => {
    vi.stubEnv('COMMAND_SYLLABUS_SERVICE_URL', 'https://reader.example');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('x'.repeat(2_000_001)))
        .mockResolvedValueOnce(Response.json({ items: [{ name: 'bad' }] })),
    );
    await expect(readSyllabusThroughService(input())).rejects.toMatchObject({ status: 502 });
    await expect(readSyllabusThroughService(input())).rejects.toMatchObject({ status: 502 });
  });
  it('checks health without sending documents and never retries a paid read', async () => {
    vi.stubEnv('COMMAND_SYLLABUS_SERVICE_URL', 'https://reader.example');
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ available: true }))
      .mockRejectedValueOnce(new Error('network'));
    vi.stubGlobal('fetch', fetcher);
    expect(await isSyllabusServiceAvailable()).toBe(true);
    expect(String(fetcher.mock.calls[0][0])).toBe('https://reader.example/health');
    expect(fetcher.mock.calls[0][1].body).toBeUndefined();
    await expect(readSyllabusThroughService(input())).rejects.toMatchObject({ status: 502 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
