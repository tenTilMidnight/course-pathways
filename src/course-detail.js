import { university } from './config.js';
import { courses, pathways } from './demo-catalog.js';
import { pathwayDetails } from './pathway-data.js';
import { courseDetails, coursePrograms } from './course-data.js';
import { courseExperiences, relatedCourseConnections, readCourseProgram } from './course-model.js';
import { safeReturnUrl, termLabel } from './pathway-model.js';
import { careerText, careerLabel } from './card-model.js';
import { createStanding, createResultCard, element } from './result-cards.js';
import { appUrl } from './routing.js';

function section(title, className = '') {
  const node = element('section', className); node.append(element('h2', '', title)); return node;
}
function empty(text) { return element('p', 'detail-empty', text); }
function button(text, className, action) { const node = element('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node; }

export function mountCourseDetail(params) {
  const root = document.getElementById('detail-preview'); root.className = 'course-detail';
  const back = element('a', 'text-button detail-back'); back.href = safeReturnUrl(params.get('from'));
  const origin = new URL(back.href);
  back.textContent = origin.searchParams.get('view') === 'detail' ? origin.searchParams.get('mode') === 'pathways' ? 'Back to pathway' : 'Back to course' : origin.searchParams.get('view') === 'results' ? 'Back to search results' : 'Back to search';
  root.replaceChildren(back);
  const course = courses.find(item => item.id === params.get('id') && item.universityId === university.id);
  const detail = courseDetails.find(item => item.id === course?.id && item.universityId === university.id);
  if (!course || !detail) { root.append(element('h1', '', 'Course not found'), empty('This course is no longer available.')); root.setAttribute('aria-busy', 'false'); return; }
  document.title = `${course.title} · Course Pathways`;
  const inferred = origin.searchParams.get('mode') === 'pathways' ? pathways.find(profile => profile.id === origin.searchParams.get('id') && profile.universityId === university.id)?.major : course.department;
  let program = readCourseProgram(params, coursePrograms, inferred);
  const route = () => appUrl({ view: 'detail', mode: 'courses', id: course.id, ...(program ? { program } : {}) });
  const header = element('header', 'course-profile');
  const top = element('div', 'course-profile-meta');
  top.append(element('span', 'course-code', course.code), element('span', 'demo-label', 'Demo data'), element('span', 'course-profile-units', Number.isFinite(course.units) ? `${course.units} units` : 'Units not shared'));
  header.append(top, element('h1', '', course.title), element('p', 'course-subtitle', `${course.department} / ${course.level === 'graduate' ? 'Graduate' : 'Undergraduate'}`));
  if (course.description) header.append(element('p', 'course-description', course.description));
  root.append(header);

  const facts = element('div', 'course-facts');
  const offerings = section('Recent offerings');
  const table = element('table', 'course-offerings');
  const head = element('thead'), headingRow = element('tr');
  ['Semester', 'Instructor'].forEach(text => { const th = element('th', '', text); th.scope = 'col'; headingRow.append(th); }); head.append(headingRow); table.append(head);
  const body = element('tbody');
  detail.offerings.forEach(offering => { const row = element('tr'); row.append(element('td', '', termLabel(offering.term)), element('td', '', offering.instructor || 'Not shared')); body.append(row); });
  table.append(body); offerings.append(table); if (!detail.offerings.length) offerings.append(empty('No offerings shared yet.'));
  const requirements = section('Current requirements');
  const label = element('label', 'course-program-control', 'Program');
  const select = element('select'); select.id = 'course-program'; select.setAttribute('aria-label', 'Program');
  coursePrograms.forEach(name => { const option = element('option', '', name); option.value = name; select.append(option); }); select.value = program;
  label.append(select); requirements.append(label, element('p', 'course-catalog', detail.catalog.label));
  const mappings = element('ul', 'course-requirements'); requirements.append(mappings);
  function renderRequirements() {
    const labels = detail.mappings.find(item => item.program === program)?.requirements ?? [];
    mappings.replaceChildren(...(labels.length ? labels : ['No mapping shared for this program.']).map(text => element('li', '', text)));
  }
  select.addEventListener('change', () => {
    program = select.value; renderRequirements();
    const next = new URLSearchParams(location.search); next.set('program', program); history.replaceState(null, '', appUrl(next));
    root.querySelectorAll('a[data-course-context]').forEach(link => {
      const destination = new URL(link.href); destination.searchParams.set('from', route()); link.href = `${destination.pathname}${destination.search}`;
    });
    document.getElementById('announcements').textContent = `Showing current demo requirements for ${program}.`;
  });
  renderRequirements(); facts.append(offerings, requirements); root.append(facts);

  const connections = relatedCourseConnections(course.id, university.id, pathwayDetails);
  if (connections.earlier.length || connections.later.length) {
    const related = section('In student pathways', 'course-connections');
    related.append(element('p', 'course-section-context', 'Shared learning connections'));
    const flow = element('div', 'course-connection-flow');
    for (const [direction, labelText] of [['earlier', 'Earlier coursework'], ['later', 'Later coursework']]) {
      if (direction === 'later') {
        const center = element('div', 'course-connection-current');
        if (connections.earlier.length) center.append(element('span', '', '→'));
        center.append(element('strong', '', course.title));
        if (connections.later.length) center.append(element('span', '', '→'));
        flow.append(center);
      }
      if (!connections[direction].length) continue;
      const column = element('div', 'course-connection-column'); column.append(element('h3', '', labelText));
      connections[direction].forEach(item => {
        const link = element('a', 'course-related-link', item.title); link.href = appUrl({ view: 'detail', mode: 'courses', id: item.courseId, from: route() });
        link.dataset.courseContext = 'true';
        link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', `${item.title} (opens in a new tab)`); column.append(link);
      });
      flow.append(column);
    }
    if (!connections.earlier.length || !connections.later.length) flow.classList.add('has-two-columns');
    related.append(flow); root.append(related);
  }

  const experiences = courseExperiences(course.id, university.id, pathways, pathwayDetails);
  function pathLink(experience, text = 'View full path ↗') {
    const link = element('a', 'text-button', text);
    link.dataset.courseContext = 'true';
    link.href = appUrl({ view: 'detail', mode: 'pathways', id: experience.profile.id, semester: experience.enrollment.semesterId, from: route() });
    link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', `${text}: ${experience.profile.major}, ${careerText(experience.profile)} (opens in a new tab)`); return link;
  }
  function profileInfo(experience) {
    const node = element('div', 'course-peer-identity');
    node.append(createStanding(experience.profile), element('h3', '', experience.profile.major), element('p', 'course-peer-role', `${careerLabel(experience.profile) === 'Exploring' ? 'Exploring ' : ''}${careerText(experience.profile)}`));
    return node;
  }
  function paginatedSection(title, rows, build, className) {
    const block = section(title, className), list = element('div', 'course-peer-list'); let visible = 6;
    const more = button('Show more', 'text-button', () => { const firstNew = visible; visible += 6; render(); list.children[firstNew]?.querySelector('a')?.focus(); });
    function render() { list.replaceChildren(...rows.slice(0, visible).map(build)); more.hidden = rows.length <= visible; }
    render(); block.append(list, more); if (!rows.length) block.append(empty(title === 'Student notes' ? 'No notes shared yet.' : 'No student pathways shared yet.')); root.append(block);
  }
  paginatedSection('Who took this course', experiences, experience => {
    const card = createResultCard(experience.profile, 'pathways', route(), { instanceKey: `${course.id}-${experience.enrollment.id}` });
    const context = element('div', 'course-peer-context'); context.append(element('p', 'course-peer-term', termLabel(experience.enrollment.term)));
    if (experience.requirements.length) context.append(element('p', '', experience.requirements.join(' / ')));
    if (experience.catalog) context.append(element('p', 'course-historical-catalog', experience.catalog.label));
    card.querySelector('.card-front').append(context);
    card.querySelectorAll('.card-detail-link').forEach(link => {
      const destination = new URL(link.href); destination.searchParams.set('semester', experience.enrollment.semesterId);
      link.href = `${destination.pathname}${destination.search}`; link.dataset.courseContext = 'true';
    });
    return card;
  }, 'course-peers');
  paginatedSection('Student notes', experiences.filter(item => item.enrollment.note), experience => {
    const row = element('article', 'course-peer-note');
    const meta = element('div', 'course-note-heading'); meta.append(profileInfo(experience), element('span', 'course-peer-term', termLabel(experience.enrollment.term)));
    row.append(meta, element('blockquote', 'detail-course-note', experience.enrollment.note), pathLink(experience)); return row;
  }, 'course-notes');
  root.setAttribute('aria-busy', 'false');
}
