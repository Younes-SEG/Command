import { spawn } from 'node:child_process';

// Disable framework telemetry for local development, builds and the downloaded app.
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  },
);
child.on('error', () => {
  console.error('Could not start Next.js. Run npm install first.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
