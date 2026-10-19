// Place the compact preview beside its course, falling above/below on narrow screens.
export function previewPosition(anchor, size, viewport) {
  const margin = 12, gap = 12;
  const left = viewport.left ?? 0, top = viewport.top ?? 0;
  const right = left + viewport.width, bottom = top + viewport.height;
  const width = Math.min(size.width, viewport.width - margin * 2);
  const height = Math.min(size.height, viewport.height - margin * 2);
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  let x, y, side;
  if (anchor.right + gap + width <= right - margin) {
    x = anchor.right + gap; y = anchor.top; side = 'right';
  } else if (anchor.left - gap - width >= left + margin) {
    x = anchor.left - gap - width; y = anchor.top; side = 'left';
  } else {
    x = anchor.left;
    const below = bottom - margin - anchor.bottom - gap;
    const above = anchor.top - gap - top - margin;
    side = below >= height || below >= above ? 'below' : 'above';
    y = side === 'below' ? anchor.bottom + gap : anchor.top - gap - height;
  }
  return { left: clamp(x, left + margin, right - margin - width), top: clamp(y, top + margin, bottom - margin - height), side };
}
