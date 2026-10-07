import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectSyllabusUpload } from '../src/lib/server/syllabus-text';
import { readSyllabusWithAi, type SyllabusAiInput } from '../src/lib/server/syllabus-ai';
import { validateSyllabusResult } from '../src/lib/syllabus-result';
import { syllabusPdf } from './fixtures/syllabus-pdf';
import { syllabusModelResult } from './fixtures/syllabus-result';

const course = {
  code: 'TEST101',
  name: 'Test course',
  startDate: '2090-09-01',
  endDate: '2090-12-31',
};
const fixture = (): SyllabusAiInput => ({
  bytes: new Uint8Array(syllabusPdf(['Midterm 1 - October 20, 2090 - 25%'])),
  kind: 'pdf',
  pages: 1,
  course,
});
const completed = () =>
  Response.json({
    status: 'completed',
    output: [
      {
        type: 'message',
        content: [{ type: 'output_text', text: JSON.stringify(syllabusModelResult) }],
      },
    ],
  });

beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'test-only-key');
  vi.stubEnv('OPENAI_SYLLABUS_MODEL', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('syllabus upload validation', () => {
  it('preserves original PDF bytes and allows PDFs without selectable text', async () => {
    const bytes = new Uint8Array(syllabusPdf([]));
    const original = bytes.slice();
    expect(await inspectSyllabusUpload(bytes, 'pdf')).toEqual({ pages: 1 });
    expect(bytes).toEqual(original);
  });
  it('rejects fake PDFs, invalid encoding and oversized text', async () => {
    await expect(
      inspectSyllabusUpload(new TextEncoder().encode('Not a PDF'), 'pdf'),
    ).rejects.toThrow('not a PDF');
    await expect(inspectSyllabusUpload(new Uint8Array([0xff]), 'text')).rejects.toThrow('UTF-8');
    await expect(
      inspectSyllabusUpload(new TextEncoder().encode('a'.repeat(100001)), 'text'),
    ).rejects.toThrow('100,000');
    expect(
      await inspectSyllabusUpload(new TextEncoder().encode('Examen final 35%'), 'text'),
    ).toEqual({ pages: null, text: 'Examen final 35%' });
  });
});

describe('AI extraction validation', () => {
  it('keeps unknown dates empty and group weights unset', () => {
    const raw = structuredClone(syllabusModelResult);
    raw.items[2].weight = 20;
    const result = validateSyllabusResult(raw, { ...course, pages: 1 });
    expect(result.items[2]).toMatchObject({ weight: null, date: '', time: '', grouped: true });
    expect(result.items[3]).toMatchObject({ weight: 35, date: '', page: 1 });
  });
  it('flags impossible dates, invalid times and unsupported page references', () => {
    const raw = structuredClone(syllabusModelResult);
    raw.items[0] = { ...raw.items[0], date: '2090-02-30', time: '24:88', page: 4 };
    const result = validateSyllabusResult(raw, { ...course, pages: 1 });
    expect(result.items[0]).toMatchObject({ date: '', time: '', page: null });
    expect(result.items[0].warnings.join(' ')).toContain('invalid');
    raw.items[0].date = '2089-10-20';
    expect(
      validateSyllabusResult(raw, { ...course, pages: 1 }).items[0].warnings.join(' '),
    ).toContain('outside');
  });
});

describe('OpenAI syllabus request', () => {
  it('sends the original PDF, course-only context and a strict output schema without persistence', async () => {
    const fetcher = vi.fn().mockResolvedValue(completed());
    vi.stubGlobal('fetch', fetcher);
    const input = fixture();
    const result = await readSyllabusWithAi(input);
    expect(result.items).toHaveLength(4);
    const [url, options] = fetcher.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(options.headers.Authorization).toBe('Bearer test-only-key');
    expect(options.redirect).toBe('error');
    expect(body).toMatchObject({
      store: false,
      model: 'gpt-4.1-mini',
      max_output_tokens: 16000,
      text: { format: { type: 'json_schema', strict: true } },
    });
    expect(body.input[0].content[1]).toEqual({
      type: 'input_file',
      filename: 'syllabus.pdf',
      detail: 'high',
      file_data: `data:application/pdf;base64,${Buffer.from(input.bytes).toString('base64')}`,
    });
    expect(body.input[0].content[0].text).toContain(JSON.stringify(course));
    expect(body.tools).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('test-only-key');
  });
  it('sends pasted text through the same model', async () => {
    const fetcher = vi.fn().mockResolvedValue(completed());
    vi.stubGlobal('fetch', fetcher);
    await readSyllabusWithAi({ ...fixture(), kind: 'text', pages: null, text: 'Examen final 35%' });
    expect(JSON.parse(fetcher.mock.calls[0][1].body).input[0].content[1]).toEqual({
      type: 'input_text',
      text: 'Examen final 35%',
    });
  });
  it('does not issue a paid request without a configured key', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(readSyllabusWithAi(fixture())).rejects.toMatchObject({ status: 503 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    [401, 503],
    [429, 429],
    [500, 502],
  ])('maps provider status %i without leaking provider content', async (status, expected) => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('private provider details and test-only-key', { status }));
    vi.stubGlobal('fetch', fetcher);
    await expect(readSyllabusWithAi(fixture())).rejects.toMatchObject({ status: expected });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([
    { status: 'incomplete', output: [] },
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] },
    {
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'output_text', text: '{"items": "bad"}' }] }],
    },
  ])(
    'rejects partial, refused or malformed outputs instead of inventing a fallback',
    async (result) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(result)));
      await expect(readSyllabusWithAi(fixture())).rejects.toThrow();
    },
  );
  it('blocks concurrent paid reads and releases the slot afterwards', async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>((r) => {
              resolve = r;
            }),
        )
        .mockResolvedValue(completed()),
    );
    const first = readSyllabusWithAi(fixture());
    await expect(readSyllabusWithAi(fixture())).rejects.toMatchObject({ status: 429 });
    resolve(completed());
    await first;
    await expect(readSyllabusWithAi(fixture())).resolves.toHaveProperty('items');
  });
  it('cancels a request and releases the slot when the browser navigates away', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => reject(new Error('cancelled')), {
              once: true,
            });
          }),
      ),
    );
    const controller = new AbortController();
    const pending = readSyllabusWithAi(fixture(), controller.signal);
    const check = expect(pending).rejects.toMatchObject({ status: 499 });
    controller.abort();
    await check;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(completed()));
    await expect(readSyllabusWithAi(fixture())).resolves.toHaveProperty('items');
  });
});
