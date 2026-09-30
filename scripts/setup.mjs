import { existsSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
if (!existsSync('.env')) copyFileSync('.env.example', '.env');
function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
run('node_modules/prisma/build/index.js', ['generate']);
run('node_modules/prisma/build/index.js', ['migrate', 'deploy']);
if (!process.argv.includes('--empty')) run('node_modules/tsx/dist/cli.mjs', ['prisma/seed.ts']);
console.log('Command is ready. Run npm run dev, then open http://127.0.0.1:3000.');
