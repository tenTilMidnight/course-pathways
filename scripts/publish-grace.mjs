import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { gracePathway } from '../src/local-grace-data.js';
import { toPathwayView } from '../src/local-pathway-model.js';
import { toConnectionView } from '../src/local-connections.js';

const pick = (record, keys) => Object.fromEntries(keys.filter(key => record[key] !== undefined).map(key => [key, structuredClone(record[key])]));

// Explicit publication projection, authorized by Grace on 2026-10-20.
// Run manually when publishing an approved update; ordinary builds do not
// promote future edits to the private review data automatically.
export function projectGrace(data) {
  if (data.id !== 'grace') throw new Error('This projection is only for Grace');
  const view = toPathwayView(data), connected = toConnectionView(data);
  const courseFields = ['id', 'courseId', 'code', 'title', 'units', 'description', 'fullDescription', 'descriptionType', 'descriptionTruncated', 'officialUrl', 'prerequisiteExpression', 'corequisiteExpression', 'recommendations', 'supportingEnrollmentIds', 'transferRequirements'];
  const detail = source => ({
    id: source.id, universityId: source.universityId, requirements: [],
    relationshipKind: source.relationshipKind,
    semesters: source.semesters.map(semester => ({
      ...pick(semester, ['id', 'term', 'academicYearLabel']),
      courses: semester.courses.map(course => ({ ...pick(course, courseFields), detailView: 'detail' })),
    })),
  });
  const timeline = detail(view.detail);
  const profile = {
    ...pick(view.profile, ['id', 'displayName', 'universityId', 'major', 'role', 'company', 'studentYear', 'graduationYear', 'status', 'concentrations', 'additionalMajors', 'dualDegrees', 'minors']),
    dataSource: 'student', searchPriority: 1,
    courses: timeline.semesters.flatMap(semester => semester.courses.map(course => ({ ...pick(course, ['id', 'courseId', 'code', 'title', 'units']), term: semester.term }))),
  };
  return {
    publishedAt: '2026-10-20', profile, detail: timeline, connectionDetail: detail(connected.detail),
    courses: data.courses.map(course => pick(course, ['id', 'code', 'title', 'catalogUnits', 'description', 'fullDescription', 'descriptionType', 'descriptionTruncated', 'descriptionSource'])),
    courseRules: data.courseRules.map(rule => pick(rule, ['courseId', 'prerequisiteExpression', 'corequisiteExpression', 'corequisiteSourceId', 'recommendations'])),
    sources: Object.fromEntries(Object.entries(data.sources).filter(([, source]) => source.url).map(([id, source]) => [id, pick(source, ['title', 'url'])])),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeFile(new URL('../src/published-grace.js', import.meta.url), '// Approved public snapshot. Regenerate with node scripts/publish-grace.mjs.\nexport const publishedGrace = ' + JSON.stringify(projectGrace(gracePathway), null, 2) + ';\n');
  console.log('Generated the approved Grace public snapshot; no private review metadata, grades or notes.');
}
