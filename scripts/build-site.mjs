import { mkdir, readdir, readFile, rm, copyFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
if (relative(root, output) !== 'dist' || !output.startsWith(root + sep)) throw new Error('Invalid build directory');
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'src'), { recursive: true });
const excluded = new Set(['course-graph-view.js', 'connection-routing.js']);
const assets = (await readdir(resolve(root, 'src'))).filter(name => /\.(js|css|woff2)$/.test(name) && !excluded.has(name) && !name.startsWith('connection-experiment') && !name.startsWith('local-'));
for (const name of assets) await copyFile(resolve(root, 'src', name), resolve(output, 'src', name));
for (const name of ['index.html', 'favicon.svg']) await copyFile(resolve(root, name), resolve(output, name));
const appPath = resolve(output, 'src/app.js');
const appSource = await readFile(appPath, 'utf8');
await writeFile(appPath, appSource.replace(/\/\/ LOCAL_EXPERIMENT_START[\s\S]*?\/\/ LOCAL_EXPERIMENT_END\r?\n/, ''));
await writeFile(resolve(output, '.nojekyll'), '');
// Fail before publishing if an imported local module is missing from the public artifact.
for (const name of assets.filter(name => name.endsWith('.js'))) {
  const code = await readFile(resolve(output, 'src', name), 'utf8');
  const imports = [...code.matchAll(/(?:from\s+|import\s*\(\s*)['"](.\/[^'"]+)['"]/g)];
  for (const [, path] of imports) await readFile(resolve(output, 'src', path));
}
console.log(`Built ${assets.length + 3} public assets in dist; personal reviews, notes, docs, tests and the standalone experiment are excluded.`);
