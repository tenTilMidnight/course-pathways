export const MAX_QUERY_LENGTH = 120;
export const MAX_HISTORY_PER_MODE = 6;
const MODES = new Set(['pathways', 'courses']);

export function normalizeQuery(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
}

export function validateQuery(value) {
  const query = normalizeQuery(value);
  if (!query) return { ok: false, error: 'Enter a major, career direction, course name, or keyword.' };
  if (query.length > MAX_QUERY_LENGTH) return { ok: false, error: `Keep your search to ${MAX_QUERY_LENGTH} characters or fewer.` };
  return { ok: true, query };
}

function validEntry(entry) {
  return entry && MODES.has(entry.mode) && typeof entry.query === 'string'
    && validateQuery(entry.query).ok && Number.isFinite(entry.createdAt);
}

function compact(entries) {
  const seen = new Set();
  const counts = { pathways: 0, courses: 0 };
  return entries.filter(validEntry).map(entry => ({
    mode: entry.mode, query: normalizeQuery(entry.query), createdAt: entry.createdAt,
  })).sort((a, b) => b.createdAt - a.createdAt).filter(entry => {
    const identity = `${entry.mode}:${entry.query.toLocaleLowerCase('en')}`;
    if (seen.has(identity) || counts[entry.mode] >= MAX_HISTORY_PER_MODE) return false;
    seen.add(identity);
    counts[entry.mode] += 1;
    return true;
  });
}

// Storage is injected so unavailable storage still permits in-memory search history.
export function createSearchHistory(storage, universityId) {
  const key = `course-pathways:${universityId}:search-history:v1`;
  let entries = [];
  let persistent = Boolean(storage);
  function load() {
    if (!storage || !persistent) return;
    try {
      const raw = storage.getItem(key);
      const saved = raw ? JSON.parse(raw) : null;
      entries = saved?.version === 1 && Array.isArray(saved.entries) ? compact(saved.entries) : [];
    } catch {
      // Malformed data must not break the form. A new save can repair the value.
      entries = [];
    }
  }
  load();

  function persist() {
    if (!storage || !persistent) return;
    try { storage.setItem(key, JSON.stringify({ version: 1, entries })); }
    catch { persistent = false; }
  }

  return {
    key,
    get persistent() { return persistent; },
    list(mode) { return entries.filter(entry => entry.mode === mode).map(entry => ({ ...entry })); },
    reload: load,
    add(mode, value) {
      const result = validateQuery(value);
      if (!MODES.has(mode) || !result.ok) return false;
      load();
      entries = compact([{ mode, query: result.query, createdAt: Date.now() }, ...entries.filter(entry => !(entry.mode === mode && entry.query.toLocaleLowerCase('en') === result.query.toLocaleLowerCase('en')))]);
      persist();
      return true;
    },
    remove(mode, query) {
      load();
      entries = entries.filter(entry => !(entry.mode === mode && entry.query === query));
      persist();
    },
  };
}
