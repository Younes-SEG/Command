import { describe, expect, it, vi, afterEach } from 'vitest';
import { assertSameOrigin } from './origin';

describe('same-origin mutation guard', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('requires an origin in hosted mode and rejects forged origin headers', () => {
    vi.stubEnv('COMMAND_HOSTED', 'true');
    expect(() =>
      assertSameOrigin(new Request('https://command.example/api/tasks', { method: 'POST' })),
    ).toThrow();
    expect(() =>
      assertSameOrigin(new Request('https://command.example/api/privacy/export')),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(
        new Request('https://command.example/api/tasks', {
          headers: { host: 'evil.example', origin: 'https://evil.example' },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request('https://command.example/api/tasks', {
          headers: { origin: 'https://command.example' },
        }),
      ),
    ).not.toThrow();
  });
  it('accepts a browser using 127.0.0.1 when Next normalizes its URL to localhost', () => {
    expect(() =>
      assertSameOrigin(
        new Request('http://localhost:3000/api/tasks', {
          headers: {
            host: '127.0.0.1:3000',
            origin: 'http://127.0.0.1:3000',
            'sec-fetch-site': 'same-origin',
          },
        }),
      ),
    ).not.toThrow();
  });
  it('accepts localhost and non-browser local tools', () => {
    expect(() =>
      assertSameOrigin(
        new Request('http://localhost:3000/api/tasks', {
          headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        }),
      ),
    ).not.toThrow();
    expect(() => assertSameOrigin(new Request('http://localhost:3000/api/tasks'))).not.toThrow();
  });
  it.each<Record<string, string>>([
    { host: '127.0.0.1:3000', origin: 'https://example.com' },
    { host: 'example.com:3000', origin: 'http://example.com:3000' },
    { host: '127.0.0.1:3001', origin: 'http://127.0.0.1:3001' },
    { host: '127.0.0.1:3000', origin: 'null' },
    { host: 'localhost:3000', origin: 'http://localhost:3000', 'sec-fetch-site': 'cross-site' },
  ])('rejects foreign or cross-site requests: %o', (headers) => {
    expect(() =>
      assertSameOrigin(new Request('http://localhost:3000/api/tasks', { headers })),
    ).toThrow('Changes must come from this application.');
  });
});
