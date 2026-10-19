import test from 'node:test';
import assert from 'node:assert/strict';
import { routeConnection, roundedRoute, crossesRectangle } from '../src/connection-routing.js';

const r = (left, top, right, bottom) => ({ left, top, right, bottom });
function verify(source, target, obstacles, bounds) {
  const route = routeConnection(source, target, obstacles, bounds);
  assert.ok(route?.length >= 2, 'a continuous route exists');
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i];
    assert.ok(a.x === b.x || a.y === b.y);
    for (const obstacle of obstacles) assert.equal(crossesRectangle(a, b, obstacle), false, 'does not pass through a course, note or header');
  }
  const path = roundedRoute(route);
  assert.ok(path.startsWith('M ')); assert.equal(/NaN|Infinity|undefined/.test(path), false);
  return route;
}

test('a long connection routes around intermediate courses and a revealed note', () => {
  const source = r(20, 60, 180, 136), target = r(720, 220, 880, 296);
  const obstacles = [source, target, r(240, 60, 400, 136), r(240, 148, 400, 310), r(480, 60, 640, 136), r(480, 156, 640, 232)];
  verify(source, target, obstacles, r(2, 2, 910, 400));
});
test('wrapped semesters route vertically without crossing their headings or notes', () => {
  const source = r(720, 60, 880, 136), target = r(20, 380, 180, 456);
  const obstacles = [source, target, r(720, 148, 880, 280), r(20, 330, 180, 354), r(240, 380, 400, 456)];
  verify(source, target, obstacles, r(2, 2, 910, 510));
});
test('single-column phone routes use side space when a note blocks the bottom port', () => {
  const source = r(14, 60, 304, 136), target = r(14, 380, 304, 456);
  const obstacles = [source, target, r(14, 148, 304, 300), r(14, 330, 304, 354)];
  verify(source, target, obstacles, r(2, 2, 316, 480));
});
test('routing fails explicitly when an obstacle separates the available canvas', () => {
  const source = r(20, 40, 120, 116), target = r(300, 40, 400, 116);
  const obstacles = [source, target, r(180, -10, 250, 250)];
  assert.equal(routeConnection(source, target, obstacles, r(2, 2, 420, 220)), null);
  assert.equal(roundedRoute(null), '');
});
