import { gracePathway } from './local-grace-data.js';
import { toPathwayView } from './local-pathway-model.js';
import { toConnectionView, exportStudentPathway } from './local-connections.js';
import { element } from './result-cards.js';
import { appUrl } from './routing.js';
import { localReturnUrl } from './local-routing.js';

function link(text, href) {
  const node = element('a', 'text-button', text); node.href = href; return node;
}
function exportData() {
  const data = exportStudentPathway(gracePathway);
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
  const download = link('', url); download.download = 'grace-pathway-review.json';
  document.body.append(download); download.click(); download.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function mountLocalReview(params) {
  const root = document.getElementById('detail-preview');
  const style = element('link'); style.rel = 'stylesheet';
  style.href = new URL('./local-pathway-review.css', import.meta.url).href; document.head.append(style);
  if (params.get('view') === 'course-review') {
    const { mountLocalCourseDetail } = await import('./local-course-detail.js');
    mountLocalCourseDetail(params, gracePathway); return;
  }
  if (params.has('id') && params.get('id') !== gracePathway.id) {
    root.replaceChildren(element('h1', '', 'Pathway not found'));
    root.setAttribute('aria-busy', 'false'); return;
  }
  params.set('id', gracePathway.id);
  if (params.get('view') === 'connection-review') {
    params.set('view', 'pathway-review'); params.set('timeLayout', 'connections');
  }
  const { profile, detail } = toPathwayView(gracePathway);
  const connectionDetail = toConnectionView(gracePathway).detail;
  const { mountPathwayDetail } = await import('./pathway-detail.js');
  mountPathwayDetail(params, {
    profiles: [profile], details: [detail], view: 'pathway-review', dataLabel: 'Local review', hideMissingRole: true,
    backHref: localReturnUrl(params.get('from'), appUrl()),
    connectionDetail,
  });
  document.title = 'Grace’s pathway · Course Pathways';
  root.classList.add('local-pathway-review');

  const context = element('div', 'local-review-context');
  const summary = element('button', 'text-button local-review-toggle', 'Sources & items to confirm');
  summary.type = 'button'; summary.setAttribute('aria-expanded', 'false'); summary.setAttribute('aria-controls', 'local-review-sources');
  const body = element('div', 'local-review-body');
  body.id = 'local-review-sources'; body.hidden = true;
  summary.addEventListener('click', () => { body.hidden = !body.hidden; summary.setAttribute('aria-expanded', String(!body.hidden)); });
  body.append(element('p', '', 'Course history: your notes. Course descriptions: official CMU excerpts, checked October 20, 2026.'));
  const pending = element('ul');
  gracePathway.reviewItems.forEach(item => pending.append(element('li', '', item.text)));
  body.append(pending);
  const sourceList = element('div', 'local-source-list');
  for (const course of gracePathway.courses) {
    const row = link(`${course.code}  ${course.title} ↗`, course.descriptionSource.url);
    row.target = '_blank'; row.rel = 'noopener noreferrer'; sourceList.append(row);
  }
  body.append(sourceList);
  const actions = element('div', 'local-review-actions');
  const download = element('button', 'text-button', 'Download data'); download.type = 'button';
  download.addEventListener('click', exportData); actions.append(download);
  context.append(summary, actions, body);
  root.querySelector('.pathway-toolbar').before(context);
}
