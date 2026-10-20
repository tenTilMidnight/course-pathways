import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedGrace, pathways } from '../src/public-catalog.js';
import { gracePathway } from '../src/local-grace-data.js';
import { projectGrace } from '../scripts/publish-grace.mjs';
import { searchCatalog } from '../src/results-state.js';
import { enrollments } from '../src/pathway-model.js';
import { learningGraph } from '../src/learning-graph.js';
import { safeReturnUrl, appUrl } from '../src/routing.js';

test('Grace appears first for IS, PM and their intersection without bypassing filters or explicit sorts', () => {
  const query = (q, overrides = {}) => searchCatalog(pathways, { mode: 'pathways', query: q, sort: 'relevance', filters: {}, ...overrides }, 'cmu').items;
  for (const q of ['IS', 'PM', 'IS PM', 'is pm', 'Information Systems Product Management']) {
    const result = query(q);
    assert.equal(result[0].id, 'grace');
    assert.ok(result.slice(1).every(row => row.dataSource === 'demo'));
    assert.equal(result.filter(row => row.id === 'grace').length, 1);
  }
  assert.equal(query('IS PM', { filters: { status: 'alumni' } }).some(row => row.id === 'grace'), false);
  assert.equal(query('Robotics').some(row => row.id === 'grace'), false);
  assert.notEqual(query('IS PM', { sort: 'newest' })[0].id, 'grace');
  assert.equal(searchCatalog(pathways, { mode: 'pathways', query: 'IS PM' }, 'other').items.length, 0);
});

test('the approved snapshot contains all 18 courses, public links and the complete connection graph', () => {
  assert.deepEqual(projectGrace(gracePathway), publishedGrace);
  const rows = enrollments(publishedGrace.detail);
  assert.equal(rows.length, 18);
  assert.equal(publishedGrace.courses.length, 18);
  assert.equal(publishedGrace.profile.studentYear, 3);
  assert.equal(publishedGrace.profile.displayName, 'Grace');
  assert.deepEqual(publishedGrace.profile.concentrations, ['AI Management']);
  assert.deepEqual(publishedGrace.profile.minors, ['Philosophy']);
  assert.ok(rows.every(row => row.detailView === 'detail' && publishedGrace.courses.some(course => course.id === row.courseId)));
  const graph = learningGraph(publishedGrace.connectionDetail);
  assert.equal(graph.nodes.length, 21);
  assert.ok(graph.edges.some(edge => edge.source === 'grace-2025-fall-36-225' && edge.target === 'grace-2026-fall-07-280'));
  assert.ok(graph.edges.some(edge => edge.source === 'grace-transfer-discrete-mathematics' && edge.target === 'grace-2026-fall-07-280'));
  const nodeIds = new Set(graph.nodes.map(node => node.id));
  assert.ok(graph.edges.every(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)));
  for (const course of publishedGrace.courses) assert.match(course.descriptionSource.url, /^https:\/\/[^/]*cmu\.edu\//);
});

test('publication projection excludes private review metadata, grades and future personal notes', () => {
  const privateData = structuredClone(gracePathway);
  privateData.enrollments[0].grade = 'private-grade';
  privateData.enrollments[0].note = 'private-note';
  privateData.profile.email = 'private-address';
  privateData.reviewItems.push({ text: 'private-review' });
  const json = JSON.stringify(projectGrace(privateData));
  assert.doesNotMatch(json, /private-grade|private-note|private-address|private-review|notes\/data|reviewItems|displayNameSource|local_review/);
  assert.doesNotMatch(json, /"(?:grade|note|path|instructor|section)":/);
});

test('published pathway and course return routes preserve the GitHub Pages base and selected layout', () => {
  const base = '/course-pathways/';
  const path = appUrl({ view: 'detail', mode: 'pathways', id: 'grace', timeLayout: 'connections' }, base);
  const course = appUrl({ view: 'detail', mode: 'courses', id: 'cmu-07-280', from: path }, base);
  assert.equal(safeReturnUrl(path, base, base), path);
  assert.equal(safeReturnUrl(course, base, base), course);
  assert.equal(safeReturnUrl('/course-pathways/?view=pathway-review&id=grace', base, base), base);
  assert.equal(safeReturnUrl('//outside.example/?view=detail&mode=pathways&id=grace', base, base), base);
});
