import { element } from './result-cards.js';
import { termLabel } from './pathway-model.js';
import { learningGraph, traceConnections, focusConnections } from './learning-graph.js';
import { routeConnection, roundedRoute } from './connection-routing.js';

export function createCourseGraph(detail, onPreview, closePreview = () => {}) {
  const graph = learningGraph(detail);
  const root = element('section', 'course-graph');
  if (!graph.nodes.length) return { element: root, destroy() {}, clearSelection() {}, revealSemester() {} };
  let hovered, focused, selected, candidate, focusRoot;
  let frame, revealFrame, destroyed = false;
  const actions = element('div', 'graph-actions');
  const focusContext = element('span', 'graph-focus-context');
  const focusButton = element('button', 'text-button', 'Focus connections'); focusButton.type = 'button'; focusButton.disabled = true;
  actions.append(focusContext, focusButton); root.append(actions);
  const scroll = element('div', 'graph-scroll');
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', 'Courses by semester. Scroll horizontally for more semesters. Focus a course to see its learning connections.');
  const stage = element('div', 'graph-stage');
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg'); svg.classList.add('graph-edges'); svg.setAttribute('aria-hidden', 'true');
  const defs = document.createElementNS(namespace, 'defs');
  const marker = document.createElementNS(namespace, 'marker'); marker.id = 'connection-arrow';
  Object.entries({ viewBox: '0 0 8 8', refX: '7', refY: '4', markerWidth: '8', markerHeight: '8', markerUnits: 'userSpaceOnUse', orient: 'auto' }).forEach(([name, value]) => marker.setAttribute(name, value));
  const arrow = document.createElementNS(namespace, 'path');
  Object.entries({ d: 'M1 1L7 4L1 7', fill: 'none', stroke: 'var(--brand)', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }).forEach(([name, value]) => arrow.setAttribute(name, value));
  marker.append(arrow); defs.append(marker); svg.append(defs); stage.append(svg);
  const nodes = new Map(), entries = new Map(), notes = new Map(), columns = new Map();
  const lines = graph.edges.map(edge => {
    const path = document.createElementNS(namespace, 'path'); path.setAttribute('marker-end', 'url(#connection-arrow)');
    path.dataset.source = edge.source; path.dataset.target = edge.target; svg.append(path); return { ...edge, path, active: false };
  });
  const schedule = () => { if (!destroyed) { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); } };
  function highlight() {
    const id = selected ?? focused ?? hovered ?? focusRoot;
    const connected = id ? traceConnections(graph, id) : null;
    if (id) candidate = id;
    for (const [nodeId, node] of nodes) {
      node.classList.toggle('is-connected', Boolean(connected?.has(nodeId)));
      node.classList.toggle('is-selected', nodeId === id);
      node.classList.toggle('is-dimmed', Boolean(connected && !connected.has(nodeId)));
      if (notes.has(nodeId)) notes.get(nodeId).hidden = nodeId !== (focused ?? hovered);
    }
    for (const line of lines) {
      line.active = Boolean(connected?.has(line.source) && connected?.has(line.target) && !entries.get(line.source)?.hidden && !entries.get(line.target)?.hidden);
      if (!line.active) line.path.classList.remove('is-active');
    }
    const name = graph.nodes.find(node => node.id === (focusRoot ?? candidate))?.title;
    focusContext.textContent = name ?? '';
    focusButton.textContent = focusRoot ? 'Show all semesters' : 'Focus connections';
    focusButton.disabled = !focusRoot && (!candidate || traceConnections(graph, candidate).size < 2);
    focusButton.setAttribute('aria-label', focusRoot ? 'Show all semesters' : name ? `Focus connections for ${name}` : 'Focus connections');
    schedule();
  }
  for (const semester of graph.semesters) {
    const courses = graph.nodes.filter(course => course.semesterId === semester.id);
    if (!courses.length) continue;
    const column = element('section', 'graph-semester'); column.dataset.semester = semester.id;
    column.append(element('h2', '', termLabel(semester.term))); columns.set(semester.id, column);
    for (const course of courses) {
      const entry = element('div', 'graph-course-entry'); entries.set(course.id, entry);
      const node = element('button', 'graph-node'); node.type = 'button'; node.dataset.enrollment = course.id;
      const before = graph.edges.filter(edge => edge.target === course.id).map(edge => graph.nodes.find(item => item.id === edge.source).title);
      const after = graph.edges.filter(edge => edge.source === course.id).map(edge => graph.nodes.find(item => item.id === edge.target).title);
      node.setAttribute('aria-label', [course.title, termLabel(course.term), before.length ? `Supported by ${before.join(', ')}` : '', after.length ? `Supports ${after.join(', ')}` : ''].filter(Boolean).join('. '));
      node.setAttribute('aria-haspopup', 'dialog'); node.setAttribute('aria-expanded', 'false'); node.setAttribute('aria-controls', 'course-preview');
      const top = element('span', 'graph-node-top');
      if (course.code) top.append(element('span', 'graph-code', course.code));
      if (Number.isFinite(course.units)) top.append(element('span', 'detail-course-units', `${course.units} units`));
      node.append(top, element('span', 'graph-course-title', course.title));
      entry.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = course.id; highlight(); } });
      entry.addEventListener('pointermove', event => {
        if (event.pointerType !== 'touch' && (event.movementX || event.movementY)) {
          hovered = course.id;
          if (focused) { focused = undefined; highlight(); }
        }
      });
      entry.addEventListener('pointerleave', () => { hovered = undefined; highlight(); });
      node.addEventListener('focus', () => { if (node.matches(':focus-visible')) { focused = course.id; highlight(); } });
      node.addEventListener('blur', () => { focused = undefined; highlight(); });
      node.addEventListener('click', () => { selected = course.id; highlight(); onPreview(course, node); });
      entry.append(node);
      if (course.note) {
        const note = element('p', 'detail-course-note', course.note); note.hidden = true;
        note.id = `graph-note-${course.id}`; node.setAttribute('aria-describedby', note.id);
        note.setAttribute('aria-label', `Note on ${course.title}`); entry.append(note); notes.set(course.id, note);
      }
      column.append(entry); nodes.set(course.id, node);
    }
    stage.append(column);
  }
  function setFocus(id) {
    closePreview();
    focusRoot = id;
    hovered = focused = selected = undefined;
    const subset = focusRoot ? focusConnections(graph, focusRoot) : graph;
    const included = new Set(subset.nodes.map(node => node.id)), semesters = new Set(subset.semesters.map(item => item.id));
    for (const [id, entry] of entries) entry.hidden = !included.has(id);
    for (const [id, column] of columns) column.hidden = !semesters.has(id);
    highlight();
    document.getElementById('announcements').textContent = focusRoot ? `Showing ${subset.nodes.length} connected courses across ${semesters.size} semesters.` : 'Showing all semesters.';
    focusButton.focus({ preventScroll: true });
  }
  focusButton.addEventListener('click', () => setFocus(focusRoot ? undefined : candidate));
  scroll.append(stage); root.append(scroll);
  function draw() {
    if (!stage.isConnected || destroyed) return;
    const count = [...columns.values()].filter(column => !column.hidden).length;
    const style = getComputedStyle(stage);
    const minWidth = count * 180 + Math.max(0, count - 1) * parseFloat(style.columnGap) + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    stage.style.setProperty('--graph-columns', String(count));
    stage.style.setProperty('--graph-min-width', `${minWidth}px`);
    const stageRect = stage.getBoundingClientRect();
    svg.setAttribute('width', String(stage.clientWidth)); svg.setAttribute('height', String(stage.clientHeight));
    const rect = node => { const r = node.getBoundingClientRect(); return { left: r.left - stageRect.left, right: r.right - stageRect.left, top: r.top - stageRect.top, bottom: r.bottom - stageRect.top }; };
    const obstacles = [...stage.querySelectorAll('.graph-node, .graph-semester > h2, .detail-course-note')].filter(node => node.getClientRects().length).map(rect);
    const bounds = { left: 2, top: 2, right: stage.clientWidth - 2, bottom: stage.clientHeight - 2 };
    for (const line of lines) {
      if (!line.active) continue;
      const points = routeConnection(rect(nodes.get(line.source)), rect(nodes.get(line.target)), obstacles, bounds);
      line.path.setAttribute('d', roundedRoute(points));
      line.path.dataset.routed = String(Boolean(points));
      line.path.classList.toggle('is-active', Boolean(points));
    }
  }
  const observer = new ResizeObserver(schedule); observer.observe(stage); observer.observe(scroll);
  document.fonts.ready.then(schedule); schedule();
  return {
    element: root,
    clearSelection() { selected = undefined; highlight(); },
    canFocus(id) { return traceConnections(graph, id).size > 1; },
    focusCourse(id) { if (nodes.has(id)) { setFocus(id); root.scrollIntoView({ block: 'nearest' }); } },
    revealSemester(id) {
      const column = columns.get(id); if (!column) return;
      column.classList.add('is-target-semester');
      cancelAnimationFrame(revealFrame);
      revealFrame = requestAnimationFrame(() => { if (!destroyed && column.isConnected) column.scrollIntoView({ block: 'nearest', inline: 'center' }); });
    },
    destroy() { destroyed = true; observer.disconnect(); cancelAnimationFrame(frame); cancelAnimationFrame(revealFrame); },
  };
}
