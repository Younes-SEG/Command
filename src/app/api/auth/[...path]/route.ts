import { getAuth } from '@/lib/server/auth';
import { isHosted } from '@/lib/server/hosting';
import { assertSameOrigin } from '@/lib/server/origin';
import { ApiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
const publicEndpoints = new Set([
  'get-session',
  'sign-in/email',
  'sign-up/email',
  'sign-out',
  'request-password-reset',
  'reset-password',
  'verify-email',
  'send-verification-email',
]);

async function handle(request: Request, context: Context) {
  try {
    if (!isHosted())
      return Response.json(
        { error: 'Accounts are available in the hosted edition.' },
        { status: 404 },
      );
    const { path } = await context.params;
    if (!publicEndpoints.has(path.join('/')))
      return Response.json({ error: 'Not found.' }, { status: 404 });
    if (request.method === 'POST') {
      assertSameOrigin(request);
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
        throw new ApiError(415, 'Send JSON.');
      const reader = request.body?.getReader();
      if (!reader) throw new ApiError(400, 'Missing request.');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 16_384) {
            await reader.cancel();
            throw new ApiError(413, 'This request is too large.');
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      request = new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: Buffer.concat(chunks),
        signal: request.signal,
      });
    }
    const response = await (
      await getAuth()
    )
      .handler()
      [request.method as 'GET' | 'POST'](request, context);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    return Response.json(
      {
        error: {
          message:
            error instanceof ApiError ? error.message : 'Sign-in is temporarily unavailable.',
        },
      },
      {
        status: error instanceof ApiError ? error.status : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
export const GET = handle;
export const POST = handle;
