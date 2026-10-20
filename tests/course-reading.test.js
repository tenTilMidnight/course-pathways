import test from 'node:test';
import assert from 'node:assert/strict';
import { gracePathway } from '../src/local-grace-data.js';
import { toPathwayView } from '../src/local-pathway-model.js';
import { toConnectionView } from '../src/local-connections.js';
import { learningGraph } from '../src/learning-graph.js';
import { mindMapLayout, connectionReadingPlan, withCourseInformation, pathHitsNode, pathsOverlap } from '../src/connections-layout.js';
import { courseFactSections, courseRuleText, courseRuleRows } from '../src/course-information.js';
import { pathwayDetails } from '../src/pathway-data.js';

test('a long introduction fits beside the complete Grace programming branch without rebalancing nodes', () => {
  const graph = learningGraph(toConnectionView(gracePathway).detail);
  const base = mindMapLayout(graph, 'grace-transfer-programming', new Map(), true, 1200);
  const map = withCourseInformation(base, 'grace-transfer-programming', { width: 460, height: 520 });
  assert.equal(map.informationPlacement, 'beside');
  assert.equal(map.information.y, 40);
  assert.ok(map.height <= 600);
  assert.ok(map.nodes.every(node => node.x + node.width + 32 <= map.information.x));
  assert.ok(map.routes.every(route => !pathHitsNode(route.points, [map.information])));
  const dx = map.nodes[0].x - base.nodes[0].x;
  assert.deepEqual(map.nodes, base.nodes.map(node => ({ ...node, x: node.x + dx })));
  assert.ok(map.information.x + map.information.width <= 1200);
});

test('the narrow viewport uses safe overflow placement rather than shrinking course cards', () => {
  const graph = learningGraph(toConnectionView(gracePathway).detail);
  const map = withCourseInformation(mindMapLayout(graph, 'grace-transfer-programming', new Map(), true, 390), 'grace-transfer-programming', { width: 358, height: 520 });
  assert.notEqual(map.informationPlacement, 'beside');
  assert.ok(map.nodes.every(node => node.width === 178));
  assert.ok(map.information.x >= 0 && map.information.x + map.information.width <= 390);
});

test('preview facts show each required group on its own row and omit grades without changing source data', () => {
  const rows = toPathwayView(gracePathway).detail.semesters.flatMap(semester => semester.courses);
  const database = rows.find(row => row.code === '67-262');
  assert.deepEqual(courseFactSections(database), [['Prerequisites', ['15-122 or 15-121 or 15-112 or 02-120']]]);
  const ai = courseFactSections(rows.find(row => row.code === '07-280'));
  assert.deepEqual(ai[0][1], ['15-122 or 15-121', '18-202 or 21-254 or 21-241 or 21-240', '21-127 or 15-151 or 21-128']);
  assert.equal(ai[1][0], 'Corequisites');
  assert.equal(ai[1][1][0], '21-122');
  assert.match(ai[1][1][1], /^36-225 or/);
  assert.equal(rows.find(row => row.code === '07-280').prerequisiteExpression.allOf[0].anyOf[0].minimumGrade, 'C');
  assert.deepEqual(courseFactSections({}), []);
  assert.equal(courseRuleText({ allOf: [{ courseCode: 'A' }, { anyOf: [{ courseCode: 'B' }, { courseCode: 'C' }] }] }), 'A and (B or C)');
  assert.deepEqual(courseRuleRows({ anyOf: [{ allOf: [{ courseCode: 'A' }, { courseCode: 'B' }] }, { courseCode: 'C' }] }), ['(A and B) or C']);
});

test('the reading plan expands the text into unused space and keeps a desktop text column', () => {
  const graph = learningGraph(toConnectionView(gracePathway).detail), ai = graph.nodes.find(n => n.code === '07-280');
  const wide = connectionReadingPlan(graph, ai.id, new Map(), false, 1408);
  assert.equal(wide.informationWidth, 720);
  assert.ok(wide.layout.nodes.every(node => node.width === 178));
  for (const width of [1248, 992, 868]) for (const full of [false, true]) {
    const plan = connectionReadingPlan(graph, ai.id, new Map(), full, width);
    const map = withCourseInformation(plan.layout, ai.id, { width: plan.informationWidth, height: 520 });
    assert.equal(map.informationPlacement, 'beside');
    assert.ok(map.nodes.every(node => node.x + node.width + 12 < map.information.x));
    assert.ok(map.information.x + map.information.width <= width);
  }
});

test('compact reading layouts preserve every route, avoid cards and text, and fit the viewport', () => {
  const graphs = [learningGraph(toConnectionView(gracePathway).detail), ...pathwayDetails.map(detail => learningGraph(detail))];
  assert.ok(graphs.every(graph => graph.nodes.length > 0));
  for (const graph of graphs) for (const root of graph.nodes) for (const width of [1248, 992, 868, 390]) {
    const plan = connectionReadingPlan(graph, root.id, new Map(), true, width);
    const map = withCourseInformation(plan.layout, root.id, { width: plan.informationWidth, height: 520 });
    for (const [index, route] of map.routes.entries()) {
      assert.ok(route.points, `Missing route: ${root.id}/${width}/${route.source}/${route.target}`);
      assert.ok(route.points.every(point => point.x >= 0 && point.x <= width));
      assert.equal(pathHitsNode(route.points, [...map.nodes, map.information]), false);
      for (const other of map.routes.slice(index + 1)) assert.equal(pathsOverlap(route.points, other.points, 6), false);
    }
  }
});

test('an expandable narrow reading card stays below every course and route', () => {
  const graph = learningGraph(toConnectionView(gracePathway).detail);
  for (const root of graph.nodes) {
    const plan = connectionReadingPlan(graph, root.id, new Map(), true, 390);
    const compact = withCourseInformation(plan.layout, root.id, { width: plan.informationWidth, height: 210 });
    const expanded = withCourseInformation(plan.layout, root.id, { width: plan.informationWidth, height: 640 });
    assert.equal(compact.informationPlacement, 'below');
    assert.equal(compact.information.y, expanded.information.y);
    assert.deepEqual(compact.nodes, expanded.nodes);
    assert.ok(expanded.nodes.every(node => node.y + node.height < expanded.information.y));
    assert.ok(expanded.routes.every(route => !pathHitsNode(route.points, [expanded.information])));
    assert.ok(expanded.height >= expanded.information.y + expanded.information.height);
  }
});
