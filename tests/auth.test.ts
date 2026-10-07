import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const { session, createAuth } = vi.hoisted(() => {
  const session = vi.fn();
  return { session, createAuth: vi.fn(() => ({ getSession: session })) };
});
vi.mock('@neondatabase/auth/next/server', () => ({
  createNeonAuth: createAuth,
}));
import { isAuthConfigured, requireWorkspaceId } from '../src/lib/server/auth';

beforeEach(() => {
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('COMMAND_HOSTED', 'true');
  vi.stubEnv('NEON_AUTH_BASE_URL', 'https://auth.example.test');
  vi.stubEnv('COMMAND_AUTH_BASE_URL', '');
  vi.stubEnv('NEON_AUTH_COOKIE_SECRET', 'test-only-secret-with-at-least-32-characters');
  session.mockReset();
});
it('uses the manual Auth URL for both validation and the SDK when the managed URL is provisioning', async () => {
  vi.stubEnv('NEON_AUTH_BASE_URL', 'provisioning');
  vi.stubEnv('COMMAND_AUTH_BASE_URL', '  https://manual-auth.example.test/neondb/auth  ');
  expect(isAuthConfigured()).toBe(true);
  session.mockResolvedValue(valid());
  expect(await requireWorkspaceId()).toBe('user:alice');
  expect(createAuth).toHaveBeenCalledWith(
    expect.objectContaining({ baseUrl: 'https://manual-auth.example.test/neondb/auth' }),
  );
});
it('accepts the managed URL when the optional override is blank', () => {
  vi.stubEnv('COMMAND_AUTH_BASE_URL', '  ');
  expect(isAuthConfigured()).toBe(true);
  vi.stubEnv('NEON_AUTH_BASE_URL', 'provisioning');
  expect(isAuthConfigured()).toBe(false);
});
it.each([
  'provisioning',
  'http://auth.example.test',
  'https://user:password@auth.example.test',
  'https://auth.example.test/?key=test',
  'https://auth.example.test/#test',
])('fails closed for an invalid explicit override: %s', async (url) => {
  vi.stubEnv('COMMAND_AUTH_BASE_URL', url);
  expect(isAuthConfigured()).toBe(false);
  await expect(requireWorkspaceId()).rejects.toMatchObject({ status: 503 });
  expect(session).not.toHaveBeenCalled();
});
afterEach(() => vi.unstubAllEnvs());
const valid = () => ({
  data: {
    user: { id: 'alice', emailVerified: true },
    session: { userId: 'alice', expiresAt: new Date(Date.now() + 60_000) },
  },
});
it('derives ownership from a fresh verified provider session', async () => {
  session.mockResolvedValue(valid());
  expect(await requireWorkspaceId()).toBe('user:alice');
  expect(session).toHaveBeenCalledWith({
    query: { disableCookieCache: 'true', disableRefresh: true },
  });
});
it('keeps Vercel protected even if COMMAND_HOSTED is false', async () => {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('COMMAND_HOSTED', 'false');
  session.mockResolvedValue({ data: null });
  await expect(requireWorkspaceId()).rejects.toMatchObject({ status: 401 });
});
it('preserves the local workspace without calling an auth service', async () => {
  vi.stubEnv('COMMAND_HOSTED', 'false');
  expect(await requireWorkspaceId()).toBe('local');
  expect(session).not.toHaveBeenCalled();
});
it('fails closed when configuration is missing', async () => {
  vi.stubEnv('NEON_AUTH_COOKIE_SECRET', '');
  await expect(requireWorkspaceId()).rejects.toMatchObject({ status: 503 });
  expect(session).not.toHaveBeenCalled();
});
it.each(['missing', 'expired', 'invalid expiry', 'mismatched user', 'unverified'])(
  'rejects a %s session',
  async (reason) => {
    const result = valid();
    if (reason === 'expired') result.data.session.expiresAt = new Date(0);
    if (reason === 'invalid expiry') result.data.session.expiresAt = new Date(NaN);
    if (reason === 'mismatched user') result.data.session.userId = 'bob';
    if (reason === 'unverified') result.data.user.emailVerified = false;
    session.mockResolvedValue(reason === 'missing' ? { data: null } : result);
    await expect(requireWorkspaceId()).rejects.toMatchObject({
      status: reason === 'unverified' ? 403 : 401,
    });
  },
);
it('does not expose provider errors', async () => {
  session.mockRejectedValue(new Error('private-provider-token'));
  await expect(requireWorkspaceId()).rejects.toMatchObject({
    status: 503,
    message: 'Sign-in is temporarily unavailable. Please try again later.',
  });
});
