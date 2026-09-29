import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

if (!existsSync('.env')) copyFileSync('.env.example', '.env');
const databaseDir = resolve('.postgres');
const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'folio',
  password: 'folio_local',
  port: 54329,
  persistent: true,
  authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: (message) => {
    if (/FATAL|ERROR/.test(String(message))) console.error(String(message));
  },
});
const probe = new Client({
  connectionString: 'postgresql://folio:folio_local@127.0.0.1:54329/postgres',
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
} catch (error) {
  console.error('Could not start local PostgreSQL:', error.message);
  console.error('Check that port 54329 is free and package install scripts have been allowed.');
  process.exitCode = 1;
}
