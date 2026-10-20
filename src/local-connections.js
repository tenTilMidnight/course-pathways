import { catalogMatches, toPathwayView } from './local-pathway-model.js';

const order = term => term.year * 4 + ({ Spring: 0, Summer: 1, Fall: 2, Winter: 3 })[term.season];
const leaves = expression => expression.courseCode ? [expression.courseCode] : (expression.allOf ?? expression.anyOf).flatMap(leaves);

export function prerequisiteText(expression) {
  if (!expression) return '';
  if (expression.courseCode) return expression.courseCode;
  const join = expression.allOf ? ' AND ' : ' OR ';
  return '(' + (expression.allOf ?? expression.anyOf).map(prerequisiteText).join(join) + ')';
}

// Assumptions are background groups, not invented course enrollments or a
// claim that every alternative in a prerequisite expression was completed.
export function transferAssumptions(data) {
  const courses = new Map(data.courses.map(course => [course.id, course]));
  const groups = new Map();
  for (const target of data.enrollments) {
    const rule = data.courseRules.find(item => item.courseId === target.courseId);
    if (!rule?.prerequisiteExpression) continue;
    const earlier = new Set(data.enrollments.filter(row => order(row.term) < order(target.term)).map(row => courses.get(row.courseId).code));
    const matched = expression => expression.courseCode ? earlier.has(expression.courseCode)
      : expression.allOf ? expression.allOf.every(matched) : expression.anyOf.some(matched);
    const missing = expression => matched(expression) ? [] : expression.allOf ? expression.allOf.flatMap(missing) : [expression];
    for (const expression of missing(rule.prerequisiteExpression)) {
      const codes = leaves(expression);
      const kind = codes.every(code => ['21-127', '15-151', '21-128'].includes(code)) ? 'discrete-mathematics'
        : codes.every(code => code.startsWith('21-')) ? 'calculus' : 'programming';
      if (!groups.has(kind)) groups.set(kind, {
        id: `${data.id}-transfer-${kind}`, kind: 'assumed_transfer_background', sourceId: 'transfer',
        title: { programming: 'Programming foundations', calculus: 'Calculus foundations', 'discrete-mathematics': 'Discrete mathematics' }[kind],
        equivalentCourseId: null, awardedUnits: null, requirements: [],
      });
      groups.get(kind).requirements.push({ targetEnrollmentId: target.id, targetCourseCode: courses.get(target.courseId).code, expression: structuredClone(expression), ruleSourceId: rule.sourceId });
    }
  }
  return [...groups.values()];
}

export function toConnectionView(data) {
  const view = toPathwayView(data, { showCatalogMatches: true });
  const assumptions = transferAssumptions(data);
  const term = { stage: 'transfer', before: { season: data.coverage.cmuEntry.season, year: data.coverage.cmuEntry.year } };
  const transferRows = assumptions.map(group => ({
    id: group.id, courseId: null, code: 'Transfer credit', title: group.title,
    units: null, status: 'assumed_transfer', note: null, grade: null,
    description: 'Assumed Freshman transfer credit. Exact course equivalency and awarded units are not specified.',
    transferRequirements: group.requirements.map(item => `${item.targetCourseCode}: ${prerequisiteText(item.expression)}`),
    supportingEnrollmentIds: [], requirementIds: [],
  }));
  for (const semester of view.detail.semesters) for (const course of semester.courses) {
    course.supportingEnrollmentIds.push(...assumptions.filter(group => group.requirements.some(item => item.targetEnrollmentId === course.id)).map(group => group.id));
  }
  if (transferRows.length) view.detail.semesters.unshift({ id: 'freshman-transfer', term, courses: transferRows });
  view.detail.relationshipKind = 'catalog_requirement_matches_and_transfer_assumptions';
  return { ...view, assumptions };
}

export function exportStudentPathway(data) {
  return { ...data, catalogMatches: catalogMatches(data), transferAssumptions: transferAssumptions(data) };
}
