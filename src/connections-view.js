import { pathways } from './demo-catalog.js';
import { pathwayDetails } from './pathway-data.js';
import { learningGraph } from './learning-graph.js';
import { connectionReadingPlan, withCourseInformation, routeConnections, elbowPath } from './connections-layout.js';
import { element } from './result-cards.js';
import { termLabel } from './pathway-model.js';
import { careerText } from './card-model.js';
import { appUrl } from './routing.js';
import { courseDescription } from './course-description.js';
import { appendCourseFacts } from './course-information.js';

const ns = 'http://www.w3.org/2000/svg';
const duration = 520;
const easing = 'cubic-bezier(.2,.8,.2,1)';
function svgElement(tag, attrs = {}) {
  const node = document.createElementNS(ns, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}
function button(text, className, handler) {
  const node = element('button', className, text);
  node.type = 'button'; node.addEventListener('click', handler); return node;
}

export function mountConnections(params, options = {}) {
  const profiles = options.profiles ?? pathways;
  const details = options.details ?? pathwayDetails;
  const lifecycle = new AbortController();
  const listen = (target, type, callback, config = {}) => target.addEventListener(type, callback, { ...config, signal: lifecycle.signal });
  let disposed = false;
  let stylesheet = document.querySelector('link[data-connection-style]');
  if (!stylesheet) {
    stylesheet = element('link'); stylesheet.rel = 'stylesheet'; stylesheet.dataset.connectionStyle = 'true';
    stylesheet.href = new URL('./connections-view.css', import.meta.url).href; document.head.append(stylesheet);
  }
  if (!options.embedded) document.title = `${options.title ?? 'Connection experiment'} · Course Pathways`;
  const root = options.root ?? document.getElementById('detail-preview');
  root.className = options.embedded ? 'pathway-content connection-embedded' : 'connection-experiment';
  root.hidden = false; root.replaceChildren();
  const back = element('a', 'text-button', 'Back to pathway');
  const heading = element('header', 'experiment-heading'), identity = element('div');
  identity.append(element('h1', '', options.title ?? 'Connection'), element('p', '', options.subtitle ?? 'Experiment · Demo data'));
  const select = element('select'); select.setAttribute('aria-label', 'Student pathway');
  for (const p of profiles) {
    const option = element('option', '', p.displayName ?? (p.major + ' / ' + careerText(p)));
    option.value = p.id; select.append(option);
  }
  select.value = profiles.some(p => p.id === params.get('id')) ? params.get('id') : profiles[0].id;
  select.hidden = profiles.length === 1;
  heading.append(identity, select);
  const hint = element('p', 'experiment-hint', 'Click a course to see connections');
  const workspace = element('div', 'connection-workspace');
  const overview = element('div', 'connection-overview');
  overview.setAttribute('aria-label', 'Courses by semester');
  const panel = element('section', 'connection-focus');
  panel.id = 'connection-focus'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Selected course connections');
  const panelHeader = element('header', 'connection-focus-header');
  const controls = element('div', 'experiment-controls');
  const close = button('Collapse connections', 'text-button', () => restore(true));
  controls.append(close); panelHeader.append(controls);
  const scroll = element('div', 'connection-map-scroll'); scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', 'Connected courses. Select a course for its full chain; activate the selected course again to switch between direct and full connections.');
  const mapFrame = element('div', 'connection-map-frame'), map = element('div', 'connection-map');
  mapFrame.append(map); scroll.append(mapFrame);
  panel.append(panelHeader, scroll);
  workspace.append(overview, panel);
  if (!options.embedded) root.append(back, heading, hint);
  root.append(workspace);
  // An unclipped visual layer lets courses travel from the semester grid into the map.
  const flightLayer = element('div', 'connection-flight-layer');
  flightLayer.setAttribute('aria-hidden', 'true'); document.body.append(flightLayer);
  const flights = new Map(), overviewNodes = new Map(), extraAnimations = new Set();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let graph, activeId, anchor, fullChain = false, frame;
  let ownScroll = false;
  let lastWidth = 0;
  let informationObserver;

  function animateElement(node, frames, options) {
    if (reducedMotion.matches) return null;
    const animation = node.animate(frames, options);
    extraAnimations.add(animation);
    animation.finished.then(() => extraAnimations.delete(animation), () => extraAnimations.delete(animation));
    return animation;
  }
  function stopMotion() {
    for (const flight of flights.values()) {
      flight.animation.cancel(); flight.node.remove();
      flight.target?.style.removeProperty('opacity');
    }
    flights.clear();
    for (const animation of extraAnimations) animation.cancel();
    extraAnimations.clear();
  }
  function snapshotMap() {
    return new Map([...map.querySelectorAll('.experiment-course')].map(node => {
      const visible = flights.get(node.dataset.course)?.node ?? node;
      return [node.dataset.course, { rect: visible.getBoundingClientRect(), node: visible.cloneNode(true) }];
    }));
  }
  function snapshotOverview() {
    return new Map([...overviewNodes].map(([id, node]) => [id, { rect: node.getBoundingClientRect(), node: node.cloneNode(true) }]));
  }
  function moveCourse(id, node, from, to, target = null, leaving = false) {
    if (reducedMotion.matches || !from.width || !to.width) return;
    node.classList.add('connection-flight-course');
    node.style.cssText = '';
    Object.assign(node.style, { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px' });
    node.tabIndex = -1; node.removeAttribute('id'); node.removeAttribute('aria-controls');
    node.removeAttribute('aria-expanded'); node.removeAttribute('aria-pressed');
    for (const child of node.querySelectorAll('[id]')) child.removeAttribute('id');
    for (const child of node.querySelectorAll('button, a')) child.tabIndex = -1;
    if (!leaving) node.addEventListener('click', e => { if (!e.target.closest('.connection-course-details')) chooseCourse(id); });
    else node.style.pointerEvents = 'none';
    flightLayer.append(node);
    if (target) target.style.opacity = '0';
    const start = 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + from.width / to.width + ',' + from.height / to.height + ')';
    const animation = node.animate([
      { transform: start, opacity: 1 },
      { transform: 'translate(0,0) scale(1,1)', opacity: leaving ? 0 : 1 }
    ], { duration, easing, fill: 'both' });
    const flight = { node, target, animation }; flights.set(id, flight);
    animation.finished.then(() => {
      if (flights.get(id) !== flight) return;
      target?.style.removeProperty('opacity'); node.remove(); flights.delete(id);
    }, () => {});
  }
  function courseNode(course, inMap) {
    const selected = inMap && course.id === activeId;
    const toggle = button('', 'experiment-course', () => chooseCourse(course.id, !inMap));
    const node = toggle;
    node.dataset.course = course.id;
    toggle.dataset.course = course.id;
    const action = !inMap ? 'show connections' : selected && fullChain ? 'show direct connections' : 'show full connections';
    toggle.setAttribute('aria-label', course.title + ', ' + termLabel(course.term) + ', ' + action);
    toggle.setAttribute('aria-controls', panel.id);
    if (inMap) toggle.setAttribute('aria-pressed', String(selected));
    toggle.setAttribute('aria-expanded', String(selected && fullChain));
    if (inMap) toggle.title = selected ? (fullChain ? 'Show direct connections' : 'Show full connections') : 'Explore full connections';
    const top = element('span', 'experiment-course-top');
    top.append(element('span', '', course.code), element('span', '', Number.isFinite(course.units) ? `${course.units} ${course.units === 1 ? 'unit' : 'units'}` : ''));
    const title = element('span', 'experiment-course-title', course.title);
    toggle.append(top, title);
    if (inMap) {
      toggle.append(element('span', 'experiment-course-term', termLabel(course.term)));
      node.addEventListener('pointerenter', () => emphasize(course.id));
      node.addEventListener('pointerleave', () => emphasize(activeId));
      toggle.addEventListener('focus', () => emphasize(course.id));
    }
    if (selected) {
      title.id = 'connection-course-title';
      toggle.setAttribute('aria-details', 'connection-course-information');
      const cue = element('span', 'connection-expansion-cue', fullChain ? '−' : '+');
      cue.setAttribute('aria-hidden', 'true'); toggle.append(cue);
    }
    return node;
  }
  function emphasize(id) {
    for (const edge of map.querySelectorAll('.connection-edge')) edge.classList.toggle('is-emphasized', edge.dataset.source === id || edge.dataset.target === id);
  }
  function courseInformation(course) {
    const details = element('aside', 'connection-course-details');
    details.id = 'connection-course-information';
    details.dataset.course = course.id;
    details.setAttribute('aria-labelledby', 'connection-information-title');
    const heading = element('h2', 'connection-info-heading', course.title);
    heading.id = 'connection-information-title';
    const copy = element('div', 'connection-course-copy');
    if (courseDescription(course)) copy.append(element('p', 'connection-description', courseDescription(course)));
    if (course.unitsNote) copy.append(element('p', 'preview-term', course.unitsNote));
    if (options.courseContext?.(course)) copy.append(element('p', 'preview-term', options.courseContext(course)));
    if (course.transferRequirements?.length) {
      const list = element('ul', 'transfer-rule-list');
      course.transferRequirements.forEach(rule => list.append(element('li', '', rule))); copy.append(list);
    }
    appendCourseFacts(copy, course);
    if (course.courseId) {
      const link = element('a', 'text-button', 'View course details ↗');
      link.href = appUrl({ view: course.detailView ?? 'detail', mode: 'courses', id: course.courseId, from: options.returnUrl?.() ?? appUrl({ view: options.view ?? 'connection-experiment', id: select.value }) });
      link.target = '_blank'; link.rel = 'noopener noreferrer'; copy.append(link);
    }
    details.append(heading, copy);
    if (course.note) {
      const note = element('aside', 'connection-selected-note');
      note.append(element('h3', '', 'Student note'), element('p', '', course.note));
      details.append(note);
    }
    return details;
  }
  function drawMap({ animate = false, origins = null, focus = false } = {}) {
    if (disposed || !activeId) return;
    const focusedId = map.contains(document.activeElement) ? document.activeElement.dataset.course : null;
    const before = origins ?? snapshotMap(), fallback = snapshotOverview();
    const previousInformation = map.querySelector('.connection-course-details');
    const expandedFacts = previousInformation?.dataset.course === activeId
      ? [...previousInformation.querySelectorAll('details[open]')].map(node => node.dataset.fact) : [];
    informationObserver?.disconnect();
    stopMotion();
    map.replaceChildren();
    const availableWidth = Math.floor(scroll.getBoundingClientRect().width);
    const base = connectionReadingPlan(graph, activeId, new Map(), fullChain, availableWidth).layout, nodes = new Map();
    for (const course of base.nodes) {
      const node = courseNode(course, true); node.style.width = course.width + 'px';
      node.classList.toggle('is-root', course.id === activeId);
      map.append(node); nodes.set(course.id, node);
    }
    const sizes = new Map([...nodes].map(([id, node]) => [id, { width: node.offsetWidth, height: node.offsetHeight }]));
    const details = courseInformation(graph.nodes.find(n => n.id === activeId));
    for (const fact of details.querySelectorAll('details')) fact.open = expandedFacts.includes(fact.dataset.fact);
    const reading = connectionReadingPlan(graph, activeId, sizes, fullChain, availableWidth);
    details.style.width = reading.informationWidth + 'px';
    details.style.maxHeight = Math.max(240, innerHeight - 104) + 'px';
    nodes.get(activeId).after(details);
    const layout = withCourseInformation(reading.layout, activeId, { width: details.offsetWidth, height: details.offsetHeight });
    map.dataset.informationPlacement = layout.informationPlacement;
    const boxes = new Map(layout.nodes.map(n => [n.id, n]));
    const routes = routeConnections(layout);
    const points = routes.flatMap(r => r.points ?? []);
    const shiftX = Math.max(0, 12 - Math.min(12, ...points.map(p => p.x)));
    const clearance = 12;
    const shiftY = Math.max(0, clearance - Math.min(clearance, ...points.map(p => p.y)));
    const width = Math.max(layout.width, ...points.map(p => p.x + 20)) + shiftX, height = Math.max(layout.height, ...points.map(p => p.y + 20)) + shiftY;
    mapFrame.style.width = width + 'px'; mapFrame.style.height = height + 'px';
    map.style.width = width + 'px'; map.style.height = height + 'px';
    for (const course of layout.nodes) {
      const node = nodes.get(course.id);
      Object.assign(node.style, { left: course.x + shiftX + 'px', top: course.y + shiftY + 'px', height: course.height + 'px' });
    }
    Object.assign(details.style, { left: layout.information.x + shiftX + 'px', top: layout.information.y + shiftY + 'px' });
    const svg = svgElement('svg', { class: 'connection-curves', width, height, 'aria-hidden': 'true' });
    const defs = svgElement('defs'), marker = svgElement('marker', { id: 'mindmap-arrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 8, markerHeight: 8, markerUnits: 'userSpaceOnUse', orient: 'auto' });
    marker.append(svgElement('path', { d: 'M1 1L7 4L1 7', fill: 'none', stroke: '#941120', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    defs.append(marker); svg.append(defs);
    for (const route of routes) {
      const group = svgElement('g', { class: 'connection-edge', transform: 'translate(' + shiftX + ' ' + shiftY + ')' });
      group.dataset.source = route.source; group.dataset.target = route.target; group.dataset.routed = String(Boolean(route.points));
      const d = elbowPath(route.points);
      group.append(svgElement('path', { class: 'curve-halo', d }), svgElement('path', { class: 'curve-line', d, 'marker-end': 'url(#mindmap-arrow)' })); svg.append(group);
    }
    map.prepend(svg); emphasize(activeId);
    // Disclosure controls change only the reading card's height, never the map.
    const diagramHeight = Math.max(reading.layout.height, ...layout.nodes.map(node => node.y + node.height + 24), ...points.map(point => point.y + 20)) + shiftY;
    informationObserver = new ResizeObserver(() => {
      const expandedHeight = Math.max(diagramHeight, layout.information.y + shiftY + details.offsetHeight + 24);
      mapFrame.style.height = expandedHeight + 'px';
      map.style.height = expandedHeight + 'px';
      svg.setAttribute('height', expandedHeight);
      fitWorkspace();
    });
    informationObserver.observe(details);
    fitWorkspace();
    const selected = boxes.get(activeId);
    scroll.scrollLeft = Math.max(0, (selected.x + selected.width / 2 + shiftX) - scroll.clientWidth / 2);
    scroll.scrollTop = Math.max(0, (selected.y + shiftY + selected.height / 2) - scroll.clientHeight / 2);
    for (const [id, node] of overviewNodes) {
      node.classList.toggle('is-origin', id === activeId);
      node.classList.toggle('is-connected', nodes.has(id));
      node.setAttribute('aria-expanded', String(id === activeId));
      node.closest('section').classList.toggle('is-active-semester', node.closest('section').contains(overviewNodes.get(activeId)));
    }
    if (focus) {
      const rect = nodes.get(activeId).getBoundingClientRect();
      const top = rect.top, bottom = rect.bottom;
      const panelRect = panel.getBoundingClientRect();
      if (panelRect.height <= innerHeight + 48 && (panelRect.top < 12 || panelRect.bottom > innerHeight - 12)) {
        // Keep the diagram and the information visible together when they fit.
        ownScroll = true;
        window.scrollBy({ top: panelRect.top - (panelRect.height <= innerHeight - 24 ? 12 : 0), behavior: 'instant' });
      } else if (top < 80 || bottom > innerHeight - 36) {
        ownScroll = true;
        window.scrollBy({ top: top - Math.max(80, (innerHeight - (bottom - top)) / 2), behavior: 'instant' });
      }
    }
    if (animate && !reducedMotion.matches) {
      for (const [id, node] of nodes) {
        const origin = before.get(id) ?? fallback.get(id);
        if (origin) moveCourse(id, node.cloneNode(true), origin.rect, node.getBoundingClientRect(), node);
      }
      for (const [id, old] of before) {
        if (!nodes.has(id) && fallback.has(id) && !origins) moveCourse(id, old.node, old.rect, fallback.get(id).rect, null, true);
      }
      animateElement(svg, [{ opacity: 0 }, { opacity: 1 }], { duration: 280, delay: 200, fill: 'backwards', easing: 'ease-out' });
      animateElement(details, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260, delay: 100, fill: 'backwards', easing: 'ease-out' });
    }
    if (focus || focusedId) {
      const node = nodes.get(focus ? activeId : focusedId);
      (node?.matches('button') ? node : node?.querySelector('button'))?.focus({ preventScroll: true });
    }
    document.getElementById('announcements').textContent = graph.nodes.find(n => n.id === activeId).title + ', ' + (fullChain ? 'full chain' : 'direct connections') + ', ' + layout.nodes.length + ' courses. Description and note beside the selected course. Activate it again to switch scope. Escape to return to semesters.';
  }
  function fitWorkspace() {
    // Only reserve space beneath the overlay; semester coordinates never change.
    workspace.style.minHeight = activeId ? Math.max(overview.offsetHeight, panel.offsetTop + panel.offsetHeight) + 'px' : '';
  }
  function chooseCourse(id, fromOverview = false) {
    const opening = !activeId;
    const before = opening || fromOverview ? new Map([...snapshotOverview(), ...snapshotMap()]) : null;
    fullChain = opening ? false : id === activeId ? !fullChain : true;
    activeId = id; anchor = overviewNodes.get(id);
    if (opening) {
      panel.hidden = false;
      workspace.classList.add('has-connection');
    }
    if (opening) panel.style.top = Math.max(0, anchor.closest('section').offsetTop - 12) + 'px';
    drawMap({ animate: true, origins: before, focus: true });
    // The background is now a location reference, not a second set of controls.
    // Keep keyboard navigation and assistive technology on the readable courses.
    overview.inert = true;
    if (opening) animateElement(panel, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
  }
  function restore(focus = false, immediate = false) {
    const before = snapshotMap();
    informationObserver?.disconnect();
    activeId = null; stopMotion(); panel.hidden = true; workspace.classList.remove('has-connection');
    overview.inert = false;
    workspace.style.minHeight = '';
    for (const node of overviewNodes.values()) {
      node.classList.remove('is-origin', 'is-connected'); node.setAttribute('aria-expanded', 'false');
      node.closest('section').classList.remove('is-active-semester');
    }
    const fallback = snapshotOverview();
    if (!immediate && !reducedMotion.matches) {
      for (const [id, old] of before) {
        // Exit toward the compact semester card, without squeezing its expanded
        // description/note into the old button's much smaller bounds.
        if (fallback.has(id)) moveCourse(id, fallback.get(id).node, old.rect, fallback.get(id).rect, overviewNodes.get(id));
      }
    }
    map.replaceChildren();
    if (focus && anchor?.isConnected) anchor.focus({ preventScroll: true });
    document.getElementById('announcements').textContent = 'Showing all courses by semester.';
  }
  function loadProfile() {
    restore(false, true); graph = learningGraph(details.find(d => d.id === select.value));
    overview.replaceChildren(); overviewNodes.clear();
    back.href = appUrl({ view: options.backView ?? 'detail', mode: 'pathways', id: select.value });
    if (!options.embedded) history.replaceState(null, '', appUrl({ view: options.view ?? 'connection-experiment', id: select.value }));
    for (const semester of graph.semesters) {
      const column = element('section'); column.append(element('h2', '', [semester.academicYearLabel, termLabel(semester.term)].filter(Boolean).join(' / ')));
      for (const course of graph.nodes.filter(n => n.semesterId === semester.id)) {
        const node = courseNode(course, false); overviewNodes.set(course.id, node); column.append(node);
      }
      overview.append(column);
    }
  }
  // Empty map space and the original grid both return to the semester overview.
  // A drag is not a dismissal; the first outside click never selects a hidden course.
  let pointerStart;
  listen(document, 'pointerdown', e => { pointerStart = { x: e.clientX, y: e.clientY }; }, { capture: true });
  listen(document, 'click', e => {
    if (!activeId || e.target.closest('.connection-map .experiment-course, .connection-flight-course, .experiment-controls, .connection-course-details')) return;
    if (pointerStart && Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 6) return;
    if (workspace.contains(e.target)) { e.preventDefault(); e.stopPropagation(); restore(true); }
    else restore(false);
  }, { capture: true });
  listen(select, 'change', loadProfile);
  listen(root, 'keydown', e => { if (e.key === 'Escape' && activeId) { e.preventDefault(); restore(true); } });
  const observer = new ResizeObserver(() => {
    const width = workspace.clientWidth;
    if (Math.abs(width - lastWidth) < 1) return;
    lastWidth = width;
    cancelAnimationFrame(frame);
    if (activeId) frame = requestAnimationFrame(() => drawMap());
  });
  observer.observe(workspace);
  // Fixed visual copies settle immediately if the page scrolls during a transition.
  listen(window, 'scroll', e => {
    if (e.target !== document) return;
    if (ownScroll) { ownScroll = false; return; }
    if (flights.size) stopMotion();
  }, { capture: true });
  listen(reducedMotion, 'change', () => {
    stopMotion();
    if (activeId) drawMap(); else { panel.hidden = true; workspace.style.minHeight = ''; }
  });
  document.fonts.ready.then(() => { if (!disposed && activeId) drawMap(); });
  listen(stylesheet, 'load', () => { if (activeId) drawMap(); });
  loadProfile();
  return () => {
    disposed = true; lifecycle.abort(); observer.disconnect(); informationObserver?.disconnect(); cancelAnimationFrame(frame);
    stopMotion(); flightLayer.remove();
  };
}
