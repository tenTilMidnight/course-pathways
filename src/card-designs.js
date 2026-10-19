// Compare major-first card arrangements on plain white surfaces.
import { pathways } from './demo-catalog.js';
import { createResultCard, element } from './result-cards.js';
import { resultsUrl } from './results-state.js';

function selectField(labelText, id, options) {
  const label = element('label', '', labelText);
  const select = element('select');
  select.id = id;
  options.forEach(([value, text]) => { const option = element('option', '', text); option.value = value; select.append(option); });
  label.append(select);
  return { label, select };
}

export function mountCardDesigns() {
  const root = document.getElementById('card-designs');
  root.append(element('h1', 'review-title', 'Card preview'), element('p', 'review-note', 'Demo data. Click any card to see its course timeline.'));
  const controls = element('div', 'review-controls');
  const styles = [['grouped', 'A · Grouped'], ['direction', 'B · Direction'], ['compact', 'C · Compact']];
  const profile = selectField('Profile', 'review-profile', [[2, 'Graduate'], [6, 'Current student'], [17, 'Dual degree']]);
  controls.append(profile.label); root.append(controls);
  const columns = element('div', 'review-columns');
  root.append(columns);
  function render() {
    columns.replaceChildren();
    const record = pathways[Number(profile.select.value)];
    styles.forEach(([cardStyle, label]) => {
      const url = resultsUrl({ mode: 'pathways', query: record.major });
      const sample = element('section'); sample.append(element('h2', 'tone-pair-title', label));
      sample.append(createResultCard(record, 'pathways', url, { cardStyle, instanceKey: `preview-${cardStyle}-${record.id}` }));
      columns.append(sample);
    });
  }
  profile.select.addEventListener('change', render);
  render();

}
