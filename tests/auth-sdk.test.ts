import { afterEach, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import {
  createAuthServer,
  NEON_AUTH_SESSION_COOKIE_NAME,
  NEON_AUTH_SESSION_DATA_COOKIE_NAME,
} from '@neondatabase/auth/server';

afterEach(() => vi.unstubAllGlobals());
it('checks revocation upstream even when the SDK has a valid signed session cache', async () => {
  const secret = 'test-only-signing-secret-at-least-32-characters';
  const cached = {
    user: { id: 'alice', emailVerified: true },
    session: {
      id: 'session',
      userId: 'alice',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    },
  };
  const cookie = await new SignJWT(cached)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret));
  const upstream = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ message: 'Revoked' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  vi.stubGlobal('fetch', upstream);
  const auth = createAuthServer({
    baseUrl: 'https://auth.example.test',
    cookieSecret: secret,
    context: async () => ({
      getCookies: () =>
        `${NEON_AUTH_SESSION_COOKIE_NAME}=test-session; ${NEON_AUTH_SESSION_DATA_COOKIE_NAME}=${cookie}`,
      getOrigin: () => 'https://command.example.test',
      getFramework: () => 'nextjs',
      getHeader: () => null,
      setCookie: () => {},
    }),
  });
  const result = await auth.getSession({
    query: { disableCookieCache: 'true', disableRefresh: true },
  });
  expect(upstream).toHaveBeenCalledTimes(1);
  expect(String(upstream.mock.calls[0][0])).toContain('disableCookieCache=true');
  expect(result.data).toBeNull();
  expect(result.error?.status).toBe(401);
});
