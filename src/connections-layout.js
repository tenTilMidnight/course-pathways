import { focusConnections } from './learning-graph.js';

import { termOrder } from './pathway-model.js';
const termPosition = termOrder;
export function mindMapLayout(graph, rootId, sizes = new Map(), fullChain = false, availableWidth = 1200, geometry = {}) {
  const adjacent = new Set([rootId]);
  graph.edges.forEach(e => { if (e.source === rootId) adjacent.add(e.target); if (e.target === rootId) adjacent.add(e.source); });
  const focused = fullChain ? focusConnections(graph, rootId) : { nodes: graph.nodes.filter(n => adjacent.has(n.id)), edges: graph.edges.filter(e => adjacent.has(e.source) && adjacent.has(e.target)) };
  focused.edges = reduceConnections(focused.edges);
  // Relationship depth determines the columns. Never pack a course together
  // with its prerequisites just to save width: every dependency moves forward.
  const levels = new Map(focused.nodes.map(n => [n.id, 0]));
  for (let i = 0; i < focused.nodes.length; i++) {
    for (const edge of focused.edges) levels.set(edge.target, Math.max(levels.get(edge.target), levels.get(edge.source) + 1));
  }
  // Move shorter prerequisite branches up to their first consumer. A leaf
  // need not start in column one when its only consumer is three columns away.
  for (const node of [...focused.nodes].sort((a, b) => levels.get(b.id) - levels.get(a.id))) {
    const children = focused.edges.filter(edge => edge.source === node.id).map(edge => levels.get(edge.target));
    if (children.length) levels.set(node.id, Math.min(...children) - 1);
  }
  const byTime = (a, b) => (termPosition(a.term) ?? Infinity) - (termPosition(b.term) ?? Infinity);
  const groups = Array.from({ length: Math.max(...levels.values()) + 1 }, (_, i) => focused.nodes.filter(n => levels.get(n.id) === i).sort(byTime));
  // Keep dates ordered within a column; align same-term siblings by branch.
  for (let pass = 0; pass < 4; pass++) {
    const positions = new Map(groups.flatMap(g => g.map((n, i) => [n.id, i])));
    const incoming = pass % 2 === 0;
    for (const group of incoming ? groups : [...groups].reverse()) {
      const score = node => {
        const neighbours = focused.edges.filter(e => (incoming ? e.target : e.source) === node.id).map(e => positions.get(incoming ? e.source : e.target));
        return neighbours.length ? neighbours.reduce((a, b) => a + b, 0) / neighbours.length : positions.get(node.id);
      };
      group.sort((a, b) => byTime(a, b) || score(a) - score(b));
    }
  }
  const cardWidth = 178, padding = geometry.padding ?? 36, rowGap = geometry.rowGap ?? 24, top = geometry.top ?? 40;
  const cardHeight = Math.max(geometry.cardHeight ?? 112, ...focused.nodes.map(n => { const size = sizes.get(n.id); return (typeof size === 'number' ? size : size?.height) ?? (geometry.cardHeight ?? 112); }));
  const room = groups.length > 1 ? (availableWidth - padding * 2 - groups.length * cardWidth) / (groups.length - 1) : 72;
  const vertical = room < 40;
  const gap = Math.min(geometry.columnGap ?? 72, room);
  const nodes = [], rootLevel = levels.get(rootId);
  let width, height;
  if (!vertical) {
    const graphWidth = groups.length * cardWidth + (groups.length - 1) * gap + padding * 2;
    const inset = Math.max(0, (availableWidth - graphWidth) / 2);
    const rows = Math.max(...groups.map(group => group.length));
    width = availableWidth;
    for (const [column, courses] of groups.entries()) for (const [row, course] of courses.entries()) {
      nodes.push({ ...course, width: cardWidth, height: cardHeight, rank: column - rootLevel, band: column,
        x: inset + padding + column * (cardWidth + gap), y: top + ((rows - courses.length) / 2 + row) * (cardHeight + rowGap) });
    }
    // Align each branch to its actual parents rather than centering every
    // column on the entire map. Isotonic spacing keeps chronological siblings
    // separate while letting their combined center sit on their shared parent.
    const byId = new Map(nodes.map(node => [node.id, node]));
    for (let column = 1; column < groups.length; column++) {
      const columnNodes = groups[column].map(course => byId.get(course.id));
      const parentSets = columnNodes.map(node => focused.edges.filter(edge => edge.target === node.id).map(edge => edge.source));
      const oneBranch = parentSets.every(parents => parents.length === 1 && parents[0] === parentSets[0][0]);
      const blocks = [];
      columnNodes.forEach((node, index) => {
        const parents = focused.edges.filter(edge => edge.target === node.id).map(edge => byId.get(edge.source));
        const ideal = parents.length ? parents.reduce((sum, parent) => sum + parent.y + parent.height / 2, 0) / parents.length - cardHeight / 2 : node.y;
        blocks.push({ first: index, last: index, sum: ideal - index * (cardHeight + rowGap), count: 1 });
        while (blocks.length > 1) {
          const b = blocks.at(-1), a = blocks.at(-2);
          if (a.sum / a.count <= b.sum / b.count) break;
          blocks.splice(-2, 2, { first: a.first, last: b.last, sum: a.sum + b.sum, count: a.count + b.count });
        }
      });
      for (const block of blocks) for (let i = block.first; i <= block.last; i++) {
        // Mixed branches share the original vertical budget, preventing a busy
        // graph from growing taller at every level. A single sibling branch
        // can move as a unit to align exactly with its parent.
        const offset = oneBranch ? block.sum / block.count : Math.max(top, Math.min(block.sum / block.count, top + (rows - columnNodes.length) * (cardHeight + rowGap)));
        columnNodes[i].y = offset + i * (cardHeight + rowGap);
      }
    }
    const shift = Math.max(0, top - Math.min(...nodes.map(node => node.y)));
    nodes.forEach(node => { node.y += shift; });
    height = Math.max(...nodes.map(n => n.y + n.height)) + (geometry.bottom ?? 28);
  } else {
    // When a horizontal chain cannot fit at readable size, orient the whole
    // graph downwards. Siblings wrap within their level, never across it.
    width = availableWidth;
    const capacity = Math.max(1, Math.floor((width - padding * 2 + 40) / (cardWidth + 40)));
    let y = top;
    for (const [level, courses] of groups.entries()) {
      for (let row = 0; row < Math.ceil(courses.length / capacity); row++) {
        const items = courses.slice(row * capacity, (row + 1) * capacity);
        const start = (width - (items.length * cardWidth + (items.length - 1) * 40)) / 2;
        items.forEach((course, i) => nodes.push({ ...course, width: cardWidth, height: cardHeight, rank: level - rootLevel, band: level,
          x: start + i * (cardWidth + 40), y }));
        y += cardHeight + 48;
      }
    }
    height = y - 20;
  }
  return { nodes, edges: focused.edges, width, maxWidth: availableWidth, height, vertical };
}

