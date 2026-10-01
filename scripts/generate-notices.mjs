import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = process.cwd();
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const sections = [
  'Command — third-party notices\nGenerated from package-lock.json. Includes installed production packages and available licence texts. Optional packages absent on this platform are identified by their declared licence. Preserve package sources and notices when redistributing.\n',
];
let count = 0;
for (const [relative, entry] of Object.entries(lock.packages).sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  if (!relative || entry.dev) continue;
  const directory = resolve(root, relative);
  if (
    !directory.startsWith(resolve(root, 'node_modules') + '\\') &&
    !directory.startsWith(resolve(root, 'node_modules') + '/')
  )
    throw new Error('Package path outside node_modules');
  const installed = existsSync(join(directory, 'package.json'));
  const pkg = installed ? JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) : entry;
  const repository = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  sections.push(
    `\n${'='.repeat(72)}\n${pkg.name || relative.replace(/^.*node_modules\//, '')} ${entry.version}\nDeclared licence: ${JSON.stringify(pkg.license || entry.license || 'Review package source')}\nSource: ${repository || entry.resolved || 'See package registry'}\n`,
  );
  if (installed) {
    for (const file of readdirSync(directory, { withFileTypes: true })) {
      if (file.isFile() && /^(licen[cs]e|copying|notice)(\.|$|-)/i.test(file.name)) {
        sections.push(`${file.name}\n${readFileSync(join(directory, file.name), 'utf8')}\n`);
      }
    }
  }
  count++;
}
// Next ships compiled dependencies with separate notices.
function bundledNotices(directory) {
  for (const file of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, file.name);
    if (file.isDirectory()) bundledNotices(path);
    else if (file.isFile() && /^(licen[cs]e|copying|notice)(\.|$|-)/i.test(file.name))
      sections.push(`\n${path.slice(root.length + 1)}\n${readFileSync(path, 'utf8')}\n`);
  }
}
bundledNotices(resolve('node_modules/next/dist/compiled'));
mkdirSync('public', { recursive: true });
writeFileSync('public/third-party-notices.txt', sections.join('\n'));
// MPL-covered source is downloadable alongside the shipped application.
mkdirSync('public/licenses/ical.js', { recursive: true });
cpSync('node_modules/ical.js/lib', 'public/licenses/ical.js/lib', { recursive: true });
for (const name of ['LICENSE', 'package.json'])
  if (existsSync(`node_modules/ical.js/${name}`))
    cpSync(`node_modules/ical.js/${name}`, `public/licenses/ical.js/${name}`);
const source = [
  'ical.js unmodified source (MPL-2.0). Individual files are also served under /licenses/ical.js/.\n',
];
function collectSource(directory, prefix = '') {
  for (const file of readdirSync(directory, { withFileTypes: true })) {
    const name = `${prefix}${file.name}`;
    if (file.isDirectory()) collectSource(join(directory, file.name), `${name}/`);
    else if (file.isFile())
      source.push(`\n===== ${name} =====\n${readFileSync(join(directory, file.name), 'utf8')}`);
  }
}
collectSource('public/licenses/ical.js');
writeFileSync('public/licenses/ical-source.txt', source.join('\n'));
console.log(
  `Wrote notices for ${count} production packages and Next bundled dependencies. Included unmodified ical.js source.`,
);
