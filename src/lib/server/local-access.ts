const loopback = new Set(['localhost', '127.0.0.1', '[::1]', '::1', '::ffff:127.0.0.1']);

function localHost(host: string) {
  try {
    return loopback.has(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}

/** Defense in depth for the local edition, not a substitute for hosted authentication. */
export function isLocalWorkspaceRequest(headers: Headers) {
  const host = headers.get('host');
  if (!host || !localHost(host)) return false;
  if (headers.get('sec-fetch-site') === 'cross-site') return false;
  const forwardedHost = headers.get('x-forwarded-host');
  if (forwardedHost && forwardedHost.split(',').some((value) => !localHost(value.trim())))
    return false;
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor && forwardedFor.split(',').some((value) => !loopback.has(value.trim())))
    return false;
  if (headers.has('forwarded')) return false;
  return true;
}
