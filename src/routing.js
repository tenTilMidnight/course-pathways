// Resolve the site root from this module so root and GitHub project sites share routes.
const root = new URL('../', import.meta.url);
export const basePath = /^https?:$/.test(root.protocol) ? root.pathname : '/';

export function appUrl(params, base = basePath) {
  const query = params ? new URLSearchParams(params).toString() : '';
  return query ? `${base}?${query}` : base;
}

export function safeReturnUrl(value, fallback = basePath, base = basePath) {
  if (!value?.startsWith('/') || value.startsWith('//') || value.length > 4096) return fallback;
  try {
    const url = new URL(value, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid' || ![base, '/'].includes(url.pathname)) return fallback;
    const view = url.searchParams.get('view');
    const recognized = view === 'results' && url.searchParams.get('q')?.trim()
      || view === 'detail' && ((url.searchParams.get('mode') === 'pathways' && /^(?:pathway-\d+|grace)$/.test(url.searchParams.get('id') ?? '')) || (url.searchParams.get('mode') === 'courses' && /^(?:course-\d+|cmu-\d{2}-\d{3})$/.test(url.searchParams.get('id') ?? '')));
    return recognized ? `${appUrl(url.searchParams, base)}${url.hash}` : fallback;
  } catch { return fallback; }
}
