export const timeLayouts = [['alternating', 'Timeline'], ['connections', 'Overview']];

export function readPathwayView(params, layouts = timeLayouts) {
  const requested = params.get('timeLayout') === 'years' ? 'connections' : params.get('timeLayout');
  return { timeLayout: layouts.some(([key]) => key === requested) ? requested : 'alternating' };
}

export { safeReturnUrl } from './routing.js';

const seasons = { Spring: 0, Summer: 1, Fall: 2, Winter: 3 };
export function termOrder(term) {
  if (term?.stage === 'transfer' && Number.isInteger(term.before?.year) && Object.hasOwn(seasons, term.before.season)) return term.before.year * 4 + seasons[term.before.season] - .5;
  return Number.isInteger(term?.year) && Object.hasOwn(seasons, term.season) ? term.year * 4 + seasons[term.season] : null;
}
export function termLabel(term) {
  if (term?.stage === 'transfer') return 'Freshman · Transfer credits';
  return Number.isInteger(term?.year) && Object.hasOwn(seasons, term.season) ? `${term.season} ${term.year}` : 'Term not shared';
}
export function orderedSemesters(detail) {
  const order = item => termOrder(item.term) ?? Infinity;
  return [...(detail.semesters ?? [])].sort((a, b) => order(a) - order(b));
}
export function enrollments(detail) {
  return orderedSemesters(detail).flatMap(semester => (semester.courses ?? []).map(course => ({ ...course, term: semester.term, semesterId: semester.id })));
}
export function requirementGroups(detail) {
  const rows = enrollments(detail);
  const definitions = detail.requirements ?? [];
  const known = new Set(definitions.map(item => item.id));
  const groups = definitions.map(item => ({ ...item, courses: rows.filter(course => course.requirementIds?.includes(item.id)) }));
  const unmapped = rows.filter(course => !course.requirementIds?.some(id => known.has(id)));
  if (unmapped.length) groups.push({ id: 'unmapped', title: 'Requirement not shared', courses: unmapped });
  return groups;
}
export function requirementNames(detail, course) {
  return (detail.requirements ?? []).filter(item => course.requirementIds?.includes(item.id)).map(item => item.title);
}

// Links refer to individual enrollments, never inferred from chronological order.
// Repeated courses therefore retain the specific attempt used as a prerequisite.
export function requirementPaths(detail) {
  const rows = enrollments(detail);
  const byId = new Map(rows.map(course => [course.id, course]));
  const order = course => termOrder(course.term);
  function tree(course, ancestors = new Set()) {
    const visited = new Set([...ancestors, course.id]);
    let incomplete = false;
    const prerequisites = [...new Set(course.supportingEnrollmentIds ?? [])].flatMap(id => {
      const previous = byId.get(id);
      if (!previous || visited.has(id) || (order(previous) !== null && order(course) !== null && order(previous) >= order(course))) {
        incomplete = true; return [];
      }
      return [tree(previous, visited)];
    });
    return { course, prerequisites, incomplete };
  }
  const contains = (node, id) => node.prerequisites.some(child => child.course.id === id || contains(child, id));
  return requirementGroups(detail).map(group => {
    const trees = group.courses.map(course => tree(course));
    // A course that also fulfils the group remains visible in the later course's chain.
    const paths = trees.filter(node => !trees.some(other => other !== node && contains(other, node.course.id)));
    return { ...group, paths: paths.length ? paths : trees };
  });
}
