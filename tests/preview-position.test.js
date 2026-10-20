import test from 'node:test';
import assert from 'node:assert/strict';
import { previewPosition, previewReadingWidth } from '../src/preview-position.js';

test('preview chooses the adjacent side and remains inside the viewport at each edge', () => {
  const size = { width: 344, height: 280 }, viewport = { width: 1280, height: 800 };
  assert.deepEqual(previewPosition({ left: 20, right: 300, top: 120, bottom: 220 }, size, viewport), { left: 312, top: 120, side: 'right' });
  assert.deepEqual(previewPosition({ left: 960, right: 1240, top: 700, bottom: 780 }, size, viewport), { left: 604, top: 508, side: 'left' });
});

test('narrow-screen preview stays near the course above or below instead of becoming a side drawer', () => {
  const size = { width: 344, height: 280 }, viewport = { width: 375, height: 700 };
  assert.deepEqual(previewPosition({ left: 16, right: 359, top: 100, bottom: 200 }, size, viewport), { left: 16, top: 212, side: 'below' });
  assert.deepEqual(previewPosition({ left: 16, right: 359, top: 500, bottom: 600 }, size, viewport), { left: 16, top: 208, side: 'above' });
});

test('zoomed or short viewports clamp the preview to the available visual viewport', () => {
  const viewport = { left: 100, top: 200, width: 280, height: 200 };
  const result = previewPosition({ left: 120, right: 350, top: 220, bottom: 330 }, { width: 344, height: 400 }, viewport);
  assert.equal(result.left, 112);
  assert.equal(result.top, 212);
});

test('larger course previews remain beside timeline courses and fit small visual viewports', () => {
  const size = { width: 560, height: 420 };
  assert.deepEqual(previewPosition({ left: 80, right: 550, top: 220, bottom: 300 }, size, { width: 1351, height: 800 }), { left: 562, top: 220, side: 'right' });
  assert.deepEqual(previewPosition({ left: 800, right: 1250, top: 530, bottom: 620 }, size, { width: 1351, height: 800 }), { left: 228, top: 368, side: 'left' });
  const mobile = previewPosition({ left: 16, right: 374, top: 100, bottom: 180 }, size, { width: 390, height: 700 });
  assert.ok(mobile.left >= 12 && mobile.left + 366 <= 378 && mobile.top >= 12 && mobile.top + 420 <= 688);
});

test('reading width fills the empty timeline side without causing the introduction to fall below', () => {
  for (const anchor of [{ left: 80, right: 600, top: 100, bottom: 180 }, { left: 800, right: 1320, top: 100, bottom: 180 }]) {
    const viewport = { width: 1440, height: 900 };
    const width = previewReadingWidth(anchor, viewport);
    assert.equal(width, 760);
    const position = previewPosition(anchor, { width, height: 600 }, viewport);
    assert.ok(['left', 'right'].includes(position.side));
    assert.ok(position.left >= 12 && position.left + width <= 1428);
  }
  assert.equal(previewReadingWidth({ left: 16, right: 374 }, { width: 390 }), 366);
});
