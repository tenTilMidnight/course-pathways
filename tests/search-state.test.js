import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchHistory, validateQuery, MAX_HISTORY_PER_MODE } from '../src/search-state.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('empty and excessively long searches are not accepted; meaningful whitespace is normalized', () => {
  assert.equal(validateQuery('  \n\t ').ok, false);
  assert.equal(validateQuery('x'.repeat(121)).ok, false);
  assert.deepEqual(validateQuery('  Information   Systems  '), { ok: true, query: 'Information Systems' });
});

test('histories persist, remain separated by university and mode, and delete only the selected record', () => {
  const storage = memoryStorage();
  const cmu = createSearchHistory(storage, 'cmu');
  cmu.add('pathways', 'Data science');
  cmu.add('courses', 'Data science');
  const refreshed = createSearchHistory(storage, 'cmu');
  assert.equal(refreshed.list('pathways').length, 1);
  assert.equal(refreshed.list('courses').length, 1);
  assert.equal(createSearchHistory(storage, 'another-campus').list('courses').length, 0);
  refreshed.remove('pathways', 'Data science');
  assert.equal(createSearchHistory(storage, 'cmu').list('pathways').length, 0);
  assert.equal(refreshed.list('courses').length, 1);
});

test('repeated searches update one entry, and history stays bounded', () => {
  const history = createSearchHistory(memoryStorage(), 'cmu');
  history.add('pathways', 'Product management');
  history.add('pathways', ' PRODUCT   MANAGEMENT ');
  assert.equal(history.list('pathways').length, 1);
  for (let i = 0; i < 15; i++) history.add('courses', `Course ${i}`);
  assert.equal(history.list('courses').length, MAX_HISTORY_PER_MODE);
  assert.equal(history.list('pathways').length, 1);
});

test('corrupt saved data is recovered; malformed records never reach the history UI', () => {
  const storage = memoryStorage();
  const key = 'course-pathways:cmu:search-history:v1';
  storage.setItem(key, '{not-json');
  const recovered = createSearchHistory(storage, 'cmu');
  recovered.add('courses', 'Database design');
  assert.equal(createSearchHistory(storage, 'cmu').list('courses')[0].query, 'Database design');
  storage.setItem(key, JSON.stringify({ version: 1, entries: [null, {}, { mode: 'courses', query: {}, createdAt: 1 }, { mode: 'pathways', query: '   ', createdAt: 1 }] }));
  assert.deepEqual(createSearchHistory(storage, 'cmu').list('pathways'), []);
});

test('unavailable storage falls back to usable, deletable in-session history', () => {
  const blocked = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Quota'); } };
  const history = createSearchHistory(blocked, 'cmu');
  assert.equal(history.add('courses', 'HCI'), true);
  assert.equal(history.persistent, false);
  history.add('courses', 'Design');
  assert.equal(history.list('courses').length, 2);
  history.remove('courses', 'HCI');
  assert.equal(history.list('courses')[0].query, 'Design');
});

test('another tab deleting an entry is respected before subsequent saves', () => {
  const storage = memoryStorage();
  const tabA = createSearchHistory(storage, 'cmu');
  const tabB = createSearchHistory(storage, 'cmu');
  tabA.add('courses', 'HCI');
  tabB.remove('courses', 'HCI');
  tabA.add('courses', 'Design');
  assert.deepEqual(tabA.list('courses').map(entry => entry.query), ['Design']);
});
