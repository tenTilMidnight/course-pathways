import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const sources = ['server.mjs', ...readdirSync('scripts').filter(file => file.endsWith('.mjs')).map(file => `scripts/${file}`), ...readdirSync('src').filter(file => file.endsWith('.js')).map(file => `src/${file}`)];
for (const source of sources) {
  const result = spawnSync(process.execPath, ['--check', source], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax checked ${sources.length} JavaScript files.`);
