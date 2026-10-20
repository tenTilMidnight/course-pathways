import test from 'node:test';
import assert from 'node:assert/strict';
import { searchCatalog, readResultsState, resultsUrl, matchScore } from '../src/results-state.js';
import { pathways, courses } from '../src/demo-catalog.js';

const state = (overrides = {}) => ({ mode: 'pathways', query: 'Information Systems', filters: {}, sort: 'relevance', ...overrides });

test('abbreviations match academic and career concepts, and multiple terms intersect', () => {
  const ids = query => searchCatalog(pathways, state({ query }), 'cmu').items.map(row => row.id).sort();
  assert.deepEqual(ids('IS'), ids('Information Systems'));
  assert.deepEqual(ids('PM'), ids('Product Management'));
  assert.deepEqual(ids('SWE'), ids('Software Engineering'));
  const intersection = ids('IS').filter(id => ids('PM').includes(id));
  assert.ok(intersection.length > 0 && intersection.length < ids('IS').length && intersection.length < ids('PM').length);
  assert.deepEqual(ids('IS PM'), intersection);
  assert.deepEqual(ids('pm is'), intersection);
  assert.deepEqual(ids('Information Systems pM'), intersection);
  assert.ok(matchScore({ major: 'Information Systems', role: 'Product Manager' }, 'pathways', 'IS PM') > 0);
  assert.ok(matchScore({ role: 'Software Engineer' }, 'pathways', 'SWE') > 0);
  assert.equal(matchScore({ major: 'Statistics', role: 'Designer' }, 'pathways', 'IS'), 0);
  assert.equal(matchScore({ role: 'Project Manager' }, 'pathways', 'PM'), 0);
  assert.equal(matchScore({ role: 'Development Manager' }, 'pathways', 'PM'), 0);
});

test('aliases preserve course numbers, filters, ranking, metadata and word boundaries', () => {
  for (const [alias, phrase] of [['CS', 'Computer Science'], ['HCI', 'Human-Computer Interaction'], ['AI', 'Artificial Intelligence'], ['ML', 'Machine Learning'], ['DS', 'Data Science'], ['ECE', 'Electrical and Computer Engineering']]) {
    assert.ok(matchScore({ major: phrase }, 'pathways', alias.toLowerCase()) > 0);
  }
  assert.ok(matchScore({ code: 'IS 210', title: 'Database Design' }, 'courses', 'is-210') > 0);
  assert.equal(matchScore({ title: 'This isomorphic analysis' }, 'courses', 'IS'), 0);
  const primary = { major: 'Information Systems', role: 'Product Management' };
  const metadata = { major: 'Design', tags: ['Information Systems', 'Product Management'] };
  assert.ok(matchScore(primary, 'pathways', 'IS PM') > matchScore(metadata, 'pathways', 'IS PM'));
  assert.ok(matchScore({ minors: ['Computer Science'] }, 'pathways', 'CS') > 0);
  const result = searchCatalog(courses, state({ mode: 'courses', query: 'CS ML', filters: { level: 'graduate' } }), 'cmu');
  assert.ok(result.items.length > 0);
  assert.ok(result.items.every(row => row.department === 'Computer Science' && row.level === 'graduate'));
  assert.equal(readResultsState(new URLSearchParams('q=IS+PM')).query, 'IS PM');
});

test('matching uses every query token and ranks primary fields above keywords without inventing match percentages', () => {
  const primary = { major: 'Information Systems', role: 'Product Manager', tags: [] };
  const keyword = { major: 'Design', role: 'Designer', tags: ['Information Systems'] };
  assert.ok(matchScore(primary, 'pathways', 'information SYSTEMS') > matchScore(keyword, 'pathways', 'Information Systems'));
  assert.equal(matchScore(primary, 'pathways', 'Information Systems'), matchScore({ ...primary, role: null }, 'pathways', 'Information Systems'));
  assert.ok(matchScore(primary, 'pathways', 'systems product') > 0);
  assert.equal(matchScore(primary, 'pathways', 'systems robotics'), 0);
  assert.equal(matchScore(primary, 'pathways', '!!!'), 0);
  assert.ok(matchScore(courses[0], 'courses', 'IS-210') > 0);
  assert.ok(matchScore({ ...primary, company: 'Amazon' }, 'pathways', 'product amazon') > 0);
  assert.ok(matchScore(pathways[0], 'pathways', 'Human-Centered Design') > 0);
  assert.ok(matchScore({ ...primary, concentrations: ['Software Development'], additionalMajors: ['Statistics'], dualDegrees: ['Mathematical Sciences'], minors: ['Design'] }, 'pathways', 'software statistics mathematical design') > 0);
});

