import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureLocalEnv } from '../scripts/local-env.mjs';

const directories: string[] = [];
function fixture() {
  const path = mkdtempSync(join(tmpdir(), 'command-config-test-'));
  directories.push(path);
  return path;
}
afterEach(() => {
  for (const path of directories.splice(0)) {
    if (!path.startsWith(join(tmpdir(), 'command-config-test-')))
      throw new Error('Unexpected test path');
    rmSync(path, { recursive: true, force: true });
  }
});
describe('new installation credentials', () => {
  it('generates distinct passwords and preserves existing credentials', () => {
    const first = fixture();
    const second = fixture();
    const a = ensureLocalEnv(first);
    const b = ensureLocalEnv(second);
    expect(a.DATABASE_URL).not.toEqual(b.DATABASE_URL);
    expect(new URL(a.DATABASE_URL).password).toMatch(/^[a-f0-9]{48}$/);
    const before = readFileSync(join(first, '.env'), 'utf8');
    ensureLocalEnv(first);
    expect(readFileSync(join(first, '.env'), 'utf8')).toEqual(before);
  });
  it('does not invent credentials for an existing database', () => {
    const path = fixture();
    mkdirSync(join(path, '.postgres'));
    writeFileSync(join(path, '.postgres/PG_VERSION'), '18');
    expect(() => ensureLocalEnv(path)).toThrow('Restore its original .env');
  });
});
