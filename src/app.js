import { university } from './config.js';
import { createSearchHistory, validateQuery } from './search-state.js';
import { readResultsState, resultsUrl } from './results-state.js';
import { appUrl } from './routing.js';

const byId = id => document.getElementById(id);
const input = byId('search-input');
const form = byId('search-form');
const panel = byId('history-panel');
const error = byId('search-error');
const routeParams = new URLSearchParams(window.location.search);
const resultsState = readResultsState(routeParams);
const view = routeParams.get('view');
const isResults = view === 'results' && resultsState.valid;
let mode = resultsState.mode;
let composing = false;
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const history = createSearchHistory(storage, university.id);
const suggestionsByMode = new Map();
const suggestionCount = 3;
let selectedSuggestion = null;

const icons = {
  clock: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M10 6V10L12.5 11.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6 6L14 14M14 6L6 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  pathways: '<path d="M5 15V10C5 7 15 13 15 5M5 15C5 12 10 12 10 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="5" cy="15" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="15" cy="4" r="1.5" stroke="currentColor" stroke-width="1.5"/>',
  courses: '<path d="M3 4C6 3.5 8 4.5 10 5.5C12 4.5 14 3.5 17 4V15.5C14 15 12 16 10 17C8 16 6 15 3 15.5V4ZM10 5.5V17" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
};

document.documentElement.style.setProperty('--brand', university.brandColor);
document.documentElement.style.setProperty('--focus', university.brandColor);
document.querySelectorAll('[data-university-name]').forEach(el => { el.textContent = university.name; });
document.querySelectorAll('[data-university-short]').forEach(el => { el.textContent = university.shortName; });
document.querySelector('meta[name="description"]').content = `Find courses and explore student pathways at ${university.name}.`;
document.querySelector('meta[name="theme-color"]').content = university.brandColor;

function announce(message) { byId('announcements').textContent = message; }
function clearError() {
  error.hidden = true;
  error.textContent = '';
  input.removeAttribute('aria-invalid');
  byId('search-box').classList.remove('has-error');
}
function updateClear() { byId('clear-input').hidden = input.value.length === 0; }
function closeHistory() { panel.hidden = true; input.setAttribute('aria-expanded', 'false'); }
function openHistory() {
  history.reload();
  renderHistory();
  panel.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}
function updateSuggestionSelection() {
  document.querySelectorAll('.example-button').forEach(button => {
    const selected = selectedSuggestion?.mode === mode
      && selectedSuggestion.query === button.dataset.query
      && input.value === selectedSuggestion.query;
    button.setAttribute('aria-pressed', String(Boolean(selected)));
  });
}
function clearSuggestionSelection() {
  selectedSuggestion = null;
  updateSuggestionSelection();
}
function setSuggestionsVisible(visible) {
  byId('suggestions-content').hidden = !visible;
  byId('suggestions-toggle').setAttribute('aria-expanded', String(visible));
  byId('suggestions-toggle').textContent = visible ? 'Hide suggestions' : 'Show suggestions';
}
function fillSearch(query, fromSuggestion = false) {
  input.value = query;
  selectedSuggestion = fromSuggestion ? { mode, query } : null;
  updateSuggestionSelection();
  clearError();
  updateClear();
  input.focus();
  closeHistory();
}

function renderHistory() {
  const list = byId('history-list');
  list.replaceChildren();
  const entries = history.list(mode);
  byId('history-heading').textContent = `Recent ${university.searchModes[mode].singular} searches`;
  byId('storage-note').textContent = history.persistent ? 'On this device' : 'This session only';
  byId('history-empty').hidden = entries.length !== 0;
  entries.forEach((entry, index) => {
    const row = document.createElement('li');
    row.className = 'history-row';
    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'history-select';
    select.innerHTML = icons.clock;
    const text = document.createElement('span');
    text.textContent = entry.query;
    select.append(text);
    select.setAttribute('aria-label', `Use recent search: ${entry.query}`);
    select.addEventListener('click', () => fillSearch(entry.query));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'history-delete';
    remove.innerHTML = icons.close;
    remove.setAttribute('aria-label', `Delete recent search: ${entry.query}`);
    remove.addEventListener('click', () => {
      history.remove(mode, entry.query);
      // Reopen after replacing the focused row so focusout does not dismiss history.
      openHistory();
      const next = list.querySelectorAll('.history-delete');
      if (next.length) next[Math.min(index, next.length - 1)].focus();
      else input.focus();
      announce(`Deleted ${entry.query} from recent searches.`);
    });
    row.append(select, remove);
    list.append(row);
  });
}

