import { NextResponse, type NextRequest } from 'next/server';
import { isLocalWorkspaceRequest } from '@/lib/server/local-access';

export function proxy(request: NextRequest) {
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
