// Explicit domain aliases. Each entry is one search concept with OR alternatives;
// separate query terms still use AND. Avoid guessing acronyms from every title.
export const SEARCH_ALIASES = {
  is: ['information systems'],
  pm: ['product management', 'product manager'],
  swe: ['software engineering', 'software engineer'],
  cs: ['computer science'],
  hci: ['human computer interaction'],
  ai: ['artificial intelligence'],
  ml: ['machine learning'],
  ux: ['user experience', 'ux design', 'ux designer', 'ux research', 'ux researcher'],
  ui: ['user interface', 'user interfaces'],
  ds: ['data science', 'data scientist'],
  ee: ['electrical engineering'],
  ece: ['electrical and computer engineering', 'electrical computer engineering'],
  cogsci: ['cognitive science'],
};
