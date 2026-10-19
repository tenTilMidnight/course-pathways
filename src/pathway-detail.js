import { university } from './config.js';
import { pathways } from './demo-catalog.js';
import { pathwayDetails } from './pathway-data.js';
import { academicDetails, careerText, careerLabel } from './card-model.js';
import { element, createStanding } from './result-cards.js';
import { timeLayouts, readPathwayView, safeReturnUrl, termLabel, orderedSemesters, enrollments } from './pathway-model.js';
import { previewPosition } from './preview-position.js';
import { appUrl } from './routing.js';

function button(text, className, action) {
  const node = element('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node;
}
function empty(text) { return element('p', 'detail-empty', text); }

export function mountPathwayDetail(params) {
  const root = document.getElementById('detail-preview');
  const profile = pathways.find(record => record.id === params.get('id') && record.universityId === university.id);
  const detail = pathwayDetails.find(record => record.id === profile?.id && record.universityId === university.id);
  const back = element('a', 'text-button detail-back', 'Back to search results'); back.href = safeReturnUrl(params.get('from'));
  if (back.href.endsWith('/')) back.textContent = 'Back to search';
  else if (new URL(back.href).searchParams.get('mode') === 'courses' && new URL(back.href).searchParams.get('view') === 'detail') back.textContent = 'Back to course';
  root.className = 'pathway-detail';
  root.replaceChildren(back);
  if (!profile || !detail) {
    root.append(element('h1', '', 'Pathway not found'), empty('This pathway is no longer available.'));
    root.setAttribute('aria-busy', 'false'); return;
  }
  const major = profile.major?.trim() || 'Major not shared';
  document.title = `${major} · Pathway · Course Pathways`;
  const state = readPathwayView(params);
  const semesters = orderedSemesters(detail);
  const selectedSemester = semesters.find(item => item.id === params.get('semester'))?.id;

  const header = element('header', 'pathway-profile');
  const academic = element('div');
  const meta = element('div', 'pathway-profile-meta'); meta.append(createStanding(profile));
  if (profile.status === 'current' && Number.isInteger(profile.graduationYear)) meta.append(element('span', 'card-standing', `Class of ${profile.graduationYear}`));
  meta.append(element('span', 'demo-label', 'Demo data'));
  academic.append(meta, element('h1', 'pathway-major', major));
  const academicList = element('ul', 'academic-details');
  academicDetails(profile).forEach(item => academicList.append(element('li', '', `${item.label} ${item.value}`)));
  academic.append(element('p', 'pathway-role', `${careerLabel(profile) === 'Exploring' ? 'Exploring ' : ''}${careerText(profile)}`));
  if (academicList.children.length) academic.append(academicList);
  header.append(academic); root.append(header);

  const toolbar = element('div', 'pathway-toolbar');
  const layoutToggle = element('div', 'pathway-layout-toggle');
  layoutToggle.setAttribute('role', 'group'); layoutToggle.setAttribute('aria-label', 'Semester layout');
  const layoutButtons = timeLayouts.map(([value, text]) => {
    const toggle = button(text, '', () => { state.timeLayout = value; render(); });
    toggle.setAttribute('aria-controls', 'pathway-content'); layoutToggle.append(toggle);
    return { value, toggle };
  });
  toolbar.append(element('h2', 'coursework-heading', 'Semesters'), layoutToggle); root.append(toolbar);

  const content = element('section', 'pathway-content'); content.id = 'pathway-content'; root.append(content);
  const dialog = element('div', 'course-preview-popover');
  dialog.id = 'course-preview'; dialog.setAttribute('popover', 'auto'); dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'false'); dialog.setAttribute('aria-labelledby', 'course-preview-title'); dialog.tabIndex = -1;
  root.append(dialog);
  let previewTrigger;
  let placementFrame;
  function closePreview(restoreFocus = false) {
    const trigger = previewTrigger;
    if (dialog.matches(':popover-open')) dialog.hidePopover();
    trigger?.setAttribute('aria-expanded', 'false'); previewTrigger = null;
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
  }
  function placePreview() {
    if (!previewTrigger || !dialog.matches(':popover-open')) return;
    const viewport = window.visualViewport;
    const bounds = { left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0, width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight };
    const anchor = previewTrigger.getBoundingClientRect();
    if (anchor.bottom < bounds.top || anchor.top > bounds.top + bounds.height || anchor.right < bounds.left || anchor.left > bounds.left + bounds.width || !previewTrigger.isConnected) { closePreview(); return; }
    dialog.style.maxWidth = `${bounds.width - 24}px`; dialog.style.maxHeight = `${bounds.height - 24}px`;
    const rect = dialog.getBoundingClientRect();
    const position = previewPosition(anchor, rect, bounds);
    dialog.style.left = `${position.left}px`; dialog.style.top = `${position.top}px`;
    dialog.dataset.side = position.side;
  }
  function schedulePlacement() {
    cancelAnimationFrame(placementFrame); placementFrame = requestAnimationFrame(placePreview);
  }
  window.addEventListener('resize', schedulePlacement);
  window.addEventListener('scroll', schedulePlacement, true);
  window.visualViewport?.addEventListener('resize', schedulePlacement);
  window.visualViewport?.addEventListener('scroll', schedulePlacement);
  new ResizeObserver(schedulePlacement).observe(dialog);
  dialog.addEventListener('beforetoggle', event => {
    if (event.newState === 'closed') { previewTrigger?.setAttribute('aria-expanded', 'false'); previewTrigger = null; }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dialog.matches(':popover-open')) { event.preventDefault(); closePreview(true); }
  });

  function updateUrl() {
    const next = new URLSearchParams({ view: 'detail', mode: 'pathways', id: profile.id });
    const from = safeReturnUrl(params.get('from'));
    if (from !== appUrl()) next.set('from', from);
    if (state.timeLayout !== 'alternating') next.set('timeLayout', state.timeLayout);
    if (selectedSemester) next.set('semester', selectedSemester);
    window.history.replaceState(null, '', appUrl(next));
  }
  function showPreview(course, trigger) {
    if (previewTrigger === trigger && dialog.matches(':popover-open')) { closePreview(true); return; }
    previewTrigger?.setAttribute('aria-expanded', 'false');
    previewTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    const close = button('×', 'preview-close', () => closePreview(true)); close.setAttribute('aria-label', 'Close course preview');
    const heading = element('h2', '', course.title); heading.id = 'course-preview-title';
    const courseMeta = element('p', 'preview-meta', [course.code, Number.isFinite(course.units) ? `${course.units} units` : null].filter(Boolean).join('  '));
    dialog.replaceChildren(close, courseMeta, heading, element('p', 'preview-term', termLabel(course.term)));
    if (course.description) dialog.append(element('p', 'preview-description', course.description));
    if (course.note) {
      const note = element('section', 'preview-note');
      note.append(element('h3', '', 'Student note'), element('p', 'detail-course-note', course.note));
      dialog.append(note);
    }
    if (course.courseId) {
      const link = element('a', 'preview-course-link', 'View course details ↗');
      const returnParams = new URLSearchParams(location.search); returnParams.delete('from');
      link.href = appUrl({ view: 'detail', mode: 'courses', id: course.courseId, from: appUrl(returnParams) });
      link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', `View course details: ${course.title} (opens in a new tab)`); dialog.append(link);
    }
    if (!dialog.matches(':popover-open')) dialog.showPopover();
    placePreview(); dialog.focus({ preventScroll: true });
  }
  function courseButton(course, noteMode = 'label') {
    const entry = element('div', 'detail-course-entry');
    const node = button('', 'detail-course', () => showPreview(course, node)); node.dataset.enrollment = course.id;
    node.setAttribute('aria-label', `Preview ${course.title}, ${termLabel(course.term)}${course.note ? ', includes student note' : ''}`);
    node.setAttribute('aria-haspopup', 'dialog'); node.setAttribute('aria-controls', dialog.id); node.setAttribute('aria-expanded', 'false');
    const top = element('span', 'detail-course-top');
    const meta = element('span', 'detail-course-meta');
    [course.code, course.termPart].filter(Boolean).forEach(text => meta.append(element('span', '', text)));
    if (course.note && noteMode === 'label') meta.append(element('span', 'course-note-label', 'Has note'));
    top.append(meta);
    if (Number.isFinite(course.units)) top.append(element('span', 'detail-course-units', `${course.units} units`));
    node.append(top, element('strong', 'detail-course-title', course.title));
    entry.append(node);
    return entry;
  }
  function courseList(rows) {
    const list = element('div', 'detail-course-list');
    rows.forEach(row => list.append(courseButton(row)));
    if (!rows.length) list.append(empty('No courses shared for this section.'));
    return list;
  }
  function semesterRows(semester) { return semester.courses.map(course => ({ ...course, term: semester.term, semesterId: semester.id })); }
  function semesterCard(semester) {
    const card = element('section', 'semester-card'); card.dataset.semester = semester.id;
    card.classList.toggle('is-target-semester', semester.id === selectedSemester);
    card.append(element('h2', '', termLabel(semester.term)), courseList(semesterRows(semester))); return card;
  }
  function renderAlternating() {
    const timeline = element('div', 'detail-timeline');
    semesters.forEach(semester => {
      const stop = element('section', 'semester-stop'); stop.dataset.semester = semester.id;
      stop.classList.toggle('is-target-semester', semester.id === selectedSemester);
      stop.append(element('h2', 'semester-title', termLabel(semester.term)));
      semesterRows(semester).forEach(course => {
        const row = element('div', 'timeline-course-row');
        const entry = courseButton(course, 'none'); row.append(entry);
        if (course.note) {
          const marker = element('span', 'timeline-note-marker');
          marker.setAttribute('aria-hidden', 'true'); entry.append(marker);
          const note = element('p', 'detail-course-note timeline-note', course.note);
          note.setAttribute('aria-label', `Note on ${course.title}`); row.append(note);
        }
        stop.append(row);
      });
      timeline.append(stop);
    });
    return timeline;
  }
  function renderYears() {
    const years = new Map();
    semesters.forEach(semester => {
      const year = semester.term ? semester.term.year - (semester.term.season === 'Spring' ? 1 : 0) : null;
      if (!years.has(year)) years.set(year, []); years.get(year).push(semester);
    });
    const wrapper = element('div', 'academic-years');
    for (const [year, terms] of years) {
      const section = element('section', 'academic-year'); section.append(element('h2', 'academic-year-title', year ? `${year}–${String(year + 1).slice(-2)}` : 'Year not shared'));
      const columns = element('div', 'year-columns');
      columns.style.setProperty('--year-course-rows', String(Math.max(1, ...terms.map(term => term.courses.length))));
      terms.forEach(semester => columns.append(semesterCard(semester)));
      section.append(columns); wrapper.append(section);
    }
    return wrapper;
  }
  let semesterFrame;
  function render() {
    cancelAnimationFrame(semesterFrame);
    closePreview();
    layoutButtons.forEach(({ value, toggle }) => toggle.setAttribute('aria-pressed', String(value === state.timeLayout)));
    content.replaceChildren(); updateUrl();
    content.setAttribute('aria-label', 'Coursework by semester');
    if (!enrollments(detail).length) { content.append(empty('No courses shared yet.')); return; }
    content.append(state.timeLayout === 'alternating' ? renderAlternating() : renderYears());
    if (selectedSemester) semesterFrame = requestAnimationFrame(() => {
      content.querySelector(`[data-semester="${selectedSemester}"]`)?.scrollIntoView({ block: 'start' });
    });
    document.getElementById('announcements').textContent = `Showing ${timeLayouts.find(([key]) => key === state.timeLayout)[1].toLowerCase()}.`;
  }
  render(); root.setAttribute('aria-busy', 'false');
}