function renderExamples(refresh = false) {
  const pool = [...new Set(university.searchModes[mode].examples)];
  let shown = suggestionsByMode.get(mode) ?? pool.slice(0, suggestionCount);
  if (refresh) {
    // Exclude the visible batch; reshuffle on every click without an end state.
    const candidates = pool.filter(query => !shown.includes(query));
    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
    }
    shown = candidates.slice(0, suggestionCount);
  }
  suggestionsByMode.set(mode, shown);
  const examples = byId('example-buttons');
  examples.replaceChildren();
  shown.forEach(query => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'example-button';
    button.dataset.query = query;
    button.textContent = query;
    button.addEventListener('click', () => fillSearch(query, true));
    examples.append(button);
  });
  examples.scrollLeft = 0;
  updateSuggestionSelection();
}

function renderMode() {
  const settings = university.searchModes[mode];
  const other = mode === 'pathways' ? 'courses' : 'pathways';
  byId('mode-name').textContent = settings.name;
  byId('mode-icon').innerHTML = icons[mode];
  byId('mode-toggle').setAttribute('aria-label', `Searching ${mode}. Switch to ${other}`);
  byId('search-submit').setAttribute('aria-label', `Search ${mode}`);
  byId('search-label').textContent = settings.label;
  input.placeholder = settings.placeholder;
  renderExamples();
  renderHistory();
}

byId('mode-toggle').addEventListener('click', () => {
  mode = mode === 'pathways' ? 'courses' : 'pathways';
  clearSuggestionSelection();
  clearError();
  renderMode();
  closeHistory();
  announce(`Searching ${mode}.`);
  if (isResults && validateQuery(input.value).ok) form.requestSubmit();
});
byId('suggestions-toggle').addEventListener('click', () => {
  closeHistory();
  setSuggestionsVisible(byId('suggestions-content').hidden);
});
byId('refresh-examples').addEventListener('click', () => {
  closeHistory();
  clearSuggestionSelection();
  renderExamples(true);
  announce(`Suggestions: ${suggestionsByMode.get(mode).join(', ')}.`);
});
input.addEventListener('focus', openHistory);
input.addEventListener('click', () => { if (panel.hidden) openHistory(); });
input.addEventListener('input', () => { clearSuggestionSelection(); clearError(); updateClear(); });
input.addEventListener('compositionstart', () => { composing = true; });
input.addEventListener('compositionend', () => { composing = false; });
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.isComposing || composing)) event.preventDefault();
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    openHistory();
    byId('history-list').querySelector('.history-select')?.focus();
  }
});
form.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!panel.hidden) {
      event.preventDefault();
      input.focus();
      closeHistory();
    }
  }
  if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && panel.contains(document.activeElement)) {
    event.preventDefault();
    const buttons = Array.from(panel.querySelectorAll('.history-select'));
    const row = document.activeElement.closest('.history-row');
    const current = buttons.findIndex(button => button.closest('.history-row') === row);
    const next = current + (event.key === 'ArrowDown' ? 1 : -1);
    if (next < 0) input.focus();
    else buttons[Math.min(next, buttons.length - 1)]?.focus();
  }
});
document.addEventListener('pointerdown', event => { if (!form.contains(event.target)) closeHistory(); });
form.addEventListener('focusout', event => { if (!form.contains(event.relatedTarget)) closeHistory(); });
byId('clear-input').addEventListener('click', () => {
  input.value = '';
  clearSuggestionSelection();
  updateClear();
  clearError();
  input.focus();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (composing) return;
  const result = validateQuery(input.value);
  closeHistory();
  if (!result.ok) {
    error.textContent = result.error;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    byId('search-box').classList.add('has-error');
    input.focus();
    closeHistory();
    return;
  }
  clearError();
  input.value = result.query;
  history.add(mode, result.query);
  window.location.assign(resultsUrl({ mode, query: result.query, tone: resultsState.tone }));
});
window.addEventListener('storage', event => {
  if (event.key === history.key || event.key === null) {
    history.reload();
    renderHistory();
  }
});
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    input.value = isResults ? resultsState.query : '';
    clearSuggestionSelection();
    clearError();
    updateClear();
    closeHistory();
    setSuggestionsVisible(false);
  }
});
input.value = isResults ? resultsState.query : '';
renderMode();
updateClear();

