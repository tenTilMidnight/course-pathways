import test from 'node:test';
import assert from 'node:assert/strict';
import { learningGraph, traceConnections } from '../src/learning-graph.js';
import { pathwayDetails } from '../src/pathway-data.js';
import { mindMapLayout, withCourseInformation, pathHitsNode, elbowPath, routeConnections, pathsCross, pathsOverlap, reduceConnections } from '../src/connection-experiment-model.js';

test('connection maps include only ancestors and descendants and place branches in two dimensions', () => {
  const graph = { nodes: ['a', 'b', 'c', 'd', 'unrelated'].map(id => ({ id })), edges: [{ source: 'a', target: 'b' }, { source: 'a', target: 'c' }, { source: 'b', target: 'd' }, { source: 'c', target: 'd' }], semesters: [] };
  assert.deepEqual(new Set(mindMapLayout(graph, 'a').nodes.map(n => n.id)), new Set(['a', 'b', 'c']));
  const map = mindMapLayout(graph, 'a', new Map(), true);
  assert.deepEqual(new Set(map.nodes.map(n => n.id)), new Set(['a', 'b', 'c', 'd']));
  const b = map.nodes.find(n => n.id === 'b'), c = map.nodes.find(n => n.id === 'c');
  assert.equal(b.x, c.x); assert.notEqual(b.y, c.y);
  assert.equal(map.edges.length, 4);
  const upstream = mindMapLayout(graph, 'd', new Map(), true);
  assert.ok(upstream.nodes.filter(n => n.id !== 'd').every(n => n.rank < 0));
});

test('the reference Database Design map stacks all four later courses without scaling', () => {
  const graph = learningGraph(pathwayDetails.find(d => d.id === 'pathway-03'));
  const root = graph.nodes.find(n => n.title === 'Database Design');
  const map = mindMapLayout(graph, root.id, new Map(), false, 1280, 650);
  const later = map.nodes.filter(n => n.rank > 0);
  assert.equal(later.length, 4);
  assert.equal(new Set(later.map(n => n.x)).size, 1);
  assert.ok(map.width <= 1280);
  assert.ok(map.nodes.every(n => n.width === 178));
  assert.equal(new Set(map.nodes.map(n => n.height)).size, 1);
  const terms = later.sort((a, b) => a.y - b.y).map(n => n.term.season + ' ' + n.term.year);
  assert.deepEqual(terms, ['Spring 2023', 'Fall 2023', 'Spring 2024', 'Spring 2025']);
});

