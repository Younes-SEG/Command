import { NextResponse, type NextRequest } from 'next/server';
import { isLocalWorkspaceRequest } from '@/lib/server/local-access';
import { isHosted } from '@/lib/server/hosting';
import { getAuth, isAuthConfigured } from '@/lib/server/auth';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (isHosted()) {
    // Every data endpoint also verifies identity in its server data-access functions.
    // Auth pages, including password reset, must remain reachable while signed out.
    let response: NextResponse;
    if (path.startsWith('/legal/') || path.startsWith('/auth/') || path.startsWith('/api/')) {
      response = NextResponse.next();
    } else if (!isAuthConfigured()) {
      response = NextResponse.redirect(new URL('/auth/sign-in', request.url));
    } else {
      try {
        response = await (await getAuth()).middleware({ loginUrl: '/auth/sign-in' })(request);
      } catch {
        response = NextResponse.redirect(new URL('/auth/sign-in', request.url));
      }
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  if (
    !request.nextUrl.pathname.startsWith('/legal/') &&
    !isLocalWorkspaceRequest(request.headers)
  ) {
    return new NextResponse(
      'Command’s workspace is local-only. Run it on your own computer. Public hosting requires authentication and isolated user data.',
      {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      },
    );
  }
  const response = NextResponse.next();
  if (!request.nextUrl.pathname.startsWith('/legal/'))
    response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.svg|third-party-notices.txt|licenses/).*)'],
};
