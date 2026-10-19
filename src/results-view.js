import { university } from './config.js';
import { FILTERS, SORTS, PAGE_SIZE, searchCatalog, resultsUrl } from './results-state.js';
import { createResultCard, element } from './result-cards.js';
import { createPreviewHint } from './preview-hint.js';

export async function mountResults(state) {
  const byId = id => document.getElementById(id);
  const region = byId('results-region');
  const grid = byId('results-grid');
  const status = byId('results-status');
  const filtersPanel = byId('filters-panel');
  const sortSelect = byId('sort-select');
  let records = [];
  let visible = PAGE_SIZE;
  let filtered = [];
  let total = 0;
  const previewHint = createPreviewHint(university.id);

  function currentUrl() { return resultsUrl(state); }
  function updateUrl() { window.history.replaceState(null, '', currentUrl()); }
  function setStatus(title, detail, action) {
    status.replaceChildren(element('h2', '', title), element('p', '', detail));
    if (action) {
      const button = element('button', 'text-button', action.label);
      button.type = 'button';
      button.addEventListener('click', action.run);
      status.append(button);
    }
    status.hidden = false;
  }
  function renderCards(focusNew = false) {
    const previousCount = grid.children.length;
    grid.replaceChildren(...filtered.slice(0, visible).map(record => createResultCard(record, state.mode, currentUrl(), state)));
    previewHint(state.mode === 'pathways' ? grid.firstElementChild : null);
    byId('load-more').hidden = visible >= filtered.length;
    byId('results-progress').hidden = !filtered.length;
    byId('results-progress').textContent = `Showing ${Math.min(visible, filtered.length)} of ${filtered.length}`;
    if (focusNew) {
      const next = grid.children[previousCount];
      (next?.querySelector('.card-flip-toggle') ?? next)?.focus();
    }
  }
  function render() {
    const found = searchCatalog(records, state, university.id);
    filtered = found.items;
    total = found.total;
    const active = Object.values(state.filters).filter(value => value !== 'all').length;
    byId('filter-count').textContent = active ? ` (${active})` : '';
    byId('reset-filters').hidden = !active;
    byId('clear-result-filters').hidden = !active;
    byId('results-count').textContent = `${filtered.length} ${state.mode === 'pathways' ? (filtered.length === 1 ? 'pathway' : 'pathways') : (filtered.length === 1 ? 'course' : 'courses')}`;
    status.hidden = true;
    renderCards();
    if (!filtered.length) {
      if (total && active) setStatus('No results with these filters', 'Try removing a filter.', { label: 'Clear filters', run: resetFilters });
      else setStatus('No matching results', 'Try a different major, role, course name, or keyword. This prototype searches demo records only.', {
        label: 'Edit search', run() { byId('search-input').focus(); byId('search-input').select(); },
      });
    }
    byId('announcements').textContent = `${filtered.length} ${state.mode} found${active ? ` with ${active} active filters` : ''}.`;
  }
  function applyChanges() { visible = PAGE_SIZE; updateUrl(); render(); }
  function resetFilters() {
    Object.keys(state.filters).forEach(key => { state.filters[key] = 'all'; });
    filtersPanel.querySelectorAll('select').forEach(select => { select.value = 'all'; });
    applyChanges();
  }
  function buildControls() {
    sortSelect.replaceChildren(...SORTS[state.mode].map(([value, label]) => {
      const option = element('option', '', label); option.value = value; return option;
    }));
    sortSelect.value = state.sort;
    const fields = byId('filter-fields');
    fields.replaceChildren();
    Object.entries(FILTERS[state.mode]).forEach(([key, field]) => {
      const label = element('label', 'filter-field');
      label.append(element('span', '', field.label));
      const select = element('select');
      select.name = key;
      const options = key === 'department' ? [...field.options,
        ...[...new Set(records.filter(record => record.universityId === university.id).map(record => record.department))].sort().map(value => [value, value])] : field.options;
      if (!options.some(([value]) => value === state.filters[key])) state.filters[key] = 'all';
      select.append(...options.map(([value, text]) => { const option = element('option', '', text); option.value = value; return option; }));
      select.value = state.filters[key];
      select.addEventListener('change', () => { state.filters[key] = select.value; applyChanges(); });
      label.append(select); fields.append(label);
    });
  }
  async function load() {
    region.setAttribute('aria-busy', 'true');
    byId('results-controls').hidden = true;
    setStatus(`Loading ${state.mode}…`, '');
    try {
      const catalog = await import('./demo-catalog.js');
      records = catalog[state.mode];
      if (!Array.isArray(records)) throw new Error('Invalid catalog');
      buildControls(); updateUrl(); render();
      byId('results-controls').hidden = false;
    } catch {
      byId('results-count').textContent = 'Results unavailable';
      setStatus('Couldn’t load results', 'Your search is still here. Please try again.', { label: 'Try again', run: () => window.location.reload() });
    } finally { region.setAttribute('aria-busy', 'false'); }
  }
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; applyChanges(); });
  byId('reset-filters').addEventListener('click', resetFilters);
  byId('clear-result-filters').addEventListener('click', resetFilters);
  byId('load-more').addEventListener('click', () => { visible += PAGE_SIZE; renderCards(true); });
  document.addEventListener('pointerdown', event => { if (!filtersPanel.contains(event.target)) filtersPanel.open = false; });
  filtersPanel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { filtersPanel.open = false; filtersPanel.querySelector('summary').focus(); }
  });
  filtersPanel.addEventListener('focusout', event => { if (!filtersPanel.contains(event.relatedTarget)) filtersPanel.open = false; });
  await load();
}

export async function mountDetail(params) {
  if (params.get('mode') === 'courses') {
    const { mountCourseDetail } = await import('./course-detail.js');
    mountCourseDetail(params);
  } else {
    const { mountPathwayDetail } = await import('./pathway-detail.js');
    mountPathwayDetail(params);
  }
}
