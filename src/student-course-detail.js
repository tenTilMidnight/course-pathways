import { element, createResultCard } from './result-cards.js';
import { appUrl } from './routing.js';
import { safeReturnUrl } from './routing.js';
import { courseRuleRows } from './course-information.js';
import { enrollments, termLabel } from './pathway-model.js';
import { courseDescription } from './course-description.js';

export function mountStudentCourseDetail(params, data, options = {}) {
  const courseView = options.courseView ?? 'detail', pathwayView = options.pathwayView ?? 'detail';
  const returnUrl = options.returnUrl ?? (value => safeReturnUrl(value, appUrl({ view: 'detail', mode: 'pathways', id: data.profile.id })));
  if (!document.querySelector('link[data-student-course-style]')) {
    const style = element('link'); style.rel = 'stylesheet'; style.dataset.studentCourseStyle = 'true';
    style.href = new URL('./student-course.css', import.meta.url).href; document.head.append(style);
  }
  const root = document.getElementById('detail-preview');
  root.className = 'course-detail student-course-detail';
  const back = element('a', 'text-button detail-back'); back.href = returnUrl(params.get('from'));
  back.textContent = new URL(back.href).searchParams.get('timeLayout') === 'connections' ? 'Back to connections' : 'Back to pathway';
  root.replaceChildren(back);
  const course = data.courses.find(item => item.id === params.get('id'));
  if (!course) {
    root.append(element('h1', '', 'Course not found'));
    root.setAttribute('aria-busy', 'false'); return;
  }
  document.title = `${course.title} · Course Pathways`;
  const route = appUrl({ view: courseView, mode: 'courses', id: course.id });
  const header = element('header', 'course-profile');
  const meta = element('div', 'course-profile-meta');
  meta.append(element('span', 'course-code', course.code), element('span', 'course-profile-units', `${course.catalogUnits} ${course.catalogUnits === 1 ? 'unit' : 'units'}`));
  header.append(meta, element('h1', '', course.title));
  header.append(element('p', 'course-description', courseDescription(course)));
  const source = element('a', 'text-button student-official-source', 'Official course info source ↗');
  source.href = course.descriptionSource.url; source.target = '_blank'; source.rel = 'noopener noreferrer';
  source.setAttribute('aria-label', 'Official course info source, full description (opens in a new tab)');
  header.append(source); root.append(header);

  const rule = data.courseRules.find(item => item.courseId === course.id);
  if (rule?.prerequisiteExpression) {
    const block = element('section', 'student-prerequisites');
    block.append(element('h2', '', 'Prerequisites'));
    const groups = courseRuleRows(rule.prerequisiteExpression);
    const list = element(groups.length > 1 ? 'ol' : 'ul', 'course-rule-groups');
    groups.forEach(text => list.append(element('li', '', text)));
    block.append(list); root.append(block);
  }
  if (rule?.recommendations?.length) {
    const block = element('section', 'student-prerequisites'); block.append(element('h2', '', 'Recommended background'));
    block.append(element('p', '', rule.recommendations.map(item => item.courseCode).join(', '))); root.append(block);
  }
  if (rule?.corequisiteExpression) {
    const block = element('section', 'student-prerequisites');
    block.append(element('h2', '', 'Corequisites'));
    const groups = courseRuleRows(rule.corequisiteExpression);
    const list = element(groups.length > 1 ? 'ol' : 'ul', 'course-rule-groups');
    groups.forEach(text => list.append(element('li', '', text)));
    const source = element('a', 'text-button', 'Course requirements ↗');
    source.href = data.sources[rule.corequisiteSourceId].url;
    source.target = '_blank'; source.rel = 'noopener noreferrer';
    block.append(list, source); root.append(block);
  }
  const { profile, detail } = data;
  const rows = enrollments(detail), taken = rows.filter(row => row.courseId === course.id);
  if (taken.length) {
    const peers = element('section', 'course-peers'); peers.append(element('h2', '', 'Who took this course'));
    const cards = element('div', 'course-peer-list');
    const card = createResultCard({ ...profile, courses: rows }, 'pathways', route, { instanceKey: `student-${course.id}` });
    const context = element('div', 'course-peer-context');
    context.append(element('p', 'course-peer-term', `${profile.displayName} / ${taken.map(row => termLabel(row.term)).join(', ')}`));
    card.querySelector('.card-front').append(context);
    card.querySelectorAll('.card-detail-link').forEach(link => { link.href = appUrl({ view: pathwayView, mode: 'pathways', id: profile.id, semester: taken[0].semesterId, from: route }); });
    cards.append(card); peers.append(cards); root.append(peers);
  }
  root.setAttribute('aria-busy', 'false');
}
