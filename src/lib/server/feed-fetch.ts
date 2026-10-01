import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { request } from 'node:https';
import { ApiError } from './errors';

const blocked = new BlockList();
const blockedV6 = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
] as const)
  blocked.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of [
  ['::', 96],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const)
  blockedV6.addSubnet(network, prefix, 'ipv6');

export function isPublicAddress(address: string) {
  const family = isIP(address);
  return family === 4
    ? !blocked.check(address, 'ipv4')
    : family === 6 && !blockedV6.check(address, 'ipv6');
}

export function normalizeFeedUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim().replace(/^webcal:/i, 'https:'));
  } catch {
    throw new ApiError(400, 'Enter a valid calendar subscription link.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443'))
    throw new ApiError(
      400,
      'Use an HTTPS or webcal subscription link without a username or password.',
    );
  url.hash = '';
  return url.toString();
}

/** Resolve and pin a public address on every hop; never forward cookies or credentials. */
export async function fetchCalendarFeed(value: string, redirects = 0): Promise<string> {
  if (redirects > 3) throw new ApiError(400, 'The calendar link redirects too many times.');
  const url = new URL(normalizeFeedUrl(value));
  try {
    const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true });
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
      throw new ApiError(400, 'Use a publicly accessible calendar subscription link.');
    const address = addresses[0];
    const result = await new Promise<{ body?: string; redirect?: string }>((resolve, reject) => {
      const req = request(
        url,
        {
          agent: false,
          headers: { Accept: 'text/calendar', 'Accept-Encoding': 'identity' },
          lookup: (_host, options, callback) => {
            if (options.all) callback(null, [address]);
            else callback(null, address.address, address.family);
          },
        },
        (response) => {
          if (
            [301, 302, 303, 307, 308].includes(response.statusCode || 0) &&
            response.headers.location
          ) {
            response.resume();
            resolve({ redirect: new URL(response.headers.location, url).toString() });
            return;
          }
          if (response.statusCode !== 200) {
            response.resume();
            reject(
              new ApiError(
                400,
                'The calendar could not be downloaded. Check that the subscription link is still enabled.',
              ),
            );
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > 2_000_000)
              req.destroy(new ApiError(400, 'The calendar exceeds the 2 MB import limit.'));
            else chunks.push(chunk);
          });
          response.on('error', reject);
          response.on('end', () => resolve({ body: Buffer.concat(chunks).toString('utf8') }));
        },
      );
      const deadline = setTimeout(
        () =>
          req.destroy(
            new ApiError(400, 'The calendar server took too long to respond. Try again.'),
          ),
        15000,
      );
      req.on('close', () => clearTimeout(deadline));
      req.on('error', reject);
      req.end();
    });
    return result.redirect ? fetchCalendarFeed(result.redirect, redirects + 1) : result.body!;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Network errors can contain the private subscription URL. Never log or expose them.
    throw new ApiError(
      400,
      'Unable to reach the calendar. Check your connection and subscription link.',
    );
  }
}
