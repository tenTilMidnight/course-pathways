import { enrollments, orderedSemesters, termLabel } from './pathway-model.js';

const rank = term => termLabel(term) === 'Term not shared' ? null : term.year * 4 + ({ Spring: 0, Summer: 1, Fall: 2, Winter: 3 })[term.season];

export function learningGraph(detail, requirementId = 'all') {
  const nodes = enrollments(detail);
  const byId = new Map(nodes.map(course => [course.id, course]));
  const edges = nodes.flatMap(course => [...new Set(course.supportingEnrollmentIds ?? [])].flatMap(id => {
    const source = byId.get(id);
    if (!source || rank(source.term) === null || rank(course.term) === null || rank(source.term) >= rank(course.term)) return [];
    return [{ source: id, target: course.id }];
  }));
  const included = new Set(requirementId === 'all' ? nodes.map(node => node.id) : nodes.filter(node => node.requirementIds?.includes(requirementId)).map(node => node.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) if (included.has(edge.target) && !included.has(edge.source)) { included.add(edge.source); changed = true; }
  }
  return {
    nodes: nodes.filter(node => included.has(node.id)),
    edges: edges.filter(edge => included.has(edge.source) && included.has(edge.target)),
    semesters: orderedSemesters(detail),
  };
}

export function traceConnections(graph, id) {
  if (!graph.nodes.some(node => node.id === id)) return new Set();
  const trace = (from, to) => {
    const found = new Set([id]); let changed = true;
    while (changed) { changed = false; for (const edge of graph.edges) if (found.has(edge[from]) && !found.has(edge[to])) { found.add(edge[to]); changed = true; } }
    return found;
  };
  return new Set([...trace('target', 'source'), ...trace('source', 'target')]);
}

// Preserve actual semester labels and chronology when unrelated coursework is collapsed.
export function focusConnections(graph, id) {
  const included = traceConnections(graph, id);
  const nodes = graph.nodes.filter(node => included.has(node.id));
  const semesterIds = new Set(nodes.map(node => node.semesterId));
  return {
    nodes,
    edges: graph.edges.filter(edge => included.has(edge.source) && included.has(edge.target)),
    semesters: graph.semesters.filter(semester => semesterIds.has(semester.id)),
  };
}