test('all demo maps fit the available width, preserve chronology, and route outside cards and information', () => {
  const time = n => n.term.year * 2 + (n.term.season === 'Fall' ? 1 : 0);
  const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  let checked = 0;
  for (const detail of pathwayDetails) {
    const graph = learningGraph(detail);
    for (const selected of graph.nodes) {
      for (const width of [1280, 900, 390]) {
        const sizes = new Map(graph.nodes.map((n, i) => [n.id, 112 + (i % 3) * 16]));
        const map = withCourseInformation(mindMapLayout(graph, selected.id, sizes, true, width), selected.id, { width: Math.min(460, width - 32), height: selected.note ? 360 : 260 });
        const obstacles = [...map.nodes, map.information];
        assert.deepEqual(new Set(map.nodes.map(n => n.id)), traceConnections(graph, selected.id));
        assert.ok(map.width <= width, 'diagram must not grow beyond viewport');
        assert.ok(obstacles.every(n => n.x >= 0 && n.x + n.width <= map.width), 'all content fits');
        assert.ok(map.nodes.every(n => n.width === 178));
        for (const [i, a] of obstacles.entries()) for (const b of obstacles.slice(i + 1)) assert.equal(overlap(a, b), false);
        for (const band of new Set(map.nodes.map(n => n.band))) {
          const sequence = map.nodes.filter(n => n.band === band);
          assert.ok(sequence.slice(1).every((n, i) => time(n) >= time(sequence[i])), 'siblings keep chronological order');
        }
        const routes = routeConnections(map);
        for (const [index, edge] of routes.entries()) {
          const source = map.nodes.find(n => n.id === edge.source), target = map.nodes.find(n => n.id === edge.target);
          assert.ok(source.rank < target.rank);
          assert.ok(map.vertical ? source.y + source.height < target.y : source.x + source.width < target.x, 'dependencies never run back through the same column');
          assert.ok(time(source) <= time(target));
          assert.ok(edge.points, `Route missing: ${detail.id}/${selected.id}/${edge.source}/${edge.target}/${width}`);
          for (const other of routes.slice(index + 1)) assert.equal(pathsOverlap(edge.points, other.points, 6), false, 'independent arrows cannot share or merge into a parallel run');
          const [start, end] = [edge.points[0], edge.points.at(-1)];
          const beforeEnd = edge.points.at(-2);
          assert.ok(map.vertical ? beforeEnd.x === end.x && beforeEnd.y < end.y : beforeEnd.y === end.y && beforeEnd.x < end.x, 'arrowhead points into its target');
          assert.equal(map.vertical ? start.y : start.x, map.vertical ? source.y + source.height + 12 : source.x + source.width + 12);
          assert.equal(map.vertical ? end.y : end.x, map.vertical ? target.y - 12 : target.x - 12);
          assert.ok(map.vertical ? end.x > target.x && end.x < target.x + target.width : end.y > target.y && end.y < target.y + target.height, 'arrowhead ends at its actual target');
          assert.ok(edge.points.every(p => p.x >= 0 && p.x <= map.width), 'arrows also fit the viewport');
          assert.equal(pathHitsNode(edge.points, obstacles), false);
          assert.ok(edge.points.slice(1).every((p, i) => p.x === edge.points[i].x || p.y === edge.points[i].y));
          assert.equal(/C|NaN|Infinity/.test(elbowPath(edge.points)), false);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 1000);
});

test('the reference learning chain routes without crossings and without hiding any relationship', () => {
  const graph = learningGraph(pathwayDetails.find(d => d.id === 'pathway-01'));
  const root = graph.nodes.find(n => n.title === 'Human-Centered Systems');
  const layout = mindMapLayout(graph, root.id, new Map(), true);
  const routes = routeConnections(layout);
  assert.equal(routes.length, layout.edges.length);
  for (const [i, a] of routes.entries()) {
    assert.ok(a.points);
    assert.equal(pathHitsNode(a.points, layout.nodes), false);
    for (const b of routes.slice(i + 1)) {
      if (a.source !== b.source && a.target !== b.target) assert.equal(pathsCross(a.points, b.points), false, a.target + ' crosses ' + b.target);
    }
  }
});

test('the full Database Design chain fits one desktop view with forward, uncrossed branches', () => {
  const graph = learningGraph(pathwayDetails.find(d => d.id === 'pathway-03'));
  const root = graph.nodes.find(n => n.title === 'Database Design');
  const map = withCourseInformation(mindMapLayout(graph, root.id, new Map(), true, 1243), root.id, { width: 320, height: 280 });
  assert.equal(map.vertical, false);
  assert.equal(map.nodes.length, 12);
  assert.ok(map.width <= 1243 && map.nodes.every(node => node.y + node.height <= 650), 'course diagram fits independently of auxiliary information');
  const routes = routeConnections(map);
  for (const [i, a] of routes.entries()) {
    assert.ok(a.points);
    for (const b of routes.slice(i + 1)) {
      if (a.source !== b.source && a.target !== b.target) assert.equal(pathsCross(a.points, b.points), false);
    }
  }
});

test('crossing detection counts intersections but permits a shared endpoint', () => {
  const segment = (a, b) => [a, b];
  assert.equal(pathsCross(segment({ x: 0, y: 0 }, { x: 100, y: 100 }), segment({ x: 0, y: 100 }, { x: 100, y: 0 })), true);
  assert.equal(pathsCross(segment({ x: 0, y: 0 }, { x: 100, y: 100 }), segment({ x: 0, y: 0 }, { x: 100, y: 0 })), false);
});

test('parallel overlap detection includes shared-source and shared-target segments', () => {
  const a = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 80 }];
  assert.equal(pathsOverlap(a, [{ x: 20, y: 0 }, { x: 60, y: 0 }]), true);
  assert.equal(pathsOverlap(a, [{ x: 40, y: 80 }, { x: 40, y: 20 }]), true);
  assert.equal(pathsOverlap(a, [{ x: 20, y: 4 }, { x: 60, y: 4 }], 6), true);
  assert.equal(pathsOverlap(a, [{ x: 0, y: 8 }, { x: 30, y: 8 }], 6), false);
});

test('visible chains suppress shortcuts while preserving reachability and source data', () => {
  const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }, { source: 'a', target: 'c' }, { source: 'a', target: 'd' }];
  const graph = { nodes: ['a', 'b', 'c', 'd'].map(id => ({ id })), edges, semesters: [] };
  const map = mindMapLayout(graph, 'a');
  assert.deepEqual(map.edges, [edges[0], edges[1], edges[3]]);
  assert.equal(edges.length, 4);
  assert.deepEqual(reduceConnections([edges[2], edges[3]]), [edges[2], edges[3]], 'hidden intermediate does not justify removal');
  for (const detail of pathwayDetails) {
    const complete = learningGraph(detail), reduced = { ...complete, edges: reduceConnections(complete.edges) };
    for (const course of complete.nodes) assert.deepEqual(traceConnections(reduced, course.id), traceConnections(complete, course.id));
  }
});

test('course information floats separately while equal-sized nodes and arrows remain unobstructed', () => {
  const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  for (const detail of pathwayDetails) {
    const graph = learningGraph(detail);
    for (const selected of graph.nodes) {
      const map = withCourseInformation(mindMapLayout(graph, selected.id, new Map(), true), selected.id, { width: 320, height: selected.note ? 280 : 160 });
      assert.equal(new Set(map.nodes.map(n => n.width + ':' + n.height)).size, 1);
      assert.ok(map.nodes.every(n => !overlap(n, map.information)));
      for (const route of routeConnections(map)) {
        assert.ok(route.points, `${detail.id}/${selected.id} missing route`);
        assert.equal(pathHitsNode(route.points, [...map.nodes, map.information]), false, 'Route must avoid both the course and floating information');
      }
    }
  }
});
