import { normalizeQuery, validateQuery } from './search-state.js';
import { appUrl } from './routing.js';
import { SEARCH_ALIASES } from './search-aliases.js';

export const PAGE_SIZE = 15;
export const FILTERS = {
  pathways: {
    status: { label: 'Student status', options: [['all', 'All students'], ['alumni', 'Graduated'], ['current', 'Current students']] },
    graduation: { label: 'Graduation', options: [['all', 'Any graduation year'], ['5', 'Within 5 years'], ['10', 'Within 10 years']] },
  },
  courses: {
    department: { label: 'Department', options: [['all', 'All departments']] },
    level: { label: 'Level', options: [['all', 'All levels'], ['undergraduate', 'Undergraduate'], ['graduate', 'Graduate']] },
    units: { label: 'Units', options: [['all', 'Any units'], ['low', 'Up to 6 units'], ['medium', '7–9 units'], ['high', '10+ units']] },
  },
};
export const SORTS = {
  pathways: [['relevance', 'Best match'], ['newest', 'Newest graduates'], ['oldest', 'Oldest graduates'], ['name', 'Major A–Z']],
  courses: [['relevance', 'Best match'], ['number', 'Course number'], ['name', 'Title A–Z'], ['units', 'Units: low to high']],
};

export function searchText(value) {
  return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function readResultsState(params) {
  const mode = params.get('mode') === 'courses' ? 'courses' : 'pathways';
  const rawQuery = params.get('q') ?? '';
  const validation = validateQuery(rawQuery);
  const filters = Object.fromEntries(Object.entries(FILTERS[mode]).map(([key, field]) => {
    const value = params.get(key) ?? 'all';
    // Department values are checked against the actual university catalog after loading.
    return [key, key === 'department' || field.options.some(([id]) => id === value) ? value : 'all'];
  }));
  const sort = SORTS[mode].some(([id]) => id === params.get('sort')) ? params.get('sort') : 'relevance';
  const tone = 'plain';
  return { mode, query: normalizeQuery(rawQuery), valid: validation.ok, filters, sort, tone };
}

export function resultsUrl(state) {
  const params = new URLSearchParams({ view: 'results', mode: state.mode, q: state.query });
  for (const key of Object.keys(FILTERS[state.mode])) {
    if (state.filters?.[key] && state.filters[key] !== 'all') params.set(key, state.filters[key]);
  }
  if (state.sort && state.sort !== 'relevance') params.set('sort', state.sort);
  return appUrl(params);
}

export function matchScore(record, mode, query) {
  const phrase = searchText(query);
  if (!phrase) return 0;
  const primaryFields = (mode === 'pathways' ? [record.major, record.role] : [record.code, record.title]).map(searchText);
  const primary = primaryFields.join(' ');
  const secondaryFields = [record.department, record.company, ...(record.concentrations ?? []), ...(record.additionalMajors ?? []), ...(record.dualDegrees ?? []), ...(record.minors ?? []), ...(record.tags ?? []), ...(record.keywords ?? [])].map(searchText);
  const tokens = [...new Set(phrase.split(' '))];
  const alternatives = token => Object.hasOwn(SEARCH_ALIASES, token) ? [token, ...SEARCH_ALIASES[token]] : null;
  const matches = (fields, token) => {
    const aliases = alternatives(token);
    // A short alias is a whole term, never a substring of "design" or "analysis".
    return fields.some(field => aliases
      ? aliases.some(alias => ` ${field} `.includes(` ${alias} `))
      : field.includes(token));
  };
  if (!tokens.every(token => matches(primaryFields, token) || matches(secondaryFields, token))) return 0;
  const singleAlias = alternatives(phrase);
  const exact = singleAlias ? primaryFields.some(field => singleAlias.includes(field)) : primaryFields.includes(phrase);
  const phraseMatch = singleAlias ? matches(primaryFields, phrase) : primary.includes(phrase);
  return (exact ? 100 : phraseMatch ? 60 : 0)
    + tokens.reduce((score, token) => score + (matches(primaryFields, token) ? 10 : 2), 0);
}

export function searchCatalog(records, state, universityId, currentYear = new Date().getFullYear()) {
  const { mode, query, filters = {}, sort = 'relevance' } = state;
  const matches = records.filter(record => record.universityId === universityId)
    .map(record => ({ record, score: matchScore(record, mode, query) })).filter(item => item.score > 0);
  const filtered = matches.filter(({ record }) => {
    if (mode === 'pathways') {
      if (filters.status && filters.status !== 'all' && record.status !== filters.status) return false;
      if (['5', '10'].includes(filters.graduation)) {
        const year = record.graduationYear;
        if (record.status !== 'alumni' || !Number.isInteger(year) || year < currentYear - Number(filters.graduation) || year > currentYear) return false;
      }
    } else {
      if (filters.department && filters.department !== 'all' && record.department !== filters.department) return false;
      if (filters.level && filters.level !== 'all' && record.level !== filters.level) return false;
      if (['low', 'medium', 'high'].includes(filters.units)) {
        if (!Number.isFinite(record.units)) return false;
        if (filters.units === 'low' && record.units > 6) return false;
        if (filters.units === 'medium' && (record.units < 7 || record.units > 9)) return false;
        if (filters.units === 'high' && record.units < 10) return false;
      }
    }
    return true;
  });
  const compareText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'en', { numeric: true });
  filtered.sort((a, b) => {
    let order = 0;
    if (sort === 'name') order = compareText(a.record.major ?? a.record.title, b.record.major ?? b.record.title);
    else if (sort === 'number') order = compareText(a.record.code, b.record.code);
    else if (sort === 'units') order = (a.record.units ?? Infinity) - (b.record.units ?? Infinity);
    else if (sort === 'newest' || sort === 'oldest') {
      const aYear = a.record.status === 'alumni' ? a.record.graduationYear : null;
      const bYear = b.record.status === 'alumni' ? b.record.graduationYear : null;
      if (aYear == null || bYear == null) order = Number(aYear == null) - Number(bYear == null);
      else order = sort === 'newest' ? bYear - aYear : aYear - bYear;
    } else order = b.score - a.score;
    return order || compareText(a.record.id, b.record.id);
  });
  return { total: matches.length, items: filtered.map(({ record }) => record) };
}
