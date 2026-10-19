// Orthogonal routes use measured course/note/header rectangles as obstacles.
// The same stroke and arrowhead are used for every visible connection.
const inside = (p, r) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;
export function crossesRectangle(a, b, r) {
  if (a.x === b.x) return a.x > r.left && a.x < r.right && Math.max(a.y, b.y) > r.top && Math.min(a.y, b.y) < r.bottom;
  if (a.y === b.y) return a.y > r.top && a.y < r.bottom && Math.max(a.x, b.x) > r.left && Math.min(a.x, b.x) < r.right;
  throw new Error('Expected an orthogonal segment');
}
class Queue {
  items = [];
  push(item) {
    const a = this.items; a.push(item); let i = a.length - 1;
    while (i > 0) { const parent = (i - 1) >> 1; if (a[parent].score <= item.score) break; a[i] = a[parent]; i = parent; }
    a[i] = item;
  }
  pop() {
    const a = this.items, first = a[0], last = a.pop();
    if (a.length) {
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let child = i * 2 + 1;
        if (child + 1 < a.length && a[child + 1].score < a[child].score) child++;
        if (a[child].score >= last.score) break;
        a[i] = a[child]; i = child;
      }
      a[i] = last;
    }
    return first;
  }
}
export function routeConnection(source, target, rectangles, bounds, clearance = 9) {
  const obstacles = rectangles.map(r => ({ left: r.left - clearance, right: r.right + clearance, top: r.top - clearance, bottom: r.bottom + clearance }));
  const downward = target.top >= source.bottom && target.left <= source.left;
  const ports = r => ({
    right: { x: r.right + clearance, y: (r.top + r.bottom) / 2, tip: { x: r.right + 3, y: (r.top + r.bottom) / 2 } },
    left: { x: r.left - clearance, y: (r.top + r.bottom) / 2, tip: { x: r.left - 3, y: (r.top + r.bottom) / 2 } },
    bottom: { x: (r.left + r.right) / 2, y: r.bottom + clearance, tip: { x: (r.left + r.right) / 2, y: r.bottom + 3 } },
    top: { x: (r.left + r.right) / 2, y: r.top - clearance, tip: { x: (r.left + r.right) / 2, y: r.top - 3 } },
  });
  const valid = p => p.x >= bounds.left && p.x <= bounds.right && p.y >= bounds.top && p.y <= bounds.bottom && !obstacles.some(r => inside(p, r));
  const sourcePorts = ports(source), targetPorts = ports(target);
  const start = (downward ? ['bottom', 'right', 'left', 'top'] : ['right', 'bottom', 'top', 'left']).map(key => sourcePorts[key]).find(valid);
  const end = (downward ? ['top', 'left', 'right', 'bottom'] : ['left', 'top', 'bottom', 'right']).map(key => targetPorts[key]).find(valid);
  if (!start || !end) return null;
  const axis = (values, low, high) => [...new Set(values.filter(n => n >= low && n <= high))].sort((a, b) => a - b);
  const xs = axis([bounds.left, bounds.right, start.x, end.x, ...obstacles.flatMap(r => [r.left, r.right])], bounds.left, bounds.right);
  const ys = axis([bounds.top, bounds.bottom, start.y, end.y, ...obstacles.flatMap(r => [r.top, r.bottom])], bounds.top, bounds.bottom);
  const width = xs.length, point = index => ({ x: xs[index % width], y: ys[Math.floor(index / width)] });
  const startIndex = ys.indexOf(start.y) * width + xs.indexOf(start.x), endIndex = ys.indexOf(end.y) * width + xs.indexOf(end.x);
  if (xs.indexOf(start.x) < 0 || ys.indexOf(start.y) < 0 || xs.indexOf(end.x) < 0 || ys.indexOf(end.y) < 0) return null;
  const blocked = new Map(), segments = new Map();
  function isBlocked(index) {
    if (!blocked.has(index)) blocked.set(index, obstacles.some(r => inside(point(index), r)));
    return blocked.get(index);
  }
  function isClear(a, b) {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (!segments.has(key)) segments.set(key, !obstacles.some(r => crossesRectangle(point(a), point(b), r)));
    return segments.get(key);
  }
  const queue = new Queue(), distance = new Map(), previous = new Map();
  const startKey = startIndex * 3; distance.set(startKey, 0); queue.push({ key: startKey, score: 0, cost: 0 });
  let goal;
  while (queue.items.length) {
    const current = queue.pop(); if (current.cost !== distance.get(current.key)) continue;
    const index = Math.floor(current.key / 3), direction = current.key % 3;
    if (index === endIndex) { goal = current.key; break; }
    const x = index % width, y = Math.floor(index / width), a = point(index);
    const next = [[x > 0 ? index - 1 : -1, 1], [x + 1 < width ? index + 1 : -1, 1], [y > 0 ? index - width : -1, 2], [y + 1 < ys.length ? index + width : -1, 2]];
    for (const [neighbor, nextDirection] of next) {
      if (neighbor < 0 || isBlocked(neighbor) || !isClear(index, neighbor)) continue;
      const b = point(neighbor), key = neighbor * 3 + nextDirection;
      const cost = current.cost + Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + (direction && direction !== nextDirection ? 18 : 0);
      if (cost >= (distance.get(key) ?? Infinity)) continue;
      distance.set(key, cost); previous.set(key, current.key);
      queue.push({ key, cost, score: cost + Math.abs(b.x - end.x) + Math.abs(b.y - end.y) });
    }
  }
  if (goal === undefined) return null;
  const points = [];
  for (let key = goal; key !== undefined; key = previous.get(key)) points.unshift(point(Math.floor(key / 3)));
  const route = [start.tip, ...points, end.tip];
  return route.filter((p, i) => i === 0 || i === route.length - 1 || !((route[i - 1].x === p.x && p.x === route[i + 1].x) || (route[i - 1].y === p.y && p.y === route[i + 1].y)));
}
export function roundedRoute(points, radius = 4) {
  if (!points?.length) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const ab = Math.hypot(b.x - a.x, b.y - a.y), bc = Math.hypot(c.x - b.x, c.y - b.y), r = Math.min(radius, ab / 2, bc / 2);
    const before = { x: b.x + (a.x - b.x) * r / ab, y: b.y + (a.y - b.y) * r / ab };
    const after = { x: b.x + (c.x - b.x) * r / bc, y: b.y + (c.y - b.y) * r / bc };
    path += ` L ${before.x} ${before.y} Q ${b.x} ${b.y} ${after.x} ${after.y}`;
  }
  const end = points.at(-1); return `${path} L ${end.x} ${end.y}`;
}
