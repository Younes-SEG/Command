import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { parse } from 'dotenv';

export function ensureLocalEnv(directory = process.cwd()) {
  const file = join(directory, '.env');
  if (!existsSync(file)) {
    if (existsSync(join(directory, '.postgres', 'PG_VERSION')))
      throw new Error(
        'An existing database has no .env configuration. Restore its original .env before starting; a new password cannot unlock it.',
      );
    const password = randomBytes(24).toString('hex');
    writeFileSync(
      file,
      `DATABASE_URL="postgresql://folio:${password}@127.0.0.1:54329/folio?schema=public"\nNEXT_TELEMETRY_DISABLED=1\n`,
      { mode: 0o600, flag: 'wx' },
    );
  }
  // Never overwrite an existing installation's connection string or credentials.
  return parse(readFileSync(file));
}
