import { publishedGrace } from './published-grace.js';
import { mountPathwayDetail } from './pathway-detail.js';
import { mountStudentCourseDetail } from './student-course-detail.js';

export function mountPublishedDetail(params) {
  if (params.get('mode') === 'courses') {
    mountStudentCourseDetail(params, publishedGrace); return;
  }
  mountPathwayDetail(params, {
    profiles: [publishedGrace.profile], details: [publishedGrace.detail],
    connectionDetail: publishedGrace.connectionDetail, dataLabel: null, hideMissingRole: true,
  });
  document.title = 'Grace’s pathway · Course Pathways';
}