// Reserve a readable text column before rendering instead of placing a fixed
// card into whatever space happens to remain after centering the diagram.
export function connectionReadingPlan(graph, rootId, sizes = new Map(), fullChain = false, availableWidth = 1200) {
  const base = mindMapLayout(graph, rootId, sizes, fullChain, availableWidth);
  if (availableWidth < 760) return { layout: { ...base, informationBelow: true }, informationWidth: Math.min(720, availableWidth - 32) };
  const columns = new Set(base.nodes.map(node => node.band)).size;
  const compactGraphWidth = columns * 178 + (columns - 1) * 44 + 24;
  const informationWidth = Math.min(720, Math.max(320, availableWidth - compactGraphWidth - 24));
  const graphWidth = availableWidth - informationWidth - 24;
  const diagram = mindMapLayout(graph, rootId, sizes, fullChain, graphWidth, { padding: 12, columnGap: 44, rowGap: 16, top: 24, bottom: 16, cardHeight: 104 });
  return {
    layout: {
      ...diagram, routes: routeConnections(diagram), width: availableWidth, maxWidth: availableWidth,
      informationColumn: { x: graphWidth + 24, width: informationWidth, top: 24 },
    },
    informationWidth,
  };
}

export function withCourseInformation(layout, rootId, size) {
  const root = layout.nodes.find(n => n.id === rootId);
  const overlaps = (a, b) => a.x < b.x + b.width + 14 && a.x + a.width > b.x - 14 && a.y < b.y + b.height + 14 && a.y + a.height > b.y - 14;
  const width = size.width, height = size.height;
  // Balance the nodes and route their connections first. A whole-map translation
  // can then release unused space for reading without changing any branch.
  const routes = routeConnections(layout);
  if (layout.informationColumn) {
    const information = { ...layout.informationColumn, y: layout.informationColumn.top, height };
    return { ...layout, routes, information, informationPlacement: 'beside', height: Math.max(layout.height, information.y + height + 16) };
  }
  const bound = layout.width;
  const points = routes.flatMap(route => route.points ?? []);
  const left = Math.min(...layout.nodes.map(node => node.x), ...points.map(point => point.x));
  const right = Math.max(...layout.nodes.map(node => node.x + node.width), ...points.map(point => point.x));
  const bottom = Math.max(...layout.nodes.map(n => n.y + n.height), ...points.map(p => p.y));
  // An expandable reading card must not grow into courses below an internal gap.
  if (layout.informationBelow) {
    const information = { x: Math.max(16, (bound - width) / 2), y: bottom + 24, width, height };
    return { ...layout, routes, information, informationPlacement: 'below', height: information.y + height + 24 };
  }
  if (right - left + width + 56 <= bound) {
    const dx = 12 - left;
    const information = { x: bound - width - 12, y: 40, width, height };
    return {
      ...layout,
      nodes: layout.nodes.map(node => ({ ...node, x: node.x + dx })),
      routes: routes.map(route => ({ ...route, points: route.points?.map(point => ({ x: point.x + dx, y: point.y })) ?? null })),
      information, informationPlacement: 'beside',
      height: Math.max(layout.height, information.y + height + 24),
    };
  }
  const clampX = x => Math.max(16, Math.min(x, bound - width - 16));
  const xValues = [root.x + root.width + 28, root.x - width - 28, root.x, root.x + root.width - width, root.x + (root.width - width) / 2, 16, bound - width - 16];
  const yValues = [root.y + (root.height - height) / 2, root.y, root.y + root.height + 24, root.y - height - 24, 28, ...layout.nodes.flatMap(n => [n.y + n.height + 24, n.y - height - 24])];
  const candidates = xValues.flatMap(x => yValues.map(y => ({ x: clampX(x), y, width, height })));
  const clear = candidates.filter(box => box.y >= 28 && layout.nodes.every(n => !overlaps(box, n)) && routes.every(route => !route.points || !pathHitsNode(route.points, [box], 12)));
  const score = box => Math.abs(box.x + width / 2 - root.x - root.width / 2) + 1.5 * Math.abs(box.y + height / 2 - root.y - root.height / 2);
  clear.sort((a, b) => score(a) - score(b));
  const information = clear[0] ?? { x: clampX(root.x + (root.width - width) / 2), y: bottom + 24, width, height };
  return { ...layout, information, informationPlacement: information.y >= bottom ? 'below' : 'within', routes, height: Math.max(layout.height, information.y + height + 24) };
}

