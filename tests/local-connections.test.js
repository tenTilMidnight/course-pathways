import test from 'node:test';
import assert from 'node:assert/strict';
import { gracePathway } from '../src/local-grace-data.js';
import { officialCourses } from '../src/local-official-courses.js';
import { toPathwayView } from '../src/local-pathway-model.js';
import { transferAssumptions, toConnectionView, exportStudentPathway } from '../src/local-connections.js';
import { localReturnUrl } from '../src/local-routing.js';
import { courseDescription } from '../src/course-description.js';
import { readPathwayView } from '../src/pathway-model.js';
import { enrollments, termOrder, termLabel } from '../src/pathway-model.js';
import { learningGraph } from '../src/learning-graph.js';
import { mindMapLayout, withCourseInformation, routeConnections, pathHitsNode, pathsOverlap, pathsCross } from '../src/connection-experiment-model.js';

test('Freshman transfer assumptions preserve alternatives without inventing completed CMU courses', () => {
  const assumptions = transferAssumptions(gracePathway);
  assert.equal(assumptions.length, 3);
  assert.deepEqual(assumptions.map(group => group.title), ['Programming foundations', 'Calculus foundations', 'Discrete mathematics']);
  assert.deepEqual(assumptions.map(group => group.requirements.length), [3, 1, 1]);
  for (const group of assumptions) {
    assert.equal(group.sourceId, 'transfer');
    assert.equal(group.equivalentCourseId, null);
    assert.equal(group.awardedUnits, null);
    assert.ok(group.requirements.every(requirement => requirement.expression.anyOf.length > 1));
  }
  const exported = exportStudentPathway(gracePathway);
  assert.equal(exported.enrollments.length, 18);
  assert.equal(exported.learningConnections.length, 0);
  assert.equal(exported.transferAssumptions.length, 3);
  assert.equal(exported.catalogMatches.length, 4);
});

test('a real earlier course replaces its transfer assumption and same-term courses cannot do so', () => {
  const data = structuredClone(gracePathway);
  data.courses.push({ id: 'cmu-15-112', code: '15-112', institutionId: 'cmu', sourceId: 'scs' });
  data.enrollments.push({ ...data.enrollments[0], id: 'prior-programming', courseId: 'cmu-15-112', term: { season: 'Fall', year: 2024 } });
  assert.deepEqual(transferAssumptions(data).map(group => group.title), ['Calculus foundations', 'Discrete mathematics']);
  data.enrollments.at(-1).term.year = 2025;
  assert.equal(transferAssumptions(data).length, 3);
});

test('Grace connections place all transfer background before Sophomore CMU records without inventing a transfer semester', () => {
  const { detail } = toConnectionView(gracePathway);
  const graph = learningGraph(detail);
  assert.equal(graph.nodes.length, 21);
  assert.equal(graph.edges.length, 9);
  assert.equal(detail.semesters[0].term.stage, 'transfer');
  assert.equal(detail.semesters[0].term.season, undefined);
  assert.equal(termLabel(detail.semesters[0].term), 'Freshman · Transfer credits');
  assert.deepEqual(detail.semesters.slice(1).map(s => s.academicYearLabel), ['Sophomore', 'Sophomore', 'Junior']);
  for (const edge of graph.edges) {
    const a = graph.nodes.find(n => n.id === edge.source), b = graph.nodes.find(n => n.id === edge.target);
    assert.ok(termOrder(a.term) < termOrder(b.term));
  }
  const ai = graph.nodes.find(n => n.code === '07-280');
  assert.deepEqual(new Set(ai.supportingEnrollmentIds), new Set(['grace-2025-fall-15-122', 'grace-2026-spring-21-241', 'grace-transfer-discrete-mathematics', 'grace-2025-fall-36-225']));
  assert.equal(graph.edges.find(edge => edge.source === 'grace-2025-fall-36-225' && edge.target === ai.id).kind, 'catalog_corequisite_match');
});

test('all real course previews target an internal detail route and retain exact official excerpts with attribution', () => {
  const rows = enrollments(toPathwayView(gracePathway).detail);
  for (const row of rows) {
    assert.equal(row.detailView, 'course-review');
    assert.equal(row.unitsNote, null);
    assert.equal(row.descriptionType, 'official_excerpt');
    assert.equal(row.description, officialCourses[row.code].description);
    assert.ok(row.description.split(/\s+/).length <= 25);
    assert.ok(new URL(row.officialUrl).hostname.endsWith('.cmu.edu'));
  }
});

test('local course return navigation preserves the pathway or connections and rejects external destinations', () => {
  assert.equal(localReturnUrl('/?view=connection-review&id=grace'), '/?view=pathway-review&id=grace&timeLayout=connections');
  assert.equal(localReturnUrl('/?view=pathway-review&id=grace&timeLayout=connections'), '/?view=pathway-review&id=grace&timeLayout=connections');
  assert.equal(localReturnUrl('/?view=pathway-review&id=grace&timeLayout=years'), '/?view=pathway-review&id=grace&timeLayout=connections');
  for (const url of ['https://evil.invalid/', '//evil.invalid/', '/\\evil.invalid/', '/?view=detail&id=unknown', '/?view=connection-review&id=another', '/wrong/?view=pathway-review&id=grace']) {
    assert.equal(localReturnUrl(url), '/?view=pathway-review&id=grace');
  }
});

