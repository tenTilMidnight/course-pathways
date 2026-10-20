import test from 'node:test';
import assert from 'node:assert/strict';
import { orderedSemesters, enrollments, requirementGroups, readPathwayView, safeReturnUrl, termLabel, requirementPaths, timeLayouts } from '../src/pathway-model.js';
import { pathwayDetails } from '../src/pathway-data.js';
import { pathways, courses } from '../src/demo-catalog.js';

test('semester order preserves missing terms, repeated courses and the original data', () => {
  const detail = { semesters: [
    { id: 'unknown', term: null, courses: [{ id: '3', courseId: 'same' }] },
    { id: 'fall', term: { season: 'Fall', year: 2024 }, courses: [{ id: '2', courseId: 'same' }] },
    { id: 'spring', term: { season: 'Spring', year: 2024 }, courses: [{ id: '1', courseId: 'same' }] },
  ] };
  const before = JSON.stringify(detail);
  assert.deepEqual(orderedSemesters(detail).map(item => item.id), ['spring', 'fall', 'unknown']);
  assert.equal(enrollments(detail).length, 3);
  assert.equal(termLabel(null), 'Term not shared');
  assert.equal(JSON.stringify(detail), before);
});
test('requirement views preserve multiple mappings, unmapped coursework and empty groups without claiming completion', () => {
  const detail = { requirements: [{ id: 'a', title: 'Core' }, { id: 'b', title: 'Breadth' }, { id: 'c', title: 'Elective' }], semesters: [{ courses: [
    { id: '1', requirementIds: ['a', 'b', 'b'] }, { id: '2', requirementIds: ['obsolete'] }, { id: '3' },
  ] }] };
  const groups = requirementGroups(detail);
  assert.deepEqual(groups.map(group => group.courses.map(row => row.id)), [['1'], ['1'], [], ['2', '3']]);
  assert.deepEqual(requirementGroups({}), []);
});
test('detail layouts fall back safely and return links cannot point outside recognized local routes', () => {
  assert.deepEqual(readPathwayView(new URLSearchParams('by=bad&timeLayout=bad&requirementLayout=bad')), { timeLayout: 'alternating' });
  for (const legacy of ['by=requirement&requirementLayout=matrix', 'timeLayout=rows', 'timeLayout=focus&semester=semester-4']) {
    assert.deepEqual(readPathwayView(new URLSearchParams(legacy)), { timeLayout: 'alternating' });
  }
  for (const layout of ['alternating', 'connections']) assert.equal(readPathwayView(new URLSearchParams({ timeLayout: layout })).timeLayout, layout);
  assert.equal(readPathwayView(new URLSearchParams('timeLayout=years')).timeLayout, 'connections');
  assert.deepEqual(timeLayouts, [['alternating', 'Timeline'], ['connections', 'Overview']]);
  for (const value of ['https://example.com', '//example.com', 'javascript:alert(1)', '/?view=bad', '/?view=results&q=']) assert.equal(safeReturnUrl(value), '/');
  const from = '/?view=results&mode=pathways&q=Information+Systems&tone=textured';
  assert.equal(safeReturnUrl(from), from);
  assert.equal(safeReturnUrl('/?view=detail&mode=pathways&id=pathway-03&by=requirement'), '/?view=detail&mode=pathways&id=pathway-03&by=requirement');
});
test('demo details cover every profile, keep highlight terms consistent, and use valid course links and requirement IDs', () => {
  assert.equal(pathwayDetails.length, pathways.length);
  for (const profile of pathways) {
    const detail = pathwayDetails.find(item => item.id === profile.id);
    const rows = enrollments(detail);
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
    for (const row of rows) {
      if (row.courseId) assert.ok(courses.some(course => course.id === row.courseId));
      for (const id of row.requirementIds) assert.ok(detail.requirements.some(requirement => requirement.id === id));
    }
    for (const highlight of profile.courses) assert.deepEqual(rows.find(row => row.title === highlight.title).term, highlight.term);
  }
  assert.equal(pathwayDetails.find(item => item.id === 'pathway-17').catalog, null);
});

test('requirement paths preserve branching, transitive prerequisites and specific repeated attempts', () => {
  const detail = { requirements: [{ id: 'core', title: 'Core' }], semesters: [
    { id: 's1', term: { season: 'Fall', year: 2021 }, courses: [{ id: 'first', courseId: 'same' }, { id: 'other' }] },
    { id: 's2', term: { season: 'Spring', year: 2022 }, courses: [{ id: 'repeat', courseId: 'same' }, { id: 'middle', requirementIds: ['core'], supportingEnrollmentIds: ['first', 'other'] }] },
    { id: 's3', term: { season: 'Fall', year: 2022 }, courses: [{ id: 'target', requirementIds: ['core'], supportingEnrollmentIds: ['middle', 'middle'] }] },
  ] };
  const before = JSON.stringify(detail);
  const core = requirementPaths(detail)[0];
  assert.equal(core.paths.length, 1);
  const target = core.paths[0];
  assert.equal(target.course.id, 'target');
  assert.deepEqual(target.prerequisites.map(node => node.course.id), ['middle']);
  assert.deepEqual(target.prerequisites[0].prerequisites.map(node => node.course.id), ['first', 'other']);
  assert.equal(JSON.stringify(detail), before);
});

test('course chronology alone never creates prerequisite links; broken and backward links are flagged', () => {
  const detail = { requirements: [{ id: 'core' }], semesters: [
    { term: { season: 'Fall', year: 2021 }, courses: [{ id: 'a', requirementIds: ['core'], supportingEnrollmentIds: ['b', 'missing'] }] },
    { term: { season: 'Spring', year: 2022 }, courses: [{ id: 'b', requirementIds: ['core'] }] },
  ] };
  const paths = requirementPaths(detail)[0].paths;
  assert.equal(paths.length, 2);
  assert.equal(paths[0].incomplete, true);
  assert.equal(paths[0].prerequisites.length, 0);
  assert.equal(paths[1].prerequisites.length, 0);
});

test('unknown-term cycles terminate without dropping mapped courses', () => {
  const detail = { requirements: [{ id: 'core' }], semesters: [{ term: null, courses: [
    { id: 'a', requirementIds: ['core'], supportingEnrollmentIds: ['b'] },
    { id: 'b', requirementIds: ['core'], supportingEnrollmentIds: ['a'] },
  ] }] };
  const paths = requirementPaths(detail)[0].paths;
  assert.equal(paths.length, 2);
  assert.equal(paths[0].prerequisites[0].incomplete, true);
});

test('demo links resolve to earlier individual enrollments and include a visible branching path', () => {
  let branched = false;
  for (const detail of pathwayDetails) {
    const rows = enrollments(detail);
    for (const course of rows) {
      if (course.supportingEnrollmentIds.length > 1) branched = true;
      for (const id of course.supportingEnrollmentIds) {
        assert.ok(rows.findIndex(row => row.id === id) < rows.indexOf(course));
        assert.ok(rows.some(row => row.id === id));
      }
    }
  }
  assert.equal(branched, true);
  const group = requirementPaths(pathwayDetails.find(detail => detail.id === 'pathway-03')).find(item => item.id === 'electives');
  assert.ok(group.paths.some(path => path.course.title === 'Information Security' && path.prerequisites[0]?.course.title === 'Computer Networks'));
});
