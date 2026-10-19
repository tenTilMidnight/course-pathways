import { enrollments, requirementNames } from './pathway-model.js';
import { learningGraph } from './learning-graph.js';

export function courseExperiences(courseId, universityId, profiles, details) {
  const byId = new Map(profiles.filter(profile => profile.universityId === universityId).map(profile => [profile.id, profile]));
  return details.filter(detail => detail.universityId === universityId && byId.has(detail.id)).flatMap(detail =>
    enrollments(detail).filter(course => course.courseId === courseId).map(course => ({
      profile: byId.get(detail.id), enrollment: course, catalog: detail.catalog, requirements: requirementNames(detail, course),
    }))).sort((a, b) => (b.enrollment.term?.year ?? -Infinity) - (a.enrollment.term?.year ?? -Infinity)
      || ({ Winter: 3, Fall: 2, Summer: 1, Spring: 0 }[b.enrollment.term?.season] ?? -1) - ({ Winter: 3, Fall: 2, Summer: 1, Spring: 0 }[a.enrollment.term?.season] ?? -1)
      || a.profile.id.localeCompare(b.profile.id));
}

export function relatedCourseConnections(courseId, universityId, details) {
  const earlier = new Map(), later = new Map();
  for (const detail of details.filter(item => item.universityId === universityId)) {
    const graph = learningGraph(detail), byId = new Map(graph.nodes.map(node => [node.id, node]));
    for (const edge of graph.edges) {
      const source = byId.get(edge.source), target = byId.get(edge.target);
      if (target.courseId === courseId && source.courseId && source.courseId !== courseId) earlier.set(source.courseId, source);
      if (source.courseId === courseId && target.courseId && target.courseId !== courseId) later.set(target.courseId, target);
    }
  }
  return { earlier: [...earlier.values()], later: [...later.values()] };
}

export function readCourseProgram(params, programs, fallback) {
  const requested = params.get('program');
  // The caller supplies a program inferred from a recognized pathway, never URL text as a credential.
  return programs.includes(requested) ? requested : programs.includes(fallback) ? fallback : programs[0] ?? null;
}
