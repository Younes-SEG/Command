import { ApiError } from './errors';
import { isHosted } from './hosting';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Next normalizes a loopback request URL to localhost; Host retains the browser's address. */
export function assertSameOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  let expectedOrigin = requestUrl.origin;
  const host = request.headers.get('host');
  if (host && loopbackHosts.has(requestUrl.hostname)) {
    try {
      const browserUrl = new URL(`${requestUrl.protocol}//${host}`);
      if (loopbackHosts.has(browserUrl.hostname) && browserUrl.port === requestUrl.port) {
        expectedOrigin = browserUrl.origin;
      }
    } catch {
      /* An invalid host never expands the accepted origin. */
    }
  }
  const origin = request.headers.get('origin');
  const changesData = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (
    (isHosted() && changesData && !origin) ||
    (origin && origin !== expectedOrigin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    throw new ApiError(403, 'Changes must come from this application.');
  }
}