// Display-only transitive reduction; enrollment/supporting-course data stays intact.
export function reduceConnections(edges) {
  return edges.filter(edge => {
    const seen = new Set([edge.source]), pending = [edge.source];
    while (pending.length) {
      const id = pending.pop();
      for (const next of edges) {
        if (next === edge || next.source !== id) continue;
        if (next.target === edge.target) return false;
        if (!seen.has(next.target)) { seen.add(next.target); pending.push(next.target); }
      }
    }
    return true;
  });
}

const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function simplify(points) {
  const unique = points.filter((p, i) => !i || distance(p, points[i - 1]) >= .01);
  return unique.filter((p, i) => {
    const a = unique[i - 1], b = unique[i + 1];
    return !a || !b || !((a.x === p.x && p.x === b.x) || (a.y === p.y && p.y === b.y));
  });
}
export function pathHitsNode(points, nodes, clearance = 6) {
  return points.slice(1).some((b, i) => {
    const a = points[i];
    return nodes.some(n => Math.max(a.x, b.x) > n.x - clearance && Math.min(a.x, b.x) < n.x + n.width + clearance &&
      Math.max(a.y, b.y) > n.y - clearance && Math.min(a.y, b.y) < n.y + n.height + clearance);
  });
}
function connectionCandidates(source, target, nodes, vertical = false, ports = { start: .5, end: .5 }) {
  const flip = n => ({ ...n, x: n.y, y: n.x, width: n.height, height: n.width });
  const s = vertical ? flip(source) : source, t = vertical ? flip(target) : target;
  const obstacles = vertical ? nodes.map(flip) : nodes;
  const candidates = [], seen = new Set();
  const add = points => {
    points = simplify(points);
    if (points.length < 2 || points[1].y !== points[0].y || points[1].x <= points[0].x ||
        points.at(-1).y !== points.at(-2).y || points.at(-1).x <= points.at(-2).x) return;
    const key = points.map(p => p.x + ',' + p.y).join(' ');
    if (seen.has(key) || pathHitsNode(points, obstacles, 10)) return;
    seen.add(key);
    const length = points.slice(1).reduce((sum, p, i) => sum + distance(p, points[i]), 0);
    candidates.push({ points: vertical ? points.map(p => ({ x: p.y, y: p.x })) : points, cost: length + (points.length - 2) * 24 });
  };
  // Dedicated inter-column gutters keep elbows outside cards, including long skips.
  const columns = [...new Set(obstacles.map(n => n.x))].sort((a, b) => a - b);
  const gutters = columns.slice(1).map((x, i) => (x + Math.max(...obstacles.filter(n => n.x === columns[i]).map(n => n.x + n.width))) / 2);
  const rails = [...new Set(obstacles.flatMap(n => [n.y - 18, n.y + n.height + 18]))];
  for (const start of [ports.start]) for (const end of [ports.end]) {
    const a = { x: s.x + s.width + 12, y: s.y + s.height * start };
    const b = { x: t.x - 12, y: t.y + t.height * end };
    if (a.y === b.y) add([a, b]);
    const lanes = [(a.x + b.x) / 2, ...gutters].flatMap(x => [x, x - 8, x + 8, x - 16, x + 16]);
    for (const x of lanes) {
      if (x < a.x || x > b.x) continue;
      add([a, { x, y: a.y }, { x, y: b.y }, b]);
    }
    const exits = [8, 16, 24].map(offset => a.x + offset);
    const entries = [8, 16, 24].map(offset => b.x - offset);
    for (const exit of exits) for (const entry of entries) for (const y of rails.flatMap(y => [y, y - 8, y + 8])) {
      if (exit > entry) continue;
      add([a, { x: exit, y: a.y }, { x: exit, y }, { x: entry, y }, { x: entry, y: b.y }, b]);
    }
  }
  candidates.sort((a, b) => a.cost - b.cost);
  return candidates;
}

