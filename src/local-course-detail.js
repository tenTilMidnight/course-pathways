import { mountStudentCourseDetail } from './student-course-detail.js';
import { toPathwayView } from './local-pathway-model.js';
import { localReturnUrl } from './local-routing.js';

export function mountLocalCourseDetail(params, data) {
  mountStudentCourseDetail(params, { ...data, ...toPathwayView(data) }, {
    courseView: 'course-review', pathwayView: 'pathway-review', returnUrl: localReturnUrl,
  });
}
