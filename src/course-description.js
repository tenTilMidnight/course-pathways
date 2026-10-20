// A supplied full description is displayed verbatim in both preview and detail.
// Long content scrolls instead of being replaced by an excerpt or summary.
export function courseDescription(course) {
  if (course.fullDescription?.trim()) return course.fullDescription;
  return (course.description ?? '') + (course.description && course.descriptionTruncated ? ' …' : '');
}
