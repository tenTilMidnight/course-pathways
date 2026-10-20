import test from 'node:test';
import assert from 'node:assert/strict';
import { gracePathway } from '../src/local-grace-data.js';
import { validateStudentPathway, catalogMatches, toPathwayView } from '../src/local-pathway-model.js';
import { learningGraph } from '../src/learning-graph.js';

test('Grace import preserves all 18 enrollments in the three supplied semesters without synthetic filler', () => {
  const { profile, detail } = toPathwayView(gracePathway);
  assert.equal(profile.graduationYear, 2028);
  assert.equal(profile.studentYear, 3);
  assert.equal(profile.role, 'Product Management');
  assert.equal(profile.status, 'current');
  assert.equal(profile.company, null);
  assert.deepEqual(detail.semesters.map(s => [s.term.season, s.term.year, s.courses.map(c => c.code)]), [
    ['Fall', 2025, ['15-122', '67-262', '05-391', '36-225', '85-110']],
    ['Spring', 2026, ['17-313', '67-250', '70-350', '21-241', '76-101', '99-101']],
    ['Fall', 2026, ['07-280', '05-317', '80-226', '80-490', '17-619', '94-829', '67-200']],
  ]);
  assert.equal(learningGraph(detail).edges.length, 0);
});

test('catalog enrichment is traceable and does not create personal claims', () => {
  for (const course of gracePathway.courses) {
    const source = gracePathway.sources[course.sourceId];
    assert.ok(new URL(source.url).hostname.endsWith('.cmu.edu'));
    assert.equal(source.checkedAt, '2026-10-19');
    assert.ok(course.title && course.description && course.catalogUnits > 0);
  }
  for (const row of gracePathway.enrollments) {
    assert.equal(row.status, 'not_shared');
    for (const key of ['enrolledUnits', 'grade', 'note', 'instructor', 'termPart']) assert.equal(row[key], null);
  }
  assert.equal(gracePathway.courses.find(c => c.code === '21-241').catalogUnits, 11);
  assert.equal(gracePathway.learningConnections.length, 0);
  assert.equal(gracePathway.requirementMappings.length, 0);
});

test('three prerequisites and one earlier corequisite are matched without claiming passing grades or eligibility', () => {
  const matches = catalogMatches(gracePathway);
  const code = id => id.slice(-6);
  assert.deepEqual(matches.map(e => [code(e.source), code(e.target)]), [
    ['15-122', '17-313'], ['15-122', '07-280'], ['21-241', '07-280'], ['36-225', '07-280'],
  ]);
  assert.ok(matches.slice(0, 3).every(e => e.kind === 'catalog_prerequisite_match'));
  assert.equal(matches[3].kind, 'catalog_corequisite_match');
  assert.equal(matches[3].sourceId, 'ai280');
  assert.ok(matches.every(e => !e.gradeVerified && !e.eligibilityAssessed && !e.historicalRuleVerified));
  assert.equal(learningGraph(toPathwayView(gracePathway, { showCatalogMatches: true }).detail).edges.length, 4);
  assert.equal(gracePathway.learningConnections.length, 0);
});

test('corequisite matches allow the same term but never a later course or a fabricated transfer record', () => {
  const data = structuredClone(gracePathway);
  const probability = data.enrollments.find(row => row.courseId === 'cmu-36-225');
  const target = data.enrollments.find(row => row.courseId === 'cmu-07-280');
  probability.term = { ...target.term };
  assert.ok(catalogMatches(data).some(edge => edge.source === probability.id && edge.target === target.id && edge.kind === 'catalog_corequisite_match'));
  // Concurrent requirements are recorded, not portrayed as an earlier semester.
  assert.ok(!learningGraph(toPathwayView(data, { showCatalogMatches: true }).detail).edges.some(edge => edge.source === probability.id && edge.target === target.id));
  probability.term.year++;
  assert.ok(!catalogMatches(data).some(edge => edge.source === probability.id && edge.target === target.id));
  const rule = data.courseRules.find(item => item.courseId === 'cmu-07-280');
  assert.deepEqual(rule.corequisiteExpression.allOf[1].anyOf.map(item => item.courseCode), ['36-225', '36-217', '15-259', '21-325', '15-359', '36-218', '36-219', '36-235']);
  assert.equal(rule.corequisiteExpression.allOf[0].courseCode, '21-122');
  assert.equal(data.enrollments.length, 18);
});

test('prerequisites retain OR groups, minimum grades, and recommendations independently', () => {
  const ai = gracePathway.courseRules.find(r => r.courseId === 'cmu-07-280');
  assert.deepEqual(ai.prerequisiteExpression.allOf.map(group => group.anyOf.map(c => c.courseCode)), [
    ['15-122', '15-121'], ['18-202', '21-254', '21-241', '21-240'], ['21-127', '15-151', '21-128'],
  ]);
  assert.ok(ai.prerequisiteExpression.allOf.every(g => g.anyOf.every(c => c.minimumGrade === 'C')));
  const matrices = gracePathway.courseRules.find(r => r.courseId === 'cmu-21-241');
  assert.equal(matrices.prerequisiteExpression, null);
  assert.equal(matrices.recommendations[0].courseCode, '21-127');
});

test('bad enrollment references fail instead of silently dropping student data; repeat attempts remain distinct', () => {
  const data = structuredClone(gracePathway);
  data.enrollments[0].courseId = 'missing';
  assert.throws(() => validateStudentPathway(data), /Invalid enrollment/);
  const repeated = structuredClone(gracePathway);
  repeated.enrollments.push({ ...repeated.enrollments[0], id: 'another-attempt', term: { season: 'Spring', year: 2026 } });
  assert.equal(toPathwayView(repeated).detail.semesters.flatMap(s => s.courses).length, 19);
  repeated.enrollments.push(repeated.enrollments[0]);
  assert.throws(() => validateStudentPathway(repeated), /Duplicate/);
});