// LOCAL_EXPERIMENT_START
if (view === 'pathway-review' || view === 'connection-review' || view === 'course-review') {
  document.querySelector('.search-section').hidden = true;
  document.querySelector('.skip-link').href = '#main-content';
  document.querySelector('.skip-link').textContent = 'Skip to content';
  byId('detail-preview').hidden = false;
  import('./local-pathway-review.js').then(({ mountLocalReview }) => mountLocalReview(routeParams)).catch(error => {
    console.error(error);
    byId('detail-preview').textContent = 'Could not load the local pathway review. Refresh to try again.';
    byId('detail-preview').setAttribute('aria-busy', 'false');
  });
} else if (view === 'connection-experiment') {
  document.querySelector('.search-section').hidden = true;
  document.querySelector('.skip-link').href = '#main-content';
  document.querySelector('.skip-link').textContent = 'Skip to content';
  byId('detail-preview').hidden = false;
  import('./connection-experiment.js').then(({ mountConnectionExperiment }) => mountConnectionExperiment(routeParams)).catch(() => {
    byId('detail-preview').textContent = 'Could not load connection experiment.';
  });
} else
// LOCAL_EXPERIMENT_END
if (isResults) {
  document.body.classList.add('is-results');
  document.title = `${resultsState.query} · Course Pathways`;
  byId('page-heading').textContent = 'Search results';
  document.querySelector('.examples').hidden = true;
  byId('results-region').hidden = false;
  document.querySelector('.wordmark').href = appUrl({ mode });
  import('./results-view.js').then(({ mountResults }) => mountResults(resultsState)).catch(() => {
    byId('results-region').setAttribute('aria-busy', 'false');
    byId('results-count').textContent = 'Results unavailable. Refresh to try again.';
  });
} else if (view === 'detail' || view === 'cohort-designs' || view === 'card-designs') {
  document.querySelector('.search-section').hidden = true;
  document.querySelector('.skip-link').href = '#main-content';
  document.querySelector('.skip-link').textContent = 'Skip to content';
  if (view === 'detail') {
    byId('detail-preview').hidden = false;
    document.title = 'Detail preview · Course Pathways';
    import('./results-view.js').then(({ mountDetail }) => mountDetail(routeParams)).catch(() => {
      const region = byId('detail-preview');
      const heading = document.createElement('h1'); heading.textContent = 'Couldn’t load details';
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'text-button'; retry.textContent = 'Try again';
      retry.addEventListener('click', () => window.location.reload());
      const back = document.createElement('a'); back.href = appUrl(); back.className = 'text-button'; back.textContent = 'Back to search';
      region.replaceChildren(heading, retry, back);
      region.setAttribute('aria-busy', 'false');
    });
  } else {
    byId('card-designs').hidden = false;
    document.title = 'Card preview · Course Pathways';
    import('./card-designs.js').then(({ mountCardDesigns }) => mountCardDesigns()).catch(() => {
      byId('card-designs').textContent = 'Couldn’t load preview. Refresh to try again.';
    });
  }
} else if (view === 'results') {
  error.textContent = validateQuery(routeParams.get('q')).error;
  error.hidden = false;
  input.setAttribute('aria-invalid', 'true');
}
