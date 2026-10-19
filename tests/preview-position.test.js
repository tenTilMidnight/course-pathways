import test from 'node:test';
import assert from 'node:assert/strict';
import { previewPosition } from '../src/preview-position.js';

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