// Positive-length collinear runs are overlaps even when arrows share a course.
// Clearance also prevents parallel strokes/halos from visually merging.
export function pathsOverlap(a, b, clearance = .01) {
  if (!a || !b) return false;
  for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) {
    const p = a[i - 1], q = a[i], r = b[j - 1], s = b[j];
    for (const [axis, along] of [['x', 'y'], ['y', 'x']]) {
      if (Math.abs(p[axis] - q[axis]) > .001 || Math.abs(r[axis] - s[axis]) > .001 || Math.abs(p[axis] - r[axis]) >= clearance) continue;
      if (Math.min(Math.max(p[along], q[along]), Math.max(r[along], s[along])) -
          Math.max(Math.min(p[along], q[along]), Math.min(r[along], s[along])) > .01) return true;
    }
  }
  return false;
}

export function pathsCross(a, b) {
  if (!a?.length || !b?.length) return false;
  const cross = (u, v) => u.x * v.y - u.y * v.x;
  const endpoint = (points, p) => [points[0], points.at(-1)].some(q => distance(p, q) < .01);
  for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) {
    const p = a[i - 1], q = b[j - 1], r = { x: a[i].x - p.x, y: a[i].y - p.y }, s = { x: b[j].x - q.x, y: b[j].y - q.y };
    const denominator = cross(r, s);
    if (Math.abs(denominator) < 1e-8) continue;
    const diff = { x: q.x - p.x, y: q.y - p.y }, t = cross(diff, s) / denominator, u = cross(diff, r) / denominator;
    if (t >= -.00001 && t <= 1.00001 && u >= -.00001 && u <= 1.00001) {
      const point = { x: p.x + t * r.x, y: p.y + t * r.y };
      if (!endpoint(a, point) || !endpoint(b, point)) return true;
    }
  }
  return false;
}

