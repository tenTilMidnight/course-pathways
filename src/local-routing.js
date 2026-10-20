import { appUrl, basePath } from './routing.js';

export function localReturnUrl(value, fallback = appUrl({ view: 'pathway-review', id: 'grace' })) {
  if (!value?.startsWith('/') || value.startsWith('//') || value.length > 4096) return fallback;
  try {
    const url = new URL(value, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid' || url.pathname !== basePath) return fallback;
    const view = url.searchParams.get('view'), id = url.searchParams.get('id');
    if (view === 'course-review' && /^cmu-\d{2}-\d{3}$/.test(id ?? '')) return appUrl({ view, mode: 'courses', id });
    if (!(['pathway-review', 'connection-review'].includes(view) && id === 'grace')) return fallback;
    const clean = { view: 'pathway-review', id };
    if (view === 'connection-review') clean.timeLayout = 'connections';
    else if (['alternating', 'years', 'connections'].includes(url.searchParams.get('timeLayout'))) clean.timeLayout = url.searchParams.get('timeLayout') === 'years' ? 'connections' : url.searchParams.get('timeLayout');
    return appUrl(clean);
  } catch { return fallback; }
}
