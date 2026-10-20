import { academicDetails, careerText, careerLabel, courseHighlights } from './card-model.js';
import { appUrl } from './routing.js';

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const openArrow = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6 14L14 6M6 6H14V14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const yearNames = { 1: 'Freshman', 2: 'Sophomore', 3: 'Junior', 4: 'Senior', 5: 'Fifth-year' };
const closeFlips = new WeakMap();
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') document.querySelectorAll('.pathway-card.is-flipped').forEach(card => closeFlips.get(card)?.());
});

export function createStanding(record) {
  return element('span', `card-standing${record.status === 'current' ? ' is-current' : ''}`, record.status === 'current'
    ? yearNames[record.studentYear] ?? 'Current student'
    : record.graduationYear ? `Class of ${record.graduationYear}` : 'Year not shared');
}

function detailLink(record, returnUrl) {
  const link = element('a', 'card-detail-link', 'View full path');
  link.href = appUrl({ view: 'detail', mode: 'pathways', id: record.id, from: returnUrl });
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `View full path: ${record.displayName ? record.displayName + ', ' : ''}${record.major}, ${careerText(record)} (opens in a new tab)`);
  const arrow = element('span', 'card-open');
  arrow.innerHTML = openArrow;
  link.append(arrow);
  return link;
}

function identity(record, style = 'grouped') {
  const content = element('div', `card-identity identity--${style}`);
  content.append(element('h2', 'identity-major', record.major));
  const career = element('div', 'identity-career-group');
  const role = element('p', 'identity-career', `${careerLabel(record) === 'Exploring' ? 'Exploring ' : ''}${careerText(record)}`);
  if (style === 'direction') {
    const arrow = element('span', 'identity-direction', '↳'); arrow.setAttribute('aria-hidden', 'true'); career.append(arrow);
  }
  career.append(role);
  content.append(career);
  const details = academicDetails(record);
  if (details.length) {
    const list = element('ul', 'academic-details');
    for (const detail of details) {
      const row = element('li');
      row.append(element('span', 'academic-label', `${detail.label} `), document.createTextNode(detail.value));
      list.append(row);
    }
    content.append(list);
  }
  return content;
}

function createTimeline(record) {
  const list = element('ol', 'course-timeline');
  for (const course of courseHighlights(record.courses)) {
    const item = element('li', 'timeline-item');
    const semester = element('span', 'timeline-semester');
    if (course.term?.season && Number.isInteger(course.term.year)) {
      semester.append(element('span', '', course.term.season), element('span', '', course.term.year));
    } else semester.textContent = 'Term not shared';
    const marker = element('span', 'timeline-marker');
    marker.setAttribute('aria-hidden', 'true');
    const info = element('div', 'timeline-course');
    info.append(element('span', 'card-course-title', course.title));
    const meta = element('span', 'card-course-meta');
    if (course.code) meta.append(element('span', '', course.code));
    if (Number.isFinite(course.units)) meta.append(element('span', '', `${course.units} units`));
    info.append(meta);
    item.append(semester, marker, info);
    list.append(item);
  }
  if (!list.children.length) list.append(element('li', 'card-empty-courses', 'No courses shared yet.'));
  return list;
}

function attachFlip(card, front, record, returnUrl, instanceKey = record.id) {
  const toggle = element('button', 'card-flip-toggle');
  toggle.type = 'button';
  const back = element('div', 'card-back');
  back.id = `courses-${instanceKey}`;
  toggle.setAttribute('aria-controls', back.id);
  const header = element('div', 'card-header');
  header.append(element('h2', 'card-back-heading', 'Course highlights'), detailLink(record, returnUrl));
  back.append(header, createTimeline(record));
  const rotor = element('div', 'card-flip-inner');
  rotor.append(front, back);
  function show(open) {
    const hiddenFace = open ? front : back;
    if (hiddenFace.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    card.classList.toggle('is-flipped', open);
    front.inert = open;
    front.setAttribute('aria-hidden', String(open));
    back.inert = !open;
    back.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', `${open ? 'Flip back to profile' : 'Flip to course highlights'}: ${record.displayName ? record.displayName + ', ' : ''}${record.major}, ${careerText(record)}`);
  }
  show(false);
  closeFlips.set(card, () => show(false));
  toggle.addEventListener('click', () => show(!card.classList.contains('is-flipped')));
  card.append(toggle, rotor);
}

export function createResultCard(record, mode, returnUrl = '/', options = {}) {
  if (mode === 'pathways') {
    const card = element('article', 'result-card pathway-card');
    const front = element('div', 'card-front');
    const header = element('div', 'card-header');
    const meta = element('div', 'card-student-meta');
    if (record.displayName) meta.append(element('span', 'card-student-name', record.displayName));
    meta.append(createStanding(record));
    if (options.showDataSource && record.dataSource === 'demo') meta.append(element('span', 'demo-label', 'Demo'));
    header.append(meta, detailLink(record, returnUrl));
    front.append(header, identity(record, options.cardStyle));
    attachFlip(card, front, record, returnUrl, options.instanceKey);
    return card;
  }
  const card = element('a', 'result-card course-result-card');
  card.href = appUrl({ view: 'detail', mode, id: record.id, from: returnUrl });
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  const top = element('div', 'card-top');
  const arrow = element('span', 'card-open');
  arrow.innerHTML = openArrow;
  const actions = element('span', 'course-result-actions');
  if (Number.isFinite(record.units)) actions.append(element('span', 'card-course-units', `${record.units} units`));
  actions.append(arrow);
  top.append(element('span', 'card-code', record.code), actions);
  card.append(top, element('h2', 'card-title', record.title));
  card.append(element('p', 'card-meta', record.level === 'graduate' ? 'Graduate' : 'Undergraduate'));
  card.append(element('p', 'card-department', record.department), element('span', 'sr-only', 'Opens in a new tab. Demo record.'));
  return card;
}