// Dense/narrow maps occasionally need more than a single bypass lane. Search
// the free orthogonal corridors, preserving individual ports and arrow spacing.
function corridorRoute(source, target, layout, ports, occupied) {
  const vertical = layout.vertical;
  const a = vertical ? { x: source.x + source.width * ports.start, y: source.y + source.height + 12 }
    : { x: source.x + source.width + 12, y: source.y + source.height * ports.start };
  const b = vertical ? { x: target.x + target.width * ports.end, y: target.y - 12 }
    : { x: target.x - 12, y: target.y + target.height * ports.end };
  const obstacles = layout.nodes;
  const points = occupied.flatMap(route => route.points ?? []);
  const coordinates = (axis, size, max) => [...new Set([
    a[axis], b[axis], 12, max - 12,
    ...obstacles.flatMap(n => [18, 26, 34, 42].flatMap(offset => [n[axis] - offset, n[axis] + n[size] + offset])),
    ...points.flatMap(p => [p[axis] - 8, p[axis] + 8]),
  ])].filter(value => value >= 12 && value <= max - 12).sort((x, y) => x - y);
  const xs = coordinates('x', 'width', layout.width);
  const ys = coordinates('y', 'height', Math.max(layout.height, ...points.map(p => p.y)) + 40);
  const start = ys.indexOf(a.y) * xs.length + xs.indexOf(a.x);
  const end = ys.indexOf(b.y) * xs.length + xs.indexOf(b.x);
  const point = id => ({ x: xs[id % xs.length], y: ys[Math.floor(id / xs.length)] });
  const heap = [], scores = new Map(), previous = new Map(), segments = new Map();
  const push = item => {
    heap.push(item); let i = heap.length - 1;
    while (i) { const parent = (i - 1) >> 1; if (heap[parent].score <= item.score) break; heap[i] = heap[parent]; i = parent; }
    heap[i] = item;
  };
  const pop = () => {
    const first = heap[0], last = heap.pop();
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++;
        if (heap[child].score >= last.score) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = last;
    }
    return first;
  };
  const startKey = start * 2 + (vertical ? 1 : 0);
  scores.set(startKey, 0); push({ key: startKey, score: 0 });
  while (heap.length) {
    const current = pop();
    if (current.score !== scores.get(current.key)) continue;
    const id = Math.floor(current.key / 2), direction = current.key % 2;
    if (id === end) {
      const path = []; let key = current.key;
      while (key !== undefined) { path.push(point(Math.floor(key / 2))); key = previous.get(key); }
      return simplify(path.reverse());
    }
    const x = id % xs.length, y = Math.floor(id / xs.length);
    const neighbours = [[x - 1, y, 0], [x + 1, y, 0], [x, y - 1, 1], [x, y + 1, 1]];
    for (const [nx, ny, nextDirection] of neighbours) {
      if (nx < 0 || nx >= xs.length || ny < 0 || ny >= ys.length) continue;
      const next = ny * xs.length + nx, key = next * 2 + nextDirection;
      if ((id === start || next === end) && (vertical ? ny <= y || nx !== x : nx <= x || ny !== y)) continue;
      const segmentKey = Math.min(id, next) + ':' + Math.max(id, next);
      if (!segments.has(segmentKey)) {
        const segment = [point(id), point(next)];
        const blocked = pathHitsNode(segment, obstacles, 10) || occupied.some(route => pathsOverlap(segment, route.points, 6));
        const crossings = occupied.filter(route => pathsCross(segment, route.points)).length;
        segments.set(segmentKey, blocked ? Infinity : distance(...segment) + crossings * 10000);
      }
      const score = current.score + segments.get(segmentKey) + (direction === nextDirection ? 0 : 24);
      if (score >= (scores.get(key) ?? Infinity)) continue;
      scores.set(key, score); previous.set(key, current.key); push({ key, score });
    }
  }
  return null;
}

