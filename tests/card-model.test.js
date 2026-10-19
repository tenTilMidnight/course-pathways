import test from 'node:test';
import assert from 'node:assert/strict';
import { academicDetails, careerText, careerLabel, toneBand, courseHighlights } from '../src/card-model.js';

test('academic fields keep their distinct meanings and omit empty entries without inventing credentials', () => {
  assert.deepEqual(academicDetails({}), []);
  const profile = { concentrations: [' Software Development ', ''], additionalMajors: ['Statistics'], dualDegrees: ['B.S. in Mathematics'], minors: ['Design', 'Economics'] };
  assert.deepEqual(academicDetails(profile), [
    { label: 'concentration in', value: 'Software Development' },
    { label: 'double major in', value: 'Statistics' },
    { label: 'dual degree in', value: 'B.S. in Mathematics' },
    { label: 'minors in', value: 'Design, Economics' },
  ]);
  assert.equal(profile.concentrations[0], ' Software Development ');
});

test('optional companies stay attached to a role without treating a student direction as employment', () => {
  assert.equal(careerText({ role: 'Software Engineer', company: ' Amazon ' }), 'Software Engineer @ Amazon');
  assert.equal(careerText({ role: 'Software Engineer', company: ' ' }), 'Software Engineer');
  assert.equal(careerText({}), 'Role not shared');
  assert.equal(careerLabel({ status: 'current' }), 'Exploring');
  assert.equal(careerLabel({ status: 'current', company: ' ' }), 'Exploring');
  assert.equal(careerLabel({ status: 'current', company: 'Amazon' }), 'Career');
});

test('shading groups are exclusive with inclusive five- and ten-year boundaries and a neutral fallback', () => {
  const alum = graduationYear => ({ status: 'alumni', graduationYear });
  assert.equal(toneBand({ status: 'current', graduationYear: 2020 }, 2026), 'current');
  for (const year of [2026, 2021]) assert.equal(toneBand(alum(year), 2026), 'recent');
  for (const year of [2020, 2016]) assert.equal(toneBand(alum(year), 2026), 'established');
  for (const year of [2015, 2027, null]) assert.equal(toneBand(alum(year), 2026), 'neutral');
});

test('course highlights order by actual semester, preserve same-term order, limit to five, and do not mutate', () => {
  const course = (title, season, year) => ({ title, term: { season, year } });
  const rows = [course('C', 'Fall', 2025), course('B', 'Spring', 2025), course('A', 'Fall', 2024), course('D', 'Fall', 2025), { title: 'Unknown' }, course('E', 'Spring', 2026)];
  const before = JSON.stringify(rows);
  assert.deepEqual(courseHighlights(rows).map(item => item.title), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(JSON.stringify(rows), before);
  assert.deepEqual(courseHighlights([rows[4], rows[0]]).map(item => item.title), ['C', 'Unknown']);
  assert.deepEqual(courseHighlights(), []);
});
