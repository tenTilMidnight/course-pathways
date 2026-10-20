import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

test('the public build contains neither personal review modules nor their route entry points', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const build = spawnSync(process.execPath, ['scripts/build-site.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr);
  const files = await readdir(new URL('../dist/src/', import.meta.url));
  assert.ok(files.every(name => !name.startsWith('local-') && !name.startsWith('connection-experiment')));
  for (const name of ['connections-view.js', 'connections-view.css', 'connections-layout.js']) assert.ok(files.includes(name), 'public Overview dependency: ' + name);
  for (const name of files.filter(name => name.endsWith('.js'))) {
    const text = await readFile(new URL(`../dist/src/${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /local-grace|gracePathway|grace-2025|pathway-review|connection-review|course-review|notes\/data\/grace/);
  }
});
