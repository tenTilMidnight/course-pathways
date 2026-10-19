export function academicDetails(record) {
  return [
    ['concentrations', 'concentration in', 'concentrations in'],
    ['additionalMajors', 'double major in', 'additional majors in'],
    ['dualDegrees', 'dual degree in', 'dual degrees in'],
    ['minors', 'minor in', 'minors in'],
  ].flatMap(([key, singular, plural]) => {
    const values = (Array.isArray(record[key]) ? record[key] : []).map(value => value.trim()).filter(Boolean);
    return values.length ? [{ label: values.length === 1 ? singular : plural, value: values.join(', ') }] : [];
  });
}

export function careerText(record) {
  const role = record.role?.trim() || 'Role not shared';
  const company = record.company?.trim();
  return company ? `${role} @ ${company}` : role;
}

export function careerLabel(record) {
  return record.status === 'current' && !record.company?.trim() ? 'Exploring' : 'Career';
}

export function toneBand(record, currentYear = new Date().getFullYear()) {
  if (record.status === 'current') return 'current';
  if (record.status !== 'alumni' || !Number.isInteger(record.graduationYear)) return 'neutral';
  const elapsed = currentYear - record.graduationYear;
  if (elapsed < 0 || elapsed > 10) return 'neutral';
  return elapsed <= 5 ? 'recent' : 'established';
}

const terms = { Spring: 0, Summer: 1, Fall: 2, Winter: 3 };
function termOrder(course) {
  return Number.isInteger(course.term?.year) && Object.hasOwn(terms, course.term.season)
    ? course.term.year * 4 + terms[course.term.season] : Infinity;
}

export function courseHighlights(courses = []) {
  return [...courses].sort((a, b) => termOrder(a) - termOrder(b)).slice(0, 5);
}
