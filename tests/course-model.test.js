import test from 'node:test';
import assert from 'node:assert/strict';
import { courseExperiences, relatedCourseConnections, readCourseProgram } from '../src/course-model.js';
import { courseDetails } from '../src/course-data.js';
import { pathwayDetails } from '../src/pathway-data.js';
import { courses, pathways } from '../src/demo-catalog.js';
import { safeReturnUrl } from '../src/pathway-model.js';

test('course experiences preserve individual attempts and historical mappings without leaking another university', () => {
  const profiles = [{ id: 'p1', universityId: 'cmu' }, { id: 'p2', universityId: 'elsewhere' }];
  const detail = { id: 'p1', universityId: 'cmu', catalog: { year: 2015 }, requirements: [{ id: 'old', title: 'Historical elective' }], semesters: [
    { id: 's1', term: { year: 2015, season: 'Fall' }, courses: [{ id: 'attempt1', courseId: 'c', requirementIds: ['old'], note: 'First attempt.' }] },
    { id: 's2', term: { year: 2016, season: 'Spring' }, courses: [{ id: 'attempt2', courseId: 'c', requirementIds: [], note: null }] },
  ] };
  const found = courseExperiences('c', 'cmu', profiles, [detail, { ...detail, id: 'p2', universityId: 'elsewhere' }]);
  assert.deepEqual(found.map(item => item.enrollment.id), ['attempt2', 'attempt1']);
  assert.deepEqual(found[1].requirements, ['Historical elective']);
  assert.equal(found[1].catalog.year, 2015);
  assert.equal(found.filter(item => item.enrollment.note).length, 1);
  assert.deepEqual(courseExperiences('missing', 'cmu', profiles, [detail]), []);
});

test('course detail fixtures cover every course; current and historical requirements remain separate', () => {
  assert.equal(courseDetails.length, courses.length);
  for (const course of courses) {
    const detail = courseDetails.find(item => item.id === course.id);
    assert.equal(detail.universityId, course.universityId);
    assert.equal(detail.catalog.year, 2026);
    assert.equal(detail.offerings.length, 3);
    assert.ok(detail.offerings.every(item => item.instructor && item.term));
  }
  const experience = courseExperiences('course-01', 'cmu', pathways, pathwayDetails).find(item => item.profile.id === 'pathway-03');
  assert.equal(experience.catalog.year, 2021);
  assert.ok(experience.requirements.includes('Quantitative & technical methods'));
  assert.deepEqual(courseDetails[0].mappings.find(item => item.program === 'Information Systems').requirements, ['Core coursework']);
});

test('related courses aggregate actual shared links, deduplicate course IDs and remain local to the university', () => {
  const related = relatedCourseConnections('course-01', 'cmu', pathwayDetails);
  assert.ok(related.earlier.some(item => item.title === 'Programming Principles'));
  assert.ok(related.later.some(item => item.title === 'Software Design'));
  assert.equal(new Set(related.later.map(item => item.courseId)).size, related.later.length);
  assert.deepEqual(relatedCourseConnections('course-01', 'elsewhere', pathwayDetails), { earlier: [], later: [] });
});

test('program selection and detail return URLs validate recognized state', () => {
  assert.equal(readCourseProgram(new URLSearchParams('program=Design'), ['Design', 'Statistics'], 'Statistics'), 'Design');
  assert.equal(readCourseProgram(new URLSearchParams('program=unknown'), ['Design', 'Statistics'], 'Statistics'), 'Statistics');
  assert.equal(readCourseProgram(new URLSearchParams(), [], null), null);
  assert.equal(safeReturnUrl('/?view=detail&mode=courses&id=course-01&program=Design'), '/?view=detail&mode=courses&id=course-01&program=Design');
  assert.equal(safeReturnUrl('/?view=detail&mode=courses&id=pathway-03'), '/');
});
