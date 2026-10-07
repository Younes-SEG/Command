import { cache } from 'react';
import type { createNeonAuth } from '@neondatabase/auth/next/server';
import { ApiError } from './errors';
import { isHosted, LOCAL_WORKSPACE_ID } from './hosting';

// Owner-controlled escape hatch when an integration-managed URL is stuck at
// "provisioning". A non-empty override must pass validation; never silently
// switch providers when an explicitly configured override is invalid.
function authBaseUrl() {
  return process.env.COMMAND_AUTH_BASE_URL?.trim() || process.env.NEON_AUTH_BASE_URL?.trim() || '';
}

export function isAuthConfigured() {
  try {
    const url = new URL(authBaseUrl());
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (process.env.NEON_AUTH_COOKIE_SECRET?.length ?? 0) >= 32
    );
  } catch {
    return false;
  }
}

let auth: ReturnType<typeof createNeonAuth> | undefined;
export async function getAuth() {
  if (!isAuthConfigured())
    throw new ApiError(503, 'Sign-in is not available yet. Please try again later.');
  // Load Next's request APIs only in hosted mode, so local maintenance scripts work in Node.
  const { createNeonAuth } = await import('@neondatabase/auth/next/server');
  return (auth ??= createNeonAuth({
    baseUrl: authBaseUrl(),
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET!, sessionDataTtl: 60, sameSite: 'lax' },
    logLevel: 'silent',
  }));
}

// React cache is request-scoped, never a cross-user session cache. Authorize with
// the provider on every request; middleware cookie checks are only an optimization.
const verifiedAccount = cache(async () => {
  try {
    // Neon Auth 0.5 compares this option to the string "true" before contacting
    // the provider. A boolean bypasses only the upstream cache, not the SDK cache.
    const { data, error } = await (
      await getAuth()
    ).getSession({ query: { disableCookieCache: 'true', disableRefresh: true } });
    if (error)
      throw new ApiError(
        error.status === 401 ? 401 : 503,
        'Unable to verify your session. Please sign in again.',
      );
    const expires = data?.session ? new Date(data.session.expiresAt).getTime() : NaN;
    if (
      !data?.user?.id ||
      !data.session ||
      data.session.userId !== data.user.id ||
      !Number.isFinite(expires) ||
      expires <= Date.now()
    )
      throw new ApiError(401, 'Sign in to open your workspace.');
    if (!data.user.emailVerified)
      throw new ApiError(403, 'Verify your email to open your workspace.');
    return data.user;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, 'Sign-in is temporarily unavailable. Please try again later.');
  }
});

export async function requireWorkspaceId(): Promise<string> {
  if (!isHosted()) return LOCAL_WORKSPACE_ID;
  const user = await verifiedAccount();
  // Derived solely from the validated identity, never a client-supplied workspace ID.
  return `user:${user.id}`;
}
