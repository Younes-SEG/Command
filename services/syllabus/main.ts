import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isSyllabusAiConfigured } from '../../src/lib/server/syllabus-ai';
import { UsageLimits } from './limits';
import { createSyllabusServer } from './server';

function number(name: string, fallback: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error(`Invalid ${name}.`);
  return value;
}
const dir = resolve(process.env.SYLLABUS_DATA_DIR || '.syllabus-service');
mkdirSync(dir, { recursive: true });
const usage = new UsageLimits(join(dir, 'usage.sqlite'), process.env.SYLLABUS_LIMIT_SALT || '', {
  networkDaily: number('SYLLABUS_NETWORK_DAILY', 20, 1000),
  globalDaily: number('SYLLABUS_GLOBAL_DAILY', 100, 10000),
  globalMonthly: number('SYLLABUS_GLOBAL_MONTHLY', 500, 100000),
});
const hops = Number(process.env.SYLLABUS_TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(hops) || hops < 0 || hops > 5)
  throw new Error('Invalid proxy configuration.');
usage.prune();
const pruning = setInterval(() => usage.prune(), 60 * 60 * 1000);
pruning.unref();
const server = createSyllabusServer({
  usage,
  trustedProxyHops: hops,
  ready: () => process.env.SYLLABUS_ENABLED === 'true' && isSyllabusAiConfigured(),
});
server.listen(number('PORT', 8080, 65535), process.env.SYLLABUS_BIND || '127.0.0.1', () => {
  console.log('Command syllabus service started. Request content logging is disabled.');
});
function close() {
  clearInterval(pruning);
  server.close(() => {
    usage.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 150_000).unref();
}
process.on('SIGTERM', close);
process.on('SIGINT', close);