test('Overview is the shared second layout; full descriptions retain all paragraphs and punctuation', () => {
  const params = new URLSearchParams('timeLayout=connections');
  assert.equal(readPathwayView(params).timeLayout, 'connections');
  assert.equal(readPathwayView(new URLSearchParams('timeLayout=years')).timeLayout, 'connections');
  const text = 'First paragraph with its original punctuation.\n\nA separate second paragraph. '.repeat(50);
  assert.equal(courseDescription({ fullDescription: text, description: 'Old short excerpt', descriptionTruncated: true }), text);
  const data = structuredClone(gracePathway); data.courses[0].fullDescription = text;
  assert.equal(enrollments(toPathwayView(data).detail)[0].fullDescription, text);
});

test('the AI course is balanced between its supporting courses, independently of the floating description', () => {
  const graph = learningGraph(toConnectionView(gracePathway).detail);
  const root = graph.nodes.find(n => n.code === '07-280');
  const base = mindMapLayout(graph, root.id, new Map(), false, 1200);
  const target = base.nodes.find(n => n.id === root.id), prior = base.nodes.filter(n => n.id !== root.id);
  assert.equal(target.y + target.height / 2, prior.reduce((sum, n) => sum + n.y + n.height / 2, 0) / prior.length);
  const routes = routeConnections(base);
  for (const height of [140, 400]) {
    const withInfo = withCourseInformation(base, root.id, { width: 300, height });
    const dx = withInfo.nodes[0].x - base.nodes[0].x;
    assert.deepEqual(withInfo.nodes, base.nodes.map(node => ({ ...node, x: node.x + dx })));
    assert.equal(withInfo.width, base.width);
    assert.deepEqual(routeConnections(withInfo), routes.map(route => ({ ...route, points: route.points?.map(point => ({ x: point.x + dx, y: point.y })) ?? null })));
  }
});

test('Grace direct and full connection diagrams fit at desktop and mobile widths with unobstructed arrows', () => {
  const graph = learningGraph(toConnectionView(gracePathway).detail);
  for (const selected of graph.nodes) for (const full of [false, true]) for (const width of [1200, 900, 390]) {
    const sizes = new Map(graph.nodes.map(n => [n.id, 150]));
    const map = withCourseInformation(mindMapLayout(graph, selected.id, sizes, full, width), selected.id, { width: Math.min(460, width - 32), height: selected.status === 'assumed_transfer' ? 360 : 260 });
    assert.ok(map.width <= width);
    assert.ok(map.nodes.every(node => node.width === 178 && node.x >= 0 && node.x + node.width <= width));
    const routes = routeConnections(map);
    for (const [i, edge] of routes.entries()) {
      assert.ok(edge.points, `Missing route ${selected.id}/${full}/${width}/${edge.source}/${edge.target}`);
      for (const other of routes.slice(i + 1)) assert.equal(pathsOverlap(edge.points, other.points, 6), false);
      const obstacles = [...map.nodes.filter(n => n.id !== edge.source && n.id !== edge.target), map.information];
      assert.equal(pathHitsNode(edge.points, obstacles), false);
    }
  }
});

test('15-122 downstream sibling group centers on 15-122, not the unrelated courses in its column', () => {
  const graph = learningGraph(toConnectionView(gracePathway).detail);
  const map = mindMapLayout(graph, 'grace-transfer-programming', new Map(), true, 1200);
  const parent = map.nodes.find(node => node.code === '15-122');
  const children = map.nodes.filter(node => ['17-313', '07-280'].includes(node.code));
  assert.equal(children.length, 2);
  assert.equal(children[0].x, children[1].x);
  const groupCenter = (Math.min(...children.map(node => node.y)) + Math.max(...children.map(node => node.y + node.height))) / 2;
  assert.equal(groupCenter, parent.y + parent.height / 2);
  const routes = routeConnections(map);
  for (const [i, route] of routes.entries()) {
    assert.ok(route.points);
    for (const other of routes.slice(i + 1)) {
      assert.equal(pathsOverlap(route.points, other.points, 6), false);
      assert.equal(pathsCross(route.points, other.points), false);
    }
  }
});

test('AI full chain aligns independent requirements next to AI instead of routing overlapping long skips', () => {
  const graph = learningGraph(toConnectionView(gracePathway).detail);
  const ai = graph.nodes.find(n => n.code === '07-280');
  const map = mindMapLayout(graph, ai.id, new Map(), true, 1200);
  const get = id => map.nodes.find(n => n.id === id);
  const programming = get('grace-2025-fall-15-122');
  for (const id of ['grace-transfer-discrete-mathematics', 'grace-2026-spring-21-241', 'grace-2025-fall-36-225']) {
    assert.equal(get(id).x, programming.x);
    assert.equal(get(id).rank, get(ai.id).rank - 1);
  }
  const routes = routeConnections(map);
  assert.equal(routes.length, map.edges.length);
  for (const [i, edge] of routes.entries()) for (const other of routes.slice(i + 1)) {
    assert.equal(pathsOverlap(edge.points, other.points, 6), false);
    assert.equal(pathsCross(edge.points, other.points), false);
  }
});
