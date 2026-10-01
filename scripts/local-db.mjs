import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { ensureLocalEnv } from './local-env.mjs';

const configuration = ensureLocalEnv();
const databaseUrl = new URL(process.env.DATABASE_URL || configuration.DATABASE_URL);
if (
  databaseUrl.hostname !== '127.0.0.1' ||
  databaseUrl.port !== '54329' ||
  databaseUrl.pathname !== '/folio' ||
  !databaseUrl.password
)
  throw new Error(
    'db:local requires a password-protected database at 127.0.0.1:54329/folio. For a custom database, start it separately and run setup.',
  );
const probeUrl = new URL(databaseUrl);
probeUrl.pathname = '/postgres';
const databaseDir = resolve('.postgres');
const pg = new EmbeddedPostgres({
  databaseDir,
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  port: 54329,
  persistent: true,
  authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: (message) => {
    if (/FATAL|ERROR/.test(String(message)))
      console.error(
        'Local PostgreSQL reported an error. Details omitted to protect workspace data.',
      );
  },
});
const probe = new Client({
  connectionString: probeUrl.toString(),
  connectionTimeoutMillis: 1500,
});
let running = false;
try {
  await probe.connect();
  running = true;
} catch {
} finally {
  await probe.end().catch(() => {});
}
if (running) {
  console.log('Local PostgreSQL is already running on port 54329.');
  process.exit(0);
}
try {
  if (!existsSync(resolve(databaseDir, 'PG_VERSION'))) {
    console.log('Creating your local PostgreSQL database…');
    await pg.initialise();
  }
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  const { rows } = await client.query("SELECT 1 FROM pg_database WHERE datname='folio'");
  if (!rows.length) await client.query('CREATE DATABASE folio');
  await client.end();
  console.log('PostgreSQL is ready on 127.0.0.1:54329. Data is saved in .postgres/.');
  console.log(
    'Keep this terminal open. In another terminal, run: npm run setup, then npm run dev.',
  );
  const keepAlive = setInterval(() => {}, 60000);
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    clearInterval(keepAlive);
    await pg.stop();
    process.exit(0);
  }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch {
  console.error(
    'Could not start local PostgreSQL. Check the local configuration and database permissions.',
  );
  console.error('Check that port 54329 is free and package install scripts have been allowed.');
  process.exitCode = 1;
}
