export function courseRuleText(expression, nested = false) {
  if (!expression) return '';
  if (expression.courseCode) return expression.courseCode;
  const items = expression.allOf ?? expression.anyOf ?? [];
  const text = items.map(item => courseRuleText(item, true)).join(expression.allOf ? ' and ' : ' or ');
  return nested && items.length > 1 ? `(${text})` : text;
}

// Each top-level AND operand is independently required. Keep OR branches intact,
// including any conjunction nested inside an alternative.
export function courseRuleRows(expression) {
  if (!expression) return [];
  return expression.allOf ? expression.allOf.flatMap(courseRuleRows) : [courseRuleText(expression)];
}

export function courseFactSections(course) {
  return [
    ['Prerequisites', courseRuleRows(course.prerequisiteExpression)],
    ['Corequisites', courseRuleRows(course.corequisiteExpression)],
    ['Recommended background', (course.recommendations ?? []).map(item => courseRuleText(item))],
  ].filter(([, rows]) => rows.length);
}

export function appendCourseFacts(parent, course) {
  const sections = courseFactSections(course);
  if (!sections.length) return;
  const element = (tag, text = '') => {
    const node = parent.ownerDocument.createElement(tag);
    node.textContent = text;
    return node;
  };
  const facts = element('div');
  facts.className = 'course-preview-facts';
  for (const [label, value] of sections) {
    const group = element('details');
    group.dataset.fact = label;
    const summary = element('summary', label);
    const list = element(value.length > 1 ? 'ol' : 'ul');
    list.className = 'course-rule-groups';
    for (const row of value) list.append(element('li', row));
    group.append(summary, list);
    facts.append(group);
  }
  parent.append(facts);
}
