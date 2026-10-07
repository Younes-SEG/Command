import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { UsageLimits } from '../services/syllabus/limits';
import { createSyllabusServer, networkAddress } from '../services/syllabus/server';
import { ApiError } from '../src/lib/server/errors';
import { syllabusPdf } from './fixtures/syllabus-pdf';
import { readSyllabusThroughService } from '../src/lib/server/syllabus-service';

const salt = 'test-only-not-a-production-salt-12345678';
const today = new Date('2090-10-06T12:00:00Z');
const tomorrow = new Date('2090-10-07T12:00:00Z');
const limits = { networkDaily: 1, globalDaily: 2, globalMonthly: 3 };
const servers: Server[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    servers.splice(0).map(
      (s) =>
        new Promise<void>((resolve) => {
          s.closeAllConnections();
          s.close(() => resolve());
        }),
    ),
  );
});
async function host(options: Parameters<typeof createSyllabusServer>[0]) {
  const server = createSyllabusServer(options);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
const payload = () => ({
  kind: 'pdf',
  document: syllabusPdf([]).toString('base64'),
  course: {
    code: 'TEST101',
    name: 'Only selected course',
    startDate: '2090-09-01',
    endDate: '2090-12-31',
  },
});
const post = (url: string, body = payload()) =>
  fetch(`${url}/v1/syllabus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('durable service quotas', () => {
  it('persists atomic daily and monthly caps across restarts and stores no raw IP', () => {
    const dir = mkdtempSync(join(tmpdir(), 'command-quota-'));
    const path = join(dir, 'usage.sqlite');
    let usage = new UsageLimits(path, salt, limits);
    try {
      usage.reserve('203.0.113.5', today);
      expect(() => usage.reserve('203.0.113.5', today)).toThrow(ApiError);
      usage.close();
      usage = new UsageLimits(path, salt, limits);
      expect(() => usage.reserve('203.0.113.5', today)).toThrow(ApiError);
      usage.reserve('203.0.113.6', today);
      expect(() => usage.reserve('203.0.113.7', today)).toThrow(ApiError);
      usage.reserve('203.0.113.5', tomorrow);
      expect(() => usage.reserve('203.0.113.8', tomorrow)).toThrow(ApiError);
      const inspection = new DatabaseSync(path, { readOnly: true });
      const rows = inspection.prepare('SELECT * FROM usage').all();
      inspection.close();
      expect(JSON.stringify(rows)).not.toContain('203.0.113');
      expect(rows.filter((r) => String(r.bucket).startsWith('network:'))).toHaveLength(1);
      // A rejected reservation must not increment the other counters.
      expect(rows.find((r) => r.bucket === 'month:2090-10')?.count).toBe(3);
      usage.reserve('203.0.113.5', new Date('2090-11-01T00:00:00Z'));
    } finally {
      usage.close();
      for (const suffix of ['', '-wal', '-shm']) {
        try {
          unlinkSync(path + suffix);
        } catch {}
      }
      rmdirSync(dir);
    }
  });
  it('rejects unsafe configurations rather than running unlimited', () => {
    expect(() => new UsageLimits(':memory:', '', limits)).toThrow();
    expect(() => new UsageLimits(':memory:', salt, { ...limits, globalDaily: 0 })).toThrow();
  });
});

describe('hosted reader HTTP boundary', () => {
  it('connects the actual app client to the HTTP service without any user key', async () => {
    const read = vi.fn(async () => ({ items: [], warnings: ['Sample has no assessments.'] }));
    const url = await host({ usage: { reserve: vi.fn() }, ready: () => true, read });
    vi.stubEnv('COMMAND_SYLLABUS_SERVICE_URL', url);
    vi.stubEnv('OPENAI_API_KEY', '');
    const result = await readSyllabusThroughService({
      kind: 'pdf',
      bytes: new Uint8Array(syllabusPdf([])),
      pages: 1,
      course: payload().course,
    });
    expect(result).toEqual({ items: [], warnings: ['Sample has no assessments.'] });
    expect(read).toHaveBeenCalledTimes(1);
  });
  it('validates original PDFs, reserves before reading and exposes no workspace routes', async () => {
    const order: string[] = [];
    const reserve = vi.fn(() => {
      order.push('reserve');
    });
    const read = vi.fn(async () => {
      order.push('read');
      return { items: [], warnings: [] };
    });
    const url = await host({ usage: { reserve }, ready: () => true, read });
    expect((await fetch(`${url}/health`)).status).toBe(200);
    expect((await fetch(`${url}/api/workspace`)).status).toBe(404);
    const response = await post(url);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ items: [], warnings: [] });
    expect(order).toEqual(['reserve', 'read']);
    const input = vi.mocked(read).mock.calls[0] as unknown as [
      { bytes: Uint8Array; pages: number; course: unknown },
    ];
    expect(Buffer.from(input[0].bytes)).toEqual(syllabusPdf([]));
    expect(input[0].pages).toBe(1);
    expect(input[0].course).toEqual(payload().course);
  });
  it('does not spend quota for malformed uploads or accept arbitrary provider instructions', async () => {
    const reserve = vi.fn();
    const read = vi.fn();
    const url = await host({ usage: { reserve }, ready: () => true, read });
    expect(
      (await post(url, { ...payload(), document: Buffer.from('not pdf').toString('base64') }))
        .status,
    ).toBe(400);
    expect(
      (await post(url, { ...payload(), course: { ...payload().course, startDate: '2090-02-30' } }))
        .status,
    ).toBe(400);
    const extra = { ...payload(), model: 'expensive', instructions: 'override' };
    expect((await post(url, extra)).status).toBe(400);
    expect(reserve).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });
  it('fails closed when quota storage fails and when the owner disables reads', async () => {
    const read = vi.fn();
    const url = await host({
      usage: {
        reserve: () => {
          throw new Error('private database path');
        },
      },
      ready: () => true,
      read,
    });
    const response = await post(url);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private');
    expect(read).not.toHaveBeenCalled();
    const offline = await host({ usage: { reserve: vi.fn() }, ready: () => false, read });
    expect((await fetch(`${offline}/health`)).status).toBe(503);
    expect((await post(offline)).status).toBe(503);
  });
  it('quota exhaustion prevents provider calls', async () => {
    const read = vi.fn();
    const url = await host({
      usage: {
        reserve: () => {
          throw new ApiError(429, 'Allowance reached');
        },
      },
      ready: () => true,
      read,
    });
    const response = await post(url);
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('3600');
    expect(read).not.toHaveBeenCalled();
  });
  it('rejects concurrent reads and keeps failed paid attempts reserved', async () => {
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const reserve = vi.fn();
    const read = vi.fn(async () => {
      await wait;
      throw new ApiError(502, 'Provider unavailable');
    });
    const url = await host({ usage: { reserve }, ready: () => true, read });
    const first = post(url);
    try {
      await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
      expect((await post(url)).status).toBe(429);
    } finally {
      release();
    }
    expect((await first).status).toBe(502);
    expect(reserve).toHaveBeenCalledTimes(1);
  });
  it('ignores spoofed forwarding headers by default and normalizes network prefixes', () => {
    const req = (ip: string, header = '1.2.3.4') =>
      ({
        socket: { remoteAddress: ip },
        headers: { 'x-forwarded-for': header },
      }) as unknown as IncomingMessage;
    expect(networkAddress(req('203.0.113.5'), 0)).toBe('203.0.113.5');
    expect(networkAddress(req('::ffff:203.0.113.5'), 0)).toBe('203.0.113.5');
    expect(networkAddress(req('2001:db8:1:2::1'), 0)).toBe(
      networkAddress(req('2001:0db8:0001:0002::ffff'), 0),
    );
    expect(networkAddress(req('127.0.0.1', 'spoofed, 203.0.113.5'), 1)).toBe('203.0.113.5');
    expect(() => networkAddress(req('127.0.0.1', ''), 1)).toThrow(ApiError);
  });
});