export function routeConnections(layout) {
  if (layout.routes) return layout.routes;
  const byId = new Map(layout.nodes.map(n => [n.id, n]));
  const obstacles = [...layout.nodes, ...(layout.information ? [layout.information] : [])];
  const span = e => byId.get(e.target).rank - byId.get(e.source).rank;
  const routes = [...layout.edges].sort((a, b) => span(a) - span(b)).map(edge => ({ ...edge, points: null }));
  // Each relationship has its own port; merging at a common endpoint would
  // otherwise make independent requirements look like one shared arrow.
  const center = id => { const node = byId.get(id); return layout.vertical ? node.x + node.width / 2 : node.y + node.height / 2; };
  const port = (edge, own, other) => {
    const siblings = routes.filter(e => e[own] === edge[own]).sort((a, b) => center(a[other]) - center(b[other]) || a[other].localeCompare(b[other]));
    return siblings.length === 1 ? .5 : .2 + .6 * siblings.indexOf(edge) / (siblings.length - 1);
  };
  const alternatives = new Map();
  const candidatesFor = edge => {
    if (!alternatives.has(edge)) alternatives.set(edge, connectionCandidates(byId.get(edge.source), byId.get(edge.target), obstacles, layout.vertical, { start: port(edge, 'source', 'target'), end: port(edge, 'target', 'source') }));
    return alternatives.get(edge);
  };
  const crossings = (points, edge) => routes.filter(other => other !== edge && pathsCross(points, other.points)).length;
  for (let pass = 0; pass < 3; pass++) for (const edge of routes) {
    let best = Infinity;
    for (const candidate of candidatesFor(edge)) {
      if (routes.some(other => other !== edge && pathsOverlap(candidate.points, other.points, 6))) continue;
      const score = candidate.cost + 10000 * crossings(candidate.points, edge);
      if (score < best) { best = score; edge.points = candidate.points; }
      if (score === candidate.cost) break;
    }
    if (!edge.points) edge.points = corridorRoute(byId.get(edge.source), byId.get(edge.target), layout,
      { start: port(edge, 'source', 'target'), end: port(edge, 'target', 'source') }, routes.filter(other => other !== edge));
  }
  return routes;
}

// Small rounded corners soften the elbows without introducing sweeping curves.
export function elbowPath(points, radius = 6) {
  if (!points?.length) return '';
  let d = 'M ' + points[0].x + ' ' + points[0].y;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], p = points[i], b = points[i + 1];
    const before = distance(a, p), after = distance(p, b), r = Math.min(radius, before / 2, after / 2);
    const u = { x: p.x + (a.x - p.x) * r / before, y: p.y + (a.y - p.y) * r / before };
    const v = { x: p.x + (b.x - p.x) * r / after, y: p.y + (b.y - p.y) * r / after };
    d += ' L ' + u.x + ' ' + u.y + ' Q ' + p.x + ' ' + p.y + ' ' + v.x + ' ' + v.y;
  }
  const last = points.at(-1);
  return d + ' L ' + last.x + ' ' + last.y;
}
