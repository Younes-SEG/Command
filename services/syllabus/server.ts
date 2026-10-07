import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { isIP, Socket } from 'node:net';
import { z } from 'zod';
import { ApiError } from '../../src/lib/server/errors';
import { readSyllabusWithAi, type SyllabusAiInput } from '../../src/lib/server/syllabus-ai';
import { inspectSyllabusUpload, MAX_SYLLABUS_BYTES } from '../../src/lib/server/syllabus-text';
import type { SyllabusPreview } from '../../src/lib/syllabus-result';
import type { UsageLimits } from './limits';

const courseSchema = z
  .object({
    code: z.string().min(1).max(100),
    name: z.string().min(1).max(300),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
  })
  .strict()
  .refine((c) => c.startDate <= c.endDate);
const uploadSchema = z
  .object({
    kind: z.enum(['pdf', 'text']),
    document: z
      .string()
      .min(4)
      .max(Math.ceil(MAX_SYLLABUS_BYTES / 3) * 4),
    course: courseSchema,
  })
  .strict();
const MAX_BODY = Math.ceil(MAX_SYLLABUS_BYTES / 3) * 4 + 10_000;

function reply(res: ServerResponse, status: number, body: unknown) {
  if (res.destroyed) return;
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(status === 429 ? { 'Retry-After': '3600' } : {}),
  });
  res.end(JSON.stringify(body));
}

export function networkAddress(req: IncomingMessage, trustedProxyHops: number) {
  // Only enable behind a verified proxy chain with direct origin ingress blocked.
  const forwarded = req.headers['x-forwarded-for'];
  const chain = typeof forwarded === 'string' ? forwarded.split(',').map((s) => s.trim()) : [];
  const address = trustedProxyHops ? chain.at(-trustedProxyHops) : req.socket.remoteAddress;
  if (!address || !isIP(address)) throw new ApiError(400, 'Invalid network request.');
  // Normalize equivalent IP spellings and group IPv6 /64 to resist address rotation.
  if (isIP(address) === 4) return address;
  const expanded = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  if (expanded.startsWith('::ffff:')) {
    const parts = expanded
      .slice(7)
      .split(':')
      .map((n) => parseInt(n, 16));
    if (parts.length === 2)
      return `${parts[0] >> 8}.${parts[0] & 255}.${parts[1] >> 8}.${parts[1] & 255}`;
  }
  const [left, right = ''] = expanded.split('::');
  const first = left ? left.split(':') : [];
  const last = right ? right.split(':') : [];
  const words = expanded.includes('::')
    ? [...first, ...Array(8 - first.length - last.length).fill('0'), ...last]
    : first;
  return `${words
    .slice(0, 4)
    .map((w) => parseInt(w, 16).toString(16))
    .join(':')}::/64`;
}

export function createSyllabusServer(options: {
  usage: Pick<UsageLimits, 'reserve'>;
  ready: () => boolean;
  trustedProxyHops?: number;
  read?: (input: SyllabusAiInput, signal?: AbortSignal) => Promise<SyllabusPreview>;
}) {
  let active = false;
  const server = createServer(
    { maxHeaderSize: 8192, requestTimeout: 30_000, headersTimeout: 15_000 },
    async (req, res) => {
      if (req.url === '/health' && req.method === 'GET') {
        reply(res, options.ready() ? 200 : 503, { available: options.ready() });
        return;
      }
      if (req.url !== '/v1/syllabus' || req.method !== 'POST') {
        reply(res, 404, { error: 'Not found.' });
        return;
      }
      if (!options.ready()) {
        reply(res, 503, { error: 'Syllabus reader is unavailable.' });
        return;
      }
      if (active) {
        reply(res, 429, { error: 'The reader is busy. Please try again later.' });
        return;
      }
      active = true;
      const controller = new AbortController();
      const onClose = () => {
        if (!res.writableEnded) controller.abort();
      };
      res.on('close', onClose);
      // Enforce a body deadline even when small chunks keep the socket active.
      const uploadTimer = setTimeout(() => req.destroy(), 30_000);
      try {
        if (req.headers['content-type'] !== 'application/json' || req.headers['content-encoding'])
          throw new ApiError(415, 'Send an uncompressed JSON upload.');
        if (Number(req.headers['content-length']) > MAX_BODY)
          throw new ApiError(413, 'File too large.');
        const network = networkAddress(req, options.trustedProxyHops ?? 0);
        const chunks: Buffer[] = [];
        let size = 0;
        // Avoid destroying the socket on validation errors so clients can read the response.
        for await (const chunk of req.iterator({ destroyOnReturn: false })) {
          size += chunk.length;
          if (size > MAX_BODY) throw new ApiError(413, 'File too large.');
          chunks.push(chunk);
        }
        clearTimeout(uploadTimer);
        let raw: unknown;
        try {
          raw = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          throw new ApiError(400, 'Invalid upload.');
        }
        const parsed = uploadSchema.safeParse(raw);
        if (!parsed.success) throw new ApiError(400, 'Invalid document or course context.');
        const { kind, document, course } = parsed.data;
        const bytes = Buffer.from(document, 'base64');
        if (bytes.toString('base64') !== document)
          throw new ApiError(400, 'Invalid document encoding.');
        const inspected = await inspectSyllabusUpload(bytes, kind);
        controller.signal.throwIfAborted();
        options.usage.reserve(network);
        const result = await (options.read ?? readSyllabusWithAi)(
          { bytes, kind, course, ...inspected },
          controller.signal,
        );
        reply(res, 200, result);
      } catch (error) {
        // Do not log body, course, filename, provider response, IP address or credentials.
        reply(res, error instanceof ApiError ? error.status : 503, {
          error:
            error instanceof ApiError
              ? error.message
              : 'Syllabus reader is unavailable. Please try again later.',
        });
      } finally {
        clearTimeout(uploadTimer);
        res.off('close', onClose);
        active = false;
        // Don't retain an unread body on a keep-alive connection after rejecting an upload.
        if (!req.complete) res.once('finish', () => req.destroy());
      }
    },
  );
  server.maxConnections = 50;
  server.keepAliveTimeout = 5000;
  server.on('clientError', (_error, socket) => {
    if (socket instanceof Socket) socket.destroy();
  });
  return server;
}