test('results stay scoped to the university and to the selected catalog', () => {
  const other = { ...pathways[0], id: 'other', universityId: 'elsewhere' };
  const result = searchCatalog([...pathways, other], state(), 'cmu', 2026);
  assert.equal(result.items.some(record => record.id === 'other'), false);
  assert.equal(searchCatalog(courses, state({ mode: 'courses', query: 'HCI' }), 'cmu').items.length, 4);
  assert.equal(searchCatalog(pathways, state({ query: 'No Such Major' }), 'cmu').items.length, 0);
});

test('graduation windows include the boundary and exclude current, missing, future and older years', () => {
  const rows = [2020, 2021, 2026, 2027, null].map((graduationYear, i) => ({ ...pathways[0], id: String(i), graduationYear }));
  rows.push({ ...pathways[0], id: 'current', graduationYear: 2026, status: 'current' });
  const result = searchCatalog(rows, state({ filters: { graduation: '5' } }), 'cmu', 2026);
  assert.deepEqual(result.items.map(record => record.graduationYear), [2021, 2026]);
  const conflict = searchCatalog(rows, state({ filters: { graduation: '5', status: 'current' } }), 'cmu', 2026);
  assert.equal(conflict.items.length, 0);
  assert.equal(conflict.total, rows.length);
});

test('newest and oldest sorting put current students and unknown graduation years last', () => {
  const result = searchCatalog(pathways, state({ sort: 'newest' }), 'cmu', 2026).items;
  assert.equal(result[0].graduationYear, 2026);
  const alumni = result.filter(row => row.status === 'alumni' && row.graduationYear != null);
  assert.deepEqual(alumni.map(row => row.graduationYear), [...alumni.map(row => row.graduationYear)].sort((a, b) => b - a));
  assert.ok(result.slice(alumni.length).every(row => row.status === 'current' || row.graduationYear == null));
  assert.equal(searchCatalog(pathways, state({ sort: 'oldest' }), 'cmu', 2026).items[0].graduationYear, 2015);
});

test('course department, level and units combine without applying pathway filters', () => {
  const result = searchCatalog(courses, state({ mode: 'courses', query: 'Machine Learning', sort: 'units', filters: { department: 'Computer Science', level: 'graduate', units: 'high', graduation: '5' } }), 'cmu');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, 'Applied Machine Learning');
  assert.ok(result.total > result.items.length);
});

test('result URLs round-trip unicode, punctuation, filters and sort without accepting invalid options', () => {
  for (const tone of ['plain', 'shaded', 'textured']) {
    const original = state({ query: 'Design & 数据', filters: { status: 'alumni', graduation: '5' }, sort: 'newest', tone });
    const parsed = readResultsState(new URL(resultsUrl(original), 'http://localhost').searchParams);
    assert.deepEqual(parsed, { ...original, tone: 'plain', valid: true });
    assert.equal(resultsUrl(original).includes('tone='), false);
  }
  const invalid = readResultsState(new URLSearchParams('mode=unknown&q=ok&sort=bad&status=bad&graduation=999&layout=bad&tone=bad&cohort=sentence'));
  assert.equal(invalid.mode, 'pathways');
  assert.equal(invalid.sort, 'relevance');
  assert.equal(invalid.tone, 'plain');
  assert.equal(resultsUrl(invalid).includes('cohort'), false);
  assert.equal(resultsUrl(invalid).includes('layout'), false);
  assert.deepEqual(invalid.filters, { status: 'all', graduation: 'all' });
  assert.equal(readResultsState(new URLSearchParams('q=')).valid, false);
  assert.equal(readResultsState(new URLSearchParams({ q: 'x'.repeat(121) })).valid, false);
});

test('filtering and sorting never mutate the input fixtures and give deterministic tie ordering', () => {
  const before = JSON.stringify(pathways);
  const first = searchCatalog(pathways, state({ sort: 'name' }), 'cmu').items;
  const second = searchCatalog([...pathways].reverse(), state({ sort: 'name' }), 'cmu').items;
  assert.deepEqual(first.map(record => record.id), second.map(record => record.id));
  assert.equal(JSON.stringify(pathways), before);
});
