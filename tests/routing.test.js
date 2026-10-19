import test from 'node:test';
import assert from 'node:assert/strict';
import { appUrl, safeReturnUrl } from '../src/routing.js';

test('project URLs keep nested detail and return routes under the GitHub Pages base', () => {
  const base = '/course-pathways/';
  const results = appUrl({ view: 'results', mode: 'pathways', q: 'Design & 数据' }, base);
  const path = appUrl({ view: 'detail', mode: 'pathways', id: 'pathway-01', from: results }, base);
  assert.ok(path.startsWith(base + '?'));
  const params = new URL(path, 'https://example.github.io').searchParams;
  assert.equal(safeReturnUrl(params.get('from'), base, base), results);
  assert.equal(safeReturnUrl('/?view=results&q=legacy', base, base), base + '?view=results&q=legacy');
  assert.equal(appUrl(undefined, base), base);
});

test('return validation rejects external hosts and other project paths', () => {
  const base = '/course-pathways/';
  for (const bad of ['//evil.example/?view=results&q=x', '/other-project/?view=results&q=x', '/course-pathways/../?view=bad', 'https://example.github.io/course-pathways/?view=results&q=x', '/\\evil.example/?view=results&q=x']) {
    assert.equal(safeReturnUrl(bad, base, base), base);
  }
});
