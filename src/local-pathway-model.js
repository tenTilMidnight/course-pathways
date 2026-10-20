// Adapter from source-backed records to existing views. No demo autofill.
const seasonOrder = { Spring: 0, Summer: 1, Fall: 2, Winter: 3 };
const rank = term => term.year * 4 + seasonOrder[term.season];
const leaves = expr => !expr ? [] : expr.courseCode ? [expr] : (expr.allOf ?? expr.anyOf ?? []).flatMap(leaves);

export function validateStudentPathway(data) {
  const unique = (rows, name) => {
    const ids = new Set();
    for (const row of rows) {
      if (!row.id || ids.has(row.id)) throw new Error(`Duplicate or missing ${name} ID: ${row.id}`);
      ids.add(row.id);
    }
    return ids;
  };
  const courses = unique(data.courses, 'course');
  unique(data.enrollments, 'enrollment');
  for (const course of data.courses) {
    if (!data.sources[course.sourceId] || course.institutionId !== data.profile.institutionId) throw new Error('Invalid course source or institution');
  }
  for (const row of data.enrollments) {
    if (!courses.has(row.courseId) || row.studentId !== data.profile.id || !data.sources[row.sourceId]) throw new Error('Invalid enrollment reference');
    if (!Number.isInteger(row.term?.year) || !Object.hasOwn(seasonOrder, row.term.season)) throw new Error('Invalid enrollment term');
  }
  return data;
}

export function catalogMatches(data) {
  validateStudentPathway(data);
  const courseById = new Map(data.courses.map(c => [c.id, c]));
  return data.enrollments.flatMap(target => {
    const rule = data.courseRules.find(rule => rule.courseId === target.courseId);
    return [
      { expression: rule?.prerequisiteExpression, kind: 'catalog_prerequisite_match', sourceId: rule?.sourceId, concurrent: false },
      { expression: rule?.corequisiteExpression, kind: 'catalog_corequisite_match', sourceId: rule?.corequisiteSourceId, concurrent: true },
    ].flatMap(relation => leaves(relation.expression).flatMap(leaf => {
      const attempts = data.enrollments.filter(source => source.id !== target.id && courseById.get(source.courseId).code === leaf.courseCode &&
        (relation.concurrent ? rank(source.term) <= rank(target.term) : rank(source.term) < rank(target.term)));
      // Match the latest earlier record without claiming that it was passed.
      const source = attempts.sort((a, b) => rank(b.term) - rank(a.term))[0];
      return source ? [{ source: source.id, target: target.id, kind: relation.kind, sourceId: relation.sourceId, minimumGrade: leaf.minimumGrade, gradeVerified: false, historicalRuleVerified: false, eligibilityAssessed: false }] : [];
    }));
  });
}

export function toPathwayView(data, { showCatalogMatches = false } = {}) {
  validateStudentPathway(data);
  const matches = showCatalogMatches ? catalogMatches(data) : [];
  const semesters = new Map();
  for (const row of data.enrollments) {
    const course = data.courses.find(c => c.id === row.courseId), source = data.sources[course.sourceId];
    const rule = data.courseRules.find(item => item.courseId === row.courseId);
    const semesterId = `${row.term.year}-${row.term.season.toLowerCase()}`;
    const academicStart = row.term.year - (['Spring', 'Summer'].includes(row.term.season) ? 1 : 0);
    const yearNumber = data.coverage.cmuEntry.studentYear + academicStart - data.coverage.cmuEntry.year;
    const academicYearLabel = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Fifth-year'][yearNumber - 1];
    if (!semesters.has(semesterId)) semesters.set(semesterId, { id: semesterId, term: row.term, academicYearLabel, courses: [] });
    semesters.get(semesterId).courses.push({
      id: row.id, courseId: row.courseId, code: course.code, title: course.title,
      units: row.enrolledUnits ?? course.catalogUnits,
      unitsSource: row.enrolledUnits === null ? 'catalog' : 'student',
      unitsNote: null,
      description: course.description, fullDescription: course.fullDescription, descriptionType: course.descriptionType, descriptionTruncated: course.descriptionTruncated,
      officialUrl: course.descriptionSource.url, catalogEdition: source.edition, detailView: 'course-review',
      prerequisiteExpression: rule?.prerequisiteExpression, corequisiteExpression: rule?.corequisiteExpression,
      recommendations: rule?.recommendations,
      note: row.note, grade: row.grade, termPart: row.termPart, status: row.status,
      requirementIds: [],
      // This view explicitly labels edges as catalog matches. Canonical student
      // learningConnections remain empty; these are never persisted as testimony.
      supportingEnrollmentIds: matches.filter(edge => edge.target === row.id).map(edge => edge.source),
      supportingConnections: matches.filter(edge => edge.target === row.id),
    });
  }
  return {
    profile: { ...data.profile, universityId: data.profile.institutionId },
    detail: { id: data.id, universityId: data.profile.institutionId, catalog: 'Official references', requirements: [], semesters: [...semesters.values()].sort((a, b) => rank(a.term) - rank(b.term)), relationshipKind: showCatalogMatches ? 'catalog_requirement_matches' : null },
  };
}
