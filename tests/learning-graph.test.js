import test from 'node:test';
import assert from 'node:assert/strict';
import { learningGraph, traceConnections, focusConnections } from '../src/learning-graph.js';
import { pathwayDetails } from '../src/pathway-data.js';

test('graph merges shared foundations, preserves unrelated coursework, and filters with supporting ancestors', () => {
  const detail = { semesters: [
    { id: 's1', term: { year: 2020, season: 'Fall' }, courses: [{ id: 'a' }, { id: 'unrelated' }] },
    { id: 's2', term: { year: 2021, season: 'Spring' }, courses: [{ id: 'b', supportingEnrollmentIds: ['a'], requirementIds: ['core'] }, { id: 'c', supportingEnrollmentIds: ['a'] }] },
    { id: 's3', term: { year: 2021, season: 'Fall' }, courses: [{ id: 'd', supportingEnrollmentIds: ['b', 'c', 'c'], requirementIds: ['capstone'] }] },
  ] };
  const all = learningGraph(detail);
  assert.equal(all.nodes.length, 5);
  assert.equal(all.edges.length, 4);
  assert.deepEqual(learningGraph(detail, 'core').nodes.map(node => node.id), ['a', 'b']);
  assert.deepEqual(learningGraph(detail, 'capstone').nodes.map(node => node.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual([...traceConnections(all, 'b')].sort(), ['a', 'b', 'd']);
  assert.deepEqual([...traceConnections(all, 'unrelated')], ['unrelated']);
});

test('graph rejects self, absent, same-term and backward links without fabricating edges from course order', () => {
  const detail = { semesters: [
    { id: 's1', term: { year: 2020, season: 'Fall' }, courses: [{ id: 'a', supportingEnrollmentIds: ['a', 'b', 'missing', 'c'] }, { id: 'b' }] },
    { id: 's2', term: { year: 2021, season: 'Spring' }, courses: [{ id: 'c', supportingEnrollmentIds: ['a'] }] },
  ] };
  assert.deepEqual(learningGraph(detail).edges, [{ source: 'a', target: 'c' }]);
});

test('every known demo semester has four or five distinct courses and every graph has unique enrollment nodes', () => {
  for (const detail of pathwayDetails) {
    for (const semester of detail.semesters.filter(item => item.term)) {
      assert.ok([4, 5].includes(semester.courses.length), `${detail.id}/${semester.id}`);
      assert.equal(new Set(semester.courses.map(course => course.courseId)).size, semester.courses.length);
    }
    const graph = learningGraph(detail);
    assert.equal(new Set(graph.nodes.map(node => node.id)).size, graph.nodes.length);
    assert.equal(graph.nodes.length, detail.semesters.reduce((sum, semester) => sum + semester.courses.length, 0));
  }
});

test('connection focus removes unrelated semesters without losing real chronology or branching', () => {
  const detail = { semesters: Array.from({ length: 10 }, (_, i) => ({
    id: `semester-${i}`, term: { season: 'Fall', year: 2020 + i },
    courses: [{ id: `course-${i}`, supportingEnrollmentIds: i === 7 || i === 9 ? ['course-0'] : [] }],
  })) };
  const graph = learningGraph(detail), original = JSON.stringify(graph);
  const focus = focusConnections(graph, 'course-0');
  assert.deepEqual(focus.semesters.map(item => item.id), ['semester-0', 'semester-7', 'semester-9']);
  assert.deepEqual(focus.nodes.map(item => item.id), ['course-0', 'course-7', 'course-9']);
  assert.equal(focus.edges.length, 2);
  assert.equal(JSON.stringify(graph), original);
  assert.deepEqual(focusConnections(graph, 'missing').nodes, []);
});
