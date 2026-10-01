import { describe, expect, it } from 'vitest';
import { isLocalWorkspaceRequest } from '../src/lib/server/local-access';

describe('local workspace boundary', () => {
  it.each(['localhost:3000', '127.0.0.1:3000', '[::1]:3000'])('allows loopback host %s', (host) => {
    expect(isLocalWorkspaceRequest(new Headers({ host }))).toBe(true);
  });
  it.each([
    {},
    { host: 'command.example' },
    { host: 'localhost.attacker.example' },
    { host: '127.0.0.1:3000', 'sec-fetch-site': 'cross-site' },
    { host: '127.0.0.1:3000', 'x-forwarded-host': 'public.example' },
    { host: 'localhost:3000', 'x-forwarded-for': '203.0.113.2' },
    { host: 'localhost:3000', forwarded: 'for=203.0.113.2' },
  ])('rejects public or cross-site headers %j', (headers) => {
    expect(isLocalWorkspaceRequest(new Headers(headers as Record<string, string>))).toBe(false);
  });
});
