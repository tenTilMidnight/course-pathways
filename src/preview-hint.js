import { element } from './result-cards.js';

// Once per browser session. Filtering, sorting and paging never replay the hint.
export function createPreviewHint(universityId) {
  const key = `course-pathways:${universityId}:flip-hint-v1`;
  let seen = false;
  let cleanup = () => {};
  try { seen = sessionStorage.getItem(key) === 'seen'; } catch { /* In-memory fallback. */ }
  return function attach(card) {
    cleanup();
    if (seen || !card) return;
    let timer;
    let hint;
    const stop = () => { clearTimeout(timer); hint?.remove(); observer.disconnect(); card.removeEventListener('pointerdown', dismiss); card.removeEventListener('keydown', dismiss); };
    const markSeen = () => { seen = true; try { sessionStorage.setItem(key, 'seen'); } catch { /* Optional persistence. */ } };
    const dismiss = () => { markSeen(); stop(); };
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      markSeen(); observer.disconnect();
      hint = element('div', 'preview-hint'); hint.setAttribute('aria-hidden', 'true');
      hint.innerHTML = '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M10 14V4a2 2 0 0 1 4 0v8-1a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v4c0 5-3 7-7 7h-2c-3 0-4-1-6-4l-5-6a2 2 0 0 1 3-3l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Click to preview</span>';
      card.append(hint);
      timer = setTimeout(stop, 3600);
    }, { threshold: .4 });
    card.addEventListener('pointerdown', dismiss);
    card.addEventListener('keydown', dismiss);
    observer.observe(card);
    cleanup = stop;
  };
}
